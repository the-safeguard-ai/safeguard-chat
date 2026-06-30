// Server-side conversation persistence (cross-device history).
//
// localStorage stays the primary, always-available store; this mirrors changes
// to the control-plane so history follows the user across devices. Every call is
// best-effort: a failure or being signed-out simply leaves the local copy as the
// source of truth (fail open). The server redacts everything it stores, and
// stores no message bodies for zero-retention orgs.

import { CONTROL_PLANE_URL, tokens } from "./api";
import { getConversation, mergeConversations, type Conversation, type StoredMessage } from "./store";

async function send(path: string, init: RequestInit): Promise<void> {
  const token = tokens.access();
  if (!token) return; // signed out → local-only
  try {
    await fetch(`${CONTROL_PLANE_URL}/api${path}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
        ...(init.headers ?? {}),
      },
    });
  } catch {
    /* offline / unreachable — best-effort */
  }
}

async function get<T>(path: string): Promise<T | null> {
  const token = tokens.access();
  if (!token) return null;
  try {
    const res = await fetch(`${CONTROL_PLANE_URL}/api${path}`, {
      headers: { authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** Create or rename a conversation server-side (idempotent on id). */
export function syncUpsertConversation(id: string, title: string): void {
  void send(`/conversations/${id}`, { method: "PUT", body: JSON.stringify({ title }) });
}

/** Delete a conversation server-side. */
export function syncDeleteConversation(id: string): void {
  void send(`/conversations/${id}`, { method: "DELETE" });
}

/**
 * Append a message server-side, upserting the conversation first so the message
 * never races ahead of its parent. Empty/streaming-placeholder content is
 * skipped — call this once a message has settled (e.g. on stream completion).
 */
export function syncMessage(convId: string, msg: StoredMessage): void {
  if (!msg.content || msg.blocked || msg.error) return;
  const title = getConversation(convId)?.title ?? "New chat";
  void (async () => {
    await send(`/conversations/${convId}`, { method: "PUT", body: JSON.stringify({ title }) });
    await send(`/conversations/${convId}/messages`, {
      method: "POST",
      body: JSON.stringify({ id: msg.id, role: msg.role, content: msg.content }),
    });
  })();
}

interface ServerConvo {
  id: string;
  title: string;
  date: string;
}
interface ServerMsg {
  id: string;
  role: string;
  content: string;
}

/**
 * Hydrate conversations saved on the server into the local store. Used on sign-in
 * so a fresh device sees prior history. Local copies always win (they're the live
 * working set); server rows only fill in conversations this device hasn't seen.
 * Best-effort; note server history is redacted (raw PII is never stored at rest).
 */
export async function loadServerHistory(): Promise<void> {
  const list = await get<ServerConvo[]>("/conversations");
  if (!list || list.length === 0) return;

  const loaded: Conversation[] = [];
  for (const c of list) {
    const msgs = (await get<ServerMsg[]>(`/conversations/${c.id}/messages`)) ?? [];
    const at = Date.parse(c.date) || Date.now();
    loaded.push({
      id: c.id,
      title: c.title,
      createdAt: at,
      updatedAt: at,
      messages: msgs
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m, i) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
          createdAt: at + i,
        })),
    });
  }
  mergeConversations(loaded);
}

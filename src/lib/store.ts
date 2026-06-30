// Local conversation store (per-user, persisted in localStorage).
//
// Phase-1 choice: history lives client-side so the full Grok-style UX (sidebar
// history, search, multi-conversation) works without new persistence endpoints.
// The gateway still logs every proxied request server-side for the admin audit
// trail; syncing conversation bodies to the control-plane is a later follow-up.

import { useSyncExternalStore } from "react";

export interface StoredMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Count of sensitive fields SafeGuard redacted from the user prompt. */
  redactions?: number;
  /** Set when the gateway blocked the message by DLP policy. */
  blocked?: boolean;
  /** Non-fatal error shown in place of an answer (e.g. no upstream model). */
  error?: string;
  /** Simulated "thinking" duration shown in the meta line, in ms. */
  thoughtMs?: number;
  createdAt: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: StoredMessage[];
  createdAt: number;
  updatedAt: number;
}

let userId = "anon";
let convos: Conversation[] = [];
const listeners = new Set<() => void>();

const key = () => `sg_chat_convos_${userId}`;
const emit = () => listeners.forEach((l) => l());
function persist() {
  try {
    localStorage.setItem(key(), JSON.stringify(convos));
  } catch {
    /* quota / private mode — keep in-memory */
  }
}

export const genId = (): string =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

/** Point the store at a user namespace and load their saved conversations. */
export function initStore(uid: string) {
  userId = uid;
  try {
    convos = JSON.parse(localStorage.getItem(key()) ?? "[]") as Conversation[];
  } catch {
    convos = [];
  }
  emit();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

/** Non-reactive lookup (for server sync, which needs the current title). */
export function getConversation(id: string): Conversation | undefined {
  return convos.find((c) => c.id === id);
}

/** Merge server-loaded conversations into the store (used to hydrate a fresh
 *  device). Local copies win on id collision — they're the live, unredacted
 *  working set; server rows only fill gaps. */
export function mergeConversations(incoming: Conversation[]) {
  const known = new Set(convos.map((c) => c.id));
  const additions = incoming.filter((c) => !known.has(c.id));
  if (additions.length === 0) return;
  convos = [...convos, ...additions].sort((a, b) => b.updatedAt - a.updatedAt);
  persist();
  emit();
}

export function createConversation(): Conversation {
  const now = Date.now();
  const c: Conversation = { id: genId(), title: "New chat", messages: [], createdAt: now, updatedAt: now };
  convos = [c, ...convos];
  persist();
  emit();
  return c;
}

export function addMessage(convId: string, msg: StoredMessage) {
  convos = convos.map((c) =>
    c.id === convId
      ? {
          ...c,
          messages: [...c.messages, msg],
          title: c.title === "New chat" && msg.role === "user" ? deriveTitle(msg.content) : c.title,
          updatedAt: Date.now(),
        }
      : c,
  );
  persist();
  emit();
}

export function updateMessage(convId: string, msgId: string, patch: Partial<StoredMessage>) {
  convos = convos.map((c) =>
    c.id === convId
      ? {
          ...c,
          messages: c.messages.map((m) => (m.id === msgId ? { ...m, ...patch } : m)),
          updatedAt: Date.now(),
        }
      : c,
  );
  persist();
  emit();
}

/** Replace a conversation's message list wholesale (used by regenerate). */
export function setMessages(convId: string, messages: StoredMessage[]) {
  convos = convos.map((c) =>
    c.id === convId ? { ...c, messages, updatedAt: Date.now() } : c,
  );
  persist();
  emit();
}

export function removeConversation(id: string) {
  convos = convos.filter((c) => c.id !== id);
  persist();
  emit();
}

function deriveTitle(text: string): string {
  const t = text.trim().replace(/\s+/g, " ");
  return t.length > 42 ? `${t.slice(0, 42)}…` : t || "New chat";
}

// ── React bindings ────────────────────────────────────────────────────────────
export function useConversations(): Conversation[] {
  return useSyncExternalStore(subscribe, () => convos);
}

export function useConversation(id: string | undefined): Conversation | undefined {
  return useSyncExternalStore(subscribe, () => (id ? convos.find((c) => c.id === id) : undefined));
}

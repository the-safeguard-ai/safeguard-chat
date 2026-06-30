// Streaming client for the SafeGuard gateway (OpenAI-compatible SSE).
//
// The gateway applies inbound DLP before forwarding to the upstream model and
// reports how many fields it redacted via the `x-safeguard-redactions` header.
// A 422 means the request was BLOCKED by policy (sensitive data that may not be
// sent at all). We surface both to the UI as our core differentiator.

import { GATEWAY_URL, refreshAccess, tokens } from "./api";

export interface ChatMsg {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface StreamHandlers {
  onRedactions?: (n: number) => void;
  onToken: (delta: string) => void;
  onDone: () => void;
  onBlocked: () => void;
  onError: (message: string) => void;
}

interface StreamOpts {
  model: string;
  messages: ChatMsg[];
  signal?: AbortSignal;
}

export async function streamChat(opts: StreamOpts, h: StreamHandlers): Promise<void> {
  let res: Response;
  try {
    res = await send(opts);
    if (res.status === 401) {
      // Access token likely expired — refresh once and retry.
      const fresh = await refreshAccess();
      if (fresh) res = await send(opts);
    }
  } catch (e) {
    h.onError(e instanceof Error ? e.message : "network error");
    return;
  }

  if (res.status === 422) {
    h.onBlocked();
    return;
  }
  if (res.status === 429) {
    h.onError("Daily usage limit reached for your plan.");
    return;
  }
  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "");
    h.onError(friendlyUpstream(res.status, detail));
    return;
  }

  const redactions = Number(res.headers.get("x-safeguard-redactions") ?? "0");
  if (redactions > 0) h.onRedactions?.(redactions);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE frames are separated by a blank line.
      const frames = buffer.split("\n\n");
      buffer = frames.pop() ?? "";
      for (const frame of frames) {
        for (const line of frame.split("\n")) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const data = trimmed.slice(5).trim();
          if (data === "[DONE]") {
            h.onDone();
            return;
          }
          try {
            const json = JSON.parse(data) as {
              choices?: { delta?: { content?: string } }[];
            };
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) h.onToken(delta);
          } catch {
            /* keep partial frame in buffer for the next read */
          }
        }
      }
    }
    h.onDone();
  } catch (e) {
    if ((e as { name?: string }).name === "AbortError") {
      h.onDone();
      return;
    }
    h.onError(e instanceof Error ? e.message : "stream error");
  }
}

function send(opts: StreamOpts): Promise<Response> {
  return fetch(`${GATEWAY_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${tokens.access() ?? ""}`,
    },
    body: JSON.stringify({ model: opts.model, messages: opts.messages, stream: true }),
    signal: opts.signal,
  });
}

function friendlyUpstream(status: number, detail: string): string {
  if (status === 502)
    return "No AI model backend is reachable. Set OPENAI_API_KEY (or run Ollama) for the gateway.";
  return detail || `Gateway error (${status}).`;
}

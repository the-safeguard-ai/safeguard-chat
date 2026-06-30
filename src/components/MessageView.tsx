import { useState } from "react";
import {
  Check,
  Copy,
  Lightbulb,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import type { StoredMessage } from "../lib/store";
import { cn } from "../lib/utils";

interface MessageViewProps {
  message: StoredMessage;
  streaming?: boolean;
  onRegenerate?: () => void;
}

export function MessageView({ message, streaming, onRegenerate }: MessageViewProps) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end sg-fade-in">
        <div className="max-w-[78%] whitespace-pre-wrap rounded-3xl bg-[var(--color-surface)] px-5 py-2.5 text-[16px] leading-7">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="group sg-fade-in">
      <MetaLine message={message} />

      {message.blocked ? (
        <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[15px] text-red-700">
          <ShieldAlert size={18} className="mt-0.5 shrink-0" />
          <span>
            SafeGuard blocked this message — it contained sensitive data your organization's policy
            prevents sending to AI models. Remove it and try again.
          </span>
        </div>
      ) : message.error ? (
        <p className="text-[15px] text-[var(--color-muted)]">{message.error}</p>
      ) : (
        <div className="text-[16px] leading-7 text-[var(--color-ink)]">
          <Content text={message.content} />
          {streaming && message.content.length === 0 ? (
            <ThinkingDots />
          ) : (
            streaming && <span className="sg-caret ml-0.5 inline-block">▍</span>
          )}
        </div>
      )}

      {!streaming && !message.blocked && !message.error && (
        <ActionRow content={message.content} onRegenerate={onRegenerate} />
      )}
    </div>
  );
}

function MetaLine({ message }: { message: StoredMessage }) {
  if (message.blocked) return null;
  return (
    <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-[var(--color-muted)]">
      {message.redactions ? (
        <span className="flex items-center gap-1.5 text-[var(--color-accent)]">
          <ShieldCheck size={14} />
          SafeGuard redacted {message.redactions} sensitive item
          {message.redactions === 1 ? "" : "s"} before sending
        </span>
      ) : null}
      {message.thoughtMs ? (
        <span className="flex items-center gap-1.5">
          <Lightbulb size={14} />
          Thought for {(message.thoughtMs / 1000).toFixed(0)}s
        </span>
      ) : null}
    </div>
  );
}

function ThinkingDots() {
  return (
    <span className="inline-flex items-center gap-1 py-1 align-middle">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-[var(--color-faint)]"
          style={{ animation: `sg-blink 1.2s ${i * 0.18}s infinite` }}
        />
      ))}
    </span>
  );
}

/** Lightweight renderer: fenced code blocks become <pre>, the rest wraps. */
function Content({ text }: { text: string }) {
  const parts = text.split(/```/);
  return (
    <div className="space-y-3">
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <pre
            key={i}
            className="overflow-x-auto rounded-xl bg-[var(--color-surface)] p-3.5 font-mono text-[13.5px] leading-6"
          >
            <code>{part.replace(/^\w*\n/, "")}</code>
          </pre>
        ) : (
          <span key={i} className="whitespace-pre-wrap">
            {part}
          </span>
        ),
      )}
    </div>
  );
}

function ActionRow({ content, onRegenerate }: { content: string; onRegenerate?: () => void }) {
  const [copied, setCopied] = useState(false);
  const [vote, setVote] = useState<"up" | "down" | null>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="mt-2.5 flex items-center gap-0.5 text-[var(--color-faint)] opacity-0 transition group-hover:opacity-100">
      <Action label="Copy" onClick={copy}>
        {copied ? <Check size={15} className="text-[var(--color-accent)]" /> : <Copy size={15} />}
      </Action>
      <Action label="Good response" onClick={() => setVote("up")} active={vote === "up"}>
        <ThumbsUp size={15} />
      </Action>
      <Action label="Bad response" onClick={() => setVote("down")} active={vote === "down"}>
        <ThumbsDown size={15} />
      </Action>
      {onRegenerate && (
        <Action label="Regenerate" onClick={onRegenerate}>
          <RefreshCw size={15} />
        </Action>
      )}
    </div>
  );
}

function Action({
  children,
  label,
  onClick,
  active,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-[var(--color-surface)] hover:text-[var(--color-ink-soft)]",
        active && "text-[var(--color-ink)]",
      )}
    >
      {children}
    </button>
  );
}

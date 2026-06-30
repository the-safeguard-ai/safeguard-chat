import { useMemo, useState } from "react";
import { Search, SquarePen } from "lucide-react";
import type { Conversation } from "../lib/store";
import { cn } from "../lib/utils";

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
  conversations: Conversation[];
  activeId?: string;
  onSelect: (id: string) => void;
  onNewChat: () => void;
}

function relativeTime(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s} second${s === 1 ? "" : "s"} ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} minute${m === 1 ? "" : "s"} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

export function SearchModal({
  open,
  onClose,
  conversations,
  activeId,
  onSelect,
  onNewChat,
}: SearchModalProps) {
  const [q, setQ] = useState("");
  const [preview, setPreview] = useState<string | undefined>(activeId);

  const filtered = useMemo(
    () => conversations.filter((c) => c.title.toLowerCase().includes(q.trim().toLowerCase())),
    [conversations, q],
  );

  if (!open) return null;

  const previewConvo = conversations.find((c) => c.id === preview);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/20 px-4 pt-[8vh] backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex h-[78vh] w-full max-w-[860px] flex-col overflow-hidden rounded-3xl border border-[var(--color-hair)] bg-white shadow-2xl sg-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-[var(--color-hair)] px-5 py-4">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search…"
            className="flex-1 bg-transparent text-[16px] outline-none placeholder:text-[var(--color-faint)]"
          />
          <Search size={18} className="text-[var(--color-faint)]" />
        </div>

        <div className="grid flex-1 grid-cols-[1.1fr_1fr] overflow-hidden">
          <div className="overflow-y-auto border-r border-[var(--color-hair)] p-3">
            <div className="px-2 pb-1 text-[12px] text-[var(--color-faint)]">Actions</div>
            <button
              onClick={() => {
                onNewChat();
                onClose();
              }}
              className="mb-3 flex w-full items-center gap-2.5 rounded-xl bg-[var(--color-surface)] px-3 py-2.5 text-left text-[14px] font-medium"
            >
              <SquarePen size={16} /> Create New Chat
            </button>

            {filtered.length === 0 ? (
              <p className="px-2 py-6 text-[13px] text-[var(--color-faint)]">No matching conversations.</p>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.id}
                  onMouseEnter={() => setPreview(c.id)}
                  onClick={() => {
                    onSelect(c.id);
                    onClose();
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left transition hover:bg-[var(--color-surface)]",
                    c.id === preview && "bg-[var(--color-surface)]",
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-[14px]">{c.title}</span>
                    {c.id === activeId && (
                      <span className="shrink-0 rounded-full border border-[var(--color-hair)] px-2 py-0.5 text-[11px] text-[var(--color-muted)]">
                        Current
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-[12px] text-[var(--color-faint)]">
                    {relativeTime(c.updatedAt)}
                  </span>
                </button>
              ))
            )}
          </div>

          <div className="overflow-y-auto p-6">
            {previewConvo ? (
              <div className="space-y-4">
                <h3 className="text-[15px] font-semibold">{previewConvo.title}</h3>
                {previewConvo.messages.slice(-6).map((m) => (
                  <div key={m.id} className="text-[14px] leading-6">
                    <span className="mb-0.5 block text-[12px] font-medium uppercase tracking-wide text-[var(--color-faint)]">
                      {m.role}
                    </span>
                    <span className="line-clamp-4 whitespace-pre-wrap text-[var(--color-ink-soft)]">
                      {m.content || (m.blocked ? "[blocked]" : "")}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-[15px] text-[var(--color-faint)]">
                Select a conversation to preview
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

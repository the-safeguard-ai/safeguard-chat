import { useEffect, useRef, useState } from "react";
import { ArrowUp, AudioLines, ChevronDown, Mic, Plus, Square } from "lucide-react";
import { MODELS, type ModelOption } from "../lib/models";
import { cn } from "../lib/utils";

interface ComposerProps {
  model: ModelOption;
  onModelChange: (m: ModelOption) => void;
  onSend: (text: string) => void;
  onStop?: () => void;
  streaming?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
}

export function Composer({
  model,
  onModelChange,
  onSend,
  onStop,
  streaming = false,
  placeholder = "What's on your mind?",
  autoFocus = false,
}: ComposerProps) {
  const [text, setText] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  // Auto-grow the textarea up to a sensible cap.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [text]);

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  function submit() {
    const value = text.trim();
    if (!value || streaming) return;
    onSend(value);
    setText("");
  }

  const hasText = text.trim().length > 0;

  return (
    <div className="relative">
      <div className="flex items-end gap-2 rounded-[26px] border border-[var(--color-hair)] bg-[var(--color-surface)] px-2.5 py-2 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition focus-within:border-[var(--color-faint)]">
        <button
          type="button"
          className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--color-ink-soft)] transition hover:bg-[var(--color-surface-2)]"
          aria-label="Add attachment"
          title="Attach (coming soon)"
        >
          <Plus size={20} />
        </button>

        <textarea
          ref={ref}
          rows={1}
          value={text}
          placeholder={placeholder}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          className="max-h-[220px] flex-1 resize-none bg-transparent py-2 text-[16px] leading-6 outline-none placeholder:text-[var(--color-faint)]"
        />

        {/* Model dropdown */}
        <div className="relative mb-0.5 shrink-0">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-9 items-center gap-1 rounded-full px-2.5 text-[14px] font-medium text-[var(--color-ink-soft)] transition hover:bg-[var(--color-surface-2)]"
          >
            {model.label}
            <ChevronDown size={15} className={cn("transition", menuOpen && "rotate-180")} />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute bottom-11 right-0 z-20 w-56 overflow-hidden rounded-2xl border border-[var(--color-hair)] bg-white p-1.5 shadow-xl sg-fade-in">
                {MODELS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      onModelChange(m);
                      setMenuOpen(false);
                    }}
                    className={cn(
                      "flex w-full flex-col items-start rounded-xl px-3 py-2 text-left transition hover:bg-[var(--color-surface)]",
                      m.id === model.id && "bg-[var(--color-surface)]",
                    )}
                  >
                    <span className="text-[14px] font-medium">{m.label}</span>
                    <span className="text-[12px] text-[var(--color-muted)]">{m.sub}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--color-ink-soft)] transition hover:bg-[var(--color-surface-2)]"
          aria-label="Dictate"
          title="Voice input (coming soon)"
        >
          <Mic size={19} />
        </button>

        {streaming ? (
          <button
            type="button"
            onClick={onStop}
            className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-ink)] text-white transition hover:opacity-90"
            aria-label="Stop"
          >
            <Square size={16} fill="currentColor" />
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={!hasText}
            className={cn(
              "mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition",
              hasText
                ? "bg-[var(--color-ink)] text-white hover:opacity-90"
                : "bg-[var(--color-ink)] text-white opacity-90",
            )}
            aria-label={hasText ? "Send" : "Voice mode"}
          >
            {hasText ? <ArrowUp size={20} /> : <AudioLines size={18} />}
          </button>
        )}
      </div>
    </div>
  );
}

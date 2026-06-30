import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ShieldCheck, SquarePen } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { Composer } from "../components/Composer";
import { MessageView } from "../components/MessageView";
import { SearchModal } from "../components/SearchModal";
import { Sidebar } from "../components/Sidebar";
import { DEFAULT_MODEL, type ModelOption } from "../lib/models";
import { streamChat, type ChatMsg } from "../lib/stream";
import {
  addMessage,
  createConversation,
  genId,
  removeConversation,
  setMessages,
  updateMessage,
  useConversation,
  useConversations,
  type Conversation,
  type StoredMessage,
} from "../lib/store";
import { syncDeleteConversation, syncMessage, syncUpsertConversation } from "../lib/sync";

const SYSTEM_PROMPT =
  "You are SafeGuard AI, a helpful assistant in a privacy-first workspace. Sensitive data is redacted from prompts before you receive them; never ask the user to re-share redacted values.";

const COLLAPSE_KEY = "sg_chat_sidebar_collapsed";

export function ChatApp() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const conversations = useConversations();
  const convo = useConversation(id);

  const [model, setModel] = useState<ModelOption>(DEFAULT_MODEL);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) === "1");
  const [searchOpen, setSearchOpen] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const toggleCollapsed = () => {
    setCollapsed((v) => {
      localStorage.setItem(COLLAPSE_KEY, v ? "0" : "1");
      return !v;
    });
  };

  // Auto-scroll to the latest content as it streams in.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [convo?.messages]);

  function newChat() {
    abortRef.current?.abort();
    navigate("/");
  }

  function selectConversation(cid: string) {
    navigate(`/c/${cid}`);
  }

  function deleteConversation(cid: string) {
    removeConversation(cid);
    syncDeleteConversation(cid);
    if (cid === id) navigate("/");
  }

  function handleSend(text: string) {
    let conv = convo;
    if (!conv) {
      conv = createConversation();
      syncUpsertConversation(conv.id, conv.title);
      navigate(`/c/${conv.id}`);
    }
    void runStream(conv.id, conv.messages, text);
  }

  async function runStream(convId: string, prior: StoredMessage[], text: string) {
    const userMsg: StoredMessage = { id: genId(), role: "user", content: text, createdAt: Date.now() };
    addMessage(convId, userMsg);
    syncMessage(convId, userMsg); // persist user turn (server redacts at rest)

    const assistantId = genId();
    addMessage(convId, { id: assistantId, role: "assistant", content: "", createdAt: Date.now() });
    setStreamingId(assistantId);

    const outgoing: ChatMsg[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...prior
        .filter((m) => !m.blocked && !m.error && m.content)
        .map((m) => ({ role: m.role, content: m.content }) as ChatMsg),
      { role: "user", content: text },
    ];

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const started = Date.now();
    let acc = "";

    await streamChat(
      { model: model.id, messages: outgoing, signal: ctrl.signal },
      {
        onRedactions: (n) => updateMessage(convId, assistantId, { redactions: n }),
        onToken: (d) => {
          acc += d;
          updateMessage(convId, assistantId, { content: acc });
        },
        onBlocked: () => updateMessage(convId, assistantId, { blocked: true }),
        onError: (msg) => updateMessage(convId, assistantId, { error: msg }),
        onDone: () => updateMessage(convId, assistantId, { thoughtMs: Date.now() - started }),
      },
    );

    // Persist the settled assistant turn once streaming finishes.
    if (acc)
      syncMessage(convId, { id: assistantId, role: "assistant", content: acc, createdAt: Date.now() });

    setStreamingId(null);
    abortRef.current = null;
  }

  function regenerate(convId: string) {
    const c = conversations.find((x) => x.id === convId);
    if (!c) return;
    const lastUserIdx = [...c.messages].map((m) => m.role).lastIndexOf("user");
    if (lastUserIdx === -1) return;
    const lastUser = c.messages[lastUserIdx];
    const prior = c.messages.slice(0, lastUserIdx);
    setMessages(convId, prior); // drop the user msg + its reply; runStream re-adds the user msg
    void runStream(convId, prior, lastUser.content);
  }

  function stop() {
    abortRef.current?.abort();
    setStreamingId(null);
  }

  const showWelcome = !convo || convo.messages.length === 0;

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-canvas)]">
      <Sidebar
        collapsed={collapsed}
        onToggle={toggleCollapsed}
        conversations={conversations}
        activeId={id}
        user={user}
        onNewChat={newChat}
        onOpenSearch={() => setSearchOpen(true)}
        onSelect={selectConversation}
        onDelete={deleteConversation}
        onLogout={logout}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        <TopBar conversation={convo} onNewChat={newChat} />

        {showWelcome ? (
          <Welcome model={model} onModelChange={setModel} onSend={handleSend} />
        ) : (
          <>
            <div className="flex-1 overflow-y-auto">
              <div className="mx-auto w-full max-w-3xl space-y-7 px-5 py-8">
                {convo!.messages.map((m, i) => (
                  <MessageView
                    key={m.id}
                    message={m}
                    streaming={m.id === streamingId}
                    onRegenerate={
                      m.role === "assistant" && i === convo!.messages.length - 1 && !streamingId
                        ? () => regenerate(convo!.id)
                        : undefined
                    }
                  />
                ))}
                <div ref={bottomRef} />
              </div>
            </div>

            <div className="px-5 pb-5">
              <div className="mx-auto w-full max-w-3xl">
                <Composer
                  model={model}
                  onModelChange={setModel}
                  onSend={handleSend}
                  onStop={stop}
                  streaming={!!streamingId}
                  placeholder="Ask anything"
                />
                <p className="mt-2 text-center text-[12px] text-[var(--color-faint)]">
                  SafeGuard scans every prompt for sensitive data before it reaches the model.
                </p>
              </div>
            </div>
          </>
        )}
      </main>

      <SearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        conversations={conversations}
        activeId={id}
        onSelect={selectConversation}
        onNewChat={newChat}
      />
    </div>
  );
}

function TopBar({
  conversation,
  onNewChat,
}: {
  conversation: Conversation | undefined;
  onNewChat: () => void;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between px-4">
      <div className="truncate text-[15px] font-medium text-[var(--color-ink-soft)]">
        {conversation?.title === "New chat" ? "" : (conversation?.title ?? "")}
      </div>
      <div className="flex items-center gap-1.5">
        <span className="flex items-center gap-1.5 rounded-full bg-[var(--color-surface)] px-3 py-1.5 text-[12.5px] font-medium text-[var(--color-accent)]">
          <ShieldCheck size={14} /> Protected
        </span>
        <button
          onClick={onNewChat}
          title="New chat"
          aria-label="New chat"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-ink-soft)] transition hover:bg-[var(--color-surface)]"
        >
          <SquarePen size={18} />
        </button>
      </div>
    </header>
  );
}

function Welcome({
  model,
  onModelChange,
  onSend,
}: {
  model: ModelOption;
  onModelChange: (m: ModelOption) => void;
  onSend: (text: string) => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-5 pb-[12vh]">
      <div className="mb-8 flex items-center gap-3 sg-fade-in">
        <ShieldCheck size={40} className="text-[var(--color-ink)]" strokeWidth={1.75} />
        <span className="text-4xl font-semibold tracking-tight">SafeGuard</span>
      </div>
      <div className="w-full max-w-3xl sg-fade-in">
        <Composer
          model={model}
          onModelChange={onModelChange}
          onSend={onSend}
          autoFocus
          placeholder="What's on your mind?"
        />
        <p className="mt-3 text-center text-[12.5px] text-[var(--color-faint)]">
          Chat freely — sensitive data is stripped before it ever leaves your workspace.
        </p>
      </div>
    </div>
  );
}

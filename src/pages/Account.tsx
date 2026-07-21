import { ArrowLeft, Loader2, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../auth/AuthContext";

interface PersonalStats {
  totalPrompts: number;
  totalRedactions: number;
  totalBlocks: number;
  quota: {
    plan: string;
    limit: number | null;
    used: number;
    remaining: number | null;
    resetsAt: number;
  };
}
interface ActivityEntry { action: string; target: string; createdAt: string }
interface KeyInfo { id: string; name: string; prefix: string; createdAt: string; lastUsed: string | null; revoked: boolean }
interface CreatedKey { id: string; name: string; key: string; prefix: string }

function useFetch<T>(fn: () => Promise<T>): { data: T | null; reload: () => void } {
  const [data, setData] = useState<T | null>(null);
  const reload = useCallback(() => { fn().then(setData).catch(() => {}); }, [fn]);
  useEffect(() => { reload(); }, [reload]);
  return { data, reload };
}

export function Account() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: stats } = useFetch(() => api<PersonalStats>("/me/stats"));
  const { data: activity } = useFetch(() => api<ActivityEntry[]>("/me/activity"));
  const { data: keys, reload: reloadKeys } = useFetch(() => api<KeyInfo[]>("/me/keys"));

  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwPending, setPwPending] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwOk, setPwOk] = useState(false);

  const [keyName, setKeyName] = useState("Personal key");
  const [createdKey, setCreatedKey] = useState<CreatedKey | null>(null);
  const [copied, setCopied] = useState(false);
  const [genPending, setGenPending] = useState(false);

  const changePw = async () => {
    setPwError("");
    setPwOk(false);
    setPwPending(true);
    try {
      await api("/auth/change-password", { method: "POST", body: JSON.stringify({ oldPassword: oldPw, newPassword: newPw }) });
      setPwOk(true);
      setOldPw("");
      setNewPw("");
    } catch (err) {
      setPwError((err as Error).message);
    } finally {
      setPwPending(false);
    }
  };

  const createKey = async () => {
    setGenPending(true);
    try {
      const k = await api<CreatedKey>("/me/keys", { method: "POST", body: JSON.stringify({ name: keyName }) });
      setCreatedKey(k);
      reloadKeys();
    } finally {
      setGenPending(false);
    }
  };

  const revokeKey = async (id: string) => {
    try {
      await api(`/me/keys/${id}`, { method: "DELETE" });
      reloadKeys();
    } catch { /* ignore */ }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-canvas)]">
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <header className="flex h-14 shrink-0 items-center gap-3 px-4 border-b border-[var(--color-hair)]">
          <button onClick={() => navigate("/")} className="flex items-center gap-1.5 text-[14px] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] transition">
            <ArrowLeft size={16} /> Back to chat
          </button>
          <div className="flex items-center gap-1.5 ml-auto">
            <ShieldCheck size={14} className="text-[var(--color-accent)]" />
            <span className="text-[12.5px] font-medium text-[var(--color-muted)]">SafeGuard Account</span>
          </div>
        </header>

        <div className="mx-auto w-full max-w-2xl px-5 py-8 space-y-8">
          <section>
            <h2 className="text-lg font-semibold text-[var(--color-ink)] mb-4">Profile</h2>
            <div className="rounded-xl border border-[var(--color-hair)] bg-[var(--color-surface)] p-5 space-y-3">
              <div className="flex justify-between">
                <span className="text-[14px] text-[var(--color-muted)]">Name</span>
                <span className="text-[14px] font-medium text-[var(--color-ink)]">{user?.name}</span>
              </div>
              <div className="flex justify-between border-t border-[var(--color-hair)] pt-3">
                <span className="text-[14px] text-[var(--color-muted)]">Email</span>
                <span className="text-[14px] font-medium text-[var(--color-ink)]">{user?.email}</span>
              </div>
              <div className="flex justify-between border-t border-[var(--color-hair)] pt-3">
                <span className="text-[14px] text-[var(--color-muted)]">Role</span>
                <span className="text-[14px] font-medium text-[var(--color-ink)] capitalize">{user?.role?.toLowerCase()}</span>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--color-ink)] mb-4">Usage</h2>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-[var(--color-hair)] bg-[var(--color-surface)] p-4 text-center">
                <p className="text-2xl font-bold text-[var(--color-ink)]">{stats?.totalPrompts ?? "—"}</p>
                <p className="text-[12px] text-[var(--color-muted)] mt-1">Total prompts</p>
              </div>
              <div className="rounded-xl border border-[var(--color-hair)] bg-[var(--color-surface)] p-4 text-center">
                <p className="text-2xl font-bold text-[var(--color-accent)]">{stats?.totalRedactions ?? "—"}</p>
                <p className="text-[12px] text-[var(--color-muted)] mt-1">Redactions</p>
              </div>
              <div className="rounded-xl border border-[var(--color-hair)] bg-[var(--color-surface)] p-4 text-center">
                <p className="text-2xl font-bold text-red-500">{stats?.totalBlocks ?? "—"}</p>
                <p className="text-[12px] text-[var(--color-muted)] mt-1">Blocks</p>
              </div>
            </div>
            {stats?.quota && (
              <div className="mt-3 rounded-xl border border-[var(--color-hair)] bg-[var(--color-surface)] p-4">
                <div className="flex justify-between text-[14px] mb-2">
                  <span className="text-[var(--color-muted)]">Daily quota ({stats.quota.plan})</span>
                  <span className="font-medium">{stats.quota.limit == null ? `${stats.quota.used} / ∞` : `${stats.quota.used} / ${stats.quota.limit}`}</span>
                </div>
                {stats.quota.limit != null && (
                  <div className="h-2 rounded-full bg-[var(--color-canvas)] overflow-hidden">
                    <div className="h-full rounded-full bg-[var(--color-accent)]" style={{ width: `${Math.min(100, (stats.quota.used / stats.quota.limit) * 100)}%` }} />
                  </div>
                )}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--color-ink)] mb-4">API Keys</h2>
            <div className="rounded-xl border border-[var(--color-hair)] bg-[var(--color-surface)] p-5 space-y-4">
              <div className="flex gap-2">
                <input value={keyName} onChange={(e) => setKeyName(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg bg-[var(--color-canvas)] border border-[var(--color-hair)] text-[14px] text-[var(--color-ink)]"
                  placeholder="Key name" />
                <button onClick={createKey} disabled={genPending}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--color-ink)] text-white text-[14px] font-medium disabled:opacity-60">
                  {genPending ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Generate
                </button>
              </div>
              {createdKey && (
                <div className="rounded-lg border border-accent/40 bg-accent/5 p-3">
                  <p className="text-[12px] text-[var(--color-muted)] mb-2">Copy this key now — it won't be shown again.</p>
                  <div className="flex gap-2">
                    <code className="flex-1 px-2 py-1.5 rounded bg-[var(--color-canvas)] border border-[var(--color-hair)] text-[13px] break-all">{createdKey.key}</code>
                    <button onClick={() => { void navigator.clipboard.writeText(createdKey.key); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                      className="px-3 py-1.5 rounded-lg bg-[var(--color-ink)] text-white text-[13px] font-medium">{copied ? "Copied" : "Copy"}</button>
                  </div>
                </div>
              )}
              {(keys ?? []).length === 0 && !createdKey && (
                <p className="text-[13px] text-[var(--color-muted)]">No personal keys yet.</p>
              )}
              {keys?.map((k) => (
                <div key={k.id} className="flex items-center justify-between py-2 border-t border-[var(--color-hair)] first:border-0">
                  <div>
                    <p className="text-[14px] font-medium text-[var(--color-ink)]">{k.name}{k.revoked && <span className="text-[12px] text-red-500 ml-2">(revoked)</span>}</p>
                    <p className="text-[12px] text-[var(--color-muted)]"><code>{k.prefix}</code> · {k.createdAt}{k.lastUsed ? ` · last used ${k.lastUsed}` : ""}</p>
                  </div>
                  {!k.revoked && <button onClick={() => revokeKey(k.id)} className="p-1.5 rounded hover:bg-red-50 text-red-500"><Trash2 size={15} /></button>}
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--color-ink)] mb-4">Password</h2>
            <div className="rounded-xl border border-[var(--color-hair)] bg-[var(--color-surface)] p-5 space-y-3 max-w-sm">
              {pwOk && <p className="text-[13px] text-green-600">Password updated.</p>}
              {pwError && <p className="text-[13px] text-red-500">{pwError}</p>}
              <input type="password" placeholder="Current password" value={oldPw}
                onChange={(e) => setOldPw(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[var(--color-canvas)] border border-[var(--color-hair)] text-[14px]" />
              <input type="password" placeholder="New password (min 8 chars)" value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[var(--color-canvas)] border border-[var(--color-hair)] text-[14px]" />
              <button onClick={changePw} disabled={!oldPw || !newPw || newPw.length < 8 || pwPending}
                className="px-4 py-2 rounded-lg bg-[var(--color-ink)] text-white text-[14px] font-medium disabled:opacity-60">
                {pwPending ? "Updating…" : "Update password"}
              </button>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--color-ink)] mb-4">Activity</h2>
            <div className="rounded-xl border border-[var(--color-hair)] bg-[var(--color-surface)] p-5">
              {(!activity || activity.length === 0) && <p className="text-[13px] text-[var(--color-muted)]">No recent activity.</p>}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {activity?.map((entry, i) => (
                  <div key={i} className="flex justify-between py-2 border-b border-[var(--color-hair)] last:border-0">
                    <div>
                      <p className="text-[14px] text-[var(--color-ink)]">{entry.action}</p>
                      <p className="text-[12px] text-[var(--color-muted)]">{entry.target}</p>
                    </div>
                    <span className="text-[12px] text-[var(--color-muted)] whitespace-nowrap ml-4">{entry.createdAt}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

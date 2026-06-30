import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { LogoMark } from "@the-safeguard-ai/ui/brand";
import { useAuth } from "../auth/AuthContext";

export function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [orgName, setOrgName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "login") await login(email, password);
      else await register(orgName, name, email, password);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  const field =
    "w-full rounded-xl border border-[var(--color-hair)] bg-[var(--color-surface)] px-4 py-3 text-[15px] outline-none focus:border-[var(--color-faint)] transition";

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-[400px] sg-fade-in">
        <div className="mb-8 flex flex-col items-center text-center">
          <LogoMark size={44} color="var(--ink)" className="mb-4" />
          <h1 className="text-2xl font-semibold tracking-tight">SafeGuard</h1>
          <p className="mt-1 text-[15px] text-[var(--color-muted)]">
            {mode === "login" ? "Sign in to your secure AI workspace" : "Create your workspace"}
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          {mode === "register" && (
            <>
              <input
                className={field}
                placeholder="Organization name"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                required
              />
              <input
                className={field}
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </>
          )}
          <input
            className={field}
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className={field}
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-ink)] py-3 text-[15px] font-medium text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {busy && <Loader2 size={16} className="animate-spin" />}
            {mode === "login" ? "Sign in" : "Create workspace"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--color-muted)]">
          {mode === "login" ? "No account yet?" : "Already have a workspace?"}{" "}
          <button
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError(null);
            }}
            className="font-medium text-[var(--color-ink)] underline-offset-2 hover:underline"
          >
            {mode === "login" ? "Create one" : "Sign in"}
          </button>
        </p>

        <p className="mt-8 text-center text-xs text-[var(--color-faint)]">
          Prompts are scanned for sensitive data before they ever reach a model.
        </p>
      </div>
    </div>
  );
}

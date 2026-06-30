import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  login as apiLogin,
  register as apiRegister,
  storedUser,
  tokens,
  type AuthUser,
} from "../lib/api";
import { initStore } from "../lib/store";
import { loadServerHistory } from "../lib/sync";

interface AuthState {
  user: AuthUser | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (orgName: string, name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const u = tokens.access() ? storedUser() : null;
    if (u) {
      initStore(u.id);
      void loadServerHistory(); // pull saved history for this device
      setUser(u);
    }
    setReady(true);
  }, []);

  const finish = (u: AuthUser) => {
    initStore(u.id);
    void loadServerHistory();
    setUser(u);
  };

  const login = async (email: string, password: string) => finish(await apiLogin(email, password));
  const register = async (orgName: string, name: string, email: string, password: string) =>
    finish(await apiRegister(orgName, name, email, password));

  const logout = () => {
    tokens.clear();
    setUser(null);
  };

  return (
    <Ctx.Provider value={{ user, ready, login, register, logout }}>{children}</Ctx.Provider>
  );
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}

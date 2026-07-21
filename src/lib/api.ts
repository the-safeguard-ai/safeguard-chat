// Control-plane client for the end-user chat app. Authentication reuses the
// same JWT the admin app issues; the access token also authenticates calls to
// the gateway (which now accepts user JWTs, not just org API keys).

export const CONTROL_PLANE_URL =
  import.meta.env.VITE_CONTROL_PLANE_URL ?? "http://localhost:8081";
export const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL ?? "http://localhost:8080";

const TOKEN_KEY = "sg_chat_token";
const REFRESH_KEY = "sg_chat_refresh";
const USER_KEY = "sg_chat_user";

export const tokens = {
  access: () => localStorage.getItem(TOKEN_KEY),
  refresh: () => localStorage.getItem(REFRESH_KEY),
  set: (access: string, refresh: string) => {
    localStorage.setItem(TOKEN_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  orgId: string;
}

interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: AuthUser;
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = tokens.access();
  const res = await fetch(`${CONTROL_PLANE_URL}/api${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const res = await api<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  tokens.set(res.access_token, res.refresh_token);
  localStorage.setItem(USER_KEY, JSON.stringify(res.user));
  return res.user;
}

export async function register(
  orgName: string,
  name: string,
  email: string,
  password: string,
): Promise<AuthUser> {
  const res = await api<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ orgName, name, email, password }),
  });
  tokens.set(res.access_token, res.refresh_token);
  localStorage.setItem(USER_KEY, JSON.stringify(res.user));
  return res.user;
}

export function storedUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

/** Exchange the refresh token for a fresh access token. Returns it, or null. */
export async function refreshAccess(): Promise<string | null> {
  const refresh_token = tokens.refresh();
  if (!refresh_token) return null;
  try {
    const res = await fetch(`${CONTROL_PLANE_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refresh_token }),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { access_token: string };
    localStorage.setItem(TOKEN_KEY, body.access_token);
    return body.access_token;
  } catch {
    return null;
  }
}

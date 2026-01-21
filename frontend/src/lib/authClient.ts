"use client";

type AuthSession = {
  access_token: string | null;
  refresh_token: string | null;
  token_type?: string | null;
  expires_in?: number | null;
  expires_at?: number | null;
  user?: any;
};

const ACCESS_TOKEN_KEY = "connected_access_token";
const REFRESH_TOKEN_KEY = "connected_refresh_token";

function apiBase() {
  return process.env.NEXT_PUBLIC_AI_URL ?? "http://localhost:8001";
}

function hasWindow() {
  return typeof window !== "undefined";
}

export function getAccessToken(): string | null {
  if (!hasWindow()) return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (!hasWindow()) return null;
  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setSession(session: AuthSession) {
  if (!hasWindow()) return;
  if (session.access_token) window.localStorage.setItem(ACCESS_TOKEN_KEY, session.access_token);
  if (session.refresh_token) window.localStorage.setItem(REFRESH_TOKEN_KEY, session.refresh_token);
}

export function clearSession() {
  if (!hasWindow()) return;
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export async function signup(email: string, password: string): Promise<AuthSession> {
  const res = await fetch(`${apiBase()}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  const json = (await safeJson(res)) as any;
  if (!res.ok) {
    const msg = typeof json === "string" ? json : json?.detail ?? json?.message ?? `Signup failed: ${res.status}`;
    throw new Error(String(msg));
  }
  const session: AuthSession = {
    access_token: json?.access_token ?? null,
    refresh_token: json?.refresh_token ?? null,
    token_type: json?.token_type ?? null,
    expires_in: json?.expires_in ?? null,
    expires_at: json?.expires_at ?? null,
    user: json?.user ?? null
  };
  setSession(session);
  return session;
}

export async function login(email: string, password: string): Promise<AuthSession> {
  const res = await fetch(`${apiBase()}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  const json = (await safeJson(res)) as any;
  if (!res.ok) {
    const msg = typeof json === "string" ? json : json?.detail ?? json?.message ?? `Login failed: ${res.status}`;
    throw new Error(String(msg));
  }
  const session: AuthSession = {
    access_token: json?.access_token ?? null,
    refresh_token: json?.refresh_token ?? null,
    token_type: json?.token_type ?? null,
    expires_in: json?.expires_in ?? null,
    expires_at: json?.expires_at ?? null,
    user: json?.user ?? null
  };
  setSession(session);
  return session;
}

export async function refresh(): Promise<AuthSession | null> {
  const rt = getRefreshToken();
  if (!rt) return null;
  const res = await fetch(`${apiBase()}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: rt })
  });
  const json = (await safeJson(res)) as any;
  if (!res.ok) {
    clearSession();
    return null;
  }
  const session: AuthSession = {
    access_token: json?.access_token ?? null,
    refresh_token: json?.refresh_token ?? null,
    token_type: json?.token_type ?? null,
    expires_in: json?.expires_in ?? null,
    expires_at: json?.expires_at ?? null,
    user: json?.user ?? null
  };
  setSession(session);
  return session;
}

export async function fetchAuthed(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const token = getAccessToken();

  const headers = new Headers(init.headers ?? undefined);
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let res = await fetch(input, { ...init, headers });
  if (res.status !== 401) return res;

  const newSession = await refresh();
  if (!newSession?.access_token) return res;

  const headers2 = new Headers(init.headers ?? undefined);
  headers2.set("Authorization", `Bearer ${newSession.access_token}`);
  res = await fetch(input, { ...init, headers: headers2 });
  return res;
}

export async function requireAuthOrRedirect(redirectTo: string = "/login") {
  const token = getAccessToken();
  if (token) return;
  const refreshed = await refresh();
  if (refreshed?.access_token) return;
  if (hasWindow()) window.location.href = redirectTo;
}

export async function logout() {
  try {
    await fetchAuthed(`${apiBase()}/auth/logout`, { method: "POST" });
  } finally {
    clearSession();
  }
}

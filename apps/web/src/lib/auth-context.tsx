"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { AuthUser } from "@fasal-slot/types";
import { apiFetch, apiJson, ApiError } from "./api";

type Status = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  status: Status;
  user: AuthUser | null;
  requestOtp: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, otp: string) => Promise<void>;
  loginWithPassword: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  authFetch: (path: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const CACHED_USER_KEY = "fasal_user";

interface SessionResponse {
  access_token: string;
  user: AuthUser;
}

function cacheUser(user: AuthUser | null) {
  try {
    if (user) localStorage.setItem(CACHED_USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(CACHED_USER_KEY);
  } catch {
    // localStorage unavailable (private mode, etc.) — non-fatal, display-only cache.
  }
}

function readCachedUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(CACHED_USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const accessTokenRef = useRef<string | null>(null);

  const setSession = useCallback((session: SessionResponse) => {
    accessTokenRef.current = session.access_token;
    setUser(session.user);
    cacheUser(session.user);
    setStatus("authenticated");
  }, []);

  const clearSession = useCallback(() => {
    accessTokenRef.current = null;
    setUser(null);
    cacheUser(null);
    setStatus("unauthenticated");
  }, []);

  const refresh = useCallback(async (): Promise<string | null> => {
    try {
      const res = await apiFetch("/auth/refresh", { method: "POST" });
      if (!res.ok) return null;
      const body = (await res.json()) as { access_token: string };
      accessTokenRef.current = body.access_token;
      return body.access_token;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    (async () => {
      const token = await refresh();
      if (!token) {
        clearSession();
        return;
      }
      // Refresh only returns a token, not the profile — fall back to the
      // cached (non-sensitive) profile for continuity across reloads.
      setUser(readCachedUser());
      setStatus("authenticated");
    })();
  }, [refresh, clearSession]);

  const requestOtp = useCallback(async (phone: string) => {
    await apiJson("/auth/otp/request", {
      method: "POST",
      body: JSON.stringify({ phone }),
    });
  }, []);

  const verifyOtp = useCallback(
    async (phone: string, otp: string) => {
      const session = await apiJson<SessionResponse>("/auth/otp/verify", {
        method: "POST",
        body: JSON.stringify({ phone, otp }),
      });
      setSession(session);
    },
    [setSession]
  );

  const loginWithPassword = useCallback(
    async (email: string, password: string) => {
      const session = await apiJson<SessionResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setSession(session);
    },
    [setSession]
  );

  const logout = useCallback(async () => {
    try {
      await apiFetch("/auth/logout", {
        method: "POST",
        headers: accessTokenRef.current
          ? { Authorization: `Bearer ${accessTokenRef.current}` }
          : {},
      });
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const authFetch = useCallback(
    async (path: string, options: RequestInit = {}): Promise<Response> => {
      const withAuth = (token: string | null) => ({
        ...options,
        headers: {
          ...options.headers,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      let res = await apiFetch(path, withAuth(accessTokenRef.current));
      if (res.status === 401) {
        const newToken = await refresh();
        if (!newToken) {
          clearSession();
          throw new ApiError(401, "session expired");
        }
        res = await apiFetch(path, withAuth(newToken));
      }
      return res;
    },
    [refresh, clearSession]
  );

  return (
    <AuthContext.Provider
      value={{ status, user, requestOtp, verifyOtp, loginWithPassword, logout, authFetch }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

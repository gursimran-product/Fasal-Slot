"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { AuthUser, Language } from "@fasal-slot/types";
import { apiFetch, apiJson, ApiError } from "./api";
import { identifyUser, resetAnalytics } from "./analytics-client";

type Status = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  status: Status;
  user: AuthUser | null;
  requestOtp: (phone: string) => Promise<string>;
  verifyOtp: (phone: string, otp: string, language?: Language) => Promise<AuthUser>;
  loginWithPassword: (email: string, password: string, token?: string) => Promise<void>;
  loginAsAgent: (licenseNumber: string, phone: string, mpin: string) => Promise<void>;
  logout: () => Promise<void>;
  authFetch: (path: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface SessionResponse {
  access_token: string;
  user: AuthUser;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const accessTokenRef = useRef<string | null>(null);

  const setSession = useCallback((session: SessionResponse) => {
    accessTokenRef.current = session.access_token;
    setUser(session.user);
    setStatus("authenticated");
    identifyUser(session.user);
  }, []);

  const clearSession = useCallback(() => {
    accessTokenRef.current = null;
    setUser(null);
    setStatus("unauthenticated");
    resetAnalytics();
  }, []);

  // Refresh is the single source of truth for restoring a session: it
  // returns both a fresh access token and the current user record, so the
  // UI never ends up "authenticated" with stale or missing profile data.
  const refresh = useCallback(async (): Promise<SessionResponse | null> => {
    try {
      const res = await apiFetch("/auth/refresh", { method: "POST" });
      if (!res.ok) return null;
      const session = (await res.json()) as SessionResponse;
      accessTokenRef.current = session.access_token;
      return session;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    (async () => {
      const session = await refresh();
      if (!session) clearSession();
      else setSession(session);
    })();
  }, [refresh, clearSession, setSession]);

  const requestOtp = useCallback(async (phone: string) => {
    // No SMS provider is connected — the API returns the OTP directly so the
    // caller can display it on screen instead of it arriving by text.
    const { otp } = await apiJson<{ expires_in: number; otp: string }>("/auth/otp/request", {
      method: "POST",
      body: JSON.stringify({ phone }),
    });
    return otp;
  }, []);

  const verifyOtp = useCallback(
    async (phone: string, otp: string, language?: Language) => {
      const session = await apiJson<SessionResponse>("/auth/otp/verify", {
        method: "POST",
        body: JSON.stringify({ phone, otp }),
      });
      setSession(session);

      if (language && session.user.role === "farmer") {
        // Best-effort: persist the language picked during login. Not fatal if
        // it fails — the farmer can still change it later from their profile.
        await apiFetch(`/farmers/${session.user.id}/language`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ language }),
        }).catch(() => {});
      }

      return session.user;
    },
    [setSession]
  );

  const loginWithPassword = useCallback(
    async (email: string, password: string, token?: string) => {
      const session = await apiJson<SessionResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password, token }),
      });
      setSession(session);
    },
    [setSession]
  );

  const loginAsAgent = useCallback(
    async (licenseNumber: string, phone: string, mpin: string) => {
      const session = await apiJson<SessionResponse>("/auth/agent-login", {
        method: "POST",
        body: JSON.stringify({ licenseNumber, phone, mpin }),
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
        const session = await refresh();
        if (!session) {
          clearSession();
          throw new ApiError(401, "session expired");
        }
        setUser(session.user);
        res = await apiFetch(path, withAuth(session.access_token));
      }
      return res;
    },
    [refresh, clearSession]
  );

  return (
    <AuthContext.Provider
      value={{ status, user, requestOtp, verifyOtp, loginWithPassword, loginAsAgent, logout, authFetch }}
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

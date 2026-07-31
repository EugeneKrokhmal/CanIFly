"use client";

import { create } from "zustand";
import type { AppLocale } from "@/i18n/routing";

export type { AppLocale };

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  operatorNumber: string | null;
  bio: string | null;
  avatarUrl: string | null;
  locale: AppLocale;
};

type AuthState = {
  user: AuthUser | null;
  /** Locale explicitly returned/saved by the API; drives restore-on-login. */
  serverLocale: AppLocale | null;
  loading: boolean;
  authModalOpen: boolean;
  authModalMode: "login" | "register" | "forgot";
  pendingVerifyEmail: string | null;
  authNotice: string | null;
  /** null = not fetched yet; set on app boot so the login modal can show Google immediately. */
  googleOAuthEnabled: boolean | null;
  setAuthNotice: (message: string | null) => void;
  setAuthModalOpen: (
    open: boolean,
    mode?: "login" | "register" | "forgot",
  ) => void;
  setUser: (user: AuthUser | null) => void;
  fetchMe: () => Promise<void>;
  fetchGoogleOAuthEnabled: () => Promise<void>;
  login: (
    email: string,
    password: string,
  ) => Promise<{ error: string | null; needsVerification?: boolean }>;
  register: (input: {
    email: string;
    password: string;
    name: string;
    operatorNumber?: string;
    locale?: AppLocale;
  }) => Promise<{ error: string | null; needsVerification?: boolean }>;
  updateLocale: (locale: AppLocale) => Promise<string | null>;
  resendVerification: (email: string) => Promise<string | null>;
  requestPasswordReset: (email: string) => Promise<string | null>;
  logout: () => Promise<void>;
};

function parseServerLocale(value: unknown): AppLocale | null {
  return value === "en" ||
    value === "es" ||
    value === "de" ||
    value === "fr" ||
    value === "pl" ||
    value === "cs"
    ? value
    : null;
}

function normalizeLocale(value: unknown, fallback: AppLocale = "es"): AppLocale {
  return parseServerLocale(value) ?? fallback;
}

function normalizeUser(
  user: AuthUser,
  fallbackLocale: AppLocale = "es",
): AuthUser {
  return { ...user, locale: normalizeLocale(user.locale, fallbackLocale) };
}

async function parseError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string };
    return data.error ?? `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  serverLocale: null,
  loading: true,
  authModalOpen: false,
  authModalMode: "login",
  pendingVerifyEmail: null,
  authNotice: null,
  googleOAuthEnabled: null,

  setAuthNotice: (message) => set({ authNotice: message }),

  setAuthModalOpen: (open, mode) =>
    set((s) => ({
      authModalOpen: open,
      authModalMode: mode ?? s.authModalMode,
      ...(open ? {} : { pendingVerifyEmail: null, authNotice: null }),
    })),

  setUser: (user) =>
    set((s) => ({
      user: user
        ? normalizeUser(
            {
              ...user,
              locale: user.locale ?? s.user?.locale ?? "es",
            },
            s.user?.locale ?? "es",
          )
        : null,
      pendingVerifyEmail: null,
    })),

  fetchMe: async () => {
    set({ loading: true });
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (!res.ok) {
        set({ user: null, serverLocale: null, loading: false });
        return;
      }
      const data = (await res.json()) as { user: AuthUser };
      const serverLocale = parseServerLocale(data.user.locale);
      set((s) => ({
        user: normalizeUser(
          data.user,
          serverLocale ?? s.user?.locale ?? "es",
        ),
        serverLocale,
        loading: false,
      }));
    } catch {
      set({ user: null, serverLocale: null, loading: false });
    }
  },

  fetchGoogleOAuthEnabled: async () => {
    if (useAuthStore.getState().googleOAuthEnabled !== null) return;
    try {
      const res = await fetch("/api/auth/google/enabled", {
        credentials: "include",
      });
      const data = (await res.json()) as { enabled?: boolean };
      set({ googleOAuthEnabled: Boolean(data.enabled) });
    } catch {
      set({ googleOAuthEnabled: false });
    }
  },

  login: async (email, password) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (res.status === 403) {
      const data = (await res.json().catch(() => ({}))) as {
        code?: string;
        email?: string;
        error?: string;
      };
      if (data.code === "EMAIL_NOT_VERIFIED") {
        set({ pendingVerifyEmail: data.email ?? email.toLowerCase() });
        return {
          error: data.error ?? "Email not verified",
          needsVerification: true,
        };
      }
    }
    if (!res.ok) return { error: await parseError(res) };
    const data = (await res.json()) as { user: AuthUser };
    const serverLocale = parseServerLocale(data.user.locale);
    set({
      user: normalizeUser(data.user, serverLocale ?? "es"),
      serverLocale,
      authModalOpen: false,
      pendingVerifyEmail: null,
    });
    return { error: null };
  },

  register: async (input) => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: input.email,
        password: input.password,
        name: input.name,
        operatorNumber: input.operatorNumber || null,
        locale: normalizeLocale(input.locale),
      }),
    });
    if (!res.ok) return { error: await parseError(res) };
    const data = (await res.json()) as {
      user?: AuthUser;
      needsVerification?: boolean;
      email?: string;
    };
    if (data.needsVerification) {
      set({
        pendingVerifyEmail: data.email ?? input.email.toLowerCase(),
        user: null,
      });
      return { error: null, needsVerification: true };
    }
    if (data.user) {
      const serverLocale = parseServerLocale(data.user.locale);
      set({
        user: normalizeUser(data.user, serverLocale ?? "es"),
        serverLocale,
        authModalOpen: false,
        pendingVerifyEmail: null,
      });
    }
    return { error: null };
  },

  updateLocale: async (locale) => {
    const res = await fetch("/api/auth/locale", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale }),
    });
    if (!res.ok) return parseError(res);
    const data = (await res.json()) as { user: AuthUser };
    const serverLocale = parseServerLocale(data.user.locale) ?? locale;
    set({
      user: normalizeUser(data.user, serverLocale),
      serverLocale,
    });
    return null;
  },

  resendVerification: async (email) => {
    const res = await fetch("/api/auth/resend-verification", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) return parseError(res);
    return null;
  },

  requestPasswordReset: async (email) => {
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) return parseError(res);
    return null;
  },

  logout: async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    set({ user: null, serverLocale: null });
  },
}));

"use client";

import { create } from "zustand";

export type AppLocale = "es" | "en";

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
  loading: boolean;
  authModalOpen: boolean;
  authModalMode: "login" | "register";
  pendingVerifyEmail: string | null;
  setAuthModalOpen: (open: boolean, mode?: "login" | "register") => void;
  setUser: (user: AuthUser | null) => void;
  fetchMe: () => Promise<void>;
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
  logout: () => Promise<void>;
};

function normalizeLocale(value: unknown): AppLocale {
  return value === "en" ? "en" : "es";
}

function normalizeUser(user: AuthUser): AuthUser {
  return { ...user, locale: normalizeLocale(user.locale) };
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
  loading: true,
  authModalOpen: false,
  authModalMode: "login",
  pendingVerifyEmail: null,

  setAuthModalOpen: (open, mode) =>
    set((s) => ({
      authModalOpen: open,
      authModalMode: mode ?? s.authModalMode,
      ...(open ? {} : { pendingVerifyEmail: null }),
    })),

  setUser: (user) =>
    set((s) => ({
      user: user
        ? normalizeUser({
            ...user,
            locale: user.locale ?? s.user?.locale ?? "es",
          })
        : null,
      pendingVerifyEmail: null,
    })),

  fetchMe: async () => {
    set({ loading: true });
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (!res.ok) {
        set({ user: null, loading: false });
        return;
      }
      const data = (await res.json()) as { user: AuthUser };
      set({ user: normalizeUser(data.user), loading: false });
    } catch {
      set({ user: null, loading: false });
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
    set({
      user: normalizeUser(data.user),
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
      set({
        user: normalizeUser(data.user),
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
    set({ user: normalizeUser(data.user) });
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

  logout: async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    set({ user: null });
  },
}));

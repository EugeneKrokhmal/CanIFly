"use client";

import { create } from "zustand";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  operatorNumber: string | null;
  bio: string | null;
  avatarUrl: string | null;
};

type AuthState = {
  user: AuthUser | null;
  loading: boolean;
  authModalOpen: boolean;
  authModalMode: "login" | "register";
  setAuthModalOpen: (open: boolean, mode?: "login" | "register") => void;
  setUser: (user: AuthUser | null) => void;
  fetchMe: () => Promise<void>;
  login: (email: string, password: string) => Promise<string | null>;
  register: (input: {
    email: string;
    password: string;
    name: string;
    operatorNumber?: string;
  }) => Promise<string | null>;
  logout: () => Promise<void>;
};

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

  setAuthModalOpen: (open, mode) =>
    set((s) => ({
      authModalOpen: open,
      authModalMode: mode ?? s.authModalMode,
    })),

  setUser: (user) => set({ user }),

  fetchMe: async () => {
    set({ loading: true });
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (!res.ok) {
        set({ user: null, loading: false });
        return;
      }
      const data = (await res.json()) as { user: AuthUser };
      set({ user: data.user, loading: false });
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
    if (!res.ok) return parseError(res);
    const data = (await res.json()) as { user: AuthUser };
    set({ user: data.user, authModalOpen: false });
    return null;
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
      }),
    });
    if (!res.ok) return parseError(res);
    const data = (await res.json()) as { user: AuthUser };
    set({ user: data.user, authModalOpen: false });
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

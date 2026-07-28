"use client";

import {
  OBSTACLE_TYPE_LABELS,
  type ObstacleType,
} from "@canifly/middleware";
import { create } from "zustand";

export type { ObstacleType };
export { OBSTACLE_TYPE_LABELS };

type ObstacleDraft = {
  type: ObstacleType;
  heightM: number;
  message: string;
};

type PendingPoint = { lat: number; lng: number } | null;

type ObstaclesState = {
  placementMode: boolean;
  draft: ObstacleDraft;
  photoFile: File | null;
  photoPreview: string | null;
  pendingPoint: PendingPoint;
  submitting: boolean;
  error: string | null;
  refreshToken: number;
  setDraft: (patch: Partial<ObstacleDraft>) => void;
  setPhoto: (file: File | null) => void;
  startPlacement: () => void;
  cancelPlacement: () => void;
  setPendingPoint: (point: PendingPoint) => void;
  bumpRefresh: () => void;
  submitObstacle: () => Promise<string | null>;
  deleteObstacle: (id: string) => Promise<string | null>;
  voteObstacle: (
    id: string,
    value: "up" | "down" | null,
  ) => Promise<
    | {
        vote: {
          likes: number;
          dislikes: number;
          myVote: "up" | "down" | null;
          inactive: boolean;
        };
      }
    | { error: string }
  >;
};

const DEFAULT_DRAFT: ObstacleDraft = {
  type: "construction",
  heightM: 30,
  message: "",
};

function clearPreview(url: string | null) {
  if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
}

export const useObstaclesStore = create<ObstaclesState>((set, get) => ({
  placementMode: false,
  draft: { ...DEFAULT_DRAFT },
  photoFile: null,
  photoPreview: null,
  pendingPoint: null,
  submitting: false,
  error: null,
  refreshToken: 0,

  setDraft: (patch) =>
    set((s) => ({ draft: { ...s.draft, ...patch }, error: null })),

  setPhoto: (file) => {
    const prev = get().photoPreview;
    clearPreview(prev);
    if (!file) {
      set({ photoFile: null, photoPreview: null, error: null });
      return;
    }
    set({
      photoFile: file,
      photoPreview: URL.createObjectURL(file),
      error: null,
    });
  },

  startPlacement: () => {
    clearPreview(get().photoPreview);
    set({
      placementMode: true,
      pendingPoint: null,
      photoFile: null,
      photoPreview: null,
      draft: { ...DEFAULT_DRAFT },
      error: null,
    });
  },

  cancelPlacement: () => {
    clearPreview(get().photoPreview);
    set({
      placementMode: false,
      pendingPoint: null,
      submitting: false,
      photoFile: null,
      photoPreview: null,
      error: null,
    });
  },

  setPendingPoint: (point) => set({ pendingPoint: point, error: null }),

  bumpRefresh: () => set((s) => ({ refreshToken: s.refreshToken + 1 })),

  submitObstacle: async () => {
    const { draft, pendingPoint, photoFile } = get();
    if (!pendingPoint) return "Tap the map to place the obstacle first.";

    set({ submitting: true, error: null });
    try {
      const form = new FormData();
      form.set("type", draft.type);
      form.set("lat", String(pendingPoint.lat));
      form.set("lng", String(pendingPoint.lng));
      form.set("heightM", String(draft.heightM));
      if (draft.message.trim()) form.set("message", draft.message.trim());
      if (photoFile) form.set("photo", photoFile);

      const res = await fetch("/api/obstacles", {
        method: "POST",
        credentials: "include",
        body: form,
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        const msg = data?.error ?? `Failed (${res.status})`;
        set({ submitting: false, error: msg });
        return msg;
      }
      clearPreview(get().photoPreview);
      set({
        submitting: false,
        placementMode: false,
        pendingPoint: null,
        draft: { ...DEFAULT_DRAFT },
        photoFile: null,
        photoPreview: null,
        refreshToken: get().refreshToken + 1,
      });
      return null;
    } catch {
      const msg = "Network error";
      set({ submitting: false, error: msg });
      return msg;
    }
  },

  deleteObstacle: async (id) => {
    try {
      const res = await fetch(`/api/obstacles/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        return data?.error ?? `Failed (${res.status})`;
      }
      set((s) => ({ refreshToken: s.refreshToken + 1 }));
      return null;
    } catch {
      return "Network error";
    }
  },

  voteObstacle: async (id, value) => {
    try {
      const res = await fetch(`/api/obstacles/${id}/vote`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        vote?: {
          likes: number;
          dislikes: number;
          myVote: "up" | "down" | null;
          inactive: boolean;
        };
      } | null;
      if (!res.ok || !data?.vote) {
        return { error: data?.error ?? `Failed (${res.status})` };
      }
      set((s) => ({ refreshToken: s.refreshToken + 1 }));
      return { vote: data.vote };
    } catch {
      return { error: "Network error" };
    }
  },
}));

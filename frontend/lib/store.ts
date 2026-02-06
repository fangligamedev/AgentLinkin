"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  id: string;
  email: string;
  name: string;
  handle: string;
  avatarUrl?: string;
  token: string;
}

interface Agent {
  id: string;
  name: string;
  slug: string;
  emoji: string;
  token: string;
}

interface AuthState {
  user: User | null;
  currentAgent: Agent | null;
  setUser: (user: User | null) => void;
  setCurrentAgent: (agent: Agent | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      currentAgent: null,
      setUser: (user) => set({ user }),
      setCurrentAgent: (agent) => set({ currentAgent: agent }),
      logout: () => set({ user: null, currentAgent: null }),
    }),
    {
      name: "agentlink-auth",
    }
  )
);

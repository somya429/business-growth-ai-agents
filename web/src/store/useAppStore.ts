import { create } from 'zustand';
import { AgentDefinition } from '../api/types';

export interface ToastItem {
  id: string;
  type: 'info' | 'success' | 'warning' | 'danger';
  title: string;
  message?: string;
}

interface AppState {
  theme: 'dark' | 'light';
  activeBusinessId: string | null;
  activeRunId: string | null;
  selectedFlagId: string | null;
  activeAgentDrawer: AgentDefinition | null;
  hasSeenIntro: boolean;
  toasts: ToastItem[];

  // Actions
  setTheme: (theme: 'dark' | 'light') => void;
  toggleTheme: () => void;
  setActiveBusinessId: (id: string | null) => void;
  setActiveRunId: (id: string | null) => void;
  setSelectedFlagId: (id: string | null) => void;
  setActiveAgentDrawer: (agent: AgentDefinition | null) => void;
  setHasSeenIntro: (seen: boolean) => void;
  addToast: (toast: Omit<ToastItem, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  theme: 'dark',
  activeBusinessId: null,
  activeRunId: null,
  selectedFlagId: null,
  activeAgentDrawer: null,
  hasSeenIntro: false,
  toasts: [],

  setTheme: (theme) => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
    set({ theme });
  },

  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    get().setTheme(next);
  },

  setActiveBusinessId: (id) => set({ activeBusinessId: id }),
  setActiveRunId: (id) => set({ activeRunId: id, selectedFlagId: null }),
  setSelectedFlagId: (id) => set({ selectedFlagId: id }),
  setActiveAgentDrawer: (agent) => set({ activeAgentDrawer: agent }),
  setHasSeenIntro: (seen) => {
    localStorage.setItem('verity_intro_seen', String(seen));
    set({ hasSeenIntro: seen });
  },

  addToast: (toast) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newToast: ToastItem = { ...toast, id };
    set((state) => ({ toasts: [...state.toasts, newToast] }));
    setTimeout(() => {
      get().removeToast(id);
    }, 4000);
  },

  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
}));

import React, { createContext, useContext, useMemo, useRef, useState } from 'react';

export interface NotificationItem {
  key: string;
  text: string;
  to?: { path: string; view?: string } | null;
  read: boolean;
}

export interface BubbleState {
  id: number;
  text: string;
  mood: string;
  actions: string[];
  noteKey?: string | null;
}

export interface FlashState {
  m: 'hop' | 'happy' | 'oops' | string;
  k: number;
}

export interface BuddyActions {
  say: (text: string, mood?: string, opts?: { actions?: string[]; noteKey?: string; ms?: number }) => void;
  react: (mood: string) => void;
  close: () => void;
  holdBubble: (on: boolean) => void;
  setBusy: (busy: boolean) => void;
  notify: (n: { key: string; text: string; to?: { path: string; view?: string } }) => void;
  markRead: (key: string) => void;
}

export interface BuddyState {
  bubble: BubbleState | null;
  flash: FlashState | null;
  busy: boolean;
  notes: NotificationItem[];
}

const noop = () => {};

const ActionsCtx = createContext<BuddyActions>({
  say: noop,
  react: noop,
  close: noop,
  holdBubble: noop,
  setBusy: noop,
  notify: noop,
  markRead: noop,
});

const StateCtx = createContext<BuddyState>({
  bubble: null,
  flash: null,
  busy: false,
  notes: [],
});

export const useBuddy = () => useContext(ActionsCtx);
export const useBuddyState = () => useContext(StateCtx);

export const BuddyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bubble, setBubble] = useState<BubbleState | null>(null);
  const [flash, setFlash] = useState<FlashState | null>(null);
  const [notes, setNotes] = useState<NotificationItem[]>([]);
  const notesRef = useRef<NotificationItem[]>([]);
  const [busy, setBusy] = useState(false);
  const timers = useRef<{ flash?: any; bubble?: any }>({});
  const last = useRef(0);

  const actions = useMemo(() => {
    const react = (m: string) => {
      clearTimeout(timers.current.flash);
      setFlash({ m, k: Date.now() + Math.random() });
      timers.current.flash = setTimeout(() => setFlash(null), 900);
    };

    const arm = (ms: number) => {
      clearTimeout(timers.current.bubble);
      timers.current.bubble = setTimeout(() => setBubble(null), ms);
    };

    const say = (text: string, mood = 'idle', opts: { actions?: string[]; noteKey?: string; ms?: number } = {}) => {
      last.current = opts.ms || 6500;
      setBubble({
        id: Date.now() + Math.random(),
        text,
        mood,
        actions: opts.actions || [],
        noteKey: opts.noteKey || null,
      });
      if (mood === 'happy' || mood === 'oops' || mood === 'hop') react(mood);
      arm(last.current);
    };

    const close = () => {
      clearTimeout(timers.current.bubble);
      setBubble(null);
    };

    const holdBubble = (on: boolean) => {
      if (on) {
        clearTimeout(timers.current.bubble);
      } else {
        arm(2500);
      }
    };

    const notify = (n: { key: string; text: string; to?: { path: string; view?: string } }) => {
      if (!n || !n.key || notesRef.current.some((x) => x.key === n.key)) return;
      const note: NotificationItem = { key: n.key, text: n.text, to: n.to || null, read: false };
      notesRef.current = [note, ...notesRef.current].slice(0, 20);
      setNotes(notesRef.current);
      say(n.text, 'hop', { actions: ['open', 'later'], noteKey: n.key, ms: 9000 });
    };

    const markRead = (key: string) => {
      notesRef.current = notesRef.current.map((x) => (x.key === key ? { ...x, read: true } : x));
      setNotes(notesRef.current);
    };

    return { say, react, close, holdBubble, setBusy, notify, markRead };
  }, []);

  const state = useMemo(() => ({ bubble, flash, busy, notes }), [bubble, flash, busy, notes]);

  return (
    <ActionsCtx.Provider value={actions}>
      <StateCtx.Provider value={state}>{children}</StateCtx.Provider>
    </ActionsCtx.Provider>
  );
};

export default BuddyProvider;

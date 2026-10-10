import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Mascot from '../components/Mascot';
import { useBuddy, useBuddyState } from './BuddyContext';
import {
  WELCOME,
  FUNNY,
  TIPS,
  ROUTE_KEY,
  HELP_ROUTES,
  CLICK_LINES,
  LOOKS,
  FEED,
  FEED_EVERY_MS,
} from './buddyData';

const KEY = 'gx_buddy';
const load = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}') || {};
  } catch (e) {
    return {};
  }
};
const save = (patch: Record<string, any>) => {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...load(), ...patch }));
  } catch (e) {
    /* ignore */
  }
};
const sizeFor = () => (window.innerWidth < 640 ? 84 : 118);
const reducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Breaks elements into pixels that fall
function shatter(els: Element[]) {
  if (reducedMotion() || !els.length) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = window.innerWidth;
  const H = window.innerHeight;
  const cv = document.createElement('canvas');
  cv.width = W * dpr;
  cv.height = H * dpr;
  cv.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;z-index:70;pointer-events:none';
  document.body.appendChild(cv);
  const ctx = cv.getContext('2d');
  if (!ctx) {
    cv.remove();
    return;
  }
  ctx.scale(dpr, dpr);
  const css = getComputedStyle(document.documentElement);
  const col = (n: string, d: string) => css.getPropertyValue(n).trim() || d;
  const ink = col('--ink', '#49372C');
  const paper = col('--paper', '#FBF8F1');
  const accent = col('--accent', '#E98238');
  const PX = 8;
  const parts: any[] = [];
  els.forEach((el) => {
    const r = el.getBoundingClientRect();
    const cols = Math.max(1, Math.round(r.width / PX));
    const rows = Math.max(1, Math.round(r.height / PX));
    const w = r.width / cols;
    const h = r.height / rows;
    for (let ci = 0; ci < cols; ci++) {
      for (let ri = 0; ri < rows; ri++) {
        const edge = ci === 0 || ri === 0 || ci === cols - 1 || ri === rows - 1;
        const rnd = Math.random();
        const x = r.left + ci * w;
        const y = r.top + ri * h;
        parts.push({
          x,
          y,
          w,
          h,
          t: Math.random() * 260,
          vx: (Math.random() - 0.5) * 6 + ((x - W / 2) / W) * 5,
          vy: -(Math.random() * 6 + 1),
          c: edge ? ink : rnd < 0.2 ? ink : rnd < 0.25 ? accent : paper,
        });
      }
    }
  });

  let last = performance.now();
  const start = last;
  const tick = (now: number) => {
    const dt = Math.min(2.5, (now - last) / 16.7);
    last = now;
    const age = now - start;
    ctx.clearRect(0, 0, W, H);
    let alive = 0;
    for (const q of parts) {
      if (age > q.t) {
        q.vy += 0.55 * dt;
        q.x += q.vx * dt;
        q.y += q.vy * dt;
      }
      if (q.y > H + 20) continue;
      alive++;
      ctx.fillStyle = q.c;
      ctx.fillRect(q.x, q.y, q.w, q.h);
      if (q.c === paper) {
        ctx.strokeStyle = 'rgba(73,55,44,.35)';
        ctx.strokeRect(q.x + 0.5, q.y + 0.5, q.w - 1, q.h - 1);
      }
    }
    if (alive && age < 4500) requestAnimationFrame(tick);
    else cv.remove();
  };
  requestAnimationFrame(tick);
}

export const Buddy: React.FC = () => {
  const { bubble, flash, busy, notes } = useBuddyState();
  const { say, react, close, holdBubble, markRead, notify } = useBuddy();
  const navigate = useNavigate();
  const unread = notes.filter((n) => !n.read);
  const { pathname } = useLocation();
  const key = ROUTE_KEY[pathname] || 'home';

  const saved = useRef(load());
  const [hidden, setHidden] = useState(!!saved.current.hidden);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(saved.current.pos || null);
  const [size, setSize] = useState(sizeFor);
  const [dragging, setDragging] = useState(false);
  const [fan, setFan] = useState(false);
  const prevUnread = useRef(0);
  const [peek, setPeek] = useState(false);
  const [, force] = useState(0);

  const box = useRef<HTMLDivElement | null>(null);
  const leanEl = useRef<HTMLSpanElement | null>(null);
  const drag = useRef<{ sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(null);
  const clicks = useRef(0);
  const funnyAt = useRef(-1);
  const tipAt = useRef<Record<string, number>>({});
  const helped = useRef<Record<string, boolean>>({});
  const noteAt = useRef(0);
  const pathRef = useRef(pathname);
  pathRef.current = pathname;
  const unreadNow = useRef(0);
  unreadNow.current = unread.length;

  const clampPos = (p: { x: number; y: number }) => ({
    x: Math.min(Math.max(8, p.x), Math.max(8, window.innerWidth - size - 8)),
    y: Math.min(Math.max(8, p.y), Math.max(8, window.innerHeight - size - 8)),
  });
  const place = clampPos(pos || { x: window.innerWidth - size - 24, y: window.innerHeight - size - 24 });

  const fanned = fan && !hidden && unread.length > 0;
  const W = window.innerWidth;
  const H = window.innerHeight;
  const cx = W / 2;
  const cy = H - size / 2 - 36;
  const FAN_MAX = Math.max(2, Math.min(5, Math.floor((cy - size / 2 - 120) / 66)));
  const shown = fanned ? { x: cx - size / 2, y: cy - size / 2 } : place;

  useEffect(() => {
    if (!hidden && unread.length > 2 && unread.length > prevUnread.current) {
      setFan(true);
      close();
    }
    if (unread.length === 0) setFan(false);
    prevUnread.current = unread.length;
  }, [unread.length, hidden, close]);

  function closeFan() {
    shatter(Array.from(document.querySelectorAll('.buddy-note, .buddy-x')));
    setFan(false);
  }

  useEffect(() => {
    setFan(false);
  }, [pathname]);

  useEffect(() => {
    if (!fan) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeFan();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fan]);

  useEffect(() => {
    const onResize = () => {
      setSize(sizeFor());
      force((n) => n + 1);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Welcome message on home
  useEffect(() => {
    if (saved.current.hidden) return undefined;
    const t = setTimeout(() => {
      if (pathRef.current === '/' && !unreadNow.current) {
        say(WELCOME, 'happy', { actions: ['tip', 'hide'], ms: 9000 });
      }
    }, 1000);
    return () => clearTimeout(t);
  }, [say]);

  // Demo feed
  const feedAt = useRef(0);
  useEffect(() => {
    const t = setInterval(() => {
      if (drag.current && drag.current.moved) return;
      for (let tries = 0; tries < FEED.length; tries++) {
        const f = FEED[feedAt.current % FEED.length];
        feedAt.current++;
        if (f.to.path === pathRef.current) continue;
        notify({ key: 'feed:' + feedAt.current, text: f.text, to: f.to });
        break;
      }
    }, FEED_EVERY_MS);
    return () => clearInterval(t);
  }, [notify]);

  useEffect(() => {
    close();
  }, [pathname, close]);

  // Lean towards cursor
  useEffect(() => {
    if (reducedMotion()) return undefined;
    let raf = 0;
    let ev: PointerEvent | null = null;
    const apply = () => {
      raf = 0;
      const b = box.current;
      const l = leanEl.current;
      if (!b || !l || !ev || (drag.current && drag.current.moved)) return;
      const r = b.getBoundingClientRect();
      const dx = ev.clientX - (r.left + r.width / 2);
      const dy = ev.clientY - (r.top + r.height / 2);
      const dist = Math.hypot(dx, dy) || 1;
      const k = Math.min(1, dist / 420);
      l.style.setProperty('--lx', ((dx / dist) * k).toFixed(3));
      l.style.setProperty('--ly', ((dy / dist) * k).toFixed(3));
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      ev = e;
      if (!raf) raf = requestAnimationFrame(apply);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(raf);
    };
  }, [hidden]);

  // React to clicks
  useEffect(() => {
    let lastAt = 0;
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t || !t.closest) return;
      if (t.closest('.buddy, .buddy-show')) return;
      const now = Date.now();
      if (now - lastAt < 500) return;
      lastAt = now;
      const el = t.closest('button, a');
      const label = el ? (el.textContent || '').trim() : '';
      const hit = CLICK_LINES.find((row) => row[0].test(label));
      if (hit) {
        say(hit[1], hit[2] || 'happy', { ms: 3500 });
        return;
      }
      if (el && Math.random() < 0.35) react('hop');
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [say, react]);

  // 30s quiet help prompt
  useEffect(() => {
    if (!HELP_ROUTES.includes(key) || hidden) return undefined;
    let t: any;
    const arm = () => {
      clearTimeout(t);
      t = setTimeout(() => {
        if (helped.current[key]) return;
        helped.current[key] = true;
        say('Stuck? Click me for a tip.', 'idle', { actions: ['tip', 'hide'], ms: 9000 });
      }, 30000);
    };
    const evs = ['pointerdown', 'keydown', 'scroll'];
    evs.forEach((n) => window.addEventListener(n, arm, { passive: true }));
    arm();
    return () => {
      clearTimeout(t);
      evs.forEach((n) => window.removeEventListener(n, arm));
    };
  }, [key, hidden, say]);

  function showTip() {
    const list = TIPS[key] || TIPS.home;
    const i = (tipAt.current[key] || 0) % list.length;
    tipAt.current[key] = i + 1;
    say(list[i], 'idle', { actions: ['tip', 'hide'], ms: 10000 });
  }

  function showNote(i: number) {
    const list = notes.filter((n) => !n.read);
    if (!list.length) return false;
    const n = list[i % list.length];
    noteAt.current = i % list.length;
    say(n.text, 'hop', {
      actions: list.length > 1 ? ['open', 'next', 'later'] : ['open', 'later'],
      noteKey: n.key,
      ms: 10000,
    });
    return true;
  }

  function openNote(noteKey?: string | null) {
    if (!noteKey) return;
    const n = notes.find((x) => x.key === noteKey);
    markRead(noteKey);
    setFan(false);
    close();
    if (n && n.to) navigate(n.to.path, { state: { view: n.to.view, t: Date.now() } });
  }

  function onBuddyClick() {
    react('hop');
    if (fan) {
      closeFan();
      return;
    }
    if (showNote(0)) return;
    const n = clicks.current++;
    funnyAt.current = n === 0 ? 0 : (funnyAt.current + 1 + Math.floor(Math.random() * 3)) % FUNNY.length;
    say(FUNNY[funnyAt.current], 'idle', { actions: ['tip', 'hide'], ms: 8000 });
  }

  function later() {
    setFan(false);
    close();
  }
  function hide() {
    setHidden(true);
    save({ hidden: true });
    close();
  }
  function show() {
    setHidden(false);
    save({ hidden: false });
    react('hop');
  }

  function down(e: React.PointerEvent<HTMLButtonElement>) {
    if (fan || !box.current) return;
    if (e.button !== undefined && e.button !== 0) return;
    const r = box.current.getBoundingClientRect();
    drag.current = { sx: e.clientX, sy: e.clientY, ox: r.left, oy: r.top, moved: false };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {
      /* ignore */
    }
  }

  function move(e: React.PointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (!d.moved && Math.hypot(dx, dy) > 6) {
      d.moved = true;
      setDragging(true);
      close();
    }
    if (d.moved) setPos(clampPos({ x: d.ox + dx, y: d.oy + dy }));
  }

  function up(cancelled: boolean) {
    return () => {
      const d = drag.current;
      drag.current = null;
      if (!d) return;
      if (d.moved) {
        setDragging(false);
        save({ pos: place });
        react('happy');
      } else if (!cancelled) {
        onBuddyClick();
      }
    };
  }

  function keydown(e: React.KeyboardEvent) {
    const step = 24;
    const m = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    }[e.key];
    if (m) {
      e.preventDefault();
      const p = clampPos({ x: place.x + m[0], y: place.y + m[1] });
      setPos(p);
      save({ pos: p });
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onBuddyClick();
    }
  }

  const seenCount = useRef(0);
  useEffect(() => {
    const n = unread.length;
    if (hidden && n > seenCount.current) {
      setPeek(true);
      const t = setTimeout(() => setPeek(false), 7000);
      seenCount.current = n;
      return () => clearTimeout(t);
    }
    seenCount.current = n;
    return undefined;
  }, [unread.length, hidden]);

  if (hidden) {
    const latest = unread[0];
    return (
      <>
        <div className={'buddy-peek' + (peek && latest ? ' out' : '')}>
          <button
            type="button"
            className="buddy-peek-btn"
            tabIndex={peek && latest ? 0 : -1}
            aria-label="You have a notification. Open it."
            onClick={() => {
              if (latest) {
                setPeek(false);
                openNote(latest.key);
              }
            }}
          >
            <span className="buddy-peek-say">You have a notification</span>
            <span className="buddy-peek-m">
              <Mascot mood="still" size={78} />
            </span>
          </button>
        </div>
        <button
          type="button"
          className={'buddy-show' + (unread.length ? ' glow' : '')}
          onClick={() => {
            setPeek(false);
            show();
          }}
        >
          Show buddy{unread.length > 0 && <span className="buddy-badge">{unread.length}</span>}
        </button>
      </>
    );
  }

  const anim = dragging ? 'drag' : flash ? flash.m : busy ? 'working' : 'idle';
  const below = place.y + size / 2 < window.innerHeight * 0.45;
  const toLeft = place.x + size / 2 > window.innerWidth / 2;
  const tipsSeen = tipAt.current[key] || 0;

  return (
    <>
      {fanned && <div className="buddy-fan" onClick={closeFan} />}
      {fanned && (
        <ul className="buddy-tower" aria-label="Notifications" style={{ bottom: H - (cy - size / 2 - 8) }}>
          <li className="buddy-tower-head">
            <span>{unread.length} new</span>
            <button type="button" className="buddy-x" onClick={closeFan} aria-label="Close notifications">
              ✕
            </button>
          </li>
          {unread.slice(0, FAN_MAX).map((n, i, arr) => (
            <li
              key={n.key}
              style={{
                ['--off' as any]: (i % 2 ? 28 : -28) + 'px',
                ['--d' as any]: (arr.length - 1 - i) * 90 + 'ms',
              }}
            >
              <button type="button" className="buddy-note" onClick={() => openNote(n.key)}>
                <span>{n.text}</span>
                <b aria-hidden="true">→</b>
              </button>
            </li>
          ))}
          {unread.length > FAN_MAX && <li className="buddy-more">+{unread.length - FAN_MAX} more</li>}
        </ul>
      )}
      <div
        className={'buddy' + (dragging ? ' dragging' : '') + (fanned ? ' fanned' : '')}
        ref={box}
        style={{ left: shown.x, top: shown.y, width: size, height: size }}
      >
        <button
          type="button"
          className="buddy-hit"
          aria-label="Verity buddy. Press Enter for help. Use the arrow keys to move it."
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up(false)}
          onPointerCancel={up(true)}
          onKeyDown={keydown}
        >
          <span className="buddy-lean" ref={leanEl}>
            <span className={'buddy-body is-' + anim} key={flash ? flash.k : 'rest'}>
              <Mascot mood="still" size={size} />
            </span>
          </span>
        </button>

        {unread.length > 0 && (
          <span className="buddy-badge" aria-label={unread.length + ' new'}>
            {unread.length}
          </span>
        )}

        {bubble && !fanned && (
          <div
            className={'buddy-bubble ' + (below ? 'below ' : 'above ') + (toLeft ? 'to-left' : 'to-right')}
            role="status"
            onMouseEnter={() => holdBubble(true)}
            onMouseLeave={() => holdBubble(false)}
          >
            <p>{bubble.text}</p>
            {bubble.actions.length > 0 && (
              <div className="buddy-acts">
                {bubble.actions.includes('open') && (
                  <button type="button" className="primary" onClick={() => openNote(bubble.noteKey)}>
                    Open
                  </button>
                )}
                {bubble.actions.includes('next') && (
                  <button type="button" onClick={() => showNote(noteAt.current + 1)}>
                    Next
                  </button>
                )}
                {bubble.actions.includes('later') && (
                  <button type="button" onClick={later}>
                    Later
                  </button>
                )}
                {bubble.actions.includes('tip') && (
                  <button type="button" onClick={showTip}>
                    {tipsSeen ? 'Another tip' : 'Show a tip'}
                  </button>
                )}
                {bubble.actions.includes('hide') && (
                  <button type="button" onClick={hide}>
                    Hide me
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default Buddy;

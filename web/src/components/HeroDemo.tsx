import React, { useEffect, useRef, useState } from 'react';
import { AG, DEMO_GOALS } from '../data/growthxContent';

export const HeroDemo: React.FC = () => {
  const [idx, setIdx] = useState(0);
  const [typed, setTyped] = useState(DEMO_GOALS[0].text);
  const [orch, setOrch] = useState('Picked 3 of 6 agents');
  const [states, setStates] = useState<Record<string, string>>(() => finalStates(DEMO_GOALS[0]));
  const [result, setResult] = useState(DEMO_GOALS[0].res);
  const root = useRef<HTMLDivElement | null>(null);
  const timers = useRef<any[]>([]);
  const reduce = useRef(
    typeof window !== 'undefined' && window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  function finalStates(g: (typeof DEMO_GOALS)[0]) {
    const s: Record<string, string> = {};
    AG.forEach((a) => {
      s[a.id] = g.use.includes(a.id) ? 'done' : 'off';
    });
    return s;
  }

  const clear = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const at = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms));

  const visible = () => {
    const el = root.current;
    if (!el || document.hidden || el.offsetParent === null) return false;
    const r = el.getBoundingClientRect();
    return r.bottom > 60 && r.top < window.innerHeight - 60;
  };

  function play(i: number) {
    clear();
    setIdx(i);
    const g = DEMO_GOALS[i];
    const next = () => {
      if (!visible()) {
        at(1000, next);
        return;
      }
      play((i + 1) % DEMO_GOALS.length);
    };

    if (reduce.current) {
      setTyped(g.text);
      setOrch('Picked ' + g.use.length + ' of 6 agents');
      setStates(finalStates(g));
      setResult(g.res);
      at(6000, next);
      return;
    }

    setTyped('');
    setResult('…');
    setOrch('Listening to objective…');
    const idle: Record<string, string> = {};
    AG.forEach((a) => {
      idle[a.id] = 'idle';
    });
    setStates(idle);

    const step = 24;
    for (let k = 1; k <= g.text.length; k++) {
      at(k * step, () => setTyped(g.text.slice(0, k)));
    }

    const t = g.text.length * step + 350;
    at(t, () => {
      setOrch('Orchestrator picked ' + g.use.length + ' specialized agents');
      setStates((s) => {
        const n = { ...s };
        AG.forEach((a) => {
          if (!g.use.includes(a.id)) n[a.id] = 'off';
        });
        return n;
      });
    });

    g.use.forEach((id, j) => {
      at(t + 450 + j * 900, () => setStates((s) => ({ ...s, [id]: 'work' })));
      at(t + 450 + j * 900 + 750, () => setStates((s) => ({ ...s, [id]: 'done' })));
    });

    const end = t + 450 + g.use.length * 900;
    at(end, () => setResult(g.res));
    at(end + 4000, next);
  }

  useEffect(() => {
    const first = setTimeout(() => play(1), 3500);
    return () => {
      clearTimeout(first);
      clear();
    };
  }, []);

  const label: Record<string, string> = {
    off: 'Not needed',
    work: 'Working…',
    done: 'Verified',
    idle: 'Standby',
  };

  return (
    <div className="demo rv in" ref={root} aria-label="Example of Verity at work">
      <div className="demo-top">
        <span className="eyebrow">
          <span className="dot" /> Interactive Simulation
        </span>
        <div className="goal-tabs">
          {DEMO_GOALS.map((g, i) => (
            <button
              key={g.tab}
              type="button"
              className="chip"
              aria-pressed={i === idx}
              onClick={() => play(i)}
            >
              {g.tab}
            </button>
          ))}
        </div>
      </div>

      <div className="goal">
        <span className="eyebrow">Your directive</span>
        <span className="q">
          <span>{typed}</span>
          <span className="caret" />
        </span>
      </div>

      <div className="orch">
        <span>AUTONOMOUS ORCHESTRATOR</span>
        <span>{orch}</span>
      </div>

      <div className="cells">
        {AG.map((a) => {
          const st = states[a.id] || 'idle';
          return (
            <div
              key={a.id}
              className={`cell ${st === 'off' ? 'off' : st === 'work' ? 'work' : st === 'done' ? 'done' : ''}`}
            >
              <div>
                <b>{a.n}</b>
                <small>{a.d}</small>
              </div>
              <span className="st">{label[st] || st}</span>
            </div>
          );
        })}
      </div>

      <div className="result">
        <span className="eyebrow">Delivered output (held for your review)</span>
        <p>{result}</p>
      </div>
    </div>
  );
};

export default HeroDemo;

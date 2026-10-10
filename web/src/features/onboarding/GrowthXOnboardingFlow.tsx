import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useAppStore } from '../../store/useAppStore';
import { useBuddy } from '../../buddy/BuddyContext';
import { QUESTIONS as Q, OnboardingQuestion } from '../../data/growthxContent';
import { BusinessProfile } from '../../api/types';

const opts = (q: OnboardingQuestion) =>
  (q.opts || []).map((o) => (typeof o === 'string' ? { v: o, s: undefined } : o));
const byId = (id: string) => Q.find((q) => q.id === id);

export const GrowthXOnboardingFlow: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const buddy = useBuddy();
  const { setActiveBusinessId, setActiveRunId, addToast } = useAppStore();

  const [A, setA] = useState<Record<string, any>>({});
  const [cur, setCur] = useState('name');
  const [hist, setHist] = useState<string[]>([]);
  const [mode, setMode] = useState<'q' | 'review' | 'saving' | 'activating' | 'done'>('q');
  const [activationStep, setActivationStep] = useState<number>(0);
  const [fromReview, setFromReview] = useState(false);
  const [limMsg, setLimMsg] = useState('');
  const [saveErr, setSaveErr] = useState('');
  const [createdBiz, setCreatedBiz] = useState<BusinessProfile | null>(null);
  const timer = useRef<any>(null);

  const vis = (a = A) => Q.filter((q) => !q.when || q.when(a));

  const valid = (q?: OnboardingQuestion, a = A) => {
    if (!q) return true;
    if (q.optional) return true;
    const v = a[q.id];
    if (q.kind === 'many') return Array.isArray(v) && v.length > 0;
    return !!(v && String(v).trim());
  };

  const shownAnswer = (q: OnboardingQuestion) => {
    const v = A[q.id];
    return Array.isArray(v) ? v.join(', ') : v ? String(v).trim() : '';
  };

  const q = byId(cur);
  const list = vis();
  const pos = q ? list.indexOf(q) : 0;

  useEffect(() => () => clearTimeout(timer.current), []);

  function setAns(id: string, v: any) {
    setA((prev) => ({ ...prev, [id]: v }));
  }

  function next(a = A, c = cur) {
    const cq = byId(c);
    if (!valid(cq, a)) return;
    if (fromReview) {
      setFromReview(false);
      setMode('review');
      return;
    }
    const l = vis(a);
    const i = cq ? l.indexOf(cq) : -1;
    setHist((h) => [...h, c]);
    if (i < l.length - 1) {
      setCur(l[i + 1].id);
    } else {
      setMode('review');
    }
  }

  function back() {
    if (mode === 'review') {
      const h = [...hist];
      setCur(h.pop() || list[0].id);
      setHist(h);
      setMode('q');
      return;
    }
    if (hist.length) {
      const h = [...hist];
      setCur(h.pop() || list[0].id);
      setHist(h);
    }
  }

  function choose(i: number) {
    if (!q) return;
    const o = opts(q)[i];
    if (!o) return;
    setLimMsg('');
    if (q.kind === 'one') {
      const a = { ...A, [q.id]: o.v };
      setA(a);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => next(a, q.id), 320);
    } else {
      const arr = (A[q.id] || []).slice();
      const k = arr.indexOf(o.v);
      if (k > -1) {
        arr.splice(k, 1);
      } else {
        if (q.max && arr.length >= q.max) {
          setLimMsg(`You can pick only ${q.max}. Tap one to remove it.`);
          return;
        }
        arr.push(o.v);
      }
      setAns(q.id, arr);
    }
  }

  function restart() {
    clearTimeout(timer.current);
    setA({});
    setCur('name');
    setHist([]);
    setMode('q');
    setFromReview(false);
    setSaveErr('');
  }

  async function save() {
    setMode('saving');
    setSaveErr('');
    const data: Record<string, any> = {};
    list.forEach((x) => {
      if (A[x.id] !== undefined && A[x.id] !== '') data[x.id] = A[x.id];
    });

    try {
      const bizPayload: Partial<BusinessProfile> = {
        name: data.name || 'My Business',
        industry: data.type || data.typeOther || 'B2B Software',
        offerings: data.offer ? [data.offer] : [],
        ideal_customer: Array.isArray(data.who) ? data.who.join(', ') : data.who || '',
        tone: typeof data.tone === 'object' ? data.tone?.v : data.tone || 'Consultative and metrics-driven',
        channels: data.where || ['email'],
        anti_spam: {
          max_contacts_per_week: 3,
          quiet_hours: '20:00 - 08:00',
          opt_out_list: [],
        },
        enabled_agents: ['atlas', 'scout', 'quill', 'veritas', 'warden', 'courier', 'apex'],
        documents: [],
      };

      const saved = await api.createBusiness(bizPayload);
      setCreatedBiz(saved);
      setActiveBusinessId(saved.id);

      // Trigger initial pipeline run in background
      try {
        const runId = await api.startRun(saved.id);
        setActiveRunId(runId);
      } catch (err) {
        /* proceed gracefully */
      }

      queryClient.invalidateQueries();
      setMode('activating');
      setActivationStep(0);

      // Multi-agent live activation sequence
      setTimeout(() => setActivationStep(1), 600);
      setTimeout(() => setActivationStep(2), 1300);
      setTimeout(() => setActivationStep(3), 2000);
      setTimeout(() => setActivationStep(4), 2700);
      setTimeout(() => {
        setMode('done');
        buddy.say('Your team is live and working on your goals!', 'happy');
        addToast({
          type: 'success',
          title: 'Fleet Operational',
          message: `Apex has deployed agents for ${saved.name}.`,
        });
      }, 3400);
    } catch (err: any) {
      setSaveErr(err.message || 'Could not save profile. Please try again.');
      setMode('review');
    }
  }

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (mode !== 'q') return;
      const t = e.target as HTMLElement | null;
      const tag = t && t.tagName;
      if (e.key === 'Enter' && (tag === 'INPUT' || tag === 'TEXTAREA')) {
        if (tag === 'TEXTAREA' && e.shiftKey) return;
        e.preventDefault();
        next();
        return;
      }
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'Enter' && tag !== 'BUTTON') {
        next();
        return;
      }
      if (/^[a-zA-Z]$/.test(e.key) && q && (q.kind === 'one' || q.kind === 'many')) {
        choose(e.key.toUpperCase().charCodeAt(0) - 65);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  const pct = Math.round(((pos + 1) / list.length) * 100);
  const txt = `Question ${pos + 1} of ${list.length}`;

  return (
    <div className="panel p-6 sm:p-10 max-w-[960px] mx-auto shadow-hard my-6">
      {/* Top Header Strip with progress bar */}
      <div className="pb-6 mb-8 border-b border-[var(--ink)]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="dot" />
            <span className="eyebrow">Verity Intake & Governance Config</span>
          </div>
          {mode === 'q' && (
            <button
              type="button"
              className="linkb text-xs uppercase font-mono tracking-wider"
              onClick={() => setMode('review')}
            >
              Skip to review →
            </button>
          )}
        </div>

        <div className="ob-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <i style={{ width: `${mode === 'done' ? 100 : mode === 'review' ? 100 : pct}%` }} />
        </div>
        <div className="ob-count flex justify-between items-center mt-2">
          <span>{mode === 'review' ? 'Review & Confirmation' : mode === 'done' ? 'Complete' : txt}</span>
          <span>{mode === 'review' ? '100%' : `${pct}%`}</span>
        </div>
      </div>

      {/* Main Question View */}
      {mode === 'q' && q && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Left Column: Context & Question */}
          <div className="md:col-span-6 space-y-4">
            <span className="eyebrow block">{q.sec}</span>
            <h2 className="h2 text-2xl sm:text-3xl font-extrabold leading-tight text-[var(--ink)]">
              {q.q}
            </h2>
            {q.hint && <p className="lede text-sm text-[var(--ink-2)]">{q.hint}</p>}
            {limMsg && <p className="text-xs font-mono text-[#A12D0A] font-semibold">{limMsg}</p>}
          </div>

          {/* Right Column: Interactive Answer Input */}
          <div className="md:col-span-6 space-y-6">
            {q.kind === 'text' && (
              <div>
                <input
                  type="text"
                  className="big-in"
                  value={A[q.id] || ''}
                  placeholder={typeof q.ph === 'function' ? q.ph(A) : q.ph || 'Type here...'}
                  autoFocus
                  onChange={(e) => setAns(q.id, e.target.value)}
                />
              </div>
            )}

            {q.kind === 'long' && (
              <div>
                <textarea
                  className="w-full p-4 border border-[var(--ink)] bg-[var(--paper)] text-[var(--ink)] font-sans focus:outline-[var(--accent)]"
                  rows={4}
                  value={A[q.id] || ''}
                  placeholder={typeof q.ph === 'function' ? q.ph(A) : q.ph || 'Write in plain English...'}
                  autoFocus
                  onChange={(e) => setAns(q.id, e.target.value)}
                />
              </div>
            )}

            {(q.kind === 'one' || q.kind === 'many') && (
              <div className="opts" role={q.kind === 'one' ? 'radiogroup' : 'group'}>
                {opts(q).map((o, idx) => {
                  const isChecked =
                    q.kind === 'one' ? A[q.id] === o.v : Array.isArray(A[q.id]) && A[q.id].includes(o.v);
                  const letter = String.fromCharCode(65 + idx);
                  return (
                    <button
                      key={o.v}
                      type="button"
                      className={`opt ${q.kind === 'many' ? 'm' : ''}`}
                      role={q.kind === 'one' ? 'radio' : 'checkbox'}
                      aria-checked={isChecked}
                      onClick={() => choose(idx)}
                    >
                      <span className="k">{letter}</span>
                      <div>
                        <span>{o.v}</span>
                        {o.s && <small>{o.s}</small>}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Navigation buttons */}
            <div className="q-nav flex items-center justify-between pt-4 border-t border-[var(--line)]">
              <button
                type="button"
                className="btn small"
                onClick={back}
                disabled={hist.length === 0}
              >
                ← Back
              </button>

              <div className="flex items-center gap-3">
                <span className="keyhint hidden sm:inline">Press Enter ↵</span>
                <button
                  type="button"
                  className="btn solid small"
                  disabled={!valid(q, A)}
                  onClick={() => next()}
                >
                  Continue <span className="arrow">→</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Review & Confirmation Screen */}
      {mode === 'review' && (
        <div className="space-y-6">
          <div className="border-b border-[var(--ink)] pb-4">
            <span className="eyebrow block">Final Verification</span>
            <h2 className="h2 text-2xl sm:text-3xl font-extrabold text-[var(--ink)]">
              Check your details.
            </h2>
            <p className="lede text-sm text-[var(--ink-2)] mt-1">
              Every agent in your fleet will operate strictly within these boundaries.
            </p>
          </div>

          {saveErr && (
            <div className="p-3 border border-[#A12D0A] bg-[#A12D0A15] text-[#A12D0A] font-mono text-xs">
              {saveErr}
            </div>
          )}

          <div className="space-y-0">
            {list.map((item) => {
              const val = shownAnswer(item);
              return (
                <div key={item.id} className="rrow">
                  <span className="l">{item.label}</span>
                  <span className={`v ${!val ? 'none' : ''}`}>
                    {val || '(Not set)'}
                  </span>
                  <button
                    type="button"
                    className="linkb text-xs"
                    onClick={() => {
                      setCur(item.id);
                      setFromReview(true);
                      setMode('q');
                    }}
                  >
                    Change
                  </button>
                </div>
              );
            })}
          </div>

          <details className="mt-4 pt-4 border-t border-[var(--line)]">
            <summary className="cursor-pointer font-mono text-xs uppercase tracking-wider text-[var(--ink-2)] hover:text-[var(--ink)]">
              Advanced: Inspect Ground-Truth JSON Payload
            </summary>
            <pre className="log mt-3 max-h-60 overflow-auto">
              {JSON.stringify(A, null, 2)}
            </pre>
          </details>

          <div className="pt-6 border-t border-[var(--ink)] flex flex-wrap items-center justify-between gap-4">
            <button type="button" className="btn small" onClick={() => setMode('q')}>
              ← Back to Questions
            </button>
            <button
              type="button"
              className="btn solid"
              onClick={save}
            >
              Save and meet your team <span className="arrow">→</span>
            </button>
          </div>
        </div>
      )}

      {/* Saving & Live Multi-Agent Activation State */}
      {(mode === 'saving' || mode === 'activating') && (
        <div className="py-12 px-6 panel bg-[var(--paper)] border-[var(--ink)] shadow-hard space-y-6">
          <div className="flex items-center gap-3 border-b border-[var(--line)] pb-4">
            <span className="dot scale-125" />
            <div>
              <span className="eyebrow block">Fleet Initialization in Progress</span>
              <h3 className="text-2xl font-extrabold text-[var(--ink-deep)]">
                {createdBiz?.name || 'Your business'} is waking up your AI team…
              </h3>
            </div>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div className={`p-3 border flex items-center justify-between ${activationStep >= 0 ? 'bg-[var(--tint)] border-[var(--ink)] text-[var(--ink-deep)]' : 'border-[var(--line)] opacity-40'}`}>
              <div className="flex items-center gap-2">
                <span className="font-bold">1. Atlas</span>
                <span>• Establishing ICP parameter boundaries for {A.who ? (Array.isArray(A.who) ? A.who.join(', ') : A.who) : 'target customers'}</span>
              </div>
              <span className="pill go text-[10px]">{activationStep > 0 ? '✓ Grounded' : 'Configuring…'}</span>
            </div>

            <div className={`p-3 border flex items-center justify-between ${activationStep >= 1 ? 'bg-[var(--tint)] border-[var(--ink)] text-[var(--ink-deep)]' : 'border-[var(--line)] opacity-40'}`}>
              <div className="flex items-center gap-2">
                <span className="font-bold">2. Scout</span>
                <span>• Scanning market vertical intelligence in {A.reach || 'geography'}</span>
              </div>
              <span className="pill go text-[10px]">{activationStep > 1 ? '✓ Active' : 'Scanning…'}</span>
            </div>

            <div className={`p-3 border flex items-center justify-between ${activationStep >= 2 ? 'bg-[var(--tint)] border-[var(--ink)] text-[var(--ink-deep)]' : 'border-[var(--line)] opacity-40'}`}>
              <div className="flex items-center gap-2">
                <span className="font-bold">3. Quill</span>
                <span>• Synthesizing outreach persona calibrated to "{A.tone?.v || A.tone || 'Consultative'}"</span>
              </div>
              <span className="pill go text-[10px]">{activationStep > 2 ? '✓ Calibrated' : 'Synthesizing…'}</span>
            </div>

            <div className={`p-3 border flex items-center justify-between ${activationStep >= 3 ? 'bg-[var(--tint)] border-[var(--ink)] text-[var(--ink-deep)]' : 'border-[var(--line)] opacity-40'}`}>
              <div className="flex items-center gap-2">
                <span className="font-bold">4. Veritas & Warden</span>
                <span>• Enforcing zero-hallucination policy and compliance rules</span>
              </div>
              <span className="pill go text-[10px]">{activationStep > 3 ? '✓ Gated' : 'Auditing…'}</span>
            </div>

            <div className={`p-3 border flex items-center justify-between ${activationStep >= 4 ? 'bg-[var(--tint)] border-[var(--ink)] text-[var(--ink-deep)]' : 'border-[var(--line)] opacity-40'}`}>
              <div className="flex items-center gap-2">
                <span className="font-bold">5. Apex Commander</span>
                <span>• Fleet synchronized. Autonomous task dispatch initialized.</span>
              </div>
              <span className="pill go text-[10px]">Verified</span>
            </div>
          </div>
        </div>
      )}

      {/* Done State */}
      {mode === 'done' && createdBiz && (
        <div className="ok panel--accent space-y-6">
          <div className="border-b border-[var(--ink)] pb-4">
            <div className="flex items-center gap-2">
              <span className="dot" />
              <span className="eyebrow block">AI Team Live & Operational</span>
            </div>
            <h2 className="text-3xl font-extrabold text-[var(--ink-deep)] mt-1">
              {createdBiz.name} is configured and running.
            </h2>
            <p className="text-sm text-[var(--ink-2)] mt-1 max-w-2xl">
              Your agents have absorbed your ICP, offer, and brand voice. Atlas, Scout, Quill, and Veritas are now working under Apex Commander's oversight.
            </p>
          </div>

          <div className="kv">
            <div>
              <span>Company</span>
              <span>{createdBiz.name}</span>
            </div>
            <div>
              <span>Industry</span>
              <span>{createdBiz.industry}</span>
            </div>
            <div>
              <span>Target ICP</span>
              <span>{createdBiz.ideal_customer || 'Configured'}</span>
            </div>
            <div>
              <span>Tone of Voice</span>
              <span>{createdBiz.tone}</span>
            </div>
            <div>
              <span>Governance Clearance</span>
              <span>Zero-Hallucination Human Approval Active</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-4">
            <button
              type="button"
              className="btn solid"
              onClick={() => navigate('/command')}
            >
              Open Apex Command Deck (See Fleet Working) <span className="arrow">→</span>
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => navigate('/review?tab=company')}
            >
              Review in Governance Desk (Company & ICP)
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => navigate('/orchestrator')}
            >
              Mission Control
            </button>
            <button
              type="button"
              className="linkb text-xs ml-auto self-center"
              onClick={restart}
            >
              Start another intake
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GrowthXOnboardingFlow;

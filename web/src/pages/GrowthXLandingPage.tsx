import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { HeroDemo } from '../components/HeroDemo';
import { PageShell } from '../components/PageShell';
import { AGENTS, CHORES, STEPS } from '../data/growthxContent';
import { api } from '../api/client';
import { useAppStore } from '../store/useAppStore';

export const GrowthXLandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { activeBusinessId } = useAppStore();

  const { data: businesses = [] } = useQuery({
    queryKey: ['businesses'],
    queryFn: () => api.listBusinesses(),
  });

  const activeBusiness = businesses.find((b) => b.id === activeBusinessId) || businesses[0] || null;

  return (
    <PageShell title="Verity — Say your goal. Your AI team does the work.">
      <div className="landing-page">

      {/* 1. Hero Section */}
      <div className="hero py-10">
        <div className="eyebrow flex items-center gap-2 mb-4">
          <span className="dot" /> Built for business owners
        </div>
        <h1 className="h1 text-[clamp(2.7rem,7vw,5.6rem)] leading-[0.95] font-extrabold tracking-[-0.035em] text-[var(--ink)]">
          Say your <span className="mark">goal.</span>
          <br />
          Your AI team does the work.
        </h1>

        <div className="row flex flex-col md:flex-row items-start md:items-end justify-between gap-6 mt-6">
          <p className="lede text-lg text-[var(--ink-2)] max-w-xl">
            More customers, verified leads, less busywork. Verity assigns each specialized job to the right AI agent with strict human sign-off gates.
          </p>
          <div className="cta flex items-center gap-3 flex-wrap">
            <Link to="/onboard" className="btn solid">
              Start for free <span className="arrow">→</span>
            </Link>
            <a href="#how" className="btn">
              See how it works
            </a>
          </div>
        </div>

        {/* Live Auto-Playing Interactive Simulation Panel */}
        <HeroDemo />
      </div>

      {/* 2. Problem Band */}
      <div className="py-10">
        <div className="band rv in">
          <div className="lead p-8 bg-[var(--ink)] text-[var(--bg)] flex flex-col justify-between gap-6">
            <span className="eyebrow text-[#D8C9B8]">The problem</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold leading-tight">
              Too many tools. <br />
              <em className="not-italic text-[var(--accent)]">Too many small jobs.</em>
            </h2>
          </div>
          <ul className="chores grid grid-cols-1 sm:grid-cols-2 bg-[var(--paper)]">
            {CHORES.map((c) => (
              <li className="chore p-4 font-semibold text-sm border-b border-[var(--line)]" key={c}>
                {c}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 3. Team Master-Detail Section */}
      <TeamSection />

      {/* 4. How It Works Stepper */}
      <HowSection />

      {/* 5. Levels Section (Simple by Default) */}
      <LevelsSection />

      {/* 6. Dark CTA Band */}
      <div className="final bg-[var(--ink)] text-[var(--bg)] p-8 sm:p-14 my-10 border border-[var(--ink)] shadow-hard">
        <div className="max-w-2xl space-y-4">
          <span className="eyebrow text-[#D8C9B8] block">Ready when you are</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold leading-tight text-[var(--bg)]">
            Give your business an autonomous AI team.
          </h2>
          <p className="text-sm text-[#E3D8CA]">
            Define your business and ICP once. Every claim is checked against ground truth before anything leaves the building.
          </p>
          <div className="cta flex items-center gap-4 pt-4 flex-wrap">
            <Link to="/onboard" className="btn accent font-bold">
              Start for free <span className="arrow">→</span>
            </Link>
          </div>
        </div>
      </div>
      </div>
    </PageShell>
  );
};

function TeamSection() {
  const [i, setI] = useState(0);
  const [swap, setSwap] = useState(false);
  const a = AGENTS[i];

  const choose = (n: number) => {
    setI(n);
    setSwap(false);
    requestAnimationFrame(() => setSwap(true));
  };

  const hoverOk = () => typeof window !== 'undefined' && window.matchMedia('(hover:hover)').matches;

  return (
    <div className="py-10" id="team">
      <div className="mb-4">
        <div className="eyebrow mb-2">Your AI team</div>
        <h2 className="h2 text-3xl font-extrabold text-[var(--ink)]">Seven agents. One clear job each.</h2>
      </div>

      <div className="agents grid grid-cols-1 md:grid-cols-12 border border-[var(--ink)] bg-[var(--paper)]">
        {/* Left: agent list buttons */}
        <div className="alist md:col-span-5 flex flex-col border-r border-[var(--ink)]" role="tablist" aria-label="AI agents">
          {AGENTS.map((x, n) => (
            <button
              key={x.n}
              type="button"
              className="arow p-4 text-left font-extrabold text-lg sm:text-xl border-b border-[var(--line)] hover:bg-[var(--tint)] transition-all flex items-center justify-between"
              role="tab"
              aria-selected={n === i}
              onClick={() => choose(n)}
              onMouseEnter={() => n !== i && hoverOk() && choose(n)}
            >
              <span>{x.n}</span>
              <small className="font-mono text-xs text-[var(--ink-2)] font-semibold">{x.t}</small>
            </button>
          ))}
        </div>

        {/* Right: agent details card */}
        <div className={`adetail md:col-span-7 p-6 sm:p-8 flex flex-col justify-between gap-6 ${swap ? 'swap' : ''}`} aria-live="polite">
          <div>
            <span className="eyebrow">{a.t}</span>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-[var(--ink)] mt-2">{a.n}</h3>
            <p className="big text-base sm:text-lg text-[var(--ink-2)] mt-3 max-w-lg">{a.p}</p>
          </div>

          <div className="kv pt-4 border-t border-[var(--line)]">
            <div className="flex justify-between py-2 border-b border-[var(--line)]">
              <span className="font-mono text-xs uppercase text-[var(--ink-2)]">Asks you first</span>
              <span className="font-bold text-sm text-[var(--ink)]">{a.ask}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[var(--line)]">
              <span className="font-mono text-xs uppercase text-[var(--ink-2)]">You get</span>
              <span className="font-bold text-sm text-[var(--ink)]">{a.get}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HowSection() {
  const box = useRef<HTMLDivElement | null>(null);
  const [p, setP] = useState(0);
  const [hit, setHit] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const el = box.current;
      if (!el || el.offsetParent === null) return;
      const r = el.getBoundingClientRect();
      const h = window.innerHeight;
      setP(Math.max(0, Math.min(1, (h * 0.65 - r.top) / r.height)));
      let n = 0;
      el.querySelectorAll('.step').forEach((s, k) => {
        if (s.getBoundingClientRect().top < h * 0.65) n = k + 1;
      });
      setHit(n);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <div className="py-10" id="how">
      <div className="how grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        <div className="sticky md:col-span-5 top-28 space-y-4">
          <div className="eyebrow">How it works</div>
          <h2 className="h2 text-3xl font-extrabold text-[var(--ink)]">From a few answers to real results.</h2>
          <p className="lede text-sm text-[var(--ink-2)]">
            Setup takes a few minutes. After that, say your goal and approve what goes out.
          </p>
          <div className="pt-2">
            <Link to="/onboard" className="btn solid">
              Get started <span className="arrow">→</span>
            </Link>
          </div>
        </div>

        <div className="steps md:col-span-7 relative pl-10" ref={box}>
          <div className="rail absolute left-3 top-2 bottom-2 w-0.5 bg-[var(--line)]">
            <i
              className="absolute inset-0 bg-[var(--accent)] origin-top transition-transform"
              style={{ transform: `scaleY(${p})` }}
            />
          </div>
          {STEPS.map(([h, t], k) => (
            <div key={h} className={`step relative pb-8 ${k < hit ? 'hit' : ''}`}>
              <span className={`n absolute -left-10 top-0 w-8 h-8 border border-[var(--ink)] bg-[var(--bg)] flex items-center justify-center font-mono font-bold text-xs ${k < hit ? 'bg-[var(--accent)]' : ''}`}>
                {k + 1}
              </span>
              <h3 className="text-xl font-extrabold text-[var(--ink)] mb-1">{h}</h3>
              <p className="text-sm text-[var(--ink-2)]">{t}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LevelsSection() {
  const [lv, setLv] = useState(1);
  return (
    <div className="py-10">
      <div className="levels grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        <div className="md:col-span-5 space-y-4">
          <div className="eyebrow">Simple by default</div>
          <h2 className="h2 text-3xl font-extrabold text-[var(--ink)]">
            See the answer first. Open up the rest when you want it.
          </h2>
          <p className="lede text-sm text-[var(--ink-2)]">
            You never get a wall of text. Press a level to see how one verified result changes.
          </p>
          <div className="seg" role="group" aria-label="Detail level">
            {[
              ['Simple', 1],
              ['More', 2],
              ['Advanced', 3],
            ].map(([t, n]) => (
              <button
                key={n}
                type="button"
                aria-pressed={lv === n}
                onClick={() => setLv(Number(n))}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="mock md:col-span-7 panel p-6 border-[var(--ink)] bg-[var(--paper)] shadow-hard space-y-4" data-level={lv}>
          <div className="bar eyebrow flex justify-between border-b border-[var(--line)] pb-2">
            <span>Example result</span>
            <span className="font-bold text-[var(--accent-text)]">Outreach</span>
          </div>

          <div className="space-y-3">
            <h3 className="text-xl font-extrabold text-[var(--ink)]">Verified accounts ready to contact</h3>
            <p className="text-sm text-[var(--ink-2)]">
              Your shortlist is audited, with a personalized message for each account. Review them and approve what you like.
            </p>

            {lv >= 2 && (
              <div className="l2 p-4 border border-[var(--ink)] bg-[var(--tint)] space-y-2">
                <div className="eyebrow font-bold text-[var(--ink-deep)]">Why these accounts</div>
                <ul className="text-xs list-disc list-inside space-y-1 text-[var(--ink)]">
                  <li>Decision makers match your ICP exactly</li>
                  <li>Recent funding / tech stack adoption detected</li>
                  <li>Zero claims made without citation in your company documents</li>
                </ul>
              </div>
            )}

            {lv >= 3 && (
              <div className="l3">
                <div className="log font-mono text-xs p-3 bg-[var(--ink-deep)] text-[#E8DCCB] space-y-1">
                  <div><b>orchestrator</b>  plan: research, scoring, veritas, warden, outreach</div>
                  <div><b>research</b>      14 accounts found via domain scan (100% matched)</div>
                  <div><b>veritas</b>       ground-truth audited against docs (0 flags)</div>
                  <div><b>warden</b>        compliance & anti-spam checked (safe)</div>
                  <div><b>outreach</b>      personalized drafts held in clearance gateway</div>
                </div>
              </div>
            )}

            <p className="note text-xs text-[var(--ink-2)] border-t border-[var(--line)] pt-3">
              Nothing is dispatched until you review and approve in Governance Desk.
            </p>

            <div className="pt-2">
              <Link to="/onboard" className="btn solid small">
                Start your team free <span className="arrow">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GrowthXLandingPage;

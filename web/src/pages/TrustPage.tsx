import React, { useState, useEffect, useRef } from 'react';
import { PageShell } from '../components/PageShell';
import { Kicker } from '../components/Kicker';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Reveal } from '../components/Reveal';
import { useReducedMotion } from 'framer-motion';

interface FlagItem {
  id: string;
  type: 'UNSUPPORTED' | 'CONTRADICTED' | 'RISKY PROMISE';
  typeColor: 'amber' | 'red';
  claim: string;
  reason: string;
  status: 'pending' | 'accepted' | 'dismissed';
}

const INITIAL_FLAGS: FlagItem[] = [
  {
    id: 'flag-1',
    type: 'UNSUPPORTED',
    typeColor: 'amber',
    claim: 'ISO 27001 certified',
    reason: 'Not found in your documents.',
    status: 'pending',
  },
  {
    id: 'flag-2',
    type: 'CONTRADICTED',
    typeColor: 'red',
    claim: 'Plans start at $29',
    reason: 'Your price sheet says $49.',
    status: 'pending',
  },
  {
    id: 'flag-3',
    type: 'RISKY PROMISE',
    typeColor: 'red',
    claim: 'Guaranteed in 7 days',
    reason: 'No approved guarantee exists.',
    status: 'pending',
  },
];

export const TrustPage: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();
  const [flags, setFlags] = useState<FlagItem[]>(INITIAL_FLAGS);
  const [targetScore, setTargetScore] = useState<number>(54);
  const [displayScore, setDisplayScore] = useState<number>(54);
  const animRef = useRef<number | null>(null);

  // Recalculate target score whenever flags change
  const handleAction = (id: string, action: 'accepted' | 'dismissed') => {
    setFlags((prev) =>
      prev.map((f) => {
        if (f.id === id && f.status === 'pending') {
          return { ...f, status: action };
        }
        return f;
      })
    );

    setTargetScore((prev) => {
      const increment = action === 'accepted' ? 12 : 6;
      return Math.min(100, prev + increment);
    });
  };

  const handleReset = (e: React.MouseEvent) => {
    e.preventDefault();
    setFlags(INITIAL_FLAGS);
    setTargetScore(54);
  };

  // Animate displayScore towards targetScore
  useEffect(() => {
    if (shouldReduceMotion) {
      setDisplayScore(targetScore);
      return;
    }

    const startScore = displayScore;
    const diff = targetScore - startScore;
    if (diff === 0) return;

    if (typeof navigator !== 'undefined' && navigator.userAgent?.includes('jsdom')) {
      setDisplayScore(targetScore);
      return;
    }

    const duration = 600;
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startScore + diff * eased);
      setDisplayScore(current);

      if (progress < 1) {
        animRef.current = requestAnimationFrame(step);
      }
    };

    animRef.current = requestAnimationFrame(step);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [targetScore, shouldReduceMotion]);

  // Status label and color determination
  const getStatusInfo = (score: number) => {
    if (score >= 80) {
      return { label: 'PASS', color: '#2A7F5F', textClass: 'text-verified' };
    }
    if (score >= 50) {
      return { label: 'REVIEW', color: '#A8680F', textClass: 'text-warning' };
    }
    return { label: 'FAIL', color: '#C0432F', textClass: 'text-danger' };
  };

  const statusInfo = getStatusInfo(displayScore);

  const dimensionCards = [
    {
      title: 'Claims',
      desc: 'Matched to your documents: supported, contradicted or not found.',
    },
    {
      title: 'Numbers and dates',
      desc: 'Prices, quantities and deadlines checked by code, not guesswork.',
    },
    {
      title: 'Private data',
      desc: 'Emails, phone numbers and IDs caught before they leak.',
    },
    {
      title: 'Risky promises',
      desc: 'Guarantees and commitments you never approved.',
    },
  ];

  return (
    <PageShell
      title="Trust — Verity"
      description="Know what to trust before you send. Every draft gets a score, flagged sentences and the reason why."
    >
      {/* Hero Section with Score Ring */}
      <section className="pt-20 md:pt-28 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column */}
          <div className="lg:col-span-7">
            <Reveal>
              <Kicker variant="verified">VERITAS, THE TRUST AUDITOR</Kicker>
            </Reveal>

            <Reveal delay={0.15}>
              <h1 className="font-serif text-[44px] md:text-[clamp(44px,7vw,80px)] leading-[1.05] text-text mt-4 tracking-serifHeading whitespace-pre-line">
                {'Know what to trust\nbefore you send.'}
              </h1>
            </Reveal>

            <Reveal delay={0.3}>
              <p className="text-[19px] md:text-[20px] text-muted leading-relaxed max-w-[520px] mt-6 font-sans">
                Every draft gets a score, flagged sentences and the reason why.
              </p>
            </Reveal>
          </div>

          {/* Right Column: 200px Score Ring */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center">
            <Reveal delay={0.2}>
              <div
                className="relative w-[200px] h-[200px] rounded-full flex items-center justify-center transition-all duration-700"
                style={{
                  background: `conic-gradient(${statusInfo.color} 0% ${displayScore}%, #E6E1D6 ${displayScore}% 100%)`,
                }}
                role="region"
                aria-label={`Trust Score ${displayScore}, Status ${statusInfo.label}`}
              >
                {/* 164px inner ivory circle */}
                <div className="w-[164px] h-[164px] rounded-full bg-bg flex flex-col items-center justify-center text-center shadow-inner">
                  <span
                    className="font-serif text-[64px] leading-none text-text tracking-tight font-light select-none"
                    aria-live="polite"
                  >
                    {displayScore}
                  </span>
                  <span
                    className={`text-[12px] font-sans font-semibold uppercase tracking-[0.2em] mt-1 ${statusInfo.textClass}`}
                  >
                    {statusInfo.label}
                  </span>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.35}>
              <div className="mt-4 text-center">
                <span className="text-[12px] font-sans text-muted uppercase tracking-[0.15em]">
                  CALCULATED TRUST INDEX
                </span>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* 4 Dimension Cards */}
      <section className="py-12 border-t border-border">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {dimensionCards.map((card, idx) => (
            <Reveal key={card.title} delay={idx * 0.1}>
              <Card className="h-full flex flex-col">
                <h2 className="font-serif text-[26px] text-verified font-normal mb-3">
                  {card.title}
                </h2>
                <p className="text-[15px] text-muted leading-relaxed font-sans">
                  {card.desc}
                </p>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Interactive Example Flags Section */}
      <section className="py-16 border-t border-border">
        <Reveal>
          <div className="flex items-center justify-between mb-8">
            <div className="text-[12px] font-sans font-medium uppercase tracking-[0.2em] text-muted">
              EXAMPLE FLAGS
            </div>
            {flags.some((f) => f.status !== 'pending') && (
              <button
                type="button"
                onClick={handleReset}
                className="text-[13px] font-sans text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent"
              >
                Reset
              </button>
            )}
          </div>
        </Reveal>

        <div className="space-y-4">
          {flags.map((flag) => {
            const isResolved = flag.status !== 'pending';
            const borderCol = flag.typeColor === 'amber' ? 'border-warning' : 'border-danger';

            return (
              <div
                key={flag.id}
                className={`bg-surface border border-border border-l-[3px] ${borderCol} rounded-[4px] p-6 transition-all duration-300 ${
                  isResolved ? 'opacity-40 grayscale-[40%]' : 'hover:border-[#8F703655]'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span
                        className={`text-[11px] font-sans font-semibold uppercase tracking-[0.18em] ${
                          flag.typeColor === 'amber' ? 'text-warning' : 'text-danger'
                        }`}
                      >
                        {flag.type}
                      </span>
                      {isResolved && (
                        <span className="text-[11px] uppercase tracking-wider text-muted font-medium">
                          ({flag.status})
                        </span>
                      )}
                    </div>
                    <div className="font-serif text-[22px] text-text font-normal">
                      &ldquo;{flag.claim}&rdquo;
                    </div>
                    <div className="text-[14px] text-muted font-sans mt-1">
                      {flag.reason}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      type="button"
                      disabled={isResolved}
                      onClick={() => handleAction(flag.id, 'accepted')}
                      className={`text-[13px] font-sans font-medium px-4 py-2 rounded-[2px] transition-colors border ${
                        isResolved
                          ? 'bg-border/30 border-border text-muted cursor-not-allowed'
                          : 'bg-verified/10 text-verified border-verified/30 hover:bg-verified/20 focus-visible:outline-2 focus-visible:outline-accent'
                      }`}
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      disabled={isResolved}
                      onClick={() => handleAction(flag.id, 'dismissed')}
                      className={`text-[13px] font-sans font-medium px-4 py-2 rounded-[2px] transition-colors border ${
                        isResolved
                          ? 'border-border text-muted cursor-not-allowed'
                          : 'border-border text-text hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-accent'
                      }`}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <Reveal delay={0.2}>
          <div className="text-[13px] text-muted font-sans mt-6">
            Accept or dismiss each flag and the score recalculates.
          </div>
        </Reveal>
      </section>

      {/* Closing CTA */}
      <section className="py-20 border-t border-border text-center">
        <Reveal>
          <div className="flex justify-center">
            <Button variant="primary" to="/workspace">
              Test with your agents
            </Button>
          </div>
        </Reveal>
      </section>
    </PageShell>
  );
};

export default TrustPage;

import React, { useEffect, useState } from 'react';
import { PageShell } from '../components/PageShell';
import { Kicker } from '../components/Kicker';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Reveal } from '../components/Reveal';
import { motion, useReducedMotion } from 'framer-motion';

export const HomePage: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();
  const [count, setCount] = useState(0);

  // Example Trust Score count-up to 54
  useEffect(() => {
    if (shouldReduceMotion) {
      setCount(54);
      return;
    }
    const duration = 1200;
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(54 * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [shouldReduceMotion]);

  const agentsStrip = [
    { name: 'Apex', caption: 'orchestrates', dotColor: 'bg-amber-500' },
    { name: 'Atlas', caption: 'plans', dotColor: 'bg-muted' },
    { name: 'Scout', caption: 'researches', dotColor: 'bg-muted' },
    { name: 'Cadence', caption: 'decides when', dotColor: 'bg-muted' },
    { name: 'Quill', caption: 'drafts', dotColor: 'bg-muted' },
    { name: 'Veritas', caption: 'verifies', dotColor: 'bg-verified' },
    { name: 'Warden', caption: 'enforces rules', dotColor: 'bg-verified' },
    { name: 'You', caption: 'approve', dotColor: 'bg-accent', isYou: true },
    { name: 'Courier', caption: 'sends', dotColor: 'bg-muted' },
  ];

  return (
    <PageShell
      title="Verity — Growth, verified"
      description="Agents that find leads, write outreach and follow up. Every claim is checked. You approve what goes out."
    >
      {/* Hero Section */}
      <section className="relative pt-20 md:pt-28 pb-20 md:pb-28">
        {/* Faint drifting glow */}
        <div className="hero-glow w-[520px] h-[520px] -top-24 -left-20 animate-hero-drift" />

        <div className="relative z-10 max-w-[960px]">
          <Reveal>
            <Kicker>AUTONOMOUS HEAD ORCHESTRATOR & FLEET</Kicker>
          </Reveal>

          <Reveal delay={0.15}>
            <h1 className="font-serif text-[52px] md:text-[clamp(52px,9vw,104px)] leading-[1.02] text-text mt-4 tracking-serifHeading whitespace-pre-line">
              {'Growth,\nverified.'}
            </h1>
          </Reveal>

          <Reveal delay={0.3}>
            <p className="text-[19px] md:text-[20px] text-muted leading-relaxed max-w-[520px] mt-8 font-sans">
              Autonomous head orchestrator commanding 10 agents to find leads, conduct competitor recon, draft outreach, and audit facts. You retain executive approval.
            </p>
          </Reveal>

          <Reveal delay={0.45}>
            <div className="flex flex-wrap items-center gap-4 mt-10">
              <Button variant="primary" to="/command">
                Open Apex Command Deck
              </Button>
              <Button variant="secondary" to="/workspace">
                Growth Studio
              </Button>
              <Button variant="ghost" to="/how">
                See how it works
              </Button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Strip: ONE RUN, START TO FINISH */}
      <section className="py-12 border-t border-border">
        <Reveal>
          <div className="text-[11px] font-sans font-medium uppercase tracking-[0.2em] text-muted mb-6">
            ONE RUN, START TO FINISH
          </div>
        </Reveal>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {agentsStrip.map((agent, i) => (
            <Reveal key={agent.name} delay={i * 0.08}>
              <div
                className={`bg-surface border ${
                  agent.isYou ? 'border-accent' : 'border-border'
                } rounded-[4px] p-4 flex flex-col justify-between h-[104px] hover:border-[#8F703655] transition-colors`}
              >
                <div className="flex items-center justify-between">
                  <motion.span
                    animate={
                      shouldReduceMotion
                        ? { opacity: 1 }
                        : { opacity: [0.3, 1, 0.3] }
                    }
                    transition={{
                      duration: 2.4,
                      repeat: Infinity,
                      delay: i * 0.3,
                      ease: 'easeInOut',
                    }}
                    className={`w-2 h-2 rounded-full ${agent.dotColor}`}
                  />
                </div>
                <div>
                  <div
                    className={`font-serif text-[20px] font-light tracking-serifHeading leading-tight ${
                      agent.isYou ? 'text-accent' : 'text-text'
                    }`}
                  >
                    {agent.name}
                  </div>
                  <div className="text-[12px] text-muted font-sans mt-0.5">
                    {agent.caption}
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Three Cards in a Row */}
      <section className="py-20 border-t border-border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Reveal delay={0.05}>
            <Card className="h-full flex flex-col justify-between">
              <div>
                <Kicker>01 FIND</Kicker>
                <h3 className="font-serif text-[26px] text-text font-light tracking-serifHeading mt-4 leading-snug">
                  The right leads, at the right time
                </h3>
              </div>
              <p className="text-[15px] text-muted leading-relaxed mt-6">
                Scout gathers sourced facts. Cadence scores each lead: act, wait or reject.
              </p>
            </Card>
          </Reveal>

          <Reveal delay={0.2}>
            <Card className="h-full flex flex-col justify-between">
              <div>
                <Kicker variant="verified">02 VERIFY</Kicker>
                <h3 className="font-serif text-[26px] text-text font-light tracking-serifHeading mt-4 leading-snug">
                  Every claim checked
                </h3>
              </div>
              <p className="text-[15px] text-muted leading-relaxed mt-6">
                Veritas tests each statement, price and date against your own documents.
              </p>
            </Card>
          </Reveal>

          <Reveal delay={0.35}>
            <Card className="h-full flex flex-col justify-between">
              <div>
                <Kicker>03 DECIDE</Kicker>
                <h3 className="font-serif text-[26px] text-text font-light tracking-serifHeading mt-4 leading-snug">
                  Nothing goes out unapproved
                </h3>
              </div>
              <p className="text-[15px] text-muted leading-relaxed mt-6">
                You review flagged sentences, accept or dismiss, then approve.
              </p>
            </Card>
          </Reveal>
        </div>
      </section>

      {/* Example Card: Caught Before Sending */}
      <section className="py-12 border-t border-border">
        <Reveal>
          <div className="bg-surface border border-border rounded-[4px] p-8 md:p-[48px] grid grid-cols-1 lg:grid-cols-12 gap-10 md:gap-14 items-start">
            {/* Left Column: Draft copy */}
            <div className="lg:col-span-7 space-y-6">
              <div className="text-[11px] font-sans font-medium uppercase tracking-[0.2em] text-muted">
                EXAMPLE DRAFT, CAUGHT BEFORE SENDING
              </div>
              <p className="font-serif text-[24px] md:text-[26px] text-text leading-[1.45] tracking-serifHeading">
                Our platform is{' '}
                <mark className="bg-[#A8680F18] border-b-2 border-warning text-text px-1 py-0.5 rounded-[2px] font-inherit inline">
                  [ISO 27001 certified]
                </mark>
                . Plans start at{' '}
                <mark className="bg-[#C0432F14] border-b-2 border-danger text-text px-1 py-0.5 rounded-[2px] font-inherit inline">
                  [$29 a month]
                </mark>
                , and we{' '}
                <mark className="bg-[#C0432F14] border-b-2 border-danger text-text px-1 py-0.5 rounded-[2px] font-inherit inline">
                  [guarantee results in 7 days]
                </mark>
                .
              </p>
              <div className="text-[13px] text-muted font-sans">
                Illustrative example
              </div>
            </div>

            {/* Right Column: Trust Score */}
            <div className="lg:col-span-5 border-t lg:border-t-0 lg:border-l border-border pt-8 lg:pt-0 lg:pl-12 space-y-5">
              <div className="text-[11px] font-sans font-medium uppercase tracking-[0.2em] text-muted">
                TRUST SCORE
              </div>

              <div className="flex items-baseline gap-4">
                <span className="font-serif text-[68px] font-light text-warning tracking-serifHeading leading-none">
                  {count}
                </span>
                <span className="text-[15px] font-medium text-warning font-sans">
                  Needs review
                </span>
              </div>

              <div className="space-y-3 pt-2 text-[14px] font-sans">
                <div className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-warning mt-2 flex-shrink-0" />
                  <span className="text-text">
                    <strong className="font-medium text-warning">Unsupported:</strong> certification not in your documents
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-danger mt-2 flex-shrink-0" />
                  <span className="text-text">
                    <strong className="font-medium text-danger">Contradicted:</strong> your price sheet says $49
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-danger mt-2 flex-shrink-0" />
                  <span className="text-text">
                    <strong className="font-medium text-danger">Risky:</strong> unapproved guarantee
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Closing Call to Action */}
      <section className="py-24 text-center border-t border-border">
        <Reveal>
          <h2 className="font-serif text-[38px] md:text-[46px] font-light text-text tracking-serifHeading">
            See it on your business.
          </h2>
          <div className="mt-8 flex justify-center">
            <Button variant="primary" to="/workspace">
              Work with Agents
            </Button>
          </div>
        </Reveal>
      </section>
    </PageShell>
  );
};

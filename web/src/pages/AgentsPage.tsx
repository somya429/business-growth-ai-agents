import React from 'react';
import { PageShell } from '../components/PageShell';
import { Kicker } from '../components/Kicker';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Reveal } from '../components/Reveal';

export const AgentsPage: React.FC = () => {
  const aiAgents = [
    {
      name: 'Atlas',
      role: 'Orchestrator',
      limits: 'Plans the run. Cannot send or edit data.',
      isVeritas: false,
    },
    {
      name: 'Scout',
      role: 'Research',
      limits: 'Finds sourced facts. Cannot write copy or send.',
      isVeritas: false,
    },
    {
      name: 'Cadence',
      role: 'Scoring and timing',
      limits: 'Act, wait or reject. Cannot contact anyone.',
      isVeritas: false,
    },
    {
      name: 'Quill',
      role: 'Outreach',
      limits: 'Drafts from verified facts. Cannot browse or send.',
      isVeritas: false,
    },
    {
      name: 'Muse',
      role: 'Content',
      limits: 'Posts from approved claims only.',
      isVeritas: false,
    },
    {
      name: 'Veritas',
      role: 'Trust auditor',
      limits: 'Scores and flags drafts. Cannot edit them.',
      isVeritas: true,
    },
    {
      name: 'Echo',
      role: 'Follow-up and replies',
      limits: 'Escalates price and contract replies to you.',
      isVeritas: false,
    },
    {
      name: 'Sage',
      role: 'Analytics and learning',
      limits: 'Tracks replies, meetings, unsubscribes. Cannot change policy.',
      isVeritas: false,
    },
  ];

  const ruleEngines = [
    {
      name: 'Warden',
      desc: 'Opt-outs, contact limits, quiet hours, unsubscribe line. Plain code that no AI can override.',
    },
    {
      name: 'Courier',
      desc: 'The only step that sends, and only with your approval on record.',
    },
  ];

  return (
    <PageShell
      title="Agents — Verity"
      description="Eight agents. Two rule engines. Each has one job and strict limits."
    >
      {/* Hero */}
      <section className="pt-20 md:pt-28 pb-16">
        <div className="max-w-[800px]">
          <Reveal>
            <Kicker>THE TEAM</Kicker>
          </Reveal>

          <Reveal delay={0.15}>
            <h1 className="font-serif text-[44px] md:text-[clamp(44px,7vw,80px)] leading-[1.05] text-text mt-4 tracking-serifHeading whitespace-pre-line">
              {'Eight agents.\nTwo rule engines.'}
            </h1>
          </Reveal>

          <Reveal delay={0.3}>
            <p className="text-[19px] md:text-[20px] text-muted leading-relaxed max-w-[520px] mt-6 font-sans">
              Each has one job and strict limits.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Grid of 8 AI Agents */}
      <section className="py-12 border-t border-border">
        <Reveal>
          <div className="text-[12px] font-sans font-medium uppercase tracking-[0.2em] text-muted mb-8">
            AI AGENTS
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {aiAgents.map((agent, idx) => (
            <Reveal key={agent.name} delay={idx * 0.08}>
              <Card
                className={`h-full flex flex-col justify-between ${
                  agent.isVeritas ? 'border-verified/40 bg-surface' : ''
                }`}
              >
                <div>
                  <div className="text-[11px] font-sans font-medium uppercase tracking-[0.2em] text-accent mb-4">
                    AI AGENT
                  </div>
                  <h2 className="font-serif text-[30px] text-text font-normal mb-1">
                    {agent.name}
                  </h2>
                  <div className="text-[15px] font-sans font-medium text-text mb-4">
                    {agent.role}
                  </div>
                </div>
                <p className="text-[13px] text-muted leading-relaxed font-sans mt-4 pt-4 border-t border-border/50">
                  {agent.limits}
                </p>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 2 Wide Rules Engines */}
      <section className="py-12 border-t border-border">
        <Reveal>
          <div className="text-[12px] font-sans font-medium uppercase tracking-[0.2em] text-muted mb-8">
            RULES ENGINES
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {ruleEngines.map((rule, idx) => (
            <Reveal key={rule.name} delay={idx * 0.15}>
              <Card className="h-full flex flex-col justify-between border-verified/30">
                <div>
                  <div className="text-[11px] font-sans font-medium uppercase tracking-[0.2em] text-verified mb-4">
                    RULES ENGINE
                  </div>
                  <h2 className="font-serif text-[30px] text-text font-normal mb-3">
                    {rule.name}
                  </h2>
                </div>
                <p className="text-[16px] text-text font-sans leading-relaxed mt-2">
                  {rule.desc}
                </p>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Banner Card */}
      <section className="py-16 border-t border-border">
        <Reveal>
          <div className="bg-surface border border-border rounded-[4px] p-8 md:p-12 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-[#8F703655] transition-colors">
            <div className="max-w-[620px]">
              <h2 className="font-serif text-[28px] md:text-[34px] text-text font-normal mb-3">
                Your business picks its team.
              </h2>
              <p className="text-[16px] text-muted font-sans leading-relaxed">
                Your profile decides which agents run, from a wider catalog.
              </p>
            </div>
            <div>
              <Button variant="primary" to="/industries">
                See industries
              </Button>
            </div>
          </div>
        </Reveal>
      </section>
    </PageShell>
  );
};

export default AgentsPage;

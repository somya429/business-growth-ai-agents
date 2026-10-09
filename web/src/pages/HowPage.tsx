import React from 'react';
import { PageShell } from '../components/PageShell';
import { Kicker } from '../components/Kicker';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Reveal } from '../components/Reveal';

export const HowPage: React.FC = () => {
  const steps = [
    {
      num: '1',
      title: 'Onboard',
      desc: 'Share your profile and documents. Prices, policies, approved claims.',
      isGreen: false,
    },
    {
      num: '2',
      title: 'Research',
      desc: 'Scout finds sourced facts. Cadence decides: act, wait or reject.',
      isGreen: false,
    },
    {
      num: '3',
      title: 'Draft',
      desc: 'Quill writes using only verified facts and approved claims.',
      isGreen: false,
    },
    {
      num: '4',
      title: 'Verify',
      desc: 'Veritas scores trust. Warden enforces opt-outs and contact limits.',
      isGreen: true,
    },
    {
      num: '5',
      title: 'Approve',
      desc: 'You review flags and approve. Echo handles replies. Sage learns.',
      isGreen: false,
    },
  ];

  const safeguards = [
    {
      kicker: 'RULES, NOT AI',
      desc: 'Opt-outs, contact frequency, quiet hours and the unsubscribe line are plain code. No agent can override them.',
    },
    {
      kicker: 'ONE SENDER',
      desc: 'Only Courier can send, and only after your approval is on record.',
    },
    {
      kicker: 'FULL TRACE',
      desc: 'Every step logs who did what, and why. Audit any run.',
    },
  ];

  return (
    <PageShell
      title="How it works — Verity"
      description="From lead to follow-up, in five steps. Verified AI outreach with plain-code safeguards."
    >
      {/* Hero */}
      <section className="pt-20 md:pt-28 pb-16">
        <div className="max-w-[800px]">
          <Reveal>
            <Kicker>HOW IT WORKS</Kicker>
          </Reveal>

          <Reveal delay={0.15}>
            <h1 className="font-serif text-[44px] md:text-[clamp(44px,7vw,80px)] leading-[1.05] text-text mt-4 tracking-serifHeading whitespace-pre-line">
              {'From lead to follow-up,\nin five steps.'}
            </h1>
          </Reveal>
        </div>
      </section>

      {/* 5 Steps Grid */}
      <section className="py-12 border-t border-border">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {steps.map((step, idx) => (
            <Reveal key={step.num} delay={idx * 0.1}>
              <Card className="h-full flex flex-col justify-between">
                <div>
                  <div
                    className={`font-serif text-[56px] leading-none mb-6 select-none ${
                      step.isGreen ? 'text-verified' : 'text-accent'
                    }`}
                  >
                    {step.num}
                  </div>
                  <h2 className="font-serif text-[24px] text-text font-normal mb-3">
                    {step.title}
                  </h2>
                </div>
                <p className="text-[15px] text-muted leading-relaxed font-sans mt-2">
                  {step.desc}
                </p>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Safeguards */}
      <section className="py-16 border-t border-border">
        <Reveal>
          <div className="text-[12px] font-sans font-medium uppercase tracking-[0.2em] text-muted mb-8">
            SYSTEM SAFEGUARDS
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {safeguards.map((item, idx) => (
            <Reveal key={item.kicker} delay={idx * 0.15}>
              <Card className="h-full flex flex-col">
                <div className="mb-4">
                  <Kicker variant="verified">{item.kicker}</Kicker>
                </div>
                <p className="text-[16px] text-text font-sans leading-relaxed">
                  {item.desc}
                </p>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 border-t border-border text-center">
        <Reveal>
          <div className="flex justify-center">
            <Button variant="primary" to="/agents">
              Meet the agents
            </Button>
          </div>
        </Reveal>
      </section>
    </PageShell>
  );
};

export default HowPage;

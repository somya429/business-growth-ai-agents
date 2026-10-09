import React from 'react';
import { PageShell } from '../components/PageShell';
import { Kicker } from '../components/Kicker';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Reveal } from '../components/Reveal';

export const IndustriesPage: React.FC = () => {
  const industries = [
    {
      title: 'B2B software',
      isCustom: false,
      items: [
        'Plan prices and limits',
        'Security and compliance claims',
        'Integration lists',
      ],
    },
    {
      title: 'E-commerce',
      isCustom: false,
      items: [
        'Prices, offers and minimum orders',
        'Shipping and return promises',
        'Product certifications',
      ],
    },
    {
      title: 'Local services',
      isCustom: false,
      items: [
        'Service areas and hours',
        'Response-time promises',
        'Licences and warranties',
      ],
    },
    {
      title: 'Your business',
      isCustom: true,
      items: [
        'Upload your documents',
        'Set tone and contact limits',
        'Choose which agents run',
      ],
    },
  ];

  return (
    <PageShell
      title="Industries — Verity"
      description="One profile. Your facts. Verity checks against whatever your business uploads."
    >
      {/* Hero */}
      <section className="pt-20 md:pt-28 pb-16">
        <div className="max-w-[800px]">
          <Reveal>
            <Kicker>ANY BUSINESS</Kicker>
          </Reveal>

          <Reveal delay={0.15}>
            <h1 className="font-serif text-[44px] md:text-[clamp(44px,7vw,80px)] leading-[1.05] text-text mt-4 tracking-serifHeading whitespace-pre-line">
              {'One profile.\nYour facts.'}
            </h1>
          </Reveal>

          <Reveal delay={0.3}>
            <p className="text-[19px] md:text-[20px] text-muted leading-relaxed max-w-[520px] mt-6 font-sans">
              Verity checks against whatever your business uploads.
            </p>
          </Reveal>
        </div>
      </section>

      {/* 4 Cards Grid */}
      <section className="py-12 border-t border-border">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {industries.map((ind, idx) => (
            <Reveal key={ind.title} delay={idx * 0.1}>
              <Card
                className={`h-full flex flex-col justify-between ${
                  ind.isCustom ? 'border-accent bg-surface' : ''
                }`}
              >
                <div>
                  <h2
                    className={`font-serif text-[34px] font-normal mb-8 ${
                      ind.isCustom ? 'text-accent' : 'text-text'
                    }`}
                  >
                    {ind.title}
                  </h2>

                  <ul className="space-y-4">
                    {ind.items.map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <span className="w-[6px] h-[6px] rounded-full bg-verified mt-2 shrink-0" />
                        <span className="text-[15px] font-sans text-text leading-snug">
                          {item}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Centered H2 and Button */}
      <section className="py-20 border-t border-border text-center">
        <Reveal>
          <div className="max-w-[600px] mx-auto">
            <h2 className="font-serif text-[36px] md:text-[44px] text-text font-normal mb-8">
              Switch business in one click.
            </h2>
            <div className="flex justify-center">
              <Button variant="primary" to="/workspace">
                Work with Agents
              </Button>
            </div>
          </div>
        </Reveal>
      </section>
    </PageShell>
  );
};

export default IndustriesPage;

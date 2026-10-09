import React, { useState } from 'react';
import { PageShell } from '../components/PageShell';
import { Kicker } from '../components/Kicker';
import { Card } from '../components/Card';
import { Reveal } from '../components/Reveal';
import { submitDemoRequest } from '../api/demo';

export const ContactPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [businessType, setBusinessType] = useState('B2B software');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});

  const benefitRows = [
    { num: '1', text: 'A short call about your goals' },
    { num: '2', text: 'A run on your own documents' },
    { num: '3', text: 'You review and approve, hands on' },
  ];

  const validate = () => {
    const errs: { name?: string; email?: string } = {};
    if (!name.trim()) {
      errs.name = 'Please enter your name.';
    }
    if (!email.trim()) {
      errs.email = 'Please enter your work email.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = 'Please enter a valid work email address.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await submitDemoRequest({ name, email, businessType });
      setIsSubmitted(true);
    } catch {
      // In case of error
      setIsSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageShell
      title="Book a demo — Verity"
      description="See it on your business. A short call, a run on your own documents, you review and approve."
    >
      <section className="relative pt-20 md:pt-28 pb-20">
        {/* Faint glow top-right */}
        <div className="hero-glow w-[480px] h-[480px] -top-16 -right-16 animate-hero-drift pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          {/* Left Column */}
          <div className="lg:col-span-6">
            <Reveal>
              <Kicker>BOOK A DEMO</Kicker>
            </Reveal>

            <Reveal delay={0.15}>
              <h1 className="font-serif text-[44px] md:text-[clamp(44px,7vw,80px)] leading-[1.05] text-text mt-4 tracking-serifHeading whitespace-pre-line">
                {'See it on\nyour business.'}
              </h1>
            </Reveal>

            <div className="mt-12 space-y-8">
              {benefitRows.map((row, idx) => (
                <Reveal key={row.num} delay={0.25 + idx * 0.1}>
                  <div className="flex items-start gap-6 border-b border-border/60 pb-6">
                    <span className="font-serif text-[38px] text-accent leading-none select-none shrink-0 w-8">
                      {row.num}
                    </span>
                    <span className="font-sans text-[18px] text-text pt-1">
                      {row.text}
                    </span>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>

          {/* Right Column: Form Card */}
          <div className="lg:col-span-6">
            <Reveal delay={0.2}>
              <Card className="p-8 md:p-10">
                {isSubmitted ? (
                  <div className="py-12 text-center" role="status" aria-live="polite">
                    <h2 className="font-serif text-[32px] text-text font-normal mb-3">
                      Thanks. We will be in touch.
                    </h2>
                    <p className="text-[15px] text-muted font-sans max-w-[360px] mx-auto">
                      Our team will reach out with a customized run on your business documents.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} noValidate className="space-y-6">
                    <div>
                      <label
                        htmlFor="name"
                        className="block text-[13px] font-sans font-medium uppercase tracking-[0.15em] text-text mb-2"
                      >
                        Name
                      </label>
                      <input
                        id="name"
                        name="name"
                        type="text"
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                        }}
                        required
                        placeholder="E.g. Eleanor Vance"
                        className={`w-full bg-bg border ${
                          errors.name ? 'border-danger' : 'border-border'
                        } rounded-[2px] px-4 py-3 text-[15px] font-sans text-text placeholder-muted/60 focus:border-accent focus:outline-none transition-colors`}
                      />
                      {errors.name && (
                        <p className="text-[13px] text-danger font-sans mt-1.5">{errors.name}</p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="email"
                        className="block text-[13px] font-sans font-medium uppercase tracking-[0.15em] text-text mb-2"
                      >
                        Work email
                      </label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                        }}
                        required
                        placeholder="eleanor@company.com"
                        className={`w-full bg-bg border ${
                          errors.email ? 'border-danger' : 'border-border'
                        } rounded-[2px] px-4 py-3 text-[15px] font-sans text-text placeholder-muted/60 focus:border-accent focus:outline-none transition-colors`}
                      />
                      {errors.email && (
                        <p className="text-[13px] text-danger font-sans mt-1.5">{errors.email}</p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="businessType"
                        className="block text-[13px] font-sans font-medium uppercase tracking-[0.15em] text-text mb-2"
                      >
                        Business type
                      </label>
                      <select
                        id="businessType"
                        name="businessType"
                        value={businessType}
                        onChange={(e) => setBusinessType(e.target.value)}
                        className="w-full bg-bg border border-border rounded-[2px] px-4 py-3 text-[15px] font-sans text-text focus:border-accent focus:outline-none transition-colors"
                      >
                        <option value="B2B software">B2B software</option>
                        <option value="E-commerce">E-commerce</option>
                        <option value="Local services">Local services</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-text text-bg hover:opacity-90 transition-opacity font-sans text-[15px] font-medium py-[14px] px-[26px] rounded-[2px] focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50 mt-4 cursor-pointer"
                    >
                      {isSubmitting ? 'Submitting...' : 'Request demo'}
                    </button>

                    <p className="text-[12px] text-muted text-center font-sans pt-2">
                      Demo form. Connect it to your inbox before launch.
                    </p>
                  </form>
                )}
              </Card>
            </Reveal>
          </div>
        </div>
      </section>
    </PageShell>
  );
};

export default ContactPage;

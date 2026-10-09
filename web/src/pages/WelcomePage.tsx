import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  Compass,
  Search,
  Clock,
  Feather,
  Sparkles,
  ShieldCheck,
  Scale,
  Send,
  MessageSquare,
  TrendingUp,
  MapPin,
  Megaphone,
  FlaskConical,
  ArrowRight,
  CheckCircle2,
  Lock,
  FileText,
  Sliders,
  ChevronDown,
  ChevronRight,
  Layers,
  Building,
  PlusCircle,
  HelpCircle,
  AlertCircle,
} from 'lucide-react';
import { api } from '../api/client';
import { useAppStore } from '../store/useAppStore';
import { PageShell } from '../components/PageShell';
import { Kicker } from '../components/Kicker';
import { Card } from '../components/Card';
import { AgentDefinition, FALLBACK_AGENTS, PhaseType, computeAgentCounts } from '../config/agents';

// Icon map for agents
const AGENT_ICON_MAP: Record<string, React.ReactNode> = {
  Compass: <Compass className="w-5 h-5" />,
  MapPin: <MapPin className="w-5 h-5" />,
  Megaphone: <Megaphone className="w-5 h-5" />,
  Search: <Search className="w-5 h-5" />,
  Clock: <Clock className="w-5 h-5" />,
  Feather: <Feather className="w-5 h-5" />,
  Sparkles: <Sparkles className="w-5 h-5" />,
  ShieldCheck: <ShieldCheck className="w-5 h-5" />,
  Scale: <Scale className="w-5 h-5" />,
  Send: <Send className="w-5 h-5" />,
  MessageSquare: <MessageSquare className="w-5 h-5" />,
  TrendingUp: <TrendingUp className="w-5 h-5" />,
  FlaskConical: <FlaskConical className="w-5 h-5" />,
};

export const WelcomePage: React.FC = () => {
  const navigate = useNavigate();
  const { activeBusinessId, setActiveBusinessId } = useAppStore();
  const [selectedPhaseFilter, setSelectedPhaseFilter] = useState<'all' | PhaseType>('all');
  const [showHowItWorksCollapsed, setShowHowItWorksCollapsed] = useState(false);

  // Queries
  const { data: businesses = [], isLoading: isLoadingBusinesses } = useQuery({
    queryKey: ['businesses'],
    queryFn: () => api.listBusinesses(),
  });

  const { data: agentRegistry } = useQuery({
    queryKey: ['agents'],
    queryFn: () => api.getAgents(),
  });

  const agents: AgentDefinition[] = agentRegistry?.agents || FALLBACK_AGENTS;
  const agentCounts = computeAgentCounts(agents);

  const activeBusiness = businesses.find((b) => b.id === activeBusinessId) || businesses[0];

  const filteredAgents = agents.filter((agent) => {
    if (selectedPhaseFilter === 'all') return true;
    return agent.phases.includes(selectedPhaseFilter);
  });

  // Smooth scroll to agents
  const scrollToAgents = (e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById('agents-roster');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // If businesses exist, show Overview
  if (!isLoadingBusinesses && businesses.length > 0 && activeBusiness) {
    return (
      <PageShell title={`${activeBusiness.name} — Overview — Verity`}>
        <div className="py-10 max-w-[1100px] mx-auto space-y-10">
          {/* Business Header & Phase Status */}
          <div className="bg-surface border border-border rounded-[4px] p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
              <div>
                <Kicker>ACTIVE BUSINESS CONTEXT</Kicker>
                <h1 className="text-3xl font-serif text-text font-normal mt-1 flex items-center gap-3">
                  {activeBusiness.name}
                  <span className="text-xs font-sans uppercase font-medium bg-[#8F703615] text-[#8F7036] px-2.5 py-1 rounded">
                    {activeBusiness.industry}
                  </span>
                </h1>
                <p className="text-sm text-muted mt-1">
                  Ideal Customer: <span className="text-text">{activeBusiness.ideal_customer || 'Not yet configured'}</span>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  to="/onboard"
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-sans font-medium text-text bg-surface border border-border hover:border-accent rounded transition-colors"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-accent" />
                  Add another business
                </Link>
                <Link
                  to="/onboard"
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-sans font-medium text-white bg-[#1A1C21] hover:bg-[#2C3038] rounded transition-colors"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  Edit Profile
                </Link>
              </div>
            </div>

            {/* Current Phase & Readiness */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              <div className="p-4 rounded border border-border bg-[#FAF8F4]/50 space-y-1">
                <div className="text-[11px] font-sans font-semibold uppercase tracking-wider text-muted">Current Stage</div>
                <div className="text-lg font-serif text-text capitalize">Foundation Phase</div>
                <p className="text-xs text-muted">Establishing facts, value pillars, and initial ICP constraints.</p>
              </div>

              <div className="p-4 rounded border border-border bg-[#FAF8F4]/50 space-y-1">
                <div className="text-[11px] font-sans font-semibold uppercase tracking-wider text-muted">Active Agents</div>
                <div className="text-lg font-serif text-text">
                  {activeBusiness.enabled_agents?.length || 6} / {agentCounts.total_count} Assigned
                </div>
                <p className="text-xs text-muted">Atlas, Scout, Quill, Veritas, Warden, Courier operational.</p>
              </div>

              <div className="p-4 rounded border border-border bg-[#FAF8F4]/50 space-y-1">
                <div className="text-[11px] font-sans font-semibold uppercase tracking-wider text-muted">Verification Status</div>
                <div className="text-lg font-serif text-verified flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  Gated & Active
                </div>
                <p className="text-xs text-muted">Every claim is audited against approved facts before dispatch.</p>
              </div>
            </div>
          </div>

          {/* Recommended Next Actions */}
          <div className="space-y-4">
            <Kicker>RECOMMENDED ACTIONS</Kicker>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <Link
                to="/orchestrator"
                className="bg-surface border border-border rounded-[4px] p-6 hover:border-accent transition-all group flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-lg bg-[#8F703615] flex items-center justify-center text-accent">
                    <Compass className="w-5 h-5" />
                  </div>
                  <h3 className="font-serif text-lg text-text group-hover:text-accent transition-colors">
                    Mission Control
                  </h3>
                  <p className="text-xs text-muted leading-relaxed">
                    View active task graphs, monitor agent state transitions, and oversee autonomous runs.
                  </p>
                </div>
                <div className="pt-4 flex items-center gap-1.5 text-xs font-medium text-accent">
                  <span>Open Orchestrator</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>

              <Link
                to="/review"
                className="bg-surface border border-border rounded-[4px] p-6 hover:border-accent transition-all group flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-lg bg-verified/10 flex items-center justify-center text-verified">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <h3 className="font-serif text-lg text-text group-hover:text-accent transition-colors">
                    Review Desk
                  </h3>
                  <p className="text-xs text-muted leading-relaxed">
                    Inspect AI-drafted outreach, resolve Veritas fact-check flags, and give human approval.
                  </p>
                </div>
                <div className="pt-4 flex items-center gap-1.5 text-xs font-medium text-accent">
                  <span>Open Review Desk</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>

              <Link
                to="/workspace"
                className="bg-surface border border-border rounded-[4px] p-6 hover:border-accent transition-all group flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-lg bg-[#8F703615] flex items-center justify-center text-accent">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <h3 className="font-serif text-lg text-text group-hover:text-accent transition-colors">
                    Agent Studio
                  </h3>
                  <p className="text-xs text-muted leading-relaxed">
                    Research new target accounts and formulate customized multi-agent outreach sequences.
                  </p>
                </div>
                <div className="pt-4 flex items-center gap-1.5 text-xs font-medium text-accent">
                  <span>Enter Studio</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            </div>
          </div>

          {/* Collapsible How It Works Reference */}
          <div className="border border-border rounded-[4px] bg-surface overflow-hidden">
            <button
              type="button"
              onClick={() => setShowHowItWorksCollapsed(!showHowItWorksCollapsed)}
              className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-[#FAF8F4] transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <HelpCircle className="w-4 h-4 text-accent" />
                <span className="font-serif text-base text-text">How the Agent System Operates</span>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-muted transition-transform duration-200 ${
                  showHowItWorksCollapsed ? 'rotate-180' : ''
                }`}
              />
            </button>

            {showHowItWorksCollapsed && (
              <div className="px-6 pb-6 pt-2 border-t border-border grid grid-cols-1 sm:grid-cols-5 gap-4 text-xs text-muted">
                <div className="space-y-1">
                  <div className="font-bold text-text">1. Onboard</div>
                  <p>Describe your business model and provide source facts.</p>
                </div>
                <div className="space-y-1">
                  <div className="font-bold text-text">2. Plan</div>
                  <p>Atlas generates a phase-aware dependency graph.</p>
                </div>
                <div className="space-y-1">
                  <div className="font-bold text-text">3. Execute</div>
                  <p>Specialized agents gather intelligence and draft copy.</p>
                </div>
                <div className="space-y-1">
                  <div className="font-bold text-text">4. Verify</div>
                  <p>Veritas fact-checks claims; Warden enforces anti-spam.</p>
                </div>
                <div className="space-y-1">
                  <div className="font-bold text-text">5. You Approve</div>
                  <p>Human sign-off required before external transmission.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </PageShell>
    );
  }

  // FIRST-RUN WELCOME EXPERIENCE (No businesses yet)
  return (
    <PageShell title="Verity — Growth, verified">
      <div className="py-12 md:py-16 space-y-24 max-w-[1140px] mx-auto">
        {/* 1. HERO SECTION */}
        <section className="text-center space-y-6 pt-4 max-w-3xl mx-auto">
          <Kicker>VERITY AUTONOMOUS GROWTH SYSTEM</Kicker>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif text-text tracking-tight font-light leading-[1.1]">
            Growth, verified.
          </h1>
          <p className="text-base sm:text-lg text-muted max-w-2xl mx-auto leading-relaxed">
            Autonomous outbound, marketing, and business growth orchestrated by specialized AI agents with
            deterministic policy gates and human sign-off on every claim.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/onboard"
              className="w-full sm:w-auto px-8 py-3.5 text-sm font-semibold text-[#0A0D14] bg-gradient-to-r from-[#D4AF37] to-[#E5C378] hover:brightness-105 rounded shadow-[0_2px_15px_rgba(212,175,55,0.25)] border border-[#F3DE9C]/40 transition-all flex items-center justify-center gap-2"
            >
              <span>Describe your business</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <a
              href="#agents-roster"
              onClick={scrollToAgents}
              className="w-full sm:w-auto px-6 py-3.5 text-sm font-medium text-text hover:text-accent border border-border bg-surface hover:border-accent/40 rounded transition-colors flex items-center justify-center gap-2"
            >
              <span>Meet the agents ({agentCounts.display_label})</span>
              <ChevronDown className="w-4 h-4" />
            </a>
          </div>
        </section>

        {/* 2. "WHERE IS YOUR BUSINESS TODAY?" (Stage selector / explanation) */}
        <section className="space-y-6">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <Kicker>PROGRESSION FRAMEWORK</Kicker>
            <h2 className="text-2xl sm:text-3xl font-serif text-text font-light">
              Where is your business today?
            </h2>
            <p className="text-xs sm:text-sm text-muted">
              Verity divides business development into three structured stages so agents never attempt outbound without verified facts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            <Card hoverable className="space-y-3 relative overflow-hidden border-accent/40 bg-white">
              <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-accent bg-[#8F703615] inline-block px-2 py-0.5 rounded">
                Stage 1 • You start here
              </div>
              <h3 className="font-serif text-xl text-text">Foundation</h3>
              <p className="text-xs text-muted leading-relaxed">
                Define business facts, ICP, customer segments, verified pricing, and defensible positioning before running outreach.
              </p>
              <div className="pt-2 text-[11px] text-text font-mono">
                Key Agents: Atlas, Compass, Scout
              </div>
            </Card>

            <Card hoverable className="space-y-3 bg-white">
              <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-muted bg-[#FAF8F4] inline-block px-2 py-0.5 rounded border border-border">
                Stage 2
              </div>
              <h3 className="font-serif text-xl text-text">Pre-Sales Readiness</h3>
              <p className="text-xs text-muted leading-relaxed">
                Grounded collateral, messaging experiments, cold outbound testing, objection handling, and fact-check auditing.
              </p>
              <div className="pt-2 text-[11px] text-text font-mono">
                Key Agents: Quill, Veritas, Warden, Courier
              </div>
            </Card>

            <Card hoverable className="space-y-3 bg-white">
              <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-muted bg-[#FAF8F4] inline-block px-2 py-0.5 rounded border border-border">
                Stage 3
              </div>
              <h3 className="font-serif text-xl text-text">Growth & Optimization</h3>
              <p className="text-xs text-muted leading-relaxed">
                Multi-channel expansion, inbound reply classification, conversion pattern learning, and budget scaling.
              </p>
              <div className="pt-2 text-[11px] text-text font-mono">
                Key Agents: Herald, Echo, Sage
              </div>
            </Card>
          </div>

          <div className="bg-[#8F703610] border border-[#8F703630] rounded p-4 text-center text-xs text-text max-w-2xl mx-auto flex items-center justify-center gap-2">
            <HelpCircle className="w-4 h-4 text-accent shrink-0" />
            <span>
              <strong>Not sure which you are?</strong> Atlas determines your stage during onboarding from your answers.
            </span>
          </div>
        </section>

        {/* 3. "HOW IT WORKS" (5 short steps) */}
        <section className="space-y-8">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <Kicker>OPERATIONAL ARCHITECTURE</Kicker>
            <h2 className="text-2xl sm:text-3xl font-serif text-text font-light">
              How it works
            </h2>
            <p className="text-xs sm:text-sm text-muted">
              Every workflow follows five sequential safeguards from intake to dispatch.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
            <div className="bg-surface border border-border rounded p-5 space-y-2 relative">
              <div className="w-7 h-7 rounded-full bg-[#1A1C21] text-white flex items-center justify-center text-xs font-mono font-bold">
                1
              </div>
              <h4 className="font-serif text-base text-text">Onboard</h4>
              <p className="text-xs text-muted leading-relaxed">
                Tell us about your business, upload reference documents, or describe your offerings.
              </p>
            </div>

            <div className="bg-surface border border-border rounded p-5 space-y-2 relative">
              <div className="w-7 h-7 rounded-full bg-[#1A1C21] text-white flex items-center justify-center text-xs font-mono font-bold">
                2
              </div>
              <h4 className="font-serif text-base text-text">Plan</h4>
              <p className="text-xs text-muted leading-relaxed">
                Atlas builds an execution task graph tailored specifically to your business phase.
              </p>
            </div>

            <div className="bg-surface border border-border rounded p-5 space-y-2 relative">
              <div className="w-7 h-7 rounded-full bg-[#1A1C21] text-white flex items-center justify-center text-xs font-mono font-bold">
                3
              </div>
              <h4 className="font-serif text-base text-text">Agents Execute</h4>
              <p className="text-xs text-muted leading-relaxed">
                Specialized agents research accounts, synthesize copy, and formulate campaigns.
              </p>
            </div>

            <div className="bg-surface border border-border rounded p-5 space-y-2 relative">
              <div className="w-7 h-7 rounded-full bg-[#1A1C21] text-white flex items-center justify-center text-xs font-mono font-bold">
                4
              </div>
              <h4 className="font-serif text-base text-text">Verify</h4>
              <p className="text-xs text-muted leading-relaxed">
                Veritas checks every sentence against your source facts; Warden enforces anti-spam policies.
              </p>
            </div>

            <div className="bg-surface border border-border rounded p-5 space-y-2 relative">
              <div className="w-7 h-7 rounded-full bg-verified text-white flex items-center justify-center text-xs font-mono font-bold">
                5
              </div>
              <h4 className="font-serif text-base text-text">You Approve</h4>
              <p className="text-xs text-muted leading-relaxed">
                Nothing is sent or published without your explicit review and sign-off.
              </p>
            </div>
          </div>
        </section>

        {/* 4. "MEET THE AGENTS" (Agent roster with real data from registry) */}
        <section id="agents-roster" className="space-y-8 scroll-mt-24">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <Kicker>SPECIALIZED ROSTER</Kicker>
            <h2 className="text-2xl sm:text-3xl font-serif text-text font-light">
              Meet the agents
            </h2>
            <p className="text-xs sm:text-sm text-muted">
              {agentCounts.ai_count} generative agents + {agentCounts.rules_engine_count} deterministic rules engines.
            </p>
          </div>

          {/* Phase Filter Chips */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedPhaseFilter('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-sans transition-all cursor-pointer ${
                selectedPhaseFilter === 'all'
                  ? 'bg-[#1A1C21] text-white font-medium shadow-sm'
                  : 'bg-surface border border-border text-muted hover:text-text'
              }`}
            >
              All ({agentCounts.total_count})
            </button>
            <button
              type="button"
              onClick={() => setSelectedPhaseFilter('foundation')}
              className={`px-3 py-1.5 rounded-full text-xs font-sans transition-all cursor-pointer ${
                selectedPhaseFilter === 'foundation'
                  ? 'bg-[#1A1C21] text-white font-medium shadow-sm'
                  : 'bg-surface border border-border text-muted hover:text-text'
              }`}
            >
              Foundation ({agents.filter((a) => a.phases.includes('foundation')).length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedPhaseFilter('presales_readiness')}
              className={`px-3 py-1.5 rounded-full text-xs font-sans transition-all cursor-pointer ${
                selectedPhaseFilter === 'presales_readiness'
                  ? 'bg-[#1A1C21] text-white font-medium shadow-sm'
                  : 'bg-surface border border-border text-muted hover:text-text'
              }`}
            >
              Pre-Sales ({agents.filter((a) => a.phases.includes('presales_readiness')).length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedPhaseFilter('growth_optimization')}
              className={`px-3 py-1.5 rounded-full text-xs font-sans transition-all cursor-pointer ${
                selectedPhaseFilter === 'growth_optimization'
                  ? 'bg-[#1A1C21] text-white font-medium shadow-sm'
                  : 'bg-surface border border-border text-muted hover:text-text'
              }`}
            >
              Growth ({agents.filter((a) => a.phases.includes('growth_optimization')).length})
            </button>
          </div>

          {/* Agents Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAgents.map((agent) => (
              <div
                key={agent.id}
                className={`bg-surface border rounded-[4px] p-6 space-y-4 flex flex-col justify-between transition-colors ${
                  agent.status === 'planned' ? 'opacity-80 border-dashed border-border' : 'border-border hover:border-accent/40'
                }`}
              >
                <div className="space-y-3">
                  {/* Top Bar: Icon + Name + Kind Tag */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded bg-[#8F703615] text-accent flex items-center justify-center">
                        {AGENT_ICON_MAP[agent.icon] || <Compass className="w-5 h-5" />}
                      </div>
                      <div>
                        <h3 className="font-serif text-lg text-text leading-tight">{agent.name}</h3>
                        <div className="text-[11px] text-muted">{agent.role}</div>
                      </div>
                    </div>

                    {agent.status === 'planned' ? (
                      <span className="text-[10px] font-mono uppercase bg-muted/10 text-muted px-2 py-0.5 rounded border border-muted/20">
                        Planned • Q2 2026
                      </span>
                    ) : agent.kind === 'rules_engine' ? (
                      <span className="text-[10px] font-mono uppercase bg-verified/10 text-verified px-2 py-0.5 rounded border border-verified/30">
                        Rules Engine
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono uppercase bg-[#8F703615] text-accent px-2 py-0.5 rounded border border-accent/20">
                        AI Agent
                      </span>
                    )}
                  </div>

                  {/* One Line Job */}
                  <p className="text-xs text-text leading-relaxed font-sans">
                    {agent.one_line_job}
                  </p>

                  {/* Can / Cannot Lists */}
                  <div className="space-y-2 pt-2 border-t border-border/60 text-[11px]">
                    <div className="space-y-1">
                      <div className="text-[10px] font-mono uppercase text-verified font-semibold">What it can do</div>
                      <ul className="space-y-1 text-muted">
                        {agent.can.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <CheckCircle2 className="w-3 h-3 text-verified shrink-0 mt-0.5" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="space-y-1 pt-1">
                      <div className="text-[10px] font-mono uppercase text-danger font-semibold">What it cannot do</div>
                      <ul className="space-y-1 text-muted">
                        {agent.cannot.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <Lock className="w-3 h-3 text-danger shrink-0 mt-0.5" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Bottom Phase Badges */}
                <div className="pt-3 border-t border-border/60 flex flex-wrap gap-1">
                  {agent.phases.map((p) => (
                    <span
                      key={p}
                      className="text-[10px] font-sans px-2 py-0.5 rounded bg-[#FAF8F4] border border-border text-muted capitalize"
                    >
                      {p.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 5. "WHAT YOU CONTROL" (Trust & Safety pledge) */}
        <section className="space-y-6">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <Kicker>TRUST & SAFETY PLEDGE</Kicker>
            <h2 className="text-2xl sm:text-3xl font-serif text-text font-light">
              What you control
            </h2>
            <p className="text-xs sm:text-sm text-muted">
              Autonomous execution bounded by human sovereignty and immutable auditability.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
            <Card hoverable className="space-y-2 bg-white">
              <div className="w-8 h-8 rounded bg-accent/10 text-accent flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h4 className="font-serif text-base text-text">Human in the loop</h4>
              <p className="text-xs text-muted leading-relaxed">
                Every outbound email, campaign, and claim requires your explicit sign-off before transmission.
              </p>
            </Card>

            <Card hoverable className="space-y-2 bg-white">
              <div className="w-8 h-8 rounded bg-accent/10 text-accent flex items-center justify-center">
                <Feather className="w-4 h-4" />
              </div>
              <h4 className="font-serif text-base text-text">Edit anything</h4>
              <p className="text-xs text-muted leading-relaxed">
                You can freely rewrite or adjust any agent draft directly in the review desk before sending.
              </p>
            </Card>

            <Card hoverable className="space-y-2 bg-white">
              <div className="w-8 h-8 rounded bg-accent/10 text-accent flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <h4 className="font-serif text-base text-text">Pause or cancel</h4>
              <p className="text-xs text-muted leading-relaxed">
                Any running plan, task graph, or agent run can be paused or cancelled at any time.
              </p>
            </Card>

            <Card hoverable className="space-y-2 bg-white">
              <div className="w-8 h-8 rounded bg-accent/10 text-accent flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <h4 className="font-serif text-base text-text">Audit trail</h4>
              <p className="text-xs text-muted leading-relaxed">
                Every agent step, decision trace, and policy check is permanently logged and inspectable.
              </p>
            </Card>
          </div>

          {/* Hard Safety Guarantee Banner */}
          <div className="bg-[#1A1C21] text-white rounded p-5 text-center text-xs md:text-sm leading-relaxed max-w-3xl mx-auto space-y-1">
            <div className="font-mono text-accent uppercase text-[11px] tracking-wider font-semibold">
              System Boundary Guarantee
            </div>
            <div>
              What the system cannot do: <strong>spend money</strong>, <strong>send emails without approval</strong>, or <strong>contact prospects without an audit receipt</strong>.
            </div>
          </div>
        </section>

        {/* 6. "WHAT YOU WILL NEED" (Get ready to onboard) */}
        <section className="bg-surface border border-border rounded-[4px] p-8 md:p-12 text-center space-y-6 max-w-3xl mx-auto">
          <div className="space-y-2">
            <Kicker>GET READY TO ONBOARD</Kicker>
            <h2 className="text-3xl font-serif text-text font-light">
              What you will need
            </h2>
            <p className="text-sm text-muted max-w-xl mx-auto">
              Setting up your business profile is fast and transparent.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left max-w-md mx-auto text-xs text-text">
            <div className="flex items-start gap-2.5 p-3 rounded bg-[#FAF8F4] border border-border">
              <Clock className="w-4 h-4 text-accent shrink-0 mt-0.5" />
              <div>
                <strong>5 to 10 minutes</strong>
                <div className="text-muted text-[11px]">To describe what your business does and who you sell to.</div>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded bg-[#FAF8F4] border border-border">
              <FileText className="w-4 h-4 text-accent shrink-0 mt-0.5" />
              <div>
                <strong>Optional documents</strong>
                <div className="text-muted text-[11px]">Pitch deck, pricing sheets, or brochures for ground truth facts.</div>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <Link
              to="/onboard"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 text-sm font-semibold text-[#0A0D14] bg-gradient-to-r from-[#D4AF37] to-[#E5C378] hover:brightness-105 rounded shadow-[0_2px_15px_rgba(212,175,55,0.25)] border border-[#F3DE9C]/40 transition-all cursor-pointer"
            >
              <span>Get started — describe your business</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </div>
    </PageShell>
  );
};
export default WelcomePage;

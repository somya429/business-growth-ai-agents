import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useAppStore } from '../../store/useAppStore';
import { ALL_AGENTS_ROSTER } from '../../mocks/fixtures';
import { AgentCard } from './AgentCard';
import { ExtensibleCatalog } from './ExtensibleCatalog';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { SpyglassRadarView } from '../spyglass/SpyglassRadarView';
import { Cpu, Terminal, Sparkles, Activity, ShieldCheck, Layers } from 'lucide-react';

export const AgentRosterPage: React.FC = () => {
  const { activeBusinessId } = useAppStore();
  const [activeTab, setActiveTab] = useState<'fleet' | 'spyglass' | 'guardrails'>('fleet');

  const { data: businesses = [], isLoading } = useQuery({
    queryKey: ['businesses'],
    queryFn: () => api.listBusinesses(),
  });

  const activeBusiness =
    businesses.find((b) => b.id === activeBusinessId) || businesses[0];

  if (isLoading || !activeBusiness) {
    return (
      <div className="p-8 max-w-[1280px] mx-auto space-y-6">
        <Skeleton className="h-10 w-80" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-56" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-[1280px] mx-auto space-y-8 pb-20">
      {/* Sub-Navigation Pill Bar ("Pages Inside Page") */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center bg-surface border border-border rounded-lg p-1 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('fleet')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              activeTab === 'fleet'
                ? 'bg-accent/15 text-accent font-semibold shadow-xs'
                : 'text-muted hover:text-text'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Agent Fleet Roster</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('spyglass')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              activeTab === 'spyglass'
                ? 'bg-accent/15 text-accent font-semibold shadow-xs'
                : 'text-muted hover:text-text'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-blue-400" />
            <span>Spyglass Telemetry</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('guardrails')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              activeTab === 'guardrails'
                ? 'bg-accent/15 text-accent font-semibold shadow-xs'
                : 'text-muted hover:text-text'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Guardrails & Safety</span>
          </button>
        </div>

        <div className="text-xs text-muted font-mono hidden sm:block">
          Active Fleet Context: <strong className="text-text font-normal">{activeBusiness.name}</strong>
        </div>
      </div>

      {activeTab === 'spyglass' && <SpyglassRadarView />}

      {activeTab === 'guardrails' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
            <h2 className="text-lg font-serif text-text font-normal">
              Autonomous Guardrails & Truth Enforcement
            </h2>
            <p className="text-xs text-muted max-w-3xl leading-relaxed">
              Veritas (Factual Auditor) and Warden (Policy Engine) operate as deterministic barriers.
              Any generated claim without an approved document citation or verified external source URL is rejected.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-lg bg-surface-2 border border-border space-y-1.5">
                <div className="text-xs font-semibold text-text">Source URL Provenance</div>
                <div className="text-xs text-muted">
                  All signals require real, live external URLs (press releases, filings). Hallucinated sources cause immediate task termination.
                </div>
              </div>

              <div className="p-4 rounded-lg bg-surface-2 border border-border space-y-1.5">
                <div className="text-xs font-semibold text-text">Meta Platform Compliance</div>
                <div className="text-xs text-muted">
                  Cold automated DMs to non-followers are prohibited per Meta policies. All social prospects route to human review queues.
                </div>
              </div>

              <div className="p-4 rounded-lg bg-surface-2 border border-border space-y-1.5">
                <div className="text-xs font-semibold text-text">Human-in-the-Loop Gateway</div>
                <div className="text-xs text-muted">
                  Every outward communication (Resend email dispatch, CRM deal creation) requires explicit operator approval at the Review Desk.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'fleet' && (
        <div className="space-y-8 animate-in fade-in duration-150">
          {/* Header */}
          <div className="border-b border-border pb-6">
            <span className="text-[11px] font-mono uppercase tracking-widest text-accent">
              AUTONOMOUS SAFETY ARCHITECTURE
            </span>
            <h1 className="font-serif text-3xl text-text font-light tracking-tight mt-1">
              Agent Fleet & Engine Roster
            </h1>
            <p className="text-xs text-text-muted mt-1 leading-relaxed max-w-3xl">
              Verity bifurcates operations into nondeterministic LLM reasoning agents (strictly constrained by
              ground truth facts) and deterministic code engines (Warden and Courier) that cannot be bypassed.
            </p>

            <div className="flex items-center gap-4 mt-4 text-xs font-mono">
              <Badge variant="accent" size="sm">
                12 AI Agents (Bounded Reasoning)
              </Badge>
              <Badge variant="warning" size="sm">
                2 Rules Engines (Deterministic Code)
              </Badge>
              <span className="text-text-faint">
                Active Profile: <span className="text-text font-medium">{activeBusiness.name}</span>
              </span>
            </div>
          </div>

      {/* Core 12 Grid (10 Agents + 2 Engines) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl text-text font-normal">
            Core Autonomous Nodes & Consensus Guards
          </h2>
          <span className="font-mono text-[11px] text-text-faint">
            Click any card to inspect full security bounds
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {ALL_AGENTS_ROSTER.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      </div>

      {/* Extensible 48-Agent Fleet Section */}
      <ExtensibleCatalog enabledAgentIds={activeBusiness.enabled_agents} />
        </div>
      )}
    </div>
  );
};

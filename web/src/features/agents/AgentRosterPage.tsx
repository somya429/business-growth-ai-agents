import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useAppStore } from '../../store/useAppStore';
import { ALL_AGENTS_ROSTER } from '../../mocks/fixtures';
import { AgentCard } from './AgentCard';
import { ExtensibleCatalog } from './ExtensibleCatalog';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { Cpu, Terminal, Sparkles } from 'lucide-react';

export const AgentRosterPage: React.FC = () => {
  const { activeBusinessId } = useAppStore();

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
    <div className="p-6 md:p-8 max-w-[1280px] mx-auto space-y-10 pb-20">
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
  );
};

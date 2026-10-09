import React from 'react';
import { EXTENDED_48_CATALOG } from '../../mocks/fixtures';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Check, Sparkles, Layers } from 'lucide-react';

interface ExtensibleCatalogProps {
  enabledAgentIds?: string[];
}

export const ExtensibleCatalog: React.FC<ExtensibleCatalogProps> = ({
  enabledAgentIds = ['atlas', 'scout', 'cadence', 'quill', 'muse', 'veritas', 'warden', 'courier', 'echo', 'sage'],
}) => {
  // Group catalog by function
  const grouped = EXTENDED_48_CATALOG.reduce((acc, agent) => {
    acc[agent.function] = acc[agent.function] || [];
    acc[agent.function].push(agent);
    return acc;
  }, {} as Record<string, typeof EXTENDED_48_CATALOG>);

  return (
    <div className="space-y-8 pt-6 border-t border-border">
      <div>
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-accent stroke-[1.5]" />
          <h3 className="font-serif text-2xl text-text font-light tracking-tight">
            Extensible 48-Agent Fleet Catalog
          </h3>
        </div>
        <p className="text-xs text-text-muted mt-1 leading-relaxed max-w-3xl">
          Verity's plug-and-play architecture supports 48 specialized autonomous agents. Each business profile
          dynamically mounts and unmounts agents based on commercial requirements and risk tolerance.
          Currently active agents for this business are highlighted below.
        </p>
      </div>

      <div className="space-y-8">
        {Object.entries(grouped).map(([category, agents]) => (
          <div key={category} className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-mono uppercase tracking-wider text-accent font-semibold">
                {category} ({agents.length} Specialized Nodes)
              </h4>
              <span className="text-[11px] font-mono text-text-faint">
                Autonomous Extension Group
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {agents.map((agent) => {
                const isEnabled = enabledAgentIds.includes(agent.name.toLowerCase());

                return (
                  <div
                    key={agent.name}
                    className={`p-3.5 rounded-[10px] border transition-all text-xs ${
                      isEnabled
                        ? 'bg-accent/10 border-accent/40 text-text shadow-[0_0_10px_rgba(201,169,110,0.08)]'
                        : 'bg-surface-2/40 border-border/60 text-text-muted opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className={`font-medium ${
                          isEnabled ? 'text-accent font-semibold' : 'text-text'
                        }`}
                      >
                        {agent.name}
                      </span>
                      {isEnabled ? (
                        <span className="text-[10px] font-mono text-verified flex items-center gap-1 font-semibold">
                          <Check className="w-3 h-3 stroke-[2]" />
                          MOUNTED
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-text-faint">
                          DORMANT
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] leading-relaxed line-clamp-2">
                      {agent.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

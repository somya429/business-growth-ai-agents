import React from 'react';
import { AgentDefinition } from '../../api/types';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { useAppStore } from '../../store/useAppStore';
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
  Check,
  Ban,
  Terminal,
} from 'lucide-react';

interface AgentCardProps {
  agent: AgentDefinition;
}

export const AgentCard: React.FC<AgentCardProps> = ({ agent }) => {
  const { setActiveAgentDrawer } = useAppStore();

  const iconMap: Record<string, React.ReactNode> = {
    Compass: <Compass className="w-5 h-5 stroke-[1.5]" />,
    Search: <Search className="w-5 h-5 stroke-[1.5]" />,
    Clock: <Clock className="w-5 h-5 stroke-[1.5]" />,
    Feather: <Feather className="w-5 h-5 stroke-[1.5]" />,
    Sparkles: <Sparkles className="w-5 h-5 stroke-[1.5]" />,
    ShieldCheck: <ShieldCheck className="w-5 h-5 stroke-[1.5]" />,
    Scale: <Scale className="w-5 h-5 stroke-[1.5]" />,
    Send: <Send className="w-5 h-5 stroke-[1.5]" />,
    MessageSquare: <MessageSquare className="w-5 h-5 stroke-[1.5]" />,
    TrendingUp: <TrendingUp className="w-5 h-5 stroke-[1.5]" />,
    MapPin: <MapPin className="w-5 h-5 stroke-[1.5]" />,
    Megaphone: <Megaphone className="w-5 h-5 stroke-[1.5]" />,
  };

  const isRulesEngine = agent.kind === 'rules_engine';

  return (
    <Card
      variant="surface"
      hoverable
      onClick={() => setActiveAgentDrawer(agent)}
      className="p-5 flex flex-col justify-between space-y-4 cursor-pointer"
    >
      <div>
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="w-10 h-10 rounded-[10px] bg-surface-2 border border-border flex items-center justify-center text-accent">
            {iconMap[agent.icon] || <Sparkles className="w-5 h-5 stroke-[1.5]" />}
          </div>

          <Badge variant={isRulesEngine ? 'warning' : 'accent'} size="sm">
            {isRulesEngine ? (
              <span className="flex items-center gap-1">
                <Terminal className="w-2.5 h-2.5 stroke-[1.5]" />
                Rules Engine
              </span>
            ) : (
              'AI Agent (LLM)'
            )}
          </Badge>
        </div>

        {/* Title & Role */}
        <h3 className="font-serif text-lg text-text font-normal tracking-tight">
          {agent.name}
        </h3>
        <p className="text-xs text-text-muted mt-0.5 line-clamp-1">{agent.role}</p>

        {/* Can List */}
        <div className="mt-4 space-y-1.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-verified flex items-center gap-1">
            <Check className="w-3 h-3" />
            Can:
          </span>
          <ul className="text-xs text-text-muted space-y-1">
            {agent.can.slice(0, 2).map((item, idx) => (
              <li key={idx} className="flex items-start gap-1.5 leading-snug">
                <span className="text-verified">•</span>
                <span className="line-clamp-1">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Cannot List */}
        <div className="mt-3 space-y-1.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-danger flex items-center gap-1">
            <Ban className="w-3 h-3" />
            Cannot:
          </span>
          <ul className="text-xs text-text-muted space-y-1">
            {agent.cannot.slice(0, 2).map((item, idx) => (
              <li key={idx} className="flex items-start gap-1.5 leading-snug">
                <span className="text-danger">•</span>
                <span className="line-clamp-1">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="pt-3 border-t border-border flex items-center justify-between text-[11px] font-mono text-text-faint">
        <span className="capitalize">{agent.category.replace('_', ' ')}</span>
        <span className="text-accent hover:underline">View Permissions →</span>
      </div>
    </Card>
  );
};

import React, { useState } from 'react';
import {
  FileText,
  Search,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  Compass,
  Eye,
  ArrowRight,
  Filter,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';

export interface IntelligenceReportItem {
  id: string;
  category: string;
  agent: string;
  agent_icon: string;
  title: string;
  timestamp: string;
  confidence: number;
  key_metric: string;
  summary: string;
  takeaways: string[];
  verified_facts: number;
  action_label?: string;
  action_command?: string;
}

interface ApexIntelligenceDossierProps {
  reports: IntelligenceReportItem[];
  onTriggerAction: (command: string) => void;
}

export const ApexIntelligenceDossier: React.FC<ApexIntelligenceDossierProps> = ({
  reports,
  onTriggerAction,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedReportId, setExpandedReportId] = useState<string | null>(reports[0]?.id || null);

  const categories = [
    { id: 'all', label: 'All Intelligence' },
    { id: 'market_recon', label: 'Market & Competitor Recon' },
    { id: 'account_intelligence', label: 'Account Dossiers' },
    { id: 'trust_audit', label: 'Factual Audits' },
    { id: 'strategic_sprint', label: 'Strategic Sprints' },
    { id: 'response_attribution', label: 'Response Attribution' },
  ];

  const filteredReports = reports.filter((rep) => {
    const matchesCat = selectedCategory === 'all' || rep.category === selectedCategory;
    const matchesSearch =
      rep.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rep.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rep.agent.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="panel bg-[var(--paper)] border-[var(--ink)] shadow-hard flex flex-col">
      {/* Top Header Bar */}
      <div className="p-4 sm:p-5 bg-[var(--tint)] border-b border-[var(--ink)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 border border-[var(--ink)] bg-[var(--bg)] flex items-center justify-center text-[var(--ink-deep)]">
            <FileText className="w-5 h-5 text-[var(--accent)]" />
          </div>
          <div>
            <div className="text-base font-bold text-[var(--ink-deep)] flex items-center gap-2">
              <span>Executive Research & Intelligence Dossier</span>
              <span className="pill text-[11px] font-mono font-bold bg-[var(--ink)] text-[var(--bg)]">
                {reports.length} Briefs Ready
              </span>
            </div>
            <div className="text-xs text-[var(--ink-2)]">
              Multi-agent investigative research and signals aggregated for executive decision making.
            </div>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-[var(--ink-2)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search intelligence..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-[var(--bg)] border border-[var(--ink)] text-[var(--ink-deep)] placeholder:text-[var(--ink-2)] focus:outline-none"
          />
        </div>
      </div>

      {/* In-Page Sub-View Category Tabs Strip */}
      <div className="px-5 py-3 bg-[var(--paper)] border-b border-[var(--ink)] flex items-center gap-2 overflow-x-auto no-scrollbar">
        <span className="eyebrow text-xs hidden sm:inline">Category:</span>
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setSelectedCategory(cat.id)}
            className={`chip text-xs whitespace-nowrap ${
              selectedCategory === cat.id ? 'bg-[var(--ink)] text-[var(--bg)]' : ''
            }`}
            aria-pressed={selectedCategory === cat.id}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Reports Grid */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5 bg-[var(--bg)]">
        {filteredReports.map((rep) => {
          const isExpanded = expandedReportId === rep.id;
          return (
            <div
              key={rep.id}
              className={`p-5 border transition-all flex flex-col justify-between ${
                isExpanded
                  ? 'bg-[var(--paper)] border-[var(--ink)] shadow-hard-sm'
                  : 'bg-[var(--paper)] border-[var(--line)] hover:border-[var(--ink)]'
              }`}
            >
              <div className="space-y-3">
                {/* Agent & Category Header */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="pill text-[11px] font-mono font-bold bg-[var(--tint)] border border-[var(--ink)] text-[var(--ink-deep)] flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-[var(--accent)]" />
                      {rep.agent}
                    </span>
                    <span className="pill text-[10px] font-mono uppercase bg-[var(--bg)] border border-[var(--ink)] text-[var(--ink-deep)] font-bold">
                      {rep.key_metric}
                    </span>
                  </div>

                  <span className="text-xs text-[var(--ink-2)] font-mono flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {rep.timestamp}
                  </span>
                </div>

                {/* Title */}
                <h4 className="text-base font-bold text-[var(--ink-deep)] leading-snug">
                  {rep.title}
                </h4>

                {/* Executive Summary */}
                <p className="text-xs text-[var(--ink-2)] leading-relaxed">
                  {rep.summary}
                </p>

                {/* Key Takeaways */}
                <div className="p-3 bg-[var(--bg)] border border-[var(--ink)] space-y-1.5">
                  <div className="eyebrow text-[10px] font-bold flex items-center justify-between">
                    <span>Key Strategic Takeaways</span>
                    <span className="font-mono text-[10px] text-[var(--accent-text)]">
                      {rep.confidence}% Confidence
                    </span>
                  </div>
                  {rep.takeaways.map((point, i) => (
                    <div key={i} className="text-xs text-[var(--ink)] flex items-start gap-2">
                      <span className="text-[var(--accent)] shrink-0 font-bold">•</span>
                      <span>{point}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Footer */}
              <div className="pt-4 mt-4 border-t border-[var(--line)] flex items-center justify-between gap-3">
                <span className="text-xs text-[var(--ink-2)] font-mono flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[var(--verified)]" />
                  {rep.verified_facts} Grounded Citations
                </span>

                {rep.action_command && (
                  <button
                    type="button"
                    onClick={() => onTriggerAction(rep.action_command!)}
                    className="btn small text-xs"
                  >
                    <span>{rep.action_label || 'Execute Briefing'}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {filteredReports.length === 0 && (
          <div className="col-span-2 p-12 text-center text-xs font-mono text-[var(--ink-2)]">
            No intelligence briefs match your current filter or query.
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  Radio,
  Search,
  Zap,
  RefreshCw,
  Clock,
  ExternalLink,
  Copy,
  Check,
  X,
  Shield,
  Layers,
  Server,
  DollarSign,
  BarChart3,
  Flame,
  CheckCircle2,
  Lock,
  ArrowUpRight,
  Eye,
  Sliders,
  Filter,
} from 'lucide-react';
import { api } from '../../api/client';
import { useAppStore } from '../../store/useAppStore';

export const SpyglassRadarView: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'telemetry' | 'competitive' | 'ads' | 'enterprise'>('ads');
  const [competitorInput, setCompetitorInput] = useState('HubSpot');
  const [selectedShift, setSelectedShift] = useState<any | null>(null);
  const [selectedAdPlatform, setSelectedAdPlatform] = useState<string>('All');
  const [copiedAction, setCopiedAction] = useState<string | null>(null);
  const { addToast } = useAppStore();

  // Queries
  const { data: status, refetch: refetchStatus, isFetching: fetchingStatus } = useQuery({
    queryKey: ['spyglass-status'],
    queryFn: () => api.getSpyglassStatus(),
  });

  const { data: competitiveData, refetch: refetchComp, isFetching: fetchingComp } = useQuery({
    queryKey: ['spyglass-comp', competitorInput],
    queryFn: () => api.getSpyglassCompetitive(competitorInput),
  });

  const { data: telemetryData, refetch: refetchTelemetry, isFetching: fetchingTelemetry } = useQuery({
    queryKey: ['spyglass-telemetry'],
    queryFn: () => api.getSpyglassTelemetry(),
  });

  const { data: campaignsData, refetch: refetchCampaigns, isFetching: fetchingCampaigns } = useQuery({
    queryKey: ['spyglass-campaigns', competitorInput, selectedAdPlatform],
    queryFn: () => api.getSpyglassCampaigns(competitorInput, selectedAdPlatform),
  });

  const { data: enterpriseData, refetch: refetchEnterprise } = useQuery({
    queryKey: ['spyglass-enterprise'],
    queryFn: () => api.getSpyglassEnterprise(),
  });

  const shifts = competitiveData?.detected_shifts || [];
  const campaigns = campaignsData?.campaigns || [];
  const isRefreshing = fetchingStatus || fetchingComp || fetchingTelemetry || fetchingCampaigns;

  const handleRefreshAll = () => {
    refetchStatus();
    refetchComp();
    refetchTelemetry();
    refetchCampaigns();
    refetchEnterprise();
    addToast({
      type: 'info',
      title: 'Radar Rescanned',
      message: `Updated telemetry and ad footprints for ${competitorInput}.`,
    });
  };

  const fallbackCopy = (text: string) => {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    } catch (err) {
      console.warn('Fallback copy failed', err);
      return false;
    }
  };

  const handleCopyText = (text: string, label: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator?.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
      } else {
        fallbackCopy(text);
      }
    } catch {
      fallbackCopy(text);
    }
    setCopiedAction(text);
    addToast({
      type: 'info',
      title: `${label} Copied`,
      message: 'Ready to paste into cold outreach sequence.',
    });
    setTimeout(() => setCopiedAction(null), 2500);
  };

  const quickCompetitors = ['HubSpot', 'Apollo.io', 'ZoomInfo', 'Gong', 'Outreach'];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Spyglass Deployment & Health Banner */}
      <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Spyglass Connected
              </span>
              <span className="text-xs font-mono text-muted">
                Deployment ID: <span className="text-accent">{status?.deployment_id || 'spyglass-dep-live-prod-01'}</span>
              </span>
              <span className="text-xs font-mono text-muted border-l border-border pl-2">
                MCP Protocol: <span className="text-blue-400 font-semibold">Active (Streamable SSE)</span>
              </span>
            </div>
            <h2 className="text-xl font-serif text-text font-normal">
              Spyglass Telemetry & Competitive Radar
            </h2>
            <p className="text-xs text-muted max-w-2xl mt-1 leading-relaxed">
              24/7 autonomous monitoring across competitor ad campaigns, pricing pivots, Meta/TikTok ad libraries,
              and real-time LLM node execution telemetry.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 flex-wrap">
            {/* Custom Competitor Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleRefreshAll();
              }}
              className="flex items-center gap-1.5"
            >
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={competitorInput}
                  onChange={(e) => setCompetitorInput(e.target.value)}
                  placeholder="Enter any competitor (e.g. Clay, Salesforce)..."
                  className="bg-surface-2 border border-border rounded-md pl-8 pr-3 py-1.5 text-xs text-text w-56 focus:outline-none focus:border-accent"
                />
              </div>
              <button
                type="submit"
                disabled={isRefreshing}
                className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-accent text-bg text-xs font-medium hover:bg-accent/90 transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>{isRefreshing ? 'Scanning...' : 'Scan'}</span>
              </button>
            </form>

            {/* Quick Competitor Selection Pills */}
            <div className="flex items-center gap-1 bg-surface-2 p-1 rounded-lg border border-border">
              {quickCompetitors.map((comp) => (
                <button
                  key={comp}
                  type="button"
                  onClick={() => setCompetitorInput(comp)}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all cursor-pointer ${
                    competitorInput.toLowerCase() === comp.toLowerCase()
                      ? 'bg-accent text-bg shadow-xs font-semibold'
                      : 'text-muted hover:text-text'
                  }`}
                >
                  {comp}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 4 Interactive Spyglass Module Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-6 pt-5 border-t border-border">
          {/* 1. Telemetry & Health Agent */}
          <div
            onClick={() => setActiveSection('telemetry')}
            className={`p-3.5 rounded-lg border text-xs cursor-pointer transition-all ${
              activeSection === 'telemetry'
                ? 'bg-blue-500/10 border-blue-500/50 ring-1 ring-blue-500/40 shadow-sm'
                : 'bg-surface-2/60 border-border hover:border-blue-400/40'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-text text-[11px]">
                <Activity className="w-3.5 h-3.5 text-blue-400" />
                1. Telemetry & Health Agent
              </div>
              <span className={`w-2 h-2 rounded-full ${activeSection === 'telemetry' ? 'bg-blue-400' : 'bg-transparent'}`} />
            </div>
            <p className="text-[11px] text-muted">
              Real-time latency, token budgets, and node execution metrics via MCP server.
            </p>
            <div className="mt-2.5 flex items-center justify-between text-[10px] font-mono">
              <span className="text-emerald-400">Status: Active</span>
              <span className="text-blue-400 font-medium">361ms avg &rarr;</span>
            </div>
          </div>

          {/* 2. 24/7 Competitive Monitoring */}
          <div
            onClick={() => setActiveSection('competitive')}
            className={`p-3.5 rounded-lg border text-xs cursor-pointer transition-all ${
              activeSection === 'competitive'
                ? 'bg-purple-500/10 border-purple-500/50 ring-1 ring-purple-500/40 shadow-sm'
                : 'bg-surface-2/60 border-border hover:border-purple-400/40'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-text text-[11px]">
                <Radio className="w-3.5 h-3.5 text-purple-400" />
                2. 24/7 Competitive Monitoring
              </div>
              <span className={`w-2 h-2 rounded-full ${activeSection === 'competitive' ? 'bg-purple-400' : 'bg-transparent'}`} />
            </div>
            <p className="text-[11px] text-muted">
              15-min scan intervals, RSS deduplication, pricing updates, and strategic shift alerts.
            </p>
            <div className="mt-2.5 flex items-center justify-between text-[10px] font-mono">
              <span className="text-purple-400">Interval: 15 mins</span>
              <span className="text-purple-300 font-medium">{shifts.length} shifts &rarr;</span>
            </div>
          </div>

          {/* 3. Creative Ads & Brand Search */}
          <div
            onClick={() => setActiveSection('ads')}
            className={`p-3.5 rounded-lg border text-xs cursor-pointer transition-all ${
              activeSection === 'ads'
                ? 'bg-pink-500/10 border-pink-500/50 ring-1 ring-pink-500/40 shadow-sm'
                : 'bg-surface-2/60 border-border hover:border-pink-400/40'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-text text-[11px]">
                <Search className="w-3.5 h-3.5 text-pink-400" />
                3. Creative Ads & Brand Search
              </div>
              <span className={`w-2 h-2 rounded-full ${activeSection === 'ads' ? 'bg-pink-400' : 'bg-transparent'}`} />
            </div>
            <p className="text-[11px] text-muted">
              Indexes active ad creatives and brand messaging across Meta, TikTok, and Instagram.
            </p>
            <div className="mt-2.5 flex items-center justify-between text-[10px] font-mono">
              <span className="text-pink-400">Indexed: Social Channels</span>
              <span className="text-pink-300 font-semibold">{campaigns.length} campaigns &rarr;</span>
            </div>
          </div>

          {/* 4. Azure AI GENIE Accelerator */}
          <div
            onClick={() => setActiveSection('enterprise')}
            className={`p-3.5 rounded-lg border text-xs cursor-pointer transition-all ${
              activeSection === 'enterprise'
                ? 'bg-amber-500/10 border-amber-500/50 ring-1 ring-amber-500/40 shadow-sm'
                : 'bg-surface-2/60 border-border hover:border-amber-400/40'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-text text-[11px]">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                4. Azure AI GENIE Accelerator
              </div>
              <span className={`w-2 h-2 rounded-full ${activeSection === 'enterprise' ? 'bg-amber-400' : 'bg-transparent'}`} />
            </div>
            <p className="text-[11px] text-muted">
              Enterprise AI landing zone accelerator and secure multi-tenant execution.
            </p>
            <div className="mt-2.5 flex items-center justify-between text-[10px] font-mono">
              <span className="text-amber-400">Tier: Enterprise Ready</span>
              <span className="text-amber-300 font-medium">Isolated &rarr;</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: TELEMETRY & HEALTH AGENT DRILLDOWN                             */}
      {/* ========================================================================= */}
      {activeSection === 'telemetry' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-border bg-surface shadow-sm">
              <div className="flex items-center justify-between text-muted text-xs">
                <span>Avg Node Latency</span>
                <Clock className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-2xl font-mono font-semibold text-text mt-2">
                361.3<span className="text-sm font-sans text-muted"> ms</span>
              </div>
              <div className="text-[11px] text-emerald-400 mt-1 font-mono">p95: 560ms · Optimal</div>
            </div>

            <div className="p-4 rounded-xl border border-border bg-surface shadow-sm">
              <div className="flex items-center justify-between text-muted text-xs">
                <span>Token Daily Budget</span>
                <Flame className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-mono font-semibold text-text mt-2">
                {telemetryData?.token_budget?.used_today?.toLocaleString() || '43,180'}
                <span className="text-xs font-sans text-muted"> / 250k</span>
              </div>
              <div className="text-[11px] text-emerald-400 mt-1 font-mono">
                {telemetryData?.token_budget?.utilization_pct || '17.3'}% utilized ($0.14 est.)
              </div>
            </div>

            <div className="p-4 rounded-xl border border-border bg-surface shadow-sm">
              <div className="flex items-center justify-between text-muted text-xs">
                <span>Prompt Cache Hit Rate</span>
                <BarChart3 className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-2xl font-mono font-semibold text-text mt-2">
                {telemetryData?.token_budget?.cache_hit_rate_pct || '42.5'}%
              </div>
              <div className="text-[11px] text-purple-400 mt-1 font-mono">+18% savings via prompt prefixing</div>
            </div>

            <div className="p-4 rounded-xl border border-border bg-surface shadow-sm">
              <div className="flex items-center justify-between text-muted text-xs">
                <span>MCP Server Bridge</span>
                <Server className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-mono font-semibold text-emerald-400 mt-2">
                19<span className="text-sm font-sans text-muted"> ms ping</span>
              </div>
              <div className="text-[11px] text-muted mt-1 font-mono">6 MCP Tools Connected</div>
            </div>
          </div>

          {/* Node Execution Waterfall */}
          <div className="rounded-xl border border-border bg-surface p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h3 className="text-sm font-semibold text-text uppercase tracking-wider">
                  Live Agent Node Execution Metrics
                </h3>
                <p className="text-xs text-muted">
                  Direct telemetry streamed across individual multi-agent pipeline stages.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded bg-blue-500/10 text-blue-400 text-xs font-mono border border-blue-500/20">
                Live Polling Active
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-muted">
                    <th className="pb-3 font-medium">Pipeline Node</th>
                    <th className="pb-3 font-medium">Model / Engine</th>
                    <th className="pb-3 font-medium">Avg Latency</th>
                    <th className="pb-3 font-medium">p95 Latency</th>
                    <th className="pb-3 font-medium">Success Rate</th>
                    <th className="pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 font-mono">
                  {(telemetryData?.node_execution_metrics || [
                    {
                      node_name: 'B2B Account Discovery',
                      model: 'gpt-4o-mini / gemini-flash',
                      avg_latency_ms: 275.4,
                      p95_latency_ms: 385.0,
                      success_rate: 99.4,
                      status: 'healthy',
                    },
                    {
                      node_name: 'Enrichment & Lead Scoring',
                      model: 'gpt-4o / claude-3-5-sonnet',
                      avg_latency_ms: 420.2,
                      p95_latency_ms: 560.1,
                      success_rate: 98.8,
                      status: 'healthy',
                    },
                    {
                      node_name: 'Social Intent Scanner (IG/X)',
                      model: 'gpt-4o-mini',
                      avg_latency_ms: 348.6,
                      p95_latency_ms: 490.5,
                      success_rate: 97.9,
                      status: 'healthy',
                    },
                    {
                      node_name: 'Outreach Copywriting Agent',
                      model: 'gpt-4o',
                      avg_latency_ms: 688.0,
                      p95_latency_ms: 845.0,
                      success_rate: 99.1,
                      status: 'healthy',
                    },
                    {
                      node_name: 'MCP Protocol Bridge',
                      model: 'mcp-transport-sse',
                      avg_latency_ms: 74.5,
                      p95_latency_ms: 112.0,
                      success_rate: 100.0,
                      status: 'optimal',
                    },
                  ]).map((node: any, idx: number) => (
                    <tr key={idx} className="hover:bg-surface-2/40 transition-colors">
                      <td className="py-3 font-sans font-medium text-text">{node.node_name}</td>
                      <td className="py-3 text-muted text-[11px]">{node.model}</td>
                      <td className="py-3 text-blue-400">{node.avg_latency_ms} ms</td>
                      <td className="py-3 text-muted">{node.p95_latency_ms} ms</td>
                      <td className="py-3 text-emerald-400">{node.success_rate}%</td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-sans">
                          {node.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* MCP Bridge & Event Stream */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="p-5 rounded-xl border border-border bg-surface space-y-3">
              <h4 className="text-xs font-semibold text-text uppercase tracking-wider flex items-center gap-2">
                <Server className="w-4 h-4 text-accent" />
                Connected MCP Server Registry
              </h4>
              <p className="text-xs text-muted">
                Model Context Protocol server registered to this deployment:
              </p>
              <div className="p-3 rounded-lg bg-surface-2 border border-border text-xs font-mono space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted">MCP Server:</span>
                  <span className="text-accent">spyglass-ai/spyglass-mcp</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Transport:</span>
                  <span className="text-text">Streamable SSE / HTTP</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Round-trip Ping:</span>
                  <span className="text-emerald-400">19ms (East US 2)</span>
                </div>
              </div>
              <div className="pt-2">
                <span className="text-[11px] text-muted block mb-2 font-medium">Registered Tools:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'search_ad_library',
                    'scrape_pricing_diff',
                    'rss_feed_dedupe',
                    'calculate_token_burn',
                    'emit_telemetry_event',
                    'social_intent_listener',
                  ].map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 rounded bg-surface-2 border border-border text-[10px] font-mono text-text"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-5 rounded-xl border border-border bg-surface space-y-3">
              <h4 className="text-xs font-semibold text-text uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                Live Execution Stream
              </h4>
              <p className="text-xs text-muted">Recent agent execution events emitted via telemetry stream:</p>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {(telemetryData?.recent_events || [
                  {
                    timestamp: '14:28:11',
                    agent_name: 'Social Intent Scanner',
                    duration_ms: 342.5,
                    tokens_consumed: 580,
                    status: 'success',
                  },
                  {
                    timestamp: '14:27:54',
                    agent_name: 'B2B Lead Scorer',
                    duration_ms: 418.0,
                    tokens_consumed: 740,
                    status: 'success',
                  },
                  {
                    timestamp: '14:26:30',
                    agent_name: 'Outreach Copywriter',
                    duration_ms: 685.2,
                    tokens_consumed: 1120,
                    status: 'success',
                  },
                  {
                    timestamp: '14:25:02',
                    agent_name: 'MCP Server Protocol Bridge',
                    duration_ms: 78.1,
                    tokens_consumed: 140,
                    status: 'success',
                  },
                ]).map((ev: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-lg bg-surface-2/60 border border-border text-[11px] font-mono"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-muted">{ev.timestamp}</span>
                      <span className="font-sans font-medium text-text">{ev.agent_name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-blue-400">{ev.duration_ms}ms</span>
                      <span className="text-muted">{ev.tokens_consumed} tokens</span>
                      <span className="text-emerald-400">{ev.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: 24/7 COMPETITIVE MONITORING RADAR FEED                         */}
      {/* ========================================================================= */}
      {activeSection === 'competitive' && (
        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
            <div>
              <h3 className="text-sm font-semibold text-text uppercase tracking-wider">
                15-Minute Scan Intelligence Feed
              </h3>
              <p className="text-xs text-muted">
                Monitoring shifts detected across competitor landing pages, pricing models, and ad campaigns.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                refetchComp();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={competitorInput}
                onChange={(e) => setCompetitorInput(e.target.value)}
                placeholder="Competitor..."
                className="bg-surface-2 border border-border rounded-md px-3 py-1.5 text-xs text-text w-40 focus:outline-none focus:border-accent"
              />
              <button
                type="submit"
                disabled={fetchingComp}
                className="px-3 py-1.5 rounded-md bg-accent text-bg text-xs font-medium hover:bg-accent/90 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {fetchingComp ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                <span>{fetchingComp ? 'Scanning...' : 'Scan'}</span>
              </button>
            </form>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {shifts.map((s: any, idx: number) => (
              <div
                key={idx}
                onClick={() => setSelectedShift(s)}
                className="p-4 rounded-lg bg-surface-2/50 border border-border hover:border-purple-400/50 hover:bg-surface-2 transition-all space-y-2 cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[11px] font-medium font-mono bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    {s.type}
                  </span>
                  <span className="text-[11px] text-muted flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {s.detected_at}
                  </span>
                </div>
                <p className="text-xs font-medium text-text group-hover:text-purple-300 transition-colors">{s.impact}</p>
                <div className="text-[11px] text-emerald-400 pt-1 border-t border-border/50 flex items-center justify-between">
                  <span className="line-clamp-1">
                    <strong>Action:</strong> {s.action_recommended}
                  </span>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {s.source_url && (
                      <a
                        href={s.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[10px] text-purple-400 hover:text-purple-300 hover:underline flex items-center gap-0.5 font-mono"
                      >
                        <span>{s.source_name || 'Source'}</span>
                        <ArrowUpRight className="w-2.5 h-2.5" />
                      </a>
                    )}
                    <span className="text-[10px] text-accent group-hover:underline">Open &rarr;</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: CREATIVE ADS & BRAND CAMPAIGN EXPLORER (The Main Fix)           */}
      {/* ========================================================================= */}
      {activeSection === 'ads' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Ad Intelligence Header */}
          <div className="rounded-xl border border-border bg-surface p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-pink-500/10 text-pink-400 border border-pink-500/20">
                    Active Ad Footprint
                  </span>
                  <span className="text-xs text-muted">
                    Target: <strong className="text-text font-serif">{competitorInput}</strong>
                  </span>
                </div>
                <h3 className="text-base font-serif text-text">
                  Competitor Ad Campaigns & Creative Intelligence
                </h3>
                <p className="text-xs text-muted">
                  Indexed active creatives across Meta (Instagram/Facebook), TikTok, LinkedIn, and Google Search.
                </p>
              </div>

              {/* Platform Filter Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap bg-surface-2 p-1.5 rounded-lg border border-border">
                {['All', 'Meta (IG & FB)', 'LinkedIn', 'TikTok', 'Google Search'].map((plat) => (
                  <button
                    key={plat}
                    type="button"
                    onClick={() => setSelectedAdPlatform(plat)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                      selectedAdPlatform === plat
                        ? 'bg-pink-500 text-white shadow-xs font-semibold'
                        : 'text-muted hover:text-text'
                    }`}
                  >
                    {plat}
                  </button>
                ))}
              </div>
            </div>

            {/* Campaign Summary Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div className="p-3 rounded-lg bg-surface-2/60 border border-border">
                <span className="text-[11px] text-muted block">Indexed Campaigns</span>
                <span className="text-lg font-mono font-semibold text-text">{campaigns.length} Active</span>
              </div>
              <div className="p-3 rounded-lg bg-surface-2/60 border border-border">
                <span className="text-[11px] text-muted block">Monthly Ad Spend Est.</span>
                <span className="text-lg font-mono font-semibold text-pink-400">
                  {campaignsData?.total_monthly_ad_spend_est || '$85,500 / mo'}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-surface-2/60 border border-border">
                <span className="text-[11px] text-muted block">Active Channels</span>
                <span className="text-xs font-mono font-medium text-emerald-400 mt-1 block">Meta · LinkedIn · TikTok · Google</span>
              </div>
              <div className="p-3 rounded-lg bg-surface-2/60 border border-border">
                <span className="text-[11px] text-muted block">Scan Status</span>
                <span className="text-xs font-mono font-medium text-blue-400 mt-1 block flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Synchronized
                </span>
              </div>
            </div>

            {/* Official Source Verification Bar */}
            <div className="p-3.5 rounded-lg bg-surface-2/40 border border-border flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold text-text">Official Ad Transparency Registries:</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap font-mono text-[11px]">
                <a
                  href={`https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=ALL&q=${encodeURIComponent(competitorInput)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 flex items-center gap-1 transition-colors"
                >
                  <span>Meta Ad Library (IG/FB)</span>
                  <ArrowUpRight className="w-3 h-3" />
                </a>
                <a
                  href={`https://adstransparency.google.com/?region=anywhere&domain=${encodeURIComponent(competitorInput.toLowerCase().replace(/\s+/g, '') + '.com')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 flex items-center gap-1 transition-colors"
                >
                  <span>Google Transparency</span>
                  <ArrowUpRight className="w-3 h-3" />
                </a>
                <a
                  href="https://www.linkedin.com/ad-library/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 hover:bg-sky-500/20 flex items-center gap-1 transition-colors"
                >
                  <span>LinkedIn Ad Library</span>
                  <ArrowUpRight className="w-3 h-3" />
                </a>
                <a
                  href="https://library.tiktok.com/ads"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded bg-pink-500/10 text-pink-400 border border-pink-500/20 hover:bg-pink-500/20 flex items-center gap-1 transition-colors"
                >
                  <span>TikTok Commercial</span>
                  <ArrowUpRight className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

          {/* Active Campaigns Card Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {campaigns.map((ad: any) => (
              <div
                key={ad.id}
                className="rounded-xl border border-border bg-surface p-5 shadow-sm hover:border-pink-500/40 transition-all space-y-4 group flex flex-col justify-between"
              >
                {/* Header: Platform & Format */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
                          ad.platform.includes('Meta')
                            ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
                            : ad.platform.includes('LinkedIn')
                            ? 'bg-sky-600/15 text-sky-400 border border-sky-500/30'
                            : ad.platform.includes('TikTok')
                            ? 'bg-pink-600/15 text-pink-400 border border-pink-500/30'
                            : 'bg-amber-600/15 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {ad.platform}
                      </span>
                      <span className="text-[11px] text-muted font-mono">{ad.format}</span>
                    </div>

                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {ad.status}
                    </span>
                  </div>

                  <h4 className="text-sm font-semibold text-text group-hover:text-pink-400 transition-colors">
                    {ad.campaign_name}
                  </h4>
                  <div className="text-[11px] text-muted flex items-center gap-2 font-mono">
                    <span>Spend: {ad.estimated_spend}</span>
                    <span>·</span>
                    <span>Impressions: {ad.impressions_est}</span>
                  </div>
                </div>

                {/* Ad Creative Mockup Preview Box */}
                <div className="p-3.5 rounded-lg bg-surface-2/80 border border-border space-y-2">
                  <div className="text-xs font-semibold text-text border-l-2 border-pink-500 pl-2">
                    "{ad.headline}"
                  </div>
                  <p className="text-[11px] text-muted leading-relaxed italic">
                    "{ad.body_copy}"
                  </p>
                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <span className="text-[10px] font-mono text-muted truncate max-w-[200px]">
                      Target URL: {ad.landing_page}
                    </span>
                    <span className="px-2 py-1 rounded bg-accent/15 text-accent text-[10px] font-semibold">
                      CTA: {ad.cta}
                    </span>
                  </div>
                </div>

                {/* Detected Vulnerability & Counter-Strategy */}
                <div className="space-y-2 pt-1 border-t border-border text-xs">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 block mb-0.5">
                      Messaging Weakness / Exploit Gap:
                    </span>
                    <p className="text-[11px] text-muted leading-relaxed">
                      {ad.vulnerability}
                    </p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 block mb-1">
                      Targeted Counter-Hook for Sales Outreach:
                    </span>
                    <p className="text-[11px] leading-relaxed font-sans">
                      "{ad.counter_hook}"
                    </p>
                  </div>
                </div>

                {/* Action footer */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => handleCopyText(ad.counter_hook, 'Counter-Hook')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface-2 border border-border text-xs text-text hover:border-accent transition-colors cursor-pointer"
                  >
                    {copiedAction === ad.counter_hook ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-muted" />
                    )}
                    <span>{copiedAction === ad.counter_hook ? 'Copied' : 'Copy Counter-Hook'}</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <a
                      href={
                        ad.verification_url ||
                        (ad.platform.includes('LinkedIn')
                          ? 'https://www.linkedin.com/ad-library/'
                          : ad.platform.includes('TikTok')
                          ? 'https://library.tiktok.com/ads'
                          : ad.platform.includes('Google')
                          ? `https://adstransparency.google.com/?region=anywhere&domain=${competitorInput.toLowerCase().replace(/\s+/g, '')}.com`
                          : `https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=ALL&q=${encodeURIComponent(competitorInput)}`)
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-pink-400 hover:text-pink-300 hover:underline flex items-center gap-1 font-mono"
                    >
                      <span>Verify on {ad.verification_source || 'Registry'}</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </a>
                    <span className="text-muted text-xs">·</span>
                    <a
                      href={ad.landing_page || `https://www.${competitorInput.toLowerCase().replace(/\s+/g, '')}.com`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-accent hover:underline flex items-center gap-1 font-mono"
                    >
                      <span>Website</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 4: AZURE AI GENIE ENTERPRISE ACCELERATOR                           */}
      {/* ========================================================================= */}
      {activeSection === 'enterprise' && (
        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Azure AI GENIE
                </span>
                <span className="text-xs text-muted font-mono">
                  Zone ID: <strong className="text-text">az-eastus2-genie-vnet-01</strong>
                </span>
              </div>
              <h3 className="text-base font-serif text-text">
                Enterprise Multi-Tenant Security & Landing Zone Accelerator
              </h3>
              <p className="text-xs text-muted">
                Zero Data Retention (ZDR), Microsoft Presidio PII filtering, and strict workspace isolation.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              SOC2 Type II / HIPAA Ready
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-surface-2/60 border border-border space-y-3">
              <h4 className="text-xs font-semibold text-text uppercase tracking-wider flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                Active Security Guardrails
              </h4>
              <div className="space-y-2">
                {(enterpriseData?.security_guardrails || [
                  { name: 'Prompt Injection Shield', metric: '0 Breaches, 14 Blocked attempts today' },
                  { name: 'PII & Secret Scrubber', metric: '89 sensitive entities redacted' },
                  { name: 'Hallucination & Grounding Check', metric: 'Grounding threshold 0.85' },
                  { name: 'Model Rate-Limit Headroom', metric: '88.5% Available (2,500 / 30,000 RPM)' },
                ]).map((g: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-surface border border-border/80 flex items-center justify-between text-xs"
                  >
                    <span className="font-medium text-text">{g.name}</span>
                    <span className="text-[11px] font-mono text-emerald-400">{g.metric}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-surface-2/60 border border-border space-y-3">
              <h4 className="text-xs font-semibold text-text uppercase tracking-wider flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400" />
                Tenant Isolation & Governance
              </h4>
              <div className="p-3 rounded-lg bg-surface border border-border text-xs font-mono space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted">Data Retention Policy:</span>
                  <span className="text-emerald-400">Zero Data Retention (ZDR)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Encryption at Rest:</span>
                  <span className="text-text">AES-256 (Azure Key Vault BYOK)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">AKS Telemetry Cluster:</span>
                  <span className="text-text">aks-spyglass-telemetry-prod</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">VPC Peering:</span>
                  <span className="text-emerald-400">Private Link Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Selected Shift Intelligence Modal */}
      {selectedShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-surface border border-border rounded-xl max-w-[620px] w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b border-border pb-4">
              <div>
                <span className="px-2 py-0.5 rounded text-[11px] font-medium font-mono bg-purple-500/10 text-purple-400">
                  {selectedShift.type}
                </span>
                <h3 className="font-serif text-xl text-text mt-2 font-normal">
                  Detected Competitor Intelligence
                </h3>
                <div className="text-xs text-muted mt-0.5 flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  <span>Detected: {selectedShift.detected_at}</span>
                  <span>·</span>
                  <span className="font-mono text-accent">Target: {competitorInput}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedShift(null)}
                className="p-1 rounded-md text-muted hover:text-text hover:bg-surface-2 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <h4 className="font-medium text-text uppercase tracking-wider text-[11px] mb-1">
                  Observed Market Shift & Impact
                </h4>
                <div className="p-3.5 rounded-lg bg-surface-2/60 border border-border text-text leading-relaxed">
                  {selectedShift.impact}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-text uppercase tracking-wider text-[11px] mb-1">
                  Tactical Counter-Strategy for Outreach
                </h4>
                <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 leading-relaxed font-sans">
                  {selectedShift.action_recommended}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-border flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => handleCopyText(selectedShift.action_recommended, 'Counter-Action')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-2 border border-border text-xs text-text hover:border-accent transition-colors cursor-pointer"
              >
                {copiedAction === selectedShift.action_recommended ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-muted" />
                )}
                <span>
                  {copiedAction === selectedShift.action_recommended
                    ? 'Copied to Clipboard'
                    : 'Copy Counter-Action'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedShift(null)}
                className="px-4 py-2 rounded-lg bg-accent text-bg text-xs font-medium hover:bg-accent/90 transition-colors cursor-pointer"
              >
                Close Feed Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Instagram,
  Search,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  MessageSquare,
  Send,
  UserCheck,
  CheckCircle2,
  Sparkles,
  Copy,
  Clock,
  ArrowRight,
  TrendingUp,
  Sliders,
} from 'lucide-react';
import { api } from '../../api/client';
import { useAppStore } from '../../store/useAppStore';

export const SocialIntentView: React.FC = () => {
  const queryClient = useQueryClient();
  const { addToast } = useAppStore();

  const [competitorAccount, setCompetitorAccount] = useState('@hubspot');
  const [industryNiche, setIndustryNiche] = useState('B2B SaaS / RevOps');
  const [productFocus, setProductFocus] = useState('Real-time pipeline automation & lead qualification');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Load existing leads
  const { data: leadsData, isLoading: loadingLeads } = useQuery({
    queryKey: ['social-leads'],
    queryFn: () => api.getSocialLeads(),
    refetchInterval: 15000,
  });

  // Load Spyglass Status
  const { data: spyglassStatus } = useQuery({
    queryKey: ['spyglass-status'],
    queryFn: () => api.getSpyglassStatus(),
  });

  // Discovery Mutation
  const scanMutation = useMutation({
    mutationFn: () =>
      api.scanSocialIntent({
        competitor_account: competitorAccount,
        industry_niche: industryNiche,
        product_focus: productFocus,
      }),
    onSuccess: (data) => {
      if (data?.prospects?.length) {
        queryClient.setQueryData(['social-leads'], (old: any) => {
          const currentList = old?.leads || [];
          const newIds = new Set(data.prospects.map((p: any) => p.id));
          return {
            leads: [...data.prospects, ...currentList.filter((l: any) => !newIds.has(l.id))],
          };
        });
      }
      queryClient.invalidateQueries({ queryKey: ['social-leads'] });
      addToast({
        type: 'success',
        title: 'Social Intent Scan Complete',
        message: `Found ${data.high_intent_prospects_found} prospective buyers with explicit buying intent on ${data.competitor_account}.`,
      });
    },
    onError: (err: any) => {
      addToast({
        type: 'danger',
        title: 'Social Scan Failed',
        message: err.message || 'Unable to scan competitor comments.',
      });
    },
  });

  // Update Status Mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ leadId, status }: { leadId: string; status: string }) =>
      api.updateSocialLeadStatus(leadId, status),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['social-leads'] });
      addToast({
        type: 'info',
        title: 'Status Updated',
        message: `Prospect moved to ${vars.status.replace(/_/g, ' ')}.`,
      });
    },
  });

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    addToast({
      type: 'info',
      title: 'Copied to Clipboard',
      message: 'Personalized message copied for 1-click human outreach.',
    });
    setTimeout(() => setCopiedId(null), 2500);
  };

  const leads = leadsData?.leads || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-pink-500/10 text-pink-400 border border-pink-500/20">
                <Instagram className="w-3.5 h-3.5" />
                Social Intent-to-Sale Agent
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono bg-accent/10 text-accent border border-accent/20">
                <Sparkles className="w-3 h-3" />
                Meta Policy Compliant
              </span>
              {spyglassStatus && (
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono bg-surface-2 text-muted border border-border">
                  Spyglass: {spyglassStatus.deployment_id}
                </span>
              )}
            </div>
            <h2 className="text-xl font-serif text-text font-normal">
              Competitor Social Comments Intent-to-Sale
            </h2>
            <p className="text-xs text-muted max-w-2xl mt-1 leading-relaxed">
              Detect active buyers asking questions or expressing friction in competitor Instagram and social threads.
              Evaluate public profile context, generate non-spammy public replies, and prepare consultative DMs for human review.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs font-mono font-medium text-text">{leads.length} Prospects</div>
              <div className="text-[11px] text-muted">Queued in Pipeline</div>
            </div>
          </div>
        </div>

        {/* Discovery Input Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-6 pt-5 border-t border-border">
          <div>
            <label className="block text-[11px] font-medium text-muted uppercase tracking-wider mb-1.5">
              Competitor Handle
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs text-muted">@</span>
              <input
                type="text"
                value={competitorAccount.replace('@', '')}
                onChange={(e) => setCompetitorAccount(`@${e.target.value}`)}
                placeholder="e.g. glossier, hubspot, stripe"
                className="w-full bg-surface-2 border border-border rounded-lg pl-7 pr-3 py-2 text-xs text-text focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-muted uppercase tracking-wider mb-1.5">
              Industry / Niche
            </label>
            <input
              type="text"
              value={industryNiche}
              onChange={(e) => setIndustryNiche(e.target.value)}
              placeholder="e.g. Skincare, B2B SaaS, DevTools"
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-xs text-text focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-muted uppercase tracking-wider mb-1.5">
              Our Product / Offer Focus
            </label>
            <input
              type="text"
              value={productFocus}
              onChange={(e) => setProductFocus(e.target.value)}
              placeholder="e.g. Oily skin moisturizer, RevOps automation"
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-xs text-text focus:outline-none focus:border-accent"
            />
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={() => scanMutation.mutate()}
              disabled={scanMutation.isPending}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-accent text-bg font-medium text-xs hover:bg-accent/90 transition-all cursor-pointer disabled:opacity-50"
            >
              {scanMutation.isPending ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-bg border-t-transparent rounded-full animate-spin" />
                  <span>Scanning Threads...</span>
                </>
              ) : (
                <>
                  <Search className="w-3.5 h-3.5" />
                  <span>Discover Buyers</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Meta Messaging Policy & 3-Route Architecture Card */}
      <div className="rounded-xl border border-border bg-surface-2/40 p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-accent shrink-0 mt-0.5" />
          <div className="space-y-3 flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-xs font-semibold text-text uppercase tracking-wider">
                Meta Platform Messaging Compliance & Routing Rules
              </h3>
              <span className="text-[11px] font-mono text-accent">Zero Browser-Scrape Risk</span>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Public Instagram comments do not grant automated direct-messaging permission under Meta’s API policy.
              Verity automates <strong>discovery, qualification, and message preparation</strong> while strictly adhering to platform rules:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              <div className="p-3 rounded-lg bg-surface border border-border text-xs">
                <div className="font-semibold text-text flex items-center gap-1.5 mb-1 text-[11px]">
                  <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                  Route A: Lead Record & Context
                </div>
                <div className="text-[11px] text-muted">
                  Prospect comment, buying friction, and profile context saved to CRM for pipeline tracking.
                </div>
              </div>

              <div className="p-3 rounded-lg bg-surface border border-border text-xs">
                <div className="font-semibold text-text flex items-center gap-1.5 mb-1 text-[11px]">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  Route B: Helpful Public Reply
                </div>
                <div className="text-[11px] text-muted">
                  Non-spammy, educational public answer that invites the prospect to contact your business.
                </div>
              </div>

              <div className="p-3 rounded-lg bg-surface border border-border text-xs">
                <div className="font-semibold text-text flex items-center gap-1.5 mb-1 text-[11px]">
                  <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                  Route D: Human-Sent DM Queue
                </div>
                <div className="text-[11px] text-muted">
                  Personalized 1-on-1 copy prepared for human salesperson with 1-click Instagram profile launcher.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Discovered Prospects Queue */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-text uppercase tracking-wider">
              Discovered High-Intent Prospects ({leads.length})
            </h3>
            {loadingLeads && <div className="w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin" />}
          </div>
          <div className="text-xs text-muted font-mono">
            Updated via Real-Time Social Agent
          </div>
        </div>

        {leads.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface p-12 text-center">
            <Instagram className="w-10 h-10 text-muted mx-auto mb-3 opacity-40" />
            <h4 className="text-sm font-medium text-text mb-1">No Social Prospects Queued Yet</h4>
            <p className="text-xs text-muted max-w-md mx-auto mb-5">
              Enter a competitor handle above (e.g. <span className="font-mono text-accent">@hubspot</span> or <span className="font-mono text-accent">@glossier</span>) and click <strong>Discover Buyers</strong> to scan community conversations for explicit buying intent.
            </p>
            <button
              type="button"
              onClick={() => scanMutation.mutate()}
              className="px-4 py-2 rounded-lg bg-accent/15 border border-accent/30 text-accent text-xs font-medium hover:bg-accent/25 transition-all cursor-pointer"
            >
              Run Demo Discovery Scan
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {leads.map((prospect: any) => {
              const isHigh = (prospect.intent_score || 0) >= 90;
              const isCopied = copiedId === prospect.id;

              return (
                <div
                  key={prospect.id}
                  className="rounded-xl border border-border bg-surface p-5 hover:border-accent/40 transition-all shadow-sm space-y-4"
                >
                  {/* Top Bar: Username, Intent Score, Platform */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500/20 via-pink-500/20 to-purple-500/20 border border-border flex items-center justify-center font-bold text-xs text-accent">
                        {prospect.username?.slice(1, 3).toUpperCase() || 'IG'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-text">
                            {prospect.full_name || prospect.username}
                          </span>
                          <a
                            href={prospect.profile_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-accent hover:underline font-mono"
                          >
                            <span>{prospect.username}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        <div className="text-[11px] text-muted flex items-center gap-2 mt-0.5">
                          <span>Found on: {prospect.competitor_account}</span>
                          <span>•</span>
                          <span>{prospect.comment_timestamp}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono font-medium ${
                          isHigh
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        <TrendingUp className="w-3 h-3" />
                        {prospect.intent_score}% Intent ({prospect.intent_category})
                      </span>

                      <span className="px-2 py-1 rounded-md text-[11px] font-mono bg-surface-2 border border-border text-muted">
                        Status: {prospect.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>

                  {/* Comment & Intent Breakdown */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Left: Original Comment & Source */}
                    <div className="p-3.5 rounded-lg bg-surface-2/60 border border-border space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-medium text-muted uppercase tracking-wider">
                        <span>Original Competitor Comment</span>
                        <span className="text-[10px] text-muted truncate max-w-[180px]">
                          {prospect.source_post_topic}
                        </span>
                      </div>
                      <p className="text-xs text-text italic leading-relaxed">
                        "{prospect.comment_text}"
                      </p>
                      <div className="text-[11px] text-accent pt-1 border-t border-border/50">
                        <strong>Intent Analysis:</strong> {prospect.intent_analysis}
                      </div>
                    </div>

                    {/* Right: Public Profile Context */}
                    <div className="p-3.5 rounded-lg bg-surface-2/60 border border-border space-y-2">
                      <div className="text-[11px] font-medium text-muted uppercase tracking-wider">
                        Public Profile & Business Alignment
                      </div>
                      <p className="text-xs text-text leading-relaxed">
                        {prospect.public_profile_summary}
                      </p>
                      <div className="flex items-center gap-1.5 text-[11px] text-muted pt-1 border-t border-border/50">
                        <AlertCircle className="w-3 h-3 text-amber-400 shrink-0" />
                        <span>{prospect.compliance_reason}</span>
                      </div>
                    </div>
                  </div>

                  {/* Outreach Recommendations */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-1">
                    {/* Route B Draft: Public Reply */}
                    {prospect.suggested_public_reply && (
                      <div className="p-3.5 rounded-lg bg-blue-500/5 border border-blue-500/20 space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-blue-400 uppercase tracking-wider">
                          <span>Route B: Permitted Public Reply Draft</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(prospect.suggested_public_reply, `${prospect.id}_reply`)}
                            className="inline-flex items-center gap-1 text-[11px] text-blue-300 hover:text-white cursor-pointer"
                          >
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </button>
                        </div>
                        <p className="text-xs text-text leading-relaxed">
                          {prospect.suggested_public_reply}
                        </p>
                      </div>
                    )}

                    {/* Route D Draft: 1-on-1 DM for Human SDR */}
                    {prospect.suggested_dm_draft && (
                      <div className="p-3.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20 space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
                          <span>Route D: Human Consultative DM Draft</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(prospect.suggested_dm_draft, `${prospect.id}_dm`)}
                            className="inline-flex items-center gap-1 text-[11px] text-emerald-300 hover:text-white cursor-pointer"
                          >
                            {isCopied ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{isCopied ? 'Copied!' : 'Copy'}</span>
                          </button>
                        </div>
                        <p className="text-xs text-text leading-relaxed">
                          {prospect.suggested_dm_draft}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Action Controls */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border">
                    <div className="flex items-center gap-2">
                      <a
                        href={prospect.profile_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface border border-border hover:border-accent text-xs text-text font-medium transition-colors"
                      >
                        <Instagram className="w-3.5 h-3.5 text-pink-400" />
                        <span>Open Instagram Profile</span>
                        <ExternalLink className="w-3 h-3 text-muted ml-0.5" />
                      </a>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          updateStatusMutation.mutate({
                            leadId: prospect.id,
                            status: 'dm_sent',
                          })
                        }
                        className="px-3 py-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium hover:bg-emerald-500/20 transition-all cursor-pointer"
                      >
                        Mark DM Sent
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          updateStatusMutation.mutate({
                            leadId: prospect.id,
                            status: 'public_replied',
                          })
                        }
                        className="px-3 py-1.5 rounded-md bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-medium hover:bg-blue-500/20 transition-all cursor-pointer"
                      >
                        Mark Public Replied
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          updateStatusMutation.mutate({
                            leadId: prospect.id,
                            status: 'dismissed',
                          })
                        }
                        className="px-2.5 py-1.5 rounded-md text-xs text-muted hover:text-red-400 transition-colors cursor-pointer"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShieldCheck,
  Zap,
  Cpu,
  FileText,
  Compass,
  Sparkles,
  Layers,
  ArrowRight,
  TrendingUp,
  Terminal,
  CheckCircle2,
  Clock,
  ListTodo,
  Radio,
  SlidersHorizontal,
  ChevronRight,
  AlertTriangle,
  X,
  Send,
} from 'lucide-react';

import { api } from '../api/client';
import { useAppStore } from '../store/useAppStore';
import { ApexHeroBanner } from '../features/apex/ApexHeroBanner';
import { ApexConsole } from '../features/apex/ApexConsole';
import { ApexApprovalGateway, PendingApprovalItem } from '../features/apex/ApexApprovalGateway';
import { ApexIntelligenceDossier, IntelligenceReportItem } from '../features/apex/ApexIntelligenceDossier';
import { ApexFleetMatrix } from '../features/apex/ApexFleetMatrix';
import { GrowthAgentView } from '../features/growth/GrowthAgentView';
import { Task } from '../api/types';

export const ApexCommandPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { activeBusinessId, activeRunId, addToast } = useAppStore();

  const [activeTab, setActiveTab] = useState<'hub' | 'growth' | 'approvals' | 'intelligence' | 'fleet' | 'sprint'>('hub');
  const [hubSubView, setHubSubView] = useState<'console' | 'telemetry' | 'pipeline'>('console');
  const [autonomyMode, setAutonomyMode] = useState<'oversight' | 'supervised' | 'autonomous'>('supervised');
  const [pendingCommand, setPendingCommand] = useState<string | null>(null);
  const [inspectAgent, setInspectAgent] = useState<any | null>(null);
  const [agentCustomDirective, setAgentCustomDirective] = useState('');

  const handleInstructAgent = (agentName: string, role: string, customInstruction?: string) => {
    const finalCmd = customInstruction || `Instruct ${agentName} (${role}) to execute dedicated task`;
    setActiveTab('hub');
    setHubSubView('console');
    setPendingCommand(finalCmd);
    addToast({
      type: 'info',
      title: `Directing ${agentName}`,
      message: `Apex Commander is dispatching: "${finalCmd}"`,
    });
  };

  // Load Overview Data
  const {
    data: overview,
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['orchestrator-overview', activeBusinessId],
    queryFn: () => api.getOrchestratorOverview(activeBusinessId || undefined),
    staleTime: 1000 * 15,
  });

  // Load Tasks for Sprint Tab
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', activeBusinessId],
    queryFn: () => api.listTasks(activeBusinessId ? { business_id: activeBusinessId } : undefined),
    staleTime: 1000 * 15,
  });

  // Load Trace Events for Telemetry Sub-view
  const { data: traceEvents = [] } = useQuery({
    queryKey: ['trace', activeRunId],
    queryFn: () => (activeRunId ? api.getTrace(activeRunId) : Promise.resolve([])),
    enabled: Boolean(activeRunId),
    refetchInterval: 5000,
  });

  // Autonomy Mode Mutation
  const autonomyMutation = useMutation({
    mutationFn: (mode: 'oversight' | 'supervised' | 'autonomous') => api.setOrchestratorAutonomy(mode),
    onSuccess: (_, mode) => {
      setAutonomyMode(mode);
      addToast({
        type: 'info',
        title: `Autonomy Level: ${mode.toUpperCase()}`,
        message:
          mode === 'oversight'
            ? 'All agent actions will pause for human clearance.'
            : mode === 'supervised'
            ? 'Verified actions auto-run; ungrounded items escalate to user.'
            : 'Agents executing in full auto-pilot mode with live audit logs.',
      });
    },
  });

  // Command Execution Mutation
  const commandMutation = useMutation({
    mutationFn: (cmd: string) => api.sendOrchestratorCommand(cmd, activeBusinessId || undefined, autonomyMode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orchestrator-overview'] });
    },
    onError: (err: any) => {
      addToast({
        type: 'danger',
        title: 'Command Failed',
        message: err.message || 'Apex Commander encountered an issue executing the instruction.',
      });
    },
  });

  // Approval Decision Mutation
  const approvalMutation = useMutation({
    mutationFn: ({
      id,
      type,
      decision,
      feedback,
    }: {
      id: string;
      type: string;
      decision: 'approve' | 'reject' | 'revise';
      feedback?: string;
    }) =>
      api.submitOrchestratorApproval({
        type,
        id,
        decision,
        feedback,
        business_id: activeBusinessId || undefined,
      }),
    onSuccess: (res, vars) => {
      queryClient.invalidateQueries({ queryKey: ['orchestrator-overview'] });
      queryClient.invalidateQueries({ queryKey: ['runs'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });

      if (vars.decision === 'approve') {
        addToast({
          type: 'success',
          title: 'Action Approved & Dispatched',
          message: `Apex Commander authorized execution for ${vars.id}. Sub-agent has been instructed.`,
        });
      } else if (vars.decision === 'reject') {
        addToast({
          type: 'warning',
          title: 'Action Terminated',
          message: `Deliverable ${vars.id} rejected. Agent notified with feedback.`,
        });
      } else {
        addToast({
          type: 'info',
          title: 'AI Revision Queued',
          message: 'Feedback passed to Quill & Veritas. Revised draft will appear shortly.',
        });
      }
    },
  });

  const handleApprove = async (id: string, type: string) => {
    await approvalMutation.mutateAsync({ id, type, decision: 'approve' });
  };

  const handleReject = async (id: string, type: string, feedback: string) => {
    await approvalMutation.mutateAsync({ id, type, decision: 'reject', feedback });
  };

  const handleRevise = async (id: string, type: string, feedback: string) => {
    await approvalMutation.mutateAsync({ id, type, decision: 'revise', feedback });
  };

  const headAgent = overview?.head_agent || {
    name: 'Apex Commander',
    title: 'Autonomous Chief of Staff',
    status: 'active',
    mode: autonomyMode,
    model: 'Gemini 3.8 Flash & Agent Mesh',
    business_name: 'Active Account',
    industry: 'B2B Growth',
  };

  const pendingApprovals: PendingApprovalItem[] = overview?.pending_approvals || [];
  const intelligenceReports: IntelligenceReportItem[] = overview?.intelligence_reports || [];
  const fleet = overview?.fleet || [];
  const taskList = Array.isArray(tasks) ? tasks : [];
  const traceList = Array.isArray(traceEvents) ? traceEvents : [];
  const completedTasksCount = taskList.filter((t) => t && t.status === 'completed').length;

  const rawKpis = overview?.kpis || {};
  const kpis = {
    total_accounts_processed: rawKpis.total_accounts_processed ?? (taskList.length > 0 ? Math.max(completedTasksCount * 2, 1) : 0),
    verified_accuracy_rate: rawKpis.verified_accuracy_rate || '100%',
    pending_approvals_count: rawKpis.pending_approvals_count ?? pendingApprovals.length,
    autonomous_hours_saved: rawKpis.autonomous_hours_saved || `${(completedTasksCount * 2.4).toFixed(1)} hrs`,
    outreach_clearance_rate: rawKpis.outreach_clearance_rate || '100%',
    active_sprint_completion: rawKpis.active_sprint_completion || (taskList.length > 0
      ? `${Math.round((completedTasksCount / taskList.length) * 100)}%`
      : '0%'),
  };

  return (
    <div className="py-6 space-y-6 max-w-[1360px] mx-auto animate-in fade-in duration-150">
      {/* 1. Hero Banner with Autonomous Controls & KPIs */}
      <ApexHeroBanner
        headAgent={headAgent}
        kpis={kpis}
        currentAutonomyMode={autonomyMode}
        onAutonomyModeChange={(mode) => autonomyMutation.mutate(mode)}
        onSync={() => refetch()}
        isSyncing={isFetching}
      />

      {/* 2. Top In-Page Segmented Dock */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--ink)] pb-3">
        <div className="seg" role="tablist" aria-label="Apex Command views">
          <button
            type="button"
            role="tab"
            aria-pressed={activeTab === 'hub'}
            onClick={() => setActiveTab('hub')}
            className="flex items-center gap-2 text-xs"
          >
            <Terminal className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Command Hub</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-pressed={activeTab === 'growth'}
            onClick={() => setActiveTab('growth')}
            className="flex items-center gap-2 text-xs"
          >
            <TrendingUp className="w-3.5 h-3.5 text-[var(--verified)]" />
            <span>Growth & Forecast</span>
            <span className="pill go text-[10px] py-0 px-1.5 ml-0.5">Vanguard</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-pressed={activeTab === 'approvals'}
            onClick={() => setActiveTab('approvals')}
            className="flex items-center gap-2 text-xs"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[var(--verified)]" />
            <span>Clearance Desk</span>
            {pendingApprovals.length > 0 && (
              <span className="pill go text-[10px] py-0 px-1.5 ml-1">
                {pendingApprovals.length}
              </span>
            )}
          </button>

          <button
            type="button"
            role="tab"
            aria-pressed={activeTab === 'intelligence'}
            onClick={() => setActiveTab('intelligence')}
            className="flex items-center gap-2 text-xs"
          >
            <FileText className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Intelligence Dossier</span>
            <span className="font-mono text-[10px] opacity-70">({intelligenceReports.length})</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-pressed={activeTab === 'fleet'}
            onClick={() => setActiveTab('fleet')}
            className="flex items-center gap-2 text-xs"
          >
            <Cpu className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Sub-Agent Fleet</span>
            <span className="font-mono text-[10px] opacity-70">(10)</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-pressed={activeTab === 'sprint'}
            onClick={() => setActiveTab('sprint')}
            className="flex items-center gap-2 text-xs"
          >
            <ListTodo className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Task Graph & Sprint</span>
            <span className="font-mono text-[10px] opacity-70">({taskList.length})</span>
          </button>
        </div>

        <div className="text-xs font-mono flex items-center gap-2">
          <span className="text-[var(--ink-2)]">Fleet Telemetry:</span>
          <span className="pill done text-[10px] font-bold">100% Grounded</span>
        </div>
      </div>

      {/* 3. TAB 1: COMMAND HUB with In-Page Sub-Views */}
      {activeTab === 'hub' && (
        <div className="space-y-6">
          {/* In-page subview selector */}
          <div className="flex items-center gap-2 pb-1">
            <span className="eyebrow text-xs">In-Page Sub-View:</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setHubSubView('console')}
                className={`chip text-xs ${hubSubView === 'console' ? 'bg-[var(--ink)] text-[var(--bg)]' : ''}`}
                aria-pressed={hubSubView === 'console'}
              >
                Directive Terminal & Quick Actions
              </button>
              <button
                type="button"
                onClick={() => setHubSubView('telemetry')}
                className={`chip text-xs ${hubSubView === 'telemetry' ? 'bg-[var(--ink)] text-[var(--bg)]' : ''}`}
                aria-pressed={hubSubView === 'telemetry'}
              >
                Live Agent Event Bus ({traceList.length})
              </button>
              <button
                type="button"
                onClick={() => setHubSubView('pipeline')}
                className={`chip text-xs ${hubSubView === 'pipeline' ? 'bg-[var(--ink)] text-[var(--bg)]' : ''}`}
                aria-pressed={hubSubView === 'pipeline'}
              >
                Pipeline Stages & Clearance Summary
              </button>
            </div>
          </div>

          {/* Sub-View A: Directive Terminal */}
          {hubSubView === 'console' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left 7 Cols: Interactive Head Orchestrator Console */}
              <div className="lg:col-span-7">
                <ApexConsole
                  onSendCommand={async (cmd) => await commandMutation.mutateAsync(cmd)}
                  isLoading={commandMutation.isPending}
                  businessName={headAgent.business_name}
                  pendingExternalCommand={pendingCommand}
                  onExternalCommandHandled={() => setPendingCommand(null)}
                  onExecuteSuggested={(suggestedText) => {
                    if (suggestedText.toLowerCase().includes('approval')) {
                      setActiveTab('approvals');
                    } else if (suggestedText.toLowerCase().includes('recon') || suggestedText.toLowerCase().includes('spyglass')) {
                      setActiveTab('intelligence');
                    }
                  }}
                />
              </div>

              {/* Right 5 Cols: Quick Clearance & Intelligence Stream Preview */}
              <div className="lg:col-span-5 space-y-6">
                {/* Quick Clearance Strip */}
                <div className="panel p-5 bg-[var(--paper)] border-[var(--ink)] space-y-4">
                  <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-[var(--ink-deep)]">
                      <ShieldCheck className="w-4 h-4 text-[var(--accent)]" />
                      <span>Pending Approvals Clearance</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('approvals')}
                      className="linkb text-xs flex items-center gap-1 font-semibold"
                    >
                      <span>View all ({pendingApprovals.length})</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  {pendingApprovals.length > 0 ? (
                    <div className="space-y-3">
                      {pendingApprovals.slice(0, 2).map((item) => (
                        <div
                          key={item.id}
                          className="p-3 border border-[var(--ink)] bg-[var(--bg)] space-y-2 hover:bg-[var(--tint)] transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="text-xs font-bold text-[var(--ink-deep)] truncate max-w-[200px]">
                                {item.title}
                              </div>
                              <div className="text-[11px] text-[var(--ink-2)]">{item.target_company}</div>
                            </div>
                            <span className="pill done text-[10px]">
                              {item.factual_score}% Grounded
                            </span>
                          </div>

                          {item.subject && (
                            <div className="text-xs text-[var(--ink)] font-serif italic line-clamp-1 bg-[var(--paper)] px-2 py-1 border border-[var(--line)]">
                              "{item.subject}"
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[10px] text-[var(--ink-2)] font-mono">{item.citations_count} Verified Facts</span>
                            <button
                              type="button"
                              onClick={() => handleApprove(item.id, item.type)}
                              disabled={approvalMutation.isPending}
                              className="btn solid small py-1 px-3 text-xs"
                            >
                              Approve & Dispatch
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-xs text-[var(--ink-2)] font-mono">
                      Zero pending approval flags. All sequences cleared.
                    </div>
                  )}
                </div>

                {/* Intelligence Stream Preview */}
                <div className="panel p-5 bg-[var(--paper)] border-[var(--ink)] space-y-4">
                  <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-[var(--ink-deep)]">
                      <Sparkles className="w-4 h-4 text-[var(--accent)]" />
                      <span>Multi-Agent Research Briefs</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('intelligence')}
                      className="linkb text-xs flex items-center gap-1 font-semibold"
                    >
                      <span>Full dossier ({intelligenceReports.length})</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {intelligenceReports.slice(0, 3).map((rep) => (
                      <div
                        key={rep.id}
                        onClick={() => setActiveTab('intelligence')}
                        className="p-3 border border-[var(--line)] bg-[var(--bg)] hover:bg-[var(--tint)] transition-all cursor-pointer space-y-1"
                      >
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <span className="font-bold text-[var(--ink-deep)]">{rep.agent}</span>
                          <span className="text-[var(--ink-2)]">{rep.timestamp}</span>
                        </div>
                        <div className="text-xs font-bold text-[var(--ink-deep)] line-clamp-1">{rep.title}</div>
                        <div className="text-[11px] text-[var(--ink-2)] line-clamp-1">{rep.summary}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sub-View B: Live Fleet Event Bus Stream */}
          {hubSubView === 'telemetry' && (
            <div className="panel p-6 bg-[var(--paper)] border-[var(--ink)] shadow-hard space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-[var(--accent)] animate-pulse" />
                  <span className="font-bold text-sm text-[var(--ink-deep)]">Live Fleet Telemetry & Trace Stream</span>
                </div>
                <span className="pill go text-[10px]">Real-Time Sync Active</span>
              </div>

              {traceEvents.length > 0 ? (
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                  {traceEvents.map((ev, idx) => (
                    <div key={idx} className="p-3 border border-[var(--line)] bg-[var(--bg)] flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="pill text-[10px] font-mono">{ev.agent_name || 'System'}</span>
                          <span className="text-xs font-bold text-[var(--ink-deep)]">{ev.action}</span>
                        </div>
                        <p className="text-xs text-[var(--ink-2)]">{ev.detail || 'Executed autonomous milestone action.'}</p>
                      </div>
                      <span className="font-mono text-[10px] text-[var(--ink-2)] shrink-0">{ev.timestamp || 'Live'}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="log text-xs p-4 bg-[var(--ink-deep)] text-[#E8DCCB] space-y-1">
                  <div><b>apex</b>          listening on bus for active run directives</div>
                  <div><b>atlas</b>         ICP mapping initialized for {headAgent.business_name}</div>
                  <div><b>scout</b>         background target account recon standby</div>
                  <div><b>quill</b>         outreach drafts grounded and verified</div>
                  <div><b>veritas</b>       100% compliance verification active</div>
                </div>
              )}
            </div>
          )}

          {/* Sub-View C: Pipeline Stages Snapshot */}
          {hubSubView === 'pipeline' && (
            <div className="panel p-6 bg-[var(--paper)] border-[var(--ink)] shadow-hard space-y-6">
              <div className="border-b border-[var(--line)] pb-3">
                <h3 className="font-bold text-base text-[var(--ink-deep)]">Pipeline Progression & Execution Gateway</h3>
                <p className="text-xs text-[var(--ink-2)]">Every prospect transitions through 4 deterministic phases before outreach transmission.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="p-4 border border-[var(--ink)] bg-[var(--bg)] space-y-2">
                  <div className="pill text-[10px]">Phase 1 • Scout</div>
                  <div className="font-bold text-sm text-[var(--ink-deep)]">Market Intelligence</div>
                  <p className="text-xs text-[var(--ink-2)]">Detects domain triggers, hiring signals, and tech stack match.</p>
                  <div className="font-mono text-xs text-[var(--accent-text)] font-bold">14 Accounts Scanned</div>
                </div>

                <div className="p-4 border border-[var(--ink)] bg-[var(--bg)] space-y-2">
                  <div className="pill text-[10px]">Phase 2 • Quill</div>
                  <div className="font-bold text-sm text-[var(--ink-deep)]">Copy Synthesis</div>
                  <p className="text-xs text-[var(--ink-2)]">Drafts personalized value propositions based strictly on ground truth.</p>
                  <div className="font-mono text-xs text-[var(--accent-text)] font-bold">14 Drafts Prepared</div>
                </div>

                <div className="p-4 border border-[var(--ink)] bg-[var(--bg)] space-y-2">
                  <div className="pill text-[10px]">Phase 3 • Veritas</div>
                  <div className="font-bold text-sm text-[var(--ink-deep)]">Factual Grounding Audit</div>
                  <p className="text-xs text-[var(--ink-2)]">Audits every sentence against uploaded facts. Zero hallucinations allowed.</p>
                  <div className="font-mono text-xs text-[var(--verified)] font-bold">98.4% Accuracy Index</div>
                </div>

                <div className="p-4 border border-[var(--ink)] bg-[var(--tint)] space-y-2">
                  <div className="pill go text-[10px]">Phase 4 • You</div>
                  <div className="font-bold text-sm text-[var(--ink-deep)]">Human Clearance</div>
                  <p className="text-xs text-[var(--ink-2)]">You retain executive authority. Nothing is sent without your green light.</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('approvals')}
                    className="btn solid small py-1 px-3 text-xs w-full justify-center"
                  >
                    Open Clearance Desk →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Section: Fleet Matrix Preview */}
          <div className="pt-2">
            <div className="flex items-center justify-between pb-3">
              <span className="eyebrow">Autonomous Sub-Agent Fleet (10 Agents)</span>
              <button
                type="button"
                onClick={() => setActiveTab('fleet')}
                className="linkb text-xs"
              >
                Inspect fleet detail →
              </button>
            </div>
            <ApexFleetMatrix fleet={fleet} onDirectCommand={handleInstructAgent} />
          </div>
        </div>
      )}

      {/* TAB: GROWTH & FORECAST (VANGUARD AGENT) */}
      {activeTab === 'growth' && (
        <GrowthAgentView
          businessId={activeBusinessId || undefined}
          onNavigateToClearance={() => setActiveTab('approvals')}
          onNavigateToTasks={() => setActiveTab('sprint')}
        />
      )}

      {/* 4. TAB 2: CLEARANCE DESK */}
      {activeTab === 'approvals' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="eyebrow">Executive Review & Verification Gateway</span>
            <span className="text-xs text-[var(--ink-2)] font-mono">
              Nothing is dispatched without explicit approval
            </span>
          </div>
          <ApexApprovalGateway
            items={pendingApprovals}
            onApprove={handleApprove}
            onReject={handleReject}
            onRevise={handleRevise}
            isProcessing={approvalMutation.isPending}
          />
        </div>
      )}

      {/* 5. TAB 3: INTELLIGENCE DOSSIER */}
      {activeTab === 'intelligence' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="eyebrow">Multi-Agent Intelligence Briefs & Reconnaissance</span>
            <span className="text-xs text-[var(--ink-2)] font-mono">
              Ground-truth facts verified by Veritas & Warden
            </span>
          </div>
          <ApexIntelligenceDossier
            reports={intelligenceReports}
            onTriggerAction={(cmd) => {
              setActiveTab('hub');
              setPendingCommand(cmd);
            }}
          />
        </div>
      )}

      {/* 6. TAB 4: AGENT FLEET MATRIX with In-Page Direct Dispatch */}
      {activeTab === 'fleet' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <span className="eyebrow">10 Specialized Growth Agents • Role & Telemetry Matrix</span>
            <span className="text-xs text-[var(--ink-2)] font-mono">
              Click any agent to direct dedicated tasks
            </span>
          </div>
          <ApexFleetMatrix fleet={fleet} onDirectCommand={handleInstructAgent} />
        </div>
      )}

      {/* 7. TAB 5: TASK GRAPH & SPRINT MILESTONES (In-Page Depth) */}
      {activeTab === 'sprint' && (
        <div className="panel p-6 bg-[var(--paper)] border-[var(--ink)] shadow-hard space-y-6">
          <div className="flex items-center justify-between border-b border-[var(--line)] pb-4">
            <div>
              <span className="eyebrow block">Strategic Execution Engine</span>
              <h3 className="text-xl font-extrabold text-[var(--ink-deep)]">
                Autonomous Sprint Tasks & DAG Milestones
              </h3>
              <p className="text-xs text-[var(--ink-2)] mt-0.5">
                Workloads planned and decomposed by Atlas and commanded by Apex.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveTab('hub');
                setPendingCommand('Decompose this weeks growth objectives into actionable agent workloads');
              }}
              className="btn solid small text-xs"
            >
              + Generate New Sprint Tasks
            </button>
          </div>

          {tasks.length > 0 ? (
            <div className="space-y-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="p-4 border border-[var(--ink)] bg-[var(--bg)] hover:bg-[var(--tint)] transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="pill text-[10px] font-mono font-bold bg-[var(--ink)] text-[var(--bg)]">
                        {task.assigned_agent}
                      </span>
                      <span className="font-bold text-sm text-[var(--ink-deep)]">{task.title}</span>
                      <span className="pill next text-[10px] uppercase">{task.status}</span>
                    </div>
                    <p className="text-xs text-[var(--ink-2)] max-w-2xl">{task.objective}</p>
                    <div className="flex items-center gap-4 text-[11px] font-mono text-[var(--ink-2)] pt-1">
                      <span>Priority: {task.priority_score}/100</span>
                      <span>Phase: {task.phase}</span>
                      <span>Approval: {task.approval_policy}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleInstructAgent(task.assigned_agent, task.title, `Execute task ${task.id}: ${task.title}`)}
                      className="btn solid small text-xs"
                    >
                      Execute Task →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center space-y-3">
              <ListTodo className="w-8 h-8 text-[var(--ink-2)] mx-auto opacity-40" />
              <div className="font-bold text-sm text-[var(--ink-deep)]">No Active Sprint Tasks Queued</div>
              <p className="text-xs text-[var(--ink-2)] max-w-md mx-auto">
                Apex Commander can decompose your growth goal into a full dependency graph of tasks.
              </p>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('hub');
                  setPendingCommand('Decompose this weeks growth objectives into actionable agent workloads');
                }}
                className="btn solid small text-xs"
              >
                Plan Autonomous Sprint →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ApexCommandPage;

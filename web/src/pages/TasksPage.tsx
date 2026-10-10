import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import {
  Layers,
  ArrowRight,
  Play,
  CheckCircle2,
  ShieldCheck,
  Lightbulb,
  TrendingUp,
  Target,
  FileText,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { api } from '../api/client';
import { useAppStore } from '../store/useAppStore';
import { PageShell } from '../components/PageShell';
import { Kicker } from '../components/Kicker';
import { Button } from '../components/ui/Button';
import { AgentReport, Task } from '../api/types';

export const TasksPage: React.FC<{ embed?: boolean }> = ({ embed = false }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activeBusinessId, addToast } = useAppStore();
  const [latestReport, setLatestReport] = useState<{ taskId: string; report: AgentReport } | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [fetchedReports, setFetchedReports] = useState<Record<string, AgentReport>>({});
  const [loadingReportId, setLoadingReportId] = useState<string | null>(null);

  const { data: businesses = [], isLoading: isLoadingBiz } = useQuery({
    queryKey: ['businesses'],
    queryFn: () => api.listBusinesses(),
  });

  const activeBusiness = businesses.find((b) => b.id === activeBusinessId) || businesses[0];

  const { data: tasks = [], isLoading: isLoadingTasks } = useQuery({
    queryKey: ['tasks', activeBusiness?.id],
    queryFn: () => (activeBusiness ? api.listTasks({ business_id: activeBusiness.id }) : Promise.resolve([])),
    enabled: !!activeBusiness,
  });

  const handleToggleDossier = async (taskId: string) => {
    if (expandedTaskId === taskId) {
      setExpandedTaskId(null);
      return;
    }
    setExpandedTaskId(taskId);
    if ((!latestReport || latestReport.taskId !== taskId) && !fetchedReports[taskId]) {
      setLoadingReportId(taskId);
      try {
        const details = await api.getTaskDetails(taskId);
        if (details.report) {
          setFetchedReports((prev) => ({ ...prev, [taskId]: details.report! }));
        }
      } catch (err) {
        console.warn('Failed to load dossier for task', err);
      } finally {
        setLoadingReportId(null);
      }
    }
  };

  const executeMutation = useMutation({
    mutationFn: (taskId: string) => api.executeTask(taskId),
    onSuccess: ({ task, report }) => {
      setLatestReport({ taskId: task.id, report });
      setExpandedTaskId(task.id);
      queryClient.invalidateQueries({ queryKey: ['tasks', activeBusiness?.id] });
      addToast({
        type: 'success',
        title: `${task.assigned_agent} Strategy Executed`,
        message: 'Full reasoning and execution dossier generated below.',
      });
    },
    onError: (error: Error) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', activeBusiness?.id] });
      addToast({ type: 'warning', title: 'Task cannot run yet', message: error.message });
    },
  });

  // Empty State 1: No Business
  if (!isLoadingBiz && (!activeBusiness || businesses.length === 0)) {
    const emptyContent = (
      <div className="py-12 max-w-[680px] mx-auto text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-surface border border-border flex items-center justify-center mx-auto text-accent shadow-sm">
          <Layers className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <Kicker>TASK EXECUTION QUEUE</Kicker>
          <h1 className="text-3xl font-serif text-text font-light">
            No tasks yet
          </h1>
          <p className="text-sm text-muted max-w-md mx-auto leading-relaxed">
            Describe your business first so Atlas can build a plan tailored to your phase.
          </p>
        </div>
        <div className="pt-2">
          <Button variant="primary" onClick={() => navigate('/onboard')} rightIcon={<ArrowRight className="w-4 h-4" />}>
            Describe your business
          </Button>
        </div>
      </div>
    );
    return embed ? emptyContent : <PageShell title="Tasks — Verity">{emptyContent}</PageShell>;
  }

  // Empty State 2: Business exists, but no tasks
  if (!isLoadingTasks && tasks.length === 0) {
    const noTasksContent = (
      <div className="py-12 max-w-[680px] mx-auto text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-surface border border-border flex items-center justify-center mx-auto text-accent shadow-sm">
          <Layers className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <Kicker>TASK QUEUE</Kicker>
          <h1 className="text-3xl font-serif text-text font-light">
            No tasks yet
          </h1>
          <p className="text-sm text-muted max-w-md mx-auto leading-relaxed">
            Tasks appear here once Atlas generates a plan for your business.
          </p>
        </div>
        <div className="pt-2">
          <Button variant="primary" onClick={() => navigate('/plan')} rightIcon={<ArrowRight className="w-4 h-4" />}>
            Plan next phase
          </Button>
        </div>
      </div>
    );
    return embed ? noTasksContent : <PageShell title={`Tasks — ${activeBusiness?.name} — Verity`}>{noTasksContent}</PageShell>;
  }

  const mainContent = (
    <div className="py-6 max-w-[1000px] mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <Kicker>ORCHESTRATED WORKFLOWS</Kicker>
          <h1 className="text-3xl font-serif text-text font-light mt-1">
            {activeBusiness?.name} Task Queue
          </h1>
          <p className="text-sm text-muted">
            Monitoring {tasks.length} active work items across agent graph.
          </p>
        </div>

        {!embed && (
          <Button variant="outline" onClick={() => navigate('/plan')}>
            View Graph Plan
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {tasks.map((task: Task) => {
          const blockedBy = task.dependencies.some((id) => tasks.find((candidate: Task) => candidate.id === id)?.status !== 'completed');
          const isComplete = task.status === 'completed';
          const report = latestReport?.taskId === task.id ? latestReport.report : null;
          return (
            <React.Fragment key={task.id}>
              <div
                className="bg-surface border border-border rounded-[4px] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-accent/40 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold uppercase text-accent bg-[#8F703615] px-2 py-0.5 rounded">
                      {task.assigned_agent}
                    </span>
                    <span className="text-xs text-muted font-mono">{task.id}</span>
                  </div>
                  <h3 className="font-serif text-base text-text">{task.title}</h3>
                  <p className="text-xs text-muted max-w-2xl">{task.objective}</p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono px-2.5 py-1 rounded bg-[#FAF8F4] border border-border text-muted capitalize">
                    {task.status.replace('_', ' ')}
                  </span>
                  {isComplete ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleDossier(task.id)}
                      isLoading={loadingReportId === task.id}
                      leftIcon={expandedTaskId === task.id ? <ChevronUp className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5 text-accent" />}
                    >
                      {expandedTaskId === task.id ? 'Hide Dossier' : 'View Full Dossier'}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="primary"
                      disabled={executeMutation.isPending || blockedBy}
                      isLoading={executeMutation.isPending && executeMutation.variables === task.id}
                      onClick={() => executeMutation.mutate(task.id)}
                      leftIcon={<Play className="w-3.5 h-3.5" />}
                    >
                      {blockedBy ? 'Waiting on prior task' : 'Run task'}
                    </Button>
                  )}
                </div>
              </div>

              {/* Comprehensive Agent Strategy Dossier & Execution Trace */}
              {((expandedTaskId === task.id && (report || fetchedReports[task.id])) || (latestReport?.taskId === task.id && report)) && (() => {
                const activeReport = (latestReport?.taskId === task.id ? latestReport.report : null) || fetchedReports[task.id] || report;
                if (!activeReport) return null;
                const d = activeReport.deliverables || {};

                return (
                  <div className="border border-accent/30 bg-surface rounded-xl p-6 text-sm space-y-6 shadow-xl animate-in fade-in duration-200">
                    {/* Dossier Header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-accent/15 border border-accent/30 flex items-center justify-center text-accent">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-mono text-xs font-semibold uppercase text-accent">
                            {d.agent_identity || `${task.assigned_agent} Strategy & Execution Dossier`}
                          </div>
                          <div className="text-xs text-muted">
                            Calibrated Confidence: <strong className="text-verified">{Math.round(activeReport.confidence * 100)}%</strong> · Verified Ground Truth
                          </div>
                        </div>
                      </div>
                      <div className="px-2.5 py-1 rounded bg-verified/15 text-verified border border-verified/30 text-xs font-medium flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Autonomous Execution Completed</span>
                      </div>
                    </div>

                    {/* Executive Summary */}
                    <div className="space-y-1.5">
                      <div className="text-xs font-mono uppercase tracking-wider text-muted flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-accent" />
                        <span>Executive Alignment Summary</span>
                      </div>
                      <p className="text-sm text-text leading-relaxed font-sans">{activeReport.summary}</p>
                    </div>

                    {/* 1. WHY AGENT PROPOSED THIS SOLUTION */}
                    {d.why_proposed && (
                      <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-wider text-amber-400">
                          <Lightbulb className="w-4 h-4" />
                          <span>Why {task.assigned_agent} Proposed This Strategy & Solution</span>
                        </div>
                        <p className="text-xs sm:text-sm text-text/90 leading-relaxed font-sans whitespace-pre-line">
                          {d.why_proposed}
                        </p>
                      </div>
                    )}

                    {/* 2. WHAT AGENT DID (EXECUTION TRACE) */}
                    {d.what_agent_did && (
                      <div className="p-4 rounded-lg bg-surface-2 border border-border space-y-2">
                        <div className="flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-wider text-accent">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>What {task.assigned_agent} Did (Execution Trace & Methodology)</span>
                        </div>
                        <div className="text-xs sm:text-sm text-text-muted leading-relaxed font-mono whitespace-pre-line bg-bg/50 p-3 rounded border border-border/50">
                          {d.what_agent_did}
                        </div>
                      </div>
                    )}

                    {/* 3. COMMERCIAL IMPACT ON BUSINESS */}
                    {d.business_impact && (
                      <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-wider text-emerald-400">
                          <TrendingUp className="w-4 h-4" />
                          <span>Commercial Impact on {activeBusiness?.name || 'Your Business'}</span>
                        </div>
                        <p className="text-xs sm:text-sm text-text/90 leading-relaxed font-sans">
                          {d.business_impact}
                        </p>
                      </div>
                    )}

                    {/* 4. ICP SPECIFICATIONS (IF PRESENT) */}
                    {d.icp && (
                      <div className="space-y-3 p-4 rounded-lg bg-surface-2 border border-border">
                        <div className="flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-wider text-accent">
                          <Target className="w-4 h-4" />
                          <span>Target Ideal Customer Profile (ICP) Specifications</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          {d.icp.primary_buyer_titles && (
                            <div className="p-3 bg-bg rounded border border-border">
                              <div className="font-semibold text-text mb-1.5">Primary Decision Maker Titles:</div>
                              <div className="flex flex-wrap gap-1.5">
                                {d.icp.primary_buyer_titles.map((title: string) => (
                                  <span key={title} className="px-2 py-0.5 rounded bg-accent/15 text-accent text-[11px] font-mono">
                                    {title}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {d.icp.target_company_profile && (
                            <div className="p-3 bg-bg rounded border border-border">
                              <div className="font-semibold text-text mb-1">Company Profile & Size:</div>
                              <div className="text-text-muted">{d.icp.target_company_profile}</div>
                            </div>
                          )}
                          {d.icp.core_buying_triggers && (
                            <div className="p-3 bg-bg rounded border border-border">
                              <div className="font-semibold text-verified mb-1">Active Buying Triggers:</div>
                              <ul className="list-disc list-inside space-y-0.5 text-text-muted">
                                {d.icp.core_buying_triggers.map((trig: string) => (
                                  <li key={trig}>{trig}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {d.icp.disqualifiers && (
                            <div className="p-3 bg-bg rounded border border-border">
                              <div className="font-semibold text-warning mb-1">Disqualifying Criteria:</div>
                              <ul className="list-disc list-inside space-y-0.5 text-text-muted">
                                {d.icp.disqualifiers.map((disq: string) => (
                                  <li key={disq}>{disq}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 5. MILESTONE EXECUTION ROADMAP */}
                    {Array.isArray(d.milestones) && d.milestones.length > 0 && (
                      <div className="space-y-3">
                        <div className="text-xs font-mono uppercase tracking-wider text-muted flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-accent" />
                          <span>Sequential Milestone Roadmap</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {d.milestones.map((m: any, idx: number) => (
                            <div key={idx} className="p-3.5 rounded-lg bg-bg border border-border space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-xs font-semibold text-accent">{m.phase || `Phase ${idx + 1}`}</span>
                                <span className="text-[10px] font-mono text-muted">KPI</span>
                              </div>
                              <p className="text-xs text-text">{m.objective}</p>
                              <div className="text-[11px] font-mono text-verified bg-verified/10 p-1.5 rounded border border-verified/20">
                                {m.kpi}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 6. KEY FINDINGS & OPERATING ASSUMPTIONS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border">
                      <div className="space-y-1.5">
                        <div className="text-xs font-mono uppercase tracking-wider text-muted">Key Strategic Findings</div>
                        <ul className="list-disc list-inside space-y-1 text-xs text-text-muted">
                          {activeReport.findings.map((f, i) => (
                            <li key={i}>{f}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="space-y-1.5">
                        <div className="text-xs font-mono uppercase tracking-wider text-warning">Operating Assumptions & Constraints</div>
                        <ul className="list-disc list-inside space-y-1 text-xs text-warning/90">
                          {activeReport.assumptions.map((a, i) => (
                            <li key={i}>{a}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );

  return embed ? mainContent : <PageShell title={`Tasks — ${activeBusiness?.name} — Verity`}>{mainContent}</PageShell>;
};
export default TasksPage;

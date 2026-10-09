import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { Layers, ArrowRight, Play, CheckCircle2, ShieldCheck } from 'lucide-react';
import { api } from '../api/client';
import { useAppStore } from '../store/useAppStore';
import { PageShell } from '../components/PageShell';
import { Kicker } from '../components/Kicker';
import { Button } from '../components/ui/Button';
import { AgentReport, Task } from '../api/types';

export const TasksPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activeBusinessId, addToast } = useAppStore();
  const [latestReport, setLatestReport] = useState<{ taskId: string; report: AgentReport } | null>(null);

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

  const executeMutation = useMutation({
    mutationFn: (taskId: string) => api.executeTask(taskId),
    onSuccess: ({ task, report }) => {
      setLatestReport({ taskId: task.id, report });
      queryClient.invalidateQueries({ queryKey: ['tasks', activeBusiness?.id] });
      addToast({ type: 'success', title: `${task.assigned_agent} completed the task`, message: 'The agent report is shown below. No external action was taken.' });
    },
    onError: (error: Error) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', activeBusiness?.id] });
      addToast({ type: 'warning', title: 'Task cannot run yet', message: error.message });
    },
  });

  // Empty State 1: No Business
  if (!isLoadingBiz && (!activeBusiness || businesses.length === 0)) {
    return (
      <PageShell title="Tasks — Verity">
        <div className="py-20 max-w-[680px] mx-auto text-center space-y-6">
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
      </PageShell>
    );
  }

  // Empty State 2: Business exists, but no tasks
  if (!isLoadingTasks && tasks.length === 0) {
    return (
      <PageShell title={`Tasks — ${activeBusiness?.name} — Verity`}>
        <div className="py-20 max-w-[680px] mx-auto text-center space-y-6">
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
      </PageShell>
    );
  }

  return (
    <PageShell title={`Tasks — ${activeBusiness?.name} — Verity`}>
      <div className="py-10 max-w-[1000px] mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
          <div>
            <Kicker>ORCHESTRATED WORKFLOWS</Kicker>
            <h1 className="text-3xl font-serif text-text font-light mt-1">
              {activeBusiness?.name} Task Queue
            </h1>
            <p className="text-sm text-muted">
              Monitoring {tasks.length} active work items.
            </p>
          </div>

          <Button variant="outline" onClick={() => navigate('/plan')}>
            View Graph Plan
          </Button>
        </div>

        <div className="space-y-3">
          {tasks.map((task: Task) => {
            const blockedBy = task.dependencies.some((id) => tasks.find((candidate: Task) => candidate.id === id)?.status !== 'completed');
            const isComplete = task.status === 'completed';
            const report = latestReport?.taskId === task.id ? latestReport.report : null;
            return <React.Fragment key={task.id}><div
              key={task.id}
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
                <Button size="sm" variant={isComplete ? 'outline' : 'primary'} disabled={isComplete || executeMutation.isPending || blockedBy} isLoading={executeMutation.isPending && executeMutation.variables === task.id} onClick={() => executeMutation.mutate(task.id)} leftIcon={isComplete ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}>
                  {isComplete ? 'Completed' : blockedBy ? 'Waiting on prior task' : 'Run task'}
                </Button>
              </div>
            </div>{report && <div className="ml-0 border border-verified/30 bg-verified/5 rounded-[4px] p-5 text-sm"><div className="flex items-center gap-2 text-verified font-medium"><ShieldCheck className="w-4 h-4" /> Agent report · confidence {Math.round(report.confidence * 100)}%</div><p className="mt-2 text-text">{report.summary}</p><ul className="mt-3 list-disc list-inside space-y-1 text-xs text-muted">{report.findings.map((finding) => <li key={finding}>{finding}</li>)}</ul><p className="mt-3 text-xs text-warning">{report.assumptions[0]}</p></div>}</React.Fragment>;
          })}
        </div>
      </div>
    </PageShell>
  );
};
export default TasksPage;

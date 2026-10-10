import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { Compass, ArrowRight, Sparkles, CheckCircle2, Clock, AlertTriangle, Play } from 'lucide-react';
import { api } from '../api/client';
import { useAppStore } from '../store/useAppStore';
import { PageShell } from '../components/PageShell';
import { Kicker } from '../components/Kicker';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/Card';
import { Task } from '../api/types';

export const PlanPage: React.FC<{ embed?: boolean }> = ({ embed = false }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activeBusinessId, addToast } = useAppStore();

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

  const planMutation = useMutation({
    mutationFn: () => {
      if (!activeBusiness) throw new Error('No active business');
      return api.planTasks({ business_id: activeBusiness.id, phase: 'foundation' });
    },
    onSuccess: (newTasks) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', activeBusiness?.id] });
      if (newTasks.length === 0) {
        addToast({
          type: 'danger',
          title: 'No plan was created',
          message: 'Atlas returned no tasks. Check your business context and try again.',
        });
        return;
      }
      addToast({
        type: 'success',
        title: 'Plan Generated',
        message: `Atlas created ${newTasks.length} tasks for the Foundation phase.`,
      });
    },
    onError: (err: any) => {
      addToast({
        type: 'danger',
        title: 'Planning Failed',
        message: err?.message || 'Could not generate plan.',
      });
    },
  });

  // Empty State 1: No Business exists
  if (!isLoadingBiz && (!activeBusiness || businesses.length === 0)) {
    const empty1 = (
      <div className="py-12 max-w-[680px] mx-auto text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-surface border border-border flex items-center justify-center mx-auto text-accent shadow-sm">
          <Compass className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <Kicker>TASK GRAPH & PLANNING</Kicker>
          <h1 className="text-3xl font-serif text-text font-light">
            No active plan
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
    return embed ? empty1 : <PageShell title="Growth Plan — Verity">{empty1}</PageShell>;
  }

  // Empty State 2: Business exists, but no tasks planned yet
  if (!isLoadingTasks && tasks.length === 0) {
    const empty2 = (
      <div className="py-12 max-w-[680px] mx-auto text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-surface border border-border flex items-center justify-center mx-auto text-accent shadow-sm">
          <Sparkles className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <Kicker>PHASE EXECUTION</Kicker>
          <h1 className="text-3xl font-serif text-text font-light">
            No tasks planned yet
          </h1>
          <p className="text-sm text-muted max-w-md mx-auto leading-relaxed">
            Atlas is ready to analyze your business profile and generate a phase-aware task graph.
          </p>
        </div>
        <div className="pt-2">
          <Button
            variant="primary"
            isLoading={planMutation.isPending}
            onClick={() => planMutation.mutate()}
            rightIcon={<Play className="w-4 h-4" />}
          >
            Generate Foundation plan
          </Button>
        </div>
      </div>
    );
    return embed ? empty2 : <PageShell title={`Plan — ${activeBusiness?.name} — Verity`}>{empty2}</PageShell>;
  }

  // Active Tasks List
  const mainPlanContent = (
    <div className="py-6 max-w-[1000px] mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <Kicker>PHASE EXECUTION PLAN</Kicker>
          <h1 className="text-3xl font-serif text-text font-light mt-1">
            {activeBusiness?.name} Task Graph
          </h1>
          <p className="text-sm text-muted">
            {tasks.length} tasks orchestrated across specialized agents.
          </p>
        </div>

        <Button
          variant="outline"
          isLoading={planMutation.isPending}
          onClick={() => planMutation.mutate()}
          leftIcon={<Sparkles className="w-4 h-4 text-accent" />}
        >
          Regenerate plan
        </Button>
      </div>

      <div className="space-y-4">
        {tasks.map((task: Task) => (
          <div
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
              <h3 className="font-serif text-lg text-text">{task.title}</h3>
              <p className="text-xs text-muted max-w-2xl">{task.objective}</p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-mono px-2.5 py-1 rounded bg-[#FAF8F4] border border-border text-muted capitalize">
                {task.status.replace('_', ' ')}
              </span>
              <Link
                to="/tasks"
                className="px-3 py-1.5 text-xs font-medium text-text hover:text-accent border border-border rounded hover:border-accent/40 transition-colors"
              >
                Inspect in Task Board
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return embed ? mainPlanContent : <PageShell title={`Plan — ${activeBusiness?.name} — Verity`}>{mainPlanContent}</PageShell>;
};
export default PlanPage;

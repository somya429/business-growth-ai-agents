import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BarChart3, CheckCircle2, CircleDashed, Database, FileQuestion, Lightbulb, LockKeyhole, Search } from 'lucide-react';
import { api } from '../api/client';
import { BusinessProfile, PhaseType, Task } from '../api/types';
import { useAppStore } from '../store/useAppStore';
import { PageShell } from '../components/PageShell';
import { Kicker } from '../components/Kicker';
import { Card } from '../components/Card';
import { Button } from '../components/ui/Button';

type Problem = 'demand' | 'conversion' | 'fulfilment' | 'margin' | 'retention';

const PROBLEMS: Array<{ id: Problem; label: string; description: string }> = [
  { id: 'demand', label: 'Not enough local demand', description: 'Validate the target neighbourhood, audience, and acquisition channel.' },
  { id: 'conversion', label: 'Visitors are not ordering', description: 'Investigate the gap between interest, price, selection, and checkout.' },
  { id: 'fulfilment', label: 'Delivery or operations are constrained', description: 'Prioritise service area, fulfilment capacity, and customer promises.' },
  { id: 'margin', label: 'Growth may not be profitable', description: 'Model contribution margin, discounts, CAC, and fulfilment cost.' },
  { id: 'retention', label: 'Customers are not returning', description: 'Connect feedback, experience issues, and retention experiments.' },
];

function nextDecision(problem: Problem, business: BusinessProfile) {
  const market = business.ideal_customer || 'your initial market';
  const options: Record<Problem, { title: string; action: string; metric: string; agents: string[] }> = {
    demand: { title: `Validate demand before expanding ${business.name}`, action: `Test one focused customer segment in ${market}; compare acquisition cost and first-order conversion before adding new areas.`, metric: 'Qualified demand, CAC, first-order conversion', agents: ['Atlas', 'Scout', 'Compass'] },
    conversion: { title: `Find the ordering friction in ${business.name}`, action: 'Trace the journey from discovery to checkout, then test one evidence-backed improvement instead of increasing spend.', metric: 'Product-view → checkout conversion', agents: ['Scout', 'Muse', 'Veritas'] },
    fulfilment: { title: 'Protect the customer promise before growth', action: 'Set a realistic service zone and capacity baseline, then use only claims that operations can consistently meet.', metric: 'On-time delivery, cancellations, support contacts', agents: ['Atlas', 'Compass', 'Veritas'] },
    margin: { title: 'Grow contribution profit, not just orders', action: 'Model margin after discounts, picking/rider cost, refunds, and acquisition cost before approving a campaign.', metric: 'Contribution profit per order', agents: ['Compass', 'Scout', 'Atlas'] },
    retention: { title: 'Turn customer feedback into a retention decision', action: 'Classify repeat-order blockers, compare them with fulfilment and product signals, then test one small approved recovery action.', metric: '30-day repeat rate and refund rate', agents: ['Echo', 'Sage', 'Herald'] },
  };
  return options[problem];
}

export const WorkspacePage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activeBusinessId, addToast } = useAppStore();
  const [problem, setProblem] = useState<Problem>('demand');
  const [phase, setPhase] = useState<PhaseType>('foundation');
  const { data: businesses = [], isLoading } = useQuery({ queryKey: ['businesses'], queryFn: () => api.listBusinesses() });
  const business = businesses.find((item) => item.id === activeBusinessId) || businesses[0];
  const { data: tasks = [] } = useQuery({ queryKey: ['tasks', business?.id], queryFn: () => business ? api.listTasks({ business_id: business.id }) : Promise.resolve([]), enabled: Boolean(business) });
  const insight = useMemo(() => business ? nextDecision(problem, business) : null, [business, problem]);

  const planMutation = useMutation({
    mutationFn: () => {
      if (!business) throw new Error('Create a business profile before asking agents to plan.');
      return api.planTasks({ business_id: business.id, phase });
    },
    onSuccess: (newTasks) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', business?.id] });
      if (!newTasks.length) return addToast({ type: 'danger', title: 'No plan created', message: 'Check the business profile and try again.' });
      addToast({ type: 'success', title: 'Personalised plan ready', message: `${newTasks.length} tasks were created for ${business?.name}.` });
    },
    onError: (error: Error) => addToast({ type: 'danger', title: 'Planning failed', message: error.message }),
  });

  if (!isLoading && !business) return <PageShell title="Business Decision Studio — Verity"><div className="mx-auto max-w-xl py-24 text-center"><Database className="mx-auto h-10 w-10 text-accent" /><h1 className="mt-5 font-serif text-3xl">Start with your business context</h1><p className="mt-3 text-sm text-muted">This workspace works from a saved business profile and evidence you provide. It will not invent a company, signals, or outreach.</p><Button className="mt-6" onClick={() => navigate('/onboard')} rightIcon={<ArrowRight className="h-4 w-4" />}>Set up my business</Button></div></PageShell>;

  return <PageShell title={`Decision Studio — ${business?.name || 'Verity'}`} description="Choose a business problem, coordinate an evidence-backed plan, and approve any external action."><div className="mx-auto max-w-[1100px] space-y-7 py-10">
    <section className="flex flex-col gap-5 border-b border-border pb-7 md:flex-row md:items-end md:justify-between"><div><Kicker>PERSONALISED BUSINESS DECISION STUDIO</Kicker><h1 className="mt-2 font-serif text-4xl text-text">What should {business?.name} do next?</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">Choose the business problem—not a target company. Verity coordinates research, operations, marketing, and trust checks into one approved next action.</p></div><div className="rounded-lg border border-border bg-surface px-4 py-3 text-xs"><div className="flex items-center gap-2 font-medium text-text"><CheckCircle2 className="h-4 w-4 text-verified" /> Active context: {business?.name}</div><div className="mt-1 text-muted">{business?.industry} · {business?.ideal_customer || 'Market not specified'}</div></div></section>
    <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]"><Card className="p-6"><h2 className="font-serif text-xl">1. Select the problem to solve</h2><p className="mt-1 text-xs text-muted">This shapes the recommendation and task plan. It does not trigger any external action.</p><div className="mt-5 space-y-2">{PROBLEMS.map((item) => <button key={item.id} type="button" onClick={() => setProblem(item.id)} className={`w-full rounded-lg border p-3 text-left transition-colors ${problem === item.id ? 'border-accent bg-accent/10' : 'border-border hover:border-accent/40'}`}><div className="text-sm font-medium text-text">{item.label}</div><div className="mt-1 text-xs text-muted">{item.description}</div></button>)}</div></Card><Card className="p-6"><div className="flex items-start gap-3"><Lightbulb className="mt-1 h-5 w-5 text-accent" /><div><span className="text-xs font-semibold uppercase tracking-wider text-accent">Recommended first decision</span><h2 className="mt-1 font-serif text-xl">{insight?.title}</h2></div></div><p className="mt-4 text-sm leading-relaxed text-muted">{insight?.action}</p><div className="mt-5 rounded-lg border border-border bg-bg p-4 text-xs"><span className="font-semibold text-text">Measure:</span> <span className="text-muted">{insight?.metric}</span></div><div className="mt-3 flex flex-wrap gap-2">{insight?.agents.map((agent) => <span key={agent} className="rounded border border-border bg-surface px-2 py-1 text-xs text-text">{agent}</span>)}</div></Card></section>
    <section className="grid gap-4 md:grid-cols-3"><Card className="p-5"><Search className="h-5 w-5 text-accent" /><h3 className="mt-3 font-serif text-lg">Evidence first</h3><p className="mt-1 text-xs leading-relaxed text-muted">Research is labelled as provided, connected, or missing—never invented as evidence.</p></Card><Card className="p-5"><BarChart3 className="h-5 w-5 text-accent" /><h3 className="mt-3 font-serif text-lg">Profit-aware</h3><p className="mt-1 text-xs leading-relaxed text-muted">Plans account for fulfilment, discounts, refunds, capacity, and acquisition cost.</p></Card><Card className="p-5"><LockKeyhole className="h-5 w-5 text-accent" /><h3 className="mt-3 font-serif text-lg">Human controlled</h3><p className="mt-1 text-xs leading-relaxed text-muted">Publishing, sending, spending, or customer contact always requires approval.</p></Card></section>
    <section className="rounded-xl border border-accent/30 bg-accent/5 p-6"><div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><h2 className="font-serif text-xl">2. Build the work plan</h2><p className="mt-1 text-sm text-muted">Start small for {business?.name}; expand only after you have evidence and an owner for each task.</p></div><div className="flex items-center gap-3"><select value={phase} onChange={(event) => setPhase(event.target.value as PhaseType)} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"><option value="foundation">Foundation</option><option value="presales_readiness">Pre-sales readiness</option><option value="growth_optimization">Growth optimisation</option></select><Button isLoading={planMutation.isPending} onClick={() => planMutation.mutate()} rightIcon={<ArrowRight className="h-4 w-4" />}>Create plan</Button></div></div></section>
    <section><div className="mb-4 flex items-center justify-between"><div><Kicker>YOUR CURRENT PLAN</Kicker><h2 className="mt-1 font-serif text-2xl">{tasks.length ? `${tasks.length} prioritised tasks` : 'No plan yet'}</h2></div>{tasks.length > 0 && <Button variant="outline" onClick={() => navigate('/tasks')}>Open task board</Button>}</div>{tasks.length ? <div className="grid gap-3">{(tasks as Task[]).slice(0, 6).map((task, index) => <Card key={task.id} className="flex flex-col gap-3 p-5 md:flex-row md:items-center"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-sm font-semibold text-accent">{index + 1}</div><div className="flex-1"><div className="text-xs font-semibold uppercase tracking-wider text-accent">{task.assigned_agent} · {task.status.replace('_', ' ')}</div><h3 className="mt-1 font-serif text-lg">{task.title}</h3><p className="mt-1 text-xs text-muted">{task.objective}</p></div><span className="text-xs text-muted">{task.approval_policy === 'none' ? 'Internal work' : 'Approval required'}</span></Card>)}</div> : <Card className="p-8 text-center"><CircleDashed className="mx-auto h-7 w-7 text-muted" /><p className="mt-3 text-sm text-muted">Choose the problem above, then create the first plan. No message, campaign, or external change will be triggered.</p></Card>}</section>
    <section className="flex items-start gap-3 rounded-lg border border-border p-4 text-xs text-muted"><FileQuestion className="mt-0.5 h-4 w-4 shrink-0 text-warning" /><p><strong className="text-text">Current data boundary:</strong> this workspace uses your saved profile and the information you provide. Connect Shopify, campaign, support, inventory, or accounting data before treating a recommendation as measured analysis.</p></section>
  </div></PageShell>;
};

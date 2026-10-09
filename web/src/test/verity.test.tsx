import { describe, it, expect, beforeEach } from 'vitest';
import { api } from '../api/client';

describe('Verity Core Data Layer & Consensus Verification', () => {
  beforeEach(() => {
    api.resetState();
  });

  it('starts completely empty with 0 businesses and adheres to clean initial contract', async () => {
    const businesses = await api.listBusinesses();
    expect(businesses).toHaveLength(0);

    const health = await api.getHealth();
    expect(health.status).toBe('healthy');

    const agents = await api.getAgents();
    expect(agents.agents.length).toBeGreaterThan(0);
    expect(agents.summary.total_count).toBeGreaterThan(0);
  });

  it('updates trust score and verdict dynamically when flags are accepted or dismissed', async () => {
    await api.createBusiness({ id: 'test_biz', name: 'Test Systems', industry: 'Software' });
    const runId = await api.startRun('test_biz', null, true);

    const run = await api.getRun(runId);
    expect(run).toBeDefined();
    expect(run.status).toBe('waiting_for_human');

    const trace = await api.getTrace(runId);
    expect(trace.length).toBeGreaterThan(0);

    // 1. Initial State has 3 open flags
    const initialPayload = await api.getReviewPayload(runId);
    expect(initialPayload.trust_report?.flags).toHaveLength(3);
    expect(initialPayload.trust_report?.overall_score).toBeLessThan(60);
    expect(initialPayload.trust_report?.verdict).toBe('FAIL');

    const initialScore = initialPayload.trust_report!.overall_score;

    // 2. Accept first flag (high severity penalty removed)
    const report1 = await api.updateFlag(runId, 'flag-001', 'accepted');
    expect(report1.flags.find((f) => f.id === 'flag-001')?.status).toBe('accepted');
    expect(report1.overall_score).toBeGreaterThan(initialScore);

    // 3. Dismiss second flag (medium severity penalty removed)
    const report2 = await api.updateFlag(runId, 'flag-002', 'dismissed');
    expect(report2.flags.find((f) => f.id === 'flag-002')?.status).toBe('dismissed');
    expect(report2.overall_score).toBeGreaterThan(report1.overall_score);

    // 4. Accept third flag (resolves all open flags)
    const report3 = await api.updateFlag(runId, 'flag-003', 'accepted');
    expect(report3.overall_score).toBe(100);
    expect(report3.verdict).toBe('PASS');

    // Policy gate also clears automatically once flags are resolved
    const finalPayload = await api.getReviewPayload(runId);
    expect(finalPayload.policy_result?.passed).toBe(true);
  });

  it('enforces consensus gate before approving dispatch', async () => {
    await api.createBusiness({ id: 'test_biz', name: 'Test Systems', industry: 'Software' });
    const runId = await api.startRun('test_biz', null, true);

    // 1. Initially on flawed demo, approval is locked because flags are open and policy failed
    const initialPayload = await api.getReviewPayload(runId);
    const initialOpen = initialPayload.trust_report?.flags.filter((f) => f.status === 'open') || [];
    const initialCanApprove = initialOpen.length === 0 && (initialPayload.policy_result?.passed ?? false);
    expect(initialCanApprove).toBe(false);

    // 2. Resolve all 3 flags
    await api.updateFlag(runId, 'flag-001', 'accepted');
    await api.updateFlag(runId, 'flag-002', 'accepted');
    await api.updateFlag(runId, 'flag-003', 'accepted');

    // 3. Re-check state: now consensus criteria are met
    const resolvedPayload = await api.getReviewPayload(runId);
    const resolvedOpen = resolvedPayload.trust_report?.flags.filter((f) => f.status === 'open') || [];
    const resolvedCanApprove = resolvedOpen.length === 0 && (resolvedPayload.policy_result?.passed ?? false);
    expect(resolvedCanApprove).toBe(true);

    // 4. Submit approval
    const run = await api.submitApproval(runId, { decision: 'approve' });
    expect(run.status).toBe('completed');
    expect(run.state_summary.mock_send_result).toBeDefined();
    expect(run.state_summary.mock_send_result?.status).toContain('Delivered');
  });

  it('reloads business models and documents upon switching', async () => {
    await api.createBusiness({
      id: 'biz_a',
      name: 'Alpha Retail',
      industry: 'Consumer Goods',
      documents: [{ id: 'doc-1', title: 'Catalog.pdf', type: 'PDF', size: '1MB' }],
    });
    await api.createBusiness({
      id: 'biz_b',
      name: 'Beta Cloud',
      industry: 'Software',
    });

    const biz = await api.switchBusiness('biz_a');
    expect(biz.id).toBe('biz_a');
    expect(biz.name).toBe('Alpha Retail');
    expect(biz.industry).toContain('Consumer Goods');
    expect(biz.documents?.length).toBeGreaterThan(0);

    const reverted = await api.switchBusiness('biz_b');
    expect(reverted.id).toBe('biz_b');
    expect(reverted.name).toBe('Beta Cloud');
  });

  it('initializes and autosaves adaptive onboarding session with fact provenance and readiness', async () => {
    const session = await api.startOnboarding('test_session_101', {
      name: 'OmniFlow AI',
      business_type: 'software_saas_ai',
      stage: 'foundation',
    });

    expect(session.session_id).toBe('test_session_101');
    expect(session.core_answers.name).toBe('OmniFlow AI');
    expect(session.core_answers.business_type).toBe('software_saas_ai');
    expect(session.classified_facts.length).toBeGreaterThan(0);
    expect(session.readiness.overall_score).toBeGreaterThan(0);

    // Verify classified facts provenance
    const userStated = session.classified_facts.find((f) => f.key === 'business_name');
    expect(userStated?.classification).toBe('user_stated');

    const assumption = session.classified_facts.find((f) => f.key === 'value_proposition');
    expect(assumption?.classification).toBe('user_assumption');
    expect(assumption?.why_it_matters).toBeDefined();

    // Autosave updates
    const updated = await api.saveOnboardingSession('test_session_101', {
      core_answers: { goal: 'Reach $10k MRR in 90 days' },
      stage_override: 'presales_readiness',
    });
    expect(updated.core_answers.stage).toBe('presales_readiness');
    expect(updated.core_answers.goal).toBe('Reach $10k MRR in 90 days');
  });

  it('provides question bank follow-ups and supports fallback mode', async () => {
    const result = await api.getOnboardingFollowUps('test_session_101', true);
    expect(result.is_fallback).toBe(true);
    expect(result.questions.length).toBeGreaterThanOrEqual(2);
    expect(result.questions[0].id).toBeDefined();
    expect(result.questions[0].target_field).toBeDefined();
  });
});

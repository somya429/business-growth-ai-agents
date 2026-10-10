import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { GrowthForecastReport, GrowthAgentAdvisorResponse } from '../../api/types';

interface GrowthAgentViewProps {
  businessId?: string;
  onNavigateToClearance?: () => void;
  onNavigateToTasks?: () => void;
}

export const GrowthAgentView: React.FC<GrowthAgentViewProps> = ({
  businessId,
  onNavigateToClearance,
  onNavigateToTasks,
}) => {
  const [report, setReport] = useState<GrowthForecastReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedScenario, setSelectedScenario] = useState<'conservative' | 'expected' | 'accelerated'>('expected');
  const [userPrompt, setUserPrompt] = useState<string>('');
  const [askingAgent, setAskingAgent] = useState<boolean>(false);
  const [advisorResponse, setAdvisorResponse] = useState<GrowthAgentAdvisorResponse | null>(null);

  const fetchGrowthReport = async () => {
    try {
      setLoading(true);
      const data = await api.getGrowthMetrics(businessId);
      setReport(data);
    } catch (err) {
      console.error('Failed to load growth forecast:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGrowthReport();
  }, [businessId]);

  const handleAskAgent = async (promptToAsk?: string) => {
    const q = promptToAsk || userPrompt;
    if (!q.trim()) return;
    try {
      setAskingAgent(true);
      const resp = await api.askGrowthAgent(q, businessId);
      setAdvisorResponse(resp);
      if (!promptToAsk) setUserPrompt('');
    } catch (err) {
      console.error('Failed to query Vanguard growth agent:', err);
    } finally {
      setAskingAgent(false);
    }
  };

  if (loading && !report) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', background: '#FBF8F1', border: '1.5px solid #111' }}>
        <div style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px' }}>
          ⚡ CALIBRATING REAL GROWTH TELEMETRY...
        </div>
        <p style={{ color: '#666', fontSize: '13px', margin: 0 }}>
          Vanguard agent is analyzing live sprint task completions, account pipelines, and clearance velocity.
        </p>
      </div>
    );
  }

  if (!report) {
    return (
      <div style={{ padding: '30px', textAlign: 'center', background: '#FFF5F5', border: '1.5px solid #E53E3E' }}>
        <p style={{ color: '#C53030', fontWeight: 700 }}>Failed to calculate growth forecast. Please retry.</p>
        <button
          onClick={fetchGrowthReport}
          style={{
            padding: '8px 16px',
            background: '#111',
            color: '#FFF',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 700,
          }}
        >
          Retry Calibration
        </button>
      </div>
    );
  }

  const till = report.till_growth;
  const near = report.near_future;
  const currentScenario = report.scenarios[selectedScenario] || report.scenarios.expected;

  const quickPrompts = [
    'How does completing remaining tasks affect our 30-day pipeline?',
    'What is our near-term forecast if we clear pending approvals today?',
    'What are our primary growth bottlenecks right now?',
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. Header Banner */}
      <div
        style={{
          background: '#FBF8F1',
          border: '1.5px solid #111',
          boxShadow: '4px 4px 0 #111',
          padding: '24px',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span
              style={{
                background: '#111',
                color: '#FFF',
                fontSize: '11px',
                fontWeight: 800,
                padding: '3px 8px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Vanguard Agent
            </span>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: near.velocity_status === 'blocked' ? '#C53030' : '#2F855A',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: near.velocity_status === 'blocked' ? '#E53E3E' : '#38A169',
                  display: 'inline-block',
                }}
              />
              Status: {near.velocity_status.toUpperCase()}
            </span>
            <span style={{ fontSize: '11px', color: '#666' }}>
              Calibrated for: <strong>{report.business_name}</strong> ({report.industry})
            </span>
          </div>
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 900, color: '#111', letterSpacing: '-0.02em' }}>
            Growth Tracking & Predictive Intelligence
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#555' }}>
            Real-time pipeline modeling based strictly on real task execution, clearance throughput, and ICP discovery.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={fetchGrowthReport}
            style={{
              padding: '8px 16px',
              background: '#FFF',
              border: '1.5px solid #111',
              fontWeight: 700,
              fontSize: '12px',
              cursor: 'pointer',
              boxShadow: '2px 2px 0 #111',
            }}
          >
            ↻ Refresh Metrics
          </button>
        </div>
      </div>

      {/* 2. Till Growth (Growth to Date) Section */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
            📍 Till Growth (Execution Realized To Date)
          </h3>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#666' }}>
            Task Completion Rate: <strong style={{ color: '#111' }}>{till.task_completion_rate}%</strong>
          </span>
        </div>

        {/* Progress Bar */}
        <div
          style={{
            width: '100%',
            height: '14px',
            background: '#EAE5DB',
            border: '1.5px solid #111',
            marginBottom: '16px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${Math.min(till.task_completion_rate, 100)}%`,
              background: '#111',
              transition: 'width 0.4s ease',
            }}
          />
        </div>

        {/* 4 Metric Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
          }}
        >
          <div
            style={{
              background: '#FBF8F1',
              border: '1.5px solid #111',
              boxShadow: '4px 4px 0 #111',
              padding: '16px',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#666', textTransform: 'uppercase' }}>
              Sprint Tasks Done
            </div>
            <div style={{ fontSize: '26px', fontWeight: 900, color: '#111', marginTop: '4px' }}>
              {till.completed_tasks} / {till.total_tasks}
            </div>
            <div style={{ fontSize: '12px', color: '#555', marginTop: '6px' }}>
              {till.pending_tasks} pending · {till.in_progress_tasks} in-flight
            </div>
          </div>

          <div
            style={{
              background: '#FBF8F1',
              border: '1.5px solid #111',
              boxShadow: '4px 4px 0 #111',
              padding: '16px',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#666', textTransform: 'uppercase' }}>
              Autonomous Hours Reclaimed
            </div>
            <div style={{ fontSize: '26px', fontWeight: 900, color: '#111', marginTop: '4px' }}>
              {till.autonomous_hours_reclaimed} hrs
            </div>
            <div style={{ fontSize: '12px', color: '#555', marginTop: '6px' }}>
              Saved by Atlas, Scout, and Veritas
            </div>
          </div>

          <div
            style={{
              background: '#FBF8F1',
              border: '1.5px solid #111',
              boxShadow: '4px 4px 0 #111',
              padding: '16px',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#666', textTransform: 'uppercase' }}>
              Accounts Prospected
            </div>
            <div style={{ fontSize: '26px', fontWeight: 900, color: '#111', marginTop: '4px' }}>
              {till.accounts_prospected}
            </div>
            <div style={{ fontSize: '12px', color: '#555', marginTop: '6px' }}>
              {till.approved_dispatches} cleared · {till.active_runs} awaiting review
            </div>
          </div>

          <div
            style={{
              background: '#FBF8F1',
              border: '1.5px solid #111',
              boxShadow: '4px 4px 0 #111',
              padding: '16px',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#666', textTransform: 'uppercase' }}>
              Realized Pipeline Value
            </div>
            <div style={{ fontSize: '26px', fontWeight: 900, color: '#2F855A', marginTop: '4px' }}>
              ${till.realized_pipeline_value.toLocaleString()}
            </div>
            <div style={{ fontSize: '12px', color: '#555', marginTop: '6px' }}>
              Based on ${till.average_deal_size.toLocaleString()} avg deal size
            </div>
          </div>
        </div>
      </div>

      {/* 3. Near-Future Growth Prediction (Next 7-14 Days) */}
      <div
        style={{
          background: '#FBF8F1',
          border: '1.5px solid #111',
          boxShadow: '6px 6px 0 #111',
          padding: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#B7791F' }}>
              🔮 14-Day Velocity Projection
            </div>
            <h3 style={{ margin: '2px 0 0', fontSize: '18px', fontWeight: 900, color: '#111' }}>
              Near-Future Growth (Next {near.window_days} Days)
            </h3>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#666' }}>PROJECTED PIPELINE ADDITION</span>
            <div style={{ fontSize: '24px', fontWeight: 900, color: '#2F855A' }}>
              +${near.projected_new_pipeline_value.toLocaleString()}
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '16px',
            marginBottom: '16px',
          }}
        >
          {/* Milestone List */}
          <div
            style={{
              background: '#FFF',
              border: '1.5px solid #111',
              padding: '16px',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '10px' }}>
              🎯 Upcoming 14-Day Milestones
            </div>
            <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: '#333', lineHeight: '1.6' }}>
              {near.key_milestones.map((m, idx) => (
                <li key={idx} style={{ marginBottom: '6px' }}>
                  {m}
                </li>
              ))}
            </ul>
          </div>

          {/* Clearance Impact Banner */}
          <div
            style={{
              background: near.immediate_blockers.length > 0 ? '#FFF5F5' : '#F0FFF4',
              border: `1.5px solid ${near.immediate_blockers.length > 0 ? '#E53E3E' : '#38A169'}`,
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  color: near.immediate_blockers.length > 0 ? '#C53030' : '#276749',
                  marginBottom: '8px',
                }}
              >
                {near.immediate_blockers.length > 0 ? '⚠️ Clearance Gate Blockers' : '✓ Autonomous Clearance Status'}
              </div>
              <p
                style={{
                  margin: '0 0 10px',
                  fontSize: '13px',
                  color: near.immediate_blockers.length > 0 ? '#742A2A' : '#22543D',
                  lineHeight: '1.5',
                }}
              >
                {near.clearance_impact_summary}
              </p>
            </div>

            {onNavigateToClearance && till.active_runs > 0 && (
              <button
                onClick={onNavigateToClearance}
                style={{
                  alignSelf: 'flex-start',
                  padding: '8px 14px',
                  background: '#111',
                  color: '#FFF',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Review Held Drafts in Clearance Desk →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. Expected Future Growth (30, 60, 90 Days Scenarios) */}
      <div
        style={{
          background: '#FBF8F1',
          border: '1.5px solid #111',
          boxShadow: '6px 6px 0 #111',
          padding: '24px',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#666' }}>
              📊 Long-Term Predictive Modeling
            </div>
            <h3 style={{ margin: '2px 0 0', fontSize: '18px', fontWeight: 900, color: '#111' }}>
              Expected Future Growth (30, 60 & 90 Days)
            </h3>
          </div>

          {/* Scenario Tabs */}
          <div style={{ display: 'flex', gap: '6px', background: '#EAE5DB', padding: '4px', border: '1.5px solid #111' }}>
            {(['conservative', 'expected', 'accelerated'] as const).map((scKey) => {
              const sc = report.scenarios[scKey];
              const isActive = selectedScenario === scKey;
              return (
                <button
                  key={scKey}
                  onClick={() => setSelectedScenario(scKey)}
                  style={{
                    padding: '6px 12px',
                    background: isActive ? '#111' : 'transparent',
                    color: isActive ? '#FFF' : '#333',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {sc.label} ({sc.confidence_score}%)
                </button>
              );
            })}
          </div>
        </div>

        {/* 3 Horizon Projection Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '16px',
            marginBottom: '20px',
          }}
        >
          {/* 30 Days */}
          <div
            style={{
              background: '#FFF',
              border: '1.5px solid #111',
              boxShadow: '3px 3px 0 #111',
              padding: '18px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, background: '#EAE5DB', padding: '2px 8px' }}>
                30-DAY OUTLOOK
              </span>
              <span style={{ fontSize: '12px', color: '#666', fontWeight: 700 }}>
                {currentScenario.accounts_30d} Accounts
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#666', fontWeight: 700 }}>PROJECTED PIPELINE</div>
            <div style={{ fontSize: '24px', fontWeight: 900, color: '#111', margin: '4px 0 10px' }}>
              ${currentScenario.pipeline_30d.toLocaleString()}
            </div>
            <div style={{ borderTop: '1px solid #EAE5DB', paddingTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', color: '#555' }}>Expected ARR / Rev:</span>
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#2F855A' }}>
                ${currentScenario.expected_revenue_30d.toLocaleString()}
              </span>
            </div>
          </div>

          {/* 60 Days */}
          <div
            style={{
              background: '#FFF',
              border: '1.5px solid #111',
              boxShadow: '3px 3px 0 #111',
              padding: '18px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, background: '#EAE5DB', padding: '2px 8px' }}>
                60-DAY OUTLOOK
              </span>
              <span style={{ fontSize: '12px', color: '#666', fontWeight: 700 }}>
                {currentScenario.accounts_60d} Accounts
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#666', fontWeight: 700 }}>PROJECTED PIPELINE</div>
            <div style={{ fontSize: '24px', fontWeight: 900, color: '#111', margin: '4px 0 10px' }}>
              ${currentScenario.pipeline_60d.toLocaleString()}
            </div>
            <div style={{ borderTop: '1px solid #EAE5DB', paddingTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', color: '#555' }}>Expected ARR / Rev:</span>
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#2F855A' }}>
                ${currentScenario.expected_revenue_60d.toLocaleString()}
              </span>
            </div>
          </div>

          {/* 90 Days */}
          <div
            style={{
              background: '#FFF',
              border: '1.5px solid #111',
              boxShadow: '3px 3px 0 #111',
              padding: '18px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, background: '#EAE5DB', padding: '2px 8px' }}>
                90-DAY OUTLOOK
              </span>
              <span style={{ fontSize: '12px', color: '#666', fontWeight: 700 }}>
                {currentScenario.accounts_90d} Accounts
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#666', fontWeight: 700 }}>PROJECTED PIPELINE</div>
            <div style={{ fontSize: '24px', fontWeight: 900, color: '#111', margin: '4px 0 10px' }}>
              ${currentScenario.pipeline_90d.toLocaleString()}
            </div>
            <div style={{ borderTop: '1px solid #EAE5DB', paddingTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', color: '#555' }}>Expected ARR / Rev:</span>
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#2F855A' }}>
                ${currentScenario.expected_revenue_90d.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Growth Levers */}
        <div style={{ background: '#FFF', border: '1.5px solid #111', padding: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px' }}>
            🚀 Recommended Levers to Hit Expected Targets:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {report.growth_levers.map((lever, i) => (
              <div key={i} style={{ fontSize: '13px', color: '#333', lineHeight: '1.5' }}>
                {lever}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5. Interactive Ask Growth Agent Section */}
      <div
        style={{
          background: '#FBF8F1',
          border: '1.5px solid #111',
          boxShadow: '6px 6px 0 #111',
          padding: '24px',
        }}
      >
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#666' }}>
            💬 Executive Consultation
          </div>
          <h3 style={{ margin: '2px 0 0', fontSize: '18px', fontWeight: 900, color: '#111' }}>
            Ask Vanguard Growth Agent
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#555' }}>
            Get real-time answers grounded in your active task completion rate, ICP velocity, and revenue scenarios.
          </p>
        </div>

        {/* Quick prompt buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
          {quickPrompts.map((qp, idx) => (
            <button
              key={idx}
              onClick={() => handleAskAgent(qp)}
              disabled={askingAgent}
              style={{
                padding: '6px 12px',
                background: '#FFF',
                border: '1.5px solid #111',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              💡 "{qp}"
            </button>
          ))}
        </div>

        {/* Input box */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <input
            type="text"
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAskAgent()}
            placeholder="Ask Vanguard anything about your growth velocity or milestone projections..."
            style={{
              flex: 1,
              padding: '12px 16px',
              border: '1.5px solid #111',
              background: '#FFF',
              fontSize: '14px',
              fontWeight: 500,
              outline: 'none',
            }}
          />
          <button
            onClick={() => handleAskAgent()}
            disabled={askingAgent || !userPrompt.trim()}
            style={{
              padding: '12px 24px',
              background: '#111',
              color: '#FFF',
              border: 'none',
              fontWeight: 800,
              fontSize: '13px',
              cursor: askingAgent ? 'not-allowed' : 'pointer',
              opacity: askingAgent ? 0.7 : 1,
            }}
          >
            {askingAgent ? 'Analyzing...' : 'Ask Vanguard →'}
          </button>
        </div>

        {/* Advisor Response Area */}
        {advisorResponse && (
          <div
            style={{
              background: '#FFF',
              border: '1.5px solid #111',
              boxShadow: '3px 3px 0 #111',
              padding: '20px',
              animation: 'fadeIn 0.3s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    background: '#111',
                    color: '#FFF',
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '2px 6px',
                  }}
                >
                  VANGUARD BRIEFING
                </span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#2F855A' }}>
                  Lift Potential: {advisorResponse.projected_lift}
                </span>
              </div>
            </div>

            <p style={{ margin: '0 0 16px', fontSize: '14px', lineHeight: '1.6', color: '#111', whiteSpace: 'pre-line' }}>
              {advisorResponse.advice}
            </p>

            {/* Referenced Metrics Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '10px',
                background: '#FBF8F1',
                padding: '12px',
                border: '1px solid #EAE5DB',
              }}
            >
              {Object.entries(advisorResponse.key_metrics_referenced).map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#666', textTransform: 'uppercase' }}>
                    {k.replace(/_/g, ' ')}
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#111' }}>{String(v)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

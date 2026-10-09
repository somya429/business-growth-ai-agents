import React from 'react';
import { PolicyResult } from '../../api/types';
import { ShieldCheck, ShieldAlert, CheckCircle, AlertOctagon, Terminal } from 'lucide-react';

interface WardenStripProps {
  policyResult: PolicyResult | null;
}

export const WardenStrip: React.FC<WardenStripProps> = ({ policyResult }) => {
  if (!policyResult) return null;

  const passed = policyResult.passed;

  return (
    <div
      className={`p-4 rounded-card border transition-all duration-300 ${
        passed
          ? 'bg-verified/5 border-verified/30 text-text'
          : 'bg-danger/5 border-danger/30 text-text'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            {passed ? (
              <ShieldCheck className="w-5 h-5 text-verified stroke-[1.5]" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-danger stroke-[1.5]" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif text-sm tracking-tight font-medium text-text">
                Warden Policy Gate
              </span>
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-surface border border-border text-text-muted flex items-center gap-1">
                <Terminal className="w-2.5 h-2.5 stroke-[1.5]" />
                Deterministic Rules
              </span>
              <span
                className={`text-xs font-semibold uppercase tracking-wider ${
                  passed ? 'text-verified' : 'text-danger'
                }`}
              >
                {passed ? 'PASS — ALL GATES CLEAR' : 'FAIL — POLICY VIOLATIONS DETECTED'}
              </span>
            </div>

            <p className="text-xs text-text-muted mt-1 leading-relaxed">
              {passed
                ? 'All anti-spam parameters, contact limits, quiet hours, and commercial warranty rules passed verification.'
                : 'Outbound dispatch is locked. Policy engine flagged critical commercial or safety rule breaches.'}
            </p>

            {/* Violations List */}
            {!passed && policyResult.violations.length > 0 && (
              <div className="mt-3 space-y-1.5">
                <span className="text-[11px] font-mono uppercase text-danger font-medium tracking-wider">
                  Active Violations:
                </span>
                <ul className="space-y-1">
                  {policyResult.violations.map((violation, idx) => (
                    <li
                      key={idx}
                      className="text-xs text-text bg-surface/80 p-2 rounded-[8px] border border-danger/20 flex items-start gap-2"
                    >
                      <AlertOctagon className="w-3.5 h-3.5 text-danger mt-0.5 stroke-[1.5] flex-shrink-0" />
                      <div>
                        <span className="font-mono text-[11px] text-danger font-medium">
                          {violation.rule}:{' '}
                        </span>
                        <span className="text-text-muted">{violation.detail}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Required Edits */}
            {!passed && policyResult.required_edits.length > 0 && (
              <div className="mt-2.5 space-y-1">
                <span className="text-[11px] font-mono uppercase text-warning font-medium tracking-wider">
                  Mandatory Edits to Clear Gate:
                </span>
                <ul className="text-xs text-text-muted list-disc list-inside space-y-0.5 pl-1">
                  {policyResult.required_edits.map((edit, idx) => (
                    <li key={idx}>{edit}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

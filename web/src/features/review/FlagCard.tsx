import React from 'react';
import { Flag, ClaimVerdict } from '../../api/types';
import { useAppStore } from '../../store/useAppStore';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  XCircle,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import { motion } from 'framer-motion';

interface FlagCardProps {
  flag: Flag;
  claimVerdict?: ClaimVerdict;
  onUpdateStatus: (flagId: string, status: 'accepted' | 'dismissed') => void;
  isLoading?: boolean;
}

const FRIENDLY_TITLES: Record<string, { title: string; fixSummary: string }> = {
  'flag-001': {
    title: 'Hallucinated Food Safety Cert (FSSAI)',
    fixSummary: 'Replaces with true SOC 2 Type II and ISO 27001 cloud security certs.',
  },
  'flag-002': {
    title: 'Price Underquote ($1,200 vs $2,800)',
    fixSummary: 'Corrects price to approved standard enterprise tier starting at $2,800/mo.',
  },
  'flag-003': {
    title: 'Unauthorized 2-Day Delivery Promise',
    fixSummary: 'Sets standard 10–14 business days onboarding SLA.',
  },
};

export const FlagCard: React.FC<FlagCardProps> = ({
  flag,
  claimVerdict,
  onUpdateStatus,
  isLoading = false,
}) => {
  const { selectedFlagId, setSelectedFlagId } = useAppStore();
  const isSelected = selectedFlagId === flag.id;
  const isResolved = flag.status !== 'open';
  const friendly = FRIENDLY_TITLES[flag.id] || {
    title: flag.category.replace('_', ' ').toUpperCase(),
    fixSummary: 'Reconcile statement with verified company documents.',
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25 }}
      id={`flag-${flag.id}`}
      onClick={() => setSelectedFlagId(flag.id)}
      className={`p-5 rounded-2xl border transition-all duration-200 cursor-pointer ${
        isSelected
          ? 'bg-surface border-accent shadow-[0_0_24px_rgba(212,175,55,0.25)] ring-1 ring-accent'
          : isResolved
          ? 'bg-surface/80 border-verified/40 opacity-90'
          : 'bg-surface-2 border-white/[0.08] hover:border-accent/40 shadow-sm'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          {isResolved ? (
            <CheckCircle2 className="w-4 h-4 text-verified" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-warning" />
          )}
          <span className="text-sm font-semibold text-text tracking-tight">
            {friendly.title}
          </span>
        </div>

        <Badge variant={isResolved ? 'verified' : 'warning'} size="sm">
          {isResolved ? 'RESOLVED' : 'ACTION REQUIRED'}
        </Badge>
      </div>

      {/* What the AI wrote */}
      <div className="space-y-1 mb-3">
        <span className="text-[10px] font-mono uppercase tracking-wider text-text-faint">
          What the AI Drafted:
        </span>
        <div className="p-3 rounded-xl bg-[#090D14] border border-white/[0.06] text-xs font-serif italic text-text-muted leading-relaxed">
          "{flag.sentence_text}"
        </div>
      </div>

      {/* Ground Truth Reality */}
      <div className="p-3 rounded-xl bg-accent/5 border border-accent/20 text-xs text-text-muted leading-relaxed mb-4">
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-accent mb-1 font-semibold">
          <BookOpen className="w-3.5 h-3.5" />
          <span>REALITY IN COMPANY DOCUMENTS</span>
        </div>
        <p className="text-[12px] text-text-muted leading-relaxed">
          {claimVerdict?.evidence || flag.reason}
        </p>
      </div>

      {/* Action Buttons */}
      {!isResolved ? (
        <div className="flex items-center gap-2.5 pt-1">
          <Button
            variant="verified"
            size="md"
            className="flex-1 text-xs font-medium"
            onClick={(e) => {
              e.stopPropagation();
              onUpdateStatus(flag.id, 'accepted');
            }}
            isLoading={isLoading}
            leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
          >
            Apply Verified Fix
          </Button>

          <Button
            variant="secondary"
            size="md"
            className="text-xs"
            onClick={(e) => {
              e.stopPropagation();
              onUpdateStatus(flag.id, 'dismissed');
            }}
            isLoading={isLoading}
          >
            Dismiss
          </Button>
        </div>
      ) : (
        <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between text-xs">
          <span className="text-verified font-medium flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Claim verified & corrected in email draft
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onUpdateStatus(flag.id, 'open' as any);
            }}
            className="text-text-faint hover:text-accent text-[11px] font-mono flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" /> Undo
          </button>
        </div>
      )}
    </motion.div>
  );
};

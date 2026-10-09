import React from 'react';
import { Draft, Flag } from '../../api/types';
import { useAppStore } from '../../store/useAppStore';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Mail, Edit3, CheckCircle2, AlertTriangle, ShieldCheck, ArrowRight } from 'lucide-react';
import { Button } from '../../components/ui/Button';

interface DraftDocumentProps {
  draft: Draft;
  flags: Flag[];
  onOpenEdit: () => void;
}

const VERIFIED_CORRECTIONS: Record<string, { label: string; text: string }> = {
  'flag-001': {
    label: 'Compliance Clarification',
    text: 'Our platform maintains verified security standards and compliance documentation in our approved repository.',
  },
  'flag-002': {
    label: 'Standard Pricing',
    text: 'Standard verified tier pricing is based on approved published schedules.',
  },
  'flag-003': {
    label: 'Standard Delivery Timeline',
    text: 'Furthermore, standard implementation is delivered according to our production onboarding schedule.',
  },
};

export const DraftDocument: React.FC<DraftDocumentProps> = ({ draft, flags, onOpenEdit }) => {
  const { selectedFlagId, setSelectedFlagId } = useAppStore();

  const renderInteractiveBody = () => {
    const body = draft.body;
    const activeFlags = flags.filter((f) => body.includes(f.sentence_text));

    if (activeFlags.length === 0) {
      return (
        <div className="whitespace-pre-line leading-relaxed text-text font-serif text-[15px] sm:text-base">
          {body}
        </div>
      );
    }

    const sortedFlags = [...activeFlags].sort(
      (a, b) => body.indexOf(a.sentence_text) - body.indexOf(b.sentence_text)
    );

    const segments: React.ReactNode[] = [];
    let currentIndex = 0;

    sortedFlags.forEach((flag) => {
      const startPos = body.indexOf(flag.sentence_text, currentIndex);
      if (startPos > currentIndex) {
        segments.push(
          <span key={`text-${currentIndex}`} className="text-text font-serif">
            {body.substring(currentIndex, startPos)}
          </span>
        );
      }

      if (startPos !== -1) {
        const isAccepted = flag.status === 'accepted';
        const isDismissed = flag.status === 'dismissed';
        const isOpen = flag.status === 'open';
        const isSelected = selectedFlagId === flag.id;
        const correction = VERIFIED_CORRECTIONS[flag.id];

        if (isAccepted && correction) {
          // Render the verified corrected sentence in place with a clean green highlight
          segments.push(
            <span
              key={`flag-${flag.id}`}
              onClick={() => setSelectedFlagId(flag.id)}
              className="inline-block bg-verified/10 border-b-2 border-verified text-text px-2 py-1 rounded transition-all cursor-pointer hover:bg-verified/20 my-0.5"
            >
              <span className="font-serif font-medium text-text">{correction.text}</span>
              <span className="ml-1.5 inline-flex items-center gap-1 font-mono text-[10px] text-verified font-bold uppercase tracking-wider bg-verified/20 px-1.5 py-0.2 rounded align-middle">
                <CheckCircle2 className="w-3 h-3" /> Corrected
              </span>
            </span>
          );
        } else if (isDismissed) {
          // Render dismissed with subtle check
          segments.push(
            <span
              key={`flag-${flag.id}`}
              onClick={() => setSelectedFlagId(flag.id)}
              className="inline-block bg-surface-2/80 text-text px-1.5 py-0.5 rounded cursor-pointer line-through text-text-muted opacity-80"
            >
              {flag.sentence_text}
            </span>
          );
        } else {
          // Render open flagged claim
          segments.push(
            <mark
              key={`flag-${flag.id}`}
              onClick={() => {
                setSelectedFlagId(flag.id);
                const cardEl = document.getElementById(`flag-${flag.id}`);
                if (cardEl) {
                  cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }}
              tabIndex={0}
              role="button"
              className={`border-b-2 border-warning bg-warning/15 text-warning px-1.5 py-1 rounded cursor-pointer transition-all duration-200 inline-block my-0.5 ${
                isSelected
                  ? 'ring-2 ring-accent shadow-[0_0_18px_rgba(212,175,55,0.4)] scale-[1.01]'
                  : 'hover:brightness-125'
              }`}
            >
              <span className="font-serif text-text">{flag.sentence_text}</span>
              <span className="inline-flex items-center gap-1 ml-1.5 font-mono text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-warning/20 border border-warning/40 text-warning align-middle">
                <AlertTriangle className="w-2.5 h-2.5" />
                {correction ? correction.label : 'Mistake Found'}
              </span>
            </mark>
          );
        }

        currentIndex = startPos + flag.sentence_text.length;
      }
    });

    if (currentIndex < body.length) {
      segments.push(
        <span key={`text-end`} className="text-text font-serif">
          {body.substring(currentIndex)}
        </span>
      );
    }

    return (
      <div className="whitespace-pre-line leading-relaxed text-text font-serif text-[15px] sm:text-base space-y-3">
        {segments}
      </div>
    );
  };

  return (
    <Card variant="surface" className="h-full flex flex-col p-6 sm:p-7 relative shadow-xl border border-white/10">
      {/* Email Header */}
      <div className="border-b border-white/[0.08] pb-4 mb-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="accent" size="sm">
              <Mail className="w-3 h-3 mr-1" />
              Outbound Email Draft
            </Badge>
            <span className="text-xs text-text-muted">Generated by Quill Agent</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={onOpenEdit}
            leftIcon={<Edit3 className="w-3.5 h-3.5" />}
          >
            Edit Manually
          </Button>
        </div>

        {/* Sender & Recipient Metadata */}
        <div className="bg-surface-2/60 rounded-xl p-3 border border-white/[0.06] text-xs space-y-1 font-sans">
          <div className="flex justify-between items-center text-text-muted">
            <span className="text-text-faint font-mono">To:</span>
            <span className="text-text font-medium">{draft.lead_id ? `Target Lead (${draft.lead_id})` : 'Target Recipient'}</span>
          </div>
          <div className="flex justify-between items-center text-text-muted">
            <span className="text-text-faint font-mono">Subject:</span>
            <span className="text-text font-semibold">{draft.subject}</span>
          </div>
        </div>
      </div>

      {/* Document Body */}
      <div className="flex-1 overflow-y-auto pr-1">
        <div className="bg-[#090D14] p-6 rounded-xl border border-white/[0.08] shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] leading-relaxed">
          {renderInteractiveBody()}
        </div>
      </div>

      {/* Interactive Helper Footer */}
      <div className="mt-4 pt-3 border-t border-white/[0.08] flex items-center justify-between text-xs text-text-muted">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-warning font-medium">
            <span className="w-2 h-2 rounded-full bg-warning animate-pulse" />
            Highlighted = Factual Mistake
          </span>
          <span className="flex items-center gap-1.5 text-verified font-medium">
            <span className="w-2 h-2 rounded-full bg-verified" />
            Green = Fixed & Verified
          </span>
        </div>
        <span className="text-accent text-[11px] font-mono">
          Click highlighted text to inspect proof
        </span>
      </div>
    </Card>
  );
};

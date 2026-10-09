import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../components/ui/Button';
import { Send, ShieldCheck, AlertCircle, X } from 'lucide-react';

interface ApprovalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting?: boolean;
  recipientEmail?: string;
  channel?: string;
}

export const ApprovalDialog: React.FC<ApprovalDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting = false,
  recipientEmail = 'prospect@verified-target.com',
  channel = 'EMAIL',
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/75 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-lg bg-surface border border-border rounded-card shadow-2xl p-6 z-10 space-y-5"
        >
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center text-accent">
                <Send className="w-5 h-5 stroke-[1.5]" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-normal text-text">Confirm Dispatch Authorization</h3>
                <span className="text-xs text-text-muted">Human Approval Consensus Gate</span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-text-muted hover:text-text p-1.5 rounded-lg hover:bg-surface-2 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4 stroke-[1.5]" />
            </button>
          </div>

          {/* Core Warning & Clarification */}
          <div className="p-4 rounded-card bg-surface-2 border border-border space-y-2">
            <div className="text-xs font-semibold tracking-wide uppercase text-accent flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-accent stroke-[1.5]" />
              <span>Single Point of Transmission</span>
            </div>
            <p className="text-sm font-serif text-text leading-relaxed">
              "Courier will send this message. This is the only step that sends."
            </p>
            <p className="text-xs text-text-muted leading-relaxed">
              Once authorized, the mock delivery receipt will be stamped with cryptographic
              signatures, and inbound response observation (Echo) will be scheduled.
            </p>
          </div>

          {/* Dispatch metadata summary */}
          <div className="text-xs space-y-1.5 font-mono bg-surface-2/40 p-3 rounded-[8px] border border-border">
            <div className="flex justify-between">
              <span className="text-text-faint">Recipient:</span>
              <span className="text-text font-medium">{recipientEmail}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-faint">Channel:</span>
              <span className="text-text font-medium">{channel.toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-faint">Trust Verification:</span>
              <span className="text-verified font-medium">100% CLEAR / PASS</span>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <Button variant="ghost" size="md" onClick={onClose} disabled={isSubmitting}>
              Return to Review
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={onConfirm}
              isLoading={isSubmitting}
              leftIcon={<Send className="w-4 h-4 stroke-[1.5]" />}
            >
              Authorize Dispatch
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

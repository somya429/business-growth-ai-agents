import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../components/ui/Button';
import { X, Sparkles, RefreshCw } from 'lucide-react';

interface InlineDraftEditorProps {
  isOpen: boolean;
  onClose: () => void;
  initialBody: string;
  onSave: (editedText: string) => void;
  isSaving?: boolean;
}

export const InlineDraftEditor: React.FC<InlineDraftEditorProps> = ({
  isOpen,
  onClose,
  initialBody,
  onSave,
  isSaving = false,
}) => {
  const [text, setText] = useState(initialBody);

  // Sync initial body on open
  React.useEffect(() => {
    setText(initialBody);
  }, [initialBody, isOpen]);

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
          className="fixed inset-0 bg-black/70 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-2xl bg-surface border border-border rounded-card shadow-2xl p-6 z-10 flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
            <div>
              <h3 className="font-serif text-xl font-normal text-text">Refine Draft Copy</h3>
              <p className="text-xs text-text-muted mt-0.5">
                Modifications will automatically trigger an incremental Veritas & Warden trust re-audit.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-text-muted hover:text-text p-1.5 rounded-lg hover:bg-surface-2 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4 stroke-[1.5]" />
            </button>
          </div>

          {/* Text Area */}
          <div className="flex-1 min-h-[260px] relative">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={isSaving}
              rows={12}
              className="w-full h-full p-4 rounded-[10px] bg-surface-2 border border-border focus:border-accent font-serif text-[15px] leading-relaxed text-text resize-none outline-none focus:ring-1 focus:ring-accent"
              placeholder="Enter message body copy..."
            />
          </div>

          {/* Suggested Fix Hint */}
          <div className="mt-4 p-3 rounded-[8px] bg-accent/5 border border-accent/20 text-xs text-text-muted flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-accent stroke-[1.5] mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-accent font-medium">Quick Recommendation:</span> Replace
              unverified $1,200/mo and FSSAI claims with approved SOC 2 Type II language and standard
              enterprise consultation framing.
            </div>
          </div>

          {/* Footer Actions */}
          <div className="mt-5 pt-4 border-t border-border flex items-center justify-end gap-3">
            <Button variant="ghost" size="md" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => onSave(text)}
              isLoading={isSaving}
              leftIcon={<RefreshCw className="w-4 h-4 stroke-[1.5]" />}
            >
              Save & Re-run Audit
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

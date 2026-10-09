import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useAppStore();

  const iconMap = {
    success: <CheckCircle2 className="w-4 h-4 text-verified stroke-[1.5]" />,
    warning: <AlertTriangle className="w-4 h-4 text-warning stroke-[1.5]" />,
    danger: <AlertCircle className="w-4 h-4 text-danger stroke-[1.5]" />,
    info: <Info className="w-4 h-4 text-accent stroke-[1.5]" />,
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-auto p-4 rounded-card bg-surface border border-border shadow-xl flex items-start gap-3"
            role="alert"
          >
            <div className="mt-0.5">{iconMap[toast.type]}</div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-medium text-text leading-tight">{toast.title}</h4>
              {toast.message && <p className="text-xs text-text-muted mt-0.5 leading-relaxed">{toast.message}</p>}
            </div>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="text-text-faint hover:text-text p-1 transition-colors cursor-pointer"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5 stroke-[1.5]" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

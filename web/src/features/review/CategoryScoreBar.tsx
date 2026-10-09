import React from 'react';
import { motion } from 'framer-motion';

interface CategoryScoreBarProps {
  label: string;
  value: number; // 0.0 to 1.0
}

export const CategoryScoreBar: React.FC<CategoryScoreBarProps> = ({ label, value }) => {
  const percentage = Math.round(value * 100);

  const getBarColor = (val: number) => {
    if (val >= 0.85) return 'bg-verified';
    if (val >= 0.6) return 'bg-warning';
    return 'bg-danger';
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-text-muted capitalize font-normal">{label}</span>
        <span className="font-mono text-[11px] text-text font-medium">{percentage}%</span>
      </div>
      <div className="h-1.5 w-full bg-surface-2 rounded-full overflow-hidden border border-border/60">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className={`h-full rounded-full ${getBarColor(value)}`}
        />
      </div>
    </div>
  );
};

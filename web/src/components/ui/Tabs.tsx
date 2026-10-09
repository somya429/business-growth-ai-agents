import React from 'react';
import { motion } from 'framer-motion';

export interface TabOption {
  id: string;
  label: string;
  count?: number | string;
}

export interface TabsProps {
  options: TabOption[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ options, activeTab, onChange, className = '' }) => {
  return (
    <div className={`flex items-center gap-1 p-1 bg-surface-2 rounded-[10px] border border-border ${className}`}>
      {options.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`relative px-3.5 py-1.5 text-xs font-medium rounded-[7px] transition-colors duration-200 cursor-pointer flex items-center gap-2 ${
              isActive ? 'text-text' : 'text-text-muted hover:text-text'
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute inset-0 bg-surface rounded-[7px] border border-border shadow-[0_1px_3px_rgba(0,0,0,0.3)]"
                transition={{ type: 'spring', stiffness: 450, damping: 35 }}
              />
            )}
            <span className="relative z-10">{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`relative z-10 text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isActive ? 'bg-accent/15 text-accent' : 'bg-surface/60 text-text-faint'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

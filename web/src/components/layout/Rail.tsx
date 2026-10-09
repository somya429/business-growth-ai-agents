import React from 'react';
import { NavLink, useParams } from 'react-router-dom';
import {
  Compass,
  ShieldCheck,
  TrendingUp,
  Bot,
  Building2,
  LayoutGrid,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { Tooltip } from '../ui/Tooltip';

export const Rail: React.FC = () => {
  const { activeRunId } = useAppStore();

  const navItems = [
    {
      to: '/',
      label: 'Company & Documents',
      icon: <Building2 className="w-5 h-5 stroke-[1.5]" />,
    },
    {
      to: `/run/${activeRunId}`,
      label: 'AI Pipeline',
      icon: <Compass className="w-5 h-5 stroke-[1.5]" />,
    },
    {
      to: `/run/${activeRunId}/review`,
      label: 'Fact-Check Review Desk',
      icon: <ShieldCheck className="w-5 h-5 stroke-[1.5]" />,
    },
    {
      to: `/run/${activeRunId}/results`,
      label: 'Results & Sent Emails',
      icon: <TrendingUp className="w-5 h-5 stroke-[1.5]" />,
    },
    {
      to: '/agents',
      label: '48 Agents Directory',
      icon: <Bot className="w-5 h-5 stroke-[1.5]" />,
    },
    {
      to: '/dev/gallery',
      label: 'Design System',
      icon: <LayoutGrid className="w-5 h-5 stroke-[1.5]" />,
    },
  ];

  return (
    <aside className="w-16 flex-shrink-0 bg-surface border-r border-border flex flex-col items-center py-5 z-30 select-none">
      {/* Brand Mark */}
      <NavLink
        to="/"
        className="w-10 h-10 rounded-[10px] bg-accent/10 border border-accent/30 flex items-center justify-center text-accent font-serif font-semibold text-lg tracking-wider mb-8 hover:bg-accent/20 transition-colors"
        aria-label="Verity Home"
      >
        V
      </NavLink>

      {/* Nav Items */}
      <nav className="flex-1 flex flex-col gap-3 w-full px-2">
        {navItems.map((item) => (
          <Tooltip key={item.to} content={item.label} position="right">
            <NavLink
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `w-12 h-11 mx-auto rounded-[10px] flex items-center justify-center transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-accent/15 text-accent border border-accent/40 shadow-[0_0_12px_rgba(201,169,110,0.15)]'
                    : 'text-text-muted hover:text-text hover:bg-surface-2 border border-transparent'
                }`
              }
              aria-label={item.label}
            >
              {item.icon}
            </NavLink>
          </Tooltip>
        ))}
      </nav>

      {/* Bottom Hint */}
      <div className="text-[10px] text-text-faint font-mono tracking-widest text-center uppercase">
        v1.0
      </div>
    </aside>
  );
};

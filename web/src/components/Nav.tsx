import React, { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Menu,
  X,
  Compass,
  ShieldCheck,
  Building,
  ChevronDown,
  Check,
  AlertTriangle,
  Sliders,
  TrendingUp,
  Layers,
  Calendar,
  PlusCircle,
} from 'lucide-react';
import { Button } from './Button';
import { api } from '../api/client';
import { useAppStore } from '../store/useAppStore';

export const Nav: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isDevTools = import.meta.env.VITE_DEV_TOOLS === '1';

  const {
    activeBusinessId,
    setActiveBusinessId,
    activeRunId,
    setActiveRunId,
    addToast,
  } = useAppStore();

  const { data: businesses = [] } = useQuery({
    queryKey: ['businesses'],
    queryFn: () => api.listBusinesses(),
  });

  const currentBusiness = businesses.find((b) => b.id === activeBusinessId) || businesses[0] || null;

  const switchMutation = useMutation({
    mutationFn: (id: string) => api.switchBusiness(id),
    onSuccess: (biz) => {
      setActiveBusinessId(biz.id);
      setDropdownOpen(false);
      queryClient.invalidateQueries();
      addToast({
        type: 'info',
        title: `Switched context to ${biz.name}`,
        message: `Loaded ${biz.industry} knowledge repository and guidelines.`,
      });
    },
  });

  // Start Flawed Demo (Dev Tools only)
  const startFlawedRunMutation = useMutation({
    mutationFn: () => {
      if (!activeBusinessId) throw new Error('No active business');
      return api.startRun(activeBusinessId, null, true);
    },
    onSuccess: (newRunId) => {
      setActiveRunId(newRunId);
      queryClient.invalidateQueries();
      navigate(`/run/${newRunId}/review`);
      addToast({
        type: 'warning',
        title: 'Planted-Flaw Demo Loaded',
        message: '3 factual discrepancies flagged for Veritas and Warden review.',
      });
    },
  });

  return (
    <header className="w-full border-b border-border bg-bg/95 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-10 h-20 flex items-center justify-between gap-3">
        {/* Left: Wordmark + Business Switcher */}
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="flex items-center gap-2 font-serif text-[26px] font-light text-accent tracking-[-0.02em] select-none hover:opacity-90 transition-opacity"
            aria-label="Verity Home"
          >
            Verity
          </Link>

          {/* Active Business Switcher Dropdown */}
          {businesses.length === 0 ? (
            <Link
              to="/onboard"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-accent-soft border border-accent/30 text-xs text-accent font-medium hover:border-accent transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Create business</span>
            </Link>
          ) : (
            <div className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-surface border border-border hover:border-accent/40 text-xs text-text cursor-pointer transition-colors"
                title="Switch Active Business Profile"
              >
                <Building className="w-3.5 h-3.5 text-accent stroke-[1.5]" />
                <span className="max-w-[130px] sm:max-w-[160px] truncate font-sans font-medium text-xs">
                  {currentBusiness?.name || 'Select Business'}
                </span>
                <ChevronDown className={`w-3 h-3 text-muted transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {dropdownOpen && (
                <div className="absolute left-0 mt-2 w-72 rounded-md bg-surface border border-border shadow-2xl p-2 z-50 animate-in fade-in duration-150">
                  <div className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-muted border-b border-border mb-1 flex items-center justify-between">
                    <span>Active Business Context</span>
                    <button
                      type="button"
                      onClick={() => {
                        setDropdownOpen(false);
                        navigate('/onboard');
                      }}
                      className="text-accent hover:underline lowercase font-sans cursor-pointer text-[11px]"
                    >
                      + add
                    </button>
                  </div>
                  {businesses.map((biz) => {
                    const isSelected = biz.id === activeBusinessId;
                    return (
                      <button
                        key={biz.id}
                        type="button"
                        onClick={() => switchMutation.mutate(biz.id)}
                        className={`w-full text-left px-2.5 py-2 rounded transition-colors flex items-center justify-between text-xs cursor-pointer ${
                          isSelected ? 'bg-accent/15 text-accent font-medium' : 'hover:bg-surface-2 text-text'
                        }`}
                      >
                        <div className="truncate">
                          <div className="truncate">{biz.name}</div>
                          <div className="text-[10px] text-muted truncate">{biz.industry}</div>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-accent ml-2 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Desktop Nav Links */}
        <nav className="hidden lg:flex items-center gap-4 xl:gap-6">
          <NavLink
            to="/orchestrator"
            className={({ isActive }) =>
              `text-[14px] font-sans flex items-center gap-1.5 transition-colors ${
                isActive ? 'text-accent font-medium' : 'text-text hover:text-accent'
              }`
            }
          >
            <Compass className="w-3.5 h-3.5 stroke-[1.5]" />
            Orchestrator
          </NavLink>

          <NavLink
            to="/plan"
            className={({ isActive }) =>
              `text-[14px] font-sans flex items-center gap-1.5 transition-colors ${
                isActive ? 'text-accent font-medium' : 'text-text hover:text-accent'
              }`
            }
          >
            <Calendar className="w-3.5 h-3.5 stroke-[1.5]" />
            Plan
          </NavLink>

          <NavLink
            to="/tasks"
            className={({ isActive }) =>
              `text-[14px] font-sans flex items-center gap-1.5 transition-colors ${
                isActive ? 'text-accent font-medium' : 'text-text hover:text-accent'
              }`
            }
          >
            <Layers className="w-3.5 h-3.5 stroke-[1.5]" />
            Tasks
          </NavLink>

          <NavLink
            to="/review"
            className={({ isActive }) =>
              `text-[14px] font-sans flex items-center gap-1.5 transition-colors ${
                isActive ? 'text-accent font-medium' : 'text-text hover:text-accent'
              }`
            }
          >
            <ShieldCheck className="w-3.5 h-3.5 stroke-[1.5]" />
            Review Desk
          </NavLink>

          <NavLink
            to="/agents"
            className={({ isActive }) =>
              `text-[14px] font-sans transition-colors ${
                isActive ? 'text-accent font-medium' : 'text-text hover:text-accent'
              }`
            }
          >
            Agents
          </NavLink>

          <NavLink
            to="/onboard"
            className={({ isActive }) =>
              `text-[14px] font-sans flex items-center gap-1.5 transition-colors ${
                isActive ? 'text-accent font-medium' : 'text-text hover:text-accent'
              }`
            }
          >
            <Sliders className="w-3.5 h-3.5 stroke-[1.5]" />
            Company & ICP
          </NavLink>

          <NavLink
            to="/results"
            className={({ isActive }) =>
              `text-[14px] font-sans flex items-center gap-1.5 transition-colors ${
                isActive ? 'text-accent font-medium' : 'text-text hover:text-accent'
              }`
            }
          >
            <TrendingUp className="w-3.5 h-3.5 stroke-[1.5]" />
            Results
          </NavLink>

          <NavLink
            to="/how"
            className={({ isActive }) =>
              `text-[14px] font-sans transition-colors ${
                isActive ? 'text-accent font-medium' : 'text-text hover:text-accent'
              }`
            }
          >
            How it works
          </NavLink>

          <NavLink
            to="/trust"
            className={({ isActive }) =>
              `text-[14px] font-sans transition-colors ${
                isActive ? 'text-accent font-medium' : 'text-text hover:text-accent'
              }`
            }
          >
            Trust
          </NavLink>

          <NavLink
            to="/industries"
            className={({ isActive }) =>
              `text-[14px] font-sans transition-colors ${
                isActive ? 'text-accent font-medium' : 'text-text hover:text-accent'
              }`
            }
          >
            Industries
          </NavLink>

          <NavLink
            to="/workspace"
            className={({ isActive }) =>
              `text-[14px] font-sans transition-colors ${
                isActive ? 'text-accent font-medium' : 'text-text hover:text-accent'
              }`
            }
          >
            Studio
          </NavLink>
        </nav>

        {/* Right Action: Dev Tool Pill (if enabled) + Work with Agents Button */}
        <div className="hidden sm:flex items-center gap-3">
          {isDevTools && (
            <button
              type="button"
              onClick={() => startFlawedRunMutation.mutate()}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] font-sans font-medium text-amber-300 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 transition-all cursor-pointer"
              title="Dev: Load demo with flagged factual errors"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Dev Review</span>
            </button>
          )}

          <Button variant="primary" size="sm" to="/workspace">
            Work with Agents
          </Button>
        </div>

        {/* Mobile Toggle Button */}
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="lg:hidden p-2 text-text hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
          aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="w-6 h-6 stroke-[1.5]" /> : <Menu className="w-6 h-6 stroke-[1.5]" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden border-b border-border bg-bg px-6 py-5 space-y-3">
          <nav className="flex flex-col space-y-2.5">
            <NavLink
              to="/orchestrator"
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `text-[15px] font-sans py-1 flex items-center gap-2 transition-colors ${
                  isActive ? 'text-accent font-medium' : 'text-text'
                }`
              }
            >
              <Compass className="w-4 h-4 stroke-[1.5]" />
              Orchestrator
            </NavLink>
            <NavLink
              to="/plan"
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `text-[15px] font-sans py-1 flex items-center gap-2 transition-colors ${
                  isActive ? 'text-accent font-medium' : 'text-text'
                }`
              }
            >
              <Calendar className="w-4 h-4 stroke-[1.5]" />
              Plan
            </NavLink>
            <NavLink
              to="/tasks"
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `text-[15px] font-sans py-1 flex items-center gap-2 transition-colors ${
                  isActive ? 'text-accent font-medium' : 'text-text'
                }`
              }
            >
              <Layers className="w-4 h-4 stroke-[1.5]" />
              Tasks
            </NavLink>
            <NavLink
              to="/review"
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `text-[15px] font-sans py-1 flex items-center gap-2 transition-colors ${
                  isActive ? 'text-accent font-medium' : 'text-text'
                }`
              }
            >
              <ShieldCheck className="w-4 h-4 stroke-[1.5]" />
              Review & Approval Desk
            </NavLink>
            <NavLink
              to="/agents"
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `text-[15px] font-sans py-1 transition-colors ${
                  isActive ? 'text-accent font-medium' : 'text-text'
                }`
              }
            >
              Agents
            </NavLink>
            <NavLink
              to="/onboard"
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `text-[15px] font-sans py-1 flex items-center gap-2 transition-colors ${
                  isActive ? 'text-accent font-medium' : 'text-text'
                }`
              }
            >
              <Sliders className="w-4 h-4 stroke-[1.5]" />
              Company & ICP
            </NavLink>
            <NavLink
              to="/results"
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `text-[15px] font-sans py-1 flex items-center gap-2 transition-colors ${
                  isActive ? 'text-accent font-medium' : 'text-text'
                }`
              }
            >
              <TrendingUp className="w-4 h-4 stroke-[1.5]" />
              Results
            </NavLink>
            <NavLink
              to="/workspace"
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `text-[15px] font-sans py-1 transition-colors ${
                  isActive ? 'text-accent font-medium' : 'text-text'
                }`
              }
            >
              Studio
            </NavLink>
          </nav>
          <div className="pt-3 border-t border-border flex flex-col gap-2">
            <Button variant="primary" size="sm" to="/workspace" className="w-full" onClick={() => setMobileOpen(false)}>
              Work with Agents
            </Button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Nav;

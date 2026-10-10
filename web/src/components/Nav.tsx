import React, { useState } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
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
  Cpu,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Button } from './Button';
import { api } from '../api/client';
import { useAppStore } from '../store/useAppStore';

export const Nav: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [platformOpen, setPlatformOpen] = useState(false);
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

  // Automatically select first business if activeBusinessId is unset
  React.useEffect(() => {
    if (!activeBusinessId && businesses.length > 0) {
      setActiveBusinessId(businesses[0].id);
    }
  }, [businesses, activeBusinessId, setActiveBusinessId]);

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

  const { pathname } = useLocation();
  const isLanding = pathname === '/' || pathname === '/home';

  if (isLanding) {
    return (
      <header className="w-full border-b border-[var(--ink)] bg-[var(--bg)] sticky top-0 z-40">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 md:px-8 h-20 flex items-center justify-between gap-4">
          <Link to="/" className="logo" aria-label="Verity Home">
            VERITY
          </Link>

          <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-[var(--ink)]">
            <a href="#how" className="hover:text-[var(--accent)] transition-colors">
              How it works
            </a>
            <a href="#team" className="hover:text-[var(--accent)] transition-colors">
              AI Team
            </a>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/onboard" className="btn solid small">
              Start for free <span className="arrow">→</span>
            </Link>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="w-full border-b border-[var(--ink)] bg-[var(--bg)] sticky top-0 z-40">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-10 h-20 flex items-center justify-between gap-3">
        {/* Left: Wordmark + Business Switcher + Create Business Action */}
        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            to="/"
            className="logo"
            aria-label="Verity Home"
          >
            VERITY
          </Link>

          {/* Active Business Switcher Dropdown */}
          {businesses.length === 0 ? (
            <Link
              to="/onboard?mode=new"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--ink)] bg-[var(--paper)] text-xs text-[var(--ink)] font-semibold hover:bg-[var(--tint)] transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>Create business</span>
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-surface border border-border hover:border-accent/40 text-xs text-text cursor-pointer transition-colors"
                  title="Switch Active Business Profile"
                >
                  <Building className="w-3.5 h-3.5 text-accent stroke-[1.5]" />
                  <span className="max-w-[120px] sm:max-w-[160px] truncate font-sans font-medium text-xs">
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
                          navigate('/onboard?mode=new');
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

              {/* Always-accessible Quick Create Business Link */}
              <Link
                to="/onboard?mode=new"
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-dashed border-[var(--ink)]/40 hover:border-[var(--accent)] text-xs text-[var(--ink)] hover:text-[var(--accent)] font-semibold transition-colors"
                title="Create a new business profile"
              >
                <PlusCircle className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>New Business</span>
              </Link>
            </div>
          )}
        </div>

        {/* Desktop Nav Links: 5 Core Hubs + Company & ICP + Platform */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
          <NavLink
            to="/command"
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-md text-[13px] font-sans font-medium flex items-center gap-2 transition-all ${
                isActive
                  ? 'bg-amber-500/20 text-amber-500 border border-amber-500/40 shadow-sm font-semibold'
                  : 'text-text hover:text-amber-500 hover:bg-amber-500/10'
              }`
            }
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Apex Command</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </NavLink>

          <NavLink
            to="/orchestrator"
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-md text-[13px] font-sans font-medium flex items-center gap-2 transition-all ${
                isActive
                  ? 'bg-accent/15 text-accent border border-accent/30 shadow-sm'
                  : 'text-text hover:text-accent hover:bg-surface-2'
              }`
            }
          >
            <Compass className="w-3.5 h-3.5 text-accent" />
            <span>Mission Control</span>
          </NavLink>

          <NavLink
            to="/agents"
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-md text-[13px] font-sans font-medium flex items-center gap-2 transition-all ${
                isActive
                  ? 'bg-accent/15 text-accent border border-accent/30 shadow-sm'
                  : 'text-text hover:text-accent hover:bg-surface-2'
              }`
            }
          >
            <Cpu className="w-3.5 h-3.5 text-accent" />
            <span>Agent Fleet</span>
          </NavLink>

          <NavLink
            to="/workspace"
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-md text-[13px] font-sans font-medium flex items-center gap-2 transition-all ${
                isActive
                  ? 'bg-accent/15 text-accent border border-accent/30 shadow-sm'
                  : 'text-text hover:text-accent hover:bg-surface-2'
              }`
            }
          >
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            <span>Growth Studio</span>
          </NavLink>

          <NavLink
            to="/review"
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-md text-[13px] font-sans font-medium flex items-center gap-2 transition-all ${
                isActive
                  ? 'bg-accent/15 text-accent border border-accent/30 shadow-sm'
                  : 'text-text hover:text-accent hover:bg-surface-2'
              }`
            }
          >
            <ShieldCheck className="w-3.5 h-3.5 text-accent" />
            <span>Governance Desk</span>
          </NavLink>

          <NavLink
            to="/onboard"
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-md text-[13px] font-sans font-medium flex items-center gap-2 transition-all ${
                isActive
                  ? 'bg-accent/15 text-accent border border-accent/30 shadow-sm'
                  : 'text-text hover:text-accent hover:bg-surface-2'
              }`
            }
          >
            <Sliders className="w-3.5 h-3.5 text-accent" />
            <span>Company & ICP</span>
          </NavLink>

          {/* Platform Reference Dropdown */}
          <div className="relative ml-2">
            <button
              type="button"
              onClick={() => setPlatformOpen(!platformOpen)}
              className={`px-2.5 py-1.5 rounded-md text-[13px] font-sans flex items-center gap-1.5 transition-colors cursor-pointer ${
                platformOpen ? 'text-accent bg-surface-2' : 'text-muted hover:text-text'
              }`}
            >
              <span>Platform</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${platformOpen ? 'rotate-180' : ''}`} />
            </button>
            {platformOpen && (
              <div 
                className="absolute right-0 mt-2 w-48 rounded-lg bg-surface border border-border shadow-2xl p-1.5 z-50 animate-in fade-in duration-150"
                onMouseLeave={() => setPlatformOpen(false)}
              >
                <Link
                  to="/how"
                  onClick={() => setPlatformOpen(false)}
                  className="block px-3 py-2 text-xs rounded hover:bg-surface-2 text-text transition-colors"
                >
                  <div className="font-medium">How It Works</div>
                  <div className="text-[10px] text-muted">Architecture & DAG runner</div>
                </Link>
                <Link
                  to="/trust"
                  onClick={() => setPlatformOpen(false)}
                  className="block px-3 py-2 text-xs rounded hover:bg-surface-2 text-text transition-colors"
                >
                  <div className="font-medium">Trust & Safety</div>
                  <div className="text-[10px] text-muted">HITL & factual grounding</div>
                </Link>
                <Link
                  to="/industries"
                  onClick={() => setPlatformOpen(false)}
                  className="block px-3 py-2 text-xs rounded hover:bg-surface-2 text-text transition-colors"
                >
                  <div className="font-medium">Industry Blueprints</div>
                  <div className="text-[10px] text-muted">Vertical playbook designs</div>
                </Link>
              </div>
            )}
          </div>
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
          <nav className="flex flex-col space-y-1">
            <div className="text-[11px] font-mono uppercase tracking-wider text-muted px-2 py-1">Core Workspaces</div>
            <NavLink
              to="/command"
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `text-[14px] font-sans px-2.5 py-1.5 rounded-md flex items-center gap-2.5 transition-colors ${
                  isActive ? 'bg-amber-500/20 text-amber-500 font-semibold' : 'text-amber-500 hover:bg-surface-2'
                }`
              }
            >
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Apex Command (Head Orchestrator)</span>
            </NavLink>
            <NavLink
              to="/orchestrator"
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `text-[14px] font-sans px-2.5 py-1.5 rounded-md flex items-center gap-2.5 transition-colors ${
                  isActive ? 'bg-accent/15 text-accent font-medium' : 'text-text hover:bg-surface-2'
                }`
              }
            >
              <Compass className="w-4 h-4 text-accent" />
              <span>Mission Control</span>
            </NavLink>
            <NavLink
              to="/agents"
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `text-[14px] font-sans px-2.5 py-1.5 rounded-md flex items-center gap-2.5 transition-colors ${
                  isActive ? 'bg-accent/15 text-accent font-medium' : 'text-text hover:bg-surface-2'
                }`
              }
            >
              <Cpu className="w-4 h-4 text-accent" />
              <span>Agent Fleet</span>
            </NavLink>
            <NavLink
              to="/workspace"
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `text-[14px] font-sans px-2.5 py-1.5 rounded-md flex items-center gap-2.5 transition-colors ${
                  isActive ? 'bg-accent/15 text-accent font-medium' : 'text-text hover:bg-surface-2'
                }`
              }
            >
              <Sparkles className="w-4 h-4 text-accent" />
              <span>Growth Studio</span>
            </NavLink>
            <NavLink
              to="/review"
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `text-[14px] font-sans px-2.5 py-1.5 rounded-md flex items-center gap-2.5 transition-colors ${
                  isActive ? 'bg-accent/15 text-accent font-medium' : 'text-text hover:bg-surface-2'
                }`
              }
            >
              <ShieldCheck className="w-4 h-4 text-accent" />
              <span>Governance Desk</span>
            </NavLink>

            <div className="pt-2 text-[11px] font-mono uppercase tracking-wider text-muted px-2 py-1">Direct Work Views</div>
            <NavLink
              to="/orchestrator?tab=tasks"
              onClick={() => setMobileOpen(false)}
              className="text-[13px] font-sans px-2.5 py-1 text-muted hover:text-text flex items-center gap-2"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Tasks Queue</span>
            </NavLink>
            <NavLink
              to="/orchestrator?tab=plan"
              onClick={() => setMobileOpen(false)}
              className="text-[13px] font-sans px-2.5 py-1 text-muted hover:text-text flex items-center gap-2"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Strategic Plan</span>
            </NavLink>
            <NavLink
              to="/onboard"
              onClick={() => setMobileOpen(false)}
              className="text-[13px] font-sans px-2.5 py-1 text-muted hover:text-text flex items-center gap-2"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Company & ICP Profile</span>
            </NavLink>
            <NavLink
              to="/results"
              onClick={() => setMobileOpen(false)}
              className="text-[13px] font-sans px-2.5 py-1 text-muted hover:text-text flex items-center gap-2"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Campaign Results</span>
            </NavLink>

            <div className="pt-2 text-[11px] font-mono uppercase tracking-wider text-muted px-2 py-1">Platform</div>
            <NavLink
              to="/how"
              onClick={() => setMobileOpen(false)}
              className="text-[13px] font-sans px-2.5 py-1 text-muted hover:text-text"
            >
              How It Works
            </NavLink>
            <NavLink
              to="/trust"
              onClick={() => setMobileOpen(false)}
              className="text-[13px] font-sans px-2.5 py-1 text-muted hover:text-text"
            >
              Trust & Safety
            </NavLink>
            <NavLink
              to="/industries"
              onClick={() => setMobileOpen(false)}
              className="text-[13px] font-sans px-2.5 py-1 text-muted hover:text-text"
            >
              Industry Blueprints
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

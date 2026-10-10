import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  Building,
  Check,
  Database,
  RefreshCw,
  Sparkles,
  AlertTriangle,
  Play,
  ShieldCheck,
  PlusCircle,
} from 'lucide-react';
import { api } from '../../api/client';
import { useAppStore } from '../../store/useAppStore';
import { Badge } from '../ui/Badge';
import { Tooltip } from '../ui/Tooltip';

export const TopBar: React.FC = () => {
  const {
    activeBusinessId,
    setActiveBusinessId,
    addToast,
    activeRunId,
    setActiveRunId,
  } = useAppStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const isDevTools = import.meta.env.VITE_DEV_TOOLS === '1';

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

  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: () => api.getHealth(),
  });

  const { data: currentRun } = useQuery({
    queryKey: ['run', activeRunId],
    queryFn: () => (activeRunId ? api.getRun(activeRunId) : Promise.resolve(null)),
    enabled: !!activeRunId,
  });

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

  // Start Clean Run (Dev Tools)
  const startCleanRunMutation = useMutation({
    mutationFn: () => {
      if (!activeBusinessId) throw new Error('No active business');
      return api.startRun(activeBusinessId, null, false);
    },
    onSuccess: (newRunId) => {
      setActiveRunId(newRunId);
      queryClient.invalidateQueries();
      navigate(`/run/${newRunId}`);
      addToast({
        type: 'success',
        title: 'Clean Verified Run Started',
        message: '100% verified against approved documents.',
      });
    },
  });

  // Start Flawed Demo (Dev Tools)
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
        title: 'Planted-Flaw Demo Initiated',
        message: '3 factual discrepancies flagged for Veritas and Warden review.',
      });
    },
  });

  const handleResetData = () => {
    api.resetState();
    queryClient.invalidateQueries();
    addToast({
      type: 'success',
      title: 'State Reset',
      message: 'In-memory runs and reviews cleared.',
    });
  };

  const currentBusiness = businesses.find((b) => b.id === activeBusinessId) || businesses[0] || null;

  return (
    <header className="h-16 border-b border-white/[0.08] bg-surface/90 backdrop-blur-xl px-6 flex items-center justify-between z-20 flex-shrink-0 shadow-md">
      {/* Left: Brand Identity + Business Switcher */}
      <div className="flex items-center gap-6">
        <div
          onClick={() => navigate('/')}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#E5C378] text-[#0A0D14] flex items-center justify-center font-serif font-bold text-base shadow-[0_0_15px_rgba(212,175,55,0.3)] group-hover:scale-105 transition-transform">
            V
          </div>
          <div className="flex flex-col">
            <span className="font-serif tracking-tight text-text text-base font-medium flex items-center gap-1.5">
              Verity
              <span className="text-[10px] font-mono tracking-widest text-accent uppercase px-1.5 py-0.2 rounded bg-accent-soft border border-accent/20">
                AI TRUST
              </span>
            </span>
            <span className="text-[11px] text-text-muted font-normal -mt-0.5">
              Growth, verified
            </span>
          </div>
        </div>

        <div className="h-5 w-[1px] bg-white/10" />

        {/* Business Switcher Dropdown */}
        {businesses.length === 0 ? (
          <button
            type="button"
            onClick={() => navigate('/onboard?mode=new')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-accent-soft border border-accent/30 hover:border-accent text-xs text-accent font-medium cursor-pointer transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Create business</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-surface-2/80 border border-white/10 hover:border-accent/50 transition-all text-xs text-text cursor-pointer font-medium hover:bg-surface-2"
                aria-expanded={dropdownOpen}
              >
                <Building className="w-3.5 h-3.5 text-accent stroke-[1.5]" />
                <span className="max-w-[190px] truncate">
                  {currentBusiness?.name || 'Select Business'}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-text-muted transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {dropdownOpen && (
                <div className="absolute left-0 mt-2 w-80 rounded-card bg-surface/95 backdrop-blur-xl border border-white/15 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-text-faint border-b border-white/10 mb-1 flex items-center justify-between">
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
                      className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-start justify-between cursor-pointer ${
                        isSelected ? 'bg-accent-soft text-accent border border-accent/30' : 'hover:bg-white/5 text-text'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-semibold">{biz.name}</div>
                        <div className="text-[11px] text-text-muted truncate mt-0.5">{biz.industry}</div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-accent mt-0.5 stroke-[2]" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>

      {/* Center / Right: Health Indicator + Optional Dev Tools */}
      <div className="flex items-center gap-3">
        {/* Connected Backend Indicator from /api/health */}
        <div className="hidden lg:flex items-center gap-2 text-xs text-text-muted bg-surface-2/60 border border-white/10 px-3 py-1.5 rounded-lg">
          <span
            className={`w-2 h-2 rounded-full ${
              health?.is_fallback_active ? 'bg-warning animate-ping' : 'bg-verified'
            }`}
          />
          <span className="font-mono text-[11px]">
            {health?.storage_backend === 'supabase' ? 'Supabase Cloud' : 'Local Storage'}
            {' • '}
            {health?.model_provider === 'gemini' ? 'Gemini Live' : health?.model_provider === 'groq' ? 'Groq Live' : 'Deterministic Mode'}
          </span>
        </div>

        {/* Developer Flags / Actions (Default OFF) */}
        {isDevTools && (
          <>
            <button
              type="button"
              onClick={() => startFlawedRunMutation.mutate()}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-warning bg-warning/10 border border-warning/25 hover:bg-warning/20 transition-all cursor-pointer shadow-sm"
              title="Dev: Planted flaw demo"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Dev: Flawed Run</span>
            </button>

            <button
              type="button"
              onClick={() => startCleanRunMutation.mutate()}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-verified bg-verified/10 border border-verified/25 hover:bg-verified/20 transition-all cursor-pointer shadow-sm"
              title="Dev: Clean run"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Dev: Clean Run</span>
            </button>

            <Tooltip content="Reset in-memory mock data">
              <button
                type="button"
                onClick={handleResetData}
                className="p-2 rounded-lg text-text-muted hover:text-text bg-surface-2 border border-white/10 hover:border-accent transition-colors cursor-pointer"
                aria-label="Reset state"
              >
                <RefreshCw className="w-3.5 h-3.5 stroke-[1.5]" />
              </button>
            </Tooltip>
          </>
        )}
      </div>
    </header>
  );
};
export default TopBar;

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { api } from '../../api/client';
import { useAppStore } from '../../store/useAppStore';
import { BusinessProfileForm } from './BusinessProfileForm';
import { KnowledgeBaseUploader } from './KnowledgeBaseUploader';
import { SampleBusinessSelector } from './SampleBusinessSelector';
import { AdaptiveOnboardingFlow } from './AdaptiveOnboardingFlow';
import { Tabs } from '../../components/ui/Tabs';
import { Skeleton } from '../../components/ui/Skeleton';
import { Button } from '../../components/ui/Button';
import { BusinessProfile } from '../../api/types';
import { Sparkles, AlertTriangle, Play, ArrowRight, ShieldCheck, PlusCircle } from 'lucide-react';

const EMPTY_PROFILE: BusinessProfile = {
  id: '',
  name: '',
  industry: 'B2B Software',
  offerings: [],
  ideal_customer: '',
  tone: 'Consultative, precise, metrics-driven',
  channels: ['email'],
  anti_spam: {
    max_contacts_per_week: 3,
    quiet_hours: '20:00 - 08:00',
    opt_out_list: [],
  },
  enabled_agents: ['atlas', 'scout', 'quill', 'veritas', 'warden', 'courier'],
  documents: [],
};

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activeBusinessId, setActiveBusinessId, setActiveRunId, addToast } = useAppStore();
  const [activeViewTab, setActiveViewTab] = useState<'adaptive' | 'legacy'>('adaptive');
  const isDevTools = import.meta.env.VITE_DEV_TOOLS === '1';

  const { data: businesses = [], isLoading } = useQuery({
    queryKey: ['businesses'],
    queryFn: () => api.listBusinesses(),
  });

  const activeBusiness =
    businesses.find((b) => b.id === activeBusinessId) || businesses[0] || null;

  const currentProfile = activeBusiness || EMPTY_PROFILE;

  const switchMutation = useMutation({
    mutationFn: (id: string) => api.switchBusiness(id),
    onSuccess: (biz) => {
      setActiveBusinessId(biz.id);
      queryClient.invalidateQueries();
      addToast({
        type: 'info',
        title: `Switched to ${biz.name}`,
        message: `Loaded ${biz.industry} governance model.`,
      });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (updated: BusinessProfile) => {
      if (updated.id) {
        return api.updateBusinessProfile(updated);
      } else {
        return api.createBusiness(updated);
      }
    },
    onSuccess: (savedBiz) => {
      setActiveBusinessId(savedBiz.id);
      queryClient.invalidateQueries();
      addToast({
        type: 'success',
        title: 'Business Saved',
        message: `${savedBiz.name} profile successfully saved.`,
      });
    },
  });

  if (isLoading) {
    return (
      <div className="p-8 max-w-[1280px] mx-auto space-y-6">
        <Skeleton className="h-10 w-80" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <Skeleton className="h-[600px] lg:col-span-6" />
          <Skeleton className="h-[600px] lg:col-span-6" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      key={activeBusiness?.id || 'new'}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="p-6 md:p-8 max-w-[1280px] mx-auto space-y-8"
    >
      {/* Clean Minimalist Hero */}
      <div className="glass-panel border border-accent/25 rounded-2xl p-7 sm:p-9 relative overflow-hidden shadow-2xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
        <div className="absolute top-0 right-0 w-96 h-40 bg-accent/5 rounded-full filter blur-3xl pointer-events-none" />
        <div className="space-y-3 relative z-10 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-accent bg-accent-soft px-3 py-1 rounded-full border border-accent/30 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              Zero-Hallucination AI Outreach
            </span>
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl text-text font-light tracking-tight">
            {activeBusiness ? `Configure ${activeBusiness.name}` : 'Describe Your Business'}
          </h1>

          <p className="text-sm text-text-muted leading-relaxed">
            Verity audits every outbound sentence against your uploaded company documents before anything leaves the building.
            Complete the questions below or upload documentation to establish ground-truth facts.
          </p>
        </div>

        {isDevTools && (
          <div className="relative z-10 flex flex-col gap-2">
            <span className="text-[10px] font-mono uppercase text-warning">Developer Tools</span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/run/run_flawed_demo/review')}
            >
              Demo: Test Review Desk
            </Button>
          </div>
        )}
      </div>

      {/* View Switcher: Adaptive Intake vs Legacy Governance */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <Tabs
          options={[
            { id: 'adaptive', label: 'Adaptive 8-Question Intake & Readiness' },
            { id: 'legacy', label: 'Manual Governance & Documents' },
          ]}
          activeTab={activeViewTab}
          onChange={(tab) => setActiveViewTab(tab as 'adaptive' | 'legacy')}
        />
      </div>

      {activeViewTab === 'adaptive' ? (
        <AdaptiveOnboardingFlow />
      ) : (
        <>
          {/* Sample Business Selector: ONLY if dev tools enabled and businesses exist */}
          {isDevTools && businesses.length > 0 && (
            <div className="p-3 rounded bg-warning/10 border border-warning/30 space-y-2">
              <span className="text-xs font-mono font-semibold text-warning">Demo data - for development only:</span>
              <SampleBusinessSelector
                businesses={businesses}
                activeBusinessId={activeBusiness?.id || ''}
                onSelect={(id) => switchMutation.mutate(id)}
              />
            </div>
          )}

          {/* Split Layout: Business Profile Form (Left 6 Cols) & Knowledge Base (Right 6 Cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-6">
              <BusinessProfileForm
                initialProfile={currentProfile}
                onSave={(updated) => saveMutation.mutate(updated)}
                isSaving={saveMutation.isPending}
              />
            </div>

            <div className="lg:col-span-6">
              <KnowledgeBaseUploader documents={currentProfile.documents} />
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
};

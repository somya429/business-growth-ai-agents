import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { api } from '../../api/client';
import { useAppStore } from '../../store/useAppStore';
import { BusinessProfileForm } from './BusinessProfileForm';
import { KnowledgeBaseUploader } from './KnowledgeBaseUploader';
import { AdaptiveOnboardingFlow } from './AdaptiveOnboardingFlow';
import { GrowthXOnboardingFlow } from './GrowthXOnboardingFlow';
import { Tabs } from '../../components/ui/Tabs';
import { Skeleton } from '../../components/ui/Skeleton';
import { Button } from '../../components/ui/Button';
import { BusinessProfile } from '../../api/types';
import {
  Sparkles,
  AlertTriangle,
  Building,
  PlusCircle,
  Check,
  RotateCcw,
  Sliders,
  FileText,
  ShieldCheck,
} from 'lucide-react';

const EMPTY_PROFILE: BusinessProfile = {
  id: '',
  name: '',
  industry: 'Software / SaaS / AI',
  offerings: ['Autonomous workflow automation for B2B operations'],
  ideal_customer: 'B2B enterprise technology leaders and operations teams',
  tone: 'Consultative, precise, metrics-driven',
  channels: ['email', 'linkedin'],
  anti_spam: {
    max_contacts_per_week: 3,
    quiet_hours: '20:00 - 08:00',
    opt_out_list: [],
  },
  enabled_agents: ['atlas', 'scout', 'quill', 'veritas', 'warden', 'courier', 'apex'],
  documents: [],
};

interface OnboardingPageProps {
  embed?: boolean;
}

export const OnboardingPage: React.FC<OnboardingPageProps> = ({ embed = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { activeBusinessId, setActiveBusinessId, setActiveRunId, addToast } = useAppStore();

  const searchParams = new URLSearchParams(location.search);
  const modeParam = searchParams.get('mode');

  const { data: businesses = [], isLoading } = useQuery({
    queryKey: ['businesses'],
    queryFn: () => api.listBusinesses(),
  });

  // Keep activeBusinessId synchronized with loaded businesses
  useEffect(() => {
    if (!activeBusinessId && businesses.length > 0) {
      setActiveBusinessId(businesses[0].id);
    }
  }, [businesses, activeBusinessId, setActiveBusinessId]);

  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(modeParam === 'new');
  const [activeViewTab, setActiveViewTab] = useState<'profile' | 'intake' | 'readiness'>(
    modeParam === 'intake' ? 'intake' : 'profile'
  );

  const activeBusiness =
    businesses.find((b) => b.id === activeBusinessId) || businesses[0] || null;

  const currentProfile = isCreatingNew ? EMPTY_PROFILE : (activeBusiness || EMPTY_PROFILE);

  const switchMutation = useMutation({
    mutationFn: (id: string) => api.switchBusiness(id),
    onSuccess: (biz) => {
      setActiveBusinessId(biz.id);
      setIsCreatingNew(false);
      queryClient.invalidateQueries();
      addToast({
        type: 'info',
        title: `Switched context to ${biz.name}`,
        message: `Loaded ${biz.industry} knowledge repository and ICP.`,
      });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (updated: BusinessProfile) => {
      if (updated.id && !isCreatingNew) {
        return api.updateBusinessProfile(updated);
      } else {
        const payload = { ...updated };
        if (isCreatingNew) {
          delete (payload as any).id;
        }
        return api.createBusiness(payload);
      }
    },
    onSuccess: (savedBiz) => {
      setActiveBusinessId(savedBiz.id);
      setIsCreatingNew(false);
      queryClient.invalidateQueries({ queryKey: ['businesses'] });
      queryClient.invalidateQueries({ queryKey: ['orchestrator-overview'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      addToast({
        type: 'success',
        title: 'Business Profile Saved',
        message: `${savedBiz.name} company & ICP profile successfully synchronized.`,
      });
    },
    onError: (err: any) => {
      addToast({
        type: 'danger',
        title: 'Save Failed',
        message: err.message || 'Could not save business profile.',
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
      key={isCreatingNew ? 'creating_new' : (activeBusiness?.id || 'empty')}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className={embed ? 'space-y-6' : 'p-4 sm:p-6 md:p-8 max-w-[1280px] mx-auto space-y-6'}
    >
      {/* Hero Header */}
      <div className="panel p-6 sm:p-8 bg-[var(--paper)] border-[var(--ink)] shadow-hard flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="eyebrow flex items-center gap-1.5 text-[var(--ink-deep)] font-bold">
              <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
              Company Governance & Ground Truth
            </span>
          </div>

          <h1 className="h1 text-2xl sm:text-3xl font-extrabold text-[var(--ink)]">
            {isCreatingNew
              ? 'Create New Business & ICP'
              : activeBusiness
              ? `${activeBusiness.name} — Company & ICP`
              : 'Define Your Business Profile'}
          </h1>

          <p className="text-xs sm:text-sm text-[var(--ink-2)]">
            Verity audits every outreach campaign against your verified ICP and uploaded company documents.
            Define your value proposition, customer boundaries, and brand voice below.
          </p>
        </div>

        {/* Quick Organization Bar & Create New Button */}
        <div className="flex flex-wrap items-center gap-2">
          {isCreatingNew ? (
            <button
              type="button"
              onClick={() => setIsCreatingNew(false)}
              className="btn small flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Cancel (Back to {activeBusiness?.name || 'Overview'})</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setIsCreatingNew(true);
                setActiveViewTab('profile');
              }}
              className="btn solid small flex items-center gap-1.5"
            >
              <PlusCircle className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>Create New Business</span>
            </button>
          )}
        </div>
      </div>

      {/* Available Business Context Selector Chips */}
      {businesses.length > 0 && !isCreatingNew && (
        <div className="p-4 bg-[var(--paper)] border border-[var(--ink)] shadow-hard space-y-2">
          <div className="flex items-center justify-between">
            <span className="eyebrow text-xs">Switch Active Business:</span>
            <span className="text-xs font-mono text-[var(--ink-2)]">
              {businesses.length} {businesses.length === 1 ? 'organization' : 'organizations'} configured
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {businesses.map((biz) => {
              const isSelected = biz.id === activeBusiness?.id;
              return (
                <button
                  key={biz.id}
                  type="button"
                  onClick={() => switchMutation.mutate(biz.id)}
                  className={`px-3 py-1.5 text-xs rounded border transition-all flex items-center gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--ink)] text-[var(--bg)] border-[var(--ink)] font-bold shadow-sm'
                      : 'bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--ink)]'
                  }`}
                >
                  <Building className="w-3.5 h-3.5" />
                  <span>{biz.name}</span>
                  <span className="text-[10px] opacity-75 font-mono">({biz.industry})</span>
                  {isSelected && <Check className="w-3 h-3 text-[var(--accent)] ml-1" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* View Mode Tabs: Profile vs Step-by-Step AI Intake vs Readiness Audit */}
      <div className="flex items-center justify-between border-b border-[var(--ink)] pb-3">
        <Tabs
          options={[
            { id: 'profile', label: 'Company & ICP Profile' },
            { id: 'intake', label: 'Step-by-Step AI Intake Wizard' },
            { id: 'readiness', label: 'Readiness & Gap Assessment' },
          ]}
          activeTab={activeViewTab}
          onChange={(tab) => {
            setActiveViewTab(tab as 'profile' | 'intake' | 'readiness');
          }}
        />
      </div>

      {/* TAB CONTENT */}
      {activeViewTab === 'profile' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left 6 Cols: Direct Company & ICP Profile Form */}
          <div className="lg:col-span-6">
            <BusinessProfileForm
              key={currentProfile.id || 'new_form'}
              initialProfile={currentProfile}
              onSave={(updated) => saveMutation.mutate(updated)}
              isSaving={saveMutation.isPending}
            />
          </div>

          {/* Right 6 Cols: Knowledge Base Ground-Truth Documents */}
          <div className="lg:col-span-6">
            <KnowledgeBaseUploader documents={currentProfile.documents} />
          </div>
        </div>
      ) : activeViewTab === 'intake' ? (
        <GrowthXOnboardingFlow />
      ) : (
        <AdaptiveOnboardingFlow />
      )}
    </motion.div>
  );
};

export default OnboardingPage;

import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Tabs } from '../components/ui/Tabs';
import { Skeleton } from '../components/ui/Skeleton';
import { Tooltip } from '../components/ui/Tooltip';
import { TrustScoreRing } from '../features/review/TrustScoreRing';
import { CategoryScoreBar } from '../features/review/CategoryScoreBar';
import { useAppStore } from '../store/useAppStore';
import {
  Sparkles,
  ShieldCheck,
  Send,
  AlertTriangle,
  Play,
  ArrowRight,
  Info,
} from 'lucide-react';

export const GalleryPage: React.FC = () => {
  const { addToast } = useAppStore();
  const [activeTab, setActiveTab] = useState('components');

  return (
    <div className="p-6 md:p-8 max-w-[1280px] mx-auto space-y-10 pb-24">
      {/* Header */}
      <div className="border-b border-border pb-6">
        <span className="text-[11px] font-mono uppercase tracking-widest text-accent">
          DESIGN SYSTEM & ATOMIC TOKENS
        </span>
        <h1 className="font-serif text-3xl text-text font-light tracking-tight mt-1">
          Verity Component Gallery
        </h1>
        <p className="text-xs text-text-muted mt-1">
          Storybook-free living specification of custom typography, restrained semantic palette, and micro-components.
        </p>
      </div>

      {/* Tabs */}
      <Tabs
        options={[
          { id: 'components', label: 'Atomic Components' },
          { id: 'typography', label: 'Typography & Tokens' },
          { id: 'trust_system', label: 'Trust & Verification UI' },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === 'components' && (
        <div className="space-y-10">
          {/* Buttons Section */}
          <Card variant="surface" className="p-6 space-y-4">
            <h3 className="font-serif text-base text-text">Buttons</h3>
            <div className="flex flex-wrap gap-3 items-center">
              <Button variant="primary">Primary Action</Button>
              <Button variant="secondary">Secondary Action</Button>
              <Button variant="outline">Outline Action</Button>
              <Button variant="ghost">Ghost Action</Button>
              <Button variant="danger">Danger Action</Button>
              <Button variant="primary" isLoading>
                Loading
              </Button>
              <Button
                variant="primary"
                leftIcon={<Send className="w-4 h-4 stroke-[1.5]" />}
              >
                With Icon
              </Button>
            </div>
          </Card>

          {/* Badges Section */}
          <Card variant="surface" className="p-6 space-y-4">
            <h3 className="font-serif text-base text-text">Semantic Badges</h3>
            <div className="flex flex-wrap gap-3 items-center">
              <Badge variant="neutral">Neutral System</Badge>
              <Badge variant="accent" dot>
                Gold Accent (Brand)
              </Badge>
              <Badge variant="verified" dot>
                Jade (Verified)
              </Badge>
              <Badge variant="warning" dot>
                Amber (Needs Review)
              </Badge>
              <Badge variant="danger" dot>
                Coral (Contradicted / Risk)
              </Badge>
              <Badge variant="info" dot>
                Info / PII
              </Badge>
            </div>
          </Card>

          {/* Toast Triggers */}
          <Card variant="surface" className="p-6 space-y-4">
            <h3 className="font-serif text-base text-text">Interactive Notifications (Toast)</h3>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  addToast({
                    type: 'success',
                    title: 'Verification Complete',
                    message: 'All 14 claims matched against SOC 2 audit repository.',
                  })
                }
              >
                Trigger Success Toast
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  addToast({
                    type: 'warning',
                    title: 'Policy Gate Lock',
                    message: 'Unverified delivery warranty detected by Warden engine.',
                  })
                }
              >
                Trigger Warning Toast
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  addToast({
                    type: 'danger',
                    title: 'Audit Contradiction',
                    message: 'Price mismatch with master fee schedule.',
                  })
                }
              >
                Trigger Danger Toast
              </Button>
            </div>
          </Card>

          {/* Skeletons */}
          <Card variant="surface" className="p-6 space-y-4">
            <h3 className="font-serif text-base text-text">Skeleton Shimmers</h3>
            <div className="space-y-2 max-w-md">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'typography' && (
        <div className="space-y-6">
          <Card variant="surface" className="p-6 space-y-6">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-text-faint">
                Display Font (Fraunces / Instrument Serif)
              </span>
              <h2 className="font-serif text-4xl text-text font-light tracking-tight mt-1">
                Where Nothing Leaves Unverified
              </h2>
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-text-faint">
                Body Font (Inter)
              </span>
              <p className="text-sm text-text-muted mt-1 leading-relaxed max-w-2xl">
                Classy, minimalistic, business-grade, and quietly cinematic. Designed for enterprise legal,
                financial, and technical growth teams who demand absolute precision.
              </p>
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-text-faint">
                Data & Code (JetBrains Mono)
              </span>
              <div className="font-mono text-xs text-accent mt-1 bg-surface-2 p-3 rounded-[8px] border border-border">
                RUN_ID: run_99f2b189 • SCORE: 98/100 • VERITAS_AUDIT: PASS • WARDEN: ZERO_VIOLATIONS
              </div>
            </div>
          </Card>

          {/* Palette Swatches */}
          <Card variant="surface" className="p-6 space-y-4">
            <h3 className="font-serif text-base text-text">Design Palette Tokens</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
              <div className="p-3 rounded-[8px] bg-bg border border-border">
                <div className="text-text font-semibold">Ink Background</div>
                <div className="text-text-muted text-[11px]">#0A0C10</div>
              </div>
              <div className="p-3 rounded-[8px] bg-surface border border-border">
                <div className="text-text font-semibold">Surface</div>
                <div className="text-text-muted text-[11px]">#11141A</div>
              </div>
              <div className="p-3 rounded-[8px] bg-accent/20 border border-accent/40 text-accent">
                <div className="font-semibold">Champagne Gold</div>
                <div className="text-[11px]">#C9A96E</div>
              </div>
              <div className="p-3 rounded-[8px] bg-verified/20 border border-verified/40 text-verified">
                <div className="font-semibold">Muted Jade</div>
                <div className="text-[11px]">#5FBF9A</div>
              </div>
              <div className="p-3 rounded-[8px] bg-warning/20 border border-warning/40 text-warning">
                <div className="font-semibold">Amber Warning</div>
                <div className="text-[11px]">#E0A458</div>
              </div>
              <div className="p-3 rounded-[8px] bg-danger/20 border border-danger/40 text-danger">
                <div className="font-semibold">Soft Coral</div>
                <div className="text-[11px]">#E26D5C</div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'trust_system' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card variant="surface" className="p-6 text-center">
            <h4 className="text-xs font-mono uppercase text-verified mb-4">Passing State</h4>
            <TrustScoreRing score={98} verdict="PASS" />
          </Card>

          <Card variant="surface" className="p-6 text-center">
            <h4 className="text-xs font-mono uppercase text-warning mb-4">Review State</h4>
            <TrustScoreRing score={74} verdict="REVIEW" />
          </Card>

          <Card variant="surface" className="p-6 text-center">
            <h4 className="text-xs font-mono uppercase text-danger mb-4">Failing State</h4>
            <TrustScoreRing score={52} verdict="FAIL" />
          </Card>
        </div>
      )}
    </div>
  );
};

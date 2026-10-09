import React, { useState, useEffect } from 'react';
import { BusinessProfile } from '../../api/types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Save, Shield, Sliders, Check, Plus, X } from 'lucide-react';
import { ALL_AGENTS_ROSTER } from '../../mocks/fixtures';
import { useAppStore } from '../../store/useAppStore';

interface BusinessProfileFormProps {
  initialProfile: BusinessProfile;
  onSave: (updated: BusinessProfile) => void;
  isSaving?: boolean;
}

export const BusinessProfileForm: React.FC<BusinessProfileFormProps> = ({
  initialProfile,
  onSave,
  isSaving = false,
}) => {
  const { addToast } = useAppStore();
  const [profile, setProfile] = useState<BusinessProfile>(initialProfile);
  const [newOffering, setNewOffering] = useState('');

  useEffect(() => {
    setProfile(initialProfile);
  }, [initialProfile]);

  const toggleChannel = (channel: string) => {
    setProfile((prev) => ({
      ...prev,
      channels: prev.channels.includes(channel)
        ? prev.channels.filter((c) => c !== channel)
        : [...prev.channels, channel],
    }));
  };

  const toggleAgent = (agentId: string) => {
    setProfile((prev) => ({
      ...prev,
      enabled_agents: prev.enabled_agents.includes(agentId)
        ? prev.enabled_agents.filter((a) => a !== agentId)
        : [...prev.enabled_agents, agentId],
    }));
  };

  const addOffering = () => {
    if (newOffering.trim() && !profile.offerings.includes(newOffering.trim())) {
      setProfile((prev) => ({
        ...prev,
        offerings: [...prev.offerings, newOffering.trim()],
      }));
      setNewOffering('');
    }
  };

  const removeOffering = (item: string) => {
    setProfile((prev) => ({
      ...prev,
      offerings: prev.offerings.filter((o) => o !== item),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(profile);
    addToast({
      type: 'success',
      title: 'Business Profile Updated',
      message: 'Constraints and enabled agent pipeline synchronized across state.',
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card variant="surface" className="p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <h3 className="font-serif text-lg text-text font-normal">
              Business Profile & Governance
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              Governs pipeline tone, anti-spam thresholds, and authorized autonomous agents.
            </p>
          </div>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isSaving}
            leftIcon={<Save className="w-3.5 h-3.5 stroke-[1.5]" />}
          >
            Save Configuration
          </Button>
        </div>

        {/* General Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase tracking-wider text-text-muted">
              Organization Name
            </label>
            <input
              type="text"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              className="w-full px-3.5 py-2 rounded-[8px] bg-surface-2 border border-border focus:border-accent text-xs text-text outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase tracking-wider text-text-muted">
              Industry Vertical
            </label>
            <input
              type="text"
              value={profile.industry}
              onChange={(e) => setProfile({ ...profile, industry: e.target.value })}
              className="w-full px-3.5 py-2 rounded-[8px] bg-surface-2 border border-border focus:border-accent text-xs text-text outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
        </div>

        {/* Ideal Customer Profile (ICP) */}
        <div className="space-y-1.5">
          <label className="text-xs font-mono uppercase tracking-wider text-text-muted">
            Target ICP (Ideal Customer Profile)
          </label>
          <textarea
            rows={2}
            value={profile.ideal_customer}
            onChange={(e) => setProfile({ ...profile, ideal_customer: e.target.value })}
            className="w-full px-3.5 py-2 rounded-[8px] bg-surface-2 border border-border focus:border-accent text-xs text-text outline-none focus:ring-1 focus:ring-accent resize-none font-sans"
          />
        </div>

        {/* Offerings Tag Editor */}
        <div className="space-y-2">
          <label className="text-xs font-mono uppercase tracking-wider text-text-muted block">
            Approved Products & Offerings
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {profile.offerings.map((offering) => (
              <span
                key={offering}
                className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-surface-2 border border-border text-text"
              >
                <span>{offering}</span>
                <button
                  type="button"
                  onClick={() => removeOffering(offering)}
                  className="text-text-muted hover:text-danger cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Add validated product or offering..."
              value={newOffering}
              onChange={(e) => setNewOffering(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addOffering();
                }
              }}
              className="flex-1 px-3 py-1.5 rounded-[8px] bg-surface-2 border border-border text-xs text-text outline-none focus:border-accent"
            />
            <Button type="button" variant="outline" size="sm" onClick={addOffering}>
              Add
            </Button>
          </div>
        </div>

        {/* Tone and Channels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase tracking-wider text-text-muted">
              Communication Tone Guidelines
            </label>
            <input
              type="text"
              value={profile.tone}
              onChange={(e) => setProfile({ ...profile, tone: e.target.value })}
              className="w-full px-3.5 py-2 rounded-[8px] bg-surface-2 border border-border focus:border-accent text-xs text-text outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase tracking-wider text-text-muted block">
              Allowed Outbound Channels
            </label>
            <div className="flex items-center gap-2 pt-1">
              {['email', 'linkedin', 'phone'].map((ch) => {
                const isActive = profile.channels.includes(ch);
                return (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => toggleChannel(ch)}
                    className={`px-3 py-1.5 rounded-[8px] text-xs font-medium capitalize border transition-all cursor-pointer ${
                      isActive
                        ? 'bg-accent/15 border-accent text-accent'
                        : 'bg-surface-2 border-border text-text-muted hover:text-text'
                    }`}
                  >
                    {ch}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Anti-Spam & Quiet Hours Governance */}
        <div className="pt-4 border-t border-border space-y-4">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-warning">
            <Shield className="w-4 h-4 stroke-[1.5]" />
            <span>Anti-Spam & Safety Policy Bounds</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-text-muted">
                Max Outreach Attempts Per Lead / Week
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={profile.anti_spam.max_contacts_per_week}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    anti_spam: {
                      ...profile.anti_spam,
                      max_contacts_per_week: parseInt(e.target.value) || 1,
                    },
                  })
                }
                className="w-full px-3.5 py-2 rounded-[8px] bg-surface-2 border border-border text-xs text-text outline-none focus:border-accent"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-text-muted">
                Mandatory Quiet Hours Window
              </label>
              <input
                type="text"
                value={profile.anti_spam.quiet_hours}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    anti_spam: {
                      ...profile.anti_spam,
                      quiet_hours: e.target.value,
                    },
                  })
                }
                className="w-full px-3.5 py-2 rounded-[8px] bg-surface-2 border border-border text-xs text-text outline-none focus:border-accent"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono text-text-muted">
              Global Opt-Out Blacklist (Emails or Domains)
            </label>
            <textarea
              rows={2}
              value={profile.anti_spam.opt_out_list.join(', ')}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  anti_spam: {
                    ...profile.anti_spam,
                    opt_out_list: e.target.value.split(',').map((s) => s.trim()),
                  },
                })
              }
              className="w-full px-3.5 py-2 rounded-[8px] bg-surface-2 border border-border text-xs text-text outline-none focus:border-accent font-mono resize-none"
              placeholder="e.g. unsub@domain.com, security@corp.com"
            />
          </div>
        </div>

        {/* Enabled Pipeline Agents Toggles */}
        <div className="pt-4 border-t border-border space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-mono uppercase tracking-wider text-text-muted">
              Active Pipeline Agents & Engines
            </label>
            <span className="text-[11px] font-mono text-text-faint">
              {profile.enabled_agents.length} Enabled
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {ALL_AGENTS_ROSTER.map((agent) => {
              const isEnabled = profile.enabled_agents.includes(agent.id);
              return (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => toggleAgent(agent.id)}
                  className={`p-2.5 rounded-[8px] border text-left flex items-center justify-between transition-all cursor-pointer ${
                    isEnabled
                      ? 'bg-accent/10 border-accent/40 text-text'
                      : 'bg-surface-2/60 border-border/70 text-text-muted opacity-60 hover:opacity-100'
                  }`}
                >
                  <div>
                    <div className="text-xs font-medium">{agent.name}</div>
                    <div className="text-[10px] text-text-faint font-mono truncate max-w-[110px]">
                      {agent.role}
                    </div>
                  </div>
                  {isEnabled && <Check className="w-3.5 h-3.5 text-accent stroke-[2]" />}
                </button>
              );
            })}
          </div>
        </div>
      </Card>
    </form>
  );
};

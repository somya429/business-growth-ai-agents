import React from 'react';
import { BusinessProfile } from '../../api/types';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Building, Sparkles, Check, ArrowRight } from 'lucide-react';

interface SampleBusinessSelectorProps {
  businesses: BusinessProfile[];
  activeBusinessId: string;
  onSelect: (businessId: string) => void;
}

export const SampleBusinessSelector: React.FC<SampleBusinessSelectorProps> = ({
  businesses,
  activeBusinessId,
  onSelect,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-serif text-lg text-text font-normal">
            Select Organization Model
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            Verity adapts its verification rules and fact extraction across any vertical.
          </p>
        </div>
      </div>

      {businesses.length === 0 ? (
        <Card variant="surface" className="p-6 text-center text-xs text-text-muted">
          No business profiles created yet. Use the intake form below to define your business.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {businesses.map((biz) => {
            const isSelected = biz.id === activeBusinessId;

            return (
              <Card
                key={biz.id}
                variant={isSelected ? 'surface' : 'surface-2'}
                onClick={() => onSelect(biz.id)}
                className={`p-5 cursor-pointer transition-all duration-300 relative ${
                  isSelected
                    ? 'border-accent shadow-[0_0_15px_rgba(201,169,110,0.15)] ring-1 ring-accent'
                    : 'hover:border-accent/40'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <Badge variant={isSelected ? 'accent' : 'neutral'} size="sm">
                    {biz.industry || 'Business Profile'}
                  </Badge>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-accent/20 text-accent flex items-center justify-center">
                      <Check className="w-3 h-3 stroke-[2]" />
                    </div>
                  )}
                </div>

                <h4 className="font-serif text-base text-text font-medium tracking-tight">
                  {biz.name}
                </h4>
                <p className="text-[11px] text-text-muted mt-1 leading-relaxed line-clamp-2">
                  {biz.ideal_customer || 'No customer criteria defined yet'}
                </p>

                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-[11px] font-mono text-text-faint">
                  <span>{(biz.offerings || []).length} Core Offerings</span>
                  <span className="text-accent flex items-center gap-1 font-sans font-medium text-xs">
                    {isSelected ? 'Active Model' : 'Load Model'}
                    {!isSelected && <ArrowRight className="w-3 h-3" />}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

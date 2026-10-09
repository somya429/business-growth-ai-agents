import React from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Send, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';

interface CourierReceiptCardProps {
  receipt?: {
    delivered_at?: string;
    channel?: string;
    recipient?: string;
    message_id?: string;
    status?: string;
    error?: string;
  };
}

export const CourierReceiptCard: React.FC<CourierReceiptCardProps> = ({ receipt }) => {
  const isDelivered = receipt && (receipt.status === 'delivered' || receipt.status?.toLowerCase().includes('250 ok'));
  const isFailed = receipt && (receipt.status === 'failed' || receipt.status === 'not_sent' || Boolean(receipt.error));

  return (
    <Card variant="surface" className="p-6 space-y-5 font-mono">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-2.5">
          <Send className="w-4 h-4 text-accent stroke-[1.5]" />
          <h3 className="font-serif text-base text-text font-normal font-sans tracking-tight">
            Courier Transmission Receipt
          </h3>
        </div>
        {isDelivered ? (
          <Badge variant="verified" size="sm">
            <CheckCircle2 className="w-3 h-3 mr-1 stroke-[1.5]" />
            Dispatched
          </Badge>
        ) : isFailed ? (
          <Badge variant="danger" size="sm">
            <AlertCircle className="w-3 h-3 mr-1 stroke-[1.5]" />
            Not sent
          </Badge>
        ) : (
          <Badge variant="neutral" size="sm">
            Not sent
          </Badge>
        )}
      </div>

      <div className="space-y-2.5 text-xs">
        <div className="flex justify-between p-2 rounded bg-surface-2/60 border border-border/80">
          <span className="text-text-faint">Delivery Status:</span>
          <span className={`font-medium ${isDelivered ? 'text-verified' : isFailed ? 'text-danger' : 'text-text-muted'}`}>
            {receipt?.status ? receipt.status : 'No transmission executed (Not sent)'}
          </span>
        </div>

        <div className="flex justify-between p-2 rounded bg-surface-2/60 border border-border/80">
          <span className="text-text-faint">Authorized Recipient:</span>
          <span className="text-text font-medium">{receipt?.recipient || 'None'}</span>
        </div>

        <div className="flex justify-between p-2 rounded bg-surface-2/60 border border-border/80">
          <span className="text-text-faint">Transmission Channel:</span>
          <span className="text-text uppercase font-medium">{receipt?.channel || 'EMAIL'}</span>
        </div>

        <div className="flex justify-between p-2 rounded bg-surface-2/60 border border-border/80">
          <span className="text-text-faint">Message ID:</span>
          <span className="text-accent font-medium">{receipt?.message_id || 'N/A'}</span>
        </div>

        <div className="flex justify-between p-2 rounded bg-surface-2/60 border border-border/80">
          <span className="text-text-faint">Delivered Timestamp:</span>
          <span className="text-text-muted">{receipt?.delivered_at || 'Not delivered'}</span>
        </div>
      </div>

      <div className="p-3 rounded-[8px] bg-accent/5 border border-accent/20 text-[11px] text-text-muted font-sans flex items-start gap-2">
        <ShieldCheck className="w-4 h-4 text-accent stroke-[1.5] mt-0.5 flex-shrink-0" />
        <div>
          <span className="text-accent font-medium font-mono text-[10px] uppercase block">
            Cryptographic Guarantee
          </span>
          Only human-approved payloads can ever trigger Courier transmission. Outbound dispatch
          bypasses zero LLM agents at this execution boundary.
        </div>
      </div>
    </Card>
  );
};

'use client';

import { cn } from '@/lib/utils';
import { CheckCircle2, Clock, AlertTriangle, XCircle, Gavel, TrendingUp, FileText, Ban } from 'lucide-react';

type InvoiceStatus = 
  | 'DRAFT' 
  | 'VERIFIED' 
  | 'FUNDING' 
  | 'FUNDED' 
  | 'OVERDUE' 
  | 'SETTLED' 
  | 'DEFAULTED' 
  | 'DISPUTED'
  | 'REVOKED';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const statusConfig: Record<InvoiceStatus, {
  label: string;
  className: string;
  icon: React.ComponentType<{ className?: string }>;
}> = {
  DRAFT: {
    label: 'Draft',
    className: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
    icon: FileText,
  },
  VERIFIED: {
    label: 'Verified',
    className: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    icon: CheckCircle2,
  },
  FUNDING: {
    label: 'Auction Active',
    className: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    icon: TrendingUp,
  },
  FUNDED: {
    label: 'Funded',
    className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    icon: CheckCircle2,
  },
  OVERDUE: {
    label: 'Overdue',
    className: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    icon: AlertTriangle,
  },
  SETTLED: {
    label: 'Settled',
    className: 'bg-emerald-600/10 text-emerald-600 border-emerald-600/20',
    icon: CheckCircle2,
  },
  DEFAULTED: {
    label: 'Defaulted',
    className: 'bg-red-500/10 text-red-500 border-red-500/20',
    icon: XCircle,
  },
  DISPUTED: {
    label: 'Disputed',
    className: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    icon: Gavel,
  },
  REVOKED: {
    label: 'Revoked',
    className: 'bg-gray-600/10 text-gray-600 border-gray-600/20',
    icon: Ban,
  },
};

export function StatusBadge({ status, size = 'md', showIcon = true }: StatusBadgeProps) {
  const normalizedStatus = status.toUpperCase() as InvoiceStatus;
  const config = statusConfig[normalizedStatus] || {
    label: status,
    className: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
    icon: Clock,
  };

  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium',
        config.className,
        sizeClasses[size]
      )}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      {config.label}
    </span>
  );
}

// KYC Status Badge
type KycStatus = 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED';

const kycStatusConfig: Record<KycStatus, {
  label: string;
  className: string;
}> = {
  NOT_SUBMITTED: {
    label: 'Not Submitted',
    className: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  },
  PENDING: {
    label: 'Pending Review',
    className: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  },
  APPROVED: {
    label: 'Verified',
    className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  },
  REJECTED: {
    label: 'Rejected',
    className: 'bg-red-500/10 text-red-500 border-red-500/20',
  },
};

export function KycStatusBadge({ status }: { status: string }) {
  const normalizedStatus = (status?.toUpperCase() || 'NOT_SUBMITTED') as KycStatus;
  const config = kycStatusConfig[normalizedStatus] || kycStatusConfig.NOT_SUBMITTED;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium text-sm px-2.5 py-1',
        config.className
      )}
    >
      {config.label}
    </span>
  );
}

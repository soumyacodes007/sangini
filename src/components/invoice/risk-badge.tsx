'use client';

import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, AlertCircle, XCircle } from 'lucide-react';

interface RiskBadgeProps {
  score: number;
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  size?: 'sm' | 'md' | 'lg';
  showScore?: boolean;
}

export function RiskBadge({ score, level, size = 'md', showScore = true }: RiskBadgeProps) {
  const config = {
    LOW: {
      color: 'bg-green-100 text-green-800 border-green-200',
      icon: CheckCircle,
      label: 'Low Risk',
    },
    MEDIUM: {
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      icon: AlertCircle,
      label: 'Medium Risk',
    },
    HIGH: {
      color: 'bg-orange-100 text-orange-800 border-orange-200',
      icon: AlertTriangle,
      label: 'High Risk',
    },
    CRITICAL: {
      color: 'bg-red-100 text-red-800 border-red-200',
      icon: XCircle,
      label: 'Critical Risk',
    },
  };

  const { color, icon: Icon, label } = config[level];

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  };

  return (
    <Badge className={`${color} ${sizeClasses[size]} border flex items-center gap-1.5`}>
      <Icon className="w-3 h-3" />
      <span>{label}</span>
      {showScore && <span className="font-semibold">({score})</span>}
    </Badge>
  );
}

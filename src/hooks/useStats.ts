'use client';

import { useState, useEffect, useCallback } from 'react';

interface PlatformStats {
  totalInvoices: number;
  invoicesByStatus: Record<string, number>;
  totalVolume: string;
  insurancePoolBalance: string;
}

interface UserStats {
  // Supplier stats
  myInvoices?: Record<string, { count: number; amount: number }>;
  totalInvoicesCreated?: number;
  totalAmountFinanced?: number;
  totalReceived?: number;
  
  // Buyer stats
  invoicesToApprove?: number;
  invoicesToPay?: number;
  pendingPaymentAmount?: number;
  totalPaid?: number;
  
  // Investor stats
  totalInvested?: number;
  totalTokensHeld?: number;
  investmentCount?: number;
  activeInvestments?: number;
  activeInvestmentValue?: number;
  totalReturns?: number;
}

interface RecentActivity {
  id: string;
  invoiceId: string;
  status: string;
  amount: string;
  createdAt: string;
}

interface StatsData {
  platform: PlatformStats;
  user: UserStats;
  recentActivity: RecentActivity[];
}

export function useStats() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/stats');
      
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('Please sign in to view stats');
        }
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch stats');
      }

      const data = await res.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stats');
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats,
  };
}

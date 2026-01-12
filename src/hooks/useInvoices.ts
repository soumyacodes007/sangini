'use client';

import { useState, useEffect, useCallback } from 'react';

export interface Invoice {
  id: string;
  invoiceId: string;
  onChainId?: string;  // The actual contract invoice ID (e.g., INV-1001)
  supplier: string;
  supplierName?: string;
  buyer: string;
  buyerName?: string;
  amount: string;
  currency: string;
  status: string;
  description: string;
  purchaseOrder: string;
  documentHash?: string;
  createdAt: string;
  dueDate: number;
  verifiedAt?: number;
  settledAt?: number;
  auctionStart?: number;
  auctionEnd?: number;
  startPrice?: string;
  minPrice?: string;
  priceDropRate?: number;
  totalTokens?: string;
  tokensSold?: string;
  tokensRemaining?: string;
}

interface UseInvoicesOptions {
  status?: string;
  role?: 'supplier' | 'buyer' | 'investor';
  page?: number;
  limit?: number;
  autoFetch?: boolean;
}

interface UseInvoicesReturn {
  invoices: Invoice[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  refetch: () => Promise<void>;
}

export function useInvoices(options: UseInvoicesOptions = {}): UseInvoicesReturn {
  const { status, role, page = 1, limit = 20, autoFetch = true } = options;
  
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (role) params.set('role', role);
      params.set('page', page.toString());
      params.set('limit', limit.toString());

      const res = await fetch(`/api/invoices?${params}`);
      
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('Please sign in to view invoices');
        }
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch invoices');
      }

      const data = await res.json();
      setInvoices(data.invoices || []);
      setPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch invoices');
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [status, role, page, limit]);

  useEffect(() => {
    if (autoFetch) {
      fetchInvoices();
    }
  }, [fetchInvoices, autoFetch]);

  return {
    invoices,
    loading,
    error,
    pagination,
    refetch: fetchInvoices,
  };
}

// Hook for single invoice
export function useInvoice(id: string) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoice = useCallback(async () => {
    if (!id) return;
    
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/invoices/${id}`);
      
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('Invoice not found');
        }
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch invoice');
      }

      const data = await res.json();
      setInvoice(data.invoice);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch invoice');
      setInvoice(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  return {
    invoice,
    loading,
    error,
    refetch: fetchInvoice,
  };
}

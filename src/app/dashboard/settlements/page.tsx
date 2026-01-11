'use client';

import * as React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Loader2, CreditCard, AlertCircle, CheckCircle2, Calendar } from 'lucide-react';
import Link from 'next/link';

interface Settlement {
  id: string;
  invoiceId: string;
  description?: string;
  amount: string;
  dueDate: number;
  status: string;
  supplier: string;
  supplierName?: string;
  interestRate: number;
  settlementAmount: string;
  daysOverdue?: number;
}

export default function SettlementsPage() {
  const { userType } = useAuth();
  const [settlements, setSettlements] = React.useState<Settlement[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [settling, setSettling] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetchSettlements();
  }, []);

  const fetchSettlements = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/invoices?role=buyer&status=FUNDED,OVERDUE');
      if (!res.ok) throw new Error('Failed to fetch settlements');
      const data = await res.json();
      
      // Calculate settlement amounts for each invoice
      const settlementsWithAmounts = (data.invoices || []).map((inv: Settlement) => {
        const baseAmount = parseInt(inv.amount);
        const dueDate = inv.dueDate * 1000;
        const now = Date.now();
        const isOverdue = now > dueDate;
        const daysOverdue = isOverdue ? Math.floor((now - dueDate) / (1000 * 60 * 60 * 24)) : 0;
        
        // Base interest rate (10% APY)
        let interestRate = 10;
        // Add penalty for overdue (additional 5% per month)
        if (isOverdue) {
          interestRate += Math.min(daysOverdue / 30 * 5, 20); // Cap at 20% penalty
        }
        
        // Calculate interest
        const daysSinceCreation = Math.floor((now - inv.dueDate * 1000 + 90 * 24 * 60 * 60 * 1000) / (1000 * 60 * 60 * 24));
        const interest = Math.floor(baseAmount * (interestRate / 100) * (daysSinceCreation / 365));
        const settlementAmount = baseAmount + interest;

        return {
          ...inv,
          interestRate,
          settlementAmount: settlementAmount.toString(),
          daysOverdue,
        };
      });

      setSettlements(settlementsWithAmounts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settlements');
    } finally {
      setLoading(false);
    }
  };

  const handleSettle = async (invoiceId: string) => {
    setSettling(invoiceId);
    setError(null);

    try {
      // Use meta-tx API for buyers (no wallet needed)
      const res = await fetch(`/api/invoices/${invoiceId}/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Settlement failed');
      }

      // Refresh the list
      fetchSettlements();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Settlement failed');
    } finally {
      setSettling(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Calculate totals
  const totalDue = settlements.reduce((sum, s) => sum + parseInt(s.settlementAmount), 0) / 10000000;
  const overdueCount = settlements.filter(s => s.status === 'OVERDUE').length;

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settlements</h1>
        <p className="text-muted-foreground">Pay your funded invoices</p>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Due</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDue.toFixed(2)} XLM</div>
            <p className="text-xs text-muted-foreground">{settlements.length} invoices</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{overdueCount}</div>
            <p className="text-xs text-muted-foreground">Require immediate attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payment Method</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">Custodial Wallet</div>
            <p className="text-xs text-muted-foreground">No signature required</p>
          </CardContent>
        </Card>
      </div>

      {/* Settlements List */}
      {settlements.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">All Caught Up!</h3>
            <p className="text-muted-foreground">No pending settlements.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {settlements.map((settlement) => {
            const baseAmount = parseInt(settlement.amount) / 10000000;
            const settlementAmount = parseInt(settlement.settlementAmount) / 10000000;
            const interest = settlementAmount - baseAmount;
            const isOverdue = settlement.status === 'OVERDUE';

            return (
              <Card 
                key={settlement.id} 
                className={isOverdue ? 'border-orange-500/50' : ''}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2">
                        <Link 
                          href={`/dashboard/invoices/${settlement.id}`}
                          className="hover:text-primary"
                        >
                          {settlement.invoiceId}
                        </Link>
                        <StatusBadge status={settlement.status} size="sm" />
                      </CardTitle>
                      <CardDescription>
                        {settlement.description || 'Invoice payment'}
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">
                        {settlementAmount.toFixed(2)} XLM
                      </div>
                      <div className="text-xs text-muted-foreground">Settlement Amount</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Principal</span>
                      <p className="font-medium">{baseAmount.toFixed(2)} XLM</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Interest ({settlement.interestRate}%)</span>
                      <p className="font-medium">{interest.toFixed(2)} XLM</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Due Date</span>
                      <p className="font-medium flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(settlement.dueDate * 1000).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Supplier</span>
                      <p className="font-mono text-xs">
                        {settlement.supplierName || `${settlement.supplier.slice(0, 8)}...`}
                      </p>
                    </div>
                  </div>

                  {isOverdue && settlement.daysOverdue && (
                    <div className="mt-4 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-orange-500" />
                      <span className="text-sm">
                        This invoice is {settlement.daysOverdue} days overdue. 
                        Additional penalties may apply.
                      </span>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="bg-muted/30 pt-6">
                  <Button
                    className="w-full"
                    onClick={() => handleSettle(settlement.id)}
                    disabled={settling === settlement.id}
                  >
                    {settling === settlement.id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="mr-2 h-4 w-4" />
                        Pay {settlementAmount.toFixed(2)} XLM
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

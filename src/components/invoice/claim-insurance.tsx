'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, ShieldCheck, AlertTriangle } from 'lucide-react';

interface ClaimInsuranceProps {
  invoice: {
    id: string;
    invoiceId: string;
    amount: string;
    status: string;
  };
  userHoldings: number; // User's token holdings for this invoice
  onClaim: () => Promise<void>;
}

export function ClaimInsurance({ invoice, userHoldings, onClaim }: ClaimInsuranceProps) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [claimed, setClaimed] = React.useState(false);

  // Insurance covers 50% of holdings
  const claimableAmount = userHoldings * 0.5;
  const isDefaulted = invoice.status === 'DEFAULTED';

  const handleClaim = async () => {
    setLoading(true);
    setError(null);

    try {
      await onClaim();
      setClaimed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to claim insurance');
    } finally {
      setLoading(false);
    }
  };

  if (!isDefaulted) {
    return null;
  }

  if (claimed) {
    return (
      <Card className="border-emerald-500/50 bg-emerald-500/5">
        <CardContent className="flex items-center gap-4 p-6">
          <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <ShieldCheck className="h-6 w-6 text-emerald-500" />
          </div>
          <div>
            <h3 className="font-semibold mb-1">Insurance Claimed</h3>
            <p className="text-sm text-muted-foreground">
              You have successfully claimed {claimableAmount.toFixed(2)} XLM from the insurance pool.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-red-500/50 bg-red-500/5">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <CardTitle className="text-lg">Invoice Defaulted</CardTitle>
            <CardDescription>
              This invoice has defaulted. You can claim insurance coverage.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        <div className="p-4 rounded-lg bg-muted/50 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Your Holdings</span>
            <span className="font-medium">{userHoldings.toFixed(2)} tokens</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Insurance Coverage</span>
            <span className="font-medium">50%</span>
          </div>
          <div className="flex justify-between text-sm border-t pt-2">
            <span className="text-muted-foreground">Claimable Amount</span>
            <span className="font-bold text-emerald-500">{claimableAmount.toFixed(2)} XLM</span>
          </div>
        </div>

        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Insurance claims are processed from the platform insurance pool. 
            Claims are subject to pool availability.
          </p>
        </div>

        <Button 
          onClick={handleClaim} 
          disabled={loading || userHoldings <= 0}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing Claim...
            </>
          ) : (
            <>
              <ShieldCheck className="mr-2 h-4 w-4" />
              Claim {claimableAmount.toFixed(2)} XLM
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

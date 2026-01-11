'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { useAuctionPrice } from '@/hooks/useAuctionPrice';
import { Loader2, AlertCircle, TrendingUp, Calendar } from 'lucide-react';

interface InvestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: {
    id: string;
    invoiceId: string;
    amount: string;
    dueDate: number;
    status: string;
    auctionStart?: number;
    auctionEnd?: number;
    startPrice?: string;
    minPrice?: string;
    priceDropRate?: number;
    tokensRemaining?: string;
  } | null;
  onConfirm: (tokenAmount: string, paymentAmount: string) => Promise<void>;
}

export function InvestModal({
  open,
  onOpenChange,
  invoice,
  onConfirm,
}: InvestModalProps) {
  const [percentage, setPercentage] = React.useState(100);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const { currentPrice, discount } = useAuctionPrice(invoice);

  const tokensAvailable = invoice?.tokensRemaining 
    ? parseInt(invoice.tokensRemaining) / 10000000 
    : 0;
  const tokenAmount = (tokensAvailable * percentage) / 100;
  const totalCost = tokenAmount * (currentPrice / (parseInt(invoice?.amount || '0') / 10000000 || 1));
  const faceValue = tokenAmount;
  const estimatedReturn = faceValue - totalCost;
  const returnPercentage = totalCost > 0 ? (estimatedReturn / totalCost) * 100 : 0;

  // Days until maturity
  const daysToMaturity = invoice 
    ? Math.ceil((invoice.dueDate * 1000 - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  const handleConfirm = async () => {
    if (!invoice) return;
    
    setLoading(true);
    setError(null);

    try {
      // Convert to stroops
      const tokenAmountStroops = Math.floor(tokenAmount * 10000000).toString();
      const paymentAmountStroops = Math.floor(totalCost * 10000000).toString();
      
      await onConfirm(tokenAmountStroops, paymentAmountStroops);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Investment failed');
    } finally {
      setLoading(false);
    }
  };

  if (!invoice) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Invest in Invoice</DialogTitle>
          <DialogDescription>
            Purchase tokens for {invoice.invoiceId} at current auction price
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {/* Current Price Display */}
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current Price</p>
                <p className="text-2xl font-bold">{currentPrice.toFixed(4)} XLM</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Discount</p>
                <p className="text-lg font-bold text-emerald-500">{discount.toFixed(1)}%</p>
              </div>
            </div>
          </div>

          {/* Token Amount */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Investment Amount</Label>
              <span className="text-sm font-medium">{percentage}% of available</span>
            </div>
            <Slider
              value={[percentage]}
              onValueChange={([v]) => setPercentage(v)}
              min={1}
              max={100}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Tokens: {tokenAmount.toFixed(2)}</span>
              <span>Available: {tokensAvailable.toFixed(2)}</span>
            </div>
          </div>

          {/* Investment Summary */}
          <div className="p-4 rounded-lg bg-muted/50 space-y-3">
            <h4 className="font-medium text-sm">Investment Summary</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tokens to Purchase</span>
                <span className="font-medium">{tokenAmount.toFixed(4)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Cost</span>
                <span className="font-medium">{totalCost.toFixed(4)} XLM</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-muted-foreground">Face Value at Maturity</span>
                <span className="font-medium">{faceValue.toFixed(4)} XLM</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Estimated Return</span>
                <span className="font-medium text-emerald-500">
                  +{estimatedReturn.toFixed(4)} XLM ({returnPercentage.toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>

          {/* Maturity Info */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <Calendar className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-sm font-medium">Maturity in {daysToMaturity} days</p>
              <p className="text-xs text-muted-foreground">
                {new Date(invoice.dueDate * 1000).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={loading || tokenAmount <= 0}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <TrendingUp className="mr-2 h-4 w-4" />
                Invest {totalCost.toFixed(2)} XLM
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

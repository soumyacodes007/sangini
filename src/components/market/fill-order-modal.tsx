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
import { Slider } from '@/components/ui/slider';
import { Loader2, AlertCircle, ShoppingCart } from 'lucide-react';

interface Order {
  id: string;
  seller: string;
  sellerName?: string;
  tokenAmount: string;
  pricePerToken: string;
  totalPrice: string;
}

interface FillOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  invoiceId: string;
  onConfirm: (orderId: string, amount: string) => Promise<void>;
}

export function FillOrderModal({
  open,
  onOpenChange,
  order,
  invoiceId,
  onConfirm,
}: FillOrderModalProps) {
  const [percentage, setPercentage] = React.useState(100);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const availableTokens = order ? parseInt(order.tokenAmount) / 10000000 : 0;
  const pricePerToken = order ? parseInt(order.pricePerToken) / 10000000 : 0;
  const tokensToBuy = (availableTokens * percentage) / 100;
  const totalCost = tokensToBuy * pricePerToken;
  const faceValue = tokensToBuy;
  const discount = faceValue > 0 ? ((faceValue - totalCost) / faceValue) * 100 : 0;

  const handleConfirm = async () => {
    if (!order) return;
    
    setLoading(true);
    setError(null);

    try {
      // Convert to stroops
      const amountStroops = Math.floor(tokensToBuy * 10000000).toString();
      await onConfirm(order.id, amountStroops);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fill order');
    } finally {
      setLoading(false);
    }
  };

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Buy Tokens</DialogTitle>
          <DialogDescription>
            Purchase tokens from this sell order
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {/* Order Info */}
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Seller</span>
              <span className="font-mono text-xs">
                {order.sellerName || `${order.seller.slice(0, 8)}...${order.seller.slice(-4)}`}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Price per Token</span>
              <span className="text-lg font-bold">{pricePerToken.toFixed(4)} XLM</span>
            </div>
          </div>

          {/* Amount to Buy */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Amount to Buy</Label>
              <span className="text-sm font-medium">{percentage}% of order</span>
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
              <span>Buying: {tokensToBuy.toFixed(2)} tokens</span>
              <span>Available: {availableTokens.toFixed(2)}</span>
            </div>
          </div>

          {/* Purchase Summary */}
          <div className="p-4 rounded-lg bg-muted/50 space-y-3">
            <h4 className="font-medium text-sm">Purchase Summary</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tokens to Buy</span>
                <span className="font-medium">{tokensToBuy.toFixed(4)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Price per Token</span>
                <span className="font-medium">{pricePerToken.toFixed(4)} XLM</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-muted-foreground">Total Cost</span>
                <span className="font-bold">{totalCost.toFixed(4)} XLM</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Face Value at Maturity</span>
                <span className="font-medium">{faceValue.toFixed(4)} XLM</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Your Discount</span>
                  <span className="font-medium text-emerald-500">{discount.toFixed(1)}%</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={loading || tokensToBuy <= 0}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <ShoppingCart className="mr-2 h-4 w-4" />
                Buy for {totalCost.toFixed(2)} XLM
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

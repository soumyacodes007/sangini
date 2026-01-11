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
import { Loader2, AlertCircle, Tag } from 'lucide-react';

interface CreateOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: {
    id: string;
    invoiceId: string;
    amount: string;
    dueDate: number;
  } | null;
  holdings: number; // User's token holdings for this invoice
  onConfirm: (tokenAmount: string, pricePerToken: string) => Promise<void>;
}

export function CreateOrderModal({
  open,
  onOpenChange,
  invoice,
  holdings,
  onConfirm,
}: CreateOrderModalProps) {
  const [percentage, setPercentage] = React.useState(100);
  const [pricePerToken, setPricePerToken] = React.useState('1.0');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const tokenAmount = (holdings * percentage) / 100;
  const totalValue = tokenAmount * parseFloat(pricePerToken || '0');
  const faceValue = tokenAmount;
  const discount = faceValue > 0 ? ((faceValue - totalValue) / faceValue) * 100 : 0;

  const handleConfirm = async () => {
    if (!invoice) return;
    
    setLoading(true);
    setError(null);

    try {
      // Convert to stroops
      const tokenAmountStroops = Math.floor(tokenAmount * 10000000).toString();
      const pricePerTokenStroops = Math.floor(parseFloat(pricePerToken) * 10000000).toString();
      
      await onConfirm(tokenAmountStroops, pricePerTokenStroops);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  if (!invoice) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Sell Order</DialogTitle>
          <DialogDescription>
            List your tokens for {invoice.invoiceId} on the secondary market
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {/* Token Amount */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Tokens to Sell</Label>
              <span className="text-sm font-medium">{percentage}% of holdings</span>
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
              <span>Selling: {tokenAmount.toFixed(2)} tokens</span>
              <span>Holdings: {holdings.toFixed(2)}</span>
            </div>
          </div>

          {/* Price Per Token */}
          <div className="space-y-2">
            <Label htmlFor="price">Price per Token (XLM)</Label>
            <Input
              id="price"
              type="number"
              step="0.0001"
              min="0.0001"
              value={pricePerToken}
              onChange={(e) => setPricePerToken(e.target.value)}
              placeholder="1.0"
            />
            <p className="text-xs text-muted-foreground">
              Face value is 1.0 XLM per token at maturity
            </p>
          </div>

          {/* Order Summary */}
          <div className="p-4 rounded-lg bg-muted/50 space-y-3">
            <h4 className="font-medium text-sm">Order Summary</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tokens to Sell</span>
                <span className="font-medium">{tokenAmount.toFixed(4)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Price per Token</span>
                <span className="font-medium">{parseFloat(pricePerToken || '0').toFixed(4)} XLM</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-muted-foreground">Total Value</span>
                <span className="font-medium">{totalValue.toFixed(4)} XLM</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Face Value</span>
                <span className="font-medium">{faceValue.toFixed(4)} XLM</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discount Offered</span>
                  <span className="font-medium text-emerald-500">{discount.toFixed(1)}%</span>
                </div>
              )}
              {discount < 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Premium</span>
                  <span className="font-medium text-amber-500">{Math.abs(discount).toFixed(1)}%</span>
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
            disabled={loading || tokenAmount <= 0 || parseFloat(pricePerToken) <= 0}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Tag className="mr-2 h-4 w-4" />
                Create Order
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

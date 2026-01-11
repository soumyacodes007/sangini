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
import { Loader2, TrendingDown, Clock, AlertCircle } from 'lucide-react';

interface StartAuctionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: {
    id: string;
    invoiceId: string;
    amount: string;
    dueDate: number;
  } | null;
  onConfirm: (params: {
    duration: number;
    maxDiscount: number;
  }) => Promise<void>;
}

export function StartAuctionModal({
  open,
  onOpenChange,
  invoice,
  onConfirm,
}: StartAuctionModalProps) {
  const [duration, setDuration] = React.useState(3); // days
  const [maxDiscount, setMaxDiscount] = React.useState(10); // percent
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const amountXLM = invoice ? parseInt(invoice.amount) / 10000000 : 0;
  const startPrice = amountXLM;
  const minPrice = amountXLM * (1 - maxDiscount / 100);
  const priceDropPerHour = (startPrice - minPrice) / (duration * 24);

  const handleConfirm = async () => {
    if (!invoice) return;
    
    setLoading(true);
    setError(null);

    try {
      await onConfirm({
        duration: duration * 24 * 60 * 60, // Convert to seconds
        maxDiscount,
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start auction');
    } finally {
      setLoading(false);
    }
  };

  if (!invoice) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Start Dutch Auction</DialogTitle>
          <DialogDescription>
            Configure the auction parameters for {invoice.invoiceId}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {/* Duration */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Auction Duration</Label>
              <span className="text-sm font-medium">{duration} days</span>
            </div>
            <div className="flex gap-2">
              {[1, 3, 7, 14].map((d) => (
                <Button
                  key={d}
                  variant={duration === d ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDuration(d)}
                >
                  {d}d
                </Button>
              ))}
            </div>
          </div>

          {/* Max Discount */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Maximum Discount</Label>
              <span className="text-sm font-medium">{maxDiscount}%</span>
            </div>
            <Slider
              value={[maxDiscount]}
              onValueChange={([v]) => setMaxDiscount(v)}
              min={5}
              max={30}
              step={1}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Price will drop from {startPrice.toFixed(2)} to {minPrice.toFixed(2)} XLM
            </p>
          </div>

          {/* Preview */}
          <div className="p-4 rounded-lg bg-muted/50 space-y-3">
            <h4 className="font-medium text-sm">Auction Preview</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Start Price</p>
                  <p className="font-medium">{startPrice.toFixed(2)} XLM</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-emerald-500" />
                <div>
                  <p className="text-muted-foreground">Min Price</p>
                  <p className="font-medium text-emerald-500">{minPrice.toFixed(2)} XLM</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Duration</p>
                  <p className="font-medium">{duration} days</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Drop Rate</p>
                  <p className="font-medium">{priceDropPerHour.toFixed(4)} XLM/hr</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Starting...
              </>
            ) : (
              'Start Auction'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

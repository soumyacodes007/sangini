'use client';

import * as React from 'react';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { useAuctionPrice, formatTimeRemaining } from '@/hooks/useAuctionPrice';
import { TrendingDown, Clock, DollarSign, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

interface AuctionCardProps {
  invoice: {
    id: string;
    invoiceId: string;
    description?: string;
    amount: string;
    buyer: string;
    buyerName?: string;
    dueDate: number;
    status: string;
    auctionStart?: number;
    auctionEnd?: number;
    startPrice?: string;
    minPrice?: string;
    priceDropRate?: number;
    totalTokens?: string;
    tokensSold?: string;
    tokensRemaining?: string;
  };
  onInvest?: () => void;
}

export function AuctionCard({ invoice, onInvest }: AuctionCardProps) {
  const { currentPrice, discount, timeRemaining, isActive, progress } = useAuctionPrice(invoice);
  
  const amountXLM = parseInt(invoice.amount) / 10000000;
  const tokensRemaining = invoice.tokensRemaining 
    ? parseInt(invoice.tokensRemaining) / 10000000 
    : amountXLM;
  const tokensSold = invoice.tokensSold 
    ? parseInt(invoice.tokensSold) / 10000000 
    : 0;
  const fundingProgress = invoice.totalTokens 
    ? (tokensSold / (parseInt(invoice.totalTokens) / 10000000)) * 100 
    : 0;

  return (
    <Card className="flex flex-col hover:border-primary/50 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start mb-2">
          <StatusBadge status={invoice.status} size="sm" />
          {isActive && (
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
              <TrendingDown className="h-3 w-3 mr-1" />
              {discount.toFixed(1)}% off
            </Badge>
          )}
        </div>
        <div className="space-y-1">
          <Link 
            href={`/dashboard/invoices/${invoice.id}`}
            className="text-lg font-semibold hover:text-primary transition-colors"
          >
            {invoice.invoiceId}
          </Link>
          <p className="text-sm text-muted-foreground line-clamp-1">
            {invoice.description || 'Invoice'}
          </p>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-4">
        {/* Current Price */}
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Current Price</span>
            {isActive && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatTimeRemaining(timeRemaining)}
              </span>
            )}
          </div>
          <div className="text-2xl font-bold">
            {currentPrice.toFixed(2)} <span className="text-sm font-normal text-muted-foreground">XLM</span>
          </div>
          {isActive && (
            <div className="mt-2">
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-1000"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Face Value</span>
            <span className="font-medium">{amountXLM.toLocaleString()} XLM</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Available</span>
            <span className="font-medium">{tokensRemaining.toLocaleString()} tokens</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Maturity</span>
            <span className="font-medium">{new Date(invoice.dueDate * 1000).toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Buyer</span>
            <span className="font-mono text-xs">
              {invoice.buyerName || `${invoice.buyer.slice(0, 8)}...`}
            </span>
          </div>
        </div>

        {/* Funding Progress */}
        {fundingProgress > 0 && (
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Funding Progress</span>
              <span>{fundingProgress.toFixed(0)}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${fundingProgress}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-4">
        <Button 
          className="w-full gap-2" 
          onClick={onInvest}
          disabled={!isActive}
        >
          <DollarSign className="h-4 w-4" />
          {isActive ? 'Invest Now' : 'Auction Ended'}
        </Button>
      </CardFooter>
    </Card>
  );
}

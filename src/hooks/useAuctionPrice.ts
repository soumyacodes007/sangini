'use client';

import { useState, useEffect, useMemo } from 'react';

interface AuctionInvoice {
  auctionStart?: number;
  auctionEnd?: number;
  startPrice?: string;
  minPrice?: string;
  priceDropRate?: number;
  status?: string;
}

interface AuctionPriceResult {
  currentPrice: number;
  startPrice: number;
  minPrice: number;
  discount: number;
  timeRemaining: number;
  isActive: boolean;
  progress: number;
}

export function useAuctionPrice(invoice: AuctionInvoice | null): AuctionPriceResult {
  const [now, setNow] = useState(Date.now());

  // Update every second for real-time price
  useEffect(() => {
    if (!invoice?.auctionStart || invoice.status !== 'FUNDING') return;

    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [invoice?.auctionStart, invoice?.status]);

  return useMemo(() => {
    if (!invoice?.auctionStart || !invoice.startPrice || !invoice.minPrice) {
      return {
        currentPrice: 0,
        startPrice: 0,
        minPrice: 0,
        discount: 0,
        timeRemaining: 0,
        isActive: false,
        progress: 0,
      };
    }

    const startPrice = parseInt(invoice.startPrice) / 10000000;
    const minPrice = parseInt(invoice.minPrice) / 10000000;
    const auctionStart = invoice.auctionStart * 1000;
    const auctionEnd = (invoice.auctionEnd || 0) * 1000;
    const priceDropRate = invoice.priceDropRate || 0;

    const isActive = invoice.status === 'FUNDING' && now < auctionEnd && now >= auctionStart;
    const timeRemaining = Math.max(0, auctionEnd - now);

    if (!isActive) {
      return {
        currentPrice: now >= auctionEnd ? minPrice : startPrice,
        startPrice,
        minPrice,
        discount: now >= auctionEnd ? ((startPrice - minPrice) / startPrice) * 100 : 0,
        timeRemaining,
        isActive: false,
        progress: now >= auctionEnd ? 100 : 0,
      };
    }

    // Calculate current price based on Dutch auction mechanics
    // Price drops linearly from startPrice to minPrice over auction duration
    const elapsed = now - auctionStart;
    const duration = auctionEnd - auctionStart;
    const progress = Math.min(100, (elapsed / duration) * 100);

    // Calculate price drop
    // priceDropRate is in basis points per hour (e.g., 100 = 1% per hour)
    const hoursElapsed = elapsed / (1000 * 60 * 60);
    const dropAmount = (startPrice * priceDropRate * hoursElapsed) / 10000;
    const currentPrice = Math.max(minPrice, startPrice - dropAmount);

    const discount = ((startPrice - currentPrice) / startPrice) * 100;

    return {
      currentPrice,
      startPrice,
      minPrice,
      discount,
      timeRemaining,
      isActive,
      progress,
    };
  }, [invoice, now]);
}

// Format time remaining as human readable
export function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return 'Ended';

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

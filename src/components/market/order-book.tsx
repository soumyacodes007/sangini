'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ShoppingCart } from 'lucide-react';

interface Order {
  id: string;
  seller: string;
  sellerName?: string;
  tokenAmount: string;
  pricePerToken: string;
  totalPrice: string;
  status: string;
  createdAt: string;
}

interface OrderBookProps {
  invoiceId: string;
  orders: Order[];
  loading?: boolean;
  onBuy?: (order: Order) => void;
  currentUserAddress?: string;
}

export function OrderBook({ 
  invoiceId, 
  orders, 
  loading = false, 
  onBuy,
  currentUserAddress,
}: OrderBookProps) {
  // Sort by price (lowest first)
  const sortedOrders = [...orders]
    .filter(o => o.status === 'OPEN')
    .sort((a, b) => {
      const priceA = parseInt(a.pricePerToken);
      const priceB = parseInt(b.pricePerToken);
      return priceA - priceB;
    });

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Order Book</CardTitle>
      </CardHeader>
      <CardContent>
        {sortedOrders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No open sell orders</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Seller</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Amount</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Price/Token</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Total</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {sortedOrders.map((order) => {
                  const tokenAmount = parseInt(order.tokenAmount) / 10000000;
                  const pricePerToken = parseInt(order.pricePerToken) / 10000000;
                  const totalPrice = parseInt(order.totalPrice) / 10000000;
                  const isOwnOrder = currentUserAddress && order.seller === currentUserAddress;

                  return (
                    <tr key={order.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-3 px-2">
                        <span className="font-mono text-xs">
                          {order.sellerName || `${order.seller.slice(0, 8)}...`}
                        </span>
                        {isOwnOrder && (
                          <span className="ml-2 text-xs text-muted-foreground">(You)</span>
                        )}
                      </td>
                      <td className="text-right py-3 px-2 font-medium">
                        {tokenAmount.toFixed(2)}
                      </td>
                      <td className="text-right py-3 px-2">
                        {pricePerToken.toFixed(4)} XLM
                      </td>
                      <td className="text-right py-3 px-2 font-medium">
                        {totalPrice.toFixed(2)} XLM
                      </td>
                      <td className="text-right py-3 px-2">
                        {!isOwnOrder && onBuy && (
                          <Button 
                            size="sm" 
                            onClick={() => onBuy(order)}
                          >
                            Buy
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

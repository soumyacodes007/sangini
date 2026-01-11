'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ShoppingCart, X, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface Order {
  id: string;
  invoiceId: string;
  invoiceDbId: string;
  seller: string;
  tokenAmount: string;
  filledAmount: string;
  pricePerToken: string;
  totalPrice: string;
  status: string;
  createdAt: string;
}

export default function OrdersPage() {
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [cancelling, setCancelling] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/orders?role=seller');
      if (!res.ok) throw new Error('Failed to fetch orders');
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (orderId: string) => {
    setCancelling(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to cancel order');
      }
      fetchOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel order');
    } finally {
      setCancelling(null);
    }
  };

  const getStatusBadge = (status: string, filled: string, total: string) => {
    const filledAmount = parseInt(filled);
    const totalAmount = parseInt(total);
    const fillPercentage = totalAmount > 0 ? (filledAmount / totalAmount) * 100 : 0;

    switch (status) {
      case 'OPEN':
        if (filledAmount > 0) {
          return (
            <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
              Partial ({fillPercentage.toFixed(0)}%)
            </Badge>
          );
        }
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
            Open
          </Badge>
        );
      case 'FILLED':
        return (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
            Filled
          </Badge>
        );
      case 'CANCELLED':
        return (
          <Badge variant="outline" className="bg-gray-500/10 text-gray-500 border-gray-500/20">
            Cancelled
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Orders</h1>
        <p className="text-muted-foreground">Manage your sell orders on the secondary market</p>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Sell Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No Orders</h3>
              <p className="text-muted-foreground mb-4">
                You haven&apos;t created any sell orders yet.
              </p>
              <Button asChild>
                <Link href="/dashboard/portfolio">Go to Portfolio</Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Invoice</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Amount</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Price/Token</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Total</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Filled</th>
                    <th className="text-center py-3 px-2 font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Created</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => {
                    const tokenAmount = parseInt(order.tokenAmount) / 10000000;
                    const filledAmount = parseInt(order.filledAmount || '0') / 10000000;
                    const pricePerToken = parseInt(order.pricePerToken) / 10000000;
                    const totalPrice = parseInt(order.totalPrice) / 10000000;

                    return (
                      <tr key={order.id} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="py-3 px-2">
                          <Link 
                            href={`/dashboard/invoices/${order.invoiceDbId}`}
                            className="font-medium hover:text-primary"
                          >
                            {order.invoiceId}
                          </Link>
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
                          {filledAmount.toFixed(2)} / {tokenAmount.toFixed(2)}
                        </td>
                        <td className="text-center py-3 px-2">
                          {getStatusBadge(order.status, order.filledAmount || '0', order.tokenAmount)}
                        </td>
                        <td className="py-3 px-2 text-muted-foreground">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </td>
                        <td className="text-right py-3 px-2">
                          {order.status === 'OPEN' && (
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handleCancel(order.id)}
                              disabled={cancelling === order.id}
                            >
                              {cancelling === order.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <X className="h-4 w-4" />
                              )}
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
    </div>
  );
}

'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ShoppingCart, X, AlertCircle, ShoppingBag } from 'lucide-react';
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

interface BuyOrder {
  id: string;
  orderId: string;
  invoiceId: string;
  tokenAmount: string;
  paymentAmount: string;
  sellerAddress: string;
  filledAt: string;
  txHash: string;
}

interface SaleOrder {
  id: string;
  orderId: string;
  invoiceId: string;
  tokenAmount: string;
  salePrice: string;
  costBasis: string;
  realizedPL: string;
  buyerAddress: string;
  soldAt: string;
  txHash: string;
}

export default function OrdersPage() {
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [buyHistory, setBuyHistory] = React.useState<BuyOrder[]>([]);
  const [salesHistory, setSalesHistory] = React.useState<SaleOrder[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [cancelling, setCancelling] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      // Fetch sell orders
      const sellRes = await fetch('/api/orders?role=seller');
      if (!sellRes.ok) throw new Error('Failed to fetch orders');
      const sellData = await sellRes.json();
      setOrders(sellData.orders || []);

      // Fetch buy history
      const buyRes = await fetch('/api/orders/history');
      if (buyRes.ok) {
        const buyData = await buyRes.json();
        setBuyHistory(buyData.purchases || []);
        setSalesHistory(buyData.sales || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (orderId: string) => {
    setCancelling(orderId);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, {
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to initiate cancellation');
      }

      const confirmRes = await fetch(`/api/orders/${orderId}/cancel`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txHash: 'direct-cancel-' + Date.now() }),
      });

      if (!confirmRes.ok) {
        const data = await confirmRes.json();
        throw new Error(data.error || 'Failed to confirm cancellation');
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

  const formatXLM = (stroops: string) => {
    return (parseInt(stroops || '0') / 10000000).toFixed(2);
  };

  const formatAddress = (addr: string) => {
    if (!addr) return '-';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
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
        <p className="text-muted-foreground">Manage your orders and view purchase history</p>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Sell Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Sell Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No sell orders yet.</p>
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

      {/* Sales History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Sales History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {salesHistory.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingBag className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No sales yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Order ID</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Invoice</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Tokens</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Sale Price</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Cost Basis</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Profit</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Buyer</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {salesHistory.map((sale) => {
                    const profit = parseFloat(formatXLM(sale.realizedPL));
                    const isProfitable = profit >= 0;
                    
                    return (
                      <tr key={sale.id} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="py-3 px-2 font-mono text-xs">
                          {sale.orderId}
                        </td>
                        <td className="py-3 px-2">
                          {sale.invoiceId}
                        </td>
                        <td className="text-right py-3 px-2 font-medium">
                          {formatXLM(sale.tokenAmount)}
                        </td>
                        <td className="text-right py-3 px-2 font-medium text-emerald-500">
                          {formatXLM(sale.salePrice)} XLM
                        </td>
                        <td className="text-right py-3 px-2 text-muted-foreground">
                          {formatXLM(sale.costBasis)} XLM
                        </td>
                        <td className={`text-right py-3 px-2 font-medium ${isProfitable ? 'text-emerald-500' : 'text-red-500'}`}>
                          {isProfitable ? '+' : ''}{profit.toFixed(2)} XLM
                        </td>
                        <td className="py-3 px-2 font-mono text-xs text-muted-foreground">
                          {formatAddress(sale.buyerAddress)}
                        </td>
                        <td className="py-3 px-2 text-muted-foreground">
                          {new Date(sale.soldAt).toLocaleDateString()}
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

      {/* Buy History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Purchase History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {buyHistory.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingBag className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No purchases yet.</p>
              <Button asChild className="mt-4" variant="outline">
                <Link href="/dashboard/secondary">Browse Secondary Market</Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Order ID</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Invoice</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Tokens</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Paid</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Seller</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {buyHistory.map((purchase) => (
                    <tr key={purchase.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-3 px-2 font-mono text-xs">
                        {purchase.orderId}
                      </td>
                      <td className="py-3 px-2">
                        {purchase.invoiceId}
                      </td>
                      <td className="text-right py-3 px-2 font-medium">
                        {formatXLM(purchase.tokenAmount)}
                      </td>
                      <td className="text-right py-3 px-2 font-medium text-emerald-500">
                        {formatXLM(purchase.paymentAmount)} XLM
                      </td>
                      <td className="py-3 px-2 font-mono text-xs text-muted-foreground">
                        {formatAddress(purchase.sellerAddress)}
                      </td>
                      <td className="py-3 px-2 text-muted-foreground">
                        {new Date(purchase.filledAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


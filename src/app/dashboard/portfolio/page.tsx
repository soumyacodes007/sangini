'use client';

import * as React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { CreateOrderModal } from '@/components/market/create-order-modal';
import { Loader2, Briefcase, TrendingUp, DollarSign, Tag } from 'lucide-react';
import Link from 'next/link';

interface Holding {
  invoiceId: string;
  invoiceDbId: string;
  tokenAmount: string;
  purchasePrice: string;
  currentValue: string;
  status: string;
  dueDate: number;
  description?: string;
}

export default function PortfolioPage() {
  const { walletAddress } = useAuth();
  const [holdings, setHoldings] = React.useState<Holding[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = React.useState<{
    id: string;
    invoiceId: string;
    amount: string;
    dueDate: number;
  } | null>(null);
  const [selectedHoldings, setSelectedHoldings] = React.useState(0);
  const [showSellModal, setShowSellModal] = React.useState(false);

  React.useEffect(() => {
    fetchHoldings();
  }, []);

  const fetchHoldings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/portfolio');
      if (!res.ok) throw new Error('Failed to fetch portfolio');
      const data = await res.json();
      setHoldings(data.holdings || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load portfolio');
    } finally {
      setLoading(false);
    }
  };

  const handleSell = (holding: Holding) => {
    setSelectedInvoice({
      id: holding.invoiceDbId,
      invoiceId: holding.invoiceId,
      amount: holding.tokenAmount,
      dueDate: holding.dueDate,
    });
    setSelectedHoldings(parseInt(holding.tokenAmount) / 10000000);
    setShowSellModal(true);
  };

  const handleCreateOrder = async (tokenAmount: string, pricePerToken: string) => {
    if (!selectedInvoice || !walletAddress) return;

    // Step 1: Get XDR from API
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invoiceId: selectedInvoice.id,
        tokenAmount,
        pricePerToken,
        sellerAddress: walletAddress,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to create order');
    }

    const { xdr, order } = await res.json();

    // Step 2: Sign with Freighter
    const { signTransaction } = await import('@stellar/freighter-api');
    const StellarSdk = await import('@stellar/stellar-sdk');
    
    const signResult = await signTransaction(xdr, {
      networkPassphrase: StellarSdk.Networks.TESTNET,
    });

    if (signResult.error) {
      throw new Error(signResult.error);
    }

    const signedXdr = signResult.signedTxXdr;
    const signedTx = StellarSdk.TransactionBuilder.fromXDR(signedXdr, StellarSdk.Networks.TESTNET);

    // Step 3: Submit to network
    const server = new StellarSdk.rpc.Server('https://soroban-testnet.stellar.org');
    const response = await server.sendTransaction(signedTx as StellarSdk.Transaction);

    if (response.status === 'PENDING') {
      let txResponse = await server.getTransaction(response.hash);
      while (txResponse.status === 'NOT_FOUND') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        txResponse = await server.getTransaction(response.hash);
      }
      if (txResponse.status !== 'SUCCESS') {
        throw new Error('Transaction failed on-chain');
      }
      
      // Extract order ID from transaction result if available
      // For now, generate a placeholder - the contract returns the order ID
      const orderId = `ORD-${Date.now()}`;
      
      // Step 4: Confirm order in database
      await fetch('/api/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          txHash: response.hash,
          orderId,
          invoiceId: order.invoiceId,
          tokenAmount,
          pricePerToken,
        }),
      });
    } else if (response.status === 'ERROR') {
      throw new Error(`Transaction error: ${response.errorResult}`);
    }

    fetchHoldings();
  };

  // Calculate totals
  const totalValue = holdings.reduce((sum, h) => sum + parseInt(h.currentValue || '0'), 0) / 10000000;
  const totalInvested = holdings.reduce((sum, h) => sum + parseInt(h.purchasePrice || '0'), 0) / 10000000;
  const totalPnL = totalValue - totalInvested;
  const pnlPercentage = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

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
        <h1 className="text-3xl font-bold tracking-tight">Portfolio</h1>
        <p className="text-muted-foreground">Manage your invoice token holdings</p>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalValue.toFixed(2)} XLM</div>
            <p className="text-xs text-muted-foreground">{holdings.length} positions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invested</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalInvested.toFixed(2)} XLM</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unrealized P&L</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {totalPnL >= 0 ? '+' : ''}{totalPnL.toFixed(2)} XLM
            </div>
            <p className="text-xs text-muted-foreground">
              {pnlPercentage >= 0 ? '+' : ''}{pnlPercentage.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Holdings Table */}
      <Card>
        <CardHeader>
          <CardTitle>Holdings</CardTitle>
        </CardHeader>
        <CardContent>
          {holdings.length === 0 ? (
            <div className="text-center py-12">
              <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No Holdings</h3>
              <p className="text-muted-foreground mb-4">Start investing in invoices to build your portfolio.</p>
              <Button asChild>
                <Link href="/dashboard/market">Browse Marketplace</Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Invoice</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Tokens</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Cost Basis</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Current Value</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">P&L</th>
                    <th className="text-center py-3 px-2 font-medium text-muted-foreground">Status</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((holding) => {
                    const tokens = parseInt(holding.tokenAmount) / 10000000;
                    const cost = parseInt(holding.purchasePrice) / 10000000;
                    const value = parseInt(holding.currentValue) / 10000000;
                    const pnl = value - cost;
                    const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;

                    return (
                      <tr key={holding.invoiceId} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="py-3 px-2">
                          <Link 
                            href={`/dashboard/invoices/${holding.invoiceDbId}`}
                            className="font-medium hover:text-primary"
                          >
                            {holding.invoiceId}
                          </Link>
                          {holding.description && (
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {holding.description}
                            </p>
                          )}
                        </td>
                        <td className="text-right py-3 px-2 font-medium">
                          {tokens.toFixed(2)}
                        </td>
                        <td className="text-right py-3 px-2">
                          {cost.toFixed(2)} XLM
                        </td>
                        <td className="text-right py-3 px-2 font-medium">
                          {value.toFixed(2)} XLM
                        </td>
                        <td className={`text-right py-3 px-2 font-medium ${pnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)} ({pnlPct.toFixed(1)}%)
                        </td>
                        <td className="text-center py-3 px-2">
                          <StatusBadge status={holding.status} size="sm" />
                        </td>
                        <td className="text-right py-3 px-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleSell(holding)}
                          >
                            <Tag className="h-3 w-3 mr-1" />
                            Sell
                          </Button>
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

      <CreateOrderModal
        open={showSellModal}
        onOpenChange={setShowSellModal}
        invoice={selectedInvoice}
        holdings={selectedHoldings}
        onConfirm={handleCreateOrder}
      />
    </div>
  );
}

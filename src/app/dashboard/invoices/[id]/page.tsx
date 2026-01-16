"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { useInvoice } from "@/hooks/useInvoices"
import { useAuth } from "@/hooks/useAuth"
import { useFreighterWallet } from "@/hooks/useFreighterWallet"
import { useStore } from "@/lib/store"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { StartAuctionModal } from "@/components/invoice/start-auction-modal"
import {
    ArrowLeft,
    Loader2,
    Calendar,
    User,
    FileText,
    Clock,
    TrendingUp,
    ExternalLink,
    Gavel
} from "lucide-react"
import Link from "next/link"
import * as StellarSdk from '@stellar/stellar-sdk'
import { signTransaction } from '@stellar/freighter-api'

export default function InvoiceDetailPage() {
    const params = useParams()
    const router = useRouter()
    const { userType } = useAuth()
    const freighterWallet = useFreighterWallet()
    const globalWallet = useStore(state => state.wallet)
    const { invoice, loading, error, refetch } = useInvoice(params.id as string)

    // Use either freighter hook or global store for connection status
    const isConnected = freighterWallet.isConnected || globalWallet.isConnected
    const publicKey = freighterWallet.publicKey || globalWallet.address

    // Auction modal state
    const [auctionModalOpen, setAuctionModalOpen] = React.useState(false)
    const [actionLoading, setActionLoading] = React.useState(false)
    const [actionError, setActionError] = React.useState<string | null>(null)

    const handleStartAuction = async (params: { duration: number; maxDiscount: number }) => {
        if (!invoice || !publicKey) return

        setActionLoading(true)
        setActionError(null)

        try {
            // Convert duration from seconds to hours
            const durationHours = Math.ceil(params.duration / 3600)
            // Convert discount percent to basis points
            const maxDiscountBps = params.maxDiscount * 100

            // Get the XDR from the API
            const res = await fetch(`/api/invoices/${invoice.id}/auction`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    durationHours,
                    maxDiscountBps,
                }),
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Failed to prepare auction')
            }

            const { xdr } = await res.json()

            // Sign with Freighter
            const signResult = await signTransaction(xdr, {
                networkPassphrase: StellarSdk.Networks.TESTNET,
            })

            const signedXdr = signResult.signedTxXdr
            const signedTx = StellarSdk.TransactionBuilder.fromXDR(signedXdr, StellarSdk.Networks.TESTNET)

            // Submit to network
            const server = new StellarSdk.rpc.Server('https://soroban-testnet.stellar.org')
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const response = await server.sendTransaction(signedTx as any)

            if (response.status === 'PENDING') {
                let txResponse = await server.getTransaction(response.hash)
                while (txResponse.status === 'NOT_FOUND') {
                    await new Promise(resolve => setTimeout(resolve, 1000))
                    txResponse = await server.getTransaction(response.hash)
                }

                if (txResponse.status !== 'SUCCESS') {
                    throw new Error('Transaction failed')
                }
            }

            // Confirm auction in database
            await fetch(`/api/invoices/${invoice.id}/auction`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    txHash: response.hash,
                    durationHours,
                    maxDiscountBps,
                }),
            })

            // Refresh invoice data
            refetch()
            setAuctionModalOpen(false)
        } catch (err) {
            console.error('Start auction failed:', err)
            setActionError(err instanceof Error ? err.message : 'Failed to start auction')
            throw err
        } finally {
            setActionLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (error || !invoice) {
        return (
            <div className="p-8">
                <Button variant="ghost" onClick={() => router.back()} className="mb-4">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                </Button>
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Invoice Not Found</h3>
                        <p className="text-muted-foreground">{error || 'The invoice you are looking for does not exist.'}</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const amountXLM = (parseInt(invoice.amount) / 10000000).toFixed(2)
    const hasAuction = invoice.auctionStart && invoice.auctionStart > 0
    const isAuctionActive = hasAuction && invoice.status === 'FUNDING'

    return (
        <div className="p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">{invoice.invoiceId}</h1>
                        <p className="text-muted-foreground">{invoice.description}</p>
                    </div>
                </div>
                <StatusBadge status={invoice.status} size="lg" />
            </div>

            {/* Main Info */}
            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Invoice Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between items-center py-2 border-b">
                            <span className="text-muted-foreground">Amount</span>
                            <span className="text-2xl font-bold">{amountXLM} XLM</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b">
                            <span className="text-muted-foreground">Currency</span>
                            <span>{invoice.currency}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b">
                            <span className="text-muted-foreground">Purchase Order</span>
                            <span className="font-mono text-sm">{invoice.purchaseOrder}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b">
                            <span className="text-muted-foreground">Created</span>
                            <span>{new Date(invoice.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                            <span className="text-muted-foreground">Due Date</span>
                            <span>{new Date(invoice.dueDate * 1000).toLocaleDateString()}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Parties</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="p-3 rounded-lg bg-muted/50">
                            <div className="flex items-center gap-2 mb-1">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">Supplier</span>
                            </div>
                            <p className="font-mono text-xs break-all">{invoice.supplier}</p>
                            {invoice.supplierName && (
                                <p className="text-sm mt-1">{invoice.supplierName}</p>
                            )}
                        </div>
                        <div className="p-3 rounded-lg bg-muted/50">
                            <div className="flex items-center gap-2 mb-1">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">Buyer</span>
                            </div>
                            <p className="font-mono text-xs break-all">{invoice.buyer}</p>
                            {invoice.buyerName && (
                                <p className="text-sm mt-1">{invoice.buyerName}</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Auction Info */}
            {hasAuction && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5" />
                            Auction Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-4">
                            <div className="p-3 rounded-lg bg-muted/50">
                                <p className="text-sm text-muted-foreground">Start Price</p>
                                <p className="text-lg font-bold">
                                    {invoice.startPrice ? (parseInt(invoice.startPrice) / 10000000).toFixed(2) : '-'} XLM
                                </p>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/50">
                                <p className="text-sm text-muted-foreground">Min Price</p>
                                <p className="text-lg font-bold">
                                    {invoice.minPrice ? (parseInt(invoice.minPrice) / 10000000).toFixed(2) : '-'} XLM
                                </p>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/50">
                                <p className="text-sm text-muted-foreground">Auction Start</p>
                                <p className="text-sm">
                                    {invoice.auctionStart ? new Date(invoice.auctionStart * 1000).toLocaleString() : '-'}
                                </p>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/50">
                                <p className="text-sm text-muted-foreground">Auction End</p>
                                <p className="text-sm">
                                    {invoice.auctionEnd ? new Date(invoice.auctionEnd * 1000).toLocaleString() : '-'}
                                </p>
                            </div>
                        </div>

                        {/* Token Info */}
                        {invoice.totalTokens && (
                            <div className="mt-4 p-4 rounded-lg border">
                                <h4 className="font-medium mb-3">Token Distribution</h4>
                                <div className="grid gap-4 md:grid-cols-3">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Total Tokens</p>
                                        <p className="font-bold">{(parseInt(invoice.totalTokens) / 10000000).toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Tokens Sold</p>
                                        <p className="font-bold">{(parseInt(invoice.tokensSold || '0') / 10000000).toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Remaining</p>
                                        <p className="font-bold">{(parseInt(invoice.tokensRemaining || '0') / 10000000).toFixed(2)}</p>
                                    </div>
                                </div>
                                {/* Progress bar */}
                                <div className="mt-3">
                                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-emerald-500 transition-all"
                                            style={{
                                                width: `${invoice.totalTokens ?
                                                    (parseInt(invoice.tokensSold || '0') / parseInt(invoice.totalTokens) * 100) : 0}%`
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Actions */}
            <Card>
                <CardHeader>
                    <CardTitle>Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {actionError && (
                        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                            {actionError}
                        </div>
                    )}

                    {/* Status-based guidance */}
                    {invoice.status === 'DRAFT' && userType === 'SUPPLIER' && (
                        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 text-sm">
                            <p className="font-medium">Awaiting Buyer Approval</p>
                            <p className="text-muted-foreground mt-1">
                                The buyer needs to approve this invoice before you can start an auction.
                            </p>
                        </div>
                    )}

                    {invoice.status === 'VERIFIED' && userType === 'SUPPLIER' && !isConnected && (
                        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 text-sm">
                            <p className="font-medium">Wallet Not Connected</p>
                            <p className="text-muted-foreground mt-1">
                                Connect your Freighter wallet to start an auction.
                            </p>
                        </div>
                    )}

                    <div className="flex flex-wrap gap-3">
                        {invoice.status === 'DRAFT' && userType === 'BUYER' && (
                            <Button className="bg-emerald-600 hover:bg-emerald-700">
                                Approve Invoice
                            </Button>
                        )}
                        {invoice.status === 'VERIFIED' && userType === 'SUPPLIER' && (
                            <Button
                                onClick={() => setAuctionModalOpen(true)}
                                disabled={!isConnected || actionLoading}
                            >
                                <Gavel className="h-4 w-4 mr-2" />
                                Start Dutch Auction
                            </Button>
                        )}
                        {isAuctionActive && userType === 'INVESTOR' && (
                            <Button className="bg-blue-600 hover:bg-blue-700">
                                Invest
                            </Button>
                        )}
                        {(invoice.status === 'FUNDED' || invoice.status === 'OVERDUE') && userType === 'BUYER' && (
                            <Button className="bg-emerald-600 hover:bg-emerald-700">
                                Settle Invoice
                            </Button>
                        )}
                        {invoice.documentHash && (
                            <Button variant="outline" asChild>
                                <a
                                    href={`https://gateway.pinata.cloud/ipfs/${invoice.documentHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <FileText className="h-4 w-4 mr-2" />
                                    View Document
                                    <ExternalLink className="h-3 w-3 ml-2" />
                                </a>
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Start Auction Modal */}
            <StartAuctionModal
                open={auctionModalOpen}
                onOpenChange={setAuctionModalOpen}
                invoice={invoice ? {
                    id: invoice.id,
                    invoiceId: invoice.invoiceId,
                    amount: invoice.amount,
                    dueDate: invoice.dueDate,
                } : null}
                onConfirm={handleStartAuction}
            />
        </div>
    )
}

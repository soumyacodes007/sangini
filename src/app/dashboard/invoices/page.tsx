"use client"

import * as React from "react"
import { useAuth } from "@/hooks/useAuth"
import { useInvoices } from "@/hooks/useInvoices"
import { useFreighterWallet } from "@/hooks/useFreighterWallet"
import { useStore } from "@/lib/store"
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { StartAuctionModal } from "@/components/invoice/start-auction-modal"
import {
    Loader2,
    AlertCircle,
    FileText,
    ExternalLink,
    Gavel,
    PlusCircle,
    CheckCircle2,
    Wallet
} from "lucide-react"
import Link from "next/link"
import * as StellarSdk from '@stellar/stellar-sdk'
import { signTransaction } from '@stellar/freighter-api'

export default function MyInvoicesPage() {
    const { userType } = useAuth()
    const freighterWallet = useFreighterWallet()
    const globalWallet = useStore(state => state.wallet)
    const { invoices, loading, error: fetchError, refetch } = useInvoices({
        role: 'supplier'
    })

    // Use either freighter hook or global store for connection status
    const isConnected = freighterWallet.isConnected || globalWallet.isConnected
    const publicKey = freighterWallet.publicKey || globalWallet.address

    const [selectedInvoice, setSelectedInvoice] = React.useState<typeof invoices[0] | null>(null)
    const [auctionModalOpen, setAuctionModalOpen] = React.useState(false)
    const [actionLoading, setActionLoading] = React.useState<string | null>(null)
    const [error, setError] = React.useState<string | null>(null)
    const [success, setSuccess] = React.useState<string | null>(null)

    const handleStartAuction = async (params: { duration: number; maxDiscount: number }) => {
        if (!selectedInvoice || !publicKey) return

        setActionLoading(selectedInvoice.id)
        setError(null)

        try {
            const durationHours = Math.ceil(params.duration / 3600)
            const maxDiscountBps = params.maxDiscount * 100

            // Get the XDR from the API
            const res = await fetch(`/api/invoices/${selectedInvoice.id}/auction`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ durationHours, maxDiscountBps }),
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
            await fetch(`/api/invoices/${selectedInvoice.id}/auction`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ txHash: response.hash, durationHours, maxDiscountBps }),
            })

            setSuccess(`Auction started for ${selectedInvoice.invoiceId}!`)
            setAuctionModalOpen(false)
            refetch()
        } catch (err) {
            console.error('Start auction failed:', err)
            setError(err instanceof Error ? err.message : 'Failed to start auction')
            throw err
        } finally {
            setActionLoading(null)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="p-8 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">My Invoices</h1>
                    <p className="text-muted-foreground">Manage your invoices and start auctions.</p>
                </div>
                <Button asChild>
                    <Link href="/dashboard/create">
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Create Invoice
                    </Link>
                </Button>
            </div>

            {/* Wallet Connection Warning */}
            {!isConnected && (
                <Card className="border-amber-500/50 bg-amber-500/10">
                    <CardContent className="flex items-center gap-4 p-4">
                        <AlertCircle className="h-5 w-5 text-amber-500" />
                        <div className="flex-1">
                            <p className="font-medium">Wallet Not Connected</p>
                            <p className="text-sm text-muted-foreground">
                                Connect your Freighter wallet to start auctions for your invoices.
                            </p>
                        </div>
                        <Button onClick={() => freighterWallet.connect()} className="gap-2">
                            <Wallet className="h-4 w-4" />
                            Connect
                        </Button>
                    </CardContent>
                </Card>
            )}

            {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                </div>
            )}

            {success && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    {success}
                </div>
            )}

            {fetchError && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {fetchError}
                </div>
            )}

            {invoices.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No Invoices Yet</h3>
                        <p className="text-muted-foreground text-center mb-4">
                            Create your first invoice to start getting financing.
                        </p>
                        <Button asChild>
                            <Link href="/dashboard/create">
                                <PlusCircle className="h-4 w-4 mr-2" />
                                Create Invoice
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-6">
                    {invoices.map((inv) => (
                        <Card key={inv.id}>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <CardTitle className="flex items-center gap-2">
                                            <Link
                                                href={`/dashboard/invoices/${inv.id}`}
                                                className="hover:text-primary"
                                            >
                                                {inv.invoiceId || inv.id}
                                            </Link>
                                            <StatusBadge status={inv.status} size="sm" />
                                        </CardTitle>
                                        <CardDescription>
                                            {inv.description || 'Invoice'} • Due: {new Date(inv.dueDate * 1000).toLocaleDateString()}
                                        </CardDescription>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-bold">
                                            {(parseInt(inv.amount) / 10000000).toLocaleString()} XLM
                                        </div>
                                        <div className="text-xs text-muted-foreground">Invoice Amount</div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div className="flex flex-col">
                                        <span className="text-muted-foreground">Buyer</span>
                                        <span className="font-mono text-xs">
                                            {inv.buyerName || `${inv.buyer.substring(0, 12)}...`}
                                        </span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-muted-foreground">Created</span>
                                        <span>{new Date(inv.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-muted-foreground">Purchase Order</span>
                                        <span>{inv.purchaseOrder}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-muted-foreground">Document</span>
                                        {inv.documentHash ? (
                                            <a
                                                href={`https://gateway.pinata.cloud/ipfs/${inv.documentHash}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-primary hover:underline flex items-center gap-1"
                                            >
                                                <FileText className="h-3 w-3" />
                                                View
                                                <ExternalLink className="h-3 w-3" />
                                            </a>
                                        ) : (
                                            <span className="text-muted-foreground">None</span>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="bg-muted/30 flex justify-between items-center gap-3 pt-6">
                                <div className="text-sm text-muted-foreground">
                                    Status: <span className="font-medium">{inv.status}</span>
                                </div>
                                <div className="flex gap-3">
                                    <Button variant="outline" asChild>
                                        <Link href={`/dashboard/invoices/${inv.id}`}>
                                            View Details
                                        </Link>
                                    </Button>
                                    {inv.status === 'VERIFIED' && (
                                        <Button
                                            onClick={() => {
                                                setSelectedInvoice(inv)
                                                setAuctionModalOpen(true)
                                            }}
                                            disabled={!isConnected || actionLoading === inv.id}
                                            className="bg-primary"
                                        >
                                            {actionLoading === inv.id ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Starting...
                                                </>
                                            ) : (
                                                <>
                                                    <Gavel className="mr-2 h-4 w-4" />
                                                    Start Auction
                                                </>
                                            )}
                                        </Button>
                                    )}
                                    {inv.status === 'DRAFT' && (
                                        <span className="text-sm text-amber-500 px-3 py-2 bg-amber-500/10 rounded-md">
                                            Awaiting buyer approval
                                        </span>
                                    )}
                                    {inv.status === 'FUNDING' && (
                                        <span className="text-sm text-emerald-500 px-3 py-2 bg-emerald-500/10 rounded-md">
                                            Auction in progress
                                        </span>
                                    )}
                                </div>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}

            {/* Start Auction Modal */}
            <StartAuctionModal
                open={auctionModalOpen}
                onOpenChange={setAuctionModalOpen}
                invoice={selectedInvoice ? {
                    id: selectedInvoice.id,
                    invoiceId: selectedInvoice.invoiceId,
                    amount: selectedInvoice.amount,
                    dueDate: selectedInvoice.dueDate,
                } : null}
                onConfirm={handleStartAuction}
            />
        </div>
    )
}

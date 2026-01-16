"use client"

import * as React from "react"
import { useSession } from "next-auth/react"
import { useAuth } from "@/hooks/useAuth"
import { useInvoices } from "@/hooks/useInvoices"
import { useFreighterWallet } from "@/hooks/useFreighterWallet"
import { AuctionCard } from "@/components/invoice/auction-card"
import { InvestModal } from "@/components/invoice/invest-modal"
import { KYCForm } from "@/components/kyc/kyc-form"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { TrendingUp, ShieldCheck, Loader2, AlertCircle, Wallet, Search, CheckCircle2 } from "lucide-react"
import { useRouter } from "next/navigation"

export default function MarketplacePage() {
    const { update: updateSession } = useSession()
    const { isKycApproved, kycStatus } = useAuth()
    const { publicKey, isConnected, connect } = useFreighterWallet()
    const { invoices, loading, error, refetch } = useInvoices({ status: 'FUNDING' })
    const router = useRouter()

    const [selectedInvoice, setSelectedInvoice] = React.useState<typeof invoices[0] | null>(null)
    const [showInvestModal, setShowInvestModal] = React.useState(false)
    const [searchTerm, setSearchTerm] = React.useState("")
    const [sortBy, setSortBy] = React.useState("discount")
    const [showKycForm, setShowKycForm] = React.useState(false)
    const [kycSuccess, setKycSuccess] = React.useState(false)

    // Handle KYC success - refresh session to get updated KYC status
    const handleKycSuccess = async () => {
        setKycSuccess(true)
        setShowKycForm(false)
        // Update the session to get fresh KYC status
        await updateSession()
        // Small delay then reload to ensure session is updated
        setTimeout(() => {
            window.location.reload()
        }, 1500)
    }

    // Filter and sort invoices
    const filteredInvoices = React.useMemo(() => {
        let result = [...invoices]

        // Search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase()
            result = result.filter(inv =>
                inv.invoiceId?.toLowerCase().includes(term) ||
                inv.description?.toLowerCase().includes(term) ||
                inv.buyerName?.toLowerCase().includes(term)
            )
        }

        // Sort
        result.sort((a, b) => {
            switch (sortBy) {
                case "discount":
                    // Higher discount first
                    const discountA = a.startPrice && a.minPrice
                        ? (parseInt(a.startPrice) - parseInt(a.minPrice)) / parseInt(a.startPrice)
                        : 0
                    const discountB = b.startPrice && b.minPrice
                        ? (parseInt(b.startPrice) - parseInt(b.minPrice)) / parseInt(b.startPrice)
                        : 0
                    return discountB - discountA
                case "amount":
                    return parseInt(b.amount) - parseInt(a.amount)
                case "time":
                    return (a.auctionEnd || 0) - (b.auctionEnd || 0)
                default:
                    return 0
            }
        })

        return result
    }, [invoices, searchTerm, sortBy])

    const handleInvest = (invoice: typeof invoices[0]) => {
        setSelectedInvoice(invoice)
        setShowInvestModal(true)
    }

    const handleConfirmInvest = async (tokenAmount: string, paymentAmount: string) => {
        if (!selectedInvoice || !publicKey) return

        // Step 0: Ensure on-chain KYC is set
        try {
            const syncRes = await fetch('/api/kyc/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ walletAddress: publicKey }),
            })

            const syncData = await syncRes.json()

            if (!syncRes.ok) {
                // If it's a relayer/admin issue, provide helpful message
                if (syncData.error?.includes('admin') || syncData.error?.includes('Unauthorized') || syncData.error?.includes('relayer')) {
                    console.warn('On-chain KYC sync failed (relayer not authorized). Proceeding anyway...')
                    // Continue - the invest call will fail with a clearer error if KYC is really required
                } else if (!syncData.success && !syncData.onChainStatus) {
                    throw new Error(syncData.error || 'Failed to sync KYC on-chain')
                }
            }
        } catch (syncError) {
            console.warn('KYC sync warning:', syncError)
            // Continue anyway - let the invest call provide the actual error
        }

        // Step 1: Get XDR from API
        const res = await fetch(`/api/invoices/${selectedInvoice.id}/fund`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tokenAmount, investorAddress: publicKey }),
        })

        if (!res.ok) {
            const data = await res.json()
            throw new Error(data.error || 'Failed to prepare investment')
        }

        const { xdr } = await res.json()

        // Step 2: Sign with Freighter
        const { signTransaction } = await import('@stellar/freighter-api')
        const StellarSdk = await import('@stellar/stellar-sdk')

        const signResult = await signTransaction(xdr, {
            networkPassphrase: StellarSdk.Networks.TESTNET,
        })

        const signedXdr = signResult.signedTxXdr
        const signedTx = StellarSdk.TransactionBuilder.fromXDR(signedXdr, StellarSdk.Networks.TESTNET)

        // Step 3: Submit to network
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

        // Step 4: Confirm investment in database
        await fetch(`/api/invoices/${selectedInvoice.id}/fund`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                txHash: response.hash,
                tokenAmount,
                paymentAmount,
                investorAddress: publicKey,
            }),
        })

        refetch()
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Marketplace</h1>
                    <p className="text-muted-foreground">Browse high-yield invoice assets verified on Stellar.</p>
                </div>
                <div className="flex gap-2">
                    <Card className="p-3 flex items-center gap-3 bg-secondary/50 border-none">
                        <ShieldCheck className="h-5 w-5 text-emerald-500" />
                        <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground">Verified Assets</span>
                            <span className="font-bold text-sm">100% On-Chain</span>
                        </div>
                    </Card>
                    <Card className="p-3 flex items-center gap-3 bg-secondary/50 border-none">
                        <TrendingUp className="h-5 w-5 text-blue-500" />
                        <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground">Active Auctions</span>
                            <span className="font-bold text-sm">{invoices.length}</span>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Wallet Connection */}
            {!isConnected && (
                <Card className="border-amber-500/50 bg-amber-500/10">
                    <CardContent className="flex items-center gap-4 p-4">
                        <AlertCircle className="h-5 w-5 text-amber-500" />
                        <div className="flex-1">
                            <p className="font-medium">Wallet Required</p>
                            <p className="text-sm text-muted-foreground">Connect your Freighter wallet to invest in invoices.</p>
                        </div>
                        <Button onClick={connect} className="gap-2">
                            <Wallet className="h-4 w-4" />
                            Connect
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* KYC Verification */}
            {isConnected && !isKycApproved && !kycSuccess && (
                <Card className="border-amber-500/50 bg-amber-500/5">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <ShieldCheck className="h-5 w-5 text-amber-500" />
                                    KYC Verification Required
                                </CardTitle>
                                <CardDescription>
                                    Complete KYC verification to invest in invoice tokens.
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {showKycForm ? (
                            <KYCForm onSuccess={handleKycSuccess} />
                        ) : (
                            <div className="flex items-center gap-4">
                                <div className="flex-1">
                                    <p className="text-sm text-muted-foreground">
                                        Verify your identity to access investment features. This only takes a minute.
                                    </p>
                                </div>
                                <Button onClick={() => setShowKycForm(true)}>
                                    <ShieldCheck className="h-4 w-4 mr-2" />
                                    Complete KYC
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* KYC Success Message */}
            {kycSuccess && (
                <Card className="border-emerald-500/50 bg-emerald-500/5">
                    <CardContent className="flex items-center gap-4 p-6">
                        <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                        </div>
                        <div className="flex-1">
                            <p className="font-semibold text-emerald-600">KYC Approved!</p>
                            <p className="text-sm text-muted-foreground">Refreshing page to enable investments...</p>
                        </div>
                        <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
                    </CardContent>
                </Card>
            )}

            {/* KYC Approved Badge */}
            {isConnected && isKycApproved && (
                <Card className="border-emerald-500/50 bg-emerald-500/5">
                    <CardContent className="flex items-center gap-4 p-4">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        <div className="flex-1">
                            <p className="font-medium text-emerald-600">KYC Verified</p>
                            <p className="text-sm text-muted-foreground">You can invest in any available auction.</p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search invoices..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="discount">Highest Discount</SelectItem>
                        <SelectItem value="amount">Largest Amount</SelectItem>
                        <SelectItem value="time">Ending Soon</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Auction Grid */}
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {filteredInvoices.length === 0 ? (
                    <div className="col-span-full py-12 text-center">
                        <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                        <h3 className="text-lg font-semibold mb-2">No Active Auctions</h3>
                        <p className="text-muted-foreground">
                            {searchTerm
                                ? "No invoices match your search criteria."
                                : "No verified invoices available for funding right now."}
                        </p>
                    </div>
                ) : (
                    filteredInvoices.map((invoice) => (
                        <AuctionCard
                            key={invoice.id}
                            invoice={invoice}
                            onInvest={() => handleInvest(invoice)}
                        />
                    ))
                )}
            </div>

            {/* Invest Modal */}
            <InvestModal
                open={showInvestModal}
                onOpenChange={setShowInvestModal}
                invoice={selectedInvoice}
                onConfirm={handleConfirmInvest}
            />
        </div>
    )
}

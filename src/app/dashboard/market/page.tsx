"use client"

import * as React from "react"
import { useStore } from "@/lib/store"
import { useFreighterWallet } from "@/hooks/useFreighterWallet"
import { fundInvoiceBrowser } from "@/lib/contracts/browser-client"
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { InvoiceStatus } from "@/lib/contracts/config"
import { TrendingUp, ShieldCheck, DollarSign, Loader2, AlertCircle, Wallet } from "lucide-react"

// Smart Mock: Match smart contract base rate (10% = 1000 basis points)
const PROTOCOL_APY = 10

export default function MarketplacePage() {
    const { invoices, updateInvoice, addNotification } = useStore()
    const { publicKey, isConnected, connect } = useFreighterWallet()
    const [investing, setInvesting] = React.useState<string | null>(null)
    const [error, setError] = React.useState<string | null>(null)

    // Filter for Verified invoices (ready to be funded)
    const marketInvoices = invoices.filter(
        (inv) => inv.status === InvoiceStatus.Verified
    )

    // Calculate estimated profit for an invoice
    const calculateEstProfit = (amount: string): number => {
        const amountNum = parseInt(amount) / 10000000 // Convert from stroops to XLM
        return Math.round((amountNum * PROTOCOL_APY) / 100)
    }

    const handleInvest = async (id: string, tokenAmount: string) => {
        setError(null)

        if (!isConnected || !publicKey) {
            setError("Please connect your wallet first")
            return
        }

        setInvesting(id)

        try {
            // Convert to bigint for contract
            // For demo: investing the full token amount with equivalent payment
            const tokenAmountBigInt = BigInt(tokenAmount)
            // Payment amount could be calculated differently, for now use same as token amount
            const paymentAmountBigInt = BigInt(tokenAmount)

            // Call the real contract with all 4 parameters
            await fundInvoiceBrowser(publicKey, id, tokenAmountBigInt, paymentAmountBigInt)

            // Update local state
            updateInvoice(id, {
                status: InvoiceStatus.Funded,
            })

            addNotification({
                type: 'success',
                title: 'Investment Successful!',
                message: `You have funded invoice ${id} on-chain`
            })
        } catch (err: any) {
            console.error('Investment failed:', err)
            addNotification({
                type: 'error',
                title: 'Investment Failed',
                message: err.message || 'Something went wrong'
            })
            setError(err.message || 'Failed to fund invoice')
        } finally {
            setInvesting(null)
        }
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
                            <span className="text-xs text-muted-foreground">Protocol APY</span>
                            <span className="font-bold text-sm">{PROTOCOL_APY}%</span>
                        </div>
                    </Card>
                </div>
            </div>

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

            {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                </div>
            )}

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {marketInvoices.length === 0 ? (
                    <div className="col-span-full py-12 text-center text-muted-foreground">
                        No verified invoices available for funding right now.
                    </div>
                ) : (
                    marketInvoices.map((inv) => {
                        const amountXLM = (parseInt(inv.amount) / 10000000).toLocaleString()
                        const estProfit = calculateEstProfit(inv.amount)

                        return (
                            <Card key={inv.id} className="flex flex-col hover:border-primary/50 transition-colors">
                                <CardHeader>
                                    <div className="flex justify-between items-start mb-2">
                                        <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                                            Verified
                                        </Badge>
                                        <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                                            {PROTOCOL_APY}% APY
                                        </Badge>
                                    </div>
                                    <CardTitle className="text-xl">
                                        {amountXLM} <span className="text-sm font-normal text-muted-foreground">XLM</span>
                                    </CardTitle>
                                    <CardDescription className="line-clamp-2">
                                        {inv.description}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="flex-1">
                                    <div className="space-y-4">
                                        <div className="flex justify-between text-sm border-b pb-2">
                                            <span className="text-muted-foreground">Maturity Date</span>
                                            <span className="font-medium">{new Date(inv.dueDate * 1000).toLocaleDateString()}</span>
                                        </div>
                                        <div className="flex justify-between text-sm border-b pb-2">
                                            <span className="text-muted-foreground">Est. Profit</span>
                                            <span className="font-medium text-emerald-500">+{estProfit.toLocaleString()} XLM</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Buyer</span>
                                            <span className="font-mono text-xs">{inv.buyer.substring(0, 8)}...</span>
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter className="pt-4">
                                    <Button
                                        className="w-full gap-2"
                                        onClick={() => handleInvest(inv.id, inv.amount)}
                                        disabled={!!investing || !isConnected}
                                    >
                                        {investing === inv.id ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Signing...
                                            </>
                                        ) : (
                                            <>
                                                <DollarSign className="h-4 w-4" />
                                                Fund Invoice (On-Chain)
                                            </>
                                        )}
                                    </Button>
                                </CardFooter>
                            </Card>
                        )
                    })
                )}
            </div>
        </div>
    )
}

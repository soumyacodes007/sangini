"use client"

import * as React from "react"
import { useStore } from "@/lib/store"
import { useFreighterWallet } from "@/hooks/useFreighterWallet"
import { approveInvoiceBrowser } from "@/lib/contracts/browser-client"
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { InvoiceStatus } from "@/lib/contracts/config"
import { CheckCircle2, Loader2, AlertCircle, Wallet } from "lucide-react"

export default function BuyerRequestsPage() {
    const { invoices, updateInvoice, addNotification } = useStore()
    const { publicKey, isConnected, connect } = useFreighterWallet()
    const [approving, setApproving] = React.useState<string | null>(null)
    const [error, setError] = React.useState<string | null>(null)

    // Filter for invoices where status is Draft (waiting for approval)
    const pendingInvoices = invoices.filter(
        (inv) => inv.status === InvoiceStatus.Draft
    )

    const handleApprove = async (id: string) => {
        setError(null)

        if (!isConnected || !publicKey) {
            setError("Please connect your wallet first")
            return
        }

        setApproving(id)

        try {
            // Call the real contract
            await approveInvoiceBrowser(publicKey, id)

            // Update local state
            updateInvoice(id, {
                status: InvoiceStatus.Verified,
                verifiedAt: Math.floor(Date.now() / 1000)
            })

            addNotification({
                type: 'success',
                title: 'Invoice Approved!',
                message: `Invoice ${id} has been verified on-chain`
            })
        } catch (err: any) {
            console.error('Approval failed:', err)
            setError(err.message || 'Failed to approve invoice')
        } finally {
            setApproving(null)
        }
    }

    return (
        <div className="p-8 space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Pending Approvals</h1>
                <p className="text-muted-foreground">Review and verify invoices from your suppliers.</p>
            </div>

            {!isConnected && (
                <Card className="border-amber-500/50 bg-amber-500/10">
                    <CardContent className="flex items-center gap-4 p-4">
                        <AlertCircle className="h-5 w-5 text-amber-500" />
                        <div className="flex-1">
                            <p className="font-medium">Wallet Required</p>
                            <p className="text-sm text-muted-foreground">Connect your Freighter wallet to approve invoices.</p>
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

            {pendingInvoices.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 border rounded-lg bg-muted/10 border-dashed">
                    <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold">All Caught Up</h3>
                    <p className="text-muted-foreground">No pending invoice requests found.</p>
                </div>
            ) : (
                <div className="grid gap-6">
                    {pendingInvoices.map((inv, index) => (
                        <Card key={`${inv.id}-${index}`}>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <CardTitle>{inv.description}</CardTitle>
                                        <CardDescription>Invoice ID: {inv.id} • Due: {new Date(inv.dueDate * 1000).toLocaleDateString()}</CardDescription>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-bold">
                                            {(parseInt(inv.amount) / 10000000).toLocaleString()} XLM
                                        </div>
                                        <div className="text-xs text-muted-foreground">Amount Due</div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div className="flex flex-col">
                                        <span className="text-muted-foreground">Supplier</span>
                                        <span className="font-mono text-xs">{inv.supplier.substring(0, 12)}...</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-muted-foreground">Created Date</span>
                                        <span>{new Date(inv.createdAt * 1000).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-muted-foreground">Purchase Order</span>
                                        <span>{inv.purchaseOrder}</span>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="bg-muted/30 flex justify-end gap-3 pt-6">
                                <Button variant="outline">Reject</Button>
                                <Button
                                    onClick={() => handleApprove(inv.id)}
                                    disabled={!!approving || !isConnected}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                    {approving === inv.id ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Signing...
                                        </>
                                    ) : (
                                        "Approve & Verify (On-Chain)"
                                    )}
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}

"use client"

import * as React from "react"
import { useAuth } from "@/hooks/useAuth"
import { useInvoices } from "@/hooks/useInvoices"
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { CheckCircle2, Loader2, AlertCircle, FileText, ExternalLink } from "lucide-react"
import Link from "next/link"

export default function BuyerRequestsPage() {
    const { userType } = useAuth()
    const { invoices, loading, error: fetchError, refetch } = useInvoices({ 
        status: 'DRAFT', 
        role: 'buyer' 
    })
    const [approving, setApproving] = React.useState<string | null>(null)
    const [rejecting, setRejecting] = React.useState<string | null>(null)
    const [error, setError] = React.useState<string | null>(null)
    const [success, setSuccess] = React.useState<string | null>(null)

    const handleApprove = async (id: string) => {
        setError(null)
        setSuccess(null)
        setApproving(id)

        try {
            // Use meta-tx API for buyers (no wallet signature needed)
            const res = await fetch(`/api/invoices/${id}/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Failed to approve invoice')
            }

            setSuccess(`Invoice approved successfully!`)
            refetch()
        } catch (err: unknown) {
            console.error('Approval failed:', err)
            setError(err instanceof Error ? err.message : 'Failed to approve invoice')
        } finally {
            setApproving(null)
        }
    }

    const handleReject = async (id: string) => {
        setError(null)
        setSuccess(null)
        setRejecting(id)

        try {
            const res = await fetch(`/api/invoices/${id}/reject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Failed to reject invoice')
            }

            setSuccess(`Invoice rejected.`)
            refetch()
        } catch (err: unknown) {
            console.error('Rejection failed:', err)
            setError(err instanceof Error ? err.message : 'Failed to reject invoice')
        } finally {
            setRejecting(null)
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
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Pending Approvals</h1>
                <p className="text-muted-foreground">Review and verify invoices from your suppliers.</p>
            </div>

            {/* Info banner for buyers */}
            <Card className="border-blue-500/50 bg-blue-500/5">
                <CardContent className="flex items-center gap-4 p-4">
                    <CheckCircle2 className="h-5 w-5 text-blue-500" />
                    <div className="flex-1">
                        <p className="font-medium">No Wallet Required</p>
                        <p className="text-sm text-muted-foreground">
                            As a buyer, approvals are processed through your custodial wallet. No signature needed.
                        </p>
                    </div>
                </CardContent>
            </Card>

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
                <div className="flex flex-col items-center justify-center p-12 border rounded-lg bg-muted/10 border-dashed">
                    <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold">All Caught Up</h3>
                    <p className="text-muted-foreground">No pending invoice requests found.</p>
                </div>
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
                                        <div className="text-xs text-muted-foreground">Amount Due</div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div className="flex flex-col">
                                        <span className="text-muted-foreground">Supplier</span>
                                        <span className="font-mono text-xs">
                                            {inv.supplierName || `${inv.supplier.substring(0, 12)}...`}
                                        </span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-muted-foreground">Created Date</span>
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
                            <CardFooter className="bg-muted/30 flex justify-end gap-3 pt-6">
                                <Button 
                                    variant="outline"
                                    onClick={() => handleReject(inv.id)}
                                    disabled={!!approving || !!rejecting}
                                >
                                    {rejecting === inv.id ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Rejecting...
                                        </>
                                    ) : (
                                        "Reject"
                                    )}
                                </Button>
                                <Button
                                    onClick={() => handleApprove(inv.id)}
                                    disabled={!!approving || !!rejecting}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                    {approving === inv.id ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Approving...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 className="mr-2 h-4 w-4" />
                                            Approve Invoice
                                        </>
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

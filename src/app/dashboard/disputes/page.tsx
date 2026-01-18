"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/useAuth"
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, AlertTriangle, FileText, Clock, CheckCircle2, XCircle, MessageSquare } from "lucide-react"
import { StatusBadge } from "@/components/ui/status-badge"
import Link from "next/link"

interface Dispute {
    id: string
    invoiceId: string
    onChainInvoiceId: string
    reason: string
    status: string
    createdAt: string
    resolvedAt?: string
    resolution?: string
    invoiceAmount?: string
    invoiceDescription?: string
    supplierAddress?: string
}

export default function DisputesPage() {
    const { user, userType, isLoading: authLoading } = useAuth()
    const [disputes, setDisputes] = useState<Dispute[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchDisputes = async () => {
            try {
                const res = await fetch('/api/disputes')
                if (!res.ok) {
                    const data = await res.json()
                    throw new Error(data.error || 'Failed to fetch disputes')
                }
                const data = await res.json()
                setDisputes(data.disputes || [])
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load disputes')
            } finally {
                setLoading(false)
            }
        }

        if (!authLoading && userType === 'BUYER') {
            fetchDisputes()
        } else if (!authLoading) {
            setLoading(false)
        }
    }, [authLoading, userType])

    const formatXLM = (stroops: string) => {
        return (parseInt(stroops || '0') / 10000000).toFixed(2)
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'RESOLVED':
                return <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            case 'REJECTED':
                return <XCircle className="h-5 w-5 text-rose-400" />
            default:
                return <Clock className="h-5 w-5 text-amber-400" />
        }
    }

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-white/50" />
            </div>
        )
    }

    if (userType !== 'BUYER') {
        return (
            <div className="p-8">
                <Card className="bg-white/5 border-white/10 backdrop-blur-md">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <AlertTriangle className="h-12 w-12 text-white/30 mb-4" />
                        <h3 className="text-lg font-semibold text-white mb-2">Buyer Access Only</h3>
                        <p className="text-white/50 text-center">Only buyers can view and manage disputes.</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const pendingDisputes = disputes.filter(d => d.status === 'PENDING')
    const resolvedDisputes = disputes.filter(d => d.status !== 'PENDING')

    return (
        <div className="p-8 space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-white">Disputes</h1>
                <p className="text-white/50 mt-1">
                    Manage and track invoice disputes
                </p>
            </div>

            {error && (
                <Card className="bg-rose-500/10 border-rose-500/20">
                    <CardContent className="py-4">
                        <p className="text-rose-400">{error}</p>
                    </CardContent>
                </Card>
            )}

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-white/5 border-white/10 backdrop-blur-md">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-white/70">Total Disputes</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-white/50" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{disputes.length}</div>
                        <p className="text-xs text-white/40">All time</p>
                    </CardContent>
                </Card>

                <Card className="bg-white/5 border-white/10 backdrop-blur-md">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-white/70">Pending</CardTitle>
                        <Clock className="h-4 w-4 text-amber-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-400">{pendingDisputes.length}</div>
                        <p className="text-xs text-white/40">Awaiting resolution</p>
                    </CardContent>
                </Card>

                <Card className="bg-white/5 border-white/10 backdrop-blur-md">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-white/70">Resolved</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-400">{resolvedDisputes.length}</div>
                        <p className="text-xs text-white/40">Completed</p>
                    </CardContent>
                </Card>
            </div>

            {/* Disputes List */}
            <Card className="bg-white/5 border-white/10 backdrop-blur-md">
                <CardHeader>
                    <CardTitle className="text-white">Dispute History</CardTitle>
                    <CardDescription className="text-white/50">
                        Track the status of your raised disputes
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {disputes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <AlertTriangle className="h-12 w-12 text-white/20 mb-4" />
                            <h3 className="text-lg font-semibold text-white/70 mb-2">No disputes yet</h3>
                            <p className="text-white/40 text-center mb-4">
                                You haven&apos;t raised any disputes. You can dispute an invoice from the settlements page.
                            </p>
                            <Link
                                href="/dashboard/settlements"
                                className="text-primary hover:underline text-sm"
                            >
                                Go to Settlements →
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {disputes.map((dispute) => (
                                <div
                                    key={dispute.id}
                                    className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            {getStatusIcon(dispute.status)}
                                            <div>
                                                <p className="font-medium text-white">
                                                    Invoice #{dispute.onChainInvoiceId?.slice(0, 8) || dispute.invoiceId.slice(0, 8)}
                                                </p>
                                                <p className="text-xs text-white/40">
                                                    {dispute.invoiceDescription || 'No description'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <StatusBadge status={dispute.status} size="sm" />
                                            {dispute.invoiceAmount && (
                                                <p className="text-sm text-white/50 mt-1">
                                                    {formatXLM(dispute.invoiceAmount)} XLM
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                                        <div className="flex items-start gap-2">
                                            <MessageSquare className="h-4 w-4 text-white/40 mt-0.5" />
                                            <div>
                                                <p className="text-xs text-white/40 mb-1">Reason for dispute:</p>
                                                <p className="text-sm text-white/80">{dispute.reason}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between mt-3 text-xs text-white/40">
                                        <span>Raised: {new Date(dispute.createdAt).toLocaleDateString()}</span>
                                        {dispute.resolvedAt && (
                                            <span>Resolved: {new Date(dispute.resolvedAt).toLocaleDateString()}</span>
                                        )}
                                    </div>

                                    {dispute.resolution && (
                                        <div className="mt-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                            <p className="text-xs text-emerald-400 mb-1">Resolution:</p>
                                            <p className="text-sm text-emerald-300">{dispute.resolution}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

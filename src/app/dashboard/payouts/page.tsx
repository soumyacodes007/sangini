"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/useAuth"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Loader2, DollarSign, FileText, TrendingUp, ArrowUpRight, Shield } from "lucide-react"
import { StatusBadge } from "@/components/ui/status-badge"
import Link from "next/link"

interface PayoutGroup {
    invoiceId: string
    invoiceDbId: string
    totalReceived: string
    totalGross: string
    insurancePaid: string
    investorCount: number
    invoiceAmount?: string
    invoiceStatus?: string
    description?: string
    lastPayoutAt?: string
}

interface PayoutSummary {
    totalReceived: string
    totalInsurancePaid: string
    totalGrossPayments: string
    invoiceCount: number
    payoutCount: number
}

interface PayoutsData {
    payouts: PayoutGroup[]
    summary: PayoutSummary
}

export default function PayoutsPage() {
    const { user, userType, isLoading: authLoading } = useAuth()
    const [payoutsData, setPayoutsData] = useState<PayoutsData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchPayouts = async () => {
            try {
                const res = await fetch('/api/supplier/payouts')
                if (!res.ok) {
                    const data = await res.json()
                    throw new Error(data.error || 'Failed to fetch payouts')
                }
                const data = await res.json()
                setPayoutsData(data)
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load payouts')
            } finally {
                setLoading(false)
            }
        }

        if (!authLoading && userType === 'SUPPLIER') {
            fetchPayouts()
        } else if (!authLoading) {
            setLoading(false)
        }
    }, [authLoading, userType])

    const formatXLM = (stroops: string) => {
        return (parseInt(stroops || '0') / 10000000).toFixed(2)
    }

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-white/50" />
            </div>
        )
    }

    if (userType !== 'SUPPLIER') {
        return (
            <div className="p-8">
                <Card className="bg-white/5 border-white/10 backdrop-blur-md">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <DollarSign className="h-12 w-12 text-white/30 mb-4" />
                        <h3 className="text-lg font-semibold text-white mb-2">Supplier Access Only</h3>
                        <p className="text-white/50 text-center">Only suppliers can view payout history.</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const summary = payoutsData?.summary
    const payouts = payoutsData?.payouts || []

    return (
        <div className="p-8 space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-white">Payouts</h1>
                <p className="text-white/50 mt-1">
                    Track funds received from funded invoices
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
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="bg-white/5 border-white/10 backdrop-blur-md">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-white/70">Total Received</CardTitle>
                        <DollarSign className="h-4 w-4 text-emerald-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-400">
                            {formatXLM(summary?.totalReceived || '0')} XLM
                        </div>
                        <p className="text-xs text-white/40">Net after insurance</p>
                    </CardContent>
                </Card>

                <Card className="bg-white/5 border-white/10 backdrop-blur-md">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-white/70">Gross Payments</CardTitle>
                        <TrendingUp className="h-4 w-4 text-blue-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">
                            {formatXLM(summary?.totalGrossPayments || '0')} XLM
                        </div>
                        <p className="text-xs text-white/40">Before deductions</p>
                    </CardContent>
                </Card>

                <Card className="bg-white/5 border-white/10 backdrop-blur-md">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-white/70">Insurance Paid</CardTitle>
                        <Shield className="h-4 w-4 text-amber-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-400">
                            {formatXLM(summary?.totalInsurancePaid || '0')} XLM
                        </div>
                        <p className="text-xs text-white/40">Platform protection</p>
                    </CardContent>
                </Card>

                <Card className="bg-white/5 border-white/10 backdrop-blur-md">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-white/70">Funded Invoices</CardTitle>
                        <FileText className="h-4 w-4 text-white/50" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{summary?.invoiceCount || 0}</div>
                        <p className="text-xs text-white/40">{summary?.payoutCount || 0} total payouts</p>
                    </CardContent>
                </Card>
            </div>

            {/* Payouts List */}
            <Card className="bg-white/5 border-white/10 backdrop-blur-md">
                <CardHeader>
                    <CardTitle className="text-white">Payout History</CardTitle>
                    <CardDescription className="text-white/50">
                        Funds received from each funded invoice
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {payouts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <DollarSign className="h-12 w-12 text-white/20 mb-4" />
                            <h3 className="text-lg font-semibold text-white/70 mb-2">No payouts yet</h3>
                            <p className="text-white/40 text-center mb-4">
                                Create and get invoices funded to receive payouts
                            </p>
                            <Link
                                href="/dashboard/create"
                                className="text-primary hover:underline text-sm"
                            >
                                Create your first invoice →
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {payouts.map((payout) => (
                                <div
                                    key={payout.invoiceDbId}
                                    className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                            <ArrowUpRight className="h-5 w-5 text-emerald-400" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-white">
                                                Invoice #{payout.invoiceId?.slice(0, 8) || payout.invoiceDbId.slice(0, 8)}
                                            </p>
                                            <p className="text-xs text-white/40">
                                                {payout.description || 'No description'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <p className="font-bold text-emerald-400">
                                                +{formatXLM(payout.totalReceived)} XLM
                                            </p>
                                            <p className="text-xs text-white/40">
                                                {payout.investorCount} investor{payout.investorCount !== 1 ? 's' : ''}
                                            </p>
                                        </div>
                                        {payout.invoiceStatus && (
                                            <StatusBadge status={payout.invoiceStatus} size="sm" />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

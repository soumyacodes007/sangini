"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/useAuth"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Loader2, Coins, TrendingUp, DollarSign, CheckCircle2, Clock, ArrowUpRight } from "lucide-react"
import { StatusBadge } from "@/components/ui/status-badge"
import Link from "next/link"

interface Earning {
    invoiceId: string
    invoiceDbId: string
    description: string
    investedAmount: string
    expectedReturn: string
    actualReturn: string
    profit: string
    status: string
    investedAt: string
    settledAt?: string
    dueDate?: string
}

interface SaleHistory {
    orderId: string
    invoiceId: string
    tokenAmount: string
    salePrice: string
    costBasis: string
    realizedPL: string
    soldAt: string
    txHash: string
}

interface EarningsSummary {
    totalInvested: string
    totalReturns: string
    pendingReturns: string
    totalProfit: string
    realizedPLFromSales: string
    settlementProfit: string
    cashInFromSales: string
    cashInFromSettlements: string
    roi: string
    investmentCount: number
    settledCount: number
    secondaryMarketSales: number
    secondaryMarketPurchases: number
}

export default function EarningsPage() {
    const { user, userType, isLoading: authLoading } = useAuth()
    const [earnings, setEarnings] = useState<Earning[]>([])
    const [salesHistory, setSalesHistory] = useState<SaleHistory[]>([])
    const [summary, setSummary] = useState<EarningsSummary | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchEarnings = async () => {
            try {
                const res = await fetch('/api/investor/earnings')
                if (!res.ok) {
                    const data = await res.json()
                    throw new Error(data.error || 'Failed to fetch earnings')
                }
                const data = await res.json()
                setEarnings(data.earnings || [])
                setSalesHistory(data.salesHistory || [])
                setSummary(data.summary)
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load earnings')
            } finally {
                setLoading(false)
            }
        }

        if (!authLoading && userType === 'INVESTOR') {
            fetchEarnings()
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

    if (userType !== 'INVESTOR') {
        return (
            <div className="p-8">
                <Card className="bg-white/5 border-white/10 backdrop-blur-md">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Coins className="h-12 w-12 text-white/30 mb-4" />
                        <h3 className="text-lg font-semibold text-white mb-2">Investor Access Only</h3>
                        <p className="text-white/50 text-center">Only investors can view earnings.</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const profitNum = parseFloat(formatXLM(summary?.totalProfit || '0'))
    const isProfitable = profitNum >= 0

    return (
        <div className="p-8 space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-white">Earnings</h1>
                <p className="text-white/50 mt-1">
                    Track your investment returns and yields
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
            <div className="grid gap-4 md:grid-cols-6">
                <Card className="bg-white/5 border-white/10 backdrop-blur-md">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-white/70">Total Invested</CardTitle>
                        <DollarSign className="h-4 w-4 text-blue-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">
                            {formatXLM(summary?.totalInvested || '0')} XLM
                        </div>
                        <p className="text-xs text-white/40">
                            {summary?.investmentCount || 0} primary + {summary?.secondaryMarketPurchases || 0} secondary
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-white/5 border-white/10 backdrop-blur-md">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-white/70">Total Returns</CardTitle>
                        <TrendingUp className="h-4 w-4 text-emerald-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-400">
                            {formatXLM(summary?.totalReturns || '0')} XLM
                        </div>
                        <p className="text-xs text-white/40">
                            {formatXLM(summary?.cashInFromSales || '0')} sales + {formatXLM(summary?.cashInFromSettlements || '0')} settled
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-white/5 border-white/10 backdrop-blur-md">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-white/70">Trading Profit</CardTitle>
                        <Coins className="h-4 w-4 text-purple-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-purple-400">
                            {formatXLM(summary?.realizedPLFromSales || '0')} XLM
                        </div>
                        <p className="text-xs text-white/40">{summary?.secondaryMarketSales || 0} sales</p>
                    </CardContent>
                </Card>

                <Card className="bg-white/5 border-white/10 backdrop-blur-md">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-white/70">Settlement Profit</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-400">
                            {formatXLM(summary?.settlementProfit || '0')} XLM
                        </div>
                        <p className="text-xs text-white/40">{summary?.settledCount || 0} settled</p>
                    </CardContent>
                </Card>

                <Card className="bg-white/5 border-white/10 backdrop-blur-md">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-white/70">Pending Returns</CardTitle>
                        <Clock className="h-4 w-4 text-amber-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-400">
                            {formatXLM(summary?.pendingReturns || '0')} XLM
                        </div>
                        <p className="text-xs text-white/40">Awaiting settlement</p>
                    </CardContent>
                </Card>

                <Card className="bg-white/5 border-white/10 backdrop-blur-md">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-white/70">Total ROI</CardTitle>
                        <TrendingUp className="h-4 w-4 text-white/50" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${isProfitable ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isProfitable ? '+' : ''}{summary?.roi || '0'}%
                        </div>
                        <p className="text-xs text-white/40">
                            {isProfitable ? '+' : ''}{formatXLM(summary?.totalProfit || '0')} XLM profit
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Secondary Market Sales History */}
            {salesHistory.length > 0 && (
                <Card className="bg-white/5 border-white/10 backdrop-blur-md">
                    <CardHeader>
                        <CardTitle className="text-white">Secondary Market Sales</CardTitle>
                        <CardDescription className="text-white/50">
                            Your token sales on the secondary market
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {salesHistory.map((sale, index) => {
                                const tokens = parseFloat(formatXLM(sale.tokenAmount))
                                const salePrice = parseFloat(formatXLM(sale.salePrice))
                                const costBasis = parseFloat(formatXLM(sale.costBasis))
                                const profit = parseFloat(formatXLM(sale.realizedPL))
                                const isProfitable = profit >= 0

                                return (
                                    <div
                                        key={`${sale.orderId}-${index}`}
                                        className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full flex items-center justify-center bg-purple-500/20">
                                                    <TrendingUp className="h-5 w-5 text-purple-400" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-white">
                                                        Sold {tokens.toFixed(2)} tokens
                                                    </p>
                                                    <p className="text-xs text-white/40">
                                                        Invoice #{sale.invoiceId?.slice(0, 8)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={`text-lg font-bold ${isProfitable ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                    {isProfitable ? '+' : ''}{profit.toFixed(2)} XLM
                                                </p>
                                                <p className="text-xs text-white/40">Profit</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-4 text-sm">
                                            <div>
                                                <span className="text-white/40">Sale Price</span>
                                                <p className="font-medium text-white">{salePrice.toFixed(2)} XLM</p>
                                            </div>
                                            <div>
                                                <span className="text-white/40">Cost Basis</span>
                                                <p className="font-medium text-white">{costBasis.toFixed(2)} XLM</p>
                                            </div>
                                            <div>
                                                <span className="text-white/40">Price per Token</span>
                                                <p className="font-medium text-white">{(salePrice / tokens).toFixed(4)} XLM</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between mt-3 text-xs text-white/40">
                                            <span>Sold: {new Date(sale.soldAt).toLocaleDateString()}</span>
                                            <span className="font-mono">Order #{sale.orderId?.slice(0, 8)}</span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Earnings History */}
            <Card className="bg-white/5 border-white/10 backdrop-blur-md">
                <CardHeader>
                    <CardTitle className="text-white">Investment History</CardTitle>
                    <CardDescription className="text-white/50">
                        Track performance of each investment
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {earnings.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Coins className="h-12 w-12 text-white/20 mb-4" />
                            <h3 className="text-lg font-semibold text-white/70 mb-2">No investments yet</h3>
                            <p className="text-white/40 text-center mb-4">
                                Start investing in invoices to track your earnings
                            </p>
                            <Link
                                href="/dashboard/market"
                                className="text-primary hover:underline text-sm"
                            >
                                Browse Marketplace →
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {earnings.map((earning, index) => {
                                const profit = parseInt(earning.profit || '0')
                                const isProfitable = profit >= 0

                                return (
                                    <div
                                        key={`${earning.invoiceId}-${index}`}
                                        className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${earning.status === 'SETTLED'
                                                    ? 'bg-emerald-500/20'
                                                    : 'bg-amber-500/20'
                                                    }`}>
                                                    {earning.status === 'SETTLED'
                                                        ? <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                                                        : <Clock className="h-5 w-5 text-amber-400" />
                                                    }
                                                </div>
                                                <div>
                                                    <p className="font-medium text-white">
                                                        Invoice #{earning.invoiceId?.slice(0, 8)}
                                                    </p>
                                                    <p className="text-xs text-white/40">
                                                        {earning.description || 'Invoice investment'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <StatusBadge status={earning.status} size="sm" />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-4 text-sm">
                                            <div>
                                                <span className="text-white/40">Invested</span>
                                                <p className="font-medium text-white">{formatXLM(earning.investedAmount)} XLM</p>
                                            </div>
                                            <div>
                                                <span className="text-white/40">Expected Return</span>
                                                <p className="font-medium text-white">{formatXLM(earning.expectedReturn)} XLM</p>
                                            </div>
                                            <div>
                                                <span className="text-white/40">Profit</span>
                                                <p className={`font-medium ${isProfitable ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                    {isProfitable ? '+' : ''}{formatXLM(earning.profit)} XLM
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between mt-3 text-xs text-white/40">
                                            <span>Invested: {new Date(earning.investedAt).toLocaleDateString()}</span>
                                            {earning.settledAt && (
                                                <span className="flex items-center gap-1">
                                                    <ArrowUpRight className="h-3 w-3 text-emerald-400" />
                                                    Settled: {new Date(earning.settledAt).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

"use client"

import { useAuth } from "@/hooks/useAuth"
import { useStats } from "@/hooks/useStats"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowRight, FileText, TrendingUp, PlusCircle, ShieldCheck, Loader2, DollarSign, Briefcase } from "lucide-react"
import { StatusBadge } from "@/components/ui/status-badge"

export default function DashboardPage() {
    const { user, userType, isLoading: authLoading } = useAuth()
    const { stats, loading: statsLoading, error } = useStats()

    const isLoading = authLoading || statsLoading

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    const platform = stats?.platform
    const userStats = stats?.user

    return (
        <div className="p-8 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">Dashboard</h1>
                    <p className="text-white/50 mt-1">
                        Welcome back{user?.name ? `, ${user.name}` : ''}!
                    </p>
                </div>
                {userType && (
                    <span className="px-3 py-1 rounded-full bg-white/10 text-white border border-white/20 text-sm font-medium">
                        {userType}
                    </span>
                )}
            </div>

            {error && (
                <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400">
                    {error}
                </div>
            )}

            {/* Platform Stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-white/5 border-white/10 backdrop-blur-md">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-white/70">Total Invoices</CardTitle>
                        <FileText className="h-4 w-4 text-white/50" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{platform?.totalInvoices || 0}</div>
                        <p className="text-xs text-white/40">On-chain invoices</p>
                    </CardContent>
                </Card>

                <Card className="bg-white/5 border-white/10 backdrop-blur-md">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-white/70">Pending Approvals</CardTitle>
                        <ShieldCheck className="h-4 w-4 text-white/50" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{platform?.invoicesByStatus?.DRAFT || 0}</div>
                        <p className="text-xs text-white/40">Awaiting verification</p>
                    </CardContent>
                </Card>

                <Card className="bg-white/5 border-white/10 backdrop-blur-md">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-white/70">Active Auctions</CardTitle>
                        <TrendingUp className="h-4 w-4 text-white/50" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{platform?.invoicesByStatus?.FUNDING || 0}</div>
                        <p className="text-xs text-white/40">Open for investment</p>
                    </CardContent>
                </Card>

                <Card className="bg-white/5 border-white/10 backdrop-blur-md">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-white/70">Insurance Pool</CardTitle>
                        <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-400">
                            {platform?.insurancePoolBalance ?
                                `${(parseInt(platform.insurancePoolBalance) / 10000000).toFixed(2)}` : '0'
                            }
                        </div>
                        <p className="text-xs text-white/40">XLM in pool</p>
                    </CardContent>
                </Card>
            </div>

            {/* User-specific Stats */}
            {userType === 'SUPPLIER' && userStats && (
                <div className="grid gap-4 md:grid-cols-3">
                    <Card className="bg-white/5 border-white/10 backdrop-blur-md">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-white/70">My Invoices</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-white">{userStats.totalInvoicesCreated || 0}</div>
                            <p className="text-xs text-white/40">Total created</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/5 border-white/10 backdrop-blur-md">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-white/70">Amount Financed</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-white">
                                {((userStats.totalAmountFinanced || 0) / 10000000).toFixed(2)} XLM
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/5 border-white/10 backdrop-blur-md">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-white/70">Total Received</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-emerald-400">
                                {((userStats.totalReceived || 0) / 10000000).toFixed(2)} XLM
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {userType === 'INVESTOR' && userStats && (
                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Total Invested</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {((userStats.totalInvested || 0) / 10000000).toFixed(2)} XLM
                            </div>
                            <p className="text-xs text-muted-foreground">{userStats.investmentCount || 0} investments</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Active Investments</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{userStats.activeInvestments || 0}</div>
                            <p className="text-xs text-muted-foreground">
                                {((userStats.activeInvestmentValue || 0) / 10000000).toFixed(2)} XLM value
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Total Returns</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-emerald-500">
                                {((userStats.totalReturns || 0) / 10000000).toFixed(2)} XLM
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Role-specific Quick Action */}
            {userType === 'SUPPLIER' && (
                <Card className="bg-primary text-primary-foreground">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <PlusCircle className="h-5 w-5" />
                            Create Invoice
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm opacity-90 mb-4">Turn unpaid invoices into instant liquidity.</p>
                        <Button variant="secondary" asChild className="w-full">
                            <Link href="/dashboard/create">Mint Invoice <ArrowRight className="ml-2 h-4 w-4" /></Link>
                        </Button>
                    </CardContent>
                </Card>
            )}

            {userType === 'BUYER' && (
                <Card className="bg-emerald-600 text-white">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Pending Requests
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm opacity-90 mb-4">Review and approve supplier invoices.</p>
                        <Button variant="secondary" asChild className="w-full text-emerald-700">
                            <Link href="/dashboard/requests">Review Requests <ArrowRight className="ml-2 h-4 w-4" /></Link>
                        </Button>
                    </CardContent>
                </Card>
            )}

            {userType === 'INVESTOR' && (
                <Card className="bg-blue-600 text-white">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <TrendingUp className="h-5 w-5" />
                            Marketplace
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm opacity-90 mb-4">Invest in verified invoices and earn yield.</p>
                        <Button variant="secondary" asChild className="w-full text-blue-700">
                            <Link href="/dashboard/market">Browse Market <ArrowRight className="ml-2 h-4 w-4" /></Link>
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Recent Activity */}
            {stats?.recentActivity && stats.recentActivity.length > 0 && (
                <Card className="bg-white/5 border-white/10 backdrop-blur-md">
                    <CardHeader>
                        <CardTitle className="text-white">Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {stats.recentActivity.map((activity) => (
                                <div key={activity.id} className="flex items-center justify-between border-b border-white/10 pb-3 last:border-0">
                                    <div className="flex items-center gap-3">
                                        <FileText className="h-4 w-4 text-white/50" />
                                        <div>
                                            <p className="font-medium text-white">{activity.invoiceId}</p>
                                            <p className="text-xs text-white/40">
                                                {new Date(activity.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-medium text-white">
                                            {activity.amount ? `${(parseInt(activity.amount) / 10000000).toFixed(2)} XLM` : '-'}
                                        </span>
                                        <StatusBadge status={activity.status} size="sm" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {platform?.totalInvoices === 0 && (
                <Card className="border-dashed border-white/20 bg-white/5 backdrop-blur-md">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <FileText className="h-12 w-12 text-white/30 mb-4" />
                        <h3 className="text-lg font-semibold mb-2 text-white">No invoices yet</h3>
                        <p className="text-white/50 text-center mb-4">Create your first invoice to get started.</p>
                        <Button asChild className="bg-white text-black hover:bg-white/90">
                            <Link href="/dashboard/create"><PlusCircle className="mr-2 h-4 w-4" />Create Invoice</Link>
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}

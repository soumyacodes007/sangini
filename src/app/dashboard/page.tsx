"use client"

import { useStore } from "@/lib/store"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowRight, FileText, TrendingUp, PlusCircle, ShieldCheck } from "lucide-react"

export default function DashboardPage() {
    const { wallet, invoices } = useStore()

    const totalInvoices = invoices.length
    const pendingApprovals = invoices.filter(i => i.status === 'Draft').length
    const activeAuctions = invoices.filter(i => i.status === 'Funding').length
    const fundedInvoices = invoices.filter(i => i.status === 'Funded').length

    return (
        <div className="p-8 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-muted-foreground mt-1">
                        {wallet.isConnected ? "Welcome back!" : "Connect your wallet to get started"}
                    </p>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalInvoices}</div>
                        <p className="text-xs text-muted-foreground">On-chain invoices</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
                        <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{pendingApprovals}</div>
                        <p className="text-xs text-muted-foreground">Awaiting verification</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Auctions</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeAuctions}</div>
                        <p className="text-xs text-muted-foreground">Open for investment</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Funded</CardTitle>
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-500">{fundedInvoices}</div>
                        <p className="text-xs text-muted-foreground">Successfully funded</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-primary text-primary-foreground">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <PlusCircle className="h-5 w-5" />
                            Supplier
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm opacity-90 mb-4">Turn unpaid invoices into instant liquidity.</p>
                        <Button variant="secondary" asChild className="w-full">
                            <Link href="/dashboard/create">Mint Invoice <ArrowRight className="ml-2 h-4 w-4" /></Link>
                        </Button>
                    </CardContent>
                </Card>

                <Card className="bg-emerald-600 text-white">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Buyer
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm opacity-90 mb-4">Review and approve supplier invoices.</p>
                        <Button variant="secondary" asChild className="w-full text-emerald-700">
                            <Link href="/dashboard/requests">Review Requests <ArrowRight className="ml-2 h-4 w-4" /></Link>
                        </Button>
                    </CardContent>
                </Card>

                <Card className="bg-blue-600 text-white">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <TrendingUp className="h-5 w-5" />
                            Investor
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm opacity-90 mb-4">Invest in verified invoices and earn yield.</p>
                        <Button variant="secondary" asChild className="w-full text-blue-700">
                            <Link href="/dashboard/market">Browse Market <ArrowRight className="ml-2 h-4 w-4" /></Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {totalInvoices === 0 && (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No invoices yet</h3>
                        <p className="text-muted-foreground text-center mb-4">Create your first invoice to get started.</p>
                        <Button asChild>
                            <Link href="/dashboard/create"><PlusCircle className="mr-2 h-4 w-4" />Create Invoice</Link>
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}

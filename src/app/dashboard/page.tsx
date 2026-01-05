"use client"

import { useStore } from "@/lib/store"
import { UserRole } from "@/lib/contracts/config"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowRight, Wallet } from "lucide-react"

export default function DashboardPage() {
    const { demoRole, wallet } = useStore()

    return (
        <div className="p-8 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-muted-foreground mt-1">
                        Welcome back. You are viewing as <span className="font-semibold text-primary">{demoRole}</span>.
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full border bg-background text-sm">
                        <div className={`h-2 w-2 rounded-full ${wallet.isConnected ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        <span className="font-mono text-xs">{wallet.isConnected ? 'Connected' : 'Scanner Disconnected'}</span>
                    </div>
                </div>
            </div>

            {/* Role specific quick actions */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
                        <span className="text-muted-foreground">$</span>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">$14,231.89</div>
                        <p className="text-xs text-muted-foreground">+20.1% from last month</p>
                    </CardContent>
                </Card>

                {demoRole === UserRole.Supplier && (
                    <Card className="bg-primary text-primary-foreground">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg">Need liquidity?</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm opacity-90 mb-4">Turn your unpaid invoices into cash instantly.</p>
                            <Button variant="secondary" asChild className="w-full">
                                <Link href="/dashboard/create">
                                    Mint Invoice <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {demoRole === UserRole.Buyer && (
                    <Card className="bg-emerald-600 text-white">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg">Pending Approvals</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm opacity-90 mb-4">You have 3 invoices waiting for verification.</p>
                            <Button variant="secondary" asChild className="w-full text-emerald-700 hover:text-emerald-800">
                                <Link href="/dashboard/requests">
                                    Review Requests <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {demoRole === UserRole.Investor && (
                    <Card className="bg-blue-600 text-white">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg">Market Opportunities</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm opacity-90 mb-4">View vetted invoices with 10-12% APY.</p>
                            <Button variant="secondary" asChild className="w-full text-blue-700 hover:text-blue-800">
                                <Link href="/dashboard/market">
                                    Browse Market <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}

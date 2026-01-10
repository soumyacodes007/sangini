"use client"

import { useStore } from "@/lib/store"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Briefcase, TrendingUp } from "lucide-react"

interface TokenHolding {
    invoiceId: string
    amount: string
    acquiredAt: number
}

export default function PortfolioPage() {
    const { wallet } = useStore()

    // TODO: Fetch actual holdings from chain/API
    // For now, show placeholder
    const holdings: TokenHolding[] = []

    return (
        <div className="p-8 space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Portfolio</h1>
                <p className="text-muted-foreground">Your invoice token holdings and investments.</p>
            </div>

            {!wallet.isConnected ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Connect Wallet</h3>
                        <p className="text-muted-foreground text-center">
                            Connect your wallet to view your portfolio.
                        </p>
                    </CardContent>
                </Card>
            ) : holdings.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No Holdings Yet</h3>
                        <p className="text-muted-foreground text-center mb-4">
                            Start investing in invoices to build your portfolio.
                        </p>
                        <Button asChild>
                            <a href="/dashboard/market">Browse Marketplace</a>
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {/* Holdings will be rendered here */}
                </div>
            )}
        </div>
    )
}

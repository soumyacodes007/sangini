'use client';

import {
    Shield,
    Zap,
    Lock,
    Users,
    Clock,
    TrendingUp
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

const features = [
    {
        icon: Shield,
        title: 'Zero-Oracle Verification',
        desc: 'Buyer signatures on-chain eliminate fraud. No external APIs or manual OCR required.',
        color: 'text-emerald-500',
        bg: 'bg-emerald-500/10'
    },
    {
        icon: Zap,
        title: 'Instant Settlement',
        desc: 'Smart contracts distribute funds pro-rata to all token holders automatically upon payment.',
        color: 'text-amber-500',
        bg: 'bg-amber-500/10'
    },
    {
        icon: Lock,
        title: 'Trustless Escrow',
        desc: 'Funds flow directly from buyer to investors. Zero counterparty risk or platform holding.',
        color: 'text-blue-500',
        bg: 'bg-blue-500/10'
    },
    {
        icon: Users,
        title: 'Deep-Tier Financing',
        desc: 'Tier-2 suppliers inherit credit ratings of large corporate buyers for better rates.',
        color: 'text-purple-500',
        bg: 'bg-purple-500/10'
    },
    {
        icon: Clock,
        title: 'Automated Compliance',
        desc: 'KYC-gated investment with on-chain authorization controls (SEP-41).',
        color: 'text-pink-500',
        bg: 'bg-pink-500/10'
    },
    {
        icon: TrendingUp,
        title: 'Transparent Pricing',
        desc: 'Market-driven discount rates. 10% base APY, 24% penalty for overdue payments.',
        color: 'text-cyan-500',
        bg: 'bg-cyan-500/10'
    },
]

export function Features() {
    return (
        <section id="features" className="py-24 bg-muted/30">
            <div className="container px-4 md:px-6">
                <div className="flex flex-col items-center justify-center space-y-4 text-center mb-16">
                    <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                        Built for Trust <span className="text-muted-foreground">Optimized for Speed</span>
                    </h2>
                    <p className="max-w-[700px] text-muted-foreground md:text-xl">
                        Sangini leveraging the Stellar blockchain to remove intermediaries, reduce costs, and prevent fraud through cryptographic verification.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {features.map((feature, i) => (
                        <Card key={i} className="border-muted hover:border-primary/50 transition-colors">
                            <CardHeader>
                                <div className={`w-12 h-12 rounded-lg ${feature.bg} flex items-center justify-center mb-4`}>
                                    <feature.icon className={`w-6 h-6 ${feature.color}`} />
                                </div>
                                <CardTitle>{feature.title}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">{feature.desc}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    )
}

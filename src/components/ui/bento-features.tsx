'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
    Shield,
    Zap,
    Lock,
    Users,
    Clock,
    TrendingUp,
    SparklesIcon,
    FileText,
    Coins
} from 'lucide-react';

type FeatureCardProps = {
    icon: React.ReactNode;
    titleBadge: string;
    title: string;
    description: string;
    className?: string;
    featured?: boolean;
};

function FeatureCard({
    icon,
    titleBadge,
    title,
    description,
    className,
    featured = false,
}: FeatureCardProps) {
    return (
        <div
            className={cn(
                'bg-background border-foreground/10 relative overflow-hidden rounded-xl border',
                'supports-[backdrop-filter]:bg-background/10 backdrop-blur',
                'hover:border-rose-500/30 transition-all duration-300',
                className,
            )}
        >
            {featured && (
                <div className="pointer-events-none absolute top-0 left-1/2 -mt-2 -ml-20 h-full w-full [mask-image:linear-gradient(white,transparent)]">
                    <div className="from-foreground/5 to-foreground/2 absolute inset-0 bg-gradient-to-r [mask-image:radial-gradient(farthest-side_at_top,white,transparent)]">
                        <div
                            aria-hidden="true"
                            className={cn(
                                'absolute inset-0 size-full mix-blend-overlay',
                                'bg-[linear-gradient(to_right,var(--foreground)/.1_1px,transparent_1px)]',
                                'bg-[size:24px]',
                            )}
                        />
                    </div>
                </div>
            )}

            <div className="flex items-center gap-3 p-4 pb-2">
                <Badge variant="secondary" className="bg-white/10 text-white/80 border-0">
                    {titleBadge}
                </Badge>
                {featured && (
                    <Badge variant="outline" className="hidden lg:flex border-rose-500/30 text-rose-400">
                        <SparklesIcon className="me-1 size-3" /> Core Feature
                    </Badge>
                )}
            </div>

            <div className="p-4 pt-2">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                        {icon}
                    </div>
                    <h3 className="text-lg font-semibold text-white">{title}</h3>
                </div>
                <p className="text-white/60 text-sm leading-relaxed">{description}</p>
            </div>
        </div>
    );
}

export function BentoFeatures() {
    return (
        <section id="features" className="py-24 relative">
            {/* Background with dots pattern */}
            <div
                aria-hidden="true"
                className={cn(
                    'absolute inset-0 -z-10 size-full',
                    'bg-[radial-gradient(color-mix(in_oklab,var(--foreground)/.15,transparent)_1px,transparent_1px)]',
                    'bg-[size:12px_12px]',
                    'opacity-50'
                )}
            />

            {/* Gradient overlays */}
            <div
                aria-hidden
                className="absolute inset-0 isolate -z-10 opacity-60 contain-strict"
            >
                <div className="bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,rgba(244,63,94,0.08)_0,transparent_50%,transparent_80%)] absolute top-0 left-0 h-full w-full" />
            </div>

            <div className="container px-4 md:px-6 mx-auto max-w-6xl">
                {/* Heading */}
                <div className="mx-auto mb-12 max-w-2xl text-center">
                    <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl text-white">
                        Built for Trust <span className="text-white/50">Optimized for Speed</span>
                    </h2>
                    <p className="text-white/60 mt-4 text-base md:text-lg">
                        Sangini leverages Stellar blockchain to remove intermediaries,
                        reduce costs, and prevent fraud through cryptographic verification.
                    </p>
                </div>

                {/* Bento Grid */}
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-8">
                    {/* Featured Card - Zero Oracle */}
                    <FeatureCard
                        icon={<Shield className="w-5 h-5 text-rose-400" />}
                        titleBadge="VERIFICATION"
                        title="Zero-Oracle Verification"
                        description="Buyer signatures on-chain eliminate fraud. No external APIs or manual OCR required. Trustless verification built into the protocol."
                        className="lg:col-span-5"
                        featured={true}
                    />

                    {/* Instant Settlement */}
                    <FeatureCard
                        icon={<Zap className="w-5 h-5 text-amber-400" />}
                        titleBadge="SETTLEMENT"
                        title="3-5 Second Finality"
                        description="Smart contracts distribute funds pro-rata to all token holders automatically upon payment."
                        className="lg:col-span-3"
                    />

                    {/* Trustless Escrow */}
                    <FeatureCard
                        icon={<Lock className="w-5 h-5 text-blue-400" />}
                        titleBadge="SECURITY"
                        title="Trustless Escrow"
                        description="Funds flow directly from buyer to investors. Zero counterparty risk or platform holding."
                        className="lg:col-span-4"
                    />

                    {/* Dutch Auction */}
                    <FeatureCard
                        icon={<TrendingUp className="w-5 h-5 text-emerald-400" />}
                        titleBadge="PRICING"
                        title="Dutch Auction"
                        description="Market-driven discount rates. Prices decrease over time until investors buy, ensuring fair price discovery."
                        className="lg:col-span-4"
                    />

                    {/* Deep-Tier Financing */}
                    <FeatureCard
                        icon={<Users className="w-5 h-5 text-purple-400" />}
                        titleBadge="FINANCING"
                        title="Deep-Tier Financing"
                        description="Tier-2 suppliers inherit credit ratings of large corporate buyers for better rates."
                        className="lg:col-span-3"
                    />

                    {/* Insurance Pool */}
                    <FeatureCard
                        icon={<Coins className="w-5 h-5 text-cyan-400" />}
                        titleBadge="PROTECTION"
                        title="2% Insurance Pool"
                        description="Built-in insurance mechanism protects investors from defaults. Claims processed on-chain."
                        className="lg:col-span-3"
                    />

                    {/* KYC Compliance */}
                    <FeatureCard
                        icon={<FileText className="w-5 h-5 text-pink-400" />}
                        titleBadge="COMPLIANCE"
                        title="On-Chain KYC"
                        description="Automated compliance with KYC-gated investment. SEP-41 authorization controls."
                        className="lg:col-span-2"
                    />
                </div>
            </div>
        </section>
    );
}

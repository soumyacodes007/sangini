'use client';

import { EtheralShadow } from "@/components/ui/etheral-shadow";
import { BentoFeatures } from "@/components/ui/bento-features";
import { TestimonialsSection } from "@/components/ui/testimonial-v2";
import { Footer } from "@/components/ui/footer";
import Link from "next/link";
import { ArrowRight, FileText, TrendingUp, Shield, Zap, Building2 } from "lucide-react";
import { useState, useEffect } from "react";

function HeroContent() {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setIsMounted(true), 100);
        return () => clearTimeout(timer);
    }, []);

    return (
        <>
            <style>
                {`
                    @keyframes fadeInUp {
                        from { opacity: 0; transform: translateY(20px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    .animate-fadeInUp {
                        animation: fadeInUp 0.8s ease-out forwards;
                    }
                `}
            </style>

            {/* NAV */}
            {/* NAV */}
            <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-black/10 backdrop-blur-md transition-all duration-300">
                <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4 md:px-8">
                    <Link href="/" className="flex items-center gap-3 group">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-white to-white/80 flex items-center justify-center shadow-lg shadow-white/10 transition-transform group-hover:scale-105">
                            <span className="text-xl font-bold text-black">S</span>
                        </div>
                        <span className="text-xl font-bold tracking-tight text-white transition-opacity group-hover:opacity-90">Sangini</span>
                    </Link>

                    <nav className="hidden items-center gap-8 text-sm font-medium text-white/70 md:flex">
                        <a className="hover:text-white transition-colors hover:scale-105" href="#features">Features</a>
                        <a className="hover:text-white transition-colors hover:scale-105" href="#testimonials">Community</a>
                        <a className="hover:text-white transition-colors hover:scale-105" href="#for-suppliers">For Suppliers</a>
                        <a className="hover:text-white transition-colors hover:scale-105" href="#for-investors">For Investors</a>
                    </nav>

                    <div className="hidden items-center gap-4 md:flex">
                        <Link href="/auth/signin" className="text-sm font-medium text-white/80 hover:text-white transition-colors">
                            Sign in
                        </Link>
                        <Link href="/auth/signin" className="rounded-full bg-white px-5 py-2 text-sm font-bold text-black shadow-lg shadow-white/10 transition-all hover:bg-white/90 hover:scale-105 active:scale-95">
                            Get Started
                        </Link>
                    </div>

                    <Link href="/auth/signin" className="md:hidden rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm border border-white/10">
                        Sign in
                    </Link>
                </div>
            </header>

            {/* HERO COPY */}
            <div className="relative z-10 mx-auto grid w-full max-w-5xl place-items-center px-6 py-16 md:py-24 lg:py-28">
                <div className={`mx-auto text-center ${isMounted ? 'animate-fadeInUp' : 'opacity-0'}`}>
                    <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs uppercase tracking-wider text-white/70 ring-1 ring-white/20 backdrop-blur">
                        <span className="h-1.5 w-1.5 rounded-full bg-white/70 animate-pulse" />
                        Built on Stellar
                    </span>

                    <h1
                        style={{ animationDelay: '200ms' }}
                        className={`mt-8 text-4xl font-bold tracking-tight md:text-6xl lg:text-7xl text-white ${isMounted ? 'animate-fadeInUp' : 'opacity-0'}`}
                    >
                        Unlock Liquidity from
                        <br />
                        <span className="bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent">
                            Your Invoices
                        </span>
                    </h1>

                    <p
                        style={{ animationDelay: '300ms' }}
                        className={`mx-auto mt-6 max-w-2xl text-lg text-white/60 md:text-xl ${isMounted ? 'animate-fadeInUp' : 'opacity-0'}`}
                    >
                        Tokenize your invoices on Stellar blockchain. Get instant funding from global investors.
                        Built-in insurance, Dutch auctions, and seamless settlements.
                    </p>

                    <div
                        style={{ animationDelay: '400ms' }}
                        className={`mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row ${isMounted ? 'animate-fadeInUp' : 'opacity-0'}`}
                    >
                        <Link
                            href="/auth/signin"
                            className="group inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-base font-bold text-black shadow-lg transition-all hover:bg-white/90 hover:scale-105"
                        >
                            Start Financing
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </Link>
                        <Link
                            href="/auth/signin"
                            className="inline-flex items-center justify-center rounded-full border border-white/20 px-8 py-4 text-base font-semibold text-white/90 backdrop-blur transition hover:border-white/40 hover:bg-white/10"
                        >
                            View Demo
                        </Link>
                    </div>

                    {/* Quick Stats */}
                    <div
                        style={{ animationDelay: '500ms' }}
                        className={`mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto ${isMounted ? 'animate-fadeInUp' : 'opacity-0'}`}
                    >
                        <div className="text-center">
                            <div className="text-2xl font-bold text-white">3-5s</div>
                            <div className="text-xs text-white/50 mt-1">Settlement</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-white">$0.001</div>
                            <div className="text-xs text-white/50 mt-1">Per Transaction</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-white">2%</div>
                            <div className="text-xs text-white/50 mt-1">Insurance Pool</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* FEATURE PILLS */}
            <div className="relative z-10 mx-auto w-full max-w-4xl px-6 pb-16">
                <div
                    style={{ animationDelay: '600ms' }}
                    className={`flex flex-wrap items-center justify-center gap-4 ${isMounted ? 'animate-fadeInUp' : 'opacity-0'}`}
                >
                    <div className="flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-sm text-white/70 ring-1 ring-white/10">
                        <FileText className="h-4 w-4 text-white/70" />
                        Invoice Tokenization
                    </div>
                    <div className="flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-sm text-white/70 ring-1 ring-white/10">
                        <TrendingUp className="h-4 w-4 text-white/70" />
                        Dutch Auctions
                    </div>
                    <div className="flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-sm text-white/70 ring-1 ring-white/10">
                        <Shield className="h-4 w-4 text-white/70" />
                        Insurance Pool
                    </div>
                    <div className="flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-sm text-white/70 ring-1 ring-white/10">
                        <Zap className="h-4 w-4 text-white/70" />
                        Instant Funding
                    </div>
                    <div className="flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-sm text-white/70 ring-1 ring-white/10">
                        <Building2 className="h-4 w-4 text-white/70" />
                        KYC Verified
                    </div>
                </div>
            </div>

            {/* Partners */}
            <div className="relative z-10 mx-auto mt-10 w-full max-w-6xl px-6 pb-24">
                <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6 opacity-50">
                    {["Stellar", "Soroban", "Freighter", "USDC", "XLM"].map((brand) => (
                        <div key={brand} className="text-xs uppercase tracking-wider text-white/70">{brand}</div>
                    ))}
                </div>
            </div>
        </>
    );
}

export default function HomePage() {
    return (
        <div className="flex flex-col min-h-screen bg-black text-white relative">
            {/* Fixed Animated Background */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <EtheralShadow
                    color="rgba(100, 100, 120, 1)"
                    animation={{ scale: 80, speed: 70 }}
                    noise={{ opacity: 0.5, scale: 1.2 }}
                    sizing="fill"
                />
            </div>

            {/* Scrollable Content */}
            <div className="relative z-10">
                {/* Hero Content - moved out of EtheralShadow children */}
                <HeroContent />

                {/* Features Section - Transparent background */}
                <section>
                    <BentoFeatures />
                </section>

                {/* Testimonials - Transparent background */}
                <section id="testimonials">
                    <TestimonialsSection />
                </section>

                {/* Footer */}
                <Footer />
            </div>
        </div>
    );
}

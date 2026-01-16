"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { FileText, TrendingUp, Shield, Zap, ArrowRight, Building2 } from "lucide-react";

export function SanginiHeroAnimated() {
    // Symmetric pillar heights (percent). Tall at edges, low at center - represents invoice tokens
    const pillars = [92, 84, 78, 70, 62, 54, 46, 34, 18, 34, 46, 54, 62, 70, 78, 84, 92];

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
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes subtlePulse {
            0%, 100% {
              opacity: 0.8;
              transform: scale(1);
            }
            50% {
              opacity: 1;
              transform: scale(1.03);
            }
          }

          @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
          
          .animate-fadeInUp {
            animation: fadeInUp 0.8s ease-out forwards;
          }

          .animate-float {
            animation: float 3s ease-in-out infinite;
          }
        `}
            </style>

            <section className="relative isolate min-h-screen overflow-hidden bg-black text-white">
                {/* ================== BACKGROUND ================== */}
                {/* Original red/rose/violet gradient - EXACT from reference */}
                <div
                    aria-hidden
                    className="absolute inset-0 -z-30"
                    style={{
                        backgroundImage: [
                            // Main central dome/band (red/rose - the beautiful one)
                            "radial-gradient(80% 55% at 50% 52%, rgba(252,166,154,0.45) 0%, rgba(214,76,82,0.46) 27%, rgba(61,36,47,0.38) 47%, rgba(39,38,67,0.45) 60%, rgba(8,8,12,0.92) 78%, rgba(0,0,0,1) 88%)",
                            // Warm sweep from top-left
                            "radial-gradient(85% 60% at 14% 0%, rgba(255,193,171,0.65) 0%, rgba(233,109,99,0.58) 30%, rgba(48,24,28,0.0) 64%)",
                            // Cool blue rim on top-right
                            "radial-gradient(70% 50% at 86% 22%, rgba(88,112,255,0.40) 0%, rgba(16,18,28,0.0) 55%)",
                            // Soft top vignette
                            "linear-gradient(to bottom, rgba(0,0,0,0.25), rgba(0,0,0,0) 40%)",
                        ].join(","),
                        backgroundColor: "#000",
                    }}
                />

                {/* Vignette corners */}
                <div aria-hidden className="absolute inset-0 -z-20 bg-[radial-gradient(140%_120%_at_50%_0%,transparent_60%,rgba(0,0,0,0.85))]" />

                {/* Grid overlay */}
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 -z-10 mix-blend-screen opacity-20"
                    style={{
                        backgroundImage: [
                            "repeating-linear-gradient(90deg, rgba(255,255,255,0.09) 0 1px, transparent 1px 96px)",
                            "repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 24px)",
                            "repeating-radial-gradient(80% 55% at 50% 52%, rgba(255,255,255,0.08) 0 1px, transparent 1px 120px)"
                        ].join(","),
                    }}
                />

                {/* ================== NAV ================== */}
                <header className="relative z-10">
                    <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 md:px-8">
                        <Link href="/" className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-rose-400 to-rose-600 flex items-center justify-center">
                                <span className="text-lg font-bold text-white">S</span>
                            </div>
                            <span className="text-xl font-bold tracking-tight">Sangini</span>
                        </Link>

                        <nav className="hidden items-center gap-8 text-sm/6 text-white/80 md:flex">
                            <a className="hover:text-white transition" href="#how-it-works">How it Works</a>
                            <a className="hover:text-white transition" href="#features">Features</a>
                            <a className="hover:text-white transition" href="#for-suppliers">For Suppliers</a>
                            <a className="hover:text-white transition" href="#for-investors">For Investors</a>
                        </nav>

                        <div className="hidden items-center gap-3 md:flex">
                            <Link href="/auth/signin" className="rounded-full px-4 py-2 text-sm text-white/80 hover:text-white transition">
                                Sign in
                            </Link>
                            <Link href="/auth/register" className="rounded-full bg-rose-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-500/25 transition hover:bg-rose-400">
                                Get Started
                            </Link>
                        </div>

                        <Link href="/auth/signin" className="md:hidden rounded-full bg-white/10 px-4 py-2 text-sm">
                            Sign in
                        </Link>
                    </div>
                </header>

                {/* ================== HERO COPY ================== */}
                <div className="relative z-10 mx-auto grid w-full max-w-5xl place-items-center px-6 py-16 md:py-24 lg:py-28">
                    <div className={`mx-auto text-center ${isMounted ? 'animate-fadeInUp' : 'opacity-0'}`}>
                        <span className="inline-flex items-center gap-2 rounded-full bg-rose-500/10 px-4 py-1.5 text-xs uppercase tracking-wider text-rose-400 ring-1 ring-rose-500/20 backdrop-blur">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-pulse" />
                            Built on Stellar
                        </span>

                        <h1
                            style={{ animationDelay: '200ms' }}
                            className={`mt-8 text-4xl font-bold tracking-tight md:text-6xl lg:text-7xl ${isMounted ? 'animate-fadeInUp' : 'opacity-0'}`}
                        >
                            <span className="bg-gradient-to-r from-white via-white to-white/70 bg-clip-text text-transparent">
                                Unlock Liquidity from
                            </span>
                            <br />
                            <span className="bg-gradient-to-r from-rose-400 via-rose-300 to-cyan-400 bg-clip-text text-transparent">
                                Your Invoices
                            </span>
                        </h1>

                        <p
                            style={{ animationDelay: '300ms' }}
                            className={`mx-auto mt-6 max-w-2xl text-lg text-white/70 md:text-xl ${isMounted ? 'animate-fadeInUp' : 'opacity-0'}`}
                        >
                            Tokenize your invoices on Stellar blockchain. Get instant funding from global investors.
                            Built-in insurance, Dutch auctions, and seamless settlements.
                        </p>

                        <div
                            style={{ animationDelay: '400ms' }}
                            className={`mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row ${isMounted ? 'animate-fadeInUp' : 'opacity-0'}`}
                        >
                            <Link
                                href="/auth/register"
                                className="group inline-flex items-center justify-center gap-2 rounded-full bg-rose-500 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-rose-500/25 transition-all hover:bg-rose-400 hover:shadow-rose-500/40"
                            >
                                Start Financing
                                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </Link>
                            <Link
                                href="/auth/signin"
                                className="inline-flex items-center justify-center rounded-full border border-white/20 px-8 py-4 text-base font-semibold text-white/90 backdrop-blur transition hover:border-white/40 hover:bg-white/5"
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
                                <div className="text-2xl font-bold text-rose-400">3-5s</div>
                                <div className="text-xs text-white/50 mt-1">Settlement</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-rose-400">$0.001</div>
                                <div className="text-xs text-white/50 mt-1">Per Transaction</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-rose-400">2%</div>
                                <div className="text-xs text-white/50 mt-1">Insurance Pool</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ================== FEATURE PILLS ================== */}
                <div className="relative z-10 mx-auto w-full max-w-4xl px-6 pb-16">
                    <div
                        style={{ animationDelay: '600ms' }}
                        className={`flex flex-wrap items-center justify-center gap-4 ${isMounted ? 'animate-fadeInUp' : 'opacity-0'}`}
                    >
                        <div className="flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-sm text-white/70 ring-1 ring-white/10">
                            <FileText className="h-4 w-4 text-rose-400" />
                            Invoice Tokenization
                        </div>
                        <div className="flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-sm text-white/70 ring-1 ring-white/10">
                            <TrendingUp className="h-4 w-4 text-blue-400" />
                            Dutch Auctions
                        </div>
                        <div className="flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-sm text-white/70 ring-1 ring-white/10">
                            <Shield className="h-4 w-4 text-amber-400" />
                            Insurance Pool
                        </div>
                        <div className="flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-sm text-white/70 ring-1 ring-white/10">
                            <Zap className="h-4 w-4 text-purple-400" />
                            Instant Funding
                        </div>
                        <div className="flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-sm text-white/70 ring-1 ring-white/10">
                            <Building2 className="h-4 w-4 text-cyan-400" />
                            KYC Verified
                        </div>
                    </div>
                </div>

                {/* ================== FOREGROUND EFFECTS ================== */}
                {/* Center-bottom glow with pulse - white/rose like reference */}
                <div
                    className="pointer-events-none absolute bottom-[128px] left-1/2 z-0 h-36 w-28 -translate-x-1/2 rounded-md bg-gradient-to-b from-white/75 via-rose-100/60 to-transparent"
                    style={{ animation: 'subtlePulse 6s ease-in-out infinite' }}
                />

                {/* Stepped pillars silhouette - represents tokenized invoices */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[45vh]">
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/90 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 flex h-full items-end gap-px px-[2px]">
                        {pillars.map((h, i) => (
                            <div
                                key={i}
                                className="flex-1 bg-black transition-all duration-1000 ease-out"
                                style={{
                                    height: isMounted ? `${h}%` : '0%',
                                    transitionDelay: `${Math.abs(i - Math.floor(pillars.length / 2)) * 60}ms`
                                }}
                            />
                        ))}
                    </div>
                </div>
            </section>
        </>
    );
}

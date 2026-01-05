'use client';

import { ArrowRight, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { motion } from "framer-motion"

export function Hero() {
    return (
        <section className="relative py-24 md:py-32 overflow-hidden">
            {/* Background decorations */}
            <div className="absolute inset-0 -z-10">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-primary/10 rounded-full blur-[100px]" />
            </div>

            <div className="container px-4 md:px-6">
                <div className="flex flex-col items-center text-center space-y-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="inline-flex items-center rounded-full border bg-background px-3 py-1 text-sm font-medium backdrop-blur-sm"
                    >
                        <span className="flex h-2 w-2 mr-2 rounded-full bg-emerald-500">
                            <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75"></span>
                        </span>
                        Live on Stellar Testnet
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl max-w-3xl"
                    >
                        Invoice Financing{" "}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-emerald-500">
                            Reimagined
                        </span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="mx-auto max-w-[700px] text-muted-foreground md:text-xl"
                    >
                        Turn your unpaid invoices into instant working capital. Transparent, decentralized, and powered by Soroban smart contracts.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
                    >
                        <Button size="lg" className="gap-2">
                            Get Started Now <ArrowRight className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="lg" className="gap-2">
                            <Play className="h-4 w-4" /> Watch Demo
                        </Button>
                    </motion.div>

                    {/* Stats Grid */}
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.4 }}
                        className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl mt-16"
                    >
                        {[
                            { label: "Financing Gap", value: "$5.2T", sub: "Global MSME Shortfall" },
                            { label: "Settlement Time", value: "< 5m", sub: "Instant Liquidity" },
                            { label: "Platform Fee", value: "0.1%", sub: "Lowest in Industry" },
                        ].map((stat, i) => (
                            <Card key={i} className="bg-background/50 backdrop-blur-sm border-muted">
                                <CardContent className="p-6 text-center">
                                    <div className="text-3xl font-bold mb-1">{stat.value}</div>
                                    <div className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{stat.label}</div>
                                    <div className="text-xs text-muted-foreground mt-1 opacity-70">{stat.sub}</div>
                                </CardContent>
                            </Card>
                        ))}
                    </motion.div>
                </div>
            </div>
        </section>
    )
}

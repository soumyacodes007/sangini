'use client';

import { Navbar } from "@/components/landing/navbar"
import { Hero } from "@/components/landing/hero"
import { Features } from "@/components/landing/features"
import { HowItWorks } from "@/components/landing/how-it-works"
import Link from "next/link"

export default function HomePage() {
    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground">
            <Navbar />

            <main className="flex-1">
                <Hero />
                <Features />
                <HowItWorks />
            </main>

            <footer className="py-6 border-t bg-muted/10">
                <div className="container flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">Sangini</span>
                        <span>&copy; 2025</span>
                    </div>
                    <div className="flex gap-6">
                        <Link href="#" className="hover:text-foreground">Documentation</Link>
                        <Link href="#" className="hover:text-foreground">Privacy</Link>
                        <Link href="#" className="hover:text-foreground">Terms</Link>
                    </div>
                </div>
            </footer>
        </div>
    )
}

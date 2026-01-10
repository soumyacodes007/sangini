'use client';

import Link from "next/link"
import { Button } from "@/components/ui/button"

export function Navbar() {
    return (
        <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                        <span className="text-lg font-bold">S</span>
                    </div>
                    <span className="text-xl font-bold tracking-tight">Sangini</span>
                </div>

                <div className="hidden md:flex items-center gap-6">
                    <Link href="#features" className="text-sm font-medium hover:text-primary transition-colors">
                        Features
                    </Link>
                    <Link href="#how-it-works" className="text-sm font-medium hover:text-primary transition-colors">
                        How it Works
                    </Link>
                    <Link href="#solutions" className="text-sm font-medium hover:text-primary transition-colors">
                        Solutions
                    </Link>
                </div>

                <div className="flex items-center gap-4">
                    <Link href="/dashboard" className="hidden md:block text-sm font-medium hover:text-primary transition-colors">
                        Sign In
                    </Link>
                    <Button asChild>
                        <Link href="/dashboard">Launch App</Link>
                    </Button>
                </div>
            </div>
        </nav>
    )
}

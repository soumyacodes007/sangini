"use client"

import { Sidebar } from "@/components/dashboard/sidebar"
import { ToastProvider } from "@/components/ui/toast"
import { SessionProvider } from "next-auth/react"
import { EtheralShadow } from "@/components/ui/etheral-shadow"

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <SessionProvider>
            <div className="flex min-h-screen bg-black relative">
                {/* Animated Background */}
                <div className="fixed inset-0 z-0 pointer-events-none">
                    <EtheralShadow
                        color="rgba(100, 100, 120, 1)"
                        animation={{ scale: 80, speed: 40 }}
                        noise={{ opacity: 0.3, scale: 1.2 }}
                        sizing="fill"
                    />
                    <div className="absolute inset-0 bg-black/40" />
                </div>

                <div className="hidden md:flex w-[280px] flex-col fixed inset-y-0 z-50">
                    <Sidebar />
                </div>
                <main className="flex-1 md:pl-[280px] relative z-10">
                    {children}
                </main>
                <ToastProvider />
            </div>
        </SessionProvider>
    )
}

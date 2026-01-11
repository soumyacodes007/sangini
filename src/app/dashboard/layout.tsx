"use client"

import { Sidebar } from "@/components/dashboard/sidebar"
import { ToastProvider } from "@/components/ui/toast"
import { SessionProvider } from "next-auth/react"

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <SessionProvider>
            <div className="flex min-h-screen">
                <div className="hidden md:flex w-[280px] flex-col fixed inset-y-0 z-50">
                    <Sidebar />
                </div>
                <main className="flex-1 md:pl-[280px]">
                    {children}
                </main>
                <ToastProvider />
            </div>
        </SessionProvider>
    )
}


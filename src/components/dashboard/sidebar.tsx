"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { WalletConnect } from "./wallet-connect"
import { useStore } from "@/lib/store"
import {
    PieChart,
    PlusCircle,
    FileText,
    TrendingUp,
    Briefcase,
    ShieldCheck,
    Menu,
    X
} from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"

const routes = [
    { label: "Overview", icon: PieChart, href: "/dashboard" },
    { label: "Mint Invoice", icon: PlusCircle, href: "/dashboard/create" },
    { label: "Pending Requests", icon: FileText, href: "/dashboard/requests" },
    { label: "Marketplace", icon: TrendingUp, href: "/dashboard/market" },
    { label: "Portfolio", icon: Briefcase, href: "/dashboard/portfolio" },
    { label: "Admin", icon: ShieldCheck, href: "/dashboard/admin" },
]

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
    const pathname = usePathname()
    
    return (
        <nav className="grid items-start px-4 text-sm font-medium gap-1">
            {routes.map((route) => {
                const isActive = pathname === route.href
                return (
                    <Link
                        key={route.href}
                        href={route.href}
                        onClick={onNavigate}
                        className={cn(
                            "group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all",
                            isActive
                                ? "bg-primary text-primary-foreground font-semibold"
                                : "text-foreground hover:bg-secondary"
                        )}
                    >
                        <route.icon className="h-4 w-4" />
                        <span className="flex-1">{route.label}</span>
                    </Link>
                )
            })}
        </nav>
    )
}

function WalletStatus() {
    const { wallet } = useStore()
    
    return (
        <div className="mb-4 p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 text-sm">
                <div className={cn(
                    "h-2 w-2 rounded-full",
                    wallet.isConnected ? "bg-emerald-500" : "bg-red-500"
                )} />
                <span className="text-muted-foreground">
                    {wallet.isConnected ? "Connected" : "Not Connected"}
                </span>
            </div>
            {wallet.address && (
                <p className="mt-1 font-mono text-xs text-muted-foreground truncate">
                    {wallet.address}
                </p>
            )}
        </div>
    )
}

export function Sidebar() {
    const [mobileOpen, setMobileOpen] = useState(false)

    return (
        <>
            {/* Mobile Menu Button */}
            <div className="md:hidden fixed top-4 left-4 z-50">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setMobileOpen(!mobileOpen)}
                >
                    {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                </Button>
            </div>

            {/* Mobile Sidebar Overlay */}
            {mobileOpen && (
                <div 
                    className="md:hidden fixed inset-0 bg-black/50 z-40"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Mobile Sidebar */}
            <div className={cn(
                "md:hidden fixed inset-y-0 left-0 z-50 w-[280px] bg-card border-r transform transition-transform duration-200",
                mobileOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="flex h-full flex-col">
                    <div className="p-6">
                        <div className="flex items-center gap-2 mb-8">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                                <span className="text-lg font-bold">S</span>
                            </div>
                            <span className="text-xl font-bold tracking-tight">Sangini</span>
                        </div>
                        <WalletStatus />
                    </div>
                    <div className="flex-1 overflow-auto py-2">
                        <SidebarNav onNavigate={() => setMobileOpen(false)} />
                    </div>
                    <div className="p-4 border-t space-y-2">
                        <WalletConnect />
                    </div>
                </div>
            </div>

            {/* Desktop Sidebar */}
            <div className="hidden md:flex h-full w-[280px] flex-col border-r bg-card">
                <div className="p-6">
                    <div className="flex items-center gap-2 mb-8">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                            <span className="text-lg font-bold">S</span>
                        </div>
                        <span className="text-xl font-bold tracking-tight">Sangini</span>
                    </div>
                    <WalletStatus />
                </div>
                <div className="flex-1 overflow-auto py-2">
                    <SidebarNav />
                </div>
                <div className="p-4 border-t space-y-2">
                    <WalletConnect />
                </div>
            </div>
        </>
    )
}

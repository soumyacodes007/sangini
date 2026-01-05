"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { RoleSwitcher } from "./role-switcher"
import { WalletConnect } from "./wallet-connect"
import { useStore } from "@/lib/store"
import { UserRole } from "@/lib/contracts/config"
import {
    PieChart,
    PlusCircle,
    FileText,
    TrendingUp,
    Settings,
    Lock
} from "lucide-react"

export function Sidebar() {
    const pathname = usePathname()
    const { demoRole } = useStore()

    // Define ALL routes - show everything but indicate which are accessible
    const routes = [
        {
            label: "Overview",
            icon: PieChart,
            href: "/dashboard",
            roles: [UserRole.Supplier, UserRole.Buyer, UserRole.Investor, UserRole.Admin]
        },
        {
            label: "Mint Invoice",
            icon: PlusCircle,
            href: "/dashboard/create",
            roles: [UserRole.Supplier],
            roleLabel: "Supplier"
        },
        {
            label: "Pending Requests",
            icon: FileText,
            href: "/dashboard/requests",
            roles: [UserRole.Buyer],
            roleLabel: "Buyer"
        },
        {
            label: "Marketplace",
            icon: TrendingUp,
            href: "/dashboard/market",
            roles: [UserRole.Investor],
            roleLabel: "Investor"
        },
        {
            label: "KYC Admin",
            icon: Settings,
            href: "/dashboard/admin",
            roles: [UserRole.Admin],
            roleLabel: "Admin"
        },
        {
            label: "Settings",
            icon: Settings,
            href: "/dashboard/settings",
            roles: [UserRole.Supplier, UserRole.Buyer, UserRole.Investor, UserRole.Admin]
        }
    ]

    return (
        <div className="flex h-full w-[280px] flex-col border-r bg-card">
            <div className="p-6">
                <div className="flex items-center gap-2 mb-8">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                        <span className="text-lg font-bold">S</span>
                    </div>
                    <span className="text-xl font-bold tracking-tight">Sangini</span>
                </div>

                <RoleSwitcher />
            </div>

            <div className="flex-1 overflow-auto py-2">
                <nav className="grid items-start px-4 text-sm font-medium gap-1">
                    {routes.map((route) => {
                        const isAccessible = route.roles.includes(demoRole)
                        const isActive = pathname === route.href

                        return (
                            <Link
                                key={route.href}
                                href={route.href}
                                className={cn(
                                    "group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all",
                                    isActive
                                        ? "bg-primary text-primary-foreground font-semibold"
                                        : isAccessible
                                            ? "text-foreground hover:bg-secondary"
                                            : "text-muted-foreground/50 hover:bg-muted/30"
                                )}
                            >
                                <route.icon className={cn(
                                    "h-4 w-4",
                                    !isAccessible && "opacity-50"
                                )} />
                                <span className="flex-1">{route.label}</span>
                                {!isAccessible && route.roleLabel && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                        {route.roleLabel}
                                    </span>
                                )}
                            </Link>
                        )
                    })}
                </nav>
            </div>

            <div className="p-4 border-t space-y-2">
                <WalletConnect />
            </div>
        </div>
    )
}

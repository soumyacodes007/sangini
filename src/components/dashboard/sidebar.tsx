"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { WalletConnect } from "./wallet-connect"
import { useAuth } from "@/hooks/useAuth"
import {
    PieChart,
    PlusCircle,
    FileText,
    TrendingUp,
    Briefcase,
    ShieldCheck,
    Menu,
    X,
    User,
    CreditCard,
    LogOut
} from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"

// Routes based on user type
const getRoutes = (userType?: string) => {
    const baseRoutes = [
        { label: "Overview", icon: PieChart, href: "/dashboard" },
    ]

    const supplierRoutes = [
        { label: "Mint Invoice", icon: PlusCircle, href: "/dashboard/create" },
    ]

    const buyerRoutes = [
        { label: "Pending Requests", icon: FileText, href: "/dashboard/requests" },
        { label: "Settlements", icon: CreditCard, href: "/dashboard/settlements" },
    ]

    const investorRoutes = [
        { label: "Marketplace", icon: TrendingUp, href: "/dashboard/market" },
        { label: "Portfolio", icon: Briefcase, href: "/dashboard/portfolio" },
        { label: "My Orders", icon: FileText, href: "/dashboard/orders" },
    ]

    const profileRoute = [
        { label: "Profile", icon: User, href: "/dashboard/profile" },
    ]

    const adminRoutes = [
        { label: "Admin", icon: ShieldCheck, href: "/dashboard/admin" },
    ]

    let routes = [...baseRoutes]

    // Add routes based on user type
    if (userType === 'SUPPLIER') {
        routes = [...routes, ...supplierRoutes, ...investorRoutes, ...profileRoute]
    } else if (userType === 'BUYER') {
        routes = [...routes, ...buyerRoutes, ...profileRoute]
    } else if (userType === 'INVESTOR') {
        routes = [...routes, ...investorRoutes, ...profileRoute]
    } else if (userType === 'ADMIN') {
        routes = [...routes, ...supplierRoutes, ...buyerRoutes, ...investorRoutes, ...adminRoutes, ...profileRoute]
    } else {
        // Show all routes if no user type (for demo/testing)
        routes = [
            ...baseRoutes,
            ...supplierRoutes,
            { label: "Pending Requests", icon: FileText, href: "/dashboard/requests" },
            ...investorRoutes,
            ...profileRoute,
        ]
    }

    return routes
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
    const pathname = usePathname()
    const { userType } = useAuth()
    const routes = getRoutes(userType)
    
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

function UserStatus() {
    const { user, userType, walletAddress, isAuthenticated, logout } = useAuth()
    
    if (!isAuthenticated) {
        return (
            <div className="mb-4 p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 text-sm">
                    <div className="h-2 w-2 rounded-full bg-red-500" />
                    <span className="text-muted-foreground">Not signed in</span>
                </div>
            </div>
        )
    }
    
    return (
        <div className="mb-4 p-3 rounded-lg bg-muted/50 space-y-2">
            <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                        {user?.name || user?.email || 'User'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {userType || 'Member'}
                    </p>
                </div>
            </div>
            {walletAddress && (
                <p className="font-mono text-xs text-muted-foreground truncate">
                    {walletAddress.slice(0, 8)}...{walletAddress.slice(-4)}
                </p>
            )}
            {user?.email && !walletAddress && (
                <p className="text-xs text-muted-foreground truncate">
                    {user.email}
                </p>
            )}
        </div>
    )
}

export function Sidebar() {
    const [mobileOpen, setMobileOpen] = useState(false)
    const { logout, isAuthenticated } = useAuth()

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
                        <UserStatus />
                    </div>
                    <div className="flex-1 overflow-auto py-2">
                        <SidebarNav onNavigate={() => setMobileOpen(false)} />
                    </div>
                    <div className="p-4 border-t space-y-2">
                        <WalletConnect />
                        {isAuthenticated && (
                            <Button 
                                variant="ghost" 
                                className="w-full justify-start gap-2 text-muted-foreground"
                                onClick={() => logout()}
                            >
                                <LogOut className="h-4 w-4" />
                                Sign Out
                            </Button>
                        )}
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
                    <UserStatus />
                </div>
                <div className="flex-1 overflow-auto py-2">
                    <SidebarNav />
                </div>
                <div className="p-4 border-t space-y-2">
                    <WalletConnect />
                    {isAuthenticated && (
                        <Button 
                            variant="ghost" 
                            className="w-full justify-start gap-2 text-muted-foreground"
                            onClick={() => logout()}
                        >
                            <LogOut className="h-4 w-4" />
                            Sign Out
                        </Button>
                    )}
                </div>
            </div>
        </>
    )
}

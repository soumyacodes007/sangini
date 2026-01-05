"use client"

import * as React from "react"
import { useStore } from "@/lib/store"
import { CheckCircle2, XCircle, AlertCircle, Info, X, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"

const TOAST_DURATION = 7000 // 7 seconds

const icons = {
    success: CheckCircle2,
    error: XCircle,
    warning: AlertCircle,
    info: Info,
}

const styles = {
    success: "bg-emerald-500/10 border-emerald-500/30 text-emerald-500",
    error: "bg-red-500/10 border-red-500/30 text-red-500",
    warning: "bg-amber-500/10 border-amber-500/30 text-amber-500",
    info: "bg-blue-500/10 border-blue-500/30 text-blue-500",
}

export function ToastProvider() {
    const { notifications, removeNotification } = useStore()

    // Auto-dismiss toasts
    React.useEffect(() => {
        if (notifications.length === 0) return

        const timers = notifications.map((notification) =>
            setTimeout(() => {
                removeNotification(notification.id)
            }, TOAST_DURATION)
        )

        return () => {
            timers.forEach(timer => clearTimeout(timer))
        }
    }, [notifications, removeNotification])

    if (notifications.length === 0) return null

    const openExplorer = (txHash: string) => {
        window.open(`https://stellar.expert/explorer/testnet/tx/${txHash}`, '_blank')
    }

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md">
            {notifications.map((notification) => {
                const Icon = icons[notification.type]
                return (
                    <div
                        key={notification.id}
                        className={cn(
                            "flex items-start gap-3 p-4 rounded-lg border shadow-lg backdrop-blur-sm animate-in slide-in-from-right-5 fade-in duration-300",
                            styles[notification.type]
                        )}
                    >
                        <Icon className="h-5 w-5 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm">{notification.title}</p>
                            {notification.message && (
                                <p className="text-xs opacity-80 mt-0.5">{notification.message}</p>
                            )}
                            {notification.txHash && (
                                <button
                                    onClick={() => openExplorer(notification.txHash!)}
                                    className="flex items-center gap-1 mt-2 text-xs font-medium hover:underline"
                                >
                                    <ExternalLink className="h-3 w-3" />
                                    View on Stellar Explorer
                                </button>
                            )}
                        </div>
                        <button
                            onClick={() => removeNotification(notification.id)}
                            className="shrink-0 hover:opacity-70 transition-opacity"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                )
            })}
        </div>
    )
}

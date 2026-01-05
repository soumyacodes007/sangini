"use client"

import * as React from "react"
import { useFreighterWallet } from "@/hooks/useFreighterWallet"
import { useStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Wallet, Loader2, AlertCircle, CheckCircle2, ExternalLink } from "lucide-react"

export function WalletConnect() {
    const wallet = useFreighterWallet()
    const { connectWallet, disconnectWallet, demoRole } = useStore()

    const handleConnect = async () => {
        const success = await wallet.connect()
        if (success && wallet.publicKey) {
            connectWallet(wallet.publicKey, demoRole)
        }
    }

    const handleDisconnect = () => {
        wallet.disconnect()
        disconnectWallet()
    }

    // Still loading/detecting
    if (wallet.isLoading) {
        return (
            <div className="flex items-center gap-2 px-3 py-3 rounded-lg bg-muted/50 text-sm">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-muted-foreground text-xs">Detecting wallet...</span>
            </div>
        )
    }

    // Connected successfully
    if (wallet.isConnected && wallet.publicKey) {
        return (
            <div className="space-y-2">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <div className="flex flex-col flex-1 min-w-0">
                        <span className="font-mono text-xs truncate">
                            {wallet.publicKey.substring(0, 8)}...{wallet.publicKey.substring(wallet.publicKey.length - 4)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{wallet.network}</span>
                    </div>
                </div>
                <Button variant="ghost" size="sm" onClick={handleDisconnect} className="w-full text-xs">
                    Disconnect
                </Button>
            </div>
        )
    }

    // Freighter installed but not connected - show connect button
    if (wallet.isInstalled) {
        return (
            <div className="space-y-2">
                {wallet.error && (
                    <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-amber-500/10 text-amber-500 text-xs">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        <span className="truncate">{wallet.error}</span>
                    </div>
                )}
                <Button onClick={handleConnect} disabled={wallet.isLoading} className="w-full gap-2">
                    <Wallet className="h-4 w-4" />
                    Connect Wallet
                </Button>
            </div>
        )
    }

    // Not installed
    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm">
                <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                <span className="text-amber-500 text-xs leading-tight">
                    {wallet.error || "Freighter wallet required"}
                </span>
            </div>
            <Button
                variant="outline"
                size="sm"
                className="w-full text-xs gap-2"
                onClick={() => window.open('https://freighter.app', '_blank')}
            >
                <ExternalLink className="h-3 w-3" />
                Install Freighter
            </Button>
        </div>
    )
}

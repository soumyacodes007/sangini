"use client"

import * as React from "react"
import { useStore } from "@/lib/store"
import { useFreighterWallet } from "@/hooks/useFreighterWallet"
import { setInvestorKycBrowser } from "@/lib/contracts/browser-client"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, AlertCircle, Wallet, ShieldCheck, CheckCircle2 } from "lucide-react"

export default function AdminPage() {
    const { addNotification } = useStore()
    const { publicKey, isConnected, connect } = useFreighterWallet()
    const [isLoading, setIsLoading] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)
    const [success, setSuccess] = React.useState<string | null>(null)

    // Form State
    const [investorAddress, setInvestorAddress] = React.useState("")

    const handleApproveKyc = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setSuccess(null)

        if (!isConnected || !publicKey) {
            setError("Please connect your admin wallet first")
            return
        }

        if (!investorAddress || investorAddress.length < 50) {
            setError("Please enter a valid Stellar address")
            return
        }

        setIsLoading(true)

        try {
            // Call the contract to approve KYC
            await setInvestorKycBrowser(publicKey, investorAddress, true)

            setSuccess(`KYC approved for ${investorAddress.substring(0, 12)}...`)

            addNotification({
                type: 'success',
                title: 'KYC Approved!',
                message: `Investor ${investorAddress.substring(0, 8)}... can now invest`
            })

            // Clear form
            setInvestorAddress("")
        } catch (err: any) {
            console.error('KYC approval failed:', err)
            setError(err.message || 'Failed to approve KYC. Are you the contract admin?')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="max-w-2xl mx-auto p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Admin Panel</h1>
                <p className="text-muted-foreground">Manage platform compliance and KYC approvals.</p>
            </div>

            {!isConnected && (
                <Card className="mb-6 border-amber-500/50 bg-amber-500/10">
                    <CardContent className="flex items-center gap-4 p-4">
                        <AlertCircle className="h-5 w-5 text-amber-500" />
                        <div className="flex-1">
                            <p className="font-medium">Admin Wallet Required</p>
                            <p className="text-sm text-muted-foreground">Connect the contract admin wallet to manage KYC.</p>
                        </div>
                        <Button onClick={connect} className="gap-2">
                            <Wallet className="h-4 w-4" />
                            Connect
                        </Button>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                            <ShieldCheck className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <CardTitle>Investor KYC Approval</CardTitle>
                            <CardDescription>
                                Approve an investor's KYC to allow them to purchase invoice tokens.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {error && (
                        <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4" />
                            {success}
                        </div>
                    )}

                    <form onSubmit={handleApproveKyc} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="investor">Investor Stellar Address</Label>
                            <Input
                                id="investor"
                                value={investorAddress}
                                onChange={(e) => setInvestorAddress(e.target.value)}
                                placeholder="G..."
                                className="font-mono text-xs"
                            />
                            <p className="text-xs text-muted-foreground">
                                Enter the public key of the investor you want to approve.
                            </p>
                        </div>

                        <div className="pt-4">
                            <Button
                                type="submit"
                                className="w-full bg-emerald-600 hover:bg-emerald-700"
                                disabled={isLoading || !isConnected}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Approving KYC...
                                    </>
                                ) : (
                                    <>
                                        <ShieldCheck className="mr-2 h-4 w-4" />
                                        Approve Investor KYC
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}

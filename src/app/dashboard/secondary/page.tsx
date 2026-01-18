"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/useAuth"
import { useFreighterWallet } from "@/hooks/useFreighterWallet"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, ShoppingCart, Tag, TrendingUp, Clock, AlertCircle, CheckCircle2 } from "lucide-react"
import { StatusBadge } from "@/components/ui/status-badge"

interface SecondaryOrder {
    id: string
    invoiceId: string
    invoiceDbId: string
    seller: string
    tokenAmount: string
    filledAmount: string
    pricePerToken: string
    totalPrice: string
    status: string
    createdAt: string
    invoiceDescription?: string
    invoiceAmount?: string
    invoiceStatus?: string
    invoiceDueDate?: string
    supplierAddress?: string
}

export default function SecondaryMarketPage() {
    const { user, userType, isLoading: authLoading } = useAuth()
    const { publicKey, isConnected, connect } = useFreighterWallet()
    const [orders, setOrders] = useState<SecondaryOrder[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [buyingId, setBuyingId] = useState<string | null>(null)

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const res = await fetch('/api/secondary-market')
                if (!res.ok) {
                    const data = await res.json()
                    throw new Error(data.error || 'Failed to fetch orders')
                }
                const data = await res.json()
                setOrders(data.orders || [])
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load secondary market')
            } finally {
                setLoading(false)
            }
        }

        if (!authLoading && userType === 'INVESTOR') {
            fetchOrders()
        } else if (!authLoading) {
            setLoading(false)
        }
    }, [authLoading, userType])

    const handleBuy = async (order: SecondaryOrder) => {
        if (!isConnected || !publicKey) {
            setError('Please connect your wallet first')
            return
        }

        setBuyingId(order.id)
        setError(null)

        try {
            // Step 1: Get XDR from API
            const res = await fetch(`/api/orders/${order.id}/fill`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    buyerAddress: publicKey,
                    amount: order.tokenAmount,
                }),
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Failed to fill order')
            }

            const { xdr, fill } = await res.json()

            // Step 2: Sign with Freighter
            const { signTransaction } = await import('@stellar/freighter-api')
            const StellarSdk = await import('@stellar/stellar-sdk')

            const signResult = await signTransaction(xdr, {
                networkPassphrase: StellarSdk.Networks.TESTNET,
            })

            if (signResult.error) {
                throw new Error(signResult.error)
            }

            const signedXdr = signResult.signedTxXdr
            const signedTx = StellarSdk.TransactionBuilder.fromXDR(signedXdr, StellarSdk.Networks.TESTNET)

            // Step 3: Submit to network
            const server = new StellarSdk.rpc.Server('https://soroban-testnet.stellar.org')
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const response = await server.sendTransaction(signedTx as any)

            if (response.status === 'PENDING') {
                // Wait for confirmation
                let txResponse = await server.getTransaction(response.hash)
                while (txResponse.status === 'NOT_FOUND') {
                    await new Promise(resolve => setTimeout(resolve, 1000))
                    txResponse = await server.getTransaction(response.hash)
                }

                if (txResponse.status !== 'SUCCESS') {
                    throw new Error('Transaction failed on-chain')
                }

                // Step 4: Confirm in database
                const confirmRes = await fetch(`/api/orders/${order.id}/fill`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        txHash: response.hash,
                        tokenAmount: fill.tokenAmount,
                        paymentAmount: fill.paymentAmount,
                    }),
                })

                if (!confirmRes.ok) {
                    console.error('Failed to confirm fill:', await confirmRes.text())
                }

                // Remove the filled order from the list
                setOrders(prev => prev.filter(o => o.id !== order.id))
            } else if (response.status === 'ERROR') {
                throw new Error(`Transaction error: ${response.errorResult}`)
            }

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to buy tokens')
        } finally {
            setBuyingId(null)
        }
    }

    const formatXLM = (stroops: string) => {
        return (parseInt(stroops || '0') / 10000000).toFixed(2)
    }

    const formatAddress = (addr: string) => {
        if (!addr) return '-'
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`
    }

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-white/50" />
            </div>
        )
    }

    if (userType !== 'INVESTOR') {
        return (
            <div className="p-8">
                <Card className="bg-white/5 border-white/10 backdrop-blur-md">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <ShoppingCart className="h-12 w-12 text-white/30 mb-4" />
                        <h3 className="text-lg font-semibold text-white mb-2">Investor Access Only</h3>
                        <p className="text-white/50 text-center">Only investors can access the secondary market.</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="p-8 space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-white">Secondary Market</h1>
                <p className="text-white/50 mt-1">
                    Buy invoice tokens from other investors
                </p>
            </div>

            {/* Wallet Connection */}
            {!isConnected && (
                <Card className="bg-amber-500/10 border-amber-500/20 backdrop-blur-md">
                    <CardContent className="flex items-center gap-4 p-4">
                        <AlertCircle className="h-5 w-5 text-amber-400" />
                        <div className="flex-1">
                            <p className="font-medium text-white">Wallet Required</p>
                            <p className="text-sm text-white/60">Connect your Freighter wallet to buy tokens from the secondary market.</p>
                        </div>
                        <Button onClick={connect} className="gap-2 bg-white text-black hover:bg-white/90">
                            <CheckCircle2 className="h-4 w-4" />
                            Connect Wallet
                        </Button>
                    </CardContent>
                </Card>
            )}

            {error && (
                <Card className="bg-rose-500/10 border-rose-500/20">
                    <CardContent className="py-4 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-rose-400" />
                        <p className="text-rose-400">{error}</p>
                    </CardContent>
                </Card>
            )}

            {/* Summary */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-white/5 border-white/10 backdrop-blur-md">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-white/70">Open Orders</CardTitle>
                        <ShoppingCart className="h-4 w-4 text-white/50" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{orders.length}</div>
                        <p className="text-xs text-white/40">Available to buy</p>
                    </CardContent>
                </Card>

                <Card className="bg-white/5 border-white/10 backdrop-blur-md">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-white/70">Total Value</CardTitle>
                        <TrendingUp className="h-4 w-4 text-emerald-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-400">
                            {formatXLM(orders.reduce((sum, o) => sum + parseInt(o.totalPrice || '0'), 0).toString())} XLM
                        </div>
                        <p className="text-xs text-white/40">Combined market value</p>
                    </CardContent>
                </Card>

                <Card className="bg-white/5 border-white/10 backdrop-blur-md">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-white/70">Unique Sellers</CardTitle>
                        <Tag className="h-4 w-4 text-blue-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">
                            {new Set(orders.map(o => o.seller)).size}
                        </div>
                        <p className="text-xs text-white/40">Active sellers</p>
                    </CardContent>
                </Card>
            </div>

            {/* Orders List */}
            <Card className="bg-white/5 border-white/10 backdrop-blur-md">
                <CardHeader>
                    <CardTitle className="text-white">Available Orders</CardTitle>
                    <CardDescription className="text-white/50">
                        Browse and buy invoice tokens from other investors
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {orders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <ShoppingCart className="h-12 w-12 text-white/20 mb-4" />
                            <h3 className="text-lg font-semibold text-white/70 mb-2">No orders available</h3>
                            <p className="text-white/40 text-center mb-4">
                                Check back later for new sell orders from other investors
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {orders.map((order) => (
                                <div
                                    key={order.id}
                                    className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                                                <Tag className="h-5 w-5 text-blue-400" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-white">
                                                    Invoice #{order.invoiceId?.slice(0, 8)}
                                                </p>
                                                <p className="text-xs text-white/40">
                                                    {order.invoiceDescription || 'Invoice tokens'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-bold text-emerald-400">
                                                {formatXLM(order.totalPrice)} XLM
                                            </p>
                                            <p className="text-xs text-white/40">
                                                {formatXLM(order.pricePerToken)} XLM/token
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                                        <div>
                                            <span className="text-white/40">Tokens</span>
                                            <p className="font-medium text-white">{formatXLM(order.tokenAmount)}</p>
                                        </div>
                                        <div>
                                            <span className="text-white/40">Seller</span>
                                            <p className="font-medium text-white font-mono text-xs">
                                                {formatAddress(order.seller)}
                                            </p>
                                        </div>
                                        <div>
                                            <span className="text-white/40">Listed</span>
                                            <p className="font-medium text-white">
                                                {new Date(order.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>

                                    <Button
                                        onClick={() => handleBuy(order)}
                                        disabled={buyingId === order.id || !isConnected}
                                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                                    >
                                        {buyingId === order.id ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Processing...
                                            </>
                                        ) : (
                                            <>
                                                <ShoppingCart className="mr-2 h-4 w-4" />
                                                Buy for {formatXLM(order.totalPrice)} XLM
                                            </>
                                        )}
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

"use client"

import * as React from "react"
import { useStore } from "@/lib/store"
import { useFreighterWallet } from "@/hooks/useFreighterWallet"
import { mintDraftBrowser } from "@/lib/contracts/browser-client"
import { InvoiceStatus } from "@/lib/contracts/config"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FileUpload } from "@/components/ui/file-upload"
import { useRouter } from "next/navigation"
import { Loader2, AlertCircle, Wallet, FileText, CheckCircle2 } from "lucide-react"

export default function CreateInvoicePage() {
    const router = useRouter()
    const { addInvoice, addNotification } = useStore()
    const { publicKey, isConnected, connect } = useFreighterWallet()
    const [isLoading, setIsLoading] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)

    // Form State - dynamic default date (90 days from now)
    const defaultDueDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const [amount, setAmount] = React.useState("10000")
    const [buyerAddress, setBuyerAddress] = React.useState("")
    const [dueDate, setDueDate] = React.useState(defaultDueDate)
    const [description, setDescription] = React.useState("")
    const [documentCid, setDocumentCid] = React.useState<string | null>(null)
    const [documentName, setDocumentName] = React.useState<string | null>(null)

    const handleDocumentUpload = (cid: string, fileName: string) => {
        setDocumentCid(cid)
        setDocumentName(fileName)
    }

    const handleMint = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (!isConnected || !publicKey) {
            setError("Please connect your wallet first")
            return
        }

        if (!buyerAddress) {
            setError("Please enter a buyer address")
            return
        }

        setIsLoading(true)

        try {
            // Convert amount to stroops (7 decimal places)
            const amountInStroops = BigInt(Math.floor(parseFloat(amount) * 10000000))
            const dueDateTimestamp = Math.floor(new Date(dueDate).getTime() / 1000)
            const purchaseOrder = `PO-${Date.now()}`

            // Call the real contract
            const invoiceId = await mintDraftBrowser(
                publicKey,
                buyerAddress,
                amountInStroops,
                'XLM',
                dueDateTimestamp,
                description,
                purchaseOrder
            )

            // If we have a document, update the invoice with the document hash
            if (documentCid && invoiceId) {
                try {
                    await fetch(`/api/invoices/${invoiceId}/document`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ documentHash: documentCid }),
                    })
                } catch (docErr) {
                    console.warn('Failed to attach document:', docErr)
                }
            }

            // Add to local state
            addInvoice({
                id: invoiceId,
                supplier: publicKey,
                buyer: buyerAddress,
                amount: amountInStroops.toString(),
                currency: 'XLM',
                createdAt: Math.floor(Date.now() / 1000),
                dueDate: dueDateTimestamp,
                verifiedAt: 0,
                settledAt: 0,
                status: InvoiceStatus.Draft,
                tokenSymbol: '',
                totalTokens: '0',
                tokensSold: '0',
                tokensRemaining: '0',
                description,
                purchaseOrder,
                documentHash: documentCid || '',
                repaymentReceived: '0',
                buyerSignedAt: 0,
                auctionStart: 0,
                auctionEnd: 0,
                startPrice: '0',
                minPrice: '0',
                priceDropRate: 0,
            })

            addNotification({
                type: 'success',
                title: 'Invoice Minted!',
                message: `Invoice ${invoiceId} created on Stellar Testnet`
            })

            router.push('/dashboard')
        } catch (err: unknown) {
            console.error('Minting failed:', err)
            setError(err instanceof Error ? err.message : 'Failed to mint invoice. Check console for details.')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="max-w-2xl mx-auto p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Mint New Invoice</h1>
                <p className="text-muted-foreground">Tokenize your accounts receivable on Stellar.</p>
            </div>

            {!isConnected && (
                <Card className="mb-6 border-amber-500/50 bg-amber-500/10">
                    <CardContent className="flex items-center gap-4 p-4">
                        <AlertCircle className="h-5 w-5 text-amber-500" />
                        <div className="flex-1">
                            <p className="font-medium">Wallet Required</p>
                            <p className="text-sm text-muted-foreground">Connect your Freighter wallet to mint invoices on-chain.</p>
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
                    <CardTitle>Invoice Details</CardTitle>
                    <CardDescription>
                        Enter the details of the invoice you want to finance.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {error && (
                        <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleMint} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="desc">Description</Label>
                            <Input
                                id="desc"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="e.g. Web Development Services"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="amount">Amount (XLM)</Label>
                                <Input
                                    id="amount"
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="date">Due Date</Label>
                                <Input
                                    id="date"
                                    type="date"
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="buyer">Buyer Address (Stellar Public Key)</Label>
                            <Input
                                id="buyer"
                                value={buyerAddress}
                                onChange={(e) => setBuyerAddress(e.target.value)}
                                className="font-mono text-xs"
                                placeholder="G..."
                            />
                        </div>

                        {/* Document Upload */}
                        <div className="space-y-2">
                            <Label>Supporting Document (Optional)</Label>
                            <p className="text-xs text-muted-foreground mb-2">
                                Upload invoice PDF or image for verification. Stored on IPFS.
                            </p>
                            {documentCid ? (
                                <div className="p-4 rounded-lg border bg-emerald-500/5 border-emerald-500/20">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium">{documentName}</p>
                                            <p className="text-xs text-muted-foreground font-mono truncate">
                                                {documentCid}
                                            </p>
                                        </div>
                                        <Button 
                                            type="button"
                                            variant="ghost" 
                                            size="sm"
                                            onClick={() => {
                                                setDocumentCid(null)
                                                setDocumentName(null)
                                            }}
                                        >
                                            Remove
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <FileUpload
                                    onUpload={handleDocumentUpload}
                                    accept=".pdf,.png,.jpg,.jpeg"
                                    maxSize={10}
                                    disabled={isLoading}
                                />
                            )}
                        </div>

                        <div className="pt-4">
                            <Button
                                type="submit"
                                className="w-full"
                                disabled={isLoading || !isConnected}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Awaiting Signature...
                                    </>
                                ) : (
                                    <>
                                        <FileText className="mr-2 h-4 w-4" />
                                        Mint Draft Invoice (On-Chain)
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

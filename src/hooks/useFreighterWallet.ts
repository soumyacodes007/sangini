"use client"

import * as React from "react"
import * as freighterApi from "@stellar/freighter-api"

export interface WalletState {
    isInstalled: boolean
    isConnected: boolean
    publicKey: string | null
    network: string | null
    error: string | null
}

export function useFreighterWallet() {
    const [state, setState] = React.useState<WalletState>({
        isInstalled: false,
        isConnected: false,
        publicKey: null,
        network: null,
        error: null,
    })
    const [isLoading, setIsLoading] = React.useState(true)

    // Check if Freighter is installed and already connected on mount
    React.useEffect(() => {
        const checkWallet = async () => {
            try {
                console.log("Checking Freighter installation...")
                const result = await freighterApi.isConnected()
                console.log("isConnected result:", result)

                // The API returns { isConnected: boolean }
                const isInstalled = result && typeof result === 'object' && 'isConnected' in result

                if (isInstalled) {
                    setState(prev => ({
                        ...prev,
                        isInstalled: true,
                        error: null,
                    }))
                    
                    // Check if already connected and get address
                    try {
                        const addressResult = await freighterApi.getAddress()
                        console.log("getAddress result:", addressResult)
                        
                        if (addressResult.address && !addressResult.error) {
                            // Wallet is already connected
                            const networkResult = await freighterApi.getNetworkDetails()
                            setState({
                                isInstalled: true,
                                isConnected: true,
                                publicKey: addressResult.address,
                                network: networkResult.network || "TESTNET",
                                error: null,
                            })
                        }
                    } catch (addrErr) {
                        // Not connected yet, that's fine
                        console.log("Wallet not connected yet:", addrErr)
                    }
                } else {
                    setState(prev => ({
                        ...prev,
                        isInstalled: false,
                        error: "Freighter not detected",
                    }))
                }
            } catch (err) {
                console.error("Freighter check error:", err)
                setState(prev => ({
                    ...prev,
                    isInstalled: false,
                    error: "Could not detect Freighter",
                }))
            }
            setIsLoading(false)
        }

        // Wait a moment for extension
        setTimeout(checkWallet, 500)
    }, [])

    const connect = async (): Promise<boolean> => {
        setIsLoading(true)
        setState(prev => ({ ...prev, error: null }))

        try {
            console.log("Requesting Freighter access...")

            // Request access (this may trigger a popup)
            const allowedResult = await freighterApi.requestAccess()
            console.log("requestAccess result:", allowedResult)

            if (allowedResult.error) {
                setState(prev => ({
                    ...prev,
                    error: allowedResult.error,
                }))
                setIsLoading(false)
                return false
            }

            // Get the public key
            const addressResult = await freighterApi.getAddress()
            console.log("getAddress result:", addressResult)

            if (addressResult.error) {
                setState(prev => ({
                    ...prev,
                    error: addressResult.error,
                }))
                setIsLoading(false)
                return false
            }

            // Get network info
            const networkResult = await freighterApi.getNetworkDetails()
            console.log("getNetworkDetails result:", networkResult)

            setState({
                isInstalled: true,
                isConnected: true,
                publicKey: addressResult.address,
                network: networkResult.network || "TESTNET",
                error: null,
            })

            setIsLoading(false)
            return true
        } catch (err: unknown) {
            console.error("Freighter connect error:", err)
            setState(prev => ({
                ...prev,
                error: err instanceof Error ? err.message : "Failed to connect",
            }))
            setIsLoading(false)
            return false
        }
    }

    const disconnect = () => {
        setState(prev => ({
            ...prev,
            isConnected: false,
            publicKey: null,
        }))
    }

    const sign = async (xdr: string): Promise<string> => {
        if (!state.publicKey) {
            throw new Error("Wallet not connected")
        }

        const result = await freighterApi.signTransaction(xdr, {
            networkPassphrase: "Test SDF Network ; September 2015",
        })

        if (result.error) {
            throw new Error(result.error)
        }

        return result.signedTxXdr
    }

    return {
        ...state,
        isLoading,
        connect,
        disconnect,
        sign,
    }
}

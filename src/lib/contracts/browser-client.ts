// Browser-compatible Soroban Contract Client
// Uses Freighter for transaction signing instead of Keypairs

import * as StellarSdk from '@stellar/stellar-sdk';
import { signTransaction } from '@stellar/freighter-api';
import { CONTRACT_CONFIG, Invoice, InvoiceStatus } from './config';

const { Contract, rpc, TransactionBuilder, Networks, scValToNative, nativeToScVal } = StellarSdk;

// RPC Server
const server = new rpc.Server(CONTRACT_CONFIG.SOROBAN_RPC_URL);

// Contract instance
const invoiceContract = new Contract(CONTRACT_CONFIG.INVOICE_CONTRACT);

// Helper to build, sign with Freighter, and submit transactions
export async function submitWithFreighter(
    sourcePublicKey: string,
    operation: StellarSdk.xdr.Operation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
    const account = await server.getAccount(sourcePublicKey);

    const transaction = new TransactionBuilder(account, {
        fee: '100000',
        networkPassphrase: Networks.TESTNET,
    })
        .addOperation(operation)
        .setTimeout(30)
        .build();

    // Prepare transaction for Soroban
    const preparedTx = await server.prepareTransaction(transaction);

    // Get XDR for Freighter signing
    const xdr = preparedTx.toXDR();

    // Sign with Freighter (this opens the wallet popup)
    const signResult = await signTransaction(xdr, {
        networkPassphrase: Networks.TESTNET,
    });

    // Parse signed transaction - handle the new API response
    const signedXdr = signResult.signedTxXdr;
    const signedTx = TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET);

    // Submit to network
    const response = await server.sendTransaction(signedTx as StellarSdk.Transaction);

    if (response.status === 'PENDING') {
        let txResponse = await server.getTransaction(response.hash);
        while (txResponse.status === 'NOT_FOUND') {
            await new Promise(resolve => setTimeout(resolve, 1000));
            txResponse = await server.getTransaction(response.hash);
        }
        return txResponse;
    }

    return response;
}

// Helper to simulate read-only calls (no signing needed)
async function simulateReadOnly(
    operation: StellarSdk.xdr.Operation,
    source: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
    const account = await server.getAccount(source);

    const transaction = new TransactionBuilder(account, {
        fee: '100000',
        networkPassphrase: Networks.TESTNET,
    })
        .addOperation(operation)
        .setTimeout(30)
        .build();

    const simResult = await server.simulateTransaction(transaction);

    if ('result' in simResult && simResult.result) {
        return scValToNative(simResult.result.retval);
    }

    throw new Error('Simulation failed');
}

// ============================================================================
// BROWSER CONTRACT FUNCTIONS (use Freighter)
// ============================================================================

export async function mintDraftBrowser(
    supplierPublicKey: string,
    buyerAddress: string,
    amount: bigint,
    currency: string,
    dueDate: number,
    description: string,
    purchaseOrder: string
): Promise<string> {
    const op = invoiceContract.call(
        'mint_draft',
        nativeToScVal(supplierPublicKey, { type: 'address' }),
        nativeToScVal(buyerAddress, { type: 'address' }),
        nativeToScVal(amount, { type: 'i128' }),
        nativeToScVal(currency, { type: 'string' }),
        nativeToScVal(dueDate, { type: 'u64' }),
        nativeToScVal(description, { type: 'string' }),
        nativeToScVal(purchaseOrder, { type: 'string' })
    );

    const result = await submitWithFreighter(supplierPublicKey, op);
    return result.returnValue ? scValToNative(result.returnValue) : '';
}

export async function approveInvoiceBrowser(
    buyerPublicKey: string,
    invoiceId: string
): Promise<void> {
    const op = invoiceContract.call(
        'approve_invoice',
        nativeToScVal(invoiceId, { type: 'string' }),
        nativeToScVal(buyerPublicKey, { type: 'address' })
    );

    await submitWithFreighter(buyerPublicKey, op);
}

export async function fundInvoiceBrowser(
    investorPublicKey: string,
    invoiceId: string,
    tokenAmount: bigint,
    paymentAmount: bigint
): Promise<void> {
    // invest(invoice_id, investor, token_amount, payment_amount)
    const op = invoiceContract.call(
        'invest',
        nativeToScVal(invoiceId, { type: 'string' }),
        nativeToScVal(investorPublicKey, { type: 'address' }),
        nativeToScVal(tokenAmount, { type: 'i128' }),
        nativeToScVal(paymentAmount, { type: 'i128' })
    );

    await submitWithFreighter(investorPublicKey, op);
}

export async function settleBrowser(
    buyerPublicKey: string,
    invoiceId: string,
    paymentAmount: bigint
): Promise<void> {
    const op = invoiceContract.call(
        'settle',
        nativeToScVal(invoiceId, { type: 'string' }),
        nativeToScVal(buyerPublicKey, { type: 'address' }),
        nativeToScVal(paymentAmount, { type: 'i128' })
    );

    await submitWithFreighter(buyerPublicKey, op);
}

export async function setInvestorKycBrowser(
    adminPublicKey: string,
    investorAddress: string,
    approved: boolean
): Promise<void> {
    // set_investor_kyc(admin, investor, approved)
    const op = invoiceContract.call(
        'set_investor_kyc',
        nativeToScVal(adminPublicKey, { type: 'address' }),
        nativeToScVal(investorAddress, { type: 'address' }),
        nativeToScVal(approved, { type: 'bool' })
    );

    await submitWithFreighter(adminPublicKey, op);
}

// ============================================================================
// READ FUNCTIONS (no signing needed)
// ============================================================================

export async function getInvoice(
    invoiceId: string,
    source: string
): Promise<Invoice | null> {
    try {
        const op = invoiceContract.call(
            'get_invoice',
            nativeToScVal(invoiceId, { type: 'string' })
        );

        const result = await simulateReadOnly(op, source);

        return {
            id: result.id,
            supplier: result.supplier,
            buyer: result.buyer,
            amount: result.amount.toString(),
            currency: result.currency,
            createdAt: Number(result.created_at),
            dueDate: Number(result.due_date),
            verifiedAt: Number(result.verified_at),
            settledAt: Number(result.settled_at),
            status: result.status as InvoiceStatus,
            tokenSymbol: result.token_symbol || '',
            totalTokens: result.total_tokens?.toString() || '0',
            tokensSold: result.tokens_sold?.toString() || '0',
            tokensRemaining: result.tokens_remaining?.toString() || '0',
            description: result.description || '',
            purchaseOrder: result.purchase_order || '',
            documentHash: result.document_hash || '',
            repaymentReceived: result.repayment_received?.toString() || '0',
            buyerSignedAt: Number(result.buyer_signed_at || 0),
            auctionStart: Number(result.auction_start || 0),
            auctionEnd: Number(result.auction_end || 0),
            startPrice: result.start_price?.toString() || '0',
            minPrice: result.min_price?.toString() || '0',
            priceDropRate: Number(result.price_drop_rate || 0),
        };
    } catch (error) {
        console.error('Failed to get invoice:', error);
        return null;
    }
}

export async function isKycApproved(
    investorAddress: string,
    source: string
): Promise<boolean> {
    try {
        const op = invoiceContract.call(
            'is_kyc_approved',
            nativeToScVal(investorAddress, { type: 'address' })
        );

        return await simulateReadOnly(op, source);
    } catch (error) {
        console.error('Failed to check KYC:', error);
        return false;
    }
}

export async function checkStatus(
    invoiceId: string,
    source: string
): Promise<InvoiceStatus> {
    try {
        const op = invoiceContract.call(
            'check_status',
            nativeToScVal(invoiceId, { type: 'string' })
        );

        return await simulateReadOnly(op, source);
    } catch (error) {
        console.error('Failed to check status:', error);
        return InvoiceStatus.Draft;
    }
}

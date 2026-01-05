// Stellar/Soroban Contract Client
import * as StellarSdk from '@stellar/stellar-sdk';
import { CONTRACT_CONFIG, Invoice, InvoiceStatus, Dispute, TokenHolding } from './config';

// Destructure values from SDK
const { Contract, rpc, TransactionBuilder, Networks, Keypair, scValToNative, nativeToScVal } = StellarSdk;

// Define Keypair type alias for usage in function signatures
type Keypair = StellarSdk.Keypair;

// RPC Server
const server = new rpc.Server(CONTRACT_CONFIG.SOROBAN_RPC_URL);

// Contract instances
const invoiceContract = new Contract(CONTRACT_CONFIG.INVOICE_CONTRACT);

// Helper to build and submit transactions
async function submitTransaction(
    sourceKeypair: StellarSdk.Keypair,
    operation: StellarSdk.xdr.Operation
): Promise<any> {
    const account = await server.getAccount(sourceKeypair.publicKey());

    const transaction = new TransactionBuilder(account, {
        fee: '100000',
        networkPassphrase: Networks.TESTNET,
    })
        .addOperation(operation)
        .setTimeout(30)
        .build();

    const preparedTx = await server.prepareTransaction(transaction);
    preparedTx.sign(sourceKeypair);

    const response = await server.sendTransaction(preparedTx);

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

// Helper to simulate read-only calls
async function simulateReadOnly(
    operation: StellarSdk.xdr.Operation,
    source: string
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
// CONTRACT FUNCTIONS
// ============================================================================

export async function mintDraft(
    supplierKeypair: Keypair,
    buyerAddress: string,
    amount: bigint,
    currency: string,
    dueDate: number,
    description: string,
    purchaseOrder: string
): Promise<string> {
    const op = invoiceContract.call(
        'mint_draft',
        nativeToScVal(supplierKeypair.publicKey(), { type: 'address' }),
        nativeToScVal(buyerAddress, { type: 'address' }),
        nativeToScVal(amount, { type: 'i128' }),
        nativeToScVal(currency, { type: 'string' }),
        nativeToScVal(dueDate, { type: 'u64' }),
        nativeToScVal(description, { type: 'string' }),
        nativeToScVal(purchaseOrder, { type: 'string' })
    );

    const result = await submitTransaction(supplierKeypair, op);
    return result.returnValue ? scValToNative(result.returnValue) : '';
}

export async function approveInvoice(
    buyerKeypair: Keypair,
    invoiceId: string
): Promise<void> {
    const op = invoiceContract.call(
        'approve_invoice',
        nativeToScVal(invoiceId, { type: 'string' }),
        nativeToScVal(buyerKeypair.publicKey(), { type: 'address' })
    );

    await submitTransaction(buyerKeypair, op);
}

export async function setInvestorKyc(
    adminKeypair: Keypair,
    investorAddress: string,
    approved: boolean
): Promise<void> {
    const op = invoiceContract.call(
        'set_investor_kyc',
        nativeToScVal(adminKeypair.publicKey(), { type: 'address' }),
        nativeToScVal(investorAddress, { type: 'address' }),
        nativeToScVal(approved, { type: 'bool' })
    );

    await submitTransaction(adminKeypair, op);
}

export async function raiseDispute(
    buyerKeypair: Keypair,
    invoiceId: string,
    reason: string
): Promise<void> {
    const op = invoiceContract.call(
        'raise_dispute',
        nativeToScVal(invoiceId, { type: 'string' }),
        nativeToScVal(buyerKeypair.publicKey(), { type: 'address' }),
        nativeToScVal(reason, { type: 'string' })
    );

    await submitTransaction(buyerKeypair, op);
}

export async function resolveDispute(
    adminKeypair: Keypair,
    invoiceId: string,
    isValid: boolean
): Promise<void> {
    const op = invoiceContract.call(
        'resolve_dispute',
        nativeToScVal(invoiceId, { type: 'string' }),
        nativeToScVal(adminKeypair.publicKey(), { type: 'address' }),
        nativeToScVal(isValid, { type: 'bool' })
    );

    await submitTransaction(adminKeypair, op);
}

export async function settle(
    buyerKeypair: Keypair,
    invoiceId: string,
    paymentAmount: bigint
): Promise<void> {
    const op = invoiceContract.call(
        'settle',
        nativeToScVal(invoiceId, { type: 'string' }),
        nativeToScVal(buyerKeypair.publicKey(), { type: 'address' }),
        nativeToScVal(paymentAmount, { type: 'i128' })
    );

    await submitTransaction(buyerKeypair, op);
}

export async function revoke(
    supplierKeypair: Keypair,
    invoiceId: string
): Promise<void> {
    const op = invoiceContract.call(
        'revoke',
        nativeToScVal(invoiceId, { type: 'string' }),
        nativeToScVal(supplierKeypair.publicKey(), { type: 'address' })
    );

    await submitTransaction(supplierKeypair, op);
}

// ============================================================================
// READ FUNCTIONS
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
            tokenSymbol: result.token_symbol,
            totalTokens: result.total_tokens.toString(),
            description: result.description,
            purchaseOrder: result.purchase_order,
            repaymentReceived: result.repayment_received.toString(),
            buyerSignedAt: Number(result.buyer_signed_at),
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

export async function getSettlementAmount(
    invoiceId: string,
    source: string
): Promise<string> {
    try {
        const op = invoiceContract.call(
            'get_settlement_amount',
            nativeToScVal(invoiceId, { type: 'string' })
        );

        const result = await simulateReadOnly(op, source);
        return result.toString();
    } catch (error) {
        console.error('Failed to get settlement amount:', error);
        return '0';
    }
}

export async function getDispute(
    invoiceId: string,
    source: string
): Promise<Dispute | null> {
    try {
        const op = invoiceContract.call(
            'get_dispute',
            nativeToScVal(invoiceId, { type: 'string' })
        );

        const result = await simulateReadOnly(op, source);

        return {
            invoiceId: result.invoice_id,
            raisedBy: result.raised_by,
            reason: result.reason,
            raisedAt: Number(result.raised_at),
            resolution: result.resolution,
            resolvedAt: Number(result.resolved_at),
        };
    } catch (error) {
        console.error('Failed to get dispute:', error);
        return null;
    }
}

export async function getHolding(
    invoiceId: string,
    holderAddress: string,
    source: string
): Promise<TokenHolding | null> {
    try {
        const op = invoiceContract.call(
            'get_holding',
            nativeToScVal(invoiceId, { type: 'string' }),
            nativeToScVal(holderAddress, { type: 'address' })
        );

        const result = await simulateReadOnly(op, source);

        return {
            invoiceId: result.invoice_id,
            holder: result.holder,
            amount: result.amount.toString(),
            acquiredAt: Number(result.acquired_at),
            acquiredPrice: result.acquired_price.toString(),
        };
    } catch (error) {
        console.error('Failed to get holding:', error);
        return null;
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

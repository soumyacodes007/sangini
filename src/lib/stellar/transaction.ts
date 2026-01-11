// Soroban Transaction Builder Utilities
import {
  Contract,
  Keypair,
  Networks,
  rpc,
  TransactionBuilder,
  xdr,
  Address,
  nativeToScVal,
  scValToNative,
} from '@stellar/stellar-sdk';

const RPC_URL = process.env.NEXT_PUBLIC_SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org';
const NETWORK_PASSPHRASE = process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE || Networks.TESTNET;
const INVOICE_CONTRACT = process.env.NEXT_PUBLIC_INVOICE_CONTRACT || '';
const TOKEN_CONTRACT = process.env.NEXT_PUBLIC_TOKEN_CONTRACT || '';

/**
 * Get Soroban RPC server
 */
export function getServer(): rpc.Server {
  return new rpc.Server(RPC_URL);
}

/**
 * Get contract instance
 */
export function getInvoiceContract(): Contract {
  if (!INVOICE_CONTRACT) {
    throw new Error('NEXT_PUBLIC_INVOICE_CONTRACT not configured');
  }
  return new Contract(INVOICE_CONTRACT);
}

/**
 * Get token contract instance
 */
export function getTokenContract(): Contract {
  if (!TOKEN_CONTRACT) {
    throw new Error('NEXT_PUBLIC_TOKEN_CONTRACT not configured');
  }
  return new Contract(TOKEN_CONTRACT);
}

/**
 * Build a transaction for contract call
 */
async function buildContractTransaction(
  sourcePublicKey: string,
  contract: Contract,
  method: string,
  args: xdr.ScVal[]
): Promise<string> {
  const server = getServer();
  const account = await server.getAccount(sourcePublicKey);

  const transaction = new TransactionBuilder(account, {
    fee: '100',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  // Simulate to get proper fees and resources
  const simulated = await server.simulateTransaction(transaction);

  if (rpc.Api.isSimulationError(simulated)) {
    throw new Error(`Simulation failed: ${simulated.error}`);
  }

  // Assemble the transaction with proper resources
  const assembled = rpc.assembleTransaction(transaction, simulated).build();

  return assembled.toXDR();
}

/**
 * Build approve_invoice transaction
 */
export async function buildInvoiceApprovalTx(
  invoiceId: string,
  buyerAddress: string
): Promise<string> {
  const contract = getInvoiceContract();

  const args = [
    nativeToScVal(invoiceId, { type: 'string' }),
    new Address(buyerAddress).toScVal(),
  ];

  return buildContractTransaction(buyerAddress, contract, 'approve_invoice', args);
}

/**
 * Build settle transaction
 */
export async function buildSettlementTx(
  invoiceId: string,
  buyerAddress: string,
  paymentAmount: bigint
): Promise<string> {
  const contract = getInvoiceContract();

  const args = [
    nativeToScVal(invoiceId, { type: 'string' }),
    new Address(buyerAddress).toScVal(),
    nativeToScVal(paymentAmount, { type: 'i128' }),
  ];

  return buildContractTransaction(buyerAddress, contract, 'settle', args);
}

/**
 * Build mint_draft transaction (for suppliers)
 */
export async function buildMintDraftTx(
  supplierAddress: string,
  buyerAddress: string,
  amount: bigint,
  currency: string,
  dueDate: bigint,
  description: string,
  purchaseOrder: string,
  documentHash: string
): Promise<string> {
  const contract = getInvoiceContract();

  const args = [
    new Address(supplierAddress).toScVal(),
    new Address(buyerAddress).toScVal(),
    nativeToScVal(amount, { type: 'i128' }),
    nativeToScVal(currency, { type: 'string' }),
    nativeToScVal(dueDate, { type: 'u64' }),
    nativeToScVal(description, { type: 'string' }),
    nativeToScVal(purchaseOrder, { type: 'string' }),
    nativeToScVal(documentHash, { type: 'string' }),
  ];

  return buildContractTransaction(supplierAddress, contract, 'mint_draft', args);
}

/**
 * Build start_auction transaction
 */
export async function buildStartAuctionTx(
  invoiceId: string,
  supplierAddress: string,
  durationHours: bigint,
  maxDiscountBps: number
): Promise<string> {
  const contract = getInvoiceContract();

  const args = [
    nativeToScVal(invoiceId, { type: 'string' }),
    new Address(supplierAddress).toScVal(),
    nativeToScVal(durationHours, { type: 'u64' }),
    nativeToScVal(maxDiscountBps, { type: 'u32' }),
  ];

  return buildContractTransaction(supplierAddress, contract, 'start_auction', args);
}

/**
 * Build invest transaction
 */
export async function buildInvestTx(
  invoiceId: string,
  investorAddress: string,
  tokenAmount: bigint
): Promise<string> {
  const contract = getInvoiceContract();

  const args = [
    nativeToScVal(invoiceId, { type: 'string' }),
    new Address(investorAddress).toScVal(),
    nativeToScVal(tokenAmount, { type: 'i128' }),
  ];

  return buildContractTransaction(investorAddress, contract, 'invest', args);
}

/**
 * Sign a transaction XDR with a keypair
 */
export function signTransaction(xdrString: string, keypair: Keypair): string {
  const transaction = TransactionBuilder.fromXDR(xdrString, NETWORK_PASSPHRASE);
  transaction.sign(keypair);
  return transaction.toXDR();
}

/**
 * Submit a signed transaction
 */
export async function submitTransaction(signedXdr: string): Promise<{
  success: boolean;
  hash?: string;
  result?: unknown;
  error?: string;
}> {
  const server = getServer();
  const transaction = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);

  try {
    const response = await server.sendTransaction(transaction);

    if (response.status === 'PENDING') {
      // Wait for confirmation
      let getResponse = await server.getTransaction(response.hash);
      
      while (getResponse.status === 'NOT_FOUND') {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        getResponse = await server.getTransaction(response.hash);
      }

      if (getResponse.status === 'SUCCESS') {
        return {
          success: true,
          hash: response.hash,
          result: getResponse.returnValue ? scValToNative(getResponse.returnValue) : null,
        };
      } else {
        return {
          success: false,
          hash: response.hash,
          error: `Transaction failed: ${getResponse.status}`,
        };
      }
    } else if (response.status === 'ERROR') {
      return {
        success: false,
        error: `Transaction error: ${response.errorResult}`,
      };
    }

    return {
      success: false,
      error: `Unexpected status: ${response.status}`,
    };
  } catch (error) {
    console.error('Transaction submission error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Transaction failed',
    };
  }
}

/**
 * Get invoice from contract
 */
export async function getInvoiceFromContract(invoiceId: string): Promise<unknown> {
  const server = getServer();
  const contract = getInvoiceContract();

  const args = [nativeToScVal(invoiceId, { type: 'string' })];

  // Build a read-only transaction
  const account = await server.getAccount(INVOICE_CONTRACT);
  const transaction = new TransactionBuilder(account, {
    fee: '100',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call('get_invoice', ...args))
    .setTimeout(30)
    .build();

  const simulated = await server.simulateTransaction(transaction);

  if (rpc.Api.isSimulationError(simulated)) {
    throw new Error(`Failed to get invoice: ${simulated.error}`);
  }

  if (rpc.Api.isSimulationSuccess(simulated) && simulated.result) {
    return scValToNative(simulated.result.retval);
  }

  return null;
}

/**
 * Get settlement amount from contract
 */
export async function getSettlementAmount(invoiceId: string): Promise<bigint> {
  const server = getServer();
  const contract = getInvoiceContract();

  const args = [nativeToScVal(invoiceId, { type: 'string' })];

  const account = await server.getAccount(INVOICE_CONTRACT);
  const transaction = new TransactionBuilder(account, {
    fee: '100',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call('get_settlement_amount', ...args))
    .setTimeout(30)
    .build();

  const simulated = await server.simulateTransaction(transaction);

  if (rpc.Api.isSimulationError(simulated)) {
    throw new Error(`Failed to get settlement amount: ${simulated.error}`);
  }

  if (rpc.Api.isSimulationSuccess(simulated) && simulated.result) {
    return scValToNative(simulated.result.retval) as bigint;
  }

  return BigInt(0);
}

/**
 * Get current auction price
 */
export async function getCurrentPrice(invoiceId: string): Promise<bigint> {
  const server = getServer();
  const contract = getInvoiceContract();

  const args = [nativeToScVal(invoiceId, { type: 'string' })];

  const account = await server.getAccount(INVOICE_CONTRACT);
  const transaction = new TransactionBuilder(account, {
    fee: '100',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call('get_current_price', ...args))
    .setTimeout(30)
    .build();

  const simulated = await server.simulateTransaction(transaction);

  if (rpc.Api.isSimulationError(simulated)) {
    throw new Error(`Failed to get current price: ${simulated.error}`);
  }

  if (rpc.Api.isSimulationSuccess(simulated) && simulated.result) {
    return scValToNative(simulated.result.retval) as bigint;
  }

  return BigInt(0);
}


/**
 * Build create_sell_order transaction
 */
export async function buildCreateSellOrderTx(
  invoiceId: string,
  sellerAddress: string,
  tokenAmount: bigint,
  pricePerToken: bigint
): Promise<string> {
  const contract = getInvoiceContract();

  const args = [
    nativeToScVal(invoiceId, { type: 'string' }),
    new Address(sellerAddress).toScVal(),
    nativeToScVal(tokenAmount, { type: 'i128' }),
    nativeToScVal(pricePerToken, { type: 'i128' }),
  ];

  return buildContractTransaction(sellerAddress, contract, 'create_sell_order', args);
}

/**
 * Build fill_order transaction
 */
export async function buildFillOrderTx(
  orderId: string,
  buyerAddress: string,
  tokenAmount: bigint
): Promise<string> {
  const contract = getInvoiceContract();

  const args = [
    nativeToScVal(orderId, { type: 'string' }),
    new Address(buyerAddress).toScVal(),
    nativeToScVal(tokenAmount, { type: 'i128' }),
  ];

  return buildContractTransaction(buyerAddress, contract, 'fill_order', args);
}

/**
 * Build cancel_order transaction
 */
export async function buildCancelOrderTx(
  orderId: string,
  sellerAddress: string
): Promise<string> {
  const contract = getInvoiceContract();

  const args = [
    nativeToScVal(orderId, { type: 'string' }),
    new Address(sellerAddress).toScVal(),
  ];

  return buildContractTransaction(sellerAddress, contract, 'cancel_order', args);
}

/**
 * Get open orders for an invoice from contract
 */
export async function getOpenOrdersFromContract(invoiceId: string): Promise<unknown[]> {
  const server = getServer();
  const contract = getInvoiceContract();

  const args = [nativeToScVal(invoiceId, { type: 'string' })];

  const account = await server.getAccount(INVOICE_CONTRACT);
  const transaction = new TransactionBuilder(account, {
    fee: '100',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call('get_open_orders', ...args))
    .setTimeout(30)
    .build();

  const simulated = await server.simulateTransaction(transaction);

  if (rpc.Api.isSimulationError(simulated)) {
    throw new Error(`Failed to get open orders: ${simulated.error}`);
  }

  if (rpc.Api.isSimulationSuccess(simulated) && simulated.result) {
    return scValToNative(simulated.result.retval) as unknown[];
  }

  return [];
}


/**
 * Get insurance pool balance from contract
 */
export async function getInsurancePoolBalance(): Promise<bigint> {
  const server = getServer();
  const contract = getInvoiceContract();

  // Build a read-only transaction (no args needed)
  const account = await server.getAccount(INVOICE_CONTRACT);
  const transaction = new TransactionBuilder(account, {
    fee: '100',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call('get_insurance_pool_balance'))
    .setTimeout(30)
    .build();

  const simulated = await server.simulateTransaction(transaction);

  if (rpc.Api.isSimulationError(simulated)) {
    throw new Error(`Failed to get insurance pool balance: ${simulated.error}`);
  }

  if (rpc.Api.isSimulationSuccess(simulated) && simulated.result) {
    return scValToNative(simulated.result.retval) as bigint;
  }

  return BigInt(0);
}

/**
 * Build claim_insurance transaction
 */
export async function buildClaimInsuranceTx(
  invoiceId: string,
  investorAddress: string
): Promise<string> {
  const contract = getInvoiceContract();

  const args = [
    nativeToScVal(invoiceId, { type: 'string' }),
    new Address(investorAddress).toScVal(),
  ];

  return buildContractTransaction(investorAddress, contract, 'claim_insurance', args);
}

/**
 * Check if insurance has been claimed for an invoice by an investor
 */
export async function checkInsuranceClaimed(
  invoiceId: string,
  investorAddress: string
): Promise<boolean> {
  const server = getServer();
  const contract = getInvoiceContract();

  // Note: This would need a contract function to check claim status
  // For now, we'll track this in the database
  // If the contract has is_insurance_claimed function, use it here
  
  return false; // Placeholder - tracked in DB
}

/**
 * Get token holding for an investor
 */
export async function getTokenHolding(
  invoiceId: string,
  holderAddress: string
): Promise<{ amount: bigint; acquiredPrice: bigint } | null> {
  const server = getServer();
  const contract = getInvoiceContract();

  const args = [
    nativeToScVal(invoiceId, { type: 'string' }),
    new Address(holderAddress).toScVal(),
  ];

  const account = await server.getAccount(INVOICE_CONTRACT);
  const transaction = new TransactionBuilder(account, {
    fee: '100',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call('get_holding', ...args))
    .setTimeout(30)
    .build();

  const simulated = await server.simulateTransaction(transaction);

  if (rpc.Api.isSimulationError(simulated)) {
    return null; // Holding not found
  }

  if (rpc.Api.isSimulationSuccess(simulated) && simulated.result) {
    const holding = scValToNative(simulated.result.retval) as {
      amount: bigint;
      acquired_price: bigint;
    };
    return {
      amount: holding.amount,
      acquiredPrice: holding.acquired_price,
    };
  }

  return null;
}


/**
 * Build set_investor_kyc transaction (admin only)
 * This sets the KYC status for an investor on-chain
 */
export async function buildSetInvestorKycTx(
  investorAddress: string,
  approved: boolean
): Promise<string> {
  const contract = getInvoiceContract();
  
  // Admin address is the relayer for this operation
  const adminAddress = process.env.RELAYER_PUBLIC_KEY;
  if (!adminAddress) {
    throw new Error('RELAYER_PUBLIC_KEY not configured');
  }

  const args = [
    new Address(adminAddress).toScVal(),
    new Address(investorAddress).toScVal(),
    nativeToScVal(approved, { type: 'bool' }),
  ];

  return buildContractTransaction(adminAddress, contract, 'set_investor_kyc', args);
}

/**
 * Check if investor is KYC approved on-chain
 */
export async function isKycApproved(investorAddress: string): Promise<boolean> {
  const server = getServer();
  const contract = getInvoiceContract();

  const args = [new Address(investorAddress).toScVal()];

  const account = await server.getAccount(INVOICE_CONTRACT);
  const transaction = new TransactionBuilder(account, {
    fee: '100',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call('is_kyc_approved', ...args))
    .setTimeout(30)
    .build();

  const simulated = await server.simulateTransaction(transaction);

  if (rpc.Api.isSimulationError(simulated)) {
    return false;
  }

  if (rpc.Api.isSimulationSuccess(simulated) && simulated.result) {
    return scValToNative(simulated.result.retval) as boolean;
  }

  return false;
}

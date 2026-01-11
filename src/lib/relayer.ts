// Relayer Wallet Setup
// The relayer pays gas fees for meta-transactions (buyers without wallets)

import { Keypair, Horizon } from '@stellar/stellar-sdk';

const NETWORK_URL = process.env.NEXT_PUBLIC_SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org';
const HORIZON_URL = 'https://horizon-testnet.stellar.org';

let relayerKeypair: Keypair | null = null;

/**
 * Get the relayer keypair from environment
 */
export function getRelayerKeypair(): Keypair {
  if (relayerKeypair) {
    return relayerKeypair;
  }

  const secretKey = process.env.RELAYER_SECRET_KEY;
  if (!secretKey) {
    throw new Error('RELAYER_SECRET_KEY not configured');
  }

  relayerKeypair = Keypair.fromSecret(secretKey);
  return relayerKeypair;
}

/**
 * Get relayer public key
 */
export function getRelayerPublicKey(): string {
  return getRelayerKeypair().publicKey();
}

/**
 * Get relayer XLM balance
 */
export async function getRelayerBalance(): Promise<string> {
  const server = new Horizon.Server(HORIZON_URL);
  const publicKey = getRelayerPublicKey();

  try {
    const account = await server.loadAccount(publicKey);
    const xlmBalance = account.balances.find(
      (b) => b.asset_type === 'native'
    );
    return xlmBalance?.balance || '0';
  } catch (error) {
    console.error('Failed to get relayer balance:', error);
    return '0';
  }
}

/**
 * Check if relayer has sufficient balance
 */
export async function checkRelayerBalance(minBalance: number = 10): Promise<{
  sufficient: boolean;
  balance: string;
  minRequired: number;
}> {
  const balance = await getRelayerBalance();
  const balanceNum = parseFloat(balance);

  return {
    sufficient: balanceNum >= minBalance,
    balance,
    minRequired: minBalance,
  };
}

/**
 * Fund a new account from the relayer (for custodial wallets)
 */
export async function fundAccount(
  destinationPublicKey: string,
  amount: string = '1'
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  const server = new Horizon.Server(HORIZON_URL);
  const relayer = getRelayerKeypair();

  try {
    // Check if account already exists
    try {
      await server.loadAccount(destinationPublicKey);
      // Account exists, just send payment
      const sourceAccount = await server.loadAccount(relayer.publicKey());
      const { TransactionBuilder, Operation, Asset, Networks } = await import('@stellar/stellar-sdk');
      
      const transaction = new TransactionBuilder(sourceAccount, {
        fee: '100',
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(
          Operation.payment({
            destination: destinationPublicKey,
            asset: Asset.native(),
            amount,
          })
        )
        .setTimeout(30)
        .build();

      transaction.sign(relayer);
      const result = await server.submitTransaction(transaction);
      
      return { success: true, txHash: result.hash };
    } catch {
      // Account doesn't exist, create it
      const sourceAccount = await server.loadAccount(relayer.publicKey());
      const { TransactionBuilder, Operation, Networks } = await import('@stellar/stellar-sdk');
      
      const transaction = new TransactionBuilder(sourceAccount, {
        fee: '100',
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(
          Operation.createAccount({
            destination: destinationPublicKey,
            startingBalance: amount,
          })
        )
        .setTimeout(30)
        .build();

      transaction.sign(relayer);
      const result = await server.submitTransaction(transaction);
      
      return { success: true, txHash: result.hash };
    }
  } catch (error) {
    console.error('Failed to fund account:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fund account',
    };
  }
}

/**
 * Alert if relayer balance is low
 */
export async function alertIfLowBalance(): Promise<void> {
  const { sufficient, balance, minRequired } = await checkRelayerBalance();
  
  if (!sufficient) {
    console.warn(
      `⚠️ RELAYER LOW BALANCE: ${balance} XLM (minimum: ${minRequired} XLM)`
    );
    console.warn(`Fund the relayer at: ${getRelayerPublicKey()}`);
  }
}

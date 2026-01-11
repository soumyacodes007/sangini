// Custodial Wallet Utilities
import crypto from 'crypto';
import { Keypair } from '@stellar/stellar-sdk';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Generate a new Stellar keypair for custodial wallet
 */
export function generateCustodialWallet(): { publicKey: string; secret: string } {
  const keypair = Keypair.random();
  return {
    publicKey: keypair.publicKey(),
    secret: keypair.secret(),
  };
}

/**
 * Encrypt private key using AES-256-GCM
 */
export function encryptPrivateKey(secret: string, encryptionKey: string): string {
  // Ensure key is 32 bytes
  const key = Buffer.from(encryptionKey.padEnd(32, '0').slice(0, 32));
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(secret, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Combine iv + authTag + encrypted data
  return iv.toString('hex') + authTag.toString('hex') + encrypted;
}

/**
 * Decrypt private key
 */
export function decryptPrivateKey(encryptedData: string, encryptionKey: string): string {
  const key = Buffer.from(encryptionKey.padEnd(32, '0').slice(0, 32));
  
  // Extract iv, authTag, and encrypted data
  const iv = Buffer.from(encryptedData.slice(0, IV_LENGTH * 2), 'hex');
  const authTag = Buffer.from(encryptedData.slice(IV_LENGTH * 2, (IV_LENGTH + AUTH_TAG_LENGTH) * 2), 'hex');
  const encrypted = encryptedData.slice((IV_LENGTH + AUTH_TAG_LENGTH) * 2);
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Get keypair from encrypted secret
 */
export function getKeypairFromEncrypted(encryptedSecret: string, encryptionKey: string): Keypair {
  const secret = decryptPrivateKey(encryptedSecret, encryptionKey);
  return Keypair.fromSecret(secret);
}

/**
 * Sign a transaction with custodial wallet
 */
export async function signWithCustodialWallet(
  encryptedSecret: string,
  transactionXdr: string,
  networkPassphrase: string
): Promise<string> {
  const keypair = getKeypairFromEncrypted(
    encryptedSecret,
    process.env.WALLET_ENCRYPTION_KEY!
  );
  
  // Import Transaction class dynamically to avoid issues
  const { TransactionBuilder } = await import('@stellar/stellar-sdk');
  const transaction = TransactionBuilder.fromXDR(transactionXdr, networkPassphrase);
  
  transaction.sign(keypair);
  
  return transaction.toXDR();
}

// IPFS Upload Utilities using Pinata SDK
// Docs: https://docs.pinata.cloud/sdk
import { PinataSDK } from 'pinata';

let pinataClient: PinataSDK | null = null;

/**
 * Get Pinata client instance
 */
export function getPinataClient(): PinataSDK {
  if (pinataClient) {
    return pinataClient;
  }

  const jwt = process.env.PINATA_JWT;
  const gateway = process.env.PINATA_GATEWAY || 'gateway.pinata.cloud';

  if (!jwt) {
    throw new Error('PINATA_JWT not configured. Get one at https://app.pinata.cloud/');
  }

  pinataClient = new PinataSDK({
    pinataJwt: jwt,
    pinataGateway: gateway,
  });

  return pinataClient;
}

/**
 * Upload file to IPFS via Pinata
 * Uses pinata.upload.public.file() - returns public IPFS content
 */
export async function uploadToIPFS(
  file: File,
  metadata?: { name?: string; keyvalues?: Record<string, string> }
): Promise<{ cid: string; url: string }> {
  const pinata = getPinataClient();
  const gateway = process.env.PINATA_GATEWAY || 'gateway.pinata.cloud';

  // Build upload with optional metadata
  let upload = pinata.upload.public.file(file);
  
  if (metadata?.name) {
    upload = upload.name(metadata.name);
  }
  if (metadata?.keyvalues) {
    upload = upload.keyvalues(metadata.keyvalues);
  }

  const result = await upload;
  
  return {
    cid: result.cid,
    url: `https://${gateway}/ipfs/${result.cid}`,
  };
}

/**
 * Upload JSON data to IPFS
 * Uses pinata.upload.public.json()
 */
export async function uploadJSONToIPFS(
  data: Record<string, unknown>,
  name?: string
): Promise<{ cid: string; url: string }> {
  const pinata = getPinataClient();
  const gateway = process.env.PINATA_GATEWAY || 'gateway.pinata.cloud';

  let upload = pinata.upload.public.json(data);
  
  if (name) {
    upload = upload.name(name);
  }

  const result = await upload;
  
  return {
    cid: result.cid,
    url: `https://${gateway}/ipfs/${result.cid}`,
  };
}

/**
 * Get file from IPFS via gateway
 * Uses pinata.gateways.public.get()
 */
export async function getFromIPFS(cid: string): Promise<{ data: unknown; contentType: string | null }> {
  const pinata = getPinataClient();
  
  const response = await pinata.gateways.public.get(cid);
  return {
    data: response.data,
    contentType: response.contentType,
  };
}

/**
 * Check if a CID exists/is accessible on Pinata gateway
 */
export async function checkCIDExists(cid: string): Promise<boolean> {
  try {
    const pinata = getPinataClient();
    await pinata.gateways.public.get(cid);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate SHA-256 hash of file content (for document verification)
 */
export async function hashFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate SHA-256 hash of string
 */
export async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

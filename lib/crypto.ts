/**
 * Browser-based SHA-256 hashing for PIN security
 * Never send raw PINs; always hash client-side before transmission
 */

/**
 * Hash a PIN using browser's SubtleCrypto API
 * Returns base64-encoded SHA-256 hash
 */
export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  
  // Convert to base64
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashString = String.fromCharCode.apply(null, hashArray as unknown as number[]);
  return btoa(hashString);
}

/**
 * Generate a random 6-character alphanumeric recovery code
 */
export function generateRecoveryCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Verify PIN against hash (for recovery: stored PIN hashes)
 */
export async function verifyPin(pin: string, storedHash: string): Promise<boolean> {
  const pinHash = await hashPin(pin);
  return pinHash === storedHash;
}

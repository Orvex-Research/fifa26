// Simple obfuscated encryption/decryption helper to protect stream URLs from scrapers.
// The key is reconstructed dynamically to resist basic static string scanning.

const KEY_SECTIONS = ['sbs', 'stream', 'secure', '2026', 'v3'];

function getSecretKey(): string {
  return KEY_SECTIONS.join('_#_');
}

/**
 * Encrypts a stream URL (Server-side)
 */
export function encryptStreamUrl(url: string): string {
  const key = getSecretKey();
  let encrypted = '';
  
  for (let i = 0; i < url.length; i++) {
    const charCode = url.charCodeAt(i);
    const keyChar = key.charCodeAt(i % key.length);
    // XOR operation
    encrypted += String.fromCharCode(charCode ^ keyChar);
  }
  
  // Safe base64 conversion across server/client environments
  if (typeof window === 'undefined') {
    return Buffer.from(encrypted, 'binary').toString('base64');
  } else {
    // Browser fallback
    return btoa(encrypted);
  }
}

/**
 * Decrypts a stream URL (Client-side / Server-side)
 */
export function decryptStreamUrl(obfuscated: string): string {
  const key = getSecretKey();
  let decoded = '';
  
  if (typeof window === 'undefined') {
    decoded = Buffer.from(obfuscated, 'base64').toString('binary');
  } else {
    // Browser fallback
    decoded = atob(obfuscated);
  }
  
  let decrypted = '';
  for (let i = 0; i < decoded.length; i++) {
    const charCode = decoded.charCodeAt(i);
    const keyChar = key.charCodeAt(i % key.length);
    decrypted += String.fromCharCode(charCode ^ keyChar);
  }
  
  return decrypted;
}

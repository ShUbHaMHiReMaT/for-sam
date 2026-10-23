/**
 * Real cryptography via the platform's Web Crypto API (SubtleCrypto).
 * These are production-grade primitives provided by the browser/Node — we do
 * not implement SHA-256, HMAC or AES-GCM ourselves for these demos.
 */

import { toHex } from './aes'

function subtle(): SubtleCrypto {
  const s = globalThis.crypto?.subtle
  if (!s) throw new Error('Web Crypto is unavailable. Use a modern browser over HTTPS or localhost.')
  return s
}

const enc = new TextEncoder()

export async function sha256Hex(input: string | Uint8Array): Promise<string> {
  const data = typeof input === 'string' ? enc.encode(input) : input
  return toHex(new Uint8Array(await subtle().digest('SHA-256', data as BufferSource)))
}

export async function sha256Bytes(input: string | Uint8Array): Promise<Uint8Array> {
  const data = typeof input === 'string' ? enc.encode(input) : input
  return new Uint8Array(await subtle().digest('SHA-256', data as BufferSource))
}

export async function hmacSha256Hex(key: string | Uint8Array, message: string): Promise<string> {
  const k = typeof key === 'string' ? enc.encode(key) : key
  const ck = await subtle().importKey('raw', k as BufferSource, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return toHex(new Uint8Array(await subtle().sign('HMAC', ck, enc.encode(message))))
}

/** Count differing bits between two equal-length hex strings. */
export function bitDifference(hexA: string, hexB: string): number {
  let diff = 0
  for (let i = 0; i < Math.min(hexA.length, hexB.length); i += 2) {
    let x = parseInt(hexA.slice(i, i + 2), 16) ^ parseInt(hexB.slice(i, i + 2), 16)
    while (x) { diff += x & 1; x >>= 1 }
  }
  return diff
}

/** One AES block (no padding) via Web Crypto, using AES-CBC with a zero IV on a single block. */
export async function webCryptoAesBlock(block: number[], key: number[]): Promise<number[]> {
  const ck = await subtle().importKey('raw', new Uint8Array(key), { name: 'AES-CBC' }, false, ['encrypt'])
  const out = new Uint8Array(await subtle().encrypt({ name: 'AES-CBC', iv: new Uint8Array(16) }, ck, new Uint8Array(block)))
  // CBC with IV=0 on one block = raw AES of that block; the second block is padding.
  return Array.from(out.slice(0, 16))
}

export interface GcmResult { iv: Uint8Array; ciphertext: Uint8Array; key: CryptoKey }

export async function gcmGenerateKey(): Promise<CryptoKey> {
  return subtle().generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
}

export async function gcmEncrypt(key: CryptoKey, plaintext: string, aad = ''): Promise<{ iv: Uint8Array; ciphertext: Uint8Array }> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = await subtle().encrypt({ name: 'AES-GCM', iv, additionalData: enc.encode(aad), tagLength: 128 }, key, enc.encode(plaintext))
  return { iv, ciphertext: new Uint8Array(ct) }
}

/** Returns the plaintext, or throws if authentication fails (tampered data, wrong key/IV/AAD). */
export async function gcmDecrypt(key: CryptoKey, iv: Uint8Array, ciphertext: Uint8Array, aad = ''): Promise<string> {
  const pt = await subtle().decrypt({ name: 'AES-GCM', iv: iv as BufferSource, additionalData: enc.encode(aad), tagLength: 128 }, key, ciphertext as BufferSource)
  return new TextDecoder().decode(pt)
}

export async function exportRawKeyHex(key: CryptoKey): Promise<string> {
  return toHex(new Uint8Array(await subtle().exportKey('raw', key)))
}

/** Cryptographically secure random bytes from the platform CSPRNG. */
export function randomBytes(n: number): number[] {
  return Array.from(crypto.getRandomValues(new Uint8Array(n)))
}

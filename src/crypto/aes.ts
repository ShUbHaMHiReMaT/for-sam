/**
 * EDUCATIONAL AES (FIPS-197) — written for step-by-step tracing in the lab.
 *
 * ⚠ This module exists so students can SEE every intermediate state. It is
 * validated against the FIPS-197 Appendix B/C test vectors (see aes.test.ts)
 * and cross-checked in the browser against Web Crypto, but it is NOT
 * constant-time and must never be used to protect real data. Real encryption
 * in CIPHERVERSE (e.g. the AES-GCM demo) uses the browser's Web Crypto API.
 *
 * Byte layout follows FIPS-197: the 16 input bytes fill the 4×4 state
 * column by column, so state[row][col] = bytes[row + 4*col].
 */

export type AesVariant = 128 | 192 | 256
export type AesOp = 'Input' | 'AddRoundKey' | 'SubBytes' | 'ShiftRows' | 'MixColumns' | 'InvSubBytes' | 'InvShiftRows' | 'InvMixColumns' | 'Output'

export interface AesTraceStep {
  round: number
  op: AesOp
  state: number[] // 16 bytes, FIPS column-major order
  roundKey?: number[] // 16 bytes when op is AddRoundKey
  note: string
}

export const AES_PARAMS: Record<AesVariant, { Nk: number; Nr: number; keyBytes: number }> = {
  128: { Nk: 4, Nr: 10, keyBytes: 16 },
  192: { Nk: 6, Nr: 12, keyBytes: 24 },
  256: { Nk: 8, Nr: 14, keyBytes: 32 },
}

// ───────────── GF(2^8) arithmetic, modulus x^8 + x^4 + x^3 + x + 1 (0x11B) ─────────────

export function xtime(b: number): number {
  return ((b << 1) ^ (b & 0x80 ? 0x1b : 0)) & 0xff
}

export function gmul(a: number, b: number): number {
  let p = 0
  for (let i = 0; i < 8; i++) {
    if (b & 1) p ^= a
    a = xtime(a)
    b >>= 1
  }
  return p
}

function ginv(a: number): number {
  if (a === 0) return 0
  // a^254 = a^-1 in GF(2^8)
  let result = 1
  let base = a
  let e = 254
  while (e) {
    if (e & 1) result = gmul(result, base)
    base = gmul(base, base)
    e >>= 1
  }
  return result
}

/** The S-box is generated (not pasted): multiplicative inverse + affine transform. */
function buildSbox(): { sbox: number[]; inv: number[] } {
  const sbox = new Array<number>(256)
  const inv = new Array<number>(256)
  const rotl = (x: number, s: number) => ((x << s) | (x >> (8 - s))) & 0xff
  for (let i = 0; i < 256; i++) {
    const b = ginv(i)
    const s = b ^ rotl(b, 1) ^ rotl(b, 2) ^ rotl(b, 3) ^ rotl(b, 4) ^ 0x63
    sbox[i] = s
    inv[s] = i
  }
  return { sbox, inv }
}

export const { sbox: SBOX, inv: INV_SBOX } = buildSbox()

const RCON = [0x00, 0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36, 0x6c, 0xd8, 0xab, 0x4d]

// ───────────── Key schedule ─────────────

export interface KeyScheduleWord { i: number; word: number[]; note: string }

/** Expand the cipher key into 4·(Nr+1) 32-bit words, recording how each was made. */
export function expandKey(key: number[], variant: AesVariant): { words: number[][]; log: KeyScheduleWord[] } {
  const { Nk, Nr, keyBytes } = AES_PARAMS[variant]
  if (key.length !== keyBytes) throw new Error(`AES-${variant} needs a ${keyBytes}-byte key (got ${key.length}).`)
  const words: number[][] = []
  const log: KeyScheduleWord[] = []
  for (let i = 0; i < Nk; i++) {
    words.push(key.slice(4 * i, 4 * i + 4))
    log.push({ i, word: words[i], note: 'copied from the cipher key' })
  }
  for (let i = Nk; i < 4 * (Nr + 1); i++) {
    let temp = [...words[i - 1]]
    let note: string
    if (i % Nk === 0) {
      temp = [temp[1], temp[2], temp[3], temp[0]].map((b) => SBOX[b])
      temp[0] ^= RCON[i / Nk]
      note = `RotWord → SubWord → XOR Rcon[${i / Nk}]=${hex(RCON[i / Nk])}, then XOR w[${i - Nk}]`
    } else if (Nk > 6 && i % Nk === 4) {
      temp = temp.map((b) => SBOX[b])
      note = `SubWord (AES-256 extra step), then XOR w[${i - Nk}]`
    } else {
      note = `w[${i - 1}] XOR w[${i - Nk}]`
    }
    const w = temp.map((b, j) => b ^ words[i - Nk][j])
    words.push(w)
    log.push({ i, word: w, note })
  }
  return { words, log }
}

function roundKeyBytes(words: number[][], round: number): number[] {
  return words.slice(4 * round, 4 * round + 4).flat()
}

// ───────────── Round transformations (pure: return new arrays) ─────────────

export const subBytes = (s: number[]) => s.map((b) => SBOX[b])
export const invSubBytes = (s: number[]) => s.map((b) => INV_SBOX[b])
export const addRoundKey = (s: number[], k: number[]) => s.map((b, i) => b ^ k[i])

/** Row r is rotated left by r positions. */
export function shiftRows(s: number[]): number[] {
  const out = new Array<number>(16)
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) out[r + 4 * c] = s[r + 4 * ((c + r) % 4)]
  return out
}

export function invShiftRows(s: number[]): number[] {
  const out = new Array<number>(16)
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) out[r + 4 * ((c + r) % 4)] = s[r + 4 * c]
  return out
}

function mixColumn(col: number[], m: number[][]): number[] {
  return m.map((row) => row.reduce((acc, coef, j) => acc ^ gmul(coef, col[j]), 0))
}

const MIX = [[2, 3, 1, 1], [1, 2, 3, 1], [1, 1, 2, 3], [3, 1, 1, 2]]
const INV_MIX = [[14, 11, 13, 9], [9, 14, 11, 13], [13, 9, 14, 11], [11, 13, 9, 14]]

function mixWith(s: number[], m: number[][]): number[] {
  const out = new Array<number>(16)
  for (let c = 0; c < 4; c++) {
    const col = mixColumn(s.slice(4 * c, 4 * c + 4), m)
    for (let r = 0; r < 4; r++) out[r + 4 * c] = col[r]
  }
  return out
}

export const mixColumns = (s: number[]) => mixWith(s, MIX)
export const invMixColumns = (s: number[]) => mixWith(s, INV_MIX)

// ───────────── Cipher with full trace ─────────────

const NOTES: Record<AesOp, string> = {
  Input: 'The 16 plaintext bytes are loaded into the 4×4 state, column by column.',
  AddRoundKey: 'Each state byte is XORed with the matching round-key byte. This is the only step that uses the key.',
  SubBytes: 'Every byte is replaced through the S-box — a fixed nonlinear substitution (GF(2⁸) inverse + affine map).',
  ShiftRows: 'Row r is rotated left by r bytes, spreading each column across all four columns.',
  MixColumns: 'Each column is multiplied by a fixed matrix in GF(2⁸), so every output byte depends on all four input bytes.',
  InvSubBytes: 'Every byte is replaced through the inverse S-box.',
  InvShiftRows: 'Row r is rotated RIGHT by r bytes, undoing ShiftRows.',
  InvMixColumns: 'Each column is multiplied by the inverse matrix, undoing MixColumns.',
  Output: 'The final state, read column by column, is the ciphertext block.',
}

function check(block: number[], key: number[], variant: AesVariant) {
  if (block.length !== 16) throw new Error(`AES works on exactly 16-byte blocks (got ${block.length}).`)
  if (block.some((b) => !Number.isInteger(b) || b < 0 || b > 255)) throw new Error('Block bytes must be integers 0–255.')
  if (key.some((b) => !Number.isInteger(b) || b < 0 || b > 255)) throw new Error('Key bytes must be integers 0–255.')
  if (key.length !== AES_PARAMS[variant].keyBytes) throw new Error(`AES-${variant} needs a ${AES_PARAMS[variant].keyBytes}-byte key (got ${key.length}).`)
}

export function aesEncryptTrace(block: number[], key: number[], variant: AesVariant = 128): { output: number[]; trace: AesTraceStep[] } {
  check(block, key, variant)
  const { Nr } = AES_PARAMS[variant]
  const { words } = expandKey(key, variant)
  const trace: AesTraceStep[] = []
  const push = (round: number, op: AesOp, state: number[], roundKey?: number[]) =>
    trace.push({ round, op, state: [...state], roundKey, note: NOTES[op] })

  let s = [...block]
  push(0, 'Input', s)
  let rk = roundKeyBytes(words, 0)
  s = addRoundKey(s, rk); push(0, 'AddRoundKey', s, rk)
  for (let round = 1; round <= Nr; round++) {
    s = subBytes(s); push(round, 'SubBytes', s)
    s = shiftRows(s); push(round, 'ShiftRows', s)
    if (round !== Nr) { s = mixColumns(s); push(round, 'MixColumns', s) }
    rk = roundKeyBytes(words, round)
    s = addRoundKey(s, rk); push(round, 'AddRoundKey', s, rk)
  }
  push(Nr, 'Output', s)
  return { output: s, trace }
}

export function aesDecryptTrace(block: number[], key: number[], variant: AesVariant = 128): { output: number[]; trace: AesTraceStep[] } {
  check(block, key, variant)
  const { Nr } = AES_PARAMS[variant]
  const { words } = expandKey(key, variant)
  const trace: AesTraceStep[] = []
  const push = (round: number, op: AesOp, state: number[], roundKey?: number[]) =>
    trace.push({ round, op, state: [...state], roundKey, note: op === 'Input' ? 'The 16 ciphertext bytes are loaded into the state.' : op === 'Output' ? 'The final state is the recovered plaintext block.' : NOTES[op] })

  let s = [...block]
  push(Nr, 'Input', s)
  let rk = roundKeyBytes(words, Nr)
  s = addRoundKey(s, rk); push(Nr, 'AddRoundKey', s, rk)
  for (let round = Nr - 1; round >= 0; round--) {
    s = invShiftRows(s); push(round, 'InvShiftRows', s)
    s = invSubBytes(s); push(round, 'InvSubBytes', s)
    rk = roundKeyBytes(words, round)
    s = addRoundKey(s, rk); push(round, 'AddRoundKey', s, rk)
    if (round !== 0) { s = invMixColumns(s); push(round, 'InvMixColumns', s) }
  }
  push(0, 'Output', s)
  return { output: s, trace }
}

export const aesEncryptBlock = (block: number[], key: number[], variant: AesVariant = 128) => aesEncryptTrace(block, key, variant).output
export const aesDecryptBlock = (block: number[], key: number[], variant: AesVariant = 128) => aesDecryptTrace(block, key, variant).output

// ───────────── Educational modes of operation (synthetic data only) ─────────────

export function pkcs7Pad(data: number[]): number[] {
  const n = 16 - (data.length % 16)
  return [...data, ...new Array(n).fill(n)]
}

export function pkcs7Unpad(data: number[]): number[] {
  const n = data[data.length - 1]
  if (!n || n > 16 || data.length < n || data.slice(-n).some((b) => b !== n)) throw new Error('Invalid PKCS#7 padding.')
  return data.slice(0, -n)
}

function blocks(data: number[]): number[][] {
  const out: number[][] = []
  for (let i = 0; i < data.length; i += 16) out.push(data.slice(i, i + 16))
  return out
}

/** ECB: every block encrypted independently — identical blocks leak as identical ciphertext. */
export function ecbEncrypt(data: number[], key: number[]): number[] {
  if (data.length % 16) throw new Error('ECB demo expects a multiple of 16 bytes (pad first).')
  return blocks(data).flatMap((b) => aesEncryptBlock(b, key, 128))
}

/** CBC: each plaintext block is XORed with the previous ciphertext block (IV for the first). */
export function cbcEncrypt(data: number[], key: number[], iv: number[]): number[] {
  if (data.length % 16) throw new Error('CBC demo expects a multiple of 16 bytes (pad first).')
  if (iv.length !== 16) throw new Error('CBC needs a 16-byte IV.')
  let prev = iv
  const out: number[] = []
  for (const b of blocks(data)) {
    const c = aesEncryptBlock(b.map((x, i) => x ^ prev[i]), key, 128)
    out.push(...c)
    prev = c
  }
  return out
}

export function cbcDecrypt(data: number[], key: number[], iv: number[]): number[] {
  let prev = iv
  const out: number[] = []
  for (const b of blocks(data)) {
    const p = aesDecryptBlock(b, key, 128).map((x, i) => x ^ prev[i])
    out.push(...p)
    prev = b
  }
  return out
}

/** CTR: AES encrypts nonce‖counter to make a keystream, which is XORed with data. */
export function ctrKeystream(key: number[], nonce: number[], length: number): number[] {
  if (nonce.length !== 12) throw new Error('This CTR demo uses a 12-byte nonce + 4-byte counter.')
  const out: number[] = []
  for (let ctr = 0; out.length < length; ctr++) {
    const block = [...nonce, (ctr >>> 24) & 255, (ctr >>> 16) & 255, (ctr >>> 8) & 255, ctr & 255]
    out.push(...aesEncryptBlock(block, key, 128))
  }
  return out.slice(0, length)
}

export function ctrXor(data: number[], key: number[], nonce: number[]): number[] {
  const ks = ctrKeystream(key, nonce, data.length)
  return data.map((b, i) => b ^ ks[i])
}

// ───────────── Byte helpers ─────────────

export function hex(b: number): string {
  return b.toString(16).padStart(2, '0')
}

export function toHex(bytes: ArrayLike<number>): string {
  return Array.from(bytes, hex).join('')
}

/** Parse hex (spaces allowed). Throws a readable error on bad input. */
export function fromHex(s: string): number[] {
  const clean = s.replace(/\s+/g, '').toLowerCase()
  if (!/^[0-9a-f]*$/.test(clean)) throw new Error('Hex may only contain 0–9 and a–f.')
  if (clean.length % 2) throw new Error('Hex must have an even number of digits (two per byte).')
  const out: number[] = []
  for (let i = 0; i < clean.length; i += 2) out.push(parseInt(clean.slice(i, i + 2), 16))
  return out
}

export function utf8Bytes(s: string): number[] {
  return Array.from(new TextEncoder().encode(s))
}

export function bytesToUtf8(b: number[]): string {
  return new TextDecoder().decode(new Uint8Array(b))
}

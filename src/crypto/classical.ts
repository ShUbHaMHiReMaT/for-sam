/**
 * Classical (historical) ciphers. These are implemented exactly for teaching.
 * None of them is secure for modern confidential communication.
 */

export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

const mod = (n: number, m: number) => ((n % m) + m) % m
const isLetter = (ch: string) => /[A-Za-z]/.test(ch)

/** Keep only A–Z, uppercase. */
export function lettersOnly(text: string): string {
  return text.toUpperCase().replace(/[^A-Z]/g, '')
}

/** Normalise an answer for comparison: letters only, uppercase. */
export function normalize(text: string): string {
  return lettersOnly(text)
}

// ─────────────────────────── Caesar ───────────────────────────

/** Shift each letter by `shift` positions; preserves case and non-letters. */
export function caesarShift(text: string, shift: number): string {
  const s = mod(Math.trunc(shift), 26)
  let out = ''
  for (const ch of text) {
    if (!isLetter(ch)) { out += ch; continue }
    const base = ch === ch.toUpperCase() ? 65 : 97
    out += String.fromCharCode(base + mod(ch.charCodeAt(0) - base + s, 26))
  }
  return out
}

export const caesarEncrypt = (plain: string, shift: number) => caesarShift(plain, shift)
export const caesarDecrypt = (cipher: string, shift: number) => caesarShift(cipher, -shift)

/** Every possible Caesar decryption (the entire key space is only 26 keys). */
export function caesarBruteForce(cipher: string): { shift: number; text: string; score: number }[] {
  return Array.from({ length: 26 }, (_, shift) => {
    const text = caesarDecrypt(cipher, shift)
    return { shift, text, score: englishScore(text) }
  })
}

// ─────────────────────── Frequency analysis ───────────────────────

/** Relative frequency of letters in typical English text (percent). */
export const ENGLISH_FREQ: Record<string, number> = {
  A: 8.17, B: 1.49, C: 2.78, D: 4.25, E: 12.7, F: 2.23, G: 2.02, H: 6.09, I: 6.97,
  J: 0.15, K: 0.77, L: 4.03, M: 2.41, N: 6.75, O: 7.51, P: 1.93, Q: 0.1, R: 5.99,
  S: 6.33, T: 9.06, U: 2.76, V: 0.98, W: 2.36, X: 0.15, Y: 1.97, Z: 0.07,
}

export function letterCounts(text: string): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const l of ALPHABET) counts[l] = 0
  for (const ch of lettersOnly(text)) counts[ch]++
  return counts
}

/** Percentage frequency of each letter. Returns all zeros for empty input. */
export function letterFrequencies(text: string): Record<string, number> {
  const counts = letterCounts(text)
  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  const freq: Record<string, number> = {}
  for (const l of ALPHABET) freq[l] = total ? (counts[l] / total) * 100 : 0
  return freq
}

/**
 * Chi-squared distance between the text's letter distribution and English.
 * Lower is "more English-like". Returns Infinity for text with no letters.
 */
export function chiSquared(text: string): number {
  const counts = letterCounts(text)
  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  if (!total) return Infinity
  let chi = 0
  for (const l of ALPHABET) {
    const expected = (ENGLISH_FREQ[l] / 100) * total
    chi += (counts[l] - expected) ** 2 / expected
  }
  return chi
}

/** Higher = more English-like. Convenience inverse of chi-squared. */
export function englishScore(text: string): number {
  const chi = chiSquared(text)
  return Number.isFinite(chi) ? 1 / (1 + chi) : 0
}

/** Index of coincidence: ~0.066 for English, ~0.038 for uniformly random letters. */
export function indexOfCoincidence(text: string): number {
  const letters = lettersOnly(text)
  const n = letters.length
  if (n < 2) return 0
  const counts = letterCounts(letters)
  let sum = 0
  for (const l of ALPHABET) sum += counts[l] * (counts[l] - 1)
  return sum / (n * (n - 1))
}

// ─────────────────────────── Vigenère ───────────────────────────

function vigenere(text: string, key: string, dir: 1 | -1): string {
  const k = lettersOnly(key)
  if (!k.length) throw new Error('The Vigenère key must contain at least one letter.')
  let out = ''
  let j = 0
  for (const ch of text) {
    if (!isLetter(ch)) { out += ch; continue }
    const base = ch === ch.toUpperCase() ? 65 : 97
    const shift = k.charCodeAt(j % k.length) - 65
    out += String.fromCharCode(base + mod(ch.charCodeAt(0) - base + dir * shift, 26))
    j++
  }
  return out
}

export const vigenereEncrypt = (plain: string, key: string) => vigenere(plain, key, 1)
export const vigenereDecrypt = (cipher: string, key: string) => vigenere(cipher, key, -1)

/** Align the repeating key under the letters of a message (non-letters get a blank). */
export function vigenereAlignment(text: string, key: string): { ch: string; k: string; shift: number }[] {
  const k = lettersOnly(key)
  let j = 0
  return [...text].map((ch) => {
    if (!isLetter(ch) || !k.length) return { ch, k: '', shift: 0 }
    const kc = k[j % k.length]
    j++
    return { ch, k: kc, shift: kc.charCodeAt(0) - 65 }
  })
}

/**
 * Kasiski examination: find repeated substrings (length >= minLen) in the
 * letters-only ciphertext and the distances between their occurrences.
 */
export function kasiski(cipher: string, minLen = 3): { seq: string; positions: number[]; distances: number[] }[] {
  const s = lettersOnly(cipher)
  const seen = new Map<string, number[]>()
  for (let i = 0; i + minLen <= s.length; i++) {
    const seq = s.slice(i, i + minLen)
    const arr = seen.get(seq) ?? []
    arr.push(i)
    seen.set(seq, arr)
  }
  const result: { seq: string; positions: number[]; distances: number[] }[] = []
  for (const [seq, positions] of seen) {
    if (positions.length < 2) continue
    const distances = positions.slice(1).map((p, i) => p - positions[i])
    result.push({ seq, positions, distances })
  }
  return result.sort((a, b) => b.positions.length - a.positions.length)
}

/**
 * Estimate the Vigenère key length by average index of coincidence of the
 * columns for each candidate length. Returns candidates sorted best first.
 */
export function estimateKeyLength(cipher: string, maxLen = 12): { length: number; ic: number }[] {
  const s = lettersOnly(cipher)
  const out: { length: number; ic: number }[] = []
  for (let L = 1; L <= Math.min(maxLen, Math.max(1, Math.floor(s.length / 2))); L++) {
    let total = 0
    for (let c = 0; c < L; c++) {
      let col = ''
      for (let i = c; i < s.length; i += L) col += s[i]
      total += indexOfCoincidence(col)
    }
    out.push({ length: L, ic: total / L })
  }
  return out.sort((a, b) => Math.abs(0.066 - a.ic) - Math.abs(0.066 - b.ic))
}

/** Given a key length, recover the most likely key via per-column chi-squared. */
export function crackVigenereKey(cipher: string, keyLength: number): string {
  const s = lettersOnly(cipher)
  let key = ''
  for (let c = 0; c < keyLength; c++) {
    let col = ''
    for (let i = c; i < s.length; i += keyLength) col += s[i]
    let best = 0
    let bestChi = Infinity
    for (let shift = 0; shift < 26; shift++) {
      const chi = chiSquared(caesarDecrypt(col, shift))
      if (chi < bestChi) { bestChi = chi; best = shift }
    }
    key += ALPHABET[best]
  }
  return key
}

// ─────────────────────── Columnar transposition ───────────────────────

/** Column read order for a keyword (stable for repeated letters). */
export function columnOrder(key: string): number[] {
  const k = lettersOnly(key)
  if (!k.length) throw new Error('The transposition key must contain at least one letter.')
  return [...k]
    .map((ch, i) => ({ ch, i }))
    .sort((a, b) => (a.ch === b.ch ? a.i - b.i : a.ch < b.ch ? -1 : 1))
    .map((x) => x.i)
}

/** Columnar transposition on letters-only text, padding the grid with X. */
export function transpositionEncrypt(plain: string, key: string): string {
  const order = columnOrder(key)
  const cols = order.length
  let p = lettersOnly(plain)
  while (p.length % cols) p += 'X'
  let out = ''
  for (const c of order) for (let r = c; r < p.length; r += cols) out += p[r]
  return out
}

export function transpositionDecrypt(cipher: string, key: string): string {
  const order = columnOrder(key)
  const cols = order.length
  const c = lettersOnly(cipher)
  if (c.length % cols) throw new Error(`Ciphertext length must be a multiple of the key length (${cols}).`)
  const rows = c.length / cols
  const grid: string[] = new Array(c.length)
  let idx = 0
  for (const col of order) for (let r = 0; r < rows; r++) grid[r * cols + col] = c[idx++]
  return grid.join('')
}

/** Build the transposition grid (rows of letters) for visualisation. */
export function transpositionGrid(plain: string, key: string): string[][] {
  const cols = lettersOnly(key).length
  let p = lettersOnly(plain)
  while (cols && p.length % cols) p += 'X'
  const rows: string[][] = []
  for (let i = 0; i < p.length; i += cols) rows.push([...p.slice(i, i + cols)])
  return rows
}

// ───────────────────── Monoalphabetic substitution ─────────────────────

/** Build a keyword-mixed substitution alphabet, e.g. "ZEBRAS" → ZEBRASCDFGHIJ... */
export function keywordAlphabet(keyword: string): string {
  const seen = new Set<string>()
  let out = ''
  for (const ch of lettersOnly(keyword) + ALPHABET) {
    if (!seen.has(ch)) { seen.add(ch); out += ch }
  }
  return out
}

/** Encrypt with a substitution alphabet: plain A→cipherAlphabet[0], etc. */
export function substitutionEncrypt(plain: string, cipherAlphabet: string): string {
  if (cipherAlphabet.length !== 26 || new Set(cipherAlphabet).size !== 26) {
    throw new Error('A substitution alphabet must contain each of the 26 letters exactly once.')
  }
  return [...plain].map((ch) => {
    if (!isLetter(ch)) return ch
    const up = ch.toUpperCase()
    const c = cipherAlphabet[up.charCodeAt(0) - 65]
    return ch === up ? c : c.toLowerCase()
  }).join('')
}

export function substitutionDecrypt(cipher: string, cipherAlphabet: string): string {
  if (cipherAlphabet.length !== 26 || new Set(cipherAlphabet).size !== 26) {
    throw new Error('A substitution alphabet must contain each of the 26 letters exactly once.')
  }
  return [...cipher].map((ch) => {
    if (!isLetter(ch)) return ch
    const up = ch.toUpperCase()
    const p = ALPHABET[cipherAlphabet.indexOf(up)]
    return ch === up ? p : p.toLowerCase()
  }).join('')
}

/** Apply a partial (player-guessed) mapping cipher→plain; unknown letters become '·'. */
export function applyPartialMapping(cipher: string, mapping: Record<string, string>): string {
  return [...cipher].map((ch) => {
    if (!isLetter(ch)) return ch
    return mapping[ch.toUpperCase()] ?? '·'
  }).join('')
}

/** Atbash: A↔Z, B↔Y … (a fixed substitution with no key at all). */
export function atbash(text: string): string {
  return substitutionEncrypt(text, [...ALPHABET].reverse().join(''))
}

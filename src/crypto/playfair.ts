/**
 * Playfair cipher (Wheatstone, 1854). Encrypts PAIRS of letters (digraphs)
 * using a 5×5 key square.
 *
 * Conventions used here (historical implementations differ — we state ours):
 *  • Alphabet: 25 letters. Default merges J into I ("IJ"). Alternative: omit Q ("noQ").
 *  • Preparation: letters only, uppercase. When a digraph would contain the same
 *    letter twice, insert a filler X between them (Q if the letter itself is X).
 *  • If the prepared text has odd length, pad the end with X (Q if the last letter is X).
 *  • Same row → each letter replaced by the letter to its RIGHT (wrapping).
 *    Same column → each letter replaced by the letter BELOW (wrapping).
 *    Rectangle → each letter replaced by the letter in its own row but in the
 *    other letter's column.
 *  • Decryption inverts the shifts (left / up). Fillers cannot be removed with
 *    certainty — a human reader removes them using context.
 */

export type PlayfairConvention = 'IJ' | 'noQ'
export type PlayfairRule = 'row' | 'column' | 'rectangle'

export interface Pos { r: number; c: number }

export interface PlayfairStep {
  input: string // the digraph in
  output: string // the digraph out
  rule: PlayfairRule
  from: [Pos, Pos]
  to: [Pos, Pos]
}

export interface PreparedText {
  digraphs: string[]
  /** indices (into the joined digraph string) where a filler was inserted */
  fillers: number[]
}

const BASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

function alphabetFor(conv: PlayfairConvention): string {
  return conv === 'IJ' ? BASE.replace('J', '') : BASE.replace('Q', '')
}

/** Map raw text into the 25-letter alphabet for the chosen convention. */
export function cleanForPlayfair(text: string, conv: PlayfairConvention = 'IJ'): string {
  const letters = text.toUpperCase().replace(/[^A-Z]/g, '')
  return conv === 'IJ' ? letters.replace(/J/g, 'I') : letters.replace(/Q/g, '')
}

/** Build the 5×5 key square from a keyword. */
export function buildSquare(keyword: string, conv: PlayfairConvention = 'IJ'): string[][] {
  const seen = new Set<string>()
  let seq = ''
  for (const ch of cleanForPlayfair(keyword, conv) + alphabetFor(conv)) {
    if (!seen.has(ch)) { seen.add(ch); seq += ch }
  }
  const square: string[][] = []
  for (let r = 0; r < 5; r++) square.push([...seq.slice(r * 5, r * 5 + 5)])
  return square
}

function fillerFor(letter: string, conv: PlayfairConvention): string {
  if (letter !== 'X') return 'X'
  return conv === 'IJ' ? 'Q' : 'Z'
}

/** Split plaintext into digraphs with fillers, recording where fillers went. */
export function preparePlaintext(text: string, conv: PlayfairConvention = 'IJ'): PreparedText {
  const s = cleanForPlayfair(text, conv)
  const digraphs: string[] = []
  const fillers: number[] = []
  let i = 0
  let outLen = 0
  while (i < s.length) {
    const a = s[i]
    const b = s[i + 1]
    if (b === undefined) {
      const f = fillerFor(a, conv)
      digraphs.push(a + f)
      fillers.push(outLen + 1)
      i += 1
    } else if (a === b) {
      const f = fillerFor(a, conv)
      digraphs.push(a + f)
      fillers.push(outLen + 1)
      i += 1
    } else {
      digraphs.push(a + b)
      i += 2
    }
    outLen += 2
  }
  return { digraphs, fillers }
}

export function locate(square: string[][]): Map<string, Pos> {
  const m = new Map<string, Pos>()
  square.forEach((row, r) => row.forEach((ch, c) => m.set(ch, { r, c })))
  return m
}

function transformPair(pair: string, square: string[][], where: Map<string, Pos>, dir: 1 | -1): PlayfairStep {
  const pa = where.get(pair[0])
  const pb = where.get(pair[1])
  if (!pa || !pb) throw new Error(`Letter not in key square: "${pair}"`)
  if (pair[0] === pair[1]) throw new Error(`Invalid digraph "${pair}": Playfair digraphs cannot repeat a letter.`)
  const w = (n: number) => (n + 5) % 5
  let ta: Pos, tb: Pos, rule: PlayfairRule
  if (pa.r === pb.r) {
    rule = 'row'
    ta = { r: pa.r, c: w(pa.c + dir) }
    tb = { r: pb.r, c: w(pb.c + dir) }
  } else if (pa.c === pb.c) {
    rule = 'column'
    ta = { r: w(pa.r + dir), c: pa.c }
    tb = { r: w(pb.r + dir), c: pb.c }
  } else {
    rule = 'rectangle'
    ta = { r: pa.r, c: pb.c }
    tb = { r: pb.r, c: pa.c }
  }
  return {
    input: pair,
    output: square[ta.r][ta.c] + square[tb.r][tb.c],
    rule,
    from: [pa, pb],
    to: [ta, tb],
  }
}

export function encryptSteps(plaintext: string, keyword: string, conv: PlayfairConvention = 'IJ'): PlayfairStep[] {
  const square = buildSquare(keyword, conv)
  const where = locate(square)
  return preparePlaintext(plaintext, conv).digraphs.map((d) => transformPair(d, square, where, 1))
}

export function playfairEncrypt(plaintext: string, keyword: string, conv: PlayfairConvention = 'IJ'): string {
  return encryptSteps(plaintext, keyword, conv).map((s) => s.output).join('')
}

/** Validate ciphertext before decryption; returns an error message or null. */
export function validateCiphertext(ciphertext: string, conv: PlayfairConvention = 'IJ'): string | null {
  const raw = ciphertext.toUpperCase().replace(/[^A-Z]/g, '')
  if (!raw.length) return 'Enter some ciphertext letters.'
  if (conv === 'IJ' && raw.includes('J')) return 'This square merges J into I, so valid ciphertext never contains J.'
  if (conv === 'noQ' && raw.includes('Q')) return 'This square omits Q, so valid ciphertext never contains Q.'
  if (raw.length % 2) return 'Playfair ciphertext always has an even number of letters (it is made of pairs).'
  for (let i = 0; i < raw.length; i += 2) {
    if (raw[i] === raw[i + 1]) return `Pair "${raw.slice(i, i + 2)}" repeats a letter — Playfair never produces that.`
  }
  return null
}

export function decryptSteps(ciphertext: string, keyword: string, conv: PlayfairConvention = 'IJ'): PlayfairStep[] {
  const err = validateCiphertext(ciphertext, conv)
  if (err) throw new Error(err)
  const square = buildSquare(keyword, conv)
  const where = locate(square)
  const c = ciphertext.toUpperCase().replace(/[^A-Z]/g, '')
  const steps: PlayfairStep[] = []
  for (let i = 0; i < c.length; i += 2) steps.push(transformPair(c.slice(i, i + 2), square, where, -1))
  return steps
}

export function playfairDecrypt(ciphertext: string, keyword: string, conv: PlayfairConvention = 'IJ'): string {
  return decryptSteps(ciphertext, keyword, conv).map((s) => s.output).join('')
}

/**
 * Heuristic removal of fillers: drops an X (or Q) sitting between two identical
 * letters, and a trailing filler. This is a GUESS — real words like "TAXI"
 * could be damaged, which is exactly why humans read Playfair output in context.
 */
export function stripFillers(decrypted: string): string {
  let s = decrypted.replace(/(.)[XQ](?=\1)/g, '$1')
  if (s.endsWith('X') || s.endsWith('Q')) s = s.slice(0, -1)
  return s
}

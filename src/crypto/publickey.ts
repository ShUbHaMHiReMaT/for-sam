/**
 * TOY public-key mathematics for learning (RSA, Diffie–Hellman).
 *
 * ⚠ Deliberately tiny numbers so every step is visible. Toy RSA here is
 * "textbook RSA": no padding, deterministic, malleable and trivially
 * factorable. Real RSA uses 2048+ bit moduli and padding such as OAEP (for
 * encryption) or PSS (for signatures), usually inside a hybrid scheme.
 */

export function gcd(a: bigint, b: bigint): bigint {
  a = a < 0n ? -a : a
  b = b < 0n ? -b : b
  while (b) [a, b] = [b, a % b]
  return a
}

/** Extended Euclid: returns [g, x, y] with a·x + b·y = g. */
export function egcd(a: bigint, b: bigint): [bigint, bigint, bigint] {
  let [oldR, r] = [a, b]
  let [oldS, s] = [1n, 0n]
  let [oldT, t] = [0n, 1n]
  while (r !== 0n) {
    const q = oldR / r
    ;[oldR, r] = [r, oldR - q * r]
    ;[oldS, s] = [s, oldS - q * s]
    ;[oldT, t] = [t, oldT - q * t]
  }
  return [oldR, oldS, oldT]
}

export function modInverse(a: bigint, m: bigint): bigint {
  const [g, x] = egcd(((a % m) + m) % m, m)
  if (g !== 1n) throw new Error(`${a} has no inverse modulo ${m} (gcd = ${g}).`)
  return ((x % m) + m) % m
}

export interface ModPowStep { bit: 0 | 1; squared: bigint; result: bigint }

/** Square-and-multiply modular exponentiation, recording each step for visualisation. */
export function modPowSteps(base: bigint, exp: bigint, m: bigint): { value: bigint; steps: ModPowStep[] } {
  if (m === 1n) return { value: 0n, steps: [] }
  if (exp < 0n) throw new Error('Negative exponents are not supported.')
  const bits = exp.toString(2)
  let result = 1n
  const b = ((base % m) + m) % m
  const steps: ModPowStep[] = []
  for (const ch of bits) {
    result = (result * result) % m
    const squared = result
    if (ch === '1') result = (result * b) % m
    steps.push({ bit: ch === '1' ? 1 : 0, squared, result })
  }
  return { value: result, steps }
}

export function modPow(base: bigint, exp: bigint, m: bigint): bigint {
  return modPowSteps(base, exp, m).value
}

export function isPrime(n: bigint): boolean {
  if (n < 2n) return false
  if (n % 2n === 0n) return n === 2n
  for (let d = 3n; d * d <= n; d += 2n) if (n % d === 0n) return false
  return true
}

/** Small primes suitable for hand-checkable demos. */
export const TOY_PRIMES: number[] = (() => {
  const out: number[] = []
  for (let n = 11; n < 400; n++) if (isPrime(BigInt(n))) out.push(n)
  return out
})()

export interface RsaKeyPair {
  p: bigint; q: bigint; n: bigint; phi: bigint; e: bigint; d: bigint
}

/** Build a toy RSA key pair. Throws with an explanatory message on invalid parameters. */
export function rsaKeygen(p: bigint, q: bigint, e: bigint = 65537n): RsaKeyPair {
  if (!isPrime(p) || !isPrime(q)) throw new Error('Both p and q must be prime.')
  if (p === q) throw new Error('p and q must be different primes (if p = q, n is a perfect square and trivially factored).')
  const n = p * q
  const phi = (p - 1n) * (q - 1n)
  if (e <= 1n || e >= phi) throw new Error(`e must satisfy 1 < e < φ(n) = ${phi}.`)
  if (gcd(e, phi) !== 1n) throw new Error(`e = ${e} shares a factor with φ(n) = ${phi}; choose another e.`)
  const d = modInverse(e, phi)
  return { p, q, n, phi, e, d }
}

/** Pick the smallest common public exponent that works for these primes. */
export function suggestE(phi: bigint): bigint {
  for (const e of [65537n, 17n, 7n, 5n, 3n]) if (e < phi && gcd(e, phi) === 1n) return e
  for (let e = 3n; e < phi; e += 2n) if (gcd(e, phi) === 1n) return e
  throw new Error('No valid e found.')
}

export function rsaEncrypt(m: bigint, key: { e: bigint; n: bigint }): bigint {
  if (m < 0n || m >= key.n) throw new Error(`The message number must satisfy 0 ≤ m < n (${key.n}).`)
  return modPow(m, key.e, key.n)
}

export function rsaDecrypt(c: bigint, key: { d: bigint; n: bigint }): bigint {
  if (c < 0n || c >= key.n) throw new Error(`The ciphertext must satisfy 0 ≤ c < n (${key.n}).`)
  return modPow(c, key.d, key.n)
}

/** Textbook "signature": s = m^d mod n. Verification: s^e mod n === m. (No hashing/padding — toy only.) */
export const rsaSignToy = (m: bigint, key: { d: bigint; n: bigint }) => modPow(m, key.d, key.n)
export const rsaVerifyToy = (m: bigint, s: bigint, key: { e: bigint; n: bigint }) => modPow(s, key.e, key.n) === m

/** Trial-division factoring — instant for toy moduli, hopeless for 2048-bit ones. */
export function factorToy(n: bigint): { p: bigint; q: bigint; tries: number } | null {
  let tries = 0
  if (n % 2n === 0n) return { p: 2n, q: n / 2n, tries: 1 }
  for (let d = 3n; d * d <= n; d += 2n) {
    tries++
    if (n % d === 0n) return { p: d, q: n / d, tries }
  }
  return null
}

// ───────────── Diffie–Hellman (finite field, toy) ─────────────

export interface DhExchange {
  p: bigint; g: bigint
  a: bigint; b: bigint
  A: bigint; B: bigint
  sharedAlice: bigint; sharedBob: bigint
}

export function dhExchange(p: bigint, g: bigint, a: bigint, b: bigint): DhExchange {
  if (!isPrime(p)) throw new Error('p must be prime.')
  if (g <= 1n || g >= p - 1n) throw new Error('g must satisfy 1 < g < p − 1.')
  if (a < 2n || b < 2n || a >= p - 1n || b >= p - 1n) throw new Error('Private values must satisfy 2 ≤ x < p − 1.')
  const A = modPow(g, a, p)
  const B = modPow(g, b, p)
  return { p, g, a, b, A, B, sharedAlice: modPow(B, a, p), sharedBob: modPow(A, b, p) }
}

/**
 * Unauthenticated DH man-in-the-middle: Mallory swaps in her own public value
 * with each side, ending up with one shared key per victim.
 */
export function dhMitm(p: bigint, g: bigint, a: bigint, b: bigint, m: bigint) {
  const A = modPow(g, a, p)
  const B = modPow(g, b, p)
  const M = modPow(g, m, p)
  return {
    A, B, M,
    aliceKey: modPow(M, a, p), // Alice thinks she shares this with Bob
    bobKey: modPow(M, b, p), // Bob thinks he shares this with Alice
    malloryWithAlice: modPow(A, m, p),
    malloryWithBob: modPow(B, m, p),
  }
}

/** Brute-force a toy discrete log: find x with g^x ≡ y (mod p). */
export function discreteLogToy(g: bigint, y: bigint, p: bigint): { x: bigint; tries: number } | null {
  let v = 1n
  for (let x = 0n; x < p; x++) {
    if (v === y) return { x, tries: Number(x) + 1 }
    v = (v * g) % p
  }
  return null
}

// ───────────── Text ↔ number (toy encoding) ─────────────

/** Encode a short string as a number: A=01 … Z=26 per two decimal digits. */
export function lettersToNumber(s: string): bigint {
  const l = s.toUpperCase().replace(/[^A-Z]/g, '')
  if (!l) throw new Error('Enter at least one letter.')
  return BigInt([...l].map((c) => String(c.charCodeAt(0) - 64).padStart(2, '0')).join(''))
}

export function numberToLetters(n: bigint): string {
  let s = n.toString()
  if (s.length % 2) s = '0' + s
  let out = ''
  for (let i = 0; i < s.length; i += 2) {
    const v = parseInt(s.slice(i, i + 2), 10)
    out += v >= 1 && v <= 26 ? String.fromCharCode(64 + v) : '?'
  }
  return out
}

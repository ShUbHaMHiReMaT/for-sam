import { describe, expect, it } from 'vitest'
import {
  caesarDecrypt, caesarEncrypt, caesarBruteForce, vigenereEncrypt, vigenereDecrypt,
  transpositionEncrypt, transpositionDecrypt, keywordAlphabet, substitutionEncrypt,
  substitutionDecrypt, indexOfCoincidence, kasiski, crackVigenereKey, estimateKeyLength, atbash,
} from './classical'
import {
  buildSquare, playfairEncrypt, playfairDecrypt, preparePlaintext, encryptSteps,
  validateCiphertext, stripFillers,
} from './playfair'
import {
  aesEncryptBlock, aesDecryptBlock, aesEncryptTrace, expandKey, fromHex, toHex, SBOX, INV_SBOX,
  mixColumns, invMixColumns, shiftRows, invShiftRows, gmul, pkcs7Pad, pkcs7Unpad, cbcEncrypt,
  cbcDecrypt, ctrXor, ecbEncrypt,
} from './aes'
import {
  rsaKeygen, rsaEncrypt, rsaDecrypt, modPow, modInverse, isPrime, factorToy, dhExchange, dhMitm,
  discreteLogToy, lettersToNumber, numberToLetters, rsaSignToy, rsaVerifyToy, suggestE,
} from './publickey'
import { sha256Hex, hmacSha256Hex, bitDifference, webCryptoAesBlock, gcmGenerateKey, gcmEncrypt, gcmDecrypt } from './webcrypto'
import { humanDuration, log10BruteForceSeconds } from './keyspace'

describe('Caesar', () => {
  it('encrypts the classic example with shift 3', () => {
    expect(caesarEncrypt('Attack at dawn!', 3)).toBe('Dwwdfn dw gdzq!')
  })
  it('round-trips for every shift including negatives and >26', () => {
    for (const s of [-30, -1, 0, 1, 13, 25, 26, 52, 99]) {
      expect(caesarDecrypt(caesarEncrypt('Hello, World', s), s)).toBe('Hello, World')
    }
  })
  it('brute force ranks the true plaintext first for English text', () => {
    const c = caesarEncrypt('THE GUARDIANS PROTECTED EVERY MEMORY AND EVERY PROMISE', 11)
    const best = [...caesarBruteForce(c)].sort((a, b) => b.score - a.score)[0]
    expect(best.shift).toBe(11)
  })
})

describe('Vigenère', () => {
  it('matches the textbook example ATTACKATDAWN / LEMON', () => {
    expect(vigenereEncrypt('ATTACKATDAWN', 'LEMON')).toBe('LXFOPVEFRNHR')
    expect(vigenereDecrypt('LXFOPVEFRNHR', 'LEMON')).toBe('ATTACKATDAWN')
  })
  it('skips non-letters without consuming key letters', () => {
    expect(vigenereEncrypt('at tack', 'lemon')).toBe('lx fopv')
  })
  it('rejects an empty key', () => {
    expect(() => vigenereEncrypt('abc', '123')).toThrow()
  })
  it('recovers a key from long ciphertext via IC + chi-squared', () => {
    const plain = 'THEREWASASECRETBEFORETHEFIRSTKINGDOMWASBORNNOTASECRETTHATCOULDBESPOKENBUTONETHATCOULDONLYBEUNDERSTOODBYTHOSEWHOKNEWTHEKEYFORCENTURIESTHECIPHERGUARDIANSPROTECTEDEVERYMEMORYEVERYPROMISEANDEVERYIDENTITYUNTILSOMEONEDISCOVEREDTHATTHESTRONGESTWALLWASONLYASPOWERFULASTHESECRETTHATPROTECTEDIT'
    const c = vigenereEncrypt(plain, 'ECHO')
    const len = estimateKeyLength(c, 8)[0].length
    expect(len % 4).toBe(0)
    expect(crackVigenereKey(c, 4)).toBe('ECHO')
    expect(kasiski(c).length).toBeGreaterThan(0)
  })
})

describe('Transposition & substitution', () => {
  it('columnar transposition round-trips', () => {
    const c = transpositionEncrypt('WE ARE DISCOVERED FLEE AT ONCE', 'ZEBRAS')
    expect(c).toBe('EVLNXACDTXESEAXROFOXDEECXWIREE')
    expect(transpositionDecrypt(c, 'ZEBRAS')).toBe('WEAREDISCOVEREDFLEEATONCEXXXXX')
  })
  it('keyword alphabet and substitution', () => {
    const alpha = keywordAlphabet('ZEBRAS')
    expect(alpha).toBe('ZEBRASCDFGHIJKLMNOPQTUVWXY')
    const c = substitutionEncrypt('Flee at once', alpha)
    expect(c).toBe('Siaa zq lkba')
    expect(substitutionDecrypt(c, alpha)).toBe('Flee at once')
    expect(() => substitutionEncrypt('x', 'ABC')).toThrow()
  })
  it('atbash is its own inverse', () => {
    expect(atbash('Hello')).toBe('Svool')
    expect(atbash(atbash('Hello'))).toBe('Hello')
  })
  it('index of coincidence distinguishes English from random-ish text', () => {
    const english = 'ITWASTHEBESTOFTIMESITWASTHEWORSTOFTIMESITWASTHEAGEOFWISDOMITWASTHEAGEOFFOOLISHNESS'
    expect(indexOfCoincidence(english)).toBeGreaterThan(0.055)
    expect(indexOfCoincidence('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.repeat(3))).toBeLessThan(0.03)
  })
})

describe('Playfair', () => {
  it('builds the standard key square for PLAYFAIR EXAMPLE', () => {
    expect(buildSquare('playfair example').map((r) => r.join(''))).toEqual(['PLAYF', 'IREXM', 'BCDGH', 'KNOQS', 'TUVWZ'])
  })
  it('encrypts the well-known example (Wikipedia / Wheatstone convention)', () => {
    expect(playfairEncrypt('Hide the gold in the tree stump', 'playfair example')).toBe('BMODZBXDNABEKUDMUIXMMOUVIF')
  })
  it('inserts X between doubled letters and pads odd length', () => {
    expect(preparePlaintext('TREE').digraphs).toEqual(['TR', 'EX', 'EX'])
    expect(preparePlaintext('BALLOON').digraphs).toEqual(['BA', 'LX', 'LO', 'ON'])
    expect(preparePlaintext('XXA').digraphs).toEqual(['XQ', 'XA'])
  })
  it('labels the three rules correctly', () => {
    const steps = encryptSteps('HIDETHEGOLD', 'playfair example')
    expect(steps[0].rule).toBe('rectangle') // HI
    const rowStep = encryptSteps('PL', 'playfair example')[0]
    expect(rowStep).toMatchObject({ rule: 'row', output: 'LA' })
    const colStep = encryptSteps('PI', 'playfair example')[0]
    expect(colStep).toMatchObject({ rule: 'column', output: 'IB' })
    expect(encryptSteps('FA', 'playfair example')[0].output).toBe('PY') // F wraps to P; A→Y
  })
  it('decrypts back to the prepared plaintext', () => {
    const d = playfairDecrypt('BMODZBXDNABEKUDMUIXMMOUVIF', 'playfair example')
    expect(d).toBe('HIDETHEGOLDINTHETREXESTUMP')
    expect(stripFillers(d)).toBe('HIDETHEGOLDINTHETREESTUMP')
  })
  it('supports the omit-Q convention', () => {
    const c = playfairEncrypt('JUMP QUICKLY', 'KEYWORD', 'noQ')
    expect(playfairDecrypt(c, 'KEYWORD', 'noQ')).toBe(preparePlaintext('JUMPUICKLY', 'noQ').digraphs.join(''))
  })
  it('validates ciphertext', () => {
    expect(validateCiphertext('ABC')).toMatch(/even/)
    expect(validateCiphertext('AABC')).toMatch(/repeats/)
    expect(validateCiphertext('JA')).toMatch(/J/)
    expect(validateCiphertext('')).toMatch(/Enter/)
    expect(validateCiphertext('BMOD')).toBeNull()
  })
})

describe('AES (educational implementation) — FIPS-197 vectors', () => {
  it('generates the correct S-box', () => {
    expect(SBOX[0x00]).toBe(0x63)
    expect(SBOX[0x53]).toBe(0xed)
    expect(SBOX[0xff]).toBe(0x16)
    for (let i = 0; i < 256; i++) expect(INV_SBOX[SBOX[i]]).toBe(i)
  })
  it('GF(2^8) multiply matches FIPS-197 §4.2 example {57}·{13} = {fe}', () => {
    expect(gmul(0x57, 0x13)).toBe(0xfe)
  })
  it('inverse round functions undo forward ones', () => {
    const s = Array.from({ length: 16 }, (_, i) => (i * 37 + 11) & 255)
    expect(invMixColumns(mixColumns(s))).toEqual(s)
    expect(invShiftRows(shiftRows(s))).toEqual(s)
  })
  it('Appendix B example (AES-128)', () => {
    const out = aesEncryptBlock(fromHex('3243f6a8885a308d313198a2e0370734'), fromHex('2b7e151628aed2a6abf7158809cf4f3c'), 128)
    expect(toHex(out)).toBe('3925841d02dc09fbdc118597196a0b32')
  })
  it('Appendix A.1 key expansion last word (AES-128)', () => {
    const { words } = expandKey(fromHex('2b7e151628aed2a6abf7158809cf4f3c'), 128)
    expect(words.length).toBe(44)
    expect(toHex(words[43])).toBe('b6630ca6')
    expect(toHex(words[4])).toBe('a0fafe17')
  })
  const pt = fromHex('00112233445566778899aabbccddeeff')
  const vectors: [128 | 192 | 256, string, string][] = [
    [128, '000102030405060708090a0b0c0d0e0f', '69c4e0d86a7b0430d8cdb78070b4c55a'],
    [192, '000102030405060708090a0b0c0d0e0f1011121314151617', 'dda97ca4864cdfe06eaf70a0ec0d7191'],
    [256, '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f', '8ea2b7ca516745bfeafc49904b496089'],
  ]
  for (const [v, key, ct] of vectors) {
    it(`Appendix C AES-${v} encrypt + decrypt`, () => {
      const k = fromHex(key)
      expect(toHex(aesEncryptBlock(pt, k, v))).toBe(ct)
      expect(toHex(aesDecryptBlock(fromHex(ct), k, v))).toBe(toHex(pt))
    })
  }
  it('trace has the right shape: initial ARK, 9 full rounds, final round without MixColumns', () => {
    const { trace } = aesEncryptTrace(pt, fromHex(vectors[0][1]), 128)
    expect(trace.filter((s) => s.op === 'MixColumns').length).toBe(9)
    expect(trace.filter((s) => s.op === 'AddRoundKey').length).toBe(11)
    expect(trace.filter((s) => s.op === 'SubBytes').length).toBe(10)
    expect(trace[1].op).toBe('AddRoundKey')
    expect(trace[1].round).toBe(0)
    const last = trace.filter((s) => s.round === 10).map((s) => s.op)
    expect(last).toEqual(['SubBytes', 'ShiftRows', 'AddRoundKey', 'Output'])
    // Appendix B: state after round-1 SubBytes for the Appendix-B inputs
    const b = aesEncryptTrace(fromHex('3243f6a8885a308d313198a2e0370734'), fromHex('2b7e151628aed2a6abf7158809cf4f3c'), 128).trace
    expect(toHex(b[1].state)).toBe('193de3bea0f4e22b9ac68d2ae9f84808')
    expect(toHex(b[2].state)).toBe('d42711aee0bf98f1b8b45de51e415230')
  })
  it('rejects bad inputs with readable errors', () => {
    expect(() => aesEncryptBlock([1, 2, 3], fromHex(vectors[0][1]))).toThrow(/16-byte/)
    expect(() => aesEncryptBlock(pt, [1, 2], 128)).toThrow(/16-byte key/)
    expect(() => fromHex('zz')).toThrow()
    expect(() => fromHex('abc')).toThrow(/even/)
  })
  it('agrees with Web Crypto on a random block', async () => {
    const key = Array.from({ length: 16 }, (_, i) => (i * 29 + 7) & 255)
    const block = Array.from({ length: 16 }, (_, i) => (i * 101 + 3) & 255)
    expect(await webCryptoAesBlock(block, key)).toEqual(aesEncryptBlock(block, key))
  })
})

describe('Modes of operation (demo)', () => {
  const key = fromHex('000102030405060708090a0b0c0d0e0f')
  it('ECB leaks identical blocks, CBC hides them', () => {
    const data = new Array(32).fill(0x41)
    const ecb = ecbEncrypt(data, key)
    expect(toHex(ecb.slice(0, 16))).toBe(toHex(ecb.slice(16)))
    const cbc = cbcEncrypt(data, key, new Array(16).fill(7))
    expect(toHex(cbc.slice(0, 16))).not.toBe(toHex(cbc.slice(16)))
    expect(cbcDecrypt(cbc, key, new Array(16).fill(7))).toEqual(data)
  })
  it('PKCS#7 pads and unpads', () => {
    expect(pkcs7Pad([1, 2, 3]).length).toBe(16)
    expect(pkcs7Pad(new Array(16).fill(0)).length).toBe(32)
    expect(pkcs7Unpad(pkcs7Pad([9, 8, 7]))).toEqual([9, 8, 7])
    expect(() => pkcs7Unpad([...new Array(15).fill(0), 5])).toThrow()
  })
  it('CTR nonce reuse: C1 xor C2 = P1 xor P2', () => {
    const nonce = new Array(12).fill(1)
    const p1 = Array.from(new TextEncoder().encode('MEET AT THE GATE'))
    const p2 = Array.from(new TextEncoder().encode('THE KEY IS BROKE'))
    const c1 = ctrXor(p1, key, nonce)
    const c2 = ctrXor(p2, key, nonce)
    expect(c1.map((b, i) => b ^ c2[i])).toEqual(p1.map((b, i) => b ^ p2[i]))
    expect(ctrXor(c1, key, nonce)).toEqual(p1)
  })
})

describe('Toy RSA / DH', () => {
  it('textbook example p=61 q=53 e=17', () => {
    const k = rsaKeygen(61n, 53n, 17n)
    expect(k.n).toBe(3233n)
    expect(k.phi).toBe(3120n)
    expect(k.d).toBe(2753n)
    expect(rsaEncrypt(65n, k)).toBe(2790n)
    expect(rsaDecrypt(2790n, k)).toBe(65n)
  })
  it('signature toy verifies and detects change', () => {
    const k = rsaKeygen(61n, 53n, 17n)
    const s = rsaSignToy(123n, k)
    expect(rsaVerifyToy(123n, s, k)).toBe(true)
    expect(rsaVerifyToy(124n, s, k)).toBe(false)
  })
  it('validates parameters', () => {
    expect(() => rsaKeygen(61n, 61n, 17n)).toThrow(/different/)
    expect(() => rsaKeygen(60n, 53n, 17n)).toThrow(/prime/)
    expect(() => rsaKeygen(61n, 53n, 15n)).toThrow(/shares a factor/)
    expect(() => rsaEncrypt(5000n, rsaKeygen(61n, 53n, 17n))).toThrow()
    expect(suggestE(3120n)).toBe(65537n > 3120n ? 17n : 65537n)
  })
  it('modular helpers', () => {
    expect(modPow(4n, 13n, 497n)).toBe(445n)
    expect(modInverse(3n, 11n)).toBe(4n)
    expect(isPrime(97n)).toBe(true)
    expect(isPrime(91n)).toBe(false)
    expect(factorToy(3233n)).toMatchObject({ p: 53n, q: 61n })
  })
  it('DH both sides agree; MITM yields two different keys', () => {
    const x = dhExchange(23n, 5n, 6n, 15n)
    expect(x.A).toBe(8n)
    expect(x.B).toBe(19n)
    expect(x.sharedAlice).toBe(2n)
    expect(x.sharedBob).toBe(2n)
    const m = dhMitm(23n, 5n, 6n, 15n, 13n)
    expect(m.aliceKey).toBe(m.malloryWithAlice)
    expect(m.bobKey).toBe(m.malloryWithBob)
    expect(discreteLogToy(5n, 8n, 23n)?.x).toBe(6n)
  })
  it('letter encoding round-trips', () => {
    expect(lettersToNumber('HI')).toBe(809n)
    expect(numberToLetters(809n)).toBe('HI')
  })
})

describe('Web Crypto hashes & HMAC', () => {
  it('SHA-256("abc") matches FIPS 180-4 example', async () => {
    expect(await sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  })
  it('SHA-256("") matches the known empty-string digest', async () => {
    expect(await sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
  })
  it('HMAC-SHA256 RFC 4231 test case 2', async () => {
    expect(await hmacSha256Hex('Jefe', 'what do ya want for nothing?')).toBe('5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843')
  })
  it('avalanche: one character change flips roughly half the bits', async () => {
    const d = bitDifference(await sha256Hex('cipherverse'), await sha256Hex('Cipherverse'))
    expect(d).toBeGreaterThan(80)
    expect(d).toBeLessThan(176)
  })
  it('AES-GCM detects tampering', async () => {
    const key = await gcmGenerateKey()
    const { iv, ciphertext } = await gcmEncrypt(key, 'open the gate', 'hdr')
    expect(await gcmDecrypt(key, iv, ciphertext, 'hdr')).toBe('open the gate')
    const bad = ciphertext.slice()
    bad[0] ^= 1
    await expect(gcmDecrypt(key, iv, bad, 'hdr')).rejects.toBeTruthy()
    await expect(gcmDecrypt(key, iv, ciphertext, 'other')).rejects.toBeTruthy()
  })
})

describe('Keyspace estimates', () => {
  it('produces sensible durations', () => {
    expect(humanDuration(log10BruteForceSeconds(Math.log2(25), 1))).toMatch(/seconds/)
    expect(humanDuration(log10BruteForceSeconds(128, 1e12))).toMatch(/universe/)
  })
})

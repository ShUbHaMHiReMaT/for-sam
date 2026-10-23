import type { AlgoId, ChoicePuzzle } from '../game/types'
import { choice } from './helpers'

export interface EncyclopediaEntry {
  id: AlgoId
  name: string
  era: 'Historical' | 'Modern' | 'Post-quantum' | 'Concept'
  family: string
  secure: 'broken' | 'secure' | 'depends'
  what: string
  why: string
  problem: string
  io: string
  keys: string
  example: string
  lab: string
  misconception: string
  security: string
  realWorld: string
  quiz: ChoicePuzzle
  refs: { label: string; url: string }[]
}

const NIST_AES = { label: 'NIST FIPS 197 — Advanced Encryption Standard (AES)', url: 'https://csrc.nist.gov/pubs/fips/197/final' }
const NIST_MODES = { label: 'NIST SP 800-38A — Block Cipher Modes of Operation', url: 'https://csrc.nist.gov/pubs/sp/800/38/a/final' }
const NIST_GCM = { label: 'NIST SP 800-38D — Galois/Counter Mode (GCM) and GMAC', url: 'https://csrc.nist.gov/pubs/sp/800/38/d/final' }
const NIST_SHS = { label: 'NIST FIPS 180-4 — Secure Hash Standard (SHA-2)', url: 'https://csrc.nist.gov/pubs/fips/180-4/upd1/final' }
const NIST_HMAC = { label: 'NIST FIPS 198-1 — The Keyed-Hash Message Authentication Code', url: 'https://csrc.nist.gov/pubs/fips/198-1/final' }
const RFC_HMAC = { label: 'RFC 2104 — HMAC: Keyed-Hashing for Message Authentication', url: 'https://www.rfc-editor.org/rfc/rfc2104' }
const NIST_KM = { label: 'NIST SP 800-57 Part 1 — Recommendation for Key Management', url: 'https://csrc.nist.gov/pubs/sp/800/57/pt1/r5/final' }
const RFC_RSA = { label: 'RFC 8017 — PKCS #1: RSA Cryptography Specifications v2.2', url: 'https://www.rfc-editor.org/rfc/rfc8017' }
const NIST_DSS = { label: 'NIST FIPS 186-5 — Digital Signature Standard', url: 'https://csrc.nist.gov/pubs/fips/186-5/final' }
const NIST_KEM = { label: 'NIST FIPS 203 — ML-KEM', url: 'https://csrc.nist.gov/pubs/fips/203/final' }
const NIST_MLDSA = { label: 'NIST FIPS 204 — ML-DSA', url: 'https://csrc.nist.gov/pubs/fips/204/final' }
const NIST_SLH = { label: 'NIST FIPS 205 — SLH-DSA', url: 'https://csrc.nist.gov/pubs/fips/205/final' }
const NIST_DH = { label: 'NIST SP 800-56A Rev. 3 — Pair-Wise Key Establishment Using Discrete Logarithm Cryptography', url: 'https://csrc.nist.gov/pubs/sp/800/56/a/r3/final' }
const RFC_TLS = { label: 'RFC 8446 — TLS 1.3', url: 'https://www.rfc-editor.org/rfc/rfc8446' }
const RFC_ARGON = { label: 'RFC 9106 — Argon2 memory-hard function', url: 'https://www.rfc-editor.org/rfc/rfc9106' }
const OWASP_PW = { label: 'OWASP Password Storage Cheat Sheet', url: 'https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html' }
const SINGH = { label: 'Simon Singh, The Code Book (historical ciphers, accessible history)', url: 'https://simonsingh.net/books/the-code-book/' }
const KERCKHOFFS = { label: 'Auguste Kerckhoffs, “La cryptographie militaire” (1883)', url: 'https://www.petitcolas.net/kerckhoffs/' }

export const ENCYCLOPEDIA: EncyclopediaEntry[] = [
  {
    id: 'caesar', name: 'Caesar (Shift) Cipher', era: 'Historical', family: 'Monoalphabetic substitution', secure: 'broken',
    what: 'Each letter is replaced by the letter a fixed number of places further along the alphabet, wrapping Z to A.',
    why: 'One of the oldest recorded ciphers (Suetonius describes Julius Caesar using a shift of three). It shows the basic idea of a secret key.',
    problem: 'Hiding written messages from readers who don’t know the shift.',
    io: 'Input: plaintext letters and a shift k (0–25). Output: ciphertext letters of the same length.',
    keys: 'The key is the shift. Only 25 non-trivial keys exist.',
    example: 'Shift 3: HELLO → KHOOR. Decrypt by shifting back 3: KHOOR → HELLO.',
    lab: 'caesar',
    misconception: '“If the shift is secret, the message is safe.” With only 25 keys, an attacker simply tries them all.',
    security: 'Broken. Brute force takes seconds, and frequency analysis reveals the shift from the position of the E spike.',
    realWorld: 'ROT13 (shift 13) is still used to hide spoilers — as a courtesy, never as security.',
    quiz: choice({ id: 'enc-caesar', tags: ['caesar'], difficulty: 1, prompt: 'How many useful keys does the Caesar cipher have?', hints: ['Shift 0 and 26 change nothing.'], explanation: '25 useful shifts (1–25).', options: [{ text: '25', correct: true, why: 'Correct.' }, { text: '26!', why: 'That’s general substitution.' }, { text: '2¹²⁸', why: 'That’s AES-128.' }] }),
    refs: [SINGH],
  },
  {
    id: 'substitution', name: 'Monoalphabetic Substitution', era: 'Historical', family: 'Substitution', secure: 'broken',
    what: 'Each plaintext letter maps to one fixed ciphertext letter according to a scrambled alphabet.',
    why: 'Expands the keyspace from 25 to 26! ≈ 4 × 10²⁶ so brute force is impractical by hand.',
    problem: 'Resisting key-guessing attacks against simple shifts.',
    io: 'Input: plaintext and a 26-letter permutation. Output: ciphertext of equal length.',
    keys: 'The key is the permutation, often derived from a keyword (e.g. ZEBRAS → ZEBRASCDFG…).',
    example: 'Keyword alphabet ZEBRAS…: FLEE AT ONCE → SIAA ZQ LKBA.',
    lab: 'analysis',
    misconception: 'A huge keyspace means security. Here, statistics break it without searching keys at all.',
    security: 'Broken by frequency analysis (described by al-Kindi in the 9th century), common-word patterns and doubled letters.',
    realWorld: 'Newspaper cryptograms. A teaching tool for why keyspace size is necessary but not sufficient.',
    quiz: choice({ id: 'enc-subst', tags: ['substitution', 'analysis'], difficulty: 2, prompt: 'What breaks monoalphabetic substitution most efficiently?', hints: ['Not brute force.'], explanation: 'Frequency analysis: letter statistics survive the substitution.', options: [{ text: 'Frequency analysis', correct: true, why: 'Correct.' }, { text: 'Trying all 26! keys', why: 'Infeasible by hand and unnecessary.' }, { text: 'Nothing — it is secure', why: 'It has been broken for over a thousand years.' }] }),
    refs: [SINGH],
  },
  {
    id: 'playfair', name: 'Playfair Cipher', era: 'Historical', family: 'Digraph substitution', secure: 'broken',
    what: 'Encrypts pairs of letters using a 5×5 key square built from a keyword, with row, column and rectangle rules.',
    why: 'Invented by Charles Wheatstone (1854), promoted by Lord Playfair. Encrypting pairs hides single-letter frequencies and is fast by hand.',
    problem: 'Making frequency analysis harder while staying practical for field use without machines.',
    io: 'Input: plaintext letters (prepared into digraphs) and a keyword. Output: ciphertext of even length.',
    keys: 'The keyword determines the square. Conventions vary (I/J merged or Q omitted; filler letter X).',
    example: 'Keyword PLAYFAIR EXAMPLE: HIDE THE GOLD IN THE TREE STUMP → BMODZBXDNABEKUDMUIXMMOUVIF.',
    lab: 'playfair',
    misconception: '“Pairs can’t be counted.” They can: digraph frequencies (TH, HE, IN…) leak, and AB/BA map to reversed ciphertext pairs.',
    security: 'Broken. With a few hundred letters of ciphertext it can be solved by hand; computers solve it instantly.',
    realWorld: 'Used tactically in the Boer War and World War I, where speed mattered more than long-term secrecy.',
    quiz: choice({ id: 'enc-playfair', tags: ['playfair'], difficulty: 2, prompt: 'Two letters in the same column of the square encrypt by…', hints: ['Encryption: row → right, column → ?'], explanation: 'Each takes the letter directly below it (wrapping).', options: [{ text: 'Taking the letter below each', correct: true, why: 'Correct.' }, { text: 'Taking the letter to the right of each', why: 'That’s the row rule.' }, { text: 'Swapping columns', why: 'That’s the rectangle rule.' }] }),
    refs: [SINGH],
  },
  {
    id: 'vigenere', name: 'Vigenère Cipher', era: 'Historical', family: 'Polyalphabetic substitution', secure: 'broken',
    what: 'A repeating keyword selects a different Caesar shift for each letter position.',
    why: 'Polyalphabetic substitution flattens letter frequencies, defeating simple frequency analysis.',
    problem: 'Single-alphabet ciphers leak frequencies.',
    io: 'Input: plaintext and keyword. Output: ciphertext of equal length.',
    keys: 'The keyword (its length is the period).',
    example: 'ATTACKATDAWN with LEMON → LXFOPVEFRNHR.',
    lab: 'vigenere',
    misconception: '“Le chiffre indéchiffrable.” Babbage and Kasiski showed how to find the key length, after which each column is just a Caesar cipher.',
    security: 'Broken by Kasiski examination and index-of-coincidence analysis, then per-column frequency analysis.',
    realWorld: 'Historical diplomatic and military use. Its “never reuse the key” idea leads to the one-time pad.',
    quiz: choice({ id: 'enc-vig', tags: ['vigenere'], difficulty: 2, prompt: 'What does the Kasiski examination reveal?', hints: ['Repeated fragments and their spacing.'], explanation: 'The likely key length — distances between repeats are multiples of it.', options: [{ text: 'The key length', correct: true, why: 'Correct.' }, { text: 'The plaintext directly', why: 'It gives the period, then frequency analysis does the rest.' }, { text: 'The algorithm', why: 'The algorithm is assumed known.' }] }),
    refs: [SINGH],
  },
  {
    id: 'transposition', name: 'Columnar Transposition', era: 'Historical', family: 'Transposition', secure: 'broken',
    what: 'Letters are written into rows under a keyword and read out column by column in keyword order.',
    why: 'Rearranging positions hides words without changing letters.',
    problem: 'Concealing the order of a message.',
    io: 'Input: plaintext and keyword. Output: a permutation of the (padded) plaintext.',
    keys: 'The keyword determines column order.',
    example: 'WE ARE DISCOVERED FLEE AT ONCE with ZEBRAS → EVLNXACDTXESEAXROFOXDEECXWIREE.',
    lab: 'vigenere',
    misconception: 'That it “scrambles letters.” It only moves them — letter frequencies stay exactly those of the plaintext.',
    security: 'Broken alone (anagramming, multiple-anagramming). Double transposition was stronger but still broken.',
    realWorld: 'The permutation idea survives inside modern ciphers as diffusion (e.g. ShiftRows in AES).',
    quiz: choice({ id: 'enc-trans', tags: ['transposition'], difficulty: 1, prompt: 'A transposition cipher changes…', hints: ['Same letters?'], explanation: 'Only the positions of letters.', options: [{ text: 'Letter positions only', correct: true, why: 'Correct.' }, { text: 'Which letters appear', why: 'That would be substitution.' }, { text: 'Message length dramatically', why: 'Only padding is added.' }] }),
    refs: [SINGH],
  },
  {
    id: 'aes', name: 'AES (Rijndael)', era: 'Modern', family: 'Symmetric block cipher (SPN)', secure: 'secure',
    what: 'A symmetric block cipher on 128-bit blocks with 128-, 192- or 256-bit keys, using 10, 12 or 14 rounds of SubBytes, ShiftRows, MixColumns and AddRoundKey.',
    why: 'Selected by NIST in 2001 after an open international competition to replace DES, whose 56-bit key had become brute-forceable.',
    problem: 'Fast, strong, standardised confidentiality for data with a shared secret key.',
    io: 'Input: one 16-byte block and a key. Output: one 16-byte block. (A mode of operation is needed for longer data.)',
    keys: '128/192/256-bit keys, expanded by the key schedule into round keys (11/13/15 of them).',
    example: 'FIPS-197 Appendix C.1: key 000102…0f, plaintext 00112233…ff → ciphertext 69c4e0d86a7b0430d8cdb78070b4c55a. Verify it in the AES Lab.',
    lab: 'aes',
    misconception: '“AES is a complete secure-messaging system.” It is a primitive: you still need a mode (e.g. GCM), unique nonces, key management and a correct implementation.',
    security: 'No practical attack on full AES is known. Real failures come from ECB mode, nonce reuse, weak keys, key leakage and side channels in implementations.',
    realWorld: 'TLS/HTTPS, disk encryption, Wi-Fi (WPA2/WPA3), messaging apps, VPNs — often with hardware AES instructions.',
    quiz: choice({ id: 'enc-aes', tags: ['aes'], difficulty: 2, prompt: 'AES-192 uses how many rounds?', hints: ['10, 12, 14…'], explanation: '12 rounds.', options: [{ text: '10', why: 'AES-128.' }, { text: '12', correct: true, why: 'Correct.' }, { text: '14', why: 'AES-256.' }] }),
    refs: [NIST_AES, NIST_KM],
  },
  {
    id: 'modes', name: 'Modes of Operation (ECB, CBC, CTR, GCM)', era: 'Modern', family: 'Block-cipher modes', secure: 'depends',
    what: 'Rules for applying a block cipher to messages longer than one block, and for adding integrity.',
    why: 'A block cipher alone handles 16 bytes; modes extend it securely (or insecurely) to real data.',
    problem: 'Encrypting arbitrary-length data without leaking patterns, and detecting tampering.',
    io: 'Input: plaintext, key, and an IV/nonce (and for GCM optional associated data). Output: ciphertext (plus a tag for GCM).',
    keys: 'The block-cipher key; IVs/nonces are not secret but have strict uniqueness/unpredictability rules.',
    example: 'ECB on an image leaks its outline; CBC/CTR/GCM do not. GCM rejects any modified ciphertext.',
    lab: 'modes',
    misconception: '“Encryption prevents tampering.” CBC and CTR alone provide no integrity — bits can be flipped. Use authenticated encryption (GCM).',
    security: 'ECB: avoid. CBC: needs unpredictable IVs + separate MAC. CTR: nonce must never repeat. GCM: recommended; nonce reuse is catastrophic.',
    realWorld: 'AES-GCM is the most widely used cipher suite in TLS 1.3.',
    quiz: choice({ id: 'enc-modes', tags: ['modes'], difficulty: 2, prompt: 'Which mode provides both confidentiality and integrity?', hints: ['Authenticated encryption.'], explanation: 'GCM.', options: [{ text: 'ECB', why: 'Neither good confidentiality nor integrity.' }, { text: 'CBC', why: 'Confidentiality only.' }, { text: 'GCM', correct: true, why: 'Correct.' }] }),
    refs: [NIST_MODES, NIST_GCM],
  },
  {
    id: 'rsa', name: 'RSA', era: 'Modern', family: 'Public-key (integer factorisation)', secure: 'depends',
    what: 'A public-key system where the public key (e, n) encrypts or verifies and the private key (d, n) decrypts or signs; n is the product of two large primes.',
    why: 'Solves key distribution: anyone can encrypt to you or verify your signatures without a shared secret.',
    problem: 'Secure communication and authentication between parties who never met.',
    io: 'Input: a number m < n. Output: c = mᵉ mod n (encryption) or s = mᵈ mod n (textbook signing).',
    keys: 'n = pq (2048+ bits in practice), public e (commonly 65537), private d = e⁻¹ mod φ(n) or λ(n).',
    example: 'p=61, q=53 → n=3233, φ=3120, e=17, d=2753. m=65 → c=2790 → m=65.',
    lab: 'rsa',
    misconception: '“Just RSA-encrypt the file.” Textbook RSA is deterministic and malleable; real use needs OAEP (encryption) or PSS (signatures), and bulk data uses hybrid encryption.',
    security: 'Secure at 2048+ bits with proper padding against classical computers. A large fault-tolerant quantum computer running Shor’s algorithm would break it.',
    realWorld: 'Certificates and signatures in TLS/PKI, code signing, legacy key transport.',
    quiz: choice({ id: 'enc-rsa', tags: ['rsa'], difficulty: 2, prompt: 'What would let an attacker compute the RSA private key?', hints: ['What hides φ(n)?'], explanation: 'Factoring n into p and q.', options: [{ text: 'Factoring n', correct: true, why: 'Correct.' }, { text: 'Knowing e', why: 'e is public.' }, { text: 'Seeing a ciphertext', why: 'Ciphertexts alone don’t reveal d.' }] }),
    refs: [RFC_RSA, NIST_DSS, NIST_KM],
  },
  {
    id: 'dh', name: 'Diffie–Hellman & Elliptic-Curve Cryptography', era: 'Modern', family: 'Key agreement (discrete logarithm)', secure: 'depends',
    what: 'Two parties combine private values with each other’s public values to derive the same shared secret. ECC does this (and signatures) on elliptic-curve groups.',
    why: 'Agree on fresh symmetric keys over an open channel; ephemeral exchanges give forward secrecy.',
    problem: 'Establishing shared keys without having met.',
    io: 'Input: public parameters (p, g or a curve), each side’s private value. Output: a shared secret, fed into a KDF.',
    keys: 'Private scalars a, b; public values gᵃ, gᵇ (or aG, bG on a curve).',
    example: 'p=23, g=5, a=6, b=15: A=8, B=19, shared=2.',
    lab: 'dh',
    misconception: '“DH encrypts messages” and “DH proves identity.” It does neither: it only agrees a key, and unauthenticated DH is open to man-in-the-middle attacks.',
    security: 'Secure with proper groups and authentication. 256-bit curves ≈ 128-bit security (NIST SP 800-57). Shor’s algorithm would break it on a large quantum computer.',
    realWorld: 'ECDHE (X25519, P-256) in TLS 1.3, Signal, SSH; usually combined with signatures/certificates.',
    quiz: choice({ id: 'enc-dh', tags: ['dh'], difficulty: 2, prompt: 'What does an eavesdropper on a DH exchange see?', hints: ['What is sent?'], explanation: 'The public values and parameters, never the shared secret.', options: [{ text: 'p, g, A and B', correct: true, why: 'Correct.' }, { text: 'The shared secret', why: 'It is never transmitted.' }, { text: 'a and b', why: 'Private values stay private.' }] }),
    refs: [NIST_DH, NIST_KM, RFC_TLS],
  },
  {
    id: 'signatures', name: 'Digital Signatures', era: 'Modern', family: 'Public-key authentication', secure: 'depends',
    what: 'A value created with a private key over a message (usually its hash) that anyone can verify with the public key.',
    why: 'Prove origin and integrity to anyone, without sharing a secret.',
    problem: 'Authenticity and integrity verifiable by third parties.',
    io: 'Sign: (private key, message) → signature. Verify: (public key, message, signature) → valid/invalid.',
    keys: 'A signing key pair (e.g. ECDSA, Ed25519, RSA-PSS, ML-DSA).',
    example: 'A software update signed by the vendor verifies only if neither update nor signature changed.',
    lab: 'rsa',
    misconception: '“Signing encrypts the message.” A signature hides nothing; the message stays readable.',
    security: 'Depends on the scheme, key protection and correct randomness — reusing an ECDSA nonce reveals the private key.',
    realWorld: 'TLS certificates, software updates, documents, cryptocurrencies.',
    quiz: choice({ id: 'enc-sig', tags: ['signatures'], difficulty: 1, prompt: 'Signatures provide…', hints: ['Not secrecy.'], explanation: 'Authenticity and integrity.', options: [{ text: 'Authenticity and integrity', correct: true, why: 'Correct.' }, { text: 'Confidentiality', why: 'Signatures don’t hide data.' }, { text: 'Compression', why: 'No.' }] }),
    refs: [NIST_DSS, NIST_MLDSA],
  },
  {
    id: 'hash', name: 'Cryptographic Hashes (SHA-256)', era: 'Modern', family: 'Hash function', secure: 'secure',
    what: 'A function mapping any input to a fixed-size digest (256 bits for SHA-256), designed to be preimage-, second-preimage- and collision-resistant.',
    why: 'Fingerprint data for integrity checks, signatures, commitments and key derivation.',
    problem: 'Detecting changes and representing large data compactly.',
    io: 'Input: any byte string. Output: a fixed-length digest.',
    keys: 'None. Anyone can compute a hash.',
    example: 'SHA-256("abc") = ba7816bf…f20015ad. Change one character and ~half the bits flip.',
    lab: 'hash',
    misconception: '“Hashing is encryption” and “a hash uniquely identifies every input.” Hashes aren’t reversible with a key, and collisions must exist — they are just infeasible to find.',
    security: 'SHA-256 has no practical collision or preimage attacks. MD5 and SHA-1 are broken for collision resistance. Fast hashes are wrong for passwords.',
    realWorld: 'File integrity, digital signatures, Git object IDs, blockchains, HMAC and HKDF.',
    quiz: choice({ id: 'enc-hash', tags: ['hash'], difficulty: 1, prompt: 'What should store passwords?', hints: ['Slow and salted.'], explanation: 'A password hash like Argon2id, scrypt, bcrypt or PBKDF2 — not plain SHA-256.', options: [{ text: 'Argon2id with a salt', correct: true, why: 'Correct.' }, { text: 'Plain SHA-256', why: 'Too fast, unsalted.' }, { text: 'AES encryption', why: 'Recoverable with the key.' }] }),
    refs: [NIST_SHS, RFC_ARGON, OWASP_PW],
  },
  {
    id: 'hmac', name: 'HMAC & Authenticated Encryption', era: 'Modern', family: 'Message authentication', secure: 'secure',
    what: 'HMAC combines a hash with a secret key to produce a tag only key-holders can create. Authenticated encryption (AES-GCM, ChaCha20-Poly1305) combines encryption and authentication.',
    why: 'Plain hashes can be recomputed by attackers; keyed tags cannot.',
    problem: 'Integrity and authenticity between parties sharing a key.',
    io: 'HMAC: (key, message) → tag. AEAD: (key, nonce, plaintext, AD) → ciphertext + tag.',
    keys: 'A shared secret key; for AEAD also a unique nonce per message.',
    example: 'RFC 4231 test 2: HMAC-SHA256(key "Jefe", "what do ya want for nothing?") = 5bdcc146…964ec3843.',
    lab: 'hash',
    misconception: '“HMAC hides the message.” HMAC provides no confidentiality. And a MAC can’t prove to a third party which key-holder created it.',
    security: 'HMAC-SHA256 is secure. Compare tags in constant time. In GCM, never reuse a nonce.',
    realWorld: 'API request signing, JWT (HS256), TLS record protection (AEAD), cookies.',
    quiz: choice({ id: 'enc-hmac', tags: ['hmac'], difficulty: 2, prompt: 'HMAC provides…', hints: ['Not secrecy.'], explanation: 'Integrity and authenticity between key holders.', options: [{ text: 'Integrity and authenticity with a shared key', correct: true, why: 'Correct.' }, { text: 'Confidentiality', why: 'The message is unchanged and readable.' }, { text: 'Non-repudiation', why: 'Either key holder could have made the tag.' }] }),
    refs: [NIST_HMAC, RFC_HMAC, NIST_GCM],
  },
  {
    id: 'pqc', name: 'Post-Quantum Cryptography (ML-KEM, ML-DSA)', era: 'Post-quantum', family: 'Lattice and hash-based', secure: 'secure',
    what: 'Public-key algorithms designed to resist attacks by large quantum computers. ML-KEM (FIPS 203) establishes keys; ML-DSA (FIPS 204) and SLH-DSA (FIPS 205) sign.',
    why: 'Shor’s algorithm would break RSA, DH and ECC on a large fault-tolerant quantum computer; data recorded today could be decrypted later.',
    problem: 'Long-term confidentiality and authenticity in a world with quantum computers.',
    io: 'ML-KEM: encapsulate(public key) → (ciphertext, shared secret). ML-DSA: sign/verify like other signatures.',
    keys: 'Larger keys and ciphertexts/signatures than ECC (kilobytes rather than tens of bytes).',
    example: 'Hybrid key exchange X25519 + ML-KEM-768 is being deployed in TLS so that security holds if either component holds.',
    lab: 'hash',
    misconception: '“Quantum computers break all encryption.” Symmetric ciphers and hashes face only Grover’s quadratic speed-up; AES-256 keeps a wide margin.',
    security: 'Standardised by NIST in 2024 after years of public analysis. Still young: implementations and parameter choices continue to be studied.',
    realWorld: 'Browsers, messaging apps and VPNs are adopting hybrid post-quantum key exchange.',
    quiz: choice({ id: 'enc-pqc', tags: ['pqc'], difficulty: 2, prompt: 'ML-KEM is used for…', hints: ['KEM.'], explanation: 'Key establishment.', options: [{ text: 'Key establishment', correct: true, why: 'Correct.' }, { text: 'Hashing', why: 'No.' }, { text: 'Signatures', why: 'That’s ML-DSA.' }] }),
    refs: [NIST_KEM, NIST_MLDSA, NIST_SLH],
  },
  {
    id: 'design', name: 'Secure System Design', era: 'Concept', family: 'Engineering practice', secure: 'depends',
    what: 'Combining primitives, protocols, key management, implementation and operations into a system that resists a defined threat model.',
    why: 'Most real breaches exploit keys, configuration, implementation or people — not the mathematics.',
    problem: 'Turning strong primitives into actually secure systems.',
    io: 'Input: assets, adversaries, constraints. Output: a design with justified primitives, key handling and residual risks.',
    keys: 'Kerckhoffs’s principle: only keys are secret. Keys need secure generation (CSPRNG), storage, separation, rotation and revocation.',
    example: 'Repaired Lumen Relay: verify certificates → ECDHE/ML-KEM → AES-GCM with unique nonces → verify tags.',
    lab: 'analysis',
    misconception: '“Strong algorithm = secure system” and “secret design = extra security.”',
    security: 'Use vetted libraries with safe defaults, never roll your own crypto, threat-model first, and invite review.',
    realWorld: 'TLS 1.3, Signal Protocol, password managers, cloud key-management services.',
    quiz: choice({ id: 'enc-design', tags: ['design'], difficulty: 2, prompt: 'What should come first when designing a secure system?', hints: ['Before algorithms.'], explanation: 'A threat model.', options: [{ text: 'A threat model', correct: true, why: 'Correct.' }, { text: 'Choosing AES-256', why: 'Premature.' }, { text: 'Writing a custom cipher', why: 'Never.' }] }),
    refs: [KERCKHOFFS, NIST_KM, RFC_TLS],
  },
]

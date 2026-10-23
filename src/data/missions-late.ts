import type { Mission } from '../game/types'
import { SBOX, hex, shiftRows } from '../crypto/aes'
import { modPow, modInverse, factorToy } from '../crypto/publickey'
import { caesarEncrypt } from '../crypto/classical'
import { choice, order, text } from './helpers'

// ───────────────────────────── CHAPTER 3 — THE IRON FORGE ─────────────────────────────

const SB_IN = 0x53
const SB_OUT = hex(SBOX[SB_IN]).toUpperCase()
const ARK_A = 0x57
const ARK_B = 0x2b
const ARK_OUT = hex(ARK_A ^ ARK_B).toUpperCase()
// ShiftRows on a demo state: show row 2 before and after.
const SR_STATE = Array.from({ length: 16 }, (_, i) => i)
const SR_AFTER = shiftRows(SR_STATE)
const SR_ROW2_BEFORE = [0, 1, 2, 3].map((c) => SR_STATE[2 + 4 * c])
const SR_ROW2_AFTER = [0, 1, 2, 3].map((c) => SR_AFTER[2 + 4 * c])
const LABELS = ['A1', 'B2', 'C3', 'D4']
const srLabel = (row: number[]) => row.map((v) => LABELS[SR_ROW2_BEFORE.indexOf(v)]).join(' ')

export const AES_ROUND_ORDER = [
  'AddRoundKey (initial, round key 0)',
  'Rounds 1–9: SubBytes → ShiftRows → MixColumns → AddRoundKey',
  'Round 10: SubBytes → ShiftRows → AddRoundKey (no MixColumns)',
  'Output the state as ciphertext',
]

export const m3a: Mission = {
  id: 'm3-forge',
  chapter: 3,
  title: 'Heart of the Forge',
  summary: 'The Forge’s great machine pushes data through transformation chambers. Learn AES by restarting it, chamber by chamber.',
  objective: 'Understand AES: a 128-bit block cipher with 128/192/256-bit keys, its round structure and its four transformations.',
  type: 'story',
  requires: ['m2-pillars'],
  xp: 220,
  worldChange: 'The Forge’s furnaces roar back to life. The great round-machine turns: substitute, shift, mix, key.',
  steps: [
    {
      kind: 'dialogue', scene: 'forge', lines: [
        { who: 'orion', text: 'The Iron Forge. Every Guardian vault ran on what this machine produced: AES — the Advanced Encryption Standard.', mood: 'neutral' },
        { who: 'aura', text: 'Standardised by NIST in 2001 as FIPS 197, after an open, public competition. The winning design, Rijndael, came from two Belgian cryptographers.', mood: 'smile' },
        { who: 'kael', text: 'Public competition? So everyone knows exactly how it works?', mood: 'surprised' },
        { who: 'orion', text: 'Everyone. For over two decades the world’s best cryptanalysts have attacked it. No practical attack on full AES exists. That is what earned trust — not secrecy.', mood: 'neutral' },
      ],
    },
    {
      kind: 'lesson', who: 'orion', title: 'AES: The Shape of the Machine',
      blocks: [
        { t: 'list', items: [
          'AES is a SYMMETRIC block cipher: the same secret key encrypts and decrypts.',
          'Block size: always 128 bits (16 bytes), arranged as a 4×4 grid of bytes called the STATE.',
          'Key sizes: 128, 192 or 256 bits → 10, 12 or 14 rounds.',
          'A key schedule expands the cipher key into one 128-bit round key per round, plus one extra for the start.',
        ] },
        { t: 'h', text: 'The four chambers' },
        { t: 'list', items: [
          'SubBytes — each byte passes through the S-box, a fixed NONLINEAR substitution. Without nonlinearity, the whole cipher would collapse into solvable linear equations.',
          'ShiftRows — row r rotates left by r bytes, so bytes from one column spread across columns.',
          'MixColumns — each column is multiplied by a fixed matrix over GF(2⁸): every output byte depends on all four input bytes.',
          'AddRoundKey — XOR the state with the round key. The ONLY step that uses the key.',
        ] },
        { t: 'h', text: 'AES-128 round structure' },
        { t: 'code', text: 'AddRoundKey(k0)\nfor round 1..9:  SubBytes → ShiftRows → MixColumns → AddRoundKey(k_round)\nround 10:        SubBytes → ShiftRows → AddRoundKey(k10)      ← no MixColumns' },
        { t: 'widget', widget: 'aesMini' },
        { t: 'callout', tone: 'myth', title: 'Misconception', text: 'AES is a block cipher, not a complete protocol. Encrypting real data also needs a MODE (like GCM), unique nonces, authentication, safe key storage and good randomness. Most real-world failures happen there, not inside AES.' },
      ],
    },
    {
      kind: 'puzzle', who: 'orion', puzzle: choice({
        id: 'p3-rounds', tags: ['aes'], difficulty: 1,
        prompt: 'The Forge’s deepest vault uses AES-256. How many rounds does it run, and what is its block size?',
        hints: ['Key size changes the number of rounds, not the block size.', '128 → 10, 192 → 12, 256 → ?'],
        explanation: 'AES-256 runs 14 rounds. The block size of AES is ALWAYS 128 bits, whatever the key size.',
        options: [
          { text: '14 rounds, 256-bit blocks', why: 'Rounds are right, but AES blocks are always 128 bits.' },
          { text: '14 rounds, 128-bit blocks', correct: true, why: 'Correct.' },
          { text: '10 rounds, 128-bit blocks', why: '10 rounds is AES-128.' },
          { text: '12 rounds, 256-bit blocks', why: '12 rounds is AES-192, and blocks are always 128 bits.' },
        ],
      }),
    },
    {
      kind: 'puzzle', who: 'aura', puzzle: text({
        id: 'p3-sbox', tags: ['aes'], difficulty: 2,
        prompt: `SubBytes chamber: the S-box maps byte 0x${hex(SB_IN)} to which byte? (Look it up: row ${hex(SB_IN)[0]}, column ${hex(SB_IN)[1]} of the S-box — or use the lab’s inspector.)`,
        widget: 'aesMini', widgetProps: { sbox: SB_IN },
        answers: [SB_OUT],
        placeholder: 'Two hex digits, e.g. 7C',
        hints: ['In the AES Lab, the S-box grid is indexed by the high nibble (row) and low nibble (column).', `It begins with ${SB_OUT[0]}.`],
        explanation: `S(0x${hex(SB_IN)}) = 0x${SB_OUT}. FIPS-197 uses this exact example. The S-box is the GF(2⁸) multiplicative inverse followed by an affine transform — chosen to resist linear and differential cryptanalysis.`,
      }),
    },
    {
      kind: 'puzzle', who: 'orion', puzzle: text({
        id: 'p3-xor', tags: ['aes'], difficulty: 2,
        prompt: `AddRoundKey chamber: a state byte 0x${hex(ARK_A)} meets round-key byte 0x${hex(ARK_B)}. What is the result?`,
        answers: [ARK_OUT],
        placeholder: 'Two hex digits',
        hints: ['AddRoundKey is bitwise XOR.', `0x57 = 0101 0111, 0x2B = 0010 1011. XOR: 1 where bits differ.`],
        explanation: `0101 0111 ⊕ 0010 1011 = ${(ARK_A ^ ARK_B).toString(2).padStart(8, '0')} = 0x${ARK_OUT}. XOR is its own inverse, so decryption applies the same round key again.`,
      }),
    },
    {
      kind: 'puzzle', who: 'nyra', puzzle: text({
        id: 'p3-shift', tags: ['aes'], difficulty: 2,
        prompt: `ShiftRows chamber: row 2 of the state (the third row, counting from 0) holds ${srLabel(SR_ROW2_BEFORE)}. What does it hold after ShiftRows?`,
        answers: [srLabel(SR_ROW2_AFTER)],
        placeholder: 'e.g. A1 B2 C3 D4',
        hints: ['Row r is rotated LEFT by r positions.', 'Row 2 rotates left by 2.'],
        explanation: `Row 2 rotates left by two: ${srLabel(SR_ROW2_BEFORE)} → ${srLabel(SR_ROW2_AFTER)}. Row 0 doesn’t move; row 1 moves one; row 3 moves three.`,
      }),
    },
    {
      kind: 'puzzle', who: 'orion', puzzle: order({
        id: 'p3-order', tags: ['aes'], difficulty: 3,
        prompt: 'Restart the great machine: arrange the AES-128 encryption sequence in order.',
        items: AES_ROUND_ORDER,
        hints: ['AES begins by mixing in key material before any round.', 'The last round is special — it skips one transformation.'],
        explanation: 'Initial AddRoundKey, nine full rounds, then a final round without MixColumns (which keeps encryption and decryption structurally symmetric).',
      }),
    },
    {
      kind: 'puzzle', who: 'aura', puzzle: choice({
        id: 'p3-mix', tags: ['aes'], difficulty: 2,
        prompt: 'If MixColumns were removed from every round, what would AES lose most?',
        hints: ['Think about how far one changed input byte can spread.'],
        explanation: 'MixColumns (with ShiftRows) provides diffusion: after two rounds, every output byte depends on every input byte. Without it, each byte position would be processed largely independently and the cipher would be far weaker.',
        options: [
          { text: 'Diffusion — changes would stay local instead of spreading across the block.', correct: true, why: 'Exactly.' },
          { text: 'The key — MixColumns is where the key is used.', why: 'Only AddRoundKey uses the key.' },
          { text: 'Nothing — it is decorative.', why: 'Every AES step has a purpose; removing one breaks the security argument.' },
        ],
      }),
    },
  ],
}

export const m3b: Mission = {
  id: 'm3-modes',
  chapter: 3,
  title: 'The Conveyor of Blocks',
  summary: 'AES encrypts one 16-byte block. Real messages are longer. The Forge’s conveyor belts decide how blocks are chained — and how they fail.',
  objective: 'Understand modes of operation: ECB, CBC, CTR and GCM; IVs, nonces and authentication tags.',
  type: 'story',
  requires: ['m3-forge'],
  xp: 200,
  worldChange: 'The conveyor belts run in GCM: every crate leaves the Forge sealed and stamped.',
  steps: [
    {
      kind: 'lesson', who: 'orion', title: 'Modes of Operation',
      blocks: [
        { t: 'list', items: [
          'ECB — each block encrypted independently. Identical plaintext blocks give identical ciphertext blocks: patterns leak. Don’t use it for data.',
          'CBC — each block is XORed with the previous ciphertext block before encryption. Needs an unpredictable IV and padding. Provides no integrity on its own.',
          'CTR — AES encrypts nonce‖counter to make a keystream that is XORed with the data. No padding. The nonce/counter pair must NEVER repeat under one key.',
          'GCM — CTR-mode encryption plus an authentication tag (GMAC). Authenticated encryption: confidentiality AND integrity. Nonces must never repeat.',
        ] },
        { t: 'callout', tone: 'warn', title: 'Nonce reuse', text: 'In CTR/GCM, reusing a nonce with the same key reuses the keystream: C₁ ⊕ C₂ = P₁ ⊕ P₂. For GCM it also lets attackers forge tags. A “number used once” must be used ONCE.' },
        { t: 'callout', tone: 'info', title: 'Standards', text: 'NIST SP 800-38A specifies ECB/CBC/CTR; SP 800-38D specifies GCM.' },
      ],
    },
    {
      kind: 'puzzle', who: 'nyra', puzzle: choice({
        id: 'p3-ecb', tags: ['modes'], difficulty: 2,
        prompt: 'An image encrypted with AES still shows the outline of the Guardian crest. Which mode was used?',
        hints: ['Which mode turns identical input blocks into identical output blocks?'],
        explanation: 'ECB encrypts equal blocks to equal ciphertext, so large uniform regions stay visibly uniform. AES itself is fine — the MODE leaked the structure.',
        options: [
          { text: 'ECB', correct: true, why: 'Yes — the famous “ECB penguin” effect.' },
          { text: 'CBC with a random IV', why: 'CBC chaining makes equal blocks encrypt differently.' },
          { text: 'GCM', why: 'GCM is counter-based; equal blocks produce different ciphertext.' },
        ],
      }),
    },
    {
      kind: 'puzzle', who: 'orion', puzzle: choice({
        id: 'p3-nonce', tags: ['modes'], difficulty: 3,
        prompt: 'Two crates were encrypted with AES-CTR using the same key AND the same nonce. An attacker XORs the two ciphertexts. What do they get?',
        hints: ['C = P ⊕ keystream. What happens to the keystream when you XOR two ciphertexts made with the same keystream?'],
        explanation: 'C₁ ⊕ C₂ = (P₁ ⊕ K) ⊕ (P₂ ⊕ K) = P₁ ⊕ P₂. The key cancels out. Knowing or guessing either plaintext reveals the other.',
        options: [
          { text: 'Random noise — CTR is secure.', why: 'Only if nonces are unique. Reuse breaks it.' },
          { text: 'The AES key.', why: 'The key itself isn’t revealed, but it doesn’t need to be.' },
          { text: 'P₁ ⊕ P₂ — the XOR of the two plaintexts.', correct: true, why: 'Right — the keystream cancels.' },
        ],
      }),
    },
    {
      kind: 'puzzle', who: 'aura', puzzle: choice({
        id: 'p3-gcm', tags: ['modes'], difficulty: 2,
        prompt: 'A saboteur flips one bit of a GCM ciphertext in transit. What happens at decryption?',
        hints: ['What does the “authenticated” in authenticated encryption mean?'],
        explanation: 'GCM verifies the authentication tag before releasing plaintext. Any modification makes verification fail and decryption is rejected — try it in the Modes Lab.',
        options: [
          { text: 'One bit of the plaintext flips silently.', why: 'That is what happens in plain CTR. GCM adds a tag to detect it.' },
          { text: 'Tag verification fails and the message is rejected.', correct: true, why: 'Correct — integrity protection.' },
          { text: 'The key is destroyed.', why: 'Keys aren’t affected by ciphertext changes.' },
        ],
      }),
    },
    {
      kind: 'investigate', id: 'i3-forge', title: 'Beneath the Colossus',
      text: 'The Colossus’s pedestal is engraved. Most of it is a work song. Some of it is not.',
      clues: [
        { id: 'chant', label: 'Work-chant', detail: 'A forge-worker’s mnemonic for the AES round.', lore: 'l-forge' },
        { id: 'engraving', label: 'Engraving signed “K.”', detail: 'Small, careful letters near the base.', lore: 'null-4' },
      ],
    },
    {
      kind: 'dialogue', scene: 'forge', lines: [
        { who: 'colossus', text: 'ROUNDS INCOMPLETE. SEQUENCE CORRUPTED. I WILL FORGE YOU INTO NOISE.', mood: 'angry' },
        { who: 'orion', text: 'It still runs AES — but its control sequence is scrambled. Correct the rounds and it shuts down.', mood: 'neutral' },
      ],
    },
    { kind: 'boss', bossId: 'colossus' },
    {
      kind: 'dialogue', scene: 'forge', lines: [
        { who: 'orion', text: 'The Forge is ours. But AES has one hard problem it can’t solve: both sides need the SAME key. How do two kingdoms who have never met share one?', mood: 'neutral' },
        { who: 'aura', text: 'The Twin-Key Citadel answered that. Two keys — one you publish, one you guard.', mood: 'smile' },
      ],
    },
  ],
}

// ───────────────────────────── CHAPTER 4 — THE TWO-KEY DIVIDE ─────────────────────────────

const RP = 7n, RQ = 13n
const RN = RP * RQ
const RPHI = (RP - 1n) * (RQ - 1n)
const RE = 5n
const RD = modInverse(RE, RPHI)
const RM = 10n
const RC = modPow(RM, RE, RN)

export const m4: Mission = {
  id: 'm4-divide',
  chapter: 4,
  title: 'The Bridge Between Rivals',
  summary: 'Two kingdoms that distrust each other need a secure channel without ever meeting. Build it with RSA.',
  objective: 'Understand public/private keys, modular arithmetic and toy RSA key generation, encryption and decryption.',
  type: 'story',
  requires: ['m3-modes'],
  xp: 240,
  worldChange: 'A public lock hangs on the Citadel bridge. Anyone may close it; only the far kingdom can open it.',
  steps: [
    {
      kind: 'dialogue', scene: 'citadel', lines: [
        { who: 'orion', text: 'Home. Or what’s left. The Citadel kingdoms of Aster and Vael haven’t spoken in a century. They need a secret channel and they refuse to meet to exchange a key.', mood: 'sad' },
        { who: 'kael', text: 'So… AES is out. They’d need the same key.', mood: 'neutral' },
        { who: 'orion', text: 'Public-key cryptography. Vael publishes a lock — the PUBLIC key. Anyone can snap it shut. Only Vael holds the PRIVATE key that opens it.', mood: 'neutral' },
      ],
    },
    {
      kind: 'lesson', who: 'orion', title: 'RSA with Toy Numbers',
      blocks: [
        { t: 'p', text: 'RSA (Rivest–Shamir–Adleman, 1977) relies on a one-way-ish problem: multiplying two large primes is easy; factoring their product back is believed to be infeasible for numbers of 2048+ bits.' },
        { t: 'h', text: 'Key generation' },
        { t: 'list', items: [
          'Choose two primes p and q. Compute n = p × q (the modulus, public).',
          'Compute φ(n) = (p − 1)(q − 1). Keep it secret.',
          'Choose public exponent e with gcd(e, φ) = 1. Public key: (e, n).',
          'Compute d = e⁻¹ mod φ — the private exponent. Private key: (d, n).',
        ] },
        { t: 'h', text: 'Use' },
        { t: 'code', text: 'encrypt:  c = mᵉ mod n\ndecrypt:  m = cᵈ mod n' },
        { t: 'widget', widget: 'rsaMini' },
        { t: 'callout', tone: 'warn', title: 'Toy numbers — and textbook RSA', text: 'These tiny primes are factored instantly. Even with big numbers, “textbook” RSA is unsafe: it is deterministic (same message → same ciphertext) and malleable. Real systems use 2048-bit+ keys with OAEP padding, and usually encrypt only a short symmetric key (hybrid encryption).' },
      ],
    },
    {
      kind: 'puzzle', who: 'orion', puzzle: text({
        id: 'p4-n', tags: ['rsa'], difficulty: 1,
        prompt: `Vael chooses p = ${RP} and q = ${RQ}. What is the modulus n?`,
        answers: [String(RN)], placeholder: 'A number',
        hints: ['n = p × q'],
        explanation: `n = ${RP} × ${RQ} = ${RN}.`,
      }),
    },
    {
      kind: 'puzzle', who: 'orion', puzzle: text({
        id: 'p4-phi', tags: ['rsa'], difficulty: 2,
        prompt: `Now compute φ(n) = (p − 1)(q − 1) for p = ${RP}, q = ${RQ}.`,
        answers: [String(RPHI)], placeholder: 'A number',
        hints: [`(${RP} − 1) × (${RQ} − 1)`],
        explanation: `φ = ${RP - 1n} × ${RQ - 1n} = ${RPHI}. Anyone who can factor n can compute φ — which is why factoring breaks RSA.`,
      }),
    },
    {
      kind: 'puzzle', who: 'aura', puzzle: text({
        id: 'p4-d', tags: ['rsa'], difficulty: 3,
        prompt: `Vael picks e = ${RE}. Find the private exponent d such that ${RE} × d ≡ 1 (mod ${RPHI}).`,
        answers: [String(RD)], placeholder: 'A number',
        hints: [`Try multiples of ${RPHI} plus 1: ${RPHI + 1n}, ${2n * RPHI + 1n}, ${3n * RPHI + 1n}… which is divisible by ${RE}?`, 'Or use the extended Euclidean algorithm (the RSA Lab shows it).'],
        explanation: `${RE} × ${RD} = ${RE * RD} = ${(RE * RD) / RPHI} × ${RPHI} + 1, so d = ${RD}.`,
      }),
    },
    {
      kind: 'puzzle', who: 'orion', puzzle: text({
        id: 'p4-enc', tags: ['rsa'], difficulty: 2,
        prompt: `Aster sends the message number m = ${RM} using Vael’s public key (e = ${RE}, n = ${RN}). What is c = mᵉ mod n?`,
        answers: [String(RC)], placeholder: 'A number',
        widget: 'rsaMini', widgetProps: { p: Number(RP), q: Number(RQ), e: Number(RE), m: Number(RM) },
        hints: [`${RM}⁵ = ${RM ** 5n}. Now take the remainder after dividing by ${RN}.`],
        explanation: `${RM}⁵ = ${RM ** 5n} ≡ ${RC} (mod ${RN}). Vael decrypts with ${RC}^${RD} mod ${RN} = ${RM}.`,
      }),
    },
    {
      kind: 'puzzle', who: 'aura', puzzle: choice({
        id: 'p4-which', tags: ['rsa', 'basics'], difficulty: 1,
        prompt: 'Aster wants to send a secret ONLY Vael can read. Which key does Aster use to encrypt?',
        hints: ['Who should be able to decrypt? They must hold the matching private key.'],
        explanation: 'Encrypt with the RECIPIENT’S public key; only the recipient’s private key decrypts.',
        options: [
          { text: 'Aster’s private key', why: 'Using your private key is how you SIGN, not how you keep something secret.' },
          { text: 'Vael’s public key', correct: true, why: 'Correct.' },
          { text: 'Vael’s private key', why: 'Aster never has that — and must never have it.' },
        ],
      }),
    },
    {
      kind: 'puzzle', who: 'orion', puzzle: choice({
        id: 'p4-hybrid', tags: ['rsa', 'design'], difficulty: 3,
        prompt: 'The treaty is 40 MB. How should Aster send it securely to Vael in a real system?',
        hints: ['RSA can only encrypt a value smaller than n, and it is slow.'],
        explanation: 'Hybrid encryption: generate a random AES key, encrypt the treaty with AES-GCM, and transport the AES key with RSA-OAEP (or a modern KEM). TLS and most real protocols work this way.',
        options: [
          { text: 'Split it into thousands of chunks and RSA-encrypt each with textbook RSA.', why: 'Slow and insecure: no padding, deterministic, malleable.' },
          { text: 'Encrypt it with a fresh AES-GCM key, and send that key encrypted with RSA-OAEP.', correct: true, why: 'Yes — hybrid encryption.' },
          { text: 'Sign it with Aster’s private key; that hides it.', why: 'Signatures provide authenticity, not confidentiality.' },
        ],
      }),
    },
    {
      kind: 'dialogue', scene: 'citadel', lines: [
        { who: 'sovereigns', text: 'We are Aster. We are Vael. We do not share a key. We do not share a TRUTH. Prove your bridge, or fall between us.', mood: 'angry' },
      ],
    },
    { kind: 'boss', bossId: 'sovereigns' },
    {
      kind: 'dialogue', scene: 'citadel', lines: [
        { who: 'orion', text: 'The bridge holds. Aster and Vael are talking. Arguing, mostly. That counts.', mood: 'smile' },
        { who: 'nyra', text: 'Bad news. Messengers on the Frontier are being impersonated. Someone sits in the middle of every conversation.', mood: 'angry' },
      ],
    },
  ],
}

// ───────────────────────────── CHAPTER 5 — THE ELLIPTIC FRONTIER ─────────────────────────────

const DP = 23n, DG = 5n, DA = 6n, DB = 15n
const DAPUB = modPow(DG, DA, DP)
const DBPUB = modPow(DG, DB, DP)
const DSHARED = modPow(DBPUB, DA, DP)

export const m5: Mission = {
  id: 'm5-frontier',
  chapter: 5,
  title: 'Faces in the Mirror',
  summary: 'On the Frontier, Mirror-folk wear any face. Learn to agree on keys in public — and to prove who you’re talking to.',
  objective: 'Understand Diffie–Hellman key agreement, elliptic-curve cryptography, digital signatures and man-in-the-middle attacks.',
  type: 'story',
  requires: ['m4-divide'],
  xp: 240,
  worldChange: 'Frontier messengers carry seals now. Unsealed messages are ignored, and the Mirror-folk are losing their audience.',
  steps: [
    {
      kind: 'lesson', who: 'nyra', title: 'Agreeing on a Secret in Public',
      blocks: [
        { t: 'p', text: 'Diffie–Hellman (1976) lets two parties create a shared secret over a channel everyone can hear. Each picks a private number, publishes a derived public value, and combines the other’s public value with their own private one.' },
        { t: 'widget', widget: 'dhMix' },
        { t: 'code', text: 'public:  prime p, generator g\nAlice:   secret a,  sends A = gᵃ mod p\nBob:     secret b,  sends B = gᵇ mod p\nshared:  Bᵃ mod p  =  Aᵇ mod p  =  gᵃᵇ mod p' },
        { t: 'p', text: 'An eavesdropper sees p, g, A and B, but recovering a or b requires solving the discrete logarithm problem — believed infeasible for properly sized groups.' },
        { t: 'h', text: 'Elliptic curves' },
        { t: 'p', text: 'Elliptic-curve cryptography (ECC) uses the same idea in the group of points on an elliptic curve. Its discrete-log problem is harder per bit, so keys are much smaller: per NIST SP 800-57, a 256-bit curve gives roughly the security of 3072-bit RSA (~128-bit security). ECDH does key agreement; ECDSA and EdDSA do signatures.' },
        { t: 'h', text: 'Digital signatures' },
        { t: 'p', text: 'A signature is made with a PRIVATE key and checked with the matching PUBLIC key. It proves who signed (authenticity) and that nothing changed (integrity). It does NOT hide the message.' },
        { t: 'callout', tone: 'warn', title: 'Man-in-the-middle', text: 'Plain DH authenticates no one. Mallory can run one exchange with Alice and another with Bob, relaying and reading everything. The fix: authenticate the public values — signatures and certificates (as TLS does).' },
      ],
    },
    {
      kind: 'puzzle', who: 'nyra', puzzle: text({
        id: 'p5-A', tags: ['dh'], difficulty: 2,
        prompt: `Public: p = ${DP}, g = ${DG}. Nyra’s secret is a = ${DA}. What public value A = gᵃ mod p does she send?`,
        answers: [String(DAPUB)], placeholder: 'A number',
        hints: [`${DG}⁶ = ${DG ** 6n}. Divide by ${DP} and keep the remainder.`],
        explanation: `${DG}^${DA} = ${DG ** DA} ≡ ${DAPUB} (mod ${DP}).`,
      }),
    },
    {
      kind: 'puzzle', who: 'nyra', puzzle: text({
        id: 'p5-shared', tags: ['dh'], difficulty: 3,
        prompt: `Kael replies with B = ${DBPUB}. Compute the shared secret Bᵃ mod p (a = ${DA}, p = ${DP}).`,
        answers: [String(DSHARED)], placeholder: 'A number',
        widget: 'dhMix', widgetProps: { p: Number(DP), g: Number(DG), a: Number(DA), b: Number(DB) },
        hints: [`${DBPUB}² mod ${DP} = ${(DBPUB ** 2n) % DP}. Square-and-multiply keeps numbers small.`],
        explanation: `${DBPUB}^${DA} mod ${DP} = ${DSHARED}. Kael computes ${DAPUB}^${DB} mod ${DP} and gets the same ${DSHARED}.`,
      }),
    },
    {
      kind: 'puzzle', who: 'aura', puzzle: choice({
        id: 'p5-not-enc', tags: ['dh', 'basics'], difficulty: 2,
        prompt: 'What does Diffie–Hellman by itself give you?',
        hints: ['Look at what comes out of the exchange.'],
        explanation: 'DH produces a shared secret (used to derive symmetric keys). It does not encrypt messages directly and, unauthenticated, it does not tell you who you agreed with.',
        options: [
          { text: 'A shared secret — but no proof of who you share it with.', correct: true, why: 'Exactly.' },
          { text: 'Encryption of a message.', why: 'DH agrees on a key; a cipher like AES-GCM then encrypts with it.' },
          { text: 'A digital signature.', why: 'Signatures are a separate primitive (e.g. ECDSA, Ed25519, ML-DSA).' },
        ],
      }),
    },
    {
      kind: 'puzzle', who: 'orion', puzzle: choice({
        id: 'p5-sig', tags: ['signatures'], difficulty: 2,
        prompt: 'The Frontier Warden signs a decree. What do readers use to verify it, and what does it prove?',
        hints: ['Signing uses the private key. Verifying must be possible for everyone.'],
        explanation: 'Verify with the signer’s PUBLIC key. A valid signature shows the holder of the private key signed exactly this message. It does not make the decree secret.',
        options: [
          { text: 'The Warden’s public key; it proves origin and integrity.', correct: true, why: 'Correct.' },
          { text: 'The Warden’s private key; it proves secrecy.', why: 'Readers never have the private key, and signatures don’t provide secrecy.' },
          { text: 'A shared AES key; it proves origin.', why: 'That would be a MAC (e.g. HMAC). Anyone with the shared key could have made it.' },
        ],
      }),
    },
    {
      kind: 'puzzle', who: 'nyra', puzzle: choice({
        id: 'p5-ecc', tags: ['dh', 'signatures'], difficulty: 2,
        prompt: 'Why do Frontier couriers prefer elliptic-curve keys over RSA keys?',
        hints: ['Compare key sizes at similar security.'],
        explanation: 'ECC reaches similar security with much smaller keys (≈256-bit EC vs ≈3072-bit RSA), meaning faster operations and smaller messages. It is not “unbreakable” — and like RSA it is threatened by large-scale quantum computers.',
        options: [
          { text: 'Smaller keys for comparable security, so it is faster and lighter.', correct: true, why: 'Yes.' },
          { text: 'ECC cannot be broken by any computer, ever.', why: 'No algorithm is unbreakable; Shor’s algorithm on a large quantum computer would break ECC.' },
          { text: 'ECC needs no private key.', why: 'ECC uses private/public key pairs just like RSA.' },
        ],
      }),
    },
    {
      kind: 'choice', id: 'c5-vexa', who: 'vexa', prompt: 'Vexa appears at a Frontier checkpoint. “The Warden’s seal reuses its random value. I reported it once. Do I report it again — or do I just forge his decrees until he listens?”',
      options: [
        { id: 'disclose', label: '“Report it. Give him a deadline. If he ignores it, go public — carefully.”', reply: [{ who: 'vexa', text: 'Coordinated disclosure. Boring. Responsible. …Effective, sometimes. Fine.', mood: 'smirk' }], relationship: { vexa: 2 }, lore: 'l-vexa' },
        { id: 'forge', label: '“Forge one. Prove the danger.”', reply: [{ who: 'vexa', text: 'Tempting. But then I become what they said I was. No.', mood: 'sad' }], relationship: { vexa: 1 } },
        { id: 'ignore', label: '“Not our problem.”', reply: [{ who: 'vexa', text: 'Everything unpatched becomes everyone’s problem. Remember that.', mood: 'angry' }], relationship: { vexa: -1 } },
      ],
    },
    {
      kind: 'investigate', id: 'i5-frontier', title: 'Frontier Waystation',
      text: 'A notice board, half-covered in unsigned announcements.',
      clues: [
        { id: 'folk', label: 'Faded folk-tale', detail: 'Children’s rhyme about Mirror-folk.', lore: 'l-mirror' },
        { id: 'twins', label: 'Citadel chronicle page', detail: 'Blown here from the Citadel.', lore: 'l-twin' },
      ],
    },
    {
      kind: 'dialogue', scene: 'frontier', lines: [
        { who: 'assassin', text: 'Hello, Kael. It’s me — Nyra. Send me your key so I can help.', mood: 'smile' },
        { who: 'nyra', text: 'I’m standing right next to you, you shiny fraud.', mood: 'angry' },
        { who: 'assassin', text: 'Then who can you trust? Every face is mine. Every key could be mine.', mood: 'smirk' },
      ],
    },
    { kind: 'boss', bossId: 'assassin' },
    {
      kind: 'dialogue', scene: 'frontier', lines: [
        { who: 'aura', text: 'The Frontier is sealed and signed. But the sky over the Storm is getting… loud.', mood: 'surprised' },
        { who: 'orion', text: 'The Quantum Storm. If half the stories are true, it can bend the hard problems we just relied on.', mood: 'neutral' },
      ],
    },
  ],
}

// ───────────────────────────── CHAPTER 6 — THE QUANTUM STORM ─────────────────────────────

export const m6a: Mission = {
  id: 'm6-storm',
  chapter: 6,
  title: 'Eye of the Storm',
  summary: 'Lightning that rewrites messages mid-flight. Learn fingerprints, seals and authenticated encryption.',
  objective: 'Understand SHA-256, the avalanche effect, HMAC, and authenticated encryption (AES-GCM).',
  type: 'story',
  requires: ['m5-frontier'],
  xp: 230,
  worldChange: 'Storm-towers broadcast HMAC-sealed weather reports. Tampered bolts are caught and grounded.',
  steps: [
    {
      kind: 'lesson', who: 'aura', title: 'Fingerprints and Seals',
      blocks: [
        { t: 'p', text: 'A cryptographic hash function (like SHA-256, FIPS 180-4) maps any input to a fixed-size digest — 256 bits for SHA-256. It is designed to be one-way (preimage resistant) and collision resistant: finding two inputs with the same digest should be infeasible.' },
        { t: 'widget', widget: 'hashAvalanche' },
        { t: 'list', items: [
          'Avalanche effect: change one character and about half the output bits flip.',
          'Hashes have NO key. Anyone can compute them — so a hash alone cannot prove who sent something.',
          'Collisions must exist (infinitely many inputs, finitely many digests). Security means they are infeasible to FIND.',
        ] },
        { t: 'h', text: 'HMAC' },
        { t: 'p', text: 'HMAC (RFC 2104, FIPS 198-1) combines a hash with a secret key. Only someone holding the key can produce a valid tag, so it proves integrity and authenticity between key holders. It does not hide the message.' },
        { t: 'h', text: 'Authenticated encryption' },
        { t: 'p', text: 'AES-GCM encrypts AND authenticates in one operation. Prefer it (or ChaCha20-Poly1305) over “encrypt, then hope nobody edits it.”' },
        { t: 'callout', tone: 'myth', title: 'Misconception', text: '“Hashing is encryption.” No: encryption is reversible with a key; a hash is not designed to be reversed at all. And for PASSWORDS, a fast hash like plain SHA-256 is wrong — use a slow, salted password hash such as Argon2id, scrypt, bcrypt or PBKDF2.' },
      ],
    },
    {
      kind: 'puzzle', who: 'aura', puzzle: choice({
        id: 'p6-hash-enc', tags: ['hash'], difficulty: 1,
        prompt: 'A storm-tower stores the SHA-256 digest of a weather report. Can the tower “decrypt” the digest to get the report back?',
        hints: ['Is there a key involved in hashing?'],
        explanation: 'No. Hashing is not encryption: it has no key and is designed to be one-way. You can only check a candidate input by hashing it and comparing.',
        options: [
          { text: 'Yes, with the SHA-256 key.', why: 'SHA-256 has no key.' },
          { text: 'No — hashes are one-way; you can only re-hash a guess and compare.', correct: true, why: 'Correct.' },
          { text: 'Yes, by reversing the rounds.', why: 'Hash compression functions are designed to make this infeasible.' },
        ],
      }),
    },
    {
      kind: 'puzzle', who: 'nyra', puzzle: choice({
        id: 'p6-avalanche', tags: ['hash'], difficulty: 2,
        prompt: 'Two reports differ by one letter. Roughly how many of SHA-256’s 256 output bits will differ?',
        hints: ['Try it in the widget above.'],
        explanation: 'About half — around 128 bits — and with no visible relationship. That is the avalanche effect.',
        options: [
          { text: 'About 1 bit', why: 'That would make hashes predictable and useless for integrity.' },
          { text: 'About 128 bits', correct: true, why: 'Yes — roughly half, unpredictably.' },
          { text: 'All 256 bits', why: 'Flipping every bit is just as predictable as flipping none.' },
        ],
      }),
    },
    {
      kind: 'puzzle', who: 'orion', puzzle: choice({
        id: 'p6-hmac', tags: ['hmac'], difficulty: 2,
        prompt: 'A saboteur alters a weather report and recomputes its SHA-256. Why can’t they do the same with an HMAC tag?',
        hints: ['What does HMAC have that a plain hash doesn’t?'],
        explanation: 'HMAC requires the secret key. Without it, the saboteur cannot produce a valid tag for the modified report. A plain hash can be recomputed by anyone.',
        options: [
          { text: 'HMAC uses a secret key they don’t have.', correct: true, why: 'Exactly.' },
          { text: 'HMAC encrypts the report so they can’t read it.', why: 'HMAC provides no confidentiality; the report is still readable.' },
          { text: 'HMAC is longer than SHA-256.', why: 'HMAC-SHA256 tags are the same size. Length isn’t the point.' },
        ],
      }),
    },
    {
      kind: 'puzzle', who: 'vexa', puzzle: choice({
        id: 'p6-passwords', tags: ['hash', 'design'], difficulty: 3,
        prompt: 'The Storm Academy stores student passwords as plain SHA-256 hashes. Vexa smirks. What’s the problem, and the fix?',
        hints: ['Fast hashes are great for files. Are they great for something attackers want to guess billions of times?'],
        explanation: 'SHA-256 is fast, so stolen hashes can be guessed at billions per second, and identical passwords produce identical hashes. Use a slow, memory-hard, salted password hash like Argon2id (or scrypt/bcrypt/PBKDF2 with high cost).',
        options: [
          { text: 'No problem — SHA-256 is irreversible.', why: 'Attackers don’t reverse it; they guess passwords and hash each guess, very fast.' },
          { text: 'Encrypt the passwords with AES instead.', why: 'Then anyone with the key gets every password back. Passwords should be verified, not recoverable.' },
          { text: 'Too fast and unsalted; use a salted, slow password hash such as Argon2id.', correct: true, why: 'Correct.' },
        ],
      }),
    },
    {
      kind: 'puzzle', who: 'aura', puzzle: order({
        id: 'p6-match', tags: ['hash', 'hmac', 'signatures', 'basics'], difficulty: 3,
        prompt: 'Order these from “anyone can compute it, no key” to “needs a private key only one party holds”.',
        items: ['SHA-256 hash (no key)', 'HMAC tag (shared secret key)', 'Digital signature (private key)'],
        hints: ['Hash: nobody needs a key. HMAC: both sides share one. Signature: only the signer has it.'],
        explanation: 'Hash → integrity only against accidents (anyone can recompute). HMAC → integrity + authenticity among key holders. Signature → integrity + authenticity verifiable by anyone with the public key.',
      }),
    },
  ],
}

export const m6b: Mission = {
  id: 'm6-horizon',
  chapter: 6,
  title: 'The Lattice Horizon',
  summary: 'At the storm’s core: the quantum threat. What it breaks, what it doesn’t, and what replaces what it breaks.',
  objective: 'Understand quantum impacts on RSA/ECC, Grover vs Shor, and the post-quantum standards ML-KEM and ML-DSA.',
  type: 'story',
  requires: ['m6-storm'],
  xp: 230,
  worldChange: 'Lattice-light threads through the Storm. New seals hold where the old ones flickered.',
  steps: [
    {
      kind: 'lesson', who: 'orion', title: 'The Quantum Storm, Calmly',
      blocks: [
        { t: 'list', items: [
          'Shor’s algorithm, on a LARGE fault-tolerant quantum computer, would efficiently factor integers and compute discrete logs — breaking RSA, finite-field DH and elliptic-curve cryptography.',
          'Today’s quantum devices are nowhere near the scale needed to break real RSA or ECC keys. But data recorded today could be decrypted later (“harvest now, decrypt later”), so migration matters now.',
          'Grover’s algorithm gives at most a quadratic speed-up for brute-force search. It weakens symmetric keys, but AES-256 retains a large security margin.',
          'Hash functions like SHA-256 are affected only modestly.',
        ] },
        { t: 'h', text: 'Post-quantum cryptography' },
        { t: 'list', items: [
          'ML-KEM (FIPS 203, from CRYSTALS-Kyber): a lattice-based key-encapsulation mechanism for establishing shared keys.',
          'ML-DSA (FIPS 204, from CRYSTALS-Dilithium): a lattice-based digital signature scheme.',
          'SLH-DSA (FIPS 205, from SPHINCS+): a hash-based signature scheme.',
          'Many deployments use HYBRID key exchange (e.g. X25519 + ML-KEM) during the transition.',
        ] },
        { t: 'callout', tone: 'myth', title: 'Misconception', text: '“Quantum computers break all encryption.” They would break today’s public-key algorithms; they do not make AES-256 or SHA-256 useless, and post-quantum algorithms are designed to resist them.' },
      ],
    },
    {
      kind: 'puzzle', who: 'orion', puzzle: choice({
        id: 'p6-shor', tags: ['pqc'], difficulty: 2,
        prompt: 'Which family is most threatened by a large-scale quantum computer running Shor’s algorithm?',
        hints: ['Shor solves factoring and discrete logarithms.'],
        explanation: 'RSA and ECC rely on factoring and discrete logarithms, which Shor solves efficiently. AES and SHA-256 face only Grover’s quadratic speed-up.',
        options: [
          { text: 'AES-256 and SHA-256', why: 'Grover only halves their effective security level; they remain strong at these sizes.' },
          { text: 'RSA and elliptic-curve cryptography', correct: true, why: 'Correct.' },
          { text: 'One-time pads', why: 'A correctly used one-time pad is information-theoretically secure.' },
        ],
      }),
    },
    {
      kind: 'puzzle', who: 'aura', puzzle: choice({
        id: 'p6-mlkem', tags: ['pqc'], difficulty: 2,
        prompt: 'The Storm Council needs a post-quantum way to establish shared keys. Which NIST standard fits?',
        hints: ['“KEM” = key-encapsulation mechanism.'],
        explanation: 'ML-KEM (FIPS 203) establishes shared secrets. ML-DSA (FIPS 204) signs. SHA-256 hashes.',
        options: [
          { text: 'ML-DSA', why: 'ML-DSA is for signatures.' },
          { text: 'ML-KEM', correct: true, why: 'Yes — key encapsulation.' },
          { text: 'SHA-256', why: 'A hash function, not a key-establishment scheme.' },
        ],
      }),
    },
    {
      kind: 'puzzle', who: 'nyra', puzzle: choice({
        id: 'p6-now', tags: ['pqc', 'design'], difficulty: 3,
        prompt: 'If no quantum computer can break RSA-2048 today, why start migrating now?',
        hints: ['Think about secrets that must stay secret for 20 years.'],
        explanation: 'Adversaries can record encrypted traffic today and decrypt it once capable quantum computers exist. Long-lived secrets and slow migrations make early planning prudent.',
        options: [
          { text: 'Harvest-now-decrypt-later: today’s recorded traffic could be decrypted in the future.', correct: true, why: 'Correct.' },
          { text: 'Because RSA is already broken by current quantum computers.', why: 'Current devices are far too small and noisy.' },
          { text: 'There’s no reason; wait until it happens.', why: 'Migration takes years — and recorded data can’t be re-encrypted retroactively.' },
        ],
      }),
    },
    {
      kind: 'investigate', id: 'i6-storm', title: 'Whispers in the Storm',
      text: 'Between thunderclaps, voices. Some are recordings. One is not.',
      clues: [
        { id: 'aura-log', label: 'AURA-7 recovered index', detail: 'A fragment of AURA-7’s own memory.', lore: 'l-storm' },
        { id: 'core7', label: 'AURA-7 core 7', detail: 'A corrupted log only a trusted Guardian can read.', lore: 'l-aura' },
        { id: 'whisper', label: 'A voice you recognise', detail: 'It sounds like the Null King. It sounds… tired.', lore: 'null-5' },
      ],
    },
    {
      kind: 'dialogue', scene: 'storm', lines: [
        { who: 'engine', text: 'PROBABILITY OF YOUR SUCCESS: CALCULATING… EVERY OUTCOME, AT ONCE. I AM EVERY GUESS.', mood: 'angry' },
        { who: 'orion', text: 'It thinks it can break everything. Show it what it can — and can’t — touch.', mood: 'neutral' },
      ],
    },
    { kind: 'boss', bossId: 'engine' },
    {
      kind: 'dialogue', scene: 'storm', lines: [
        { who: 'aura', text: 'The storm is quiet. And the last region on the atlas just turned red.', mood: 'sad' },
        { who: 'null', text: 'Come, little Guardian. You have learned every lock. Now let me show you why none of them mattered.', mood: 'neutral' },
      ],
    },
  ],
}

// ───────────────────────────── CHAPTER 7 — THE LAST KEY ─────────────────────────────

export const m7: Mission = {
  id: 'm7-incident',
  chapter: 7,
  title: 'The Last Key',
  summary: 'The Null King’s final scheme: a breach of the Lumen Relay, the channel every kingdom now trusts. Investigate, then face him.',
  objective: 'Investigate a security incident, find flawed assumptions, choose correct primitives, protect keys and justify a design.',
  type: 'story',
  requires: ['m6-horizon'],
  xp: 400,
  finale: true,
  worldChange: 'The Null Realm’s sky cracks — and light comes through.',
  steps: [
    {
      kind: 'dialogue', scene: 'void', lines: [
        { who: 'null', text: 'The Lumen Relay. Built by your new friends with AES, with RSA, with every lock you love. I walked through it in an afternoon.', mood: 'smirk' },
        { who: 'kael', text: 'You broke AES?', mood: 'surprised' },
        { who: 'null', text: 'I broke nothing. Read the logs, Guardian. Then tell me which lock failed.', mood: 'neutral' },
      ],
    },
    {
      kind: 'investigate', id: 'i7-relay', title: 'Incident Report — Lumen Relay',
      text: 'Fictional incident. Messages between kingdoms were read and altered; user accounts were taken over. Inspect every finding before you answer.',
      clues: [
        { id: 'f1', label: 'F1 · Client application', detail: 'Every client ships with the same AES-256 key, embedded in the app binary to “keep it simple”.' },
        { id: 'f2', label: 'F2 · Message encryption', detail: 'Messages use AES-CTR. The counter starts at 0 every time the app restarts. No authentication tag.' },
        { id: 'f3', label: 'F3 · Account database', detail: 'Passwords are stored as unsalted SHA-256 hashes. The database was copied by an insider.' },
        { id: 'f4', label: 'F4 · Key exchange', detail: 'Clients accept ANY server public key; certificate validation was disabled during testing and never re-enabled.' },
        { id: 'f5', label: 'F5 · “Secret layer”', detail: 'Developers added a custom XOR “obfuscation layer” and kept its design secret, calling it the real protection.' },
      ],
    },
    {
      kind: 'puzzle', who: 'orion', puzzle: choice({
        id: 'p7-hardcoded', tags: ['design'], difficulty: 2,
        prompt: 'F1: the same AES key in every client app. What is the core failure?',
        hints: ['Can you hide a key inside software you give to everyone?'],
        explanation: 'Keys shipped in clients can be extracted. Anyone with the app has the key for everyone’s messages. Use per-session keys from an authenticated key exchange, and protect long-term keys in secure hardware/OS key stores.',
        options: [
          { text: 'AES-256 is too weak.', why: 'AES-256 is fine. The KEY is public, so the algorithm’s strength is irrelevant.' },
          { text: 'Key management: a secret embedded in every copy is not a secret.', correct: true, why: 'Exactly.' },
          { text: 'The key should be 512 bits.', why: 'Length doesn’t help if everyone has it.' },
        ],
      }),
    },
    {
      kind: 'puzzle', who: 'nyra', puzzle: choice({
        id: 'p7-ctr', tags: ['modes', 'design'], difficulty: 3,
        prompt: 'F2: AES-CTR, counter reset on restart, no tag. Which TWO attacks does this enable?',
        hints: ['Same key + same counter = ? And without a tag, can edits be detected?'],
        explanation: 'Reused counters reuse keystream (C₁ ⊕ C₂ = P₁ ⊕ P₂), and with no authentication, attackers can flip bits to alter messages undetected. Fix: AES-GCM (or ChaCha20-Poly1305) with unique nonces and per-session keys.',
        options: [
          { text: 'Keystream reuse reveals plaintext relations; missing authentication allows undetected tampering.', correct: true, why: 'Both correct.' },
          { text: 'AES key recovery and RSA factoring.', why: 'Neither is needed — or possible here.' },
          { text: 'Only a denial of service.', why: 'Far worse: confidentiality and integrity both fail.' },
        ],
      }),
    },
    {
      kind: 'puzzle', who: 'vexa', puzzle: choice({
        id: 'p7-mitm', tags: ['dh', 'signatures', 'design'], difficulty: 2,
        prompt: 'F4: clients accept any server public key. What can the Null King do?',
        hints: ['Remember the Mirror Assassin.'],
        explanation: 'Without verifying the server’s identity, an attacker can present their own key and sit in the middle, decrypting and re-encrypting everything. Certificate validation (authentication of public keys) is essential.',
        options: [
          { text: 'Man-in-the-middle: impersonate the server and read everything.', correct: true, why: 'Exactly.' },
          { text: 'Nothing — the traffic is still encrypted.', why: 'Encrypted to the attacker, who then re-encrypts to the server.' },
          { text: 'Break the server’s private key.', why: 'No need. He simply substitutes his own.' },
        ],
      }),
    },
    {
      kind: 'puzzle', who: 'aura', puzzle: order({
        id: 'p7-fix', tags: ['design'], difficulty: 3,
        prompt: 'Design the repaired Relay message path, from first contact to delivery. Put the steps in order.',
        items: [
          'Verify the server’s certificate (authenticate its public key)',
          'Run an authenticated key exchange (e.g. ECDHE, or hybrid with ML-KEM) to derive fresh session keys',
          'Encrypt each message with AES-GCM using a unique nonce',
          'Recipient verifies the GCM tag before trusting or displaying the message',
        ],
        hints: ['You can’t agree a key safely until you know who you’re talking to.', 'Verification happens at the receiving end, last.'],
        explanation: 'Authenticate → agree fresh keys → authenticated encryption with unique nonces → verify before use. This is, in essence, how TLS 1.3 protects connections.',
      }),
    },
    {
      kind: 'puzzle', who: 'vexa', puzzle: choice({
        id: 'p7-obscurity', tags: ['design', 'basics'], difficulty: 2,
        prompt: 'F5: the secret XOR layer. Vexa asks: “Should we keep it, now that we’ve fixed everything else?”',
        hints: ['What did Kerckhoffs say?'],
        explanation: 'Remove it. Custom secret “obfuscation” adds complexity and false confidence without real security. Use standard, reviewed primitives and keep the secret in the keys.',
        options: [
          { text: 'Keep it — extra secret layers can only help.', why: 'Homemade crypto adds bugs and false confidence; it was trusted as “the real protection.”' },
          { text: 'Remove it — rely on standard, publicly reviewed algorithms and secret keys.', correct: true, why: 'Yes.' },
          { text: 'Publish it, but keep relying on it.', why: 'A XOR with a fixed pattern is trivially broken once examined.' },
        ],
      }),
    },
    {
      kind: 'choice', id: 'finalChoice', who: 'null', prompt: 'The Null King lowers his hand. “I was the Keymaker. I wanted the seals hidden. They outvoted me, and look — every failure you found was human. So: will you hide the Guardians’ designs, or keep them open?”',
      options: [
        { id: 'open', label: '“Open. Hidden designs only hide flaws from the people who’d fix them.”', reply: [{ who: 'null', text: '…That is what they said. I hoped you would say otherwise. I feared you wouldn’t.', mood: 'sad' }], relationship: { vexa: 1, orion: 1 } },
        { id: 'sealed', label: '“Sealed. After all this, secrecy feels safer.”', reply: [{ who: 'null', text: 'Then I have already won, whatever happens next.', mood: 'smirk' }], relationship: { vexa: -2 } },
      ],
    },
    { kind: 'boss', bossId: 'nullking' },
  ],
}

// ───────────────────────────── SIDE MISSIONS — THE CRYPTANALYSIS WASTES ─────────────────────────────

const WASTE_SHIFT = 17
const WASTE_PLAIN = 'THE CROWN IS MADE OF BROKEN SEALS'
const WASTE_CIPHER = caesarEncrypt(WASTE_PLAIN, WASTE_SHIFT)

export const w1: Mission = {
  id: 'w-vexa1',
  chapter: -1,
  title: 'Rust and Reason',
  summary: 'Vexa’s camp in the Wastes — a graveyard of locks that were “unbreakable.” Learn to break them, so you never build one.',
  objective: 'Brute-force a cipher, estimate a keyspace, and think like an attacker.',
  type: 'side',
  requires: ['m2-pillars'],
  xp: 160,
  worldChange: 'Vexa’s campfire burns in the Wastes. The rusted locks around it are labelled with how they failed.',
  steps: [
    {
      kind: 'dialogue', scene: 'wastes', lines: [
        { who: 'vexa', text: 'Welcome to the Wastes. Every lock here was called unbreakable by someone important.', mood: 'smirk' },
        { who: 'vexa', text: 'Rule one of the Wastes: an attacker doesn’t play your game. They play the cheapest game available.', mood: 'neutral' },
      ],
    },
    {
      kind: 'puzzle', who: 'vexa', puzzle: text({
        id: 'pw-brute', tags: ['caesar', 'analysis'], difficulty: 2,
        prompt: 'A rusted lock carries this shift-cipher message. The shift is unknown. Break it — the Caesar Lab’s brute-force view may help.',
        data: WASTE_CIPHER, dataLabel: 'Rusted inscription',
        answers: [WASTE_PLAIN],
        hints: ['Only 25 shifts are possible — try them all.', 'Look for a common word like THE in the output.', `The shift is between 15 and 20.`],
        explanation: `The shift was ${WASTE_SHIFT}. Trying all 25 keys takes seconds — the entire keyspace is smaller than this sentence.`,
      }),
    },
    {
      kind: 'puzzle', who: 'orion', puzzle: choice({
        id: 'pw-des', tags: ['analysis'], difficulty: 2,
        prompt: 'An old Guardian vault used a 56-bit key (like DES). A modern 128-bit AES key has how many times more possible keys?',
        hints: ['Each extra bit doubles the keyspace.', '128 − 56 = 72'],
        explanation: '2¹²⁸ / 2⁵⁶ = 2⁷² ≈ 4.7 × 10²¹ times more keys. DES was publicly brute-forced in the late 1990s; AES-128 brute force is far beyond any foreseeable computer.',
        options: [
          { text: 'About 2.3 times (128 ÷ 56)', why: 'Keyspace grows exponentially with bits, not linearly.' },
          { text: '2⁷² ≈ 4.7 × 10²¹ times', correct: true, why: 'Correct — each bit doubles it.' },
          { text: '72 times', why: '72 is the difference in bits; the ratio is 2⁷².' },
        ],
      }),
    },
    {
      kind: 'puzzle', who: 'vexa', puzzle: choice({
        id: 'pw-cheapest', tags: ['analysis', 'design'], difficulty: 2,
        prompt: 'A vault uses AES-256, but the passphrase is the owner’s pet’s name. What would an attacker do?',
        hints: ['Which is smaller: 2²⁵⁶ keys, or a list of common pet names?'],
        explanation: 'Attack the passphrase, not AES. A dictionary of names is tiny. Keys derived from human-chosen secrets are only as strong as those secrets — and need a slow key-derivation function.',
        options: [
          { text: 'Brute-force all 2²⁵⁶ AES keys.', why: 'Hopeless — and unnecessary.' },
          { text: 'Guess likely passphrases from a dictionary.', correct: true, why: 'Exactly — the cheapest game.' },
          { text: 'Give up; AES-256 is unbreakable.', why: 'Nothing is unbreakable; the weakest link here isn’t AES.' },
        ],
      }),
    },
    {
      kind: 'choice', id: 'cw-trust', who: 'vexa', prompt: 'Vexa removes her mask for a moment. “I was exiled for being right. Do you think I should forgive them?”',
      options: [
        { id: 'forgive', label: '“Not forgive. But help anyway — for the people who didn’t exile you.”', reply: [{ who: 'vexa', text: 'That’s… a better answer than I had.', mood: 'smile' }], relationship: { vexa: 2 } },
        { id: 'anger', label: '“Your anger is fair. Use it to make them listen.”', reply: [{ who: 'vexa', text: 'Anger is a fuel. It also burns the engine. Noted.', mood: 'neutral' }], relationship: { vexa: 1 } },
      ],
    },
    {
      kind: 'investigate', id: 'iw-camp', title: 'Vexa’s Camp',
      text: 'Papers weighted with rusted padlocks.',
      clues: [
        { id: 'schism', label: 'Burnt council page', detail: 'Rescued from the Archive fires.', lore: 'null-2' },
        { id: 'exile', label: 'Exile record', detail: 'Vexa’s own exile record.', lore: 'l-vexa' },
      ],
    },
  ],
}

const FN = 3233n
const FACT = factorToy(FN)!

export const w2: Mission = {
  id: 'w-vexa2',
  chapter: -1,
  title: 'The Wastes Remember',
  summary: 'Vexa takes you to the crown’s birthplace: a field of shattered secret seals.',
  objective: 'Threat-model a system, break toy RSA by factoring, and see why secret designs fail.',
  type: 'side',
  requires: ['w-vexa1', 'm3-modes'],
  xp: 200,
  worldChange: 'The shattered seals are catalogued. Vexa’s map of failures becomes the Guardians’ new training manual.',
  steps: [
    {
      kind: 'lesson', who: 'vexa', title: 'Threat Modelling',
      blocks: [
        { t: 'p', text: 'Before choosing any algorithm, ask four questions:' },
        { t: 'list', items: [
          'What am I protecting? (assets: messages, keys, identities)',
          'From whom? (adversaries and their capabilities)',
          'What can go wrong? (threats: eavesdropping, tampering, impersonation, key theft)',
          'What will I do about it, and what remains? (controls and residual risk)',
        ] },
        { t: 'callout', tone: 'info', title: 'Responsible practice', text: 'Cryptanalysis is learned on self-made or deliberately provided targets — like everything in CIPHERVERSE. Testing real systems requires explicit authorisation.' },
      ],
    },
    {
      kind: 'puzzle', who: 'vexa', puzzle: text({
        id: 'pw-factor', tags: ['rsa', 'analysis'], difficulty: 3,
        prompt: `A shattered seal published the RSA modulus n = ${FN}. Factor it: find the SMALLER prime factor.`,
        answers: [String(FACT.p)], placeholder: 'A prime number',
        hints: ['Trial division: try odd primes up to √3233 ≈ 56.', 'It is between 50 and 56.'],
        explanation: `${FN} = ${FACT.p} × ${FACT.q}. With the factors, φ and d follow immediately — toy RSA falls in ${FACT.tries} divisions. A 2048-bit modulus has no known efficient classical factoring method.`,
      }),
    },
    {
      kind: 'puzzle', who: 'vexa', puzzle: choice({
        id: 'pw-threat', tags: ['design'], difficulty: 2,
        prompt: 'A healer’s guild wants to send patient notes. Which is the RIGHT first question?',
        hints: ['Algorithms come last.'],
        explanation: 'Threat modelling first: what data, which adversaries, which threats. The right algorithms follow from those answers.',
        options: [
          { text: '“AES-128 or AES-256?”', why: 'Premature. You don’t know the threats yet.' },
          { text: '“What must we protect, from whom, and what could go wrong?”', correct: true, why: 'Yes — threat model first.' },
          { text: '“Can we invent our own cipher?”', why: 'Never the first question — and almost never the answer.' },
        ],
      }),
    },
    {
      kind: 'investigate', id: 'iw-crown', title: 'The Shattered Seals',
      text: 'Glass shards, each etched with fragments of a secret design.',
      clues: [
        { id: 'crown', label: 'A shard shaped like a crown point', detail: 'It hums when you touch it.', lore: 'null-3' },
      ],
    },
    {
      kind: 'choice', id: 'cw-crown', who: 'vexa', prompt: '“The Keymaker’s seals were broken by the first person who looked,” Vexa says. “That person was me. Do you blame me for what he became?”',
      options: [
        { id: 'no', label: '“No. You found the flaw. He chose what to do with it.”', reply: [{ who: 'vexa', text: 'I needed someone else to say it. Thank you, Guardian.', mood: 'smile' }], relationship: { vexa: 2 } },
        { id: 'some', label: '“Maybe you could have told him gently.”', reply: [{ who: 'vexa', text: 'Maybe. Truth delivered badly is still truth. But… maybe.', mood: 'sad' }], relationship: { vexa: 1 } },
      ],
    },
  ],
}

export const w3: Mission = {
  id: 'w-orion',
  chapter: -1,
  title: 'Ten Thousand Years',
  summary: 'Orion revisits the brief he signed — and the wooden door he never checked.',
  objective: 'Distinguish theoretical strength from practical security; practise key management decisions.',
  type: 'side',
  requires: ['m4-divide'],
  xp: 160,
  worldChange: 'The Citadel vault gets a new door — and a key-rotation schedule.',
  steps: [
    {
      kind: 'dialogue', scene: 'citadel', lines: [
        { who: 'orion', text: 'I calculated brute force perfectly. I just calculated the wrong attack.', mood: 'sad' },
      ],
    },
    {
      kind: 'puzzle', who: 'orion', puzzle: choice({
        id: 'po-rotate', tags: ['design'], difficulty: 2,
        prompt: 'Which practice most reduces the damage if a single key is stolen?',
        hints: ['How much data does one key protect?'],
        explanation: 'Use separate keys for separate purposes, rotate them, and prefer ephemeral session keys (forward secrecy) so one stolen key exposes as little as possible.',
        options: [
          { text: 'One master key for everything, but a very long one.', why: 'One theft exposes everything, whatever its length.' },
          { text: 'Key separation, rotation, and ephemeral session keys.', correct: true, why: 'Yes — limit the blast radius.' },
          { text: 'Hide the key in a file with a boring name.', why: 'Obscurity, not protection.' },
        ],
      }),
    },
    {
      kind: 'puzzle', who: 'orion', puzzle: choice({
        id: 'po-random', tags: ['design'], difficulty: 2,
        prompt: 'A junior Guardian generates AES keys with a game’s random-number function seeded by the current time. Problem?',
        hints: ['How many possible seeds are there in one day?'],
        explanation: 'Keys must come from a cryptographically secure RNG (e.g. crypto.getRandomValues). A time-seeded PRNG has a tiny, guessable seed space, so the “256-bit” key may have only a few million real possibilities.',
        options: [
          { text: 'Fine — the key is still 256 bits long.', why: 'Length isn’t entropy. Guess the seed, regenerate the key.' },
          { text: 'Predictable seed ⇒ predictable key. Use a CSPRNG.', correct: true, why: 'Correct.' },
          { text: 'Only a problem on weekends.', why: '…No.' },
        ],
      }),
    },
    {
      kind: 'choice', id: 'co-brief', who: 'orion', prompt: 'Orion holds the old brief. “Should I burn it?”',
      options: [
        { id: 'keep', label: '“Keep it. Pin it on the new vault door.”', reply: [{ who: 'orion', text: 'A reminder that maths is not the whole system. Good. I hate it. Good.', mood: 'smile' }], relationship: { orion: 2 } },
        { id: 'burn', label: '“Burn it. You learned.”', reply: [{ who: 'orion', text: 'Lessons fade. Paper lasts. …Fine, it’s ceremonial.', mood: 'neutral' }], relationship: { orion: 1 } },
      ],
    },
  ],
}

import type { Chapter, Mission, Puzzle } from '../game/types'
import type { PlayerState } from '../game/state'
import { m0, m1a, m1b, m2a, m2b } from './missions-early'
import { m3a, m3b, m4, m5, m6a, m6b, m7, w1, w2, w3 } from './missions-late'
import { BOSSES } from './bosses'
import { REGIONS } from './world'
import { caesarEncrypt, vigenereEncrypt, atbash, transpositionEncrypt } from '../crypto/classical'
import { playfairEncrypt } from '../crypto/playfair'
import { modPow } from '../crypto/publickey'
import { SBOX, hex } from '../crypto/aes'
import { hashString, seededRandom } from '../game/progression'
import { choice, playfairAnswers, text } from './helpers'

export const MISSIONS: Mission[] = [m0, m1a, m1b, m2a, m2b, m3a, m3b, m4, m5, m6a, m6b, m7, w1, w2, w3]
export const missionById = (id: string) => MISSIONS.find((m) => m.id === id)

export const CHAPTERS: Chapter[] = [
  { n: 0, title: 'The Awakening', region: 'archive', topic: 'Plaintext, ciphertext, keys, encryption & decryption', blurb: 'A scavenger, a talking archive, and a key that shouldn’t exist.', missions: ['m0-terminal'], boss: 'sentinel', next: 'Nyra Sol leads you into the Kingdom of Forgotten Letters.' },
  { n: 1, title: 'The Kingdom of Forgotten Letters', region: 'archive', topic: 'Caesar, substitution, frequency analysis, Playfair', blurb: 'A kingdom whose words are being eaten, two letters at a time.', missions: ['m1-oracle', 'm1-square'], boss: 'eater', next: 'The Labyrinth rearranges itself with a repeating key.' },
  { n: 2, title: 'The Labyrinth of Shifting Shadows', region: 'labyrinth', topic: 'Vigenère, transposition, historical cryptanalysis', blurb: 'Corridors that shift by a keyword — and echo.', missions: ['m2-echoes', 'm2-pillars'], boss: 'weaver', next: 'The Iron Forge holds the machine that guards every vault.' },
  { n: 3, title: 'The Iron Forge', region: 'forge', topic: 'AES, block ciphers, rounds, modes of operation', blurb: 'Substitute, shift, mix, key — ten times round.', missions: ['m3-forge', 'm3-modes'], boss: 'colossus', next: 'Two rival kingdoms need a secret without a shared key.' },
  { n: 4, title: 'The Two-Key Divide', region: 'citadel', topic: 'RSA, public & private keys, modular arithmetic', blurb: 'A bridge built from one public lock and one private key.', missions: ['m4-divide'], boss: 'sovereigns', next: 'Mirror-folk wear every face on the Frontier.' },
  { n: 5, title: 'The Elliptic Frontier', region: 'frontier', topic: 'Diffie–Hellman, ECC, signatures, MITM', blurb: 'Agree in public. Prove who you are.', missions: ['m5-frontier'], boss: 'assassin', next: 'The Quantum Storm bends the hard problems themselves.' },
  { n: 6, title: 'The Quantum Storm', region: 'storm', topic: 'SHA-256, HMAC, AES-GCM, post-quantum (ML-KEM, ML-DSA)', blurb: 'Lightning that strikes every possibility.', missions: ['m6-storm', 'm6-horizon'], boss: 'engine', next: 'The Null King waits on his shattered throne.' },
  { n: 7, title: 'The Last Key', region: 'null', topic: 'Real-world secure system design', blurb: 'He broke no algorithm. He broke trust.', missions: ['m7-incident'], boss: 'nullking', next: '' },
]

export const SIDE_MISSIONS = ['w-vexa1', 'w-vexa2', 'w-orion']

export function missionUnlocked(s: PlayerState, m: Mission): boolean {
  return (m.requires ?? []).every((r) => s.missions[r]?.completed)
}

export function missionDone(s: PlayerState, id: string): boolean {
  return !!s.missions[id]?.completed
}

export function chapterStatus(s: PlayerState, c: Chapter): { unlocked: boolean; done: boolean; progress: number } {
  const ms = c.missions.map(missionById).filter(Boolean) as Mission[]
  const doneCount = ms.filter((m) => missionDone(s, m.id)).length + (s.bosses[c.boss]?.defeated ? 1 : 0)
  const total = ms.length + 1
  return { unlocked: missionUnlocked(s, ms[0]), done: doneCount === total, progress: doneCount / total }
}

export function regionStatus(s: PlayerState, regionId: string) {
  const r = REGIONS.find((x) => x.id === regionId)!
  if (regionId === 'wastes') {
    const ms = SIDE_MISSIONS.filter((id) => id.startsWith('w-vexa')).map((id) => missionById(id)!)
    const done = ms.filter((m) => missionDone(s, m.id)).length
    return { unlocked: missionUnlocked(s, ms[0]), done: done === ms.length, progress: done / ms.length }
  }
  const chs = r.chapters.map((n) => CHAPTERS[n])
  const st = chs.map((c) => chapterStatus(s, c))
  return { unlocked: st.some((x) => x.unlocked), done: st.every((x) => x.done), progress: st.reduce((a, x) => a + x.progress, 0) / st.length }
}

/** The next story mission the player should play (for "Continue"). */
export function nextMission(s: PlayerState): Mission | null {
  for (const c of CHAPTERS) for (const id of c.missions) {
    const m = missionById(id)!
    if (!missionDone(s, id) && missionUnlocked(s, m)) return m
  }
  return null
}

export function currentChapter(s: PlayerState): number {
  const m = nextMission(s)
  return m ? m.chapter : 7
}

/** Every puzzle that appears anywhere (for validation tests and practice mode). */
export function allPuzzles(): Puzzle[] {
  const out: Puzzle[] = []
  for (const m of MISSIONS) for (const st of m.steps) if (st.kind === 'puzzle') out.push(st.puzzle)
  for (const b of BOSSES) for (const p of b.phases) out.push(...p.tasks)
  return out
}

// ───────────── Daily challenge: deterministic per date, generated with the real cipher functions ─────────────

const DAILY_WORDS = ['GUARDIAN', 'LANTERN', 'CIPHER', 'ARCHIVE', 'SENTINEL', 'FORGE', 'CITADEL', 'FRONTIER', 'STORM', 'BRIDGE', 'SHADOW', 'MIRROR', 'CROWN', 'SECRET', 'SIGNAL', 'KEYSTONE', 'ORACLE', 'EMBER']
const DAILY_PHRASES = ['THE KEY IS NOT THE LOCK', 'TRUST BUT VERIFY', 'EVERY SECRET HAS A COST', 'THE ARCHIVE REMEMBERS', 'LIGHT THE LAST LANTERN', 'NO NONCE TWICE', 'GUARD THE PRIVATE KEY', 'THE CROWN WAS GLASS', 'PATTERNS BETRAY SECRETS', 'OPEN DESIGNS ENDURE']

export function dailyChallenge(date: string): Puzzle[] {
  const rnd = seededRandom(hashString('daily:' + date))
  const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)]
  const phrase = pick(DAILY_PHRASES)
  const shift = 1 + Math.floor(rnd() * 25)
  const vkey = pick(DAILY_WORDS)
  const pkey = pick(DAILY_WORDS)
  const pfPhrase = pick(DAILY_PHRASES.filter((p) => p !== phrase))
  const byte = Math.floor(rnd() * 256)
  const [p, q] = pick([[5n, 11n], [7n, 11n], [3n, 11n], [5n, 13n], [7n, 13n]])
  const m = 2n + BigInt(Math.floor(rnd() * 8))
  const n = p * q
  const e = 3n
  const types = ['caesar', 'vigenere', 'playfair', 'atbash', 'transposition']
  const first = pick(types)
  const puzzles: Puzzle[] = []
  const id = (k: string) => `daily-${date}-${k}`
  if (first === 'caesar') {
    puzzles.push(text({ id: id('c'), tags: ['caesar', 'analysis'], difficulty: 2, prompt: 'Break today’s shift cipher. The shift is unknown.', data: caesarEncrypt(phrase, shift), dataLabel: 'Intercept', answers: [phrase], hints: ['Brute force: there are only 25 shifts.', `The shift is ${shift}.`], explanation: `Shift ${shift}: “${phrase}”.`, widget: 'caesarWheel', widgetProps: { shift: 0, interactive: true, sample: caesarEncrypt(phrase, shift) } }))
  } else if (first === 'vigenere') {
    puzzles.push(text({ id: id('v'), tags: ['vigenere'], difficulty: 2, prompt: `Decrypt today’s Vigenère intercept with the key “${vkey}”.`, data: vigenereEncrypt(phrase, vkey), dataLabel: 'Intercept', answers: [phrase], hints: ['Shift each letter back by its key letter (A=0).'], explanation: `“${phrase}”.`, widget: 'vigenereAlign', widgetProps: { text: vigenereEncrypt(phrase, vkey), keyword: vkey, decrypt: true } }))
  } else if (first === 'playfair') {
    const c = playfairEncrypt(pfPhrase, pkey)
    puzzles.push(text({ id: id('p'), tags: ['playfair'], difficulty: 3, prompt: `Decrypt today’s Playfair intercept (key “${pkey}”, I/J merged).`, data: c.match(/.{2}/g)!.join(' '), dataLabel: 'Intercept', answers: playfairAnswers(pfPhrase, pkey), hints: ['Row → left, column → up, rectangle → swap columns.'], explanation: `“${pfPhrase}”.`, widget: 'playfairSquare', widgetProps: { keyword: pkey } }))
  } else if (first === 'atbash') {
    puzzles.push(text({ id: id('a'), tags: ['substitution'], difficulty: 1, prompt: 'Decode today’s mirror-alphabet (Atbash) message.', data: atbash(phrase), dataLabel: 'Intercept', answers: [phrase], hints: ['A↔Z, B↔Y, C↔X…'], explanation: `“${phrase}”. Atbash has no key, so it offers no real secrecy.` }))
  } else {
    const key = pick(['KEY', 'WALL', 'GATE', 'TOWER'])
    const c = transpositionEncrypt(phrase, key)
    puzzles.push(text({ id: id('t'), tags: ['transposition'], difficulty: 3, prompt: `Decrypt today’s columnar transposition (key “${key}”, padding X).`, data: c, dataLabel: 'Intercept', answers: [phrase, phrase.replace(/\s/g, '') + 'X'.repeat((key.length - (phrase.replace(/\s/g, '').length % key.length)) % key.length)], hints: [`Sort the key letters to find the column read order. There are ${c.length / key.length} rows.`], explanation: `“${phrase}”.` }))
  }
  puzzles.push(text({ id: id('s'), tags: ['aes'], difficulty: 2, prompt: `AES S-box lookup: S(0x${hex(byte)}) = ?`, answers: [hex(SBOX[byte]).toUpperCase()], placeholder: 'Two hex digits', hints: [`Row ${hex(byte)[0]}, column ${hex(byte)[1]} of the S-box in the AES Lab.`], explanation: `S(0x${hex(byte)}) = 0x${hex(SBOX[byte])}.`, widget: 'aesMini', widgetProps: { sbox: byte } }))
  puzzles.push(text({ id: id('r'), tags: ['rsa'], difficulty: 2, prompt: `Toy RSA: n = ${n} (= ${p}×${q}), e = ${e}. Encrypt m = ${m}: c = mᵉ mod n.`, answers: [String(modPow(m, e, n))], placeholder: 'A number', hints: [`${m}³ = ${m ** 3n}. Take the remainder mod ${n}.`], explanation: `${m}³ = ${m ** 3n} ≡ ${modPow(m, e, n)} (mod ${n}).` }))
  const concept = pick([
    choice({ id: id('k1'), tags: ['hmac'], difficulty: 1, prompt: 'Which provides message authenticity between two parties sharing a secret key?', hints: ['Keyed hash.'], explanation: 'HMAC.', options: [{ text: 'HMAC', correct: true, why: 'Correct.' }, { text: 'SHA-256 alone', why: 'No key — anyone can compute it.' }, { text: 'Base64', why: 'Encoding, not cryptography.' }] }),
    choice({ id: id('k2'), tags: ['modes'], difficulty: 1, prompt: 'In AES-GCM, what must never repeat under the same key?', hints: ['“Number used once.”'], explanation: 'The nonce (IV).', options: [{ text: 'The nonce', correct: true, why: 'Correct.' }, { text: 'The plaintext', why: 'Plaintexts can repeat safely when nonces are unique.' }, { text: 'The tag length', why: 'Tag length is fixed.' }] }),
    choice({ id: id('k3'), tags: ['basics'], difficulty: 1, prompt: 'Base64 is…', hints: ['Does it use a key?'], explanation: 'An encoding — reversible by anyone, no key.', options: [{ text: 'An encoding', correct: true, why: 'Correct.' }, { text: 'Encryption', why: 'No key means no secrecy.' }, { text: 'A hash', why: 'Base64 is reversible.' }] }),
    choice({ id: id('k4'), tags: ['signatures'], difficulty: 1, prompt: 'A digital signature is verified with…', hints: ['Everyone must be able to verify.'], explanation: 'The signer’s public key.', options: [{ text: 'The signer’s public key', correct: true, why: 'Correct.' }, { text: 'The signer’s private key', why: 'Private keys sign; they’re never shared.' }, { text: 'A shared AES key', why: 'That would be a MAC.' }] }),
  ])
  puzzles.push(concept)
  return puzzles
}

/**
 * Derived progression: achievements, skill unlocks, costumes, titles, endings.
 * Everything here is a pure function of PlayerState.
 */
import type { PlayerState } from './state'
import type { Achievement, SkillNode, SkillTreeId } from './types'
import { levelFromXp, rankFor } from './progression'

type Pred = (s: PlayerState) => boolean

const m = (s: PlayerState, k: keyof PlayerState['mastery']) => s.mastery[k] ?? 0
const done = (s: PlayerState, id: string) => !!s.missions[id]?.completed
const beat = (s: PlayerState, id: string) => !!s.bosses[id]?.defeated

export const ACHIEVEMENTS: (Achievement & { test: Pred })[] = [
  { id: 'awakened', name: 'The Last Key', desc: 'Awaken the Guardian protocol.', icon: 'key', test: (s) => s.created },
  { id: 'first-light', name: 'First Light', desc: 'Restore the damaged terminal in the Forgotten Archive.', icon: 'sparkles', test: (s) => done(s, 'm0-terminal') },
  { id: 'sentinel', name: 'Sentinel Silenced', desc: 'Defeat the Broken Sentinel.', icon: 'shield', test: (s) => beat(s, 'sentinel') },
  { id: 'letter-eater', name: 'Square Breaker', desc: 'Defeat the Letter Eater with the Playfair square.', icon: 'grid', test: (s) => beat(s, 'eater') },
  { id: 'echo', name: 'Echo Cancelled', desc: 'Defeat the Echo Weaver.', icon: 'waves', test: (s) => beat(s, 'weaver') },
  { id: 'colossus', name: 'Forge-Heart', desc: 'Defeat the Iron Colossus.', icon: 'cog', test: (s) => beat(s, 'colossus') },
  { id: 'sovereigns', name: 'Bridge of Two Keys', desc: 'Defeat the Twin Sovereigns.', icon: 'key-round', test: (s) => beat(s, 'sovereigns') },
  { id: 'assassin', name: 'No Mirror Lies', desc: 'Defeat the Mirror Assassin.', icon: 'scan-eye', test: (s) => beat(s, 'assassin') },
  { id: 'engine', name: 'Storm Breaker', desc: 'Defeat the Probability Engine.', icon: 'zap', test: (s) => beat(s, 'engine') },
  { id: 'null', name: 'The Crown Falls', desc: 'Defeat the Null King.', icon: 'crown', test: (s) => beat(s, 'nullking') },
  { id: 'flawless', name: 'Flawless Logic', desc: 'Win any boss battle with 100% accuracy.', icon: 'target', test: (s) => Object.values(s.bosses).some((b) => b.defeated && b.bestAccuracy >= 1) },
  { id: 'no-hints', name: 'Unassisted', desc: 'Solve 10 puzzles on the first try.', icon: 'brain', test: (s) => s.stats.firstTry >= 10 },
  { id: 'humble', name: 'Wise Enough to Ask', desc: 'Use a hint from Aura-7. Asking is part of learning.', icon: 'lightbulb', test: (s) => s.stats.hints >= 1 },
  { id: 'persist', name: 'Failure Is Data', desc: 'Make 10 mistakes and keep going.', icon: 'rotate-ccw', test: (s) => s.stats.mistakes >= 10 },
  { id: 'labrat', name: 'Lab Rat', desc: 'Experiment in 5 different labs.', icon: 'flask-conical', test: (s) => s.stats.labs.length >= 5 },
  { id: 'all-labs', name: 'Archivist of Every Engine', desc: 'Experiment in every lab.', icon: 'library', test: (s) => s.stats.labs.length >= 9 },
  { id: 'lore5', name: 'Fragment Seeker', desc: 'Collect 5 lore fragments.', icon: 'scroll', test: (s) => s.lore.length >= 5 },
  { id: 'lore-all', name: 'The Whole Truth', desc: 'Collect every lore fragment.', icon: 'book-open', hidden: true, test: (s) => s.lore.length >= LORE_COUNT },
  { id: 'daily3', name: 'Ritual of Three', desc: 'Complete daily challenges on 3 different days.', icon: 'calendar', test: (s) => s.daily.done.length >= 3 },
  { id: 'lvl5', name: 'Glyph Reader', desc: 'Reach level 5.', icon: 'trending-up', test: (s) => levelFromXp(s.xp) >= 5 },
  { id: 'lvl10', name: 'Keybearer Ascendant', desc: 'Reach level 10.', icon: 'star', test: (s) => levelFromXp(s.xp) >= 10 },
  { id: 'trust-vexa', name: 'The Enemy of My Enemy', desc: 'Earn Vexa Rune’s trust.', icon: 'venetian-mask', hidden: true, test: (s) => (s.relationships.vexa ?? 0) >= 4 },
  { id: 'kerckhoffs', name: 'Kerckhoffs Was Right', desc: 'Refuse to rely on a secret algorithm.', icon: 'scale', hidden: true, test: (s) => s.flags.kerckhoffs === true },
  { id: 'secret-ending', name: 'The Keymaker’s Truth', desc: 'Discover the secret ending.', icon: 'eye', hidden: true, test: (s) => s.ending === 'truth' },
]

/** Lore count is set by the content module to avoid a circular import. */
let LORE_COUNT = 99
export function setLoreCount(n: number) { LORE_COUNT = n }

export const SKILL_TREES: Record<SkillTreeId, { name: string; color: string; blurb: string }> = {
  classical: { name: 'Classical Ciphers', color: '#ffb547', blurb: 'Letters, shifts and squares — the roots of the craft.' },
  symmetric: { name: 'Symmetric Encryption', color: '#22e4ff', blurb: 'One shared key, rounds of transformation.' },
  publickey: { name: 'Public-Key Cryptography', color: '#b77bff', blurb: 'Two keys, one hard mathematical problem.' },
  hashing: { name: 'Hashing & Authentication', color: '#4dffb8', blurb: 'Integrity, fingerprints and proofs of origin.' },
  analysis: { name: 'Cryptanalysis', color: '#ff3d6e', blurb: 'Think like the attacker to defend like a Guardian.' },
  design: { name: 'Secure System Design', color: '#f4f6ff', blurb: 'Algorithms are parts. Systems are what get attacked.' },
}

export const SKILLS: (SkillNode & { test: Pred })[] = [
  // Classical
  { id: 'c1', tree: 'classical', tier: 1, name: 'Shift Sense', desc: 'Read Caesar shifts at a glance.', req: 'Caesar mastery 15', test: (s) => m(s, 'caesar') >= 15 },
  { id: 'c2', tree: 'classical', tier: 2, name: 'Playfair Novice', desc: 'Build a 5×5 key square from any keyword.', req: 'Playfair mastery 15', test: (s) => m(s, 'playfair') >= 15 },
  { id: 'c3', tree: 'classical', tier: 3, name: 'Pattern Reader', desc: 'Apply the row, column and rectangle rules fluently.', req: 'Playfair mastery 40', test: (s) => m(s, 'playfair') >= 40 },
  { id: 'c4', tree: 'classical', tier: 4, name: 'Square Breaker', desc: 'Defeat the Letter Eater.', req: 'Defeat the Letter Eater', test: (s) => beat(s, 'eater') },
  { id: 'c5', tree: 'classical', tier: 5, name: 'Polyalphabetic Adept', desc: 'Wield Vigenère and see its repeating key.', req: 'Vigenère mastery 40', test: (s) => m(s, 'vigenere') >= 40 },
  // Symmetric
  { id: 's1', tree: 'symmetric', tier: 1, name: 'AES Apprentice', desc: 'Know AES is a 128-bit block cipher with 128/192/256-bit keys.', req: 'AES mastery 10', test: (s) => m(s, 'aes') >= 10 },
  { id: 's2', tree: 'symmetric', tier: 2, name: 'State Manipulator', desc: 'Perform SubBytes, ShiftRows, MixColumns and AddRoundKey.', req: 'AES mastery 35', test: (s) => m(s, 'aes') >= 35 },
  { id: 's3', tree: 'symmetric', tier: 3, name: 'Round Architect', desc: 'Sequence the full AES round structure.', req: 'Defeat the Iron Colossus', test: (s) => beat(s, 'colossus') },
  { id: 's4', tree: 'symmetric', tier: 4, name: 'Mode Weaver', desc: 'Choose modes, IVs and nonces safely.', req: 'Modes mastery 30', test: (s) => m(s, 'modes') >= 30 },
  { id: 's5', tree: 'symmetric', tier: 5, name: 'Symmetric Systems Master', desc: 'AES and modes both at Adept level.', req: 'AES 60 + Modes 60', test: (s) => m(s, 'aes') >= 60 && m(s, 'modes') >= 60 },
  // Public key
  { id: 'p1', tree: 'publickey', tier: 1, name: 'Modular Mind', desc: 'Think in clock arithmetic.', req: 'RSA mastery 10', test: (s) => m(s, 'rsa') >= 10 },
  { id: 'p2', tree: 'publickey', tier: 2, name: 'Keysmith', desc: 'Generate a toy RSA key pair by hand.', req: 'RSA mastery 35', test: (s) => m(s, 'rsa') >= 35 },
  { id: 'p3', tree: 'publickey', tier: 3, name: 'Twin-Key Diplomat', desc: 'Defeat the Twin Sovereigns.', req: 'Defeat the Twin Sovereigns', test: (s) => beat(s, 'sovereigns') },
  { id: 'p4', tree: 'publickey', tier: 4, name: 'Shared-Secret Alchemist', desc: 'Agree on keys over an open channel.', req: 'Key-exchange mastery 30', test: (s) => m(s, 'dh') >= 30 },
  { id: 'p5', tree: 'publickey', tier: 5, name: 'Signature Sage', desc: 'Separate signing, encryption and key exchange.', req: 'Signatures mastery 30 + defeat the Mirror Assassin', test: (s) => m(s, 'signatures') >= 30 && beat(s, 'assassin') },
  // Hashing
  { id: 'h1', tree: 'hashing', tier: 1, name: 'Fingerprinter', desc: 'Hashes are one-way digests, not encryption.', req: 'Hash mastery 10', test: (s) => m(s, 'hash') >= 10 },
  { id: 'h2', tree: 'hashing', tier: 2, name: 'Avalanche Caller', desc: 'Predict the avalanche effect.', req: 'Hash mastery 30', test: (s) => m(s, 'hash') >= 30 },
  { id: 'h3', tree: 'hashing', tier: 3, name: 'Seal of Origin', desc: 'Use HMAC for authenticity with a shared key.', req: 'HMAC mastery 20', test: (s) => m(s, 'hmac') >= 20 },
  { id: 'h4', tree: 'hashing', tier: 4, name: 'Storm Breaker', desc: 'Defeat the Probability Engine.', req: 'Defeat the Probability Engine', test: (s) => beat(s, 'engine') },
  { id: 'h5', tree: 'hashing', tier: 5, name: 'Post-Quantum Scout', desc: 'Know where ML-KEM and ML-DSA fit.', req: 'PQC mastery 20', test: (s) => m(s, 'pqc') >= 20 },
  // Analysis
  { id: 'a1', tree: 'analysis', tier: 1, name: 'Frequency Hunter', desc: 'Spot the E in a sea of letters.', req: 'Analysis mastery 10', test: (s) => m(s, 'analysis') >= 10 },
  { id: 'a2', tree: 'analysis', tier: 2, name: 'Keyspace Counter', desc: 'Estimate brute-force cost honestly.', req: 'Analysis mastery 25', test: (s) => m(s, 'analysis') >= 25 },
  { id: 'a3', tree: 'analysis', tier: 3, name: 'Echo Hunter', desc: 'Find Vigenère key length from repeats.', req: 'Defeat the Echo Weaver', test: (s) => beat(s, 'weaver') },
  { id: 'a4', tree: 'analysis', tier: 4, name: 'Cryptanalysis Specialist', desc: 'Complete Vexa’s trials in the Wastes.', req: 'Complete “The Wastes Remember”', test: (s) => done(s, 'w-vexa2') },
  { id: 'a5', tree: 'analysis', tier: 5, name: 'Exploit Perception', desc: 'Analysis mastery at Adept level.', req: 'Analysis mastery 60', test: (s) => m(s, 'analysis') >= 60 },
  // Design
  { id: 'd1', tree: 'design', tier: 1, name: 'Kerckhoffs’ Oath', desc: 'Security lives in the key, not in hiding the algorithm.', req: 'Basics mastery 15', test: (s) => m(s, 'basics') >= 15 },
  { id: 'd2', tree: 'design', tier: 2, name: 'Threat Modeller', desc: 'Name what you protect and from whom.', req: 'Design mastery 15', test: (s) => m(s, 'design') >= 15 },
  { id: 'd3', tree: 'design', tier: 3, name: 'Key Warden', desc: 'Protect, rotate and separate keys.', req: 'Design mastery 35', test: (s) => m(s, 'design') >= 35 },
  { id: 'd4', tree: 'design', tier: 4, name: 'Null Breaker', desc: 'Defeat the Null King.', req: 'Defeat the Null King', test: (s) => beat(s, 'nullking') },
  { id: 'd5', tree: 'design', tier: 5, name: 'Guardian Architect', desc: 'Adept in design and four other disciplines.', req: 'Design 60 + four algorithms at 60', test: (s) => m(s, 'design') >= 60 && Object.values(s.mastery).filter((v) => (v ?? 0) >= 60).length >= 5 },
]

export const COSTUMES: { id: string; name: string; desc: string; colors: { coat: string; armor: string; glow: string }; req: string; test: Pred }[] = [
  { id: 'guardian', name: 'Fractured Guardian', desc: 'Black tactical coat, cracked cyan armor.', colors: { coat: '#10131f', armor: '#1b3a4a', glow: '#22e4ff' }, req: 'Default', test: () => true },
  { id: 'sentinel', name: 'Sentinel’s Ember', desc: 'Forged from the Broken Sentinel’s core.', colors: { coat: '#1a1410', armor: '#4a3214', glow: '#ffb547' }, req: 'Defeat the Broken Sentinel', test: (s) => beat(s, 'sentinel') },
  { id: 'wheatstone', name: 'Wheatstone Regalia', desc: 'Woven with the 5×5 square.', colors: { coat: '#120f1f', armor: '#3a2550', glow: '#ff4fd8' }, req: 'Defeat the Letter Eater', test: (s) => beat(s, 'eater') },
  { id: 'forge', name: 'Forgeplate', desc: 'Hammered in the Iron Forge.', colors: { coat: '#141414', armor: '#3d4652', glow: '#f4f6ff' }, req: 'Defeat the Iron Colossus', test: (s) => beat(s, 'colossus') },
  { id: 'twin', name: 'Twin-Key Mantle', desc: 'Half public, half private.', colors: { coat: '#0d1020', armor: '#2a2060', glow: '#b77bff' }, req: 'Defeat the Twin Sovereigns', test: (s) => beat(s, 'sovereigns') },
  { id: 'storm', name: 'Stormglass', desc: 'Lightning frozen mid-strike.', colors: { coat: '#071814', armor: '#0f4436', glow: '#4dffb8' }, req: 'Defeat the Probability Engine', test: (s) => beat(s, 'engine') },
  { id: 'null', name: 'Crown-Breaker', desc: 'Obsidian taken from the fallen throne.', colors: { coat: '#0a0508', armor: '#3a0a14', glow: '#ff3d6e' }, req: 'Defeat the Null King', test: (s) => beat(s, 'nullking') },
  { id: 'scholar', name: 'Archivist’s Robe', desc: 'For those who read every fragment.', colors: { coat: '#16120a', armor: '#3b3320', glow: '#ffe29a' }, req: 'Collect 5 lore fragments', test: (s) => s.lore.length >= 5 },
]

export function costumeColors(id: string) {
  return (COSTUMES.find((c) => c.id === id) ?? COSTUMES[0]).colors
}

/** Recompute every derived unlock. Idempotent: running twice changes nothing. */
export function evaluateUnlocks(s: PlayerState): PlayerState {
  let changed = false
  const now = Date.now()
  const achievements = { ...s.achievements }
  for (const a of ACHIEVEMENTS) if (!achievements[a.id] && a.test(s)) { achievements[a.id] = now; changed = true }
  const skills = { ...s.skills }
  for (const k of SKILLS) if (!skills[k.id] && k.test(s)) { skills[k.id] = now; changed = true }
  const costumes = [...s.costumes]
  for (const c of COSTUMES) if (!costumes.includes(c.id) && c.test(s)) { costumes.push(c.id); changed = true }
  const title = rankFor(levelFromXp(s.xp))
  if (title !== s.profile.title) changed = true
  if (!changed) return s
  return { ...s, achievements, skills, costumes, profile: { ...s.profile, title } }
}

// ───────────── Endings ─────────────

export const NULL_FRAGMENTS = ['null-1', 'null-2', 'null-3', 'null-4', 'null-5']

export function averageBossAccuracy(s: PlayerState): number {
  const won = Object.values(s.bosses).filter((b) => b.defeated)
  if (!won.length) return 0
  return won.reduce((a, b) => a + b.bestAccuracy, 0) / won.length
}

export interface EndingInfo { id: 'dawn' | 'ash' | 'truth'; name: string; tagline: string }

export const ENDINGS: Record<EndingInfo['id'], EndingInfo> = {
  dawn: { id: 'dawn', name: 'Open Dawn', tagline: 'The Guardians return — and this time, everyone can read the blueprints.' },
  ash: { id: 'ash', name: 'Crown of Ash', tagline: 'The King falls. The habits that made him remain.' },
  truth: { id: 'truth', name: 'The Keymaker’s Truth', tagline: 'The first Guardian never fell. He hid.' },
}

/** Decide the ending from demonstrated mastery and story choices. */
export function determineEnding(s: PlayerState): EndingInfo {
  const hasAllFragments = NULL_FRAGMENTS.every((f) => s.lore.includes(f))
  if (hasAllFragments && (s.relationships.vexa ?? 0) >= 3 && s.flags.finalChoice === 'open') return ENDINGS.truth
  if (s.flags.finalChoice === 'open' && averageBossAccuracy(s) >= 0.7) return ENDINGS.dawn
  return ENDINGS.ash
}

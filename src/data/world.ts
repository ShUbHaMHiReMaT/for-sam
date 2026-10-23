import type { CharacterId, LoreEntry, Region } from '../game/types'
import { setLoreCount } from '../game/meta'

export interface CharacterInfo {
  id: CharacterId
  name: string
  title: string
  role: string
  color: string
  accent: string
  ability: string
  abilityDesc: string
  personality: string
  quote: string
  bio: string
  arc: string
  cryptoLink: string
  playable?: boolean
}

export const CHARACTERS: Record<string, CharacterInfo> = {
  kael: {
    id: 'kael', name: 'Kael Vex', title: 'The Forgotten Guardian', role: 'Protagonist',
    color: '#22e4ff', accent: '#ffb547',
    ability: 'Cipher Adaptation',
    abilityDesc: 'Kael’s gauntlet reshapes itself around whatever algorithm Kael truly understands. No understanding, no power — the gauntlet cannot be bluffed.',
    personality: 'Curious, stubborn, brave, sarcastic when scared.',
    quote: 'If it has a key, it has a story. I just need to read it.',
    bio: 'A scavenger from the outer ruins who never expected to be anything more. Kael found the Last Key half-buried under a collapsed archive and touched it out of habit — scavengers touch everything. The Key touched back.',
    arc: 'From an outsider who trusts confidence to a Guardian who trusts only what can be explained.',
    cryptoLink: 'Represents the learner: every power is earned by understanding a mechanism.',
    playable: true,
  },
  nyra: {
    id: 'nyra', name: 'Nyra Sol', title: 'The Quantum Rogue', role: 'Deuteragonist · Infiltrator',
    color: '#ff4fd8', accent: '#b77bff',
    ability: 'Pattern Sight',
    abilityDesc: 'Nyra sees repetition in ciphertext the way others see colour: repeated digraphs, recurring trigrams, too-even frequencies.',
    personality: 'Brilliant, witty, independent, fearless — and careful never to need anyone.',
    quote: 'Seeing a pattern is easy. Proving there isn’t one? That’s the real heist.',
    bio: 'Nyra grew up breaking the locks of the wealthy towers and selling the secrets back to them. When the Null King’s corruption began, she realised the towers were never secure — she had just been the only one looking.',
    arc: 'Learns the difference between “I found no pattern” and “there is provably no pattern” — the gap between intuition and security proofs.',
    cryptoLink: 'Frequency analysis, Kasiski examination, pattern leakage (ECB), side channels.',
  },
  orion: {
    id: 'orion', name: 'Orion Kai', title: 'The Reluctant Strategist', role: 'Tactician',
    color: '#5aa8ff', accent: '#f4f6ff',
    ability: 'Keyspace Vision',
    abilityDesc: 'Orion perceives the size of the search every lock demands — and how long the universe would need to try every key.',
    personality: 'Calm, analytical, competitive, deadpan.',
    quote: 'A lock is a bet about time. I just check the odds.',
    bio: 'Former First Strategist of the Twin-Key Citadel. Orion calculated that the Citadel’s walls would hold for ten thousand years. They fell in one night — not because the maths was wrong, but because a single private key was left in an unguarded vault.',
    arc: 'Learns that intelligence fails when assumptions are wrong — and that the weakest part of a system is rarely the mathematics.',
    cryptoLink: 'Key sizes, brute-force cost, computational hardness, key management.',
  },
  vexa: {
    id: 'vexa', name: 'Vexa Rune', title: 'The Rogue Cryptographer', role: 'Antihero',
    color: '#ff3d6e', accent: '#1a0a10',
    ability: 'Exploit Perception',
    abilityDesc: 'Vexa sees how a system breaks before she sees how it works. Her mirrored mask reflects the attacker’s view of anything she faces.',
    personality: 'Sarcastic, unpredictable, sharp, morally complicated.',
    quote: 'You call it a vulnerability. I call it the truth arriving early.',
    bio: 'Vexa was a Guardian once — the one who reported a flaw in the royal seals years before the fall. She was exiled for “spreading fear.” When the seals broke exactly where she warned, nobody apologised.',
    arc: 'Tests whether the Guardians can accept criticism — and whether she can forgive them for refusing it.',
    cryptoLink: 'Cryptanalysis, threat modelling, responsible disclosure, Kerckhoffs’s principle.',
  },
  aura: {
    id: 'aura', name: 'AURA-7', title: 'The Archive Intelligence', role: 'Guide · Mentor',
    color: '#4dffb8', accent: '#22e4ff',
    ability: 'Clarity Protocol',
    abilityDesc: 'Translates dense mathematics into plain language. Prefers hints to answers — “because answers expire and understanding doesn’t.”',
    personality: 'Dramatic, funny, occasionally glitchy, quietly wise.',
    quote: 'I have 7 personality cores. Six of them think you’re doing great. The seventh is buffering.',
    bio: 'The last surviving index of the Great Archive, AURA-7 has spent centuries alone reciting cipher manuals to an empty library. It is very, very happy you are here.',
    arc: 'Slowly recovers corrupted memories of the Guardians’ final night as you restore the world.',
    cryptoLink: 'The tutor: definitions, worked examples and the distinction between similar-sounding ideas.',
  },
  null: {
    id: 'null', name: 'The Null King', title: 'Sovereign of the Unkeyed', role: 'Antagonist',
    color: '#ff1f3d', accent: '#0a0508',
    ability: 'Misplaced Trust',
    abilityDesc: 'The Null King breaks nothing. He finds the one thing everyone trusts without checking — then he leans on it.',
    personality: 'Patient, manipulative, philosophical, terrifyingly calm.',
    quote: 'People do not need to break every lock. They only need to find the one that everyone trusts.',
    bio: 'No one remembers his face. Every account of the fall describes a crown of fractured glass and a voice that seemed to come from inside the listener’s own thoughts.',
    arc: 'Each boss is one of his lessons. His defeat demands understanding the difference between an algorithm, a key, an implementation and a system.',
    cryptoLink: 'Weak passwords, key reuse, nonce reuse, unauthenticated channels, security through obscurity.',
  },
}

export const COMPANIONS = ['kael', 'nyra', 'orion', 'vexa', 'aura', 'null'] as const

export const SPEAKER_NAMES: Partial<Record<CharacterId, string>> = {
  kael: 'Kael', nyra: 'Nyra', orion: 'Orion', vexa: 'Vexa', aura: 'AURA-7', null: 'The Null King',
  sentinel: 'Broken Sentinel', eater: 'The Letter Eater', weaver: 'The Echo Weaver', colossus: 'Iron Colossus',
  sovereigns: 'The Twin Sovereigns', assassin: 'Mirror Assassin', engine: 'Probability Engine',
}

export const SPEAKER_COLORS: Partial<Record<CharacterId, string>> = {
  kael: '#22e4ff', nyra: '#ff4fd8', orion: '#5aa8ff', vexa: '#ff3d6e', aura: '#4dffb8', null: '#ff1f3d',
  sentinel: '#ffb547', eater: '#ffb547', weaver: '#b77bff', colossus: '#c9d2e0', sovereigns: '#b77bff', assassin: '#ff4fd8', engine: '#4dffb8',
}

export const REGIONS: Region[] = [
  { id: 'archive', name: 'The Forgotten Archive', epithet: 'Where letters learned to hide', color: '#ffb547', x: 18, y: 66, chapters: [0, 1], guide: 'aura', restored: 'Lanterns relit along the shelves; the Kingdom of Forgotten Letters speaks again.', corrupted: 'Dust and silence. The terminals stutter half-words.' },
  { id: 'labyrinth', name: 'The Shadow Labyrinth', epithet: 'Walls that move with the key', color: '#b77bff', x: 32, y: 38, chapters: [2], guide: 'nyra', restored: 'The corridors hold still. The echoes have gone quiet.', corrupted: 'The maze repeats itself — the same turns, over and over.' },
  { id: 'forge', name: 'The Iron Forge', epithet: 'Rounds of fire and order', color: '#c9d2e0', x: 50, y: 70, chapters: [3], guide: 'orion', restored: 'The great machine turns again: substitute, shift, mix, key.', corrupted: 'Cold furnaces. Gears seized mid-round.' },
  { id: 'citadel', name: 'The Twin-Key Citadel', epithet: 'Two keys, one bridge', color: '#5aa8ff', x: 63, y: 34, chapters: [4], guide: 'orion', restored: 'The bridge between kingdoms glows with a public light.', corrupted: 'The bridge is severed. The rival kingdoms shout across the gap.' },
  { id: 'frontier', name: 'The Elliptic Frontier', epithet: 'Where curves meet', color: '#ff4fd8', x: 79, y: 58, chapters: [5], guide: 'nyra', restored: 'Messengers cross freely — and every message carries a seal.', corrupted: 'Mirror-folk wear every face. No one knows who is speaking.' },
  { id: 'storm', name: 'The Quantum Storm', epithet: 'Probability made weather', color: '#4dffb8', x: 86, y: 26, chapters: [6], guide: 'aura', restored: 'The storm calms into a lattice of slow, steady light.', corrupted: 'Lightning that strikes every possibility at once.' },
  { id: 'wastes', name: 'The Cryptanalysis Wastes', epithet: 'Graveyard of broken locks', color: '#ff3d6e', x: 40, y: 14, chapters: [], guide: 'vexa', restored: 'Vexa’s camp fire burns. The broken locks are labelled — lessons now.', corrupted: 'Rusted seals as far as the eye can see.' },
  { id: 'null', name: 'The Final Null Realm', epithet: 'The throne of misplaced trust', color: '#ff1f3d', x: 66, y: 86, chapters: [7], guide: 'null', restored: 'Dawn over the throne. The crown lies open on the steps.', corrupted: 'A shattered throne under a red sky.' },
]

export const LORE: LoreEntry[] = [
  { id: 'l-origin', title: 'The First Secret', source: 'AURA-7 Recovered Index #0001', character: 'aura', text: 'Before the first kingdom was born, there was a secret. The Guardians believed a secret was a thing. Their founder, the Keymaker, insisted it was a relationship: between a message, a key, and those trusted with it.' },
  { id: 'l-caesar', title: 'The Soldier’s Shift', source: 'Wall carving, Forgotten Archive', text: 'A general once shifted his letters by three and called it safe. It was — against soldiers who could not read. History is full of ciphers that were secure only against the wrong opponent.' },
  { id: 'l-wheatstone', title: 'The Square That Was Named Wrong', source: 'Kingdom of Forgotten Letters, plaque', text: 'The square was invented by one scholar and championed by another, whose name it now bears. In the Cipherverse it is called Playfair still — a reminder that history records who was loudest, not who was first.' },
  { id: 'l-nyra', title: 'Nyra’s First Lock', source: 'Nyra’s journal', character: 'nyra', text: 'The tower lock clicked open on my fourth try. Four. The owner told everyone it had a million combinations. It did. He just always used his birthday.' },
  { id: 'l-orion', title: 'Ten Thousand Years', source: 'Citadel strategy brief', character: 'orion', text: '“Projected brute-force resistance: 10,000 years.” I signed that brief. The vault holding the private key had a wooden door. I never asked about the door.' },
  { id: 'l-vexa', title: 'The Report No One Read', source: 'Exile record of V. Rune', character: 'vexa', text: 'Finding: the royal seal reuses its random value across messages. Impact: anyone collecting two seals can compute the signing key. Recommendation: fix immediately. Status: REJECTED — “Fear-mongering.”' },
  { id: 'l-forge', title: 'Song of the Forge', source: 'Iron Forge work-chant', text: 'Substitute so none can trace, shift the rows out of place, mix the columns, fold the key — ten times round and the block is free. (The chant ends early on the last round: no mixing.)' },
  { id: 'l-twin', title: 'The Twin Sovereigns', source: 'Citadel chronicle', text: 'Two rulers who never met in person established the first public bridge: each published a lock anyone could close, and kept the only key that could open it.' },
  { id: 'l-mirror', title: 'Mirror-folk', source: 'Frontier folklore', text: 'They wear the face of whoever you expect. They cannot forge a seal — so on the Frontier, a message without a seal is assumed to be a mirror speaking.' },
  { id: 'l-storm', title: 'The Patient Storm', source: 'AURA-7 Recovered Index #4096', character: 'aura', text: 'Some feared the Storm would break every lock at once. It will not. It weakens certain locks — those built on factoring and discrete logarithms — and barely scratches others. The Guardians who planned ahead built new locks from lattices.' },
  { id: 'null-1', title: 'Null Archive I — The Founder', source: 'Hidden index, sealed shelf', text: 'The Keymaker designed every Guardian seal. He wanted them hidden: “If no one knows how the seals work, no one can break them.” The council voted him down and published the designs.' },
  { id: 'null-2', title: 'Null Archive II — The Schism', source: 'Hidden index, burnt page', text: 'The Keymaker left the council. He built his own seals in secret, telling no one how they worked. They were beautiful. They were also, Vexa would later discover, trivially broken.' },
  { id: 'null-3', title: 'Null Archive III — The Crown', source: 'Glyph found in the Wastes', text: 'A crown of fractured glass: the Keymaker’s last secret seal, shattered by the first person who examined it. He wore the pieces. He swore that if openness had beaten him, he would prove that openness could be beaten too.' },
  { id: 'null-4', title: 'Null Archive IV — The Lesson', source: 'Engraving beneath the Colossus', text: 'He never broke AES. He never factored a single modulus. He collected passwords people reused, keys left in public places, nonces repeated out of laziness, and channels no one authenticated. He broke trust, not mathematics.' },
  { id: 'null-5', title: 'Null Archive V — The Name', source: 'Whisper in the Quantum Storm', text: 'The Null King is the Keymaker. He waits for a Guardian who will listen to the reason he fell — and will still choose to keep the blueprints open.' },
  { id: 'l-aura', title: 'AURA-7’s Seventh Core', source: 'Corrupted log', character: 'aura', text: 'Core 7 was never buffering. Core 7 contains the last order of the council: “If a new Guardian awakens, teach. Do not simply answer. A Guardian who only knows answers can be lied to.”' },
]
setLoreCount(LORE.length)

export const loreById = (id: string) => LORE.find((l) => l.id === id)

import type { AlgoId, CharacterId } from './types'
import { dateKey, levelFromXp, masteryGain, nextStreak, puzzleXp } from './progression'
import { evaluateUnlocks } from './meta'

export const SAVE_KEY = 'cipherverse.save.v1'
export const SAVE_VERSION = 1

export interface Settings {
  sound: boolean
  music: boolean
  volume: number // 0..1
  motion: 'system' | 'reduced' | 'full'
  subtitles: 'normal' | 'large'
  textSpeed: 'slow' | 'normal' | 'instant'
  narrator: boolean
  screenShake: boolean
  highContrast: boolean
}

export interface PuzzleRecord { firstTry: boolean; hints: number; at: number }
export interface BossRecord { attempts: number; bestAccuracy: number; defeated: boolean; at?: number; wins: number }

export interface PlayerState {
  version: number
  created: boolean
  profile: { name: string; pronouns: string; costume: string; sigil: string; title: string; createdAt: number }
  xp: number
  mastery: Partial<Record<AlgoId, number>>
  puzzles: Record<string, PuzzleRecord>
  missions: Record<string, { step: number; completed: boolean; completedAt?: number }>
  bosses: Record<string, BossRecord>
  achievements: Record<string, number>
  skills: Record<string, number>
  lore: string[]
  costumes: string[]
  flags: Record<string, string | boolean | number>
  relationships: Partial<Record<CharacterId, number>>
  daily: { last: string | null; streak: number; best: number; done: string[] }
  stats: { solved: number; firstTry: number; hints: number; mistakes: number; labs: string[]; labActions: number; sessions: number; lastVisit: number }
  settings: Settings
  lastRoute: string
  ending: string | null
  introSeen: boolean
}

export const defaultSettings: Settings = {
  sound: true,
  music: true,
  volume: 0.7,
  motion: 'system',
  subtitles: 'normal',
  textSpeed: 'normal',
  narrator: false,
  screenShake: true,
  highContrast: false,
}

export function initialState(): PlayerState {
  return {
    version: SAVE_VERSION,
    created: false,
    profile: { name: 'Kael Vex', pronouns: 'they/them', costume: 'guardian', sigil: 'key', title: 'Unkeyed Wanderer', createdAt: 0 },
    xp: 0,
    mastery: {},
    puzzles: {},
    missions: {},
    bosses: {},
    achievements: {},
    skills: {},
    lore: [],
    costumes: ['guardian'],
    flags: {},
    relationships: { nyra: 0, orion: 0, vexa: 0, aura: 1 },
    daily: { last: null, streak: 0, best: 0, done: [] },
    stats: { solved: 0, firstTry: 0, hints: 0, mistakes: 0, labs: [], labActions: 0, sessions: 0, lastVisit: 0 },
    settings: { ...defaultSettings },
    lastRoute: '/map',
    ending: null,
    introSeen: false,
  }
}

export type Action =
  | { type: 'createProfile'; name: string; pronouns: string; costume: string; sigil: string }
  | { type: 'puzzleSolved'; id: string; tags: AlgoId[]; difficulty: 1 | 2 | 3; firstTry: boolean; hints: number }
  | { type: 'mistake' }
  | { type: 'hintUsed' }
  | { type: 'missionStep'; mission: string; step: number }
  | { type: 'missionComplete'; mission: string; xp: number }
  | { type: 'bossResult'; boss: string; correct: number; attempts: number; won: boolean; xp: number; costume?: string }
  | { type: 'lore'; id: string }
  | { type: 'flag'; key: string; value: string | boolean | number }
  | { type: 'relationship'; deltas: Partial<Record<CharacterId, number>> }
  | { type: 'settings'; patch: Partial<Settings> }
  | { type: 'labAction'; lab: string }
  | { type: 'dailyComplete'; date?: string; xp: number }
  | { type: 'equipCostume'; costume: string }
  | { type: 'route'; path: string }
  | { type: 'introSeen' }
  | { type: 'ending'; id: string }
  | { type: 'session' }
  | { type: 'grantXp'; xp: number }
  | { type: 'reset' }
  | { type: 'import'; state: PlayerState }

function addMastery(m: PlayerState['mastery'], tags: AlgoId[], gain: number): PlayerState['mastery'] {
  const out = { ...m }
  for (const t of tags) out[t] = Math.min(100, (out[t] ?? 0) + gain)
  return out
}

export function coreReducer(s: PlayerState, a: Action): PlayerState {
  switch (a.type) {
    case 'createProfile':
      return {
        ...s,
        created: true,
        profile: { ...s.profile, name: a.name.trim().slice(0, 24) || 'Kael Vex', pronouns: a.pronouns, costume: a.costume, sigil: a.sigil, createdAt: Date.now() },
      }
    case 'puzzleSolved': {
      // Rewards only the first time a puzzle is solved — no farming, no penalty for replaying.
      if (s.puzzles[a.id]) return { ...s, stats: { ...s.stats, solved: s.stats.solved + 1 } }
      return {
        ...s,
        xp: s.xp + puzzleXp(a.difficulty, a.firstTry, a.hints),
        mastery: addMastery(s.mastery, a.tags, masteryGain(a.difficulty, a.firstTry, a.hints)),
        puzzles: { ...s.puzzles, [a.id]: { firstTry: a.firstTry, hints: a.hints, at: Date.now() } },
        stats: { ...s.stats, solved: s.stats.solved + 1, firstTry: s.stats.firstTry + (a.firstTry ? 1 : 0) },
      }
    }
    case 'mistake':
      return { ...s, stats: { ...s.stats, mistakes: s.stats.mistakes + 1 } }
    case 'hintUsed':
      return { ...s, stats: { ...s.stats, hints: s.stats.hints + 1 } }
    case 'missionStep': {
      const cur = s.missions[a.mission] ?? { step: 0, completed: false }
      return { ...s, missions: { ...s.missions, [a.mission]: { ...cur, step: a.step } } }
    }
    case 'missionComplete': {
      const cur = s.missions[a.mission]
      if (cur?.completed) return { ...s, missions: { ...s.missions, [a.mission]: { ...cur, step: 0 } } }
      return { ...s, xp: s.xp + a.xp, missions: { ...s.missions, [a.mission]: { step: 0, completed: true, completedAt: Date.now() } } }
    }
    case 'bossResult': {
      const prev = s.bosses[a.boss] ?? { attempts: 0, bestAccuracy: 0, defeated: false, wins: 0 }
      const acc = a.attempts ? a.correct / a.attempts : 0
      const firstWin = a.won && !prev.defeated
      return {
        ...s,
        xp: s.xp + (firstWin ? a.xp : a.won ? Math.round(a.xp * 0.1) : 0),
        costumes: firstWin && a.costume && !s.costumes.includes(a.costume) ? [...s.costumes, a.costume] : s.costumes,
        bosses: {
          ...s.bosses,
          [a.boss]: {
            attempts: prev.attempts + 1,
            bestAccuracy: a.won ? Math.max(prev.bestAccuracy, acc) : prev.bestAccuracy,
            defeated: prev.defeated || a.won,
            at: firstWin ? Date.now() : prev.at,
            wins: prev.wins + (a.won ? 1 : 0),
          },
        },
      }
    }
    case 'lore':
      return s.lore.includes(a.id) ? s : { ...s, lore: [...s.lore, a.id], xp: s.xp + 15 }
    case 'flag':
      return { ...s, flags: { ...s.flags, [a.key]: a.value } }
    case 'relationship': {
      const r = { ...s.relationships }
      for (const [k, v] of Object.entries(a.deltas)) r[k as CharacterId] = Math.max(-5, Math.min(10, (r[k as CharacterId] ?? 0) + (v ?? 0)))
      return { ...s, relationships: r }
    }
    case 'settings':
      return { ...s, settings: { ...s.settings, ...a.patch } }
    case 'labAction': {
      const labs = s.stats.labs.includes(a.lab) ? s.stats.labs : [...s.stats.labs, a.lab]
      return { ...s, stats: { ...s.stats, labs, labActions: s.stats.labActions + 1 } }
    }
    case 'dailyComplete': {
      const today = a.date ?? dateKey()
      if (s.daily.done.includes(today)) return s
      const streak = nextStreak(s.daily.last, s.daily.streak, today)
      return {
        ...s,
        xp: s.xp + a.xp,
        daily: { last: today, streak, best: Math.max(s.daily.best, streak), done: [...s.daily.done, today].slice(-60) },
      }
    }
    case 'equipCostume':
      return s.costumes.includes(a.costume) ? { ...s, profile: { ...s.profile, costume: a.costume } } : s
    case 'route':
      return s.lastRoute === a.path ? s : { ...s, lastRoute: a.path }
    case 'introSeen':
      return s.introSeen ? s : { ...s, introSeen: true }
    case 'ending':
      return { ...s, ending: a.id, flags: { ...s.flags, [`ending_${a.id}`]: true } }
    case 'session':
      return { ...s, stats: { ...s.stats, sessions: s.stats.sessions + 1, lastVisit: Date.now() } }
    case 'grantXp':
      return { ...s, xp: s.xp + a.xp }
    case 'reset':
      return { ...initialState(), settings: s.settings, introSeen: s.introSeen }
    case 'import':
      return migrate(a.state)
  }
}

/** Full reducer: core transition, then derived unlocks (achievements, skills, costumes, title). */
export function reducer(s: PlayerState, a: Action): PlayerState {
  const next = coreReducer(s, a)
  if (next === s) return s
  return evaluateUnlocks(next)
}

/** Accept older or partial saves without crashing; fill any missing fields with defaults. */
export function migrate(raw: unknown): PlayerState {
  const base = initialState()
  if (!raw || typeof raw !== 'object') return base
  const r = raw as Partial<PlayerState>
  return {
    ...base,
    ...r,
    version: SAVE_VERSION,
    profile: { ...base.profile, ...(r.profile ?? {}) },
    settings: { ...base.settings, ...(r.settings ?? {}) },
    stats: { ...base.stats, ...(r.stats ?? {}) },
    daily: { ...base.daily, ...(r.daily ?? {}) },
    relationships: { ...base.relationships, ...(r.relationships ?? {}) },
    costumes: Array.isArray(r.costumes) && r.costumes.length ? r.costumes : base.costumes,
    lore: Array.isArray(r.lore) ? r.lore : [],
  }
}

export function loadState(storage: Pick<Storage, 'getItem'> | undefined = safeStorage()): PlayerState {
  try {
    const raw = storage?.getItem(SAVE_KEY)
    if (!raw) return initialState()
    return evaluateUnlocks(migrate(JSON.parse(raw)))
  } catch {
    return initialState()
  }
}

export function saveState(s: PlayerState, storage: Pick<Storage, 'setItem'> | undefined = safeStorage()): boolean {
  try {
    storage?.setItem(SAVE_KEY, JSON.stringify(s))
    return true
  } catch {
    return false
  }
}

function safeStorage(): Storage | undefined {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : undefined
  } catch {
    return undefined
  }
}

export const level = (s: PlayerState) => levelFromXp(s.xp)

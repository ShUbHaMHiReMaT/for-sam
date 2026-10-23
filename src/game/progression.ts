/** Pure progression maths — no React, fully unit-tested. */

/** Total XP required to REACH level n (level 1 = 0 XP). Gentle quadratic curve. */
export function xpForLevel(n: number): number {
  if (n <= 1) return 0
  return 50 * (n - 1) * n
}

export function levelFromXp(xp: number): number {
  let lvl = 1
  while (xpForLevel(lvl + 1) <= xp) lvl++
  return lvl
}

export function levelProgress(xp: number): { level: number; into: number; needed: number; pct: number } {
  const level = levelFromXp(xp)
  const base = xpForLevel(level)
  const next = xpForLevel(level + 1)
  const into = xp - base
  const needed = next - base
  return { level, into, needed, pct: Math.min(1, into / needed) }
}

export const RANKS = [
  { level: 1, title: 'Unkeyed Wanderer' },
  { level: 3, title: 'Cipher Initiate' },
  { level: 5, title: 'Glyph Reader' },
  { level: 8, title: 'Keybearer' },
  { level: 11, title: 'Guardian Adept' },
  { level: 15, title: 'Cipher Guardian' },
  { level: 20, title: 'Keeper of the Last Key' },
]

export function rankFor(level: number): string {
  let t = RANKS[0].title
  for (const r of RANKS) if (level >= r.level) t = r.title
  return t
}

/**
 * XP for solving a puzzle. Rewards understanding (first try) but never
 * punishes asking for help below half the base value.
 */
export function puzzleXp(difficulty: 1 | 2 | 3, firstTry: boolean, hintsUsed: number): number {
  const base = difficulty * 20
  const bonus = firstTry ? Math.round(base * 0.5) : 0
  const hintPenalty = Math.min(base / 2, hintsUsed * Math.round(base * 0.15))
  return Math.max(Math.round(base / 2), base + bonus - hintPenalty)
}

/** Mastery gain (0–100 scale) for one puzzle result. */
export function masteryGain(difficulty: 1 | 2 | 3, firstTry: boolean, hintsUsed: number): number {
  const base = 6 + difficulty * 4
  return Math.max(3, Math.round(base * (firstTry ? 1.25 : 0.8) - hintsUsed * 2))
}

/** Boss accuracy = correct answers / attempts; returns 0..1. */
export function accuracy(correct: number, attempts: number): number {
  return attempts ? correct / attempts : 0
}

export function bossGrade(acc: number): 'S' | 'A' | 'B' | 'C' {
  if (acc >= 0.95) return 'S'
  if (acc >= 0.8) return 'A'
  if (acc >= 0.6) return 'B'
  return 'C'
}

export function masteryTier(m: number): { name: string; tier: number } {
  if (m >= 90) return { name: 'Master', tier: 4 }
  if (m >= 60) return { name: 'Adept', tier: 3 }
  if (m >= 30) return { name: 'Practitioner', tier: 2 }
  if (m > 0) return { name: 'Novice', tier: 1 }
  return { name: 'Untrained', tier: 0 }
}

/** Local calendar date key, YYYY-MM-DD. */
export function dateKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function daysBetween(a: string, b: string): number {
  const pa = new Date(a + 'T00:00:00')
  const pb = new Date(b + 'T00:00:00')
  return Math.round((pb.getTime() - pa.getTime()) / 86_400_000)
}

/**
 * Daily streak update. Missing a day resets the CURRENT streak only — best
 * streak, XP and all learning progress are never taken away.
 */
export function nextStreak(lastDate: string | null, streak: number, today: string): number {
  if (!lastDate) return 1
  const d = daysBetween(lastDate, today)
  if (d === 0) return streak
  if (d === 1) return streak + 1
  return 1
}

/** Deterministic PRNG (mulberry32) for daily challenges seeded by date. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

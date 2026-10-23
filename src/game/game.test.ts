import { describe, expect, it } from 'vitest'
import { xpForLevel, levelFromXp, puzzleXp, nextStreak, levelProgress, masteryGain, bossGrade, seededRandom } from './progression'
import { reducer, initialState, migrate, loadState, saveState, SAVE_KEY, type PlayerState } from './state'
import { determineEnding, NULL_FRAGMENTS, evaluateUnlocks } from './meta'
import { MISSIONS, CHAPTERS, allPuzzles, dailyChallenge, missionById, nextMission, missionUnlocked, chapterStatus } from '../data/campaign'
import { BOSSES, bossById } from '../data/bosses'
import { LORE, loreById } from '../data/world'
import { normAnswer } from '../data/helpers'
import { caesarDecrypt, vigenereDecrypt } from '../crypto/classical'
import { playfairDecrypt } from '../crypto/playfair'

describe('progression maths', () => {
  it('level curve is monotonic and consistent', () => {
    expect(xpForLevel(1)).toBe(0)
    for (let l = 1; l < 30; l++) {
      expect(xpForLevel(l + 1)).toBeGreaterThan(xpForLevel(l))
      expect(levelFromXp(xpForLevel(l))).toBe(l)
      expect(levelFromXp(xpForLevel(l + 1) - 1)).toBe(l)
    }
    const p = levelProgress(150)
    expect(p.level).toBe(2)
    expect(p.pct).toBeGreaterThan(0)
    expect(p.pct).toBeLessThanOrEqual(1)
  })
  it('puzzle XP rewards first try but never drops below half base', () => {
    expect(puzzleXp(2, true, 0)).toBeGreaterThan(puzzleXp(2, false, 0))
    for (const d of [1, 2, 3] as const) for (let h = 0; h < 10; h++) expect(puzzleXp(d, false, h)).toBeGreaterThanOrEqual(d * 10)
    expect(masteryGain(3, true, 0)).toBeGreaterThan(masteryGain(1, false, 3))
  })
  it('streaks reset the current streak only', () => {
    expect(nextStreak(null, 0, '2026-01-01')).toBe(1)
    expect(nextStreak('2026-01-01', 1, '2026-01-02')).toBe(2)
    expect(nextStreak('2026-01-02', 2, '2026-01-02')).toBe(2)
    expect(nextStreak('2026-01-02', 5, '2026-01-09')).toBe(1)
  })
  it('grades and PRNG', () => {
    expect(bossGrade(1)).toBe('S')
    expect(bossGrade(0.5)).toBe('C')
    const a = seededRandom(42), b = seededRandom(42)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })
})

describe('reducer', () => {
  const solve = (s: PlayerState, id = 'p0-key') =>
    reducer(s, { type: 'puzzleSolved', id, tags: ['basics'], difficulty: 1, firstTry: true, hints: 0 })

  it('awards XP and mastery once per puzzle (no farming)', () => {
    const s1 = solve(initialState())
    expect(s1.xp).toBeGreaterThan(0)
    expect(s1.mastery.basics).toBeGreaterThan(0)
    const s2 = solve(s1)
    expect(s2.xp).toBe(s1.xp)
    expect(s2.mastery.basics).toBe(s1.mastery.basics)
  })
  it('mission completion grants XP once and unlocks achievements', () => {
    let s = reducer(initialState(), { type: 'createProfile', name: 'Test', pronouns: 'they/them', costume: 'guardian', sigil: 'key' })
    expect(s.achievements.awakened).toBeTruthy()
    s = reducer(s, { type: 'missionComplete', mission: 'm0-terminal', xp: 120 })
    const xp = s.xp
    expect(s.achievements['first-light']).toBeTruthy()
    s = reducer(s, { type: 'missionComplete', mission: 'm0-terminal', xp: 120 })
    expect(s.xp).toBe(xp)
  })
  it('boss result: first win gives full XP + costume; losses never remove progress', () => {
    let s = initialState()
    s = reducer(s, { type: 'bossResult', boss: 'sentinel', correct: 2, attempts: 5, won: false, xp: 150, costume: 'sentinel' })
    expect(s.xp).toBe(0)
    expect(s.bosses.sentinel.defeated).toBe(false)
    s = reducer(s, { type: 'bossResult', boss: 'sentinel', correct: 4, attempts: 4, won: true, xp: 150, costume: 'sentinel' })
    expect(s.xp).toBe(150)
    expect(s.costumes).toContain('sentinel')
    expect(s.achievements.flawless).toBeTruthy()
    s = reducer(s, { type: 'bossResult', boss: 'sentinel', correct: 1, attempts: 4, won: false, xp: 150 })
    expect(s.bosses.sentinel.defeated).toBe(true)
    expect(s.bosses.sentinel.bestAccuracy).toBe(1)
  })
  it('daily complete is once per day and tracks streak', () => {
    let s = reducer(initialState(), { type: 'dailyComplete', date: '2026-03-01', xp: 50 })
    s = reducer(s, { type: 'dailyComplete', date: '2026-03-01', xp: 50 })
    expect(s.xp).toBe(50)
    s = reducer(s, { type: 'dailyComplete', date: '2026-03-02', xp: 50 })
    expect(s.daily.streak).toBe(2)
    s = reducer(s, { type: 'dailyComplete', date: '2026-03-07', xp: 50 })
    expect(s.daily.streak).toBe(1)
    expect(s.daily.best).toBe(2)
  })
  it('lore is collected once, relationships are clamped, costumes must be owned', () => {
    let s = reducer(initialState(), { type: 'lore', id: 'l-origin' })
    s = reducer(s, { type: 'lore', id: 'l-origin' })
    expect(s.lore).toEqual(['l-origin'])
    s = reducer(s, { type: 'relationship', deltas: { vexa: 50 } })
    expect(s.relationships.vexa).toBe(10)
    s = reducer(s, { type: 'equipCostume', costume: 'null' })
    expect(s.profile.costume).toBe('guardian')
  })
  it('evaluateUnlocks is idempotent', () => {
    const s = evaluateUnlocks(solve(initialState()))
    expect(evaluateUnlocks(s)).toBe(s)
  })
  it('reset keeps settings', () => {
    let s = reducer(initialState(), { type: 'settings', patch: { volume: 0.2 } })
    s = solve(s)
    s = reducer(s, { type: 'reset' })
    expect(s.xp).toBe(0)
    expect(s.settings.volume).toBe(0.2)
  })
})

describe('persistence', () => {
  it('round-trips through storage', () => {
    const mem = new Map<string, string>()
    const store = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) }
    let s = reducer(initialState(), { type: 'createProfile', name: 'Nyra', pronouns: 'she/her', costume: 'guardian', sigil: 'eye' })
    s = reducer(s, { type: 'missionStep', mission: 'm1-oracle', step: 3 })
    expect(saveState(s, store)).toBe(true)
    const back = loadState(store)
    expect(back.profile.name).toBe('Nyra')
    expect(back.missions['m1-oracle'].step).toBe(3)
  })
  it('survives corrupt or partial saves', () => {
    expect(loadState({ getItem: () => '{not json' }).xp).toBe(0)
    expect(loadState({ getItem: () => null }).created).toBe(false)
    const m = migrate({ xp: 500, settings: { sound: false } })
    expect(m.xp).toBe(500)
    expect(m.settings.sound).toBe(false)
    expect(m.settings.volume).toBe(0.7)
    expect(m.costumes).toEqual(['guardian'])
  })
  it('handles storage that throws', () => {
    expect(saveState(initialState(), { setItem: () => { throw new Error('quota') } })).toBe(false)
    expect(loadState({ getItem: () => { throw new Error('denied') } }).xp).toBe(0)
    expect(SAVE_KEY).toMatch(/cipherverse/)
  })
})

describe('content integrity', () => {
  it('every puzzle id is unique', () => {
    const ids = allPuzzles().map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
  it('every puzzle is answerable', () => {
    for (const p of allPuzzles()) {
      expect(p.hints.length, p.id).toBeGreaterThan(0)
      expect(p.explanation.length, p.id).toBeGreaterThan(5)
      if (p.kind === 'text') {
        expect(p.answers.length, p.id).toBeGreaterThan(0)
        for (const a of p.answers) expect(normAnswer(a).length, p.id).toBeGreaterThan(0)
      }
      if (p.kind === 'choice') expect(p.options.filter((o) => o.correct).length, p.id).toBe(1)
      if (p.kind === 'order') expect(p.items.length, p.id).toBeGreaterThan(1)
    }
  })
  it('mission references are valid', () => {
    for (const m of MISSIONS) {
      for (const r of m.requires ?? []) expect(missionById(r), `${m.id} requires ${r}`).toBeTruthy()
      for (const st of m.steps) {
        if (st.kind === 'boss') expect(bossById(st.bossId), st.bossId).toBeTruthy()
        if (st.kind === 'investigate') for (const c of st.clues) if (c.lore) expect(loreById(c.lore), c.lore).toBeTruthy()
        if (st.kind === 'choice') for (const o of st.options) if (o.lore) expect(loreById(o.lore), o.lore).toBeTruthy()
      }
    }
    for (const c of CHAPTERS) {
      expect(bossById(c.boss)).toBeTruthy()
      for (const id of c.missions) expect(missionById(id)).toBeTruthy()
    }
    for (const f of NULL_FRAGMENTS) expect(LORE.some((l) => l.id === f)).toBe(true)
  })
  it('every null fragment is findable somewhere', () => {
    const found = new Set<string>()
    for (const m of MISSIONS) for (const st of m.steps) {
      if (st.kind === 'investigate') st.clues.forEach((c) => c.lore && found.add(c.lore))
      if (st.kind === 'choice') st.options.forEach((o) => o.lore && found.add(o.lore))
    }
    for (const f of NULL_FRAGMENTS) expect(found.has(f), f).toBe(true)
    for (const l of LORE) expect(found.has(l.id), l.id).toBe(true)
  })
  it('every boss has at least two phases with tasks', () => {
    for (const b of BOSSES) {
      expect(b.phases.length).toBeGreaterThanOrEqual(2)
      for (const ph of b.phases) expect(ph.tasks.length).toBeGreaterThan(0)
    }
  })
  it('cipher puzzles decrypt to their stated answers', () => {
    const p = allPuzzles().find((x) => x.id === 'p0-signal')!
    expect(p.kind === 'text' && normAnswer(caesarDecrypt(p.data!, 3))).toBe(normAnswer((p as any).answers[0]))
    const w = allPuzzles().find((x) => x.id === 'b2-2')!
    expect(normAnswer(vigenereDecrypt(w.data!, 'LOOMS'))).toBe(normAnswer((w as any).answers[0]))
    const e = allPuzzles().find((x) => x.id === 'b1-4')!
    expect((e as any).answers).toContain(playfairDecrypt(e.data!.replace(/\s/g, ''), 'MONARCHY'))
    const nk = allPuzzles().find((x) => x.id === 'b7-6')!
    expect(normAnswer(vigenereDecrypt(nk.data!, 'GUARDIAN'))).toBe('TRUSTISVERIFIED')
  })
})

describe('campaign flow', () => {
  it('starts at chapter 0 and unlocks in order', () => {
    let s = initialState()
    expect(nextMission(s)?.id).toBe('m0-terminal')
    expect(missionUnlocked(s, missionById('m1-oracle')!)).toBe(false)
    s = reducer(s, { type: 'missionComplete', mission: 'm0-terminal', xp: 100 })
    expect(nextMission(s)?.id).toBe('m1-oracle')
    expect(chapterStatus(s, CHAPTERS[0]).progress).toBeCloseTo(0.5)
  })
  it('daily challenges are deterministic and valid', () => {
    const a = dailyChallenge('2026-10-24')
    const b = dailyChallenge('2026-10-24')
    expect(a.map((p) => p.id)).toEqual(b.map((p) => p.id))
    expect(a.length).toBe(4)
    for (let d = 1; d <= 28; d++) {
      for (const p of dailyChallenge(`2026-02-${String(d).padStart(2, '0')}`)) {
        if (p.kind === 'text') expect(p.answers.length).toBeGreaterThan(0)
        if (p.kind === 'choice') expect(p.options.filter((o) => o.correct).length).toBe(1)
      }
    }
  })
})

describe('endings', () => {
  const base = () => {
    let s = initialState()
    s = reducer(s, { type: 'bossResult', boss: 'nullking', correct: 9, attempts: 10, won: true, xp: 0 })
    return s
  }
  it('open choice + good accuracy → dawn', () => {
    const s = reducer(base(), { type: 'flag', key: 'finalChoice', value: 'open' })
    expect(determineEnding(s).id).toBe('dawn')
  })
  it('sealed choice → ash', () => {
    const s = reducer(base(), { type: 'flag', key: 'finalChoice', value: 'sealed' })
    expect(determineEnding(s).id).toBe('ash')
  })
  it('all null fragments + Vexa trust + open → secret truth ending', () => {
    let s = reducer(base(), { type: 'flag', key: 'finalChoice', value: 'open' })
    for (const f of NULL_FRAGMENTS) s = reducer(s, { type: 'lore', id: f })
    expect(determineEnding(s).id).toBe('dawn')
    s = reducer(s, { type: 'relationship', deltas: { vexa: 3 } })
    expect(determineEnding(s).id).toBe('truth')
  })
})

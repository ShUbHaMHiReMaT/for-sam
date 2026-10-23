import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react'
import { loadState, reducer, saveState, type Action, type PlayerState } from './state'
import type { Toast } from './types'
import { ACHIEVEMENTS, COSTUMES, SKILLS } from './meta'
import { levelFromXp } from './progression'
import { audio, type MusicState, type Sfx } from '../audio/engine'
import { loreById } from '../data/world'

interface GameCtx {
  state: PlayerState
  dispatch: (a: Action) => void
  toasts: Toast[]
  pushToast: (t: Omit<Toast, 'id'>) => void
  dismissToast: (id: number) => void
  reducedMotion: boolean
  sfx: (s: Sfx) => void
  music: (m: MusicState) => void
}

const Ctx = createContext<GameCtx | null>(null)

// Stable identities so effects depending on them don't re-run on every state change.
const playSfx = (s: Sfx) => audio.play(s)
const playMusic = (m: MusicState) => audio.music(m)

function usePrefersReducedMotion() {
  const [v, setV] = useState(() => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    if (typeof matchMedia === 'undefined') return
    const mq = matchMedia('(prefers-reduced-motion: reduce)')
    const fn = () => setV(mq.matches)
    mq.addEventListener?.('change', fn)
    return () => mq.removeEventListener?.('change', fn)
  }, [])
  return v
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, rawDispatch] = useReducer(reducer, undefined, loadState)
  const [toasts, setToasts] = useState<Toast[]>([])
  const prev = useRef(state)
  const toastId = useRef(1)
  const systemReduced = usePrefersReducedMotion()
  const reducedMotion = state.settings.motion === 'reduced' || (state.settings.motion === 'system' && systemReduced)

  const pushToast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = toastId.current++
    setToasts((ts) => [...ts.slice(-3), { ...t, id }])
    window.setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), 5200)
  }, [])
  const dismissToast = useCallback((id: number) => setToasts((ts) => ts.filter((x) => x.id !== id)), [])

  // Derive notifications from state transitions — no component needs to remember to announce unlocks.
  useEffect(() => {
    const p = prev.current
    prev.current = state
    if (p === state) return
    const lp = levelFromXp(p.xp)
    const ln = levelFromXp(state.xp)
    if (ln > lp) {
      pushToast({ kind: 'level', title: `Level ${ln}`, body: `Rank: ${state.profile.title}` })
      audio.play('levelup')
    }
    for (const a of ACHIEVEMENTS) if (state.achievements[a.id] && !p.achievements[a.id]) {
      pushToast({ kind: 'achievement', title: a.name, body: a.desc })
      audio.play('unlock')
    }
    for (const k of SKILLS) if (state.skills[k.id] && !p.skills[k.id]) pushToast({ kind: 'skill', title: `Skill awakened: ${k.name}`, body: k.desc })
    for (const c of COSTUMES) if (state.costumes.includes(c.id) && !p.costumes.includes(c.id)) pushToast({ kind: 'costume', title: `Costume unlocked: ${c.name}`, body: c.desc })
    for (const l of state.lore) if (!p.lore.includes(l)) {
      pushToast({ kind: 'lore', title: 'Lore fragment recovered', body: loreById(l)?.title })
      audio.play('chime')
    }
  }, [state, pushToast])

  // Debounced auto-save.
  useEffect(() => {
    const id = window.setTimeout(() => saveState(state), 250)
    return () => clearTimeout(id)
  }, [state])

  useEffect(() => {
    audio.configure({ sound: state.settings.sound, music: state.settings.music, volume: state.settings.volume })
  }, [state.settings.sound, state.settings.music, state.settings.volume])

  useEffect(() => {
    const root = document.documentElement
    root.dataset.motion = reducedMotion ? 'reduced' : 'full'
    root.dataset.contrast = state.settings.highContrast ? 'high' : 'normal'
    root.dataset.subs = state.settings.subtitles
  }, [reducedMotion, state.settings.highContrast, state.settings.subtitles])

  useEffect(() => {
    rawDispatch({ type: 'session' })
    // Unlock audio on the very first interaction anywhere.
    const unlock = () => audio.unlock()
    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  const value = useMemo<GameCtx>(() => ({
    state,
    dispatch: rawDispatch,
    toasts,
    pushToast,
    dismissToast,
    reducedMotion,
    sfx: playSfx,
    music: playMusic,
  }), [state, toasts, pushToast, dismissToast, reducedMotion])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useGame(): GameCtx {
  const c = useContext(Ctx)
  if (!c) throw new Error('useGame must be used inside <GameProvider>')
  return c
}

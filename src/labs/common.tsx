import { useCallback, useRef, type ReactNode } from 'react'
import { useGame } from '../game/GameContext'

/** Records that the player genuinely experimented in a lab (once per mount). */
export function useLabTracker(lab: string) {
  const { dispatch } = useGame()
  const done = useRef(false)
  return useCallback(() => {
    if (done.current) return
    done.current = true
    dispatch({ type: 'labAction', lab })
  }, [dispatch, lab])
}

export function LabSection({ title, children, kicker, accent = 'var(--color-cyan)', className = '' }: { title: string; kicker?: string; children: ReactNode; accent?: string; className?: string }) {
  return (
    <section className={`panel hud-corners p-4 sm:p-6 ${className}`} style={{ ['--accent' as string]: accent }}>
      {kicker && <div className="hud text-[11px] mb-1" style={{ color: accent }}>{kicker}</div>}
      <h2 className="font-display text-xl text-bright mb-4">{title}</h2>
      {children}
    </section>
  )
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="hud text-[11px] text-mist">{label}</span>
      <div className="mt-1">{children}</div>
      {hint && <span className="text-[11px] text-mist mt-1 block">{hint}</span>}
    </label>
  )
}

export function ErrorNote({ text }: { text: string | null }) {
  if (!text) return null
  return <div className="text-sm text-crimson bg-crimson/10 border border-crimson/30 rounded-lg px-3 py-2 mt-2" role="alert">{text}</div>
}

export function Note({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'warn' }) {
  return <div className={`text-sm rounded-lg px-3 py-2 border ${tone === 'warn' ? 'border-amber/30 bg-amber/5 text-amber/95' : 'border-cyan/20 bg-cyan/5 text-ink'}`}>{children}</div>
}

export function Toggle<T extends string>({ value, options, onChange, label }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg border border-white/10 p-0.5 bg-black/30">
      {options.map((o) => (
        <button key={o.id} role="radio" aria-checked={value === o.id} onClick={() => onChange(o.id)} className={`hud text-[11px] px-3 py-1.5 rounded-md transition ${value === o.id ? 'bg-cyan/15 text-cyan' : 'text-mist hover:text-bright'}`}>{o.label}</button>
      ))}
    </div>
  )
}

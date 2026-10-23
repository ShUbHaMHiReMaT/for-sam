import { useEffect, useRef, useState, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Award, BookOpen, Crown, Shirt, Sparkles, TrendingUp, X, Zap } from 'lucide-react'
import { useGame } from '../game/GameContext'
import type { Toast } from '../game/types'

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'primary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  accent?: string
  silent?: boolean
}

export function Button({ variant = 'default', size = 'md', accent, silent, className = '', style, onClick, onMouseEnter, children, ...rest }: BtnProps) {
  const { sfx } = useGame()
  return (
    <button
      {...rest}
      className={`btn ${variant === 'primary' ? 'btn-primary' : variant === 'ghost' ? 'btn-ghost' : ''} ${size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : ''} ${className}`}
      style={{ ...(accent ? ({ '--accent': accent } as CSSProperties) : {}), ...style }}
      onMouseEnter={(e) => { if (!silent && !rest.disabled) sfx('hover'); onMouseEnter?.(e) }}
      onClick={(e) => { if (!silent) sfx('click'); onClick?.(e) }}
    >
      {children}
    </button>
  )
}

export function Panel({ children, className = '', accent, cut, style, as: As = 'div', ...rest }: { children: ReactNode; className?: string; accent?: string; cut?: boolean; style?: CSSProperties; as?: 'div' | 'section' | 'article' | 'aside' } & Record<string, unknown>) {
  return (
    <As className={`panel hud-corners ${cut ? 'panel-cut' : ''} ${className}`} style={{ ...(accent ? ({ '--accent': accent } as CSSProperties) : {}), ...style }} {...rest}>
      {children}
    </As>
  )
}

export function Bar({ value, color = 'var(--color-cyan)', height = 6, label, className = '' }: { value: number; color?: string; height?: number; label?: string; className?: string }) {
  const pct = Math.max(0, Math.min(1, value)) * 100
  return (
    <div className={`w-full rounded-full bg-white/5 overflow-hidden ${className}`} style={{ height }} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <motion.div
        className="h-full rounded-full"
        style={{ background: `linear-gradient(90deg, color-mix(in oklab, ${color} 60%, transparent), ${color})`, boxShadow: `0 0 12px ${color}` }}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
    </div>
  )
}

export function Modal({ open, onClose, title, children, accent, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; accent?: string; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    ref.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); prev?.focus?.() }
  }, [open, onClose])
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/70 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            ref={ref}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={`panel hud-corners w-full ${wide ? 'max-w-4xl' : 'max-w-lg'} max-h-[88vh] overflow-y-auto p-6 outline-none`}
            style={accent ? ({ '--accent': accent } as CSSProperties) : undefined}
            initial={{ y: 30, scale: 0.97, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <h2 className="hud text-bright text-lg">{title}</h2>
              <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close"><X size={16} /></button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

const TOAST_ICON: Record<Toast['kind'], ReactNode> = {
  achievement: <Award size={18} />, xp: <Zap size={18} />, level: <TrendingUp size={18} />, lore: <BookOpen size={18} />,
  skill: <Sparkles size={18} />, costume: <Shirt size={18} />, info: <Crown size={18} />,
}
const TOAST_COLOR: Record<Toast['kind'], string> = {
  achievement: '#ffb547', xp: '#22e4ff', level: '#22e4ff', lore: '#ffe29a', skill: '#4dffb8', costume: '#ff4fd8', info: '#b77bff',
}

export function Toasts() {
  const { toasts, dismissToast } = useGame()
  return (
    <div className="fixed z-[70] right-3 bottom-3 sm:right-5 sm:bottom-5 flex flex-col gap-2 w-[min(360px,calc(100vw-24px))] pointer-events-none" aria-live="polite">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ x: 80, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 80, opacity: 0 }}
            className="panel pointer-events-auto p-3 pr-9 flex gap-3 items-start relative overflow-hidden"
            style={{ borderColor: `${TOAST_COLOR[t.kind]}66` }}
          >
            <div className="absolute inset-y-0 left-0 w-1" style={{ background: TOAST_COLOR[t.kind] }} />
            <div className="mt-0.5 shrink-0" style={{ color: TOAST_COLOR[t.kind] }}>{TOAST_ICON[t.kind]}</div>
            <div className="min-w-0">
              <div className="hud text-[11px]" style={{ color: TOAST_COLOR[t.kind] }}>{t.kind === 'achievement' ? 'Achievement' : t.kind === 'level' ? 'Level up' : t.kind}</div>
              <div className="text-bright font-semibold text-sm">{t.title}</div>
              {t.body && <div className="text-mist text-xs mt-0.5">{t.body}</div>}
            </div>
            <button className="absolute top-2 right-2 text-mist hover:text-bright" onClick={() => dismissToast(t.id)} aria-label="Dismiss notification"><X size={14} /></button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

/** Typewriter text that respects the text-speed setting and can be completed instantly. */
export function useTypewriter(text: string, speed: 'slow' | 'normal' | 'instant', onTick?: () => void) {
  const [n, setN] = useState(speed === 'instant' ? text.length : 0)
  useEffect(() => {
    if (speed === 'instant') { setN(text.length); return }
    setN(0)
    const ms = speed === 'slow' ? 38 : 18
    let i = 0
    const id = window.setInterval(() => {
      i++
      setN(i)
      if (i % 3 === 0) onTick?.()
      if (i >= text.length) clearInterval(id)
    }, ms)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, speed])
  return { shown: text.slice(0, n), done: n >= text.length, complete: () => setN(text.length) }
}

export function SectionTitle({ kicker, title, sub, accent = 'var(--color-cyan)' }: { kicker?: string; title: string; sub?: string; accent?: string }) {
  return (
    <header className="mb-6">
      {kicker && <div className="hud text-xs mb-2" style={{ color: accent }}>{kicker}</div>}
      <h1 className="font-display text-3xl sm:text-4xl text-bright tracking-wide">{title}</h1>
      {sub && <p className="text-mist mt-2 max-w-2xl">{sub}</p>}
    </header>
  )
}

export function Empty({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="panel p-8 text-center flex flex-col items-center gap-3">
      <div className="text-mist">{icon}</div>
      <div className="hud text-bright">{title}</div>
      <p className="text-mist text-sm max-w-sm">{text}</p>
      {action}
    </div>
  )
}

export function Loading({ label = 'Decrypting…' }: { label?: string }) {
  return (
    <div className="min-h-[50vh] grid place-items-center" role="status">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-2 border-cyan/20" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan animate-spin" />
          <div className="absolute inset-3 rounded-full border border-magenta/40 animate-spin [animation-direction:reverse] [animation-duration:1.6s]" />
        </div>
        <div className="hud text-xs text-cyan anim-pulse">{label}</div>
      </div>
    </div>
  )
}

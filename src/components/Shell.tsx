import { useState, type ReactNode } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Award, BookOpen, CalendarDays, FlaskConical, Map, Menu, Network, Scroll, Settings, Swords, User, Users, Volume2, VolumeX, X, Dumbbell } from 'lucide-react'
import { useGame } from '../game/GameContext'
import { levelProgress } from '../game/progression'
import { Portrait } from './Portrait'
import { Bar } from './ui'

const NAV = [
  { to: '/map', label: 'World Map', icon: Map },
  { to: '/campaign', label: 'Campaign', icon: Swords },
  { to: '/lab', label: 'Labs', icon: FlaskConical },
  { to: '/practice', label: 'Practice', icon: Dumbbell },
  { to: '/encyclopedia', label: 'Encyclopedia', icon: BookOpen },
  { to: '/codex', label: 'Codex', icon: Users },
  { to: '/skills', label: 'Skills', icon: Network },
  { to: '/achievements', label: 'Trophies', icon: Award },
  { to: '/daily', label: 'Daily', icon: CalendarDays },
  { to: '/archives', label: 'Archives', icon: Scroll },
]

export function Shell({ children }: { children: ReactNode }) {
  const { state, dispatch, sfx } = useGame()
  const [open, setOpen] = useState(false)
  const loc = useLocation()
  const navigate = useNavigate()
  const lp = levelProgress(state.xp)
  const focusMode = loc.pathname.startsWith('/mission') || loc.pathname.startsWith('/boss')

  return (
    <div className="min-h-screen bg-world grain">
      <a href="#main" className="skip-link btn btn-sm">Skip to content</a>
      <header className="sticky top-0 z-40 border-b border-white/5 bg-obsidian/75 backdrop-blur-md">
        <div className="max-w-[1400px] mx-auto px-3 sm:px-5 h-14 flex items-center gap-3">
          <button className="lg:hidden btn btn-ghost btn-sm" onClick={() => setOpen(true)} aria-label="Open navigation"><Menu size={18} /></button>
          <button onClick={() => navigate('/map')} className="flex items-center gap-2 shrink-0" aria-label="CIPHERVERSE home">
            <svg viewBox="0 0 64 64" width="26" height="26" aria-hidden="true"><path d="M32 6 54 19v26L32 58 10 45V19z" fill="none" stroke="#22e4ff" strokeWidth="3" /><circle cx="32" cy="28" r="7" fill="none" stroke="#ffb547" strokeWidth="3" /><path d="M32 35v12m0-5h6" stroke="#ffb547" strokeWidth="3" strokeLinecap="round" /></svg>
            <span className="font-display font-black tracking-[0.2em] text-bright text-sm hidden sm:inline">CIPHERVERSE</span>
          </button>
          <nav className="hidden lg:flex items-center gap-0.5 ml-3 overflow-x-auto" aria-label="Main">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} onMouseEnter={() => sfx('hover')} className={({ isActive }) => `hud text-[11px] px-2.5 py-1.5 rounded-md transition-colors whitespace-nowrap ${isActive ? 'text-cyan bg-cyan/10' : 'text-mist hover:text-bright hover:bg-white/5'}`}>
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            {state.created && (
              <button onClick={() => navigate('/profile')} className="flex items-center gap-2 group" aria-label={`Profile: level ${lp.level}`}>
                <div className="hidden sm:block w-28 text-right">
                  <div className="hud text-[10px] text-mist group-hover:text-bright truncate">{state.profile.title}</div>
                  <Bar value={lp.pct} height={4} label="XP progress" />
                </div>
                <div className="relative w-9 h-9 rounded-full overflow-hidden border border-cyan/40 bg-midnight grid place-items-center">
                  <div className="-mt-1"><Portrait id="kael" size={44} costume={state.profile.costume} animated={false} title="Your Guardian" /></div>
                </div>
                <span className="hud text-xs text-cyan">Lv {lp.level}</span>
              </button>
            )}
            <button className="btn btn-ghost btn-sm" onClick={() => dispatch({ type: 'settings', patch: { sound: !state.settings.sound } })} aria-label={state.settings.sound ? 'Mute sound' : 'Unmute sound'} title={state.settings.sound ? 'Mute' : 'Unmute'}>
              {state.settings.sound ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
            <NavLink to="/settings" className="btn btn-ghost btn-sm" aria-label="Settings"><Settings size={16} /></NavLink>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-50 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} />
            <motion.nav className="absolute left-0 top-0 bottom-0 w-72 max-w-[85vw] panel rounded-none p-4 flex flex-col gap-1 overflow-y-auto" initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }} transition={{ type: 'spring', damping: 26, stiffness: 260 }} aria-label="Main">
              <div className="flex items-center justify-between mb-3">
                <span className="font-display tracking-[0.2em] text-bright">CIPHERVERSE</span>
                <button className="btn btn-ghost btn-sm" onClick={() => setOpen(false)} aria-label="Close navigation"><X size={16} /></button>
              </div>
              {[...NAV, { to: '/profile', label: 'Profile & Stats', icon: User }, { to: '/settings', label: 'Settings', icon: Settings }].map((n) => (
                <NavLink key={n.to} to={n.to} onClick={() => setOpen(false)} className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg hud text-xs ${isActive ? 'bg-cyan/10 text-cyan' : 'text-ink hover:bg-white/5'}`}>
                  <n.icon size={16} /> {n.label}
                </NavLink>
              ))}
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>

      <main id="main" className={`max-w-[1400px] mx-auto px-4 sm:px-6 ${focusMode ? 'py-4' : 'py-6 sm:py-8'} pb-24`}>
        <AnimatePresence mode="wait">
          <motion.div key={loc.pathname} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.3 }}>
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}

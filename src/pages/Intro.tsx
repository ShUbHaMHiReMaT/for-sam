import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { BookOpen, ChevronsRight, Headphones, Volume2, VolumeX } from 'lucide-react'
import { GlyphField, type GlyphFieldHandle } from '../components/GlyphField'
import { Awakening, City, FragmentTitle, Throne, VoidStructures } from '../components/IntroScenes'
import { useGame } from '../game/GameContext'
import { audio, speak, stopSpeaking } from '../audio/engine'

type Scene = 'gate' | 'void' | 'golden' | 'betrayal' | 'fall' | 'awaken' | 'rift' | 'title'

interface Cue { t: number; run: () => void }

export default function Intro() {
  const { state, dispatch, reducedMotion } = useGame()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const field = useRef<GlyphFieldHandle>(null)
  const [scene, setScene] = useState<Scene>('gate')
  const [sub, setSub] = useState<string | null>(null)
  const [hud, setHud] = useState<string[]>([])
  const [finalLine, setFinalLine] = useState(false)
  const [travel, setTravel] = useState(false)
  const [redSeals, setRedSeals] = useState(0)
  const [cracks, setCracks] = useState(false)
  const [lightsOut, setLightsOut] = useState(false)
  const [push, setPush] = useState(false)
  const [raised, setRaised] = useState(false)
  const [pulse, setPulse] = useState(false)
  const [eyesOpen, setEyesOpen] = useState(false)
  const [shake, setShake] = useState(0)
  const [flash, setFlash] = useState<string | null>(null)
  const [muted, setMuted] = useState(!state.settings.sound)
  const timers = useRef<number[]>([])
  const narrator = state.settings.narrator

  const say = useCallback((line: string | null) => {
    setSub(line)
    if (line) speak(line.replace(/…/g, '.'), narrator)
  }, [narrator])

  const doShake = useCallback(() => {
    if (reducedMotion || !state.settings.screenShake) return
    setShake((s) => s + 1)
  }, [reducedMotion, state.settings.screenShake])

  const doFlash = (c: string) => {
    if (reducedMotion) return
    setFlash(c)
    window.setTimeout(() => setFlash(null), 180)
  }

  const clear = () => { timers.current.forEach(clearTimeout); timers.current = [] }
  useEffect(() => () => { clear(); stopSpeaking(); audio.music('off') }, [])

  const toTitle = useCallback(() => {
    clear()
    stopSpeaking()
    setSub(null)
    setScene('title')
    field.current?.set({ speed: 0.5, corruption: 0.05, orbit: 0, colors: ['#22e4ff', '#b77bff', '#ffb547'], alpha: 0.8 })
    audio.music('title')
    audio.play('reveal')
    dispatch({ type: 'introSeen' })
  }, [dispatch])

  const start = (withSound: boolean) => {
    // Apply the choice BEFORE the audio context exists, so a silent start is silent from the first frame.
    audio.configure({ sound: withSound, music: state.settings.music, volume: state.settings.volume })
    dispatch({ type: 'settings', patch: { sound: withSound } })
    setMuted(!withSound)
    audio.unlock()
    const F = (p: Parameters<GlyphFieldHandle['set']>[0]) => field.current?.set(p)
    const sfx = audio.play.bind(audio)
    const cues: Cue[] = [
      { t: 0, run: () => { setScene('void'); audio.music('void'); F({ speed: 0.35, alpha: 0.55, colors: ['#22e4ff', '#5b7ca8', '#8fd8ff'], sway: 0.2 }) } },
      { t: 0.4, run: () => sfx('heartbeat') },
      { t: 2.0, run: () => sfx('heartbeat') },
      { t: 2.6, run: () => say('Before the first kingdom was born, there was a secret.') },
      { t: 4.2, run: () => sfx('heartbeat') },
      { t: 6.4, run: () => say(null) },
      { t: 7.0, run: () => { say('Not a secret that could be spoken…'); setTravel(true); F({ speed: 2.6, alpha: 0.85, sway: 0.6 }); sfx('whoosh') } },
      { t: 10.8, run: () => say('…but one that could only be understood by those who knew the key.') },
      { t: 15.2, run: () => { say(null); F({ speed: 9 }); sfx('whoosh') } },
      { t: 16.0, run: () => { setScene('golden'); audio.music('golden'); F({ speed: 0.7, colors: ['#ffe29a', '#22e4ff', '#ffb547'], alpha: 0.5 }); doFlash('#ffe29a') } },
      { t: 17.0, run: () => say('For centuries, the Cipher Guardians protected every memory, every promise, every identity.') },
      { t: 24.2, run: () => say(null) },
      { t: 25.0, run: () => { setScene('betrayal'); audio.music('betrayal') } },
      { t: 26.0, run: () => { setRedSeals(1); sfx('glitch') } },
      { t: 27.4, run: () => { setRedSeals(2); sfx('glitch'); F({ corruption: 0.25 }) } },
      { t: 28.2, run: () => { setRedSeals(3); sfx('rumble') } },
      { t: 28.6, run: () => say('Until someone discovered that the strongest wall…') },
      { t: 31.2, run: () => { setCracks(true); setLightsOut(true); setRedSeals(5); sfx('impact'); doShake(); doFlash('#ff1f3d'); F({ corruption: 0.7, speed: 0.2 }) } },
      { t: 32.6, run: () => { setRedSeals(6); setPush(true); sfx('glitch') } },
      { t: 33.4, run: () => say('…was only as powerful as the secret that protected it.') },
      { t: 38.6, run: () => { say(null); setScene('fall'); audio.music('null'); F({ corruption: 0.95, speed: 0.15, alpha: 0.6 }) } },
      { t: 40.0, run: () => say('The keys were stolen.') },
      { t: 42.6, run: () => { setRaised(true); sfx('impact'); doShake(); field.current?.burst('#ff1f3d'); F({ drift: 4, speed: 1.4 }); say('The Guardians disappeared.') } },
      { t: 45.8, run: () => say('And the world forgot how to trust.') },
      { t: 50.0, run: () => { say(null); setScene('awaken'); audio.music('void'); F({ corruption: 0.25, speed: 0.12, drift: 0, colors: ['#22e4ff', '#4dffb8'], alpha: 0.5 }) } },
      { t: 52.4, run: () => { setPulse(true); sfx('reveal'); field.current?.burst('#22e4ff'); F({ orbit: 1, corruption: 0, alpha: 0.9 }); audio.music('awaken'); doFlash('#22e4ff') } },
      { t: 54.6, run: () => { setHud(['Identity confirmed.']); sfx('type') } },
      { t: 56.0, run: () => { setHud((h) => [...h, 'Cipher compatibility: unknown.']); sfx('type') } },
      { t: 57.4, run: () => { setHud((h) => [...h, 'Guardian protocol: awakened.']); sfx('unlock') } },
      { t: 59.0, run: () => { setEyesOpen(true); sfx('shield') } },
      { t: 60.2, run: () => { setFinalLine(true); sfx('impact'); doShake(); speak('The last key has chosen you.', narrator) } },
      { t: 65.0, run: () => { setScene('rift'); F({ speed: 16, orbit: 0, colors: ['#22e4ff', '#ff4fd8', '#ffffff'] }); sfx('whoosh'); audio.music('title') } },
      { t: 67.6, run: () => toTitle() },
    ]
    clear()
    timers.current = cues.map((c) => window.setTimeout(c.run, c.t * 1000))
  }

  // Allow skipping straight to the title from the Archives replay or for returning players.
  useEffect(() => {
    if (params.get('title') === '1') { audio.unlock(); toTitle() }
  }, [params, toTitle])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && scene !== 'gate' && scene !== 'title') toTitle()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [scene, toTitle])

  const toggleMute = () => {
    const m = !muted
    setMuted(m)
    dispatch({ type: 'settings', patch: { sound: !m } })
  }

  const enter = () => {
    audio.play('impact')
    audio.music('off')
    navigate(state.created ? '/map' : '/create')
  }

  return (
    <div className="fixed inset-0 bg-void overflow-hidden text-bright select-none">
      <motion.div key={shake} className="absolute inset-0" animate={shake ? { x: [0, -10, 8, -6, 4, 0], y: [0, 6, -8, 4, -2, 0] } : undefined} transition={{ duration: 0.5 }}>
        <GlyphField ref={field} reduced={reducedMotion} />
        <AnimatePresence>
          {(scene === 'void') && (
            <motion.div key="void" className="absolute inset-0" exit={{ opacity: 0 }} transition={{ duration: 1.2 }}>
              <VoidStructures travelling={travel && !reducedMotion} />
            </motion.div>
          )}
          {(scene === 'golden' || scene === 'betrayal') && (
            <motion.div key="city" className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.6 }}>
              <City redSeals={redSeals} cracks={cracks} lightsOut={lightsOut} push={push} reduced={reducedMotion} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/40" />
            </motion.div>
          )}
          {scene === 'fall' && (
            <motion.div key="fall" className="absolute inset-0" exit={{ opacity: 0 }} transition={{ duration: 1.4 }}>
              <Throne raised={raised} reduced={reducedMotion} />
            </motion.div>
          )}
          {scene === 'awaken' && (
            <motion.div key="awaken" className="absolute inset-0" exit={{ opacity: 0, scale: reducedMotion ? 1 : 1.4 }} transition={{ duration: 1.2 }}>
              <Awakening pulse={pulse} eyesOpen={eyesOpen} reduced={reducedMotion} />
              <div className="absolute top-[14%] left-1/2 -translate-x-1/2 w-[min(520px,90vw)] font-mono text-sm sm:text-base">
                {hud.map((h, i) => (
                  <motion.div key={h} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="text-cyan text-glow py-1">
                    <span className="text-mist mr-2">{`> 0${i + 1}`}</span>{h}
                  </motion.div>
                ))}
              </div>
              <AnimatePresence>
                {finalLine && (
                  <motion.div className="absolute inset-x-0 top-[30%] text-center px-4" initial={{ opacity: 0, scale: 1.3, letterSpacing: '0.6em' }} animate={{ opacity: 1, scale: 1, letterSpacing: '0.18em' }} transition={{ duration: 1.2 }}>
                    <div className="font-display font-black text-[clamp(1.6rem,5vw,3.6rem)] text-amber text-glow">THE LAST KEY HAS CHOSEN YOU.</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
          {scene === 'rift' && (
            <motion.div key="rift" className="absolute inset-0 grid place-items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <motion.div className="rounded-full" style={{ background: 'radial-gradient(circle, #ffffff 0%, #22e4ff 25%, #b77bff 45%, transparent 70%)' }} initial={{ width: 10, height: 300, opacity: 0.2 }} animate={{ width: reducedMotion ? 400 : '180vmax', height: reducedMotion ? 400 : '180vmax', opacity: 0.9 }} transition={{ duration: 2.6, ease: 'easeIn' }} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* vignette + fog */}
      <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.75) 100%)' }} />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 opacity-60" style={{ background: 'linear-gradient(0deg, rgba(20,30,60,0.35), transparent)' }} />
      {flash && <div className="pointer-events-none absolute inset-0" style={{ background: flash, opacity: 0.25 }} />}

      {/* subtitles */}
      <div className="absolute inset-x-0 bottom-[12%] px-6 flex justify-center pointer-events-none" aria-live="polite">
        <AnimatePresence mode="wait">
          {sub && (
            <motion.p key={sub} className="subtitle-text max-w-3xl text-center font-display text-[clamp(1.05rem,2.6vw,1.8rem)] leading-snug text-bright/95" style={{ textShadow: '0 2px 18px rgba(0,0,0,0.9)' }} initial={{ opacity: 0, y: 10, filter: 'blur(6px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, y: -6, filter: 'blur(6px)' }} transition={{ duration: 0.9 }}>
              {sub}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* gate */}
      <AnimatePresence>
        {scene === 'gate' && (
          <motion.div className="absolute inset-0 grid place-items-center px-6" exit={{ opacity: 0 }} transition={{ duration: 1 }}>
            <div className="text-center max-w-xl">
              <motion.div className="hud text-xs text-mist mb-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>A cryptography adventure</motion.div>
              <motion.div className="font-display text-2xl sm:text-3xl text-bright/90 mb-3 tracking-[0.3em]" initial={{ opacity: 0, letterSpacing: '0.6em' }} animate={{ opacity: 1, letterSpacing: '0.3em' }} transition={{ duration: 1.6 }}>CIPHERVERSE</motion.div>
              <motion.p className="text-mist italic mb-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>“Every secret has a key. Every key has a cost.”</motion.p>
              <motion.div className="flex flex-col sm:flex-row gap-3 justify-center" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1 }}>
                <button className="btn btn-primary btn-lg" onClick={() => start(true)} autoFocus><Headphones size={18} /> Begin with sound</button>
                <button className="btn btn-lg" onClick={() => start(false)}><VolumeX size={18} /> Begin silently</button>
              </motion.div>
              <motion.div className="mt-6 flex gap-4 justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.6 }}>
                <button className="btn btn-ghost btn-sm" onClick={toTitle}><ChevronsRight size={14} /> Skip intro</button>
                {state.created && <button className="btn btn-ghost btn-sm" onClick={() => navigate('/map')}>Resume journey</button>}
              </motion.div>
              <p className="text-xs text-mist/70 mt-8">Subtitles are always on. Press Esc during the cinematic to skip.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* title */}
      <AnimatePresence>
        {scene === 'title' && (
          <motion.div className="absolute inset-0 grid place-items-center px-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>
            <div className="text-center w-full">
              <FragmentTitle text="CIPHERVERSE" reduced={reducedMotion} />
              <motion.div className="hud text-[clamp(0.7rem,2vw,1.05rem)] text-cyan mt-4 tracking-[0.5em]" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reducedMotion ? 0.2 : 2 }}>THE WAR OF BROKEN REALMS</motion.div>
              <motion.p className="text-mist mt-5 text-sm sm:text-base px-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: reducedMotion ? 0.3 : 2.6 }}>THE WORLD WAS BUILT ON SECRETS. NOW THE SECRETS ARE HUNTING US.</motion.p>
              <motion.div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center items-center" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reducedMotion ? 0.4 : 3.1 }}>
                <button className="btn btn-primary btn-lg min-w-64" onClick={enter} autoFocus>{state.created ? 'Return to the Cipherverse' : 'Enter the Cipherverse'}</button>
                <button className="btn btn-lg min-w-64" style={{ ['--accent' as string]: 'var(--color-amber)' }} onClick={() => navigate('/archives')}><BookOpen size={16} /> Explore the Archives</button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* controls */}
      {scene !== 'gate' && (
        <div className="absolute top-4 right-4 flex gap-2 z-10">
          <button className="btn btn-sm" onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'}>{muted ? <VolumeX size={14} /> : <Volume2 size={14} />}</button>
          {scene !== 'title' && <button className="btn btn-sm" onClick={toTitle}><ChevronsRight size={14} /> Skip</button>}
        </div>
      )}
    </div>
  )
}

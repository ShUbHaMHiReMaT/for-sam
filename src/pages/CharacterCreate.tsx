import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Eye, KeyRound, Lock, Sparkles, Star, Waves } from 'lucide-react'
import { useGame } from '../game/GameContext'
import { COSTUMES } from '../game/meta'
import { Portrait } from '../components/Portrait'
import { Button } from '../components/ui'
import { GlyphField } from '../components/GlyphField'

const SIGILS = [
  { id: 'key', label: 'Key', icon: KeyRound, desc: 'For those who open what others close.' },
  { id: 'eye', label: 'Eye', icon: Eye, desc: 'For those who see the pattern first.' },
  { id: 'star', label: 'Star', icon: Star, desc: 'For those who navigate by first principles.' },
  { id: 'wave', label: 'Wave', icon: Waves, desc: 'For those who adapt to any cipher.' },
]
const PRONOUNS = ['they/them', 'she/her', 'he/him']

const ONBOARD = [
  { mood: 'smile' as const, title: 'Learning is your weapon', text: 'Every power in the Cipherverse is a real cryptographic idea. Bosses lose shields only when you answer correctly — clicking faster does nothing.' },
  { mood: 'neutral' as const, title: 'Mistakes are safe here', text: 'Get something wrong and I’ll explain why, offer a hint, and let you retry. You never lose earned XP, mastery or story progress — not for mistakes, not for missed days.' },
  { mood: 'smirk' as const, title: 'The world remembers', text: 'Solve ciphers and the world repairs itself. The World Map shows restored regions; Labs let you experiment freely; the Encyclopedia holds every lesson; your progress saves automatically on this device.' },
]

export default function CharacterCreate() {
  const { state, dispatch, reducedMotion, sfx, music } = useGame()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [name, setName] = useState(state.created ? state.profile.name : 'Kael Vex')
  const [pronouns, setPronouns] = useState(state.profile.pronouns)
  const [custom, setCustom] = useState('')
  const [costume, setCostume] = useState(state.profile.costume)
  const [sigil, setSigil] = useState(state.profile.sigil)
  const [ob, setOb] = useState(0)

  useEffect(() => { music('awaken') }, [music])

  const finish = () => {
    dispatch({ type: 'createProfile', name, pronouns: custom.trim() || pronouns, costume, sigil })
    setStep(2)
    sfx('reveal')
  }

  const begin = () => {
    sfx('impact')
    navigate('/mission/m0-terminal')
  }

  return (
    <div className="fixed inset-0 bg-void overflow-y-auto">
      <GlyphField reduced={reducedMotion} density={0.5} initial={{ speed: 0.3, alpha: 0.35, colors: ['#22e4ff', '#4dffb8'] }} />
      <div className="relative min-h-full grid place-items-center p-4 sm:p-8">
        <AnimatePresence mode="wait">
          {step < 2 && (
            <motion.div key="create" className="panel w-full max-w-5xl p-5 sm:p-8 grid md:grid-cols-[1fr_1.2fr] gap-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}>
              <div className="flex flex-col items-center justify-center relative">
                <div className="hud text-xs text-cyan mb-2">Guardian Protocol</div>
                <div className="relative">
                  <div className="absolute inset-0 rounded-full blur-3xl opacity-40" style={{ background: COSTUMES.find((c) => c.id === costume)?.colors.glow }} />
                  <Portrait id="kael" costume={costume} mood="neutral" size={230} title="Your Guardian" className="relative" />
                </div>
                <div className="font-display text-2xl text-bright mt-2 text-center">{name || 'Kael Vex'}</div>
                <div className="text-mist text-sm">{custom.trim() || pronouns} · {COSTUMES.find((c) => c.id === costume)?.name}</div>
              </div>

              <div>
                {step === 0 ? (
                  <>
                    <h1 className="font-display text-3xl text-bright mb-1">Identity confirmed.</h1>
                    <p className="text-mist mb-6">AURA-7 needs a few details to bind the Last Key to you. You can change these later.</p>
                    <label className="block mb-5">
                      <span className="hud text-xs text-mist">Guardian name</span>
                      <input className="input mt-1.5" value={name} maxLength={24} onChange={(e) => setName(e.target.value)} placeholder="Kael Vex" />
                    </label>
                    <fieldset className="mb-5">
                      <legend className="hud text-xs text-mist mb-1.5">Pronouns (used in story text)</legend>
                      <div className="flex flex-wrap gap-2">
                        {PRONOUNS.map((p) => (
                          <button key={p} className={`btn btn-sm ${pronouns === p && !custom ? 'btn-primary' : ''}`} onClick={() => { setPronouns(p); setCustom('') }} aria-pressed={pronouns === p && !custom}>{p}</button>
                        ))}
                        <input className="input !w-36 !py-1.5 text-sm" placeholder="custom…" value={custom} maxLength={16} onChange={(e) => setCustom(e.target.value)} aria-label="Custom pronouns" />
                      </div>
                    </fieldset>
                    <fieldset>
                      <legend className="hud text-xs text-mist mb-1.5">Sigil</legend>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {SIGILS.map((s) => (
                          <button key={s.id} onClick={() => setSigil(s.id)} aria-pressed={sigil === s.id} className={`panel p-3 text-left transition ${sigil === s.id ? 'border-cyan!' : 'opacity-70 hover:opacity-100'}`} style={sigil === s.id ? { borderColor: 'var(--color-cyan)' } : undefined}>
                            <s.icon size={18} className="text-cyan mb-1" />
                            <div className="hud text-xs text-bright">{s.label}</div>
                            <div className="text-[11px] text-mist leading-snug mt-1">{s.desc}</div>
                          </button>
                        ))}
                      </div>
                    </fieldset>
                    <div className="mt-8 flex justify-end">
                      <Button variant="primary" onClick={() => setStep(1)}>Next <ArrowRight size={16} /></Button>
                    </div>
                  </>
                ) : (
                  <>
                    <h1 className="font-display text-3xl text-bright mb-1">Choose your armour.</h1>
                    <p className="text-mist mb-6">More costumes unlock by defeating bosses and collecting lore — never by paying.</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {COSTUMES.map((c) => {
                        const owned = state.costumes.includes(c.id)
                        return (
                          <button key={c.id} disabled={!owned} onClick={() => setCostume(c.id)} aria-pressed={costume === c.id} className="panel p-2 flex flex-col items-center text-center disabled:opacity-40 disabled:cursor-not-allowed" style={costume === c.id ? { borderColor: c.colors.glow } : undefined}>
                            <div className="relative">
                              <Portrait id="kael" costume={c.id} size={70} animated={false} />
                              {!owned && <Lock size={16} className="absolute inset-0 m-auto text-bright" />}
                            </div>
                            <div className="text-[11px] text-bright mt-1 leading-tight">{c.name}</div>
                            <div className="text-[10px] text-mist leading-tight">{owned ? c.desc : c.req}</div>
                          </button>
                        )
                      })}
                    </div>
                    <div className="mt-8 flex justify-between">
                      <Button variant="ghost" onClick={() => setStep(0)}><ArrowLeft size={16} /> Back</Button>
                      <Button variant="primary" onClick={finish}><Sparkles size={16} /> Bind the Key</Button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="onboard" className="panel w-full max-w-2xl p-6 sm:p-10 text-center" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <div className="flex justify-center -mt-2"><Portrait id="aura" mood={ONBOARD[ob].mood} size={130} /></div>
              <div className="hud text-xs text-jade mt-2">AURA-7 · Orientation {ob + 1}/{ONBOARD.length}</div>
              <AnimatePresence mode="wait">
                <motion.div key={ob} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <h2 className="font-display text-2xl text-bright mt-3">{ONBOARD[ob].title}</h2>
                  <p className="text-ink mt-3 leading-relaxed">{ONBOARD[ob].text}</p>
                </motion.div>
              </AnimatePresence>
              <div className="flex justify-center gap-1.5 mt-6" aria-hidden="true">
                {ONBOARD.map((_, i) => <span key={i} className={`h-1.5 rounded-full transition-all ${i === ob ? 'w-8 bg-jade' : 'w-3 bg-white/15'}`} />)}
              </div>
              <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
                {ob < ONBOARD.length - 1 ? (
                  <>
                    <Button variant="ghost" onClick={begin}>Skip orientation</Button>
                    <Button variant="primary" accent="var(--color-jade)" onClick={() => setOb(ob + 1)}>Continue <ArrowRight size={16} /></Button>
                  </>
                ) : (
                  <>
                    <Button onClick={() => navigate('/map')}>Explore the World Map</Button>
                    <Button variant="primary" accent="var(--color-amber)" onClick={begin}>Begin Chapter 0 — The Awakening</Button>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

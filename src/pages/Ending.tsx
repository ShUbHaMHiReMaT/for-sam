import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronRight, Map, Scroll } from 'lucide-react'
import { useGame } from '../game/GameContext'
import { ENDINGS, averageBossAccuracy, determineEnding, NULL_FRAGMENTS, type EndingInfo } from '../game/meta'
import type { DialogueLine } from '../game/types'
import { GlyphField } from '../components/GlyphField'
import { DialogueStep } from '../components/MissionParts'
import { Button } from '../components/ui'

const SCRIPTS: Record<EndingInfo['id'], { bg: string; field: string[]; lines: DialogueLine[]; epilogue: string[] }> = {
  dawn: {
    bg: 'radial-gradient(ellipse at 50% 110%, #ffb54755 0%, #1a1f45 45%, #05060b 100%)',
    field: ['#ffe29a', '#22e4ff', '#ffb547'],
    lines: [
      { who: 'null', text: 'You kept them open. Every seal, every design, every flaw — for anyone to read.', mood: 'sad' },
      { who: 'kael', text: 'Because the next Guardian deserves to check our work. And so does the next attacker — before it matters.', mood: 'neutral' },
      { who: 'vexa', text: 'Publish the flaws, fix the flaws, thank whoever found them. Revolutionary.', mood: 'smirk' },
      { who: 'orion', text: 'Projected resistance: unknown. That’s the honest number. I’ll take it.', mood: 'smile' },
      { who: 'nyra', text: 'No pattern I can find. Which, as you taught me, isn’t proof. So we keep looking.', mood: 'smile' },
      { who: 'aura', text: 'Core seven reporting: the council’s last order is fulfilled. A Guardian who understands. Not one who merely believes.', mood: 'smile' },
    ],
    epilogue: ['The seals relight across the sky — not hidden, but published, studied, strengthened.', 'Kingdoms that once trusted blindly now verify gladly.', 'And the Last Key, at rest on your gauntlet, finally stops glowing — because it no longer needs to.'],
  },
  ash: {
    bg: 'radial-gradient(ellipse at 50% 50%, #3a3340 0%, #0d0a12 55%, #030304 100%)',
    field: ['#8d98b3', '#ff3d6e'],
    lines: [
      { who: 'null', text: 'The crown falls. The throne stands. You will see.', mood: 'smirk' },
      { who: 'aura', text: 'The realms are restored… mostly. The councils have begun sealing designs “for safety.”', mood: 'sad' },
      { who: 'vexa', text: 'Hidden designs. Unreviewed seals. I give it a generation before someone like him walks through again.', mood: 'angry' },
      { who: 'kael', text: 'Then we keep learning. We train the next Guardians to ask the questions we didn’t.', mood: 'sad' },
    ],
    epilogue: ['You won the battle. The habits that made the Null King remain.', 'Hint: the strongest ending requires both mastery (≈70%+ average boss accuracy) and a choice that keeps the Guardians’ designs open.', 'Every boss can be rematched — and every choice revisited by replaying Chapter 7.'],
  },
  truth: {
    bg: 'radial-gradient(ellipse at 50% 40%, #5a0616 0%, #1a0208 40%, #0a0f24 75%, #030104 100%)',
    field: ['#ff1f3d', '#22e4ff', '#ffe29a'],
    lines: [
      { who: 'vexa', text: 'Wait. Kael — the fragments. Read them in order.', mood: 'surprised' },
      { who: 'null', text: '…You found them. All five. Then you know my name.', mood: 'sad' },
      { who: 'kael', text: 'You’re the Keymaker. You designed every seal — and when they published your designs, you thought they’d killed your life’s work.', mood: 'neutral' },
      { who: 'null', text: 'They did. My secret seals broke the first time anyone looked. Vexa looked.', mood: 'sad' },
      { who: 'vexa', text: 'I looked because you asked us to trust them. I’m sorry it broke you. I’m not sorry I looked.', mood: 'sad' },
      { who: 'null', text: 'And the Guardian who knows all of this… still chooses to keep the blueprints open?', mood: 'surprised' },
      { who: 'kael', text: 'Especially knowing this. Openness didn’t defeat you. It’s the only reason the seals got better.', mood: 'smile' },
      { who: 'null', text: 'Then let the Keymaker build one more thing — in public, this time. Teach me how you learned.', mood: 'smile' },
      { who: 'aura', text: 'Core seven… overjoyed. All seven cores, actually. This is unprecedented.', mood: 'smile' },
    ],
    epilogue: ['The crown of glass is set on a plinth in the Archive, beside Vexa’s rejected report — both labelled, both studied.', 'The Keymaker joins the open council: the first designer to have his own seals reviewed by those he once exiled.', 'Kerckhoffs would approve. So, finally, does the Null King.'],
  },
}

export default function Ending() {
  const { state, dispatch, music, reducedMotion } = useGame()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const replay = params.get('replay') as EndingInfo['id'] | null
  const ending = useMemo(() => (replay && ENDINGS[replay] ? ENDINGS[replay] : determineEnding(state)), [replay]) // eslint-disable-line react-hooks/exhaustive-deps
  const [stage, setStage] = useState<'title' | 'scene' | 'epilogue'>('title')
  const s = SCRIPTS[ending.id]

  useEffect(() => {
    music(ending.id === 'ash' ? 'void' : 'victory')
    if (!replay && state.bosses.nullking?.defeated) dispatch({ type: 'ending', id: ending.id })
    const t = window.setTimeout(() => setStage('scene'), reducedMotion ? 800 : 3200)
    return () => clearTimeout(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed inset-0 overflow-y-auto" style={{ background: s.bg }}>
      <div className="fixed inset-0 opacity-60"><GlyphField reduced={reducedMotion} initial={{ speed: 0.4, colors: s.field, alpha: 0.5 }} /></div>
      <div className="relative min-h-full flex flex-col items-center justify-center p-4 sm:p-8">
        <AnimatePresence mode="wait">
          {stage === 'title' && (
            <motion.div key="t" className="text-center" initial={{ opacity: 0, letterSpacing: '0.5em' }} animate={{ opacity: 1, letterSpacing: '0.12em' }} exit={{ opacity: 0 }} transition={{ duration: 2 }}>
              <div className="hud text-sm text-mist">{ending.id === 'truth' ? 'Secret ending' : 'Ending'}</div>
              <h1 className="title-cinematic text-[clamp(2rem,7vw,5rem)] mt-2">{ending.name.toUpperCase()}</h1>
              <p className="text-mist mt-4 italic">{ending.tagline}</p>
            </motion.div>
          )}
          {stage === 'scene' && (
            <motion.div key="s" className="w-full max-w-4xl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <DialogueStep lines={s.lines} onDone={() => setStage('epilogue')} />
            </motion.div>
          )}
          {stage === 'epilogue' && (
            <motion.div key="e" className="max-w-2xl text-center space-y-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {s.epilogue.map((l, i) => (
                <motion.p key={i} className="font-display text-lg sm:text-2xl text-bright/90 leading-relaxed" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + i * 1.6 }}>{l}</motion.p>
              ))}
              <motion.div className="pt-6 space-y-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 + s.epilogue.length * 1.6 }}>
                <div className="text-sm text-mist">
                  Average boss accuracy {Math.round(averageBossAccuracy(state) * 100)}% · Null Archive fragments {NULL_FRAGMENTS.filter((f) => state.lore.includes(f)).length}/5 · Vexa’s trust {state.relationships.vexa ?? 0}
                </div>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button onClick={() => navigate('/archives')}><Scroll size={16} /> Archives</Button>
                  <Button variant="primary" accent="var(--color-amber)" onClick={() => navigate('/map')}><Map size={16} /> Return to the realms <ChevronRight size={16} /></Button>
                </div>
                <p className="text-xs text-mist">Thank you for playing CIPHERVERSE. Every secret has a key. Every key has a cost.</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

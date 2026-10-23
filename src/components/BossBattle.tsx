import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronRight, DoorOpen, Heart, Shield, Swords, Trophy, Zap } from 'lucide-react'
import type { Boss } from '../game/types'
import { useGame } from '../game/GameContext'
import { bossGrade } from '../game/progression'
import { Portrait } from './Portrait'
import { Button, Panel } from './ui'
import { DialogueStep } from './MissionParts'
import { PuzzleView } from './PuzzleView'
import { GlyphField } from './GlyphField'

const ARENA_BG: Record<Boss['arena'], string> = {
  ruins: 'radial-gradient(ellipse at 50% 30%, #3a2a10 0%, #120c06 45%, #05040a 100%)',
  library: 'radial-gradient(ellipse at 50% 30%, #3a2408 0%, #140a04 50%, #05040a 100%)',
  maze: 'radial-gradient(ellipse at 50% 30%, #2a1450 0%, #0e0720 50%, #05040a 100%)',
  forge: 'radial-gradient(ellipse at 50% 70%, #5a2a10 0%, #1a1010 45%, #06060a 100%)',
  citadel: 'radial-gradient(ellipse at 50% 30%, #18285a 0%, #0a0f24 50%, #04050a 100%)',
  frontier: 'radial-gradient(ellipse at 50% 30%, #4a1040 0%, #1a0618 50%, #05040a 100%)',
  storm: 'radial-gradient(ellipse at 50% 30%, #0b4a3a 0%, #062018 50%, #030806 100%)',
  void: 'radial-gradient(ellipse at 50% 30%, #5a0616 0%, #1a0208 45%, #030104 100%)',
}

const MAX_RESOLVE = 3

type Phase = 'intro' | 'phaseBanner' | 'taunt' | 'fight' | 'struck' | 'stabilize' | 'defeat' | 'victory'

export function BossBattle({ boss, onWin, onRetreat }: { boss: Boss; onWin: () => void; onRetreat: () => void }) {
  const { state, dispatch, sfx, music, reducedMotion } = useGame()
  const [phase, setPhase] = useState<Phase>('intro')
  const [pi, setPi] = useState(0)
  const [ti, setTi] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [wrong, setWrong] = useState(0)
  const [resolve, setResolve] = useState(MAX_RESOLVE)
  const [hitFx, setHitFx] = useState(0)
  const [attackFx, setAttackFx] = useState(0)
  const [telegraph, setTelegraph] = useState(false)
  const total = useMemo(() => boss.phases.reduce((a, p) => a + p.tasks.length, 0), [boss])
  const done = boss.phases.slice(0, pi).reduce((a, p) => a + p.tasks.length, 0) + ti
  const shield = 1 - done / total
  const ph = boss.phases[pi]
  const task = ph?.tasks[ti]
  const [rematch] = useState(() => !!state.bosses[boss.id]?.defeated)

  useEffect(() => { music('boss'); return () => music('world') }, [music])
  useEffect(() => { if (phase === 'victory') { music('victory'); sfx('reveal') } }, [phase, music, sfx])

  const onSolved = () => {
    setCorrect((c) => c + 1)
    setHitFx((h) => h + 1)
    sfx('hit')
    setPhase('struck')
  }
  const onWrong = () => {
    setWrong((w) => w + 1)
    setTelegraph(true)
    window.setTimeout(() => {
      setTelegraph(false)
      setAttackFx((a) => a + 1)
      sfx('bossAttack')
      setResolve((r) => {
        const n = r - 1
        if (n <= 0) window.setTimeout(() => setPhase('stabilize'), 500)
        return Math.max(0, n)
      })
    }, reducedMotion ? 100 : 650)
  }

  const advance = () => {
    if (ti + 1 < ph.tasks.length) { setTi(ti + 1); setPhase('fight'); return }
    if (pi + 1 < boss.phases.length) { setPi(pi + 1); setTi(0); setPhase('phaseBanner'); sfx('shield'); return }
    setPhase('defeat')
    sfx('impact')
  }

  const win = () => {
    dispatch({ type: 'bossResult', boss: boss.id, correct, attempts: correct + wrong, won: true, xp: boss.xp, costume: boss.costume })
    setPhase('victory')
  }
  const retreat = () => {
    if (correct + wrong > 0) dispatch({ type: 'bossResult', boss: boss.id, correct, attempts: correct + wrong, won: false, xp: boss.xp })
    onRetreat()
  }

  const acc = correct + wrong ? correct / (correct + wrong) : 1
  const grade = bossGrade(acc)

  return (
    <div className="relative rounded-2xl overflow-hidden border border-white/10 min-h-[640px]" style={{ background: ARENA_BG[boss.arena] }}>
      <div className="absolute inset-0 opacity-40 pointer-events-none"><GlyphField reduced={reducedMotion} density={0.35} initial={{ speed: 0.5, alpha: 0.5, colors: [boss.color, '#ffffff'], corruption: boss.arena === 'void' ? 0.4 : 0.05 }} /></div>
      <div className="absolute inset-x-0 bottom-0 h-1/2 grid-floor opacity-30 pointer-events-none" style={{ transform: 'perspective(500px) rotateX(55deg)', transformOrigin: 'bottom' }} />
      <AnimatePresence>{telegraph && <motion.div className="absolute inset-0 pointer-events-none z-20" style={{ boxShadow: `inset 0 0 120px ${boss.color}` }} initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0.6, 1] }} exit={{ opacity: 0 }} />}</AnimatePresence>
      <AnimatePresence>{attackFx > 0 && <motion.div key={attackFx} className="absolute inset-0 pointer-events-none z-20 bg-crimson/30" initial={{ opacity: 0.8 }} animate={{ opacity: 0 }} transition={{ duration: 0.6 }} />}</AnimatePresence>

      {/* HUD */}
      <div className="relative z-10 p-3 sm:p-5 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="hud text-[11px]" style={{ color: boss.color }}>{boss.title}{rematch ? ' · Rematch' : ''}</div>
            <div className="font-display text-xl sm:text-2xl text-bright truncate">{boss.name}</div>
          </div>
          {phase !== 'victory' && phase !== 'defeat' && <button className="btn btn-sm shrink-0" onClick={retreat}><DoorOpen size={14} /> Retreat</button>}
        </div>
        <div className="flex items-center gap-2">
          <Shield size={16} style={{ color: boss.color }} />
          <div className="flex-1 flex gap-1" aria-label={`Boss shield ${Math.round(shield * 100)}%`}>
            {Array.from({ length: total }, (_, i) => (
              <motion.div key={i} className="h-3 flex-1 rounded-sm" animate={{ opacity: i < total - done ? 1 : 0.15, scaleY: i < total - done ? 1 : 0.5 }} style={{ background: i < total - done ? boss.color : '#ffffff', boxShadow: i < total - done ? `0 0 10px ${boss.color}` : 'none' }} />
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1" aria-label={`Resolve ${resolve} of ${MAX_RESOLVE}`}>
            <span className="hud text-mist mr-1">Resolve</span>
            {Array.from({ length: MAX_RESOLVE }, (_, i) => <Heart key={i} size={16} className={i < resolve ? 'text-cyan fill-cyan' : 'text-white/20'} />)}
          </div>
          <div className="hud text-mist">Phase {Math.min(pi + 1, boss.phases.length)}/{boss.phases.length} · Accuracy {Math.round(acc * 100)}%</div>
        </div>
      </div>

      {/* Boss */}
      <div className="relative z-10 flex justify-center -mt-2">
        <motion.div
          key={`h${hitFx}-a${attackFx}`}
          animate={phase === 'defeat' || phase === 'victory'
            ? { opacity: phase === 'victory' ? 0 : 1, scale: phase === 'victory' ? 1.6 : 1, filter: phase === 'victory' ? 'blur(14px)' : 'blur(0px)' }
            : hitFx || attackFx
              ? { x: hitFx ? [0, 14, -10, 6, 0] : 0, scale: attackFx ? [1, 1.18, 1] : [1, 0.94, 1], filter: hitFx ? ['brightness(1)', 'brightness(2.5)', 'brightness(1)'] : 'none' }
              : {}}
          transition={{ duration: phase === 'victory' ? 1.6 : 0.45 }}
          className={reducedMotion ? '' : 'anim-float'}
        >
          <Portrait id={boss.art} mood={phase === 'defeat' ? 'sad' : telegraph ? 'angry' : 'neutral'} size={typeof window !== 'undefined' && window.innerWidth < 640 ? 130 : 190} title={boss.name} />
        </motion.div>
      </div>

      {/* Stage */}
      <div className="relative z-10 p-3 sm:p-5 max-w-4xl mx-auto">
        <AnimatePresence mode="wait">
          {phase === 'intro' && (
            <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <DialogueStep lines={boss.intro} onDone={() => { setPhase('phaseBanner'); sfx('shield') }} />
            </motion.div>
          )}
          {phase === 'phaseBanner' && (
            <motion.div key={`ban${pi}`} className="text-center py-8" initial={{ opacity: 0, scale: 1.2, letterSpacing: '0.5em' }} animate={{ opacity: 1, scale: 1, letterSpacing: '0.12em' }} exit={{ opacity: 0 }} onAnimationComplete={() => window.setTimeout(() => setPhase('taunt'), 900)}>
              <div className="hud text-sm" style={{ color: boss.color }}>Phase {pi + 1}</div>
              <div className="font-display text-3xl sm:text-4xl text-bright mt-1">{ph.name}</div>
            </motion.div>
          )}
          {phase === 'taunt' && (
            <motion.div key={`taunt${pi}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              <DialogueStep lines={[ph.taunt]} onDone={() => setPhase('fight')} />
              <div className="flex items-center gap-2 text-sm justify-center" style={{ color: boss.color }}><Zap size={14} /><span className="italic">{ph.telegraph}</span></div>
            </motion.div>
          )}
          {(phase === 'fight' || phase === 'struck' || phase === 'stabilize') && task && (
            <motion.div key={task.id} className="relative" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="flex items-center gap-3 mb-2 text-xs" aria-hidden="true">
                <Shield size={12} style={{ color: boss.color }} />
                <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden"><div className="h-full transition-all" style={{ width: `${shield * 100}%`, background: boss.color }} /></div>
                <span className="flex gap-0.5">{Array.from({ length: MAX_RESOLVE }, (_, k) => <Heart key={k} size={12} className={k < resolve ? 'text-cyan fill-cyan' : 'text-white/20'} />)}</span>
              </div>
              <PuzzleView puzzle={task} who="aura" mode="boss" onSolved={onSolved} onWrong={onWrong} />
              {phase === 'struck' && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center mt-4">
                  <Button variant="primary" size="lg" accent={boss.color} onClick={advance} autoFocus><Swords size={18} /> {ti + 1 < ph.tasks.length || pi + 1 < boss.phases.length ? 'Strike — shield cracks!' : 'Final strike!'}</Button>
                </motion.div>
              )}
              {phase === 'stabilize' && (
                <motion.div className="absolute inset-0 z-30 grid place-items-center bg-black/75 backdrop-blur-sm rounded-2xl p-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <Panel className="p-6 text-center max-w-xl" accent="#4dffb8">
                    <div className="flex justify-center"><Portrait id="aura" mood="surprised" size={90} /></div>
                    <h3 className="hud text-jade mt-2">Resolve depleted — AURA-7 stabilises you</h3>
                    <p className="text-ink mt-2">No progress lost. Here’s the idea you need before you try again:</p>
                    <p className="text-bright mt-3 bg-black/30 rounded-xl p-4 text-left">{task.hints[0]}</p>
                    <div className="mt-5"><Button variant="primary" accent="var(--color-jade)" onClick={() => { setResolve(MAX_RESOLVE); setPhase('fight') }} autoFocus>Back into the fight</Button></div>
                  </Panel>
                </motion.div>
              )}
            </motion.div>
          )}
          {phase === 'defeat' && (
            <motion.div key="defeat" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <DialogueStep lines={boss.defeat} onDone={win} />
            </motion.div>
          )}
          {phase === 'victory' && (
            <motion.div key="victory" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
              <Panel className="p-6 sm:p-8" accent={boss.color}>
                <div className="text-center">
                  <motion.div initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', delay: 0.9 }} className="inline-grid place-items-center w-20 h-20 rounded-2xl font-display text-4xl font-black" style={{ background: `${boss.color}22`, color: boss.color, border: `2px solid ${boss.color}` }}>{grade}</motion.div>
                  <h3 className="font-display text-3xl text-bright mt-3">{boss.name} defeated</h3>
                  <div className="flex justify-center gap-6 mt-3 text-sm">
                    <span className="text-mist">Accuracy <span className="text-bright">{Math.round(acc * 100)}%</span></span>
                    <span className="text-mist">XP <span className="text-cyan">+{rematch ? Math.round(boss.xp * 0.1) : boss.xp}</span></span>
                  </div>
                </div>
                <div className="mt-6 rounded-xl border border-white/10 bg-black/30 p-4">
                  <div className="hud text-xs flex items-center gap-2" style={{ color: boss.color }}><Trophy size={14} /> Debrief · {boss.debrief.title}</div>
                  <ul className="mt-2 space-y-2">{boss.debrief.points.map((p, i) => <li key={i} className="text-ink text-sm flex gap-2"><span style={{ color: boss.color }}>◆</span>{p}</li>)}</ul>
                </div>
                <div className="flex justify-center mt-6"><Button variant="primary" accent={boss.color} onClick={onWin} autoFocus>Continue <ChevronRight size={16} /></Button></div>
              </Panel>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ChevronRight, Globe2, Map, RotateCcw, Sparkles, Zap } from 'lucide-react'
import { useGame } from '../game/GameContext'
import { missionById, missionUnlocked, nextMission, CHAPTERS } from '../data/campaign'
import { bossById } from '../data/bosses'
import { REGIONS } from '../data/world'
import { ChoiceStep, DialogueStep, InvestigateStep, LessonStep } from '../components/MissionParts'
import { PuzzleView } from '../components/PuzzleView'
import { BossBattle } from '../components/BossBattle'
import { Bar, Button, Empty, Panel } from '../components/ui'
import { Portrait } from '../components/Portrait'
import { levelProgress } from '../game/progression'
import type { AlgoId } from '../game/types'

export default function MissionPlayerRoute() {
  const { id = '' } = useParams()
  return <MissionPlayer key={id} id={id} />
}

function MissionPlayer({ id }: { id: string }) {
  const mission = missionById(id)
  const { state, dispatch, sfx, music } = useGame()
  const navigate = useNavigate()
  const saved = state.missions[id]
  const [step, setStep] = useState(() => (saved && !saved.completed ? Math.min(saved.step, (mission?.steps.length ?? 1) - 1) : 0))
  const [finished, setFinished] = useState(false)
  const startXp = useRef(state.xp)
  const startMastery = useRef({ ...state.mastery })
  const wasDone = useRef(!!saved?.completed)

  useEffect(() => { music('world') }, [music])

  const tagsTouched = useMemo(() => {
    const s = new Set<AlgoId>()
    mission?.steps.forEach((st) => {
      if (st.kind === 'puzzle') st.puzzle.tags.forEach((t) => s.add(t))
      if (st.kind === 'boss') bossById(st.bossId)?.phases.forEach((p) => p.tasks.forEach((t) => t.tags.forEach((x) => s.add(x))))
    })
    return [...s]
  }, [mission])

  if (!mission) return <Empty icon={<Map />} title="Mission not found" text="This mission does not exist in the Cipherverse archives." action={<Button onClick={() => navigate('/campaign')}>Back to campaign</Button>} />
  if (!missionUnlocked(state, mission)) {
    return <Empty icon={<Map />} title="Sealed mission" text={`Complete ${mission.requires?.map((r) => `“${missionById(r)?.title}”`).join(' and ')} to unlock it.`} action={<Button onClick={() => navigate('/campaign')}>Back to campaign</Button>} />
  }

  const st = mission.steps[step]
  const next = () => {
    if (step + 1 < mission.steps.length) {
      dispatch({ type: 'missionStep', mission: mission.id, step: step + 1 })
      setStep(step + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      dispatch({ type: 'missionComplete', mission: mission.id, xp: mission.xp })
      sfx('levelup')
      music('victory')
      setFinished(true)
      window.scrollTo({ top: 0 })
    }
  }

  const chapter = CHAPTERS.find((c) => c.n === mission.chapter)
  const region = chapter ? REGIONS.find((r) => r.id === chapter.region) : REGIONS.find((r) => r.id === 'wastes')

  if (finished) {
    const gained = state.xp - startXp.current
    const nm = nextMission(state)
    const lp = levelProgress(state.xp)
    return (
      <div className="max-w-3xl mx-auto">
        <Panel className="p-6 sm:p-10 text-center overflow-hidden" accent={region?.color}>
          <motion.div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(circle at 50% 0%, ${region?.color}33, transparent 60%)` }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.5 }} />
          <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring' }} className="relative">
            <div className="hud text-xs" style={{ color: region?.color }}>Mission complete</div>
            <h1 className="font-display text-3xl sm:text-4xl text-bright mt-1">{mission.title}</h1>
          </motion.div>
          <motion.div className="relative mt-6 inline-flex items-center gap-2 text-4xl font-display text-cyan" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
            <Zap /> +{gained} XP
          </motion.div>
          {wasDone.current && <div className="text-xs text-mist mt-1">Replay — rewards were already collected, but your practice still counts.</div>}
          <div className="relative mt-4 max-w-sm mx-auto">
            <div className="flex justify-between text-xs text-mist hud mb-1"><span>Level {lp.level}</span><span>{lp.into}/{lp.needed}</span></div>
            <Bar value={lp.pct} height={8} />
          </div>
          <div className="relative mt-8 grid sm:grid-cols-2 gap-3 text-left">
            {tagsTouched.map((t) => {
              const before = startMastery.current[t] ?? 0
              const after = state.mastery[t] ?? 0
              return (
                <div key={t} className="rounded-xl border border-white/10 bg-black/30 p-3">
                  <div className="flex justify-between text-xs"><span className="hud text-ink">{t}</span><span className="text-jade">{after > before ? `+${after - before}` : ''} {after}/100</span></div>
                  <Bar value={after / 100} color="var(--color-jade)" height={5} className="mt-2" />
                </div>
              )
            })}
          </div>
          <motion.div className="relative mt-8 rounded-xl border p-4 text-left flex gap-3" style={{ borderColor: `${region?.color}55`, background: `${region?.color}0f` }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}>
            <Globe2 className="shrink-0" style={{ color: region?.color }} />
            <div>
              <div className="hud text-xs" style={{ color: region?.color }}>The world changes</div>
              <p className="text-bright mt-1">{mission.worldChange}</p>
            </div>
          </motion.div>
          <div className="relative mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => navigate('/map')}><Map size={16} /> World Map</Button>
            {mission.finale ? (
              <Button variant="primary" accent="var(--color-amber)" onClick={() => navigate('/ending')}><Sparkles size={16} /> Witness the ending</Button>
            ) : nm ? (
              <Button variant="primary" onClick={() => navigate(`/mission/${nm.id}`)}>Next: {nm.title} <ChevronRight size={16} /></Button>
            ) : null}
          </div>
        </Panel>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/campaign')} aria-label="Leave mission (progress is saved)"><ArrowLeft size={16} /></button>
        <div className="min-w-0 flex-1">
          <div className="hud text-[11px] text-mist truncate">{chapter ? `Chapter ${chapter.n} · ${chapter.title}` : 'Side mission · The Cryptanalysis Wastes'}</div>
          <div className="font-display text-lg sm:text-xl text-bright truncate">{mission.title}</div>
        </div>
        {step > 0 && <button className="btn btn-ghost btn-sm" onClick={() => { setStep(0); dispatch({ type: 'missionStep', mission: mission.id, step: 0 }) }} title="Restart mission"><RotateCcw size={14} /></button>}
      </div>
      <div className="flex gap-1 mb-6" aria-label={`Step ${step + 1} of ${mission.steps.length}`}>
        {mission.steps.map((s, i) => (
          <div key={i} className="h-1.5 flex-1 rounded-full transition-colors" style={{ background: i < step ? region?.color : i === step ? '#ffffff' : 'rgb(255 255 255 / 0.08)', opacity: i <= step ? 1 : 1 }} title={s.kind} />
        ))}
      </div>
      {step === 0 && !saved?.step && (
        <Panel className="p-4 mb-5 flex gap-3 items-start" accent={region?.color}>
          <Portrait id={region?.guide ?? 'aura'} size={44} mood="neutral" animated={false} />
          <div>
            <div className="hud text-[11px]" style={{ color: region?.color }}>Objective</div>
            <p className="text-sm text-ink">{mission.objective}</p>
          </div>
        </Panel>
      )}
      <AnimatePresence mode="wait">
        <motion.div key={`${mission.id}-${step}`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
          {st.kind === 'dialogue' && <DialogueStep lines={st.lines} onDone={next} />}
          {st.kind === 'lesson' && <LessonStep step={st} onDone={next} />}
          {st.kind === 'puzzle' && <PuzzleView puzzle={st.puzzle} who={st.who} onSolved={next} />}
          {st.kind === 'choice' && <ChoiceStep step={st} onDone={next} />}
          {st.kind === 'investigate' && <InvestigateStep step={st} onDone={next} />}
          {st.kind === 'boss' && (() => {
            const b = bossById(st.bossId)!
            return <BossBattle boss={b} onWin={next} onRetreat={() => navigate('/campaign')} />
          })()}
        </motion.div>
      </AnimatePresence>
      <p className="text-center text-xs text-mist mt-8">Progress saves automatically. Leave anytime — you’ll resume at this step.</p>
    </div>
  )
}

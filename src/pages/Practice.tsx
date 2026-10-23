import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Award, Dumbbell, GraduationCap, RotateCcw, Timer } from 'lucide-react'
import { allPuzzles } from '../data/campaign'
import { ENCYCLOPEDIA } from '../data/encyclopedia'
import { useGame } from '../game/GameContext'
import type { AlgoId, Puzzle } from '../game/types'
import { PuzzleView, type PuzzleResult } from '../components/PuzzleView'
import { Bar, Button, Panel, SectionTitle } from '../components/ui'
import { Toggle } from '../labs/common'

const EXAM_SIZE = 15
const PASS = 0.8

function shuffle<T>(a: T[]): T[] {
  const r = [...a]
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]] }
  return r
}

export default function Practice() {
  const { state, dispatch, sfx } = useGame()
  const [mode, setMode] = useState<'free' | 'timed' | 'exam'>('free')
  const [tag, setTag] = useState<AlgoId | 'all'>('all')
  const pool = useMemo(() => allPuzzles().filter((p) => tag === 'all' || p.tags.includes(tag)), [tag])
  const [queue, setQueue] = useState<Puzzle[] | null>(null)
  const [i, setI] = useState(0)
  const [results, setResults] = useState<PuzzleResult[]>([])
  const [start, setStart] = useState(0)
  const [, force] = useState(0)

  const begin = () => {
    const q = mode === 'exam' ? shuffle(allPuzzles()).slice(0, EXAM_SIZE) : shuffle(pool).slice(0, mode === 'timed' ? 5 : 10)
    setQueue(q); setI(0); setResults([]); setStart(Date.now()); sfx('whoosh')
  }
  const onSolved = (r: PuzzleResult) => {
    const rs = [...results, r]
    setResults(rs)
    if (queue && i + 1 < queue.length) setI(i + 1)
    else {
      setI(i + 1)
      if (mode === 'exam') {
        const score = rs.filter((x) => x.firstTry).length / rs.length
        dispatch({ type: 'flag', key: 'examBest', value: Math.max(Number(state.flags.examBest ?? 0), score) })
        if (score >= PASS && !state.flags.certified) { dispatch({ type: 'flag', key: 'certified', value: true }); dispatch({ type: 'grantXp', xp: 300 }) }
      }
      force((n) => n + 1)
    }
  }

  const finished = queue && i >= queue.length
  const firstTry = results.filter((r) => r.firstTry).length
  const elapsed = Math.round((Date.now() - start) / 1000)
  const tags = ENCYCLOPEDIA.map((e) => e.id)

  return (
    <div className="max-w-3xl mx-auto">
      <SectionTitle kicker="Practice & certification" title="The Training Grounds" sub="Replay any puzzle from the campaign — rewards are only granted once per puzzle, so practice freely. Or take the certification exam." />
      {!queue && (
        <Panel className="p-5 space-y-4">
          <Toggle label="Mode" value={mode} onChange={setMode} options={[{ id: 'free', label: 'Free practice' }, { id: 'timed', label: 'Timed sprint' }, { id: 'exam', label: 'Certification exam' }]} />
          {mode !== 'exam' ? (
            <label className="block max-w-sm"><span className="hud text-[11px] text-mist">Topic</span>
              <select className="input mt-1" value={tag} onChange={(e) => setTag(e.target.value as AlgoId | 'all')}>
                <option value="all">All topics ({allPuzzles().length})</option>
                {[...tags, 'basics' as AlgoId].map((t) => { const n = allPuzzles().filter((p) => p.tags.includes(t)).length; return n ? <option key={t} value={t}>{ENCYCLOPEDIA.find((e) => e.id === t)?.name ?? 'Foundations'} ({n})</option> : null })}
              </select>
            </label>
          ) : (
            <div className="text-sm text-ink space-y-1">
              <p>{EXAM_SIZE} random questions from across all eight chapters. Only <b>first-try</b> answers count toward the score; hints are allowed but the question then counts as assisted.</p>
              <p>Pass mark: {Math.round(PASS * 100)}%. Passing grants the <b>Certified Guardian</b> credential and a one-time 300 XP.</p>
              {state.flags.examBest !== undefined && <p className="text-mist">Best score so far: {Math.round(Number(state.flags.examBest) * 100)}% {state.flags.certified ? '· Certified ✓' : ''}</p>}
            </div>
          )}
          <Button variant="primary" onClick={begin} disabled={mode !== 'exam' && pool.length === 0}>{mode === 'exam' ? <GraduationCap size={16} /> : mode === 'timed' ? <Timer size={16} /> : <Dumbbell size={16} />} Begin</Button>
        </Panel>
      )}
      {queue && !finished && (
        <>
          <div className="flex items-center gap-3 mb-4"><span className="hud text-xs text-mist whitespace-nowrap">{mode === 'exam' ? 'Exam' : 'Practice'} {i + 1}/{queue.length}</span><Bar value={i / queue.length} /><Button size="sm" variant="ghost" onClick={() => setQueue(null)}>Quit</Button></div>
          <PuzzleView key={queue[i].id + i} puzzle={queue[i]} who={mode === 'exam' ? 'orion' : 'aura'} mode="practice" onSolved={onSolved} continueLabel={i + 1 < queue.length ? 'Next' : 'Finish'} />
        </>
      )}
      {finished && queue && (
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
          <Panel className="p-8 text-center" accent={mode === 'exam' && firstTry / queue.length >= PASS ? '#ffb547' : '#22e4ff'}>
            {mode === 'exam' && firstTry / queue.length >= PASS ? <Award size={48} className="mx-auto text-amber" /> : <Dumbbell size={40} className="mx-auto text-cyan" />}
            <h2 className="font-display text-2xl text-bright mt-3">{mode === 'exam' ? (firstTry / queue.length >= PASS ? 'Certified Guardian' : 'Not yet certified') : 'Session complete'}</h2>
            <p className="text-mist mt-2">First-try: {firstTry}/{queue.length} ({Math.round((firstTry / queue.length) * 100)}%){mode === 'timed' ? ` · ${elapsed}s` : ''}</p>
            {mode === 'exam' && firstTry / queue.length >= PASS && <p className="text-sm text-amber mt-2">Awarded to {state.profile.name} — CIPHERVERSE Guardian Certification, {new Date().toLocaleDateString()}.</p>}
            {mode === 'exam' && firstTry / queue.length < PASS && <p className="text-sm text-mist mt-2">Review the Encyclopedia entries for the topics you missed, then try again. Your progress is never lost.</p>}
            <div className="flex justify-center gap-2 mt-6"><Button onClick={() => setQueue(null)}>Back</Button><Button variant="primary" onClick={begin}><RotateCcw size={14} /> Again</Button></div>
          </Panel>
        </motion.div>
      )}
    </div>
  )
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion'
import { ArrowDown, ArrowUp, Check, ChevronRight, Copy, Lightbulb, X } from 'lucide-react'
import type { CharacterId, Puzzle } from '../game/types'
import { useGame } from '../game/GameContext'
import { normAnswer } from '../data/helpers'
import { SPEAKER_COLORS, SPEAKER_NAMES } from '../data/world'
import { seededRandom, hashString } from '../game/progression'
import { Portrait } from './Portrait'
import { Button, Panel } from './ui'
import { Widget } from './widgets'

const WRONG_LINES = [
  'Not quite — but that tells us something. Look again.',
  'Close enough to learn from. Want a hint?',
  'The Cipherverse rewards patience, not speed. Try another angle.',
  'Every wrong answer narrows the keyspace. Keep going.',
]

export interface PuzzleResult { firstTry: boolean; hints: number; attempts: number }

interface Props {
  puzzle: Puzzle
  who?: CharacterId
  mode?: 'mission' | 'boss' | 'practice'
  onSolved: (r: PuzzleResult) => void
  onWrong?: () => void
  /** in boss mode the parent decides when to move on */
  continueLabel?: string
}

export function PuzzleView({ puzzle, who = 'aura', mode = 'mission', onSolved, onWrong, continueLabel = 'Continue' }: Props) {
  const { dispatch, sfx } = useGame()
  const [attempts, setAttempts] = useState(0)
  const [hints, setHints] = useState(0)
  const [solved, setSolved] = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null)
  const shake = useAnimationControls()
  const [value, setValue] = useState('')
  const [picked, setPicked] = useState<number[]>([])
  const resultRef = useRef<PuzzleResult | null>(null)
  const initialOrder = useMemo(() => {
    if (puzzle.kind !== 'order') return []
    const r = seededRandom(hashString(puzzle.id))
    const idx = puzzle.items.map((_, i) => i)
    for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]] }
    if (idx.every((v, i) => v === i)) idx.reverse()
    return idx
  }, [puzzle])
  const [orderIdx, setOrderIdx] = useState<number[]>(initialOrder)
  const [orderMarks, setOrderMarks] = useState<boolean[] | null>(null)

  useEffect(() => {
    setAttempts(0); setHints(0); setSolved(false); setFeedback(null); setValue(''); setPicked([]); setOrderIdx(initialOrder); setOrderMarks(null)
  }, [puzzle.id, initialOrder])

  const color = SPEAKER_COLORS[who] ?? '#22e4ff'

  const succeed = (text: string) => {
    const firstTry = attempts === 0
    setSolved(true)
    setFeedback({ ok: true, text })
    sfx('success')
    dispatch({ type: 'puzzleSolved', id: puzzle.id, tags: puzzle.tags, difficulty: puzzle.difficulty, firstTry, hints })
    resultRef.current = { firstTry, hints, attempts: attempts + 1 }
    if (mode === 'boss') onSolved(resultRef.current)
  }
  const fail = (text: string) => {
    setAttempts((a) => a + 1)
    setFeedback({ ok: false, text })
    void shake.start({ x: [0, -8, 7, -5, 3, 0], transition: { duration: 0.35 } })
    sfx('error')
    dispatch({ type: 'mistake' })
    onWrong?.()
  }

  const submitText = () => {
    if (puzzle.kind !== 'text') return
    const a = normAnswer(value)
    if (!a) { setFeedback({ ok: false, text: 'Type an answer first.' }); return }
    if (puzzle.answers.some((x) => normAnswer(x) === a)) return succeed(puzzle.explanation)
    const diag = puzzle.diagnose?.(a)
    fail(diag ?? WRONG_LINES[attempts % WRONG_LINES.length])
  }

  const pickChoice = (i: number) => {
    if (puzzle.kind !== 'choice' || solved || picked.includes(i)) return
    setPicked([...picked, i])
    const o = puzzle.options[i]
    if (o.correct) succeed(`${o.why} ${puzzle.explanation}`)
    else fail(o.why)
  }

  const move = (pos: number, dir: -1 | 1) => {
    const j = pos + dir
    if (j < 0 || j >= orderIdx.length) return
    const n = [...orderIdx]
    ;[n[pos], n[j]] = [n[j], n[pos]]
    setOrderIdx(n)
    setOrderMarks(null)
    sfx('click')
  }
  const checkOrder = () => {
    if (puzzle.kind !== 'order') return
    const marks = orderIdx.map((v, i) => v === i)
    setOrderMarks(marks)
    if (marks.every(Boolean)) succeed(puzzle.explanation)
    else fail(`${marks.filter(Boolean).length} of ${marks.length} are in the right place. ${WRONG_LINES[attempts % WRONG_LINES.length]}`)
  }

  const showHint = () => {
    if (hints >= puzzle.hints.length) return
    setHints(hints + 1)
    dispatch({ type: 'hintUsed' })
    sfx('chime')
  }

  return (
    <motion.div animate={shake}>
      <Panel className="p-5 sm:p-7" accent={color}>
        <div className="flex items-start gap-4">
          <div className="shrink-0 hidden sm:block"><Portrait id={who} size={70} mood={solved ? 'smile' : feedback && !feedback.ok ? 'surprised' : 'neutral'} /></div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="hud text-xs" style={{ color }}>{SPEAKER_NAMES[who]} · {puzzle.kind === 'choice' ? 'Decision' : puzzle.kind === 'order' ? 'Sequence' : 'Cipher challenge'}</span>
              <span className="chip" style={{ ['--accent' as string]: '#ffb547' }}>{'◆'.repeat(puzzle.difficulty)}<span className="opacity-40">{'◆'.repeat(3 - puzzle.difficulty)}</span></span>
              {puzzle.tags.map((t) => <span key={t} className="chip">{t}</span>)}
            </div>
            <p className="text-bright text-lg leading-relaxed">{puzzle.prompt}</p>
          </div>
        </div>

        {puzzle.data && (
          <div className="mt-5 rounded-xl border border-magenta/30 bg-magenta/5 p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="hud text-[11px] text-magenta">{puzzle.dataLabel ?? 'Data'}</span>
              <button className="btn btn-ghost btn-sm" onClick={() => navigator.clipboard?.writeText(puzzle.data!)} aria-label="Copy to clipboard"><Copy size={12} /></button>
            </div>
            <div className="font-mono text-lg sm:text-xl text-bright tracking-[0.15em] break-words mt-1">{puzzle.data}</div>
          </div>
        )}

        {puzzle.widget && <div className="mt-5 panel p-4"><Widget id={puzzle.widget} props={puzzle.widgetProps} reveal={false} /></div>}

        <div className="mt-5">
          {puzzle.kind === 'text' && (
            <form onSubmit={(e) => { e.preventDefault(); if (!solved) submitText() }} className="flex flex-col sm:flex-row gap-2">
              <input className="input text-lg" value={value} onChange={(e) => setValue(e.target.value)} placeholder={puzzle.placeholder ?? 'Your answer…'} disabled={solved} aria-label="Your answer" autoComplete="off" spellCheck={false} />
              <Button variant="primary" type="submit" disabled={solved} accent={color}>Submit</Button>
            </form>
          )}
          {puzzle.kind === 'choice' && (
            <div className="grid gap-2">
              {puzzle.options.map((o, i) => {
                const was = picked.includes(i)
                const state = was ? (o.correct ? 'ok' : 'bad') : solved && o.correct ? 'ok' : 'idle'
                return (
                  <button key={i} disabled={solved || was} onClick={() => pickChoice(i)} onMouseEnter={() => sfx('hover')}
                    className={`text-left rounded-xl border px-4 py-3 transition flex items-start gap-3 ${state === 'ok' ? 'border-jade bg-jade/10' : state === 'bad' ? 'border-crimson/60 bg-crimson/10 opacity-80' : 'border-white/10 hover:border-cyan/60 bg-white/[0.02]'}`}>
                    <span className={`mt-0.5 w-6 h-6 shrink-0 rounded-md grid place-items-center text-xs font-mono ${state === 'ok' ? 'bg-jade text-black' : state === 'bad' ? 'bg-crimson text-black' : 'bg-white/10 text-mist'}`}>
                      {state === 'ok' ? <Check size={14} /> : state === 'bad' ? <X size={14} /> : String.fromCharCode(65 + i)}
                    </span>
                    <span className="flex-1">
                      <span className="text-bright">{o.text}</span>
                      {was && !o.correct && <span className="block text-xs text-crimson/90 mt-1">{o.why}</span>}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
          {puzzle.kind === 'order' && (
            <div className="space-y-2">
              <ol className="space-y-2" aria-label="Arrange the steps">
                {orderIdx.map((itemIdx, pos) => (
                  <motion.li layout key={itemIdx} className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 ${orderMarks ? (orderMarks[pos] ? 'border-jade bg-jade/10' : 'border-crimson/50 bg-crimson/5') : 'border-white/10 bg-white/[0.02]'}`}>
                    <span className="hud text-xs text-mist w-5">{pos + 1}</span>
                    <span className="flex-1 text-sm text-bright">{puzzle.items[itemIdx]}</span>
                    <button className="btn btn-sm" onClick={() => move(pos, -1)} disabled={solved || pos === 0} aria-label={`Move “${puzzle.items[itemIdx]}” up`}><ArrowUp size={14} /></button>
                    <button className="btn btn-sm" onClick={() => move(pos, 1)} disabled={solved || pos === orderIdx.length - 1} aria-label={`Move “${puzzle.items[itemIdx]}” down`}><ArrowDown size={14} /></button>
                  </motion.li>
                ))}
              </ol>
              {!solved && <div className="flex justify-end"><Button variant="primary" onClick={checkOrder} accent={color}>Check sequence</Button></div>}
            </div>
          )}
        </div>

        <AnimatePresence>
          {feedback && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`mt-5 rounded-xl p-4 border flex gap-3 ${feedback.ok ? 'border-jade/50 bg-jade/10' : 'border-crimson/40 bg-crimson/10'}`} role="status">
              <div className="shrink-0"><Portrait id="aura" size={40} mood={feedback.ok ? 'smile' : 'sad'} animated={false} /></div>
              <div>
                <div className={`hud text-xs ${feedback.ok ? 'text-jade' : 'text-crimson'}`}>{feedback.ok ? (attempts === 0 ? 'Correct — first try!' : 'Correct') : 'AURA-7'}</div>
                <p className="text-sm text-ink leading-relaxed mt-1">{feedback.text}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {hints > 0 && (
          <div className="mt-4 space-y-2">
            {puzzle.hints.slice(0, hints).map((h, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className="flex gap-2 text-sm text-amber/95 bg-amber/5 border border-amber/20 rounded-lg px-3 py-2">
                <Lightbulb size={16} className="shrink-0 mt-0.5" /> <span><span className="hud text-[10px] mr-1">Hint {i + 1}</span>{h}</span>
              </motion.div>
            ))}
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <button className="btn btn-sm" style={{ ['--accent' as string]: '#ffb547' }} onClick={showHint} disabled={solved || hints >= puzzle.hints.length}>
            <Lightbulb size={14} /> {hints >= puzzle.hints.length ? 'No more hints' : `Ask AURA for a hint (${puzzle.hints.length - hints} left)`}
          </button>
          {solved && mode !== 'boss' && (
            <Button variant="primary" accent="var(--color-jade)" onClick={() => onSolved(resultRef.current!)} autoFocus>{continueLabel} <ChevronRight size={16} /></Button>
          )}
        </div>
      </Panel>
    </motion.div>
  )
}

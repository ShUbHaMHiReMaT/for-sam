import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Eye, EyeOff, Pause, Play, RotateCcw } from 'lucide-react'
import { buildSquare, cleanForPlayfair, decryptSteps, encryptSteps, preparePlaintext, stripFillers, validateCiphertext, type PlayfairConvention, type PlayfairStep } from '../crypto/playfair'
import { Button } from '../components/ui'
import { ErrorNote, Field, LabSection, Note, Toggle, useLabTracker } from './common'
import { useGame } from '../game/GameContext'

const CELL = typeof window !== 'undefined' && window.innerWidth < 420 ? 42 : 48
const GAP = 6
const center = (i: number) => i * (CELL + GAP) + CELL / 2

const RULE_TEXT = {
  row: { enc: 'Same row → each letter moves one cell to the RIGHT (wrapping to the start of the row).', dec: 'Same row → each letter moves one cell to the LEFT (wrapping).' },
  column: { enc: 'Same column → each letter moves one cell DOWN (wrapping to the top).', dec: 'Same column → each letter moves one cell UP (wrapping).' },
  rectangle: { enc: 'Rectangle → each letter stays in its own row and takes the OTHER letter’s column. (The rule is its own inverse.)', dec: 'Rectangle → each letter stays in its own row and takes the OTHER letter’s column — exactly as in encryption.' },
}

function SquareWithOverlay({ square, step, showTo }: { square: string[][]; step?: PlayfairStep; showTo: boolean }) {
  const size = 5 * CELL + 4 * GAP
  const from = step?.from ?? []
  const to = showTo ? step?.to ?? [] : []
  const isFrom = (r: number, c: number) => from.some((p) => p.r === r && p.c === c)
  const isTo = (r: number, c: number) => to.some((p) => p.r === r && p.c === c)
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div className="grid grid-cols-5" style={{ gap: GAP }}>
        {square.flatMap((row, r) => row.map((ch, c) => {
          const f = isFrom(r, c), t = isTo(r, c)
          return (
            <motion.div key={`${r}${c}`} className="grid place-items-center rounded-lg font-mono font-bold text-lg border" style={{ width: CELL, height: CELL, background: t ? 'rgb(255 79 216 / 0.28)' : f ? 'rgb(34 228 255 / 0.22)' : 'rgb(4 8 18 / 0.85)', borderColor: t ? '#ff4fd8' : f ? '#22e4ff' : 'rgb(120 170 255 / 0.15)', color: t ? '#ffd0f5' : f ? '#bff6ff' : '#c9d2e6' }} animate={{ scale: f || t ? 1.08 : 1 }}>
              {ch}
            </motion.div>
          )
        }))}
      </div>
      {step && (
        <svg className="absolute inset-0 pointer-events-none" width={size} height={size} aria-hidden="true">
          <defs>
            <marker id="pf-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#ff4fd8" /></marker>
          </defs>
          {step.rule === 'rectangle' && (
            <motion.rect key={step.input} x={Math.min(step.from[0].c, step.from[1].c) * (CELL + GAP) - 3} y={Math.min(step.from[0].r, step.from[1].r) * (CELL + GAP) - 3} width={(Math.abs(step.from[0].c - step.from[1].c)) * (CELL + GAP) + CELL + 6} height={(Math.abs(step.from[0].r - step.from[1].r)) * (CELL + GAP) + CELL + 6} rx="10" fill="none" stroke="#ffb547" strokeWidth="2.5" strokeDasharray="8 5" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ transformOrigin: 'center' }} />
          )}
          {showTo && step.rule !== 'rectangle' && step.from.map((f, i) => {
            const t = step.to[i]
            const wraps = step.rule === 'row' ? Math.abs(t.c - f.c) > 1 : Math.abs(t.r - f.r) > 1
            if (wraps) return null
            return <motion.path key={`${step.input}${i}`} d={`M${center(f.c)} ${center(f.r)} L${center(t.c)} ${center(t.r)}`} stroke="#ff4fd8" strokeWidth="3" fill="none" markerEnd="url(#pf-arrow)" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5 }} />
          })}
          {showTo && step.rule === 'rectangle' && step.from.map((f, i) => {
            const t = step.to[i]
            return <motion.path key={`${step.input}r${i}`} d={`M${center(f.c)} ${center(f.r) + 14} L${center(t.c)} ${center(t.r) + 14}`} stroke="#ff4fd8" strokeWidth="2.5" fill="none" markerEnd="url(#pf-arrow)" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6, delay: i * 0.15 }} />
          })}
        </svg>
      )}
    </div>
  )
}

export default function PlayfairLab() {
  const track = useLabTracker('playfair')
  const { sfx, reducedMotion } = useGame()
  const [keyword, setKeyword] = useState('PLAYFAIR EXAMPLE')
  const [conv, setConv] = useState<PlayfairConvention>('IJ')
  const [mode, setMode] = useState<'enc' | 'dec'>('enc')
  const [input, setInput] = useState('Hide the gold in the tree stump')
  const [i, setI] = useState(0)
  const [predict, setPredict] = useState(false)
  const [revealed, setRevealed] = useState(true)
  const [guess, setGuess] = useState('')
  const [guessResult, setGuessResult] = useState<boolean | null>(null)
  const [playing, setPlaying] = useState(false)

  const square = useMemo(() => buildSquare(keyword, conv), [keyword, conv])
  const result = useMemo((): { steps: PlayfairStep[]; error: string | null } => {
    try {
      if (mode === 'enc') {
        if (!cleanForPlayfair(input, conv)) return { steps: [], error: 'Enter some plaintext letters.' }
        return { steps: encryptSteps(input, keyword, conv), error: null }
      }
      const err = validateCiphertext(input, conv)
      if (err) return { steps: [], error: err }
      return { steps: decryptSteps(input, keyword, conv), error: null }
    } catch (e) {
      return { steps: [], error: (e as Error).message }
    }
  }, [input, keyword, conv, mode])
  const steps = result.steps
  const prep = useMemo(() => (mode === 'enc' ? preparePlaintext(input, conv) : null), [input, conv, mode])
  const step = steps[Math.min(i, steps.length - 1)]
  const output = steps.map((s) => s.output).join('')

  useEffect(() => { setI(0); setRevealed(!predict); setGuess(''); setGuessResult(null) }, [input, keyword, conv, mode, predict])
  useEffect(() => { setRevealed(!predict); setGuess(''); setGuessResult(null) }, [i, predict])
  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => setI((x) => { if (x >= steps.length - 1) { setPlaying(false); return x } sfx('click'); return x + 1 }), reducedMotion ? 600 : 1300)
    return () => clearInterval(id)
  }, [playing, steps.length, sfx, reducedMotion])

  const checkGuess = () => {
    if (!step) return
    const ok = cleanForPlayfair(guess, conv) === step.output
    setGuessResult(ok)
    setRevealed(true)
    sfx(ok ? 'success' : 'error')
    track()
  }

  // Common implementation mistakes, computed live on the current inputs.
  const mistakes = useMemo(() => {
    const out: { title: string; detail: string }[] = []
    if (mode !== 'enc' || !steps.length) return out
    const sq = square
    const wrongDir = steps.map((s) => s.rule === 'rectangle' ? s.output : decryptSteps(s.input, keyword, conv)[0].output).join('')
    out.push({ title: 'Shifting the wrong way when encrypting', detail: `Using left/up instead of right/down gives ${wrongDir} instead of ${output}. The receiver then “decrypts” it into nonsense.` })
    const swapped = steps.map((s) => (s.rule === 'rectangle' ? s.output[1] + s.output[0] : s.output)).join('')
    out.push({ title: 'Swapping the rectangle corners', detail: `Taking the other letter’s ROW instead of its column reverses each rectangle pair: ${swapped} instead of ${output}.` })
    out.push({ title: 'Not splitting doubled letters', detail: 'A pair like “LL” has no defined rule — both letters share one cell. Implementations must insert a filler (here X, or Q for “XX”) before encrypting.' })
    out.push({ title: conv === 'IJ' ? 'Forgetting to merge J into I' : 'Forgetting to drop Q', detail: `The square holds 25 letters (${sq.flat().join('')}). A ${conv === 'IJ' ? 'J' : 'Q'} that isn’t converted has no cell, so lookup fails.` })
    out.push({ title: 'Blindly stripping fillers after decrypting', detail: 'Removing every X between equal letters is a guess: real words like “TAXI” or “EXIT” can be damaged. Humans remove fillers using context.' })
    return out
  }, [mode, steps, square, keyword, conv, output])

  return (
    <div className="space-y-5">
      <LabSection kicker="Configure" title="Key square & conventions" accent="var(--color-amber)">
        <div className="grid md:grid-cols-3 gap-4">
          <Field label="Keyword"><input className="input" value={keyword} onChange={(e) => { setKeyword(e.target.value); track() }} /></Field>
          <div><span className="hud text-[11px] text-mist">Alphabet convention</span><div className="mt-1"><Toggle label="Convention" value={conv} onChange={(v) => { setConv(v); track() }} options={[{ id: 'IJ', label: 'Merge I/J' }, { id: 'noQ', label: 'Omit Q' }]} /></div></div>
          <div><span className="hud text-[11px] text-mist">Direction</span><div className="mt-1"><Toggle label="Direction" value={mode} onChange={(v) => { setMode(v); if (v === 'dec' && output) setInput(output); track() }} options={[{ id: 'enc', label: 'Encrypt' }, { id: 'dec', label: 'Decrypt' }]} /></div></div>
        </div>
        <Note>Conventions used here: {conv === 'IJ' ? 'J is merged into I' : 'Q is omitted'}; X is the filler between doubled letters (Q — or Z without Q — when the doubled letter is X); an odd final letter is padded the same way; encryption shifts right/down. Historical implementations differ.</Note>
      </LabSection>

      <LabSection kicker="Step through" title={mode === 'enc' ? 'Encrypt digraph by digraph' : 'Decrypt digraph by digraph'}>
        <Field label={mode === 'enc' ? 'Plaintext' : 'Ciphertext'}><input className="input" value={input} onChange={(e) => { setInput(e.target.value); track() }} /></Field>
        <ErrorNote text={result.error} />
        {prep && !result.error && (
          <div className="mt-4">
            <div className="hud text-[11px] text-mist mb-1">Prepared digraphs</div>
            <div className="flex flex-wrap gap-1.5 font-mono">
              {prep.digraphs.map((d, k) => {
                const base = k * 2
                return (
                  <button key={k} onClick={() => setI(k)} className={`px-2 py-1 rounded-md border text-sm ${k === i ? 'border-cyan bg-cyan/15 text-cyan' : 'border-white/10 text-ink'}`} aria-label={`Digraph ${k + 1}: ${d}`}>
                    {d.split('').map((ch, j) => <span key={j} className={prep.fillers.includes(base + j) ? 'text-amber underline decoration-dotted' : ''}>{ch}</span>)}
                  </button>
                )
              })}
            </div>
            <div className="text-[11px] text-mist mt-1"><span className="text-amber">Amber</span> letters are inserted fillers.</div>
          </div>
        )}
        {step && (
          <div className="mt-6 flex flex-col lg:flex-row gap-6 items-start">
            <div className="overflow-x-auto max-w-full"><SquareWithOverlay square={square} step={step} showTo={revealed} /></div>
            <div className="flex-1 min-w-0 space-y-3">
              <div className="hud text-xs text-mist">Pair {i + 1} of {steps.length}</div>
              <div className="flex items-center gap-4 font-mono text-3xl">
                <span className="text-cyan">{step.input}</span>
                <ChevronRight className="text-mist" />
                <AnimatePresence mode="wait">
                  {revealed ? <motion.span key={step.output} className="text-magenta" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>{step.output}</motion.span> : <span className="text-mist">??</span>}
                </AnimatePresence>
              </div>
              <div className="chip" style={{ ['--accent' as string]: '#ffb547' }}>{step.rule} rule</div>
              <p className="text-sm text-ink">{RULE_TEXT[step.rule][mode]}</p>
              {predict && !revealed && (
                <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); checkGuess() }}>
                  <input className="input !w-32" maxLength={2} value={guess} onChange={(e) => setGuess(e.target.value)} placeholder="Predict" aria-label="Predict the output pair" autoFocus />
                  <Button variant="primary" type="submit">Check</Button>
                  <Button type="button" onClick={() => setRevealed(true)}>Reveal</Button>
                </form>
              )}
              {guessResult !== null && <div className={`text-sm ${guessResult ? 'text-jade' : 'text-crimson'}`}>{guessResult ? 'Correct prediction!' : `Not quite — it’s ${step.output}.`}</div>}
              <div className="flex flex-wrap gap-2 pt-2">
                <Button size="sm" onClick={() => { setI(Math.max(0, i - 1)); track() }} disabled={i === 0}><ChevronLeft size={14} /> Prev</Button>
                <Button size="sm" variant="primary" onClick={() => { setI(Math.min(steps.length - 1, i + 1)); track() }} disabled={i >= steps.length - 1}>Next <ChevronRight size={14} /></Button>
                <Button size="sm" onClick={() => { setPlaying(!playing); track() }} disabled={predict}>{playing ? <Pause size={14} /> : <Play size={14} />} {playing ? 'Pause' : 'Auto-play'}</Button>
                <Button size="sm" onClick={() => setI(0)}><RotateCcw size={14} /></Button>
                <Button size="sm" onClick={() => setPredict(!predict)} accent="var(--color-magenta)">{predict ? <EyeOff size={14} /> : <Eye size={14} />} Predict mode {predict ? 'on' : 'off'}</Button>
              </div>
            </div>
          </div>
        )}
        {steps.length > 0 && (
          <div className="mt-6 grid sm:grid-cols-2 gap-3">
            <div className="rounded-xl bg-black/30 border border-white/10 p-3">
              <div className="hud text-[11px] text-mist">Full {mode === 'enc' ? 'ciphertext' : 'decryption (with fillers)'}</div>
              <div className="font-mono text-magenta break-all mt-1">{output.match(/.{1,2}/g)?.map((d, k) => <span key={k} className={k === i ? 'bg-magenta/20 rounded px-0.5' : 'px-0.5'}>{d}</span>)}</div>
            </div>
            {mode === 'dec' && (
              <div className="rounded-xl bg-black/30 border border-white/10 p-3">
                <div className="hud text-[11px] text-mist">Filler-stripped guess</div>
                <div className="font-mono text-jade break-all mt-1">{stripFillers(output)}</div>
              </div>
            )}
          </div>
        )}
      </LabSection>

      {mistakes.length > 0 && (
        <LabSection kicker="Inspect" title="Common implementation mistakes" accent="var(--color-crimson)">
          <div className="grid md:grid-cols-2 gap-3">
            {mistakes.map((m) => (
              <details key={m.title} className="rounded-xl border border-white/10 bg-black/20 p-3 group" onToggle={track}>
                <summary className="cursor-pointer text-bright text-sm list-none flex justify-between items-center">{m.title}<ChevronRight size={14} className="text-mist group-open:rotate-90 transition" /></summary>
                <p className="text-sm text-mist mt-2">{m.detail}</p>
              </details>
            ))}
          </div>
        </LabSection>
      )}

      <LabSection kicker="Security analysis" title="Why Playfair is history, not protection" accent="var(--color-mist)">
        <ul className="text-sm text-ink space-y-2 list-disc pl-5">
          <li>It is a fixed substitution on 25 × 24 = 600 possible digraphs, so digraph frequencies (TH, HE, IN, ER…) leak.</li>
          <li>A pair and its reverse encrypt to reversed ciphertext (if AB → XY then BA → YX) — a strong clue for analysts.</li>
          <li>No letter ever encrypts to itself within a pair, and doubled letters never appear inside a ciphertext digraph.</li>
          <li>Used for tactical messages (Boer War, WWI) because it was fast by hand and only needed to hold for hours.</li>
        </ul>
      </LabSection>
    </div>
  )
}

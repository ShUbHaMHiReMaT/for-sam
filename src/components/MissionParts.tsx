import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronRight, FastForward, Info, Lightbulb, Search, ShieldAlert, Sparkles } from 'lucide-react'
import type { CharacterId, DialogueLine, LessonBlock, Step } from '../game/types'
import { useGame } from '../game/GameContext'
import { SPEAKER_COLORS, SPEAKER_NAMES, loreById } from '../data/world'
import { Portrait } from './Portrait'
import { Button, Panel, useTypewriter } from './ui'
import { Widget } from './widgets'

/** Replace the default protagonist name with the player's chosen first name. */
export function usePersonalize() {
  const { state } = useGame()
  const first = (state.profile.name || 'Kael').split(/\s+/)[0]
  return (text: string) => (first === 'Kael' ? text : text.replace(/\bKael\b/g, first))
}

export function speakerName(who: CharacterId, playerFirst: string) {
  return who === 'kael' ? playerFirst : SPEAKER_NAMES[who] ?? who
}

export function DialogueLineView({ line, onNext, isLast }: { line: DialogueLine; onNext: () => void; isLast?: boolean }) {
  const { state, sfx } = useGame()
  const personalize = usePersonalize()
  const first = (state.profile.name || 'Kael').split(/\s+/)[0]
  const text = personalize(line.text)
  const tw = useTypewriter(text, state.settings.textSpeed, () => sfx('type'))
  const color = SPEAKER_COLORS[line.who] ?? '#22e4ff'
  const isPlayer = line.who === 'kael'
  const advance = () => (tw.done ? onNext() : tw.complete())
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.key === 'Enter' || e.key === ' ') && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLButtonElement)) { e.preventDefault(); advance() }
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  })
  return (
    <div className={`flex items-end gap-3 sm:gap-6 ${isPlayer ? 'flex-row-reverse' : ''}`}>
      <motion.div key={line.who + (line.mood ?? '')} initial={{ opacity: 0, x: isPlayer ? 30 : -30 }} animate={{ opacity: 1, x: 0 }} className="shrink-0 hidden sm:block">
        <Portrait id={line.who} mood={line.mood} costume={isPlayer ? state.profile.costume : undefined} size={typeof window !== 'undefined' && window.innerWidth < 640 ? 90 : 150} />
      </motion.div>
      <button type="button" onClick={advance} className="panel flex-1 text-left p-4 sm:p-6 min-h-[130px] cursor-pointer" style={{ borderColor: `${color}55` }} aria-live="polite">
        <div className="flex items-center gap-2 mb-2">
          <span className="sm:hidden"><Portrait id={line.who} mood={line.mood} size={34} animated={false} costume={isPlayer ? state.profile.costume : undefined} /></span>
          <span className="hud text-sm" style={{ color }}>{speakerName(line.who, first)}</span>
        </div>
        <p className="text-bright text-base sm:text-lg leading-relaxed">{tw.shown}<span className={`inline-block w-2 ml-0.5 ${tw.done ? 'opacity-0' : 'anim-pulse'}`}>▍</span></p>
        <div className="flex justify-end mt-2 text-mist text-xs hud items-center gap-1">{tw.done ? (isLast ? 'Continue' : 'Next') : 'Click to complete'} <ChevronRight size={14} /></div>
      </button>
    </div>
  )
}

export function DialogueStep({ lines, onDone }: { lines: DialogueLine[]; onDone: () => void }) {
  const [i, setI] = useState(0)
  return (
    <div className="space-y-4">
      <AnimatePresence mode="wait">
        <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
          <DialogueLineView line={lines[i]} isLast={i === lines.length - 1} onNext={() => (i < lines.length - 1 ? setI(i + 1) : onDone())} />
        </motion.div>
      </AnimatePresence>
      <div className="flex justify-between items-center text-xs text-mist">
        <span className="hud">{i + 1} / {lines.length}</span>
        <button className="btn btn-ghost btn-sm" onClick={onDone}><FastForward size={14} /> Skip dialogue</button>
      </div>
    </div>
  )
}

const CALLOUT = {
  info: { icon: Info, color: '#22e4ff' },
  warn: { icon: ShieldAlert, color: '#ffb547' },
  myth: { icon: Lightbulb, color: '#ff4fd8' },
}

export function LessonBlocks({ blocks }: { blocks: LessonBlock[] }) {
  const personalize = usePersonalize()
  return (
    <div className="space-y-4 prose-game">
      {blocks.map((b, i) => {
        switch (b.t) {
          case 'p': return <p key={i} className="text-ink leading-relaxed">{personalize(b.text)}</p>
          case 'h': return <h3 key={i} className="hud text-cyan text-sm pt-2">{b.text}</h3>
          case 'list': return <ul key={i} className="space-y-2">{b.items.map((it, j) => <li key={j} className="flex gap-2 text-ink leading-relaxed"><span className="text-cyan mt-1.5 w-1.5 h-1.5 rotate-45 bg-cyan shrink-0" />{it}</li>)}</ul>
          case 'code': return <pre key={i} className="font-mono text-xs sm:text-sm bg-black/40 border border-white/10 rounded-lg p-4 overflow-x-auto text-jade whitespace-pre">{b.text}</pre>
          case 'callout': {
            const c = CALLOUT[b.tone]
            return (
              <div key={i} className="rounded-xl p-4 border flex gap-3" style={{ borderColor: `${c.color}44`, background: `${c.color}0d` }}>
                <c.icon size={18} style={{ color: c.color }} className="shrink-0 mt-0.5" />
                <div><div className="hud text-xs mb-1" style={{ color: c.color }}>{b.title}</div><p className="text-sm text-ink leading-relaxed">{b.text}</p></div>
              </div>
            )
          }
          case 'widget': return <div key={i} className="panel p-4"><Widget id={b.widget} props={b.props} reveal /></div>
        }
      })}
    </div>
  )
}

export function LessonStep({ step, onDone }: { step: Extract<Step, { kind: 'lesson' }>; onDone: () => void }) {
  const who = step.who ?? 'aura'
  return (
    <Panel className="p-5 sm:p-8" accent={SPEAKER_COLORS[who]}>
      <div className="flex items-center gap-3 mb-5">
        <Portrait id={who} size={56} mood="smile" />
        <div>
          <div className="hud text-xs" style={{ color: SPEAKER_COLORS[who] }}>Lesson · {SPEAKER_NAMES[who]}</div>
          <h2 className="font-display text-2xl text-bright">{step.title}</h2>
        </div>
      </div>
      <LessonBlocks blocks={step.blocks} />
      <div className="flex justify-end mt-8"><Button variant="primary" onClick={onDone}>I understand <ChevronRight size={16} /></Button></div>
    </Panel>
  )
}

export function InvestigateStep({ step, onDone }: { step: Extract<Step, { kind: 'investigate' }>; onDone: () => void }) {
  const { state, dispatch, sfx } = useGame()
  const [open, setOpen] = useState<string | null>(null)
  const [seen, setSeen] = useState<string[]>([])
  const inspect = (id: string, lore?: string) => {
    setOpen(id)
    if (!seen.includes(id)) setSeen([...seen, id])
    sfx('chime')
    if (lore && !state.lore.includes(lore)) dispatch({ type: 'lore', id: lore })
  }
  const active = step.clues.find((c) => c.id === open)
  const activeLore = active?.lore ? loreById(active.lore) : null
  return (
    <Panel className="p-5 sm:p-8" accent="#ffb547">
      <div className="hud text-xs text-amber flex items-center gap-2"><Search size={14} /> Investigation · optional clues</div>
      <h2 className="font-display text-2xl text-bright mt-1">{step.title}</h2>
      <p className="text-mist mt-2">{step.text}</p>
      <div className="grid md:grid-cols-[1fr_1.3fr] gap-4 mt-5">
        <div className="flex flex-col gap-2">
          {step.clues.map((c) => {
            const found = c.lore ? state.lore.includes(c.lore) : seen.includes(c.id)
            return (
              <button key={c.id} onClick={() => inspect(c.id, c.lore)} className={`text-left rounded-xl border px-4 py-3 transition ${open === c.id ? 'border-amber bg-amber/10' : 'border-white/10 hover:border-amber/50 bg-white/[0.02]'}`} aria-pressed={open === c.id}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-bright text-sm">{c.label}</span>
                  {found && <Sparkles size={14} className="text-amber shrink-0" aria-label="inspected" />}
                </div>
              </button>
            )
          })}
        </div>
        <div className="rounded-xl border border-white/10 bg-black/30 p-4 min-h-[160px]">
          <AnimatePresence mode="wait">
            {active ? (
              <motion.div key={active.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                <div className="hud text-xs text-amber">{active.label}</div>
                <p className="text-ink mt-2 text-sm leading-relaxed">{active.detail}</p>
                {activeLore && (
                  <div className="mt-4 border-l-2 border-amber pl-3">
                    <div className="hud text-[11px] text-amber">Lore recovered · {activeLore.title}</div>
                    <p className="text-sm text-bright/90 italic mt-1 leading-relaxed">{activeLore.text}</p>
                    <div className="text-[11px] text-mist mt-1">— {activeLore.source}</div>
                  </div>
                )}
              </motion.div>
            ) : <p className="text-mist text-sm">Select a clue to inspect it.</p>}
          </AnimatePresence>
        </div>
      </div>
      <div className="flex justify-between items-center mt-6">
        <span className="text-xs text-mist">{seen.length}/{step.clues.length} inspected</span>
        <Button variant="primary" accent="var(--color-amber)" onClick={onDone}>Continue <ChevronRight size={16} /></Button>
      </div>
    </Panel>
  )
}

export function ChoiceStep({ step, onDone }: { step: Extract<Step, { kind: 'choice' }>; onDone: () => void }) {
  const { dispatch, state, sfx } = useGame()
  const personalize = usePersonalize()
  const [picked, setPicked] = useState<string | null>(null)
  const who = step.who ?? 'aura'
  const opt = step.options.find((o) => o.id === picked)
  const [replyIdx, setReplyIdx] = useState(0)
  const choose = (id: string) => {
    const o = step.options.find((x) => x.id === id)!
    setPicked(id)
    sfx('chime')
    dispatch({ type: 'flag', key: step.id, value: id })
    if (o.relationship) dispatch({ type: 'relationship', deltas: o.relationship })
    if (o.lore && !state.lore.includes(o.lore)) dispatch({ type: 'lore', id: o.lore })
    if (step.id === 'finalChoice' && id === 'open') dispatch({ type: 'flag', key: 'kerckhoffs', value: true })
  }
  if (opt) {
    return <DialogueLineView line={opt.reply[replyIdx]} isLast={replyIdx === opt.reply.length - 1} onNext={() => (replyIdx < opt.reply.length - 1 ? setReplyIdx(replyIdx + 1) : onDone())} />
  }
  return (
    <div className="space-y-4">
      <div className="flex items-end gap-4">
        <Portrait id={who} size={110} mood="neutral" />
        <Panel className="flex-1 p-5" accent={SPEAKER_COLORS[who]}>
          <div className="hud text-xs mb-1" style={{ color: SPEAKER_COLORS[who] }}>Story choice · {SPEAKER_NAMES[who]}</div>
          <p className="text-bright text-lg leading-relaxed">{personalize(step.prompt)}</p>
        </Panel>
      </div>
      <div className="grid gap-2">
        {step.options.map((o) => (
          <button key={o.id} onClick={() => choose(o.id)} onMouseEnter={() => sfx('hover')} className="text-left panel px-5 py-4 hover:border-cyan transition group">
            <span className="text-ink group-hover:text-bright">{o.label}</span>
          </button>
        ))}
      </div>
      <p className="text-xs text-mist">Choices shape relationships and the ending. There are no wrong answers here — only consequences.</p>
    </div>
  )
}

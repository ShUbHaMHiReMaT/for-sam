import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, BookOpen, ExternalLink, FlaskConical, ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react'
import { ENCYCLOPEDIA } from '../data/encyclopedia'
import { useGame } from '../game/GameContext'
import { masteryTier } from '../game/progression'
import { Bar, Button, Panel, SectionTitle } from '../components/ui'
import { PuzzleView } from '../components/PuzzleView'

const SEC = { broken: { icon: ShieldAlert, color: '#ff3d6e', label: 'Broken — historical only' }, secure: { icon: ShieldCheck, color: '#4dffb8', label: 'Secure when used correctly' }, depends: { icon: ShieldQuestion, color: '#ffb547', label: 'Secure only with correct parameters & use' } }

export default function Encyclopedia() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { state } = useGame()
  const entry = ENCYCLOPEDIA.find((e) => e.id === id)
  const [quizDone, setQuizDone] = useState(false)

  if (!entry) {
    return (
      <div>
        <SectionTitle kicker="Algorithm encyclopedia" title="The Archive of Algorithms" sub="Every entry: what it is, why it exists, how keys work, a worked example, a lab, a misconception, a security analysis, real-world use, a mastery check and references." />
        {(['Historical', 'Modern', 'Post-quantum', 'Concept'] as const).map((era) => (
          <div key={era} className="mb-8">
            <h2 className="hud text-sm text-mist mb-3">{era}</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {ENCYCLOPEDIA.filter((e) => e.era === era).map((e) => {
                const s = SEC[e.secure]
                const m = state.mastery[e.id] ?? 0
                return (
                  <button key={e.id} onClick={() => navigate(`/encyclopedia/${e.id}`)} className="panel p-4 text-left hover:-translate-y-0.5 transition">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-display text-lg text-bright">{e.name}</div>
                      <s.icon size={18} style={{ color: s.color }} aria-label={s.label} />
                    </div>
                    <div className="text-xs text-mist">{e.family}</div>
                    <p className="text-sm text-ink/80 mt-2 line-clamp-2">{e.what}</p>
                    <div className="mt-3 flex items-center gap-2"><Bar value={m / 100} color="var(--color-jade)" height={4} /><span className="text-[10px] hud text-mist whitespace-nowrap">{masteryTier(m).name}</span></div>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    )
  }

  const s = SEC[entry.secure]
  const m = state.mastery[entry.id] ?? 0
  const sections: [string, string][] = [
    ['What it is', entry.what], ['Why it exists', entry.why], ['The problem it solves', entry.problem], ['Inputs & outputs', entry.io], ['Keys & parameters', entry.keys], ['Worked example', entry.example],
  ]
  return (
    <div className="max-w-4xl mx-auto">
      <button className="btn btn-ghost btn-sm mb-4" onClick={() => navigate('/encyclopedia')}><ArrowLeft size={14} /> All algorithms</button>
      <div className="flex flex-wrap items-center gap-2">
        <span className="chip">{entry.era}</span>
        <span className="chip" style={{ ['--accent' as string]: s.color }}><s.icon size={12} /> {s.label}</span>
      </div>
      <h1 className="font-display text-3xl sm:text-4xl text-bright mt-2">{entry.name}</h1>
      <div className="text-mist">{entry.family}</div>
      <div className="mt-3 max-w-sm flex items-center gap-2"><Bar value={m / 100} color="var(--color-jade)" /><span className="hud text-[11px] text-mist whitespace-nowrap">Mastery {m}/100 · {masteryTier(m).name}</span></div>

      <div className="grid md:grid-cols-2 gap-4 mt-6">
        {sections.map(([t, body]) => (
          <Panel key={t} className="p-4"><div className="hud text-[11px] text-cyan">{t}</div><p className="text-ink mt-1 leading-relaxed text-sm">{body}</p></Panel>
        ))}
      </div>
      <Panel className="p-4 mt-4 flex flex-col sm:flex-row sm:items-center gap-3" accent="#22e4ff">
        <FlaskConical className="text-cyan shrink-0" />
        <div className="flex-1"><div className="hud text-[11px] text-cyan">Interactive experiment</div><p className="text-sm text-ink">Try it yourself — every output is computed live.</p></div>
        <Button variant="primary" onClick={() => navigate(`/lab/${entry.lab}`)}>Open the lab</Button>
      </Panel>
      <div className="grid md:grid-cols-2 gap-4 mt-4">
        <Panel className="p-4" accent="#ff4fd8"><div className="hud text-[11px] text-magenta">Common misconception</div><p className="text-ink mt-1 text-sm leading-relaxed">{entry.misconception}</p></Panel>
        <Panel className="p-4" accent={s.color}><div className="hud text-[11px]" style={{ color: s.color }}>Security analysis</div><p className="text-ink mt-1 text-sm leading-relaxed">{entry.security}</p></Panel>
      </div>
      <Panel className="p-4 mt-4"><div className="hud text-[11px] text-amber">Real-world use</div><p className="text-ink mt-1 text-sm leading-relaxed">{entry.realWorld}</p></Panel>

      <h2 className="font-display text-2xl text-bright mt-8 mb-3">Mastery check</h2>
      <PuzzleView key={entry.id} puzzle={entry.quiz} who="aura" mode="practice" onSolved={() => setQuizDone(true)} continueLabel="Done" />
      {quizDone && <p className="text-jade text-sm mt-2">Recorded. Keep going in the campaign or Practice mode to raise this mastery further.</p>}

      <h2 className="font-display text-2xl text-bright mt-8 mb-3 flex items-center gap-2"><BookOpen size={20} /> References</h2>
      <ul className="space-y-2">
        {entry.refs.map((r) => (
          <li key={r.url}><a href={r.url} target="_blank" rel="noopener noreferrer" className="text-cyan hover:underline text-sm inline-flex items-center gap-1">{r.label} <ExternalLink size={12} /></a></li>
        ))}
      </ul>
      <p className="text-xs text-mist mt-6">No algorithm is “unbreakable.” Security statements reflect publicly known attacks and standards at the time of writing.</p>
    </div>
  )
}

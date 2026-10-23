import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Brain, Clock, Lightbulb, Target, XCircle } from 'lucide-react'
import { useGame } from '../game/GameContext'
import { levelProgress, masteryTier, bossGrade } from '../game/progression'
import { averageBossAccuracy } from '../game/meta'
import { BOSSES } from '../data/bosses'
import { ENCYCLOPEDIA } from '../data/encyclopedia'
import { MISSIONS } from '../data/campaign'
import { Portrait } from '../components/Portrait'
import { Bar, Button, Panel, SectionTitle } from '../components/ui'
import type { AlgoId } from '../game/types'

const LABELS: Partial<Record<AlgoId, string>> = { basics: 'Foundations' }

export default function Profile() {
  const { state } = useGame()
  const navigate = useNavigate()
  const lp = levelProgress(state.xp)
  const algos = [...new Set<AlgoId>(['basics', ...ENCYCLOPEDIA.map((e) => e.id), 'analysis'])]
  const firstTryRate = state.stats.solved ? state.stats.firstTry / Math.max(1, Object.keys(state.puzzles).length) : 0
  const weakest = algos.filter((a) => (state.mastery[a] ?? 0) > 0).sort((a, b) => (state.mastery[a] ?? 0) - (state.mastery[b] ?? 0))[0]
  return (
    <div>
      <SectionTitle kicker="Player profile" title={state.profile.name} sub={`${state.profile.title} · ${state.profile.pronouns} · Guardian since ${state.profile.createdAt ? new Date(state.profile.createdAt).toLocaleDateString() : 'today'}`} />
      <div className="grid lg:grid-cols-[300px_1fr] gap-5">
        <Panel className="p-5 flex flex-col items-center">
          <Portrait id="kael" costume={state.profile.costume} size={200} mood="smile" />
          <div className="w-full mt-3">
            <div className="flex justify-between text-xs hud text-mist mb-1"><span>Level {lp.level}</span><span>{state.xp} XP</span></div>
            <Bar value={lp.pct} height={8} />
            <div className="text-[11px] text-mist mt-1 text-right">{lp.needed - lp.into} XP to level {lp.level + 1}</div>
          </div>
          <div className="w-full grid grid-cols-2 gap-2 mt-4 text-center">
            <Mini label="Missions" value={`${MISSIONS.filter((m) => state.missions[m.id]?.completed).length}/${MISSIONS.length}`} />
            <Mini label="Bosses" value={`${Object.values(state.bosses).filter((b) => b.defeated).length}/${BOSSES.length}`} />
            <Mini label="Skills" value={`${Object.keys(state.skills).length}`} />
            <Mini label="Lore" value={`${state.lore.length}`} />
          </div>
          <Button size="sm" className="mt-4" onClick={() => navigate('/create')}>Edit identity</Button>
        </Panel>
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat icon={<Brain size={14} />} label="Puzzles solved" value={String(Object.keys(state.puzzles).length)} />
            <Stat icon={<Target size={14} />} label="First-try rate" value={`${Math.round(firstTryRate * 100)}%`} />
            <Stat icon={<Lightbulb size={14} />} label="Hints used" value={String(state.stats.hints)} />
            <Stat icon={<XCircle size={14} />} label="Mistakes learned from" value={String(state.stats.mistakes)} />
          </div>
          <Panel className="p-5">
            <h2 className="hud text-sm text-bright mb-4">Algorithm mastery</h2>
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
              {algos.map((a) => {
                const v = state.mastery[a] ?? 0
                const t = masteryTier(v)
                const name = LABELS[a] ?? ENCYCLOPEDIA.find((e) => e.id === a)?.name ?? a
                return (
                  <div key={a}>
                    <div className="flex justify-between text-xs"><span className="text-ink truncate pr-2">{name}</span><span className="hud text-mist whitespace-nowrap">{t.name} · {v}</span></div>
                    <Bar value={v / 100} color={['#3b5070', '#5aa8ff', '#22e4ff', '#4dffb8', '#ffb547'][t.tier]} height={5} className="mt-1" />
                  </div>
                )
              })}
            </div>
            {weakest && <p className="text-sm text-mist mt-4">AURA-7 suggests: practise <span className="text-cyan">{LABELS[weakest] ?? ENCYCLOPEDIA.find((e) => e.id === weakest)?.name}</span> next. <button className="text-cyan underline" onClick={() => navigate('/practice')}>Open practice</button></p>}
          </Panel>
          <Panel className="p-5">
            <h2 className="hud text-sm text-bright mb-3">Boss records · average accuracy {Math.round(averageBossAccuracy(state) * 100)}%</h2>
            <div className="grid sm:grid-cols-2 gap-2">
              {BOSSES.map((b) => {
                const r = state.bosses[b.id]
                return (
                  <div key={b.id} className="flex items-center gap-3 rounded-xl border border-white/5 p-2">
                    <Portrait id={b.art} size={34} animated={false} />
                    <div className="flex-1 min-w-0 text-sm"><div className="text-bright truncate">{b.name}</div><div className="text-[11px] text-mist">{r ? `${r.attempts} attempt${r.attempts === 1 ? '' : 's'} · ${r.wins} win${r.wins === 1 ? '' : 's'}` : 'Not encountered'}</div></div>
                    {r?.defeated && <span className="font-display text-lg" style={{ color: b.color }}>{bossGrade(r.bestAccuracy)}</span>}
                  </div>
                )
              })}
            </div>
          </Panel>
          <Panel className="p-4 flex items-center gap-3 text-sm text-mist"><Clock size={16} /> Sessions: {state.stats.sessions} · Labs explored: {state.stats.labs.length}/9 · Daily best streak: {state.daily.best}</Panel>
        </div>
      </div>
    </div>
  )
}

function Mini({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-black/30 p-2"><div className="hud text-[9px] text-mist">{label}</div><div className="text-bright font-display">{value}</div></div>
}
function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <Panel className="p-3"><div className="hud text-[10px] text-mist flex items-center gap-1">{icon}{label}</div><div className="font-display text-2xl text-bright">{value}</div></Panel>
}

import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle2, ChevronRight, Lock, Play, Skull, Swords } from 'lucide-react'
import { useGame } from '../game/GameContext'
import { CHAPTERS, SIDE_MISSIONS, chapterStatus, missionById, missionUnlocked, nextMission } from '../data/campaign'
import { bossById } from '../data/bosses'
import { REGIONS } from '../data/world'
import { Bar, Button, Panel, SectionTitle } from '../components/ui'
import { Portrait } from '../components/Portrait'
import { ENDINGS } from '../game/meta'

export default function Campaign() {
  const { state } = useGame()
  const navigate = useNavigate()
  const nm = nextMission(state)

  return (
    <div>
      <SectionTitle kicker="Story campaign" title="The War of Broken Realms" sub="Eight chapters. Each one teaches a real part of cryptography — and each one changes the world when you finish it." />
      {nm && (
        <Panel className="p-4 sm:p-5 mb-8 flex flex-col sm:flex-row gap-4 items-start sm:items-center" accent="#ffb547">
          <div className="flex-1">
            <div className="hud text-xs text-amber">{state.missions[nm.id]?.step ? 'Continue where you left off' : 'Your next mission'}</div>
            <div className="font-display text-xl text-bright">{nm.title}</div>
            <p className="text-sm text-mist">{nm.summary}</p>
          </div>
          <Button variant="primary" accent="var(--color-amber)" onClick={() => navigate(`/mission/${nm.id}`)}><Play size={16} /> {state.missions[nm.id]?.step ? `Resume · step ${state.missions[nm.id].step + 1}` : 'Begin'}</Button>
        </Panel>
      )}
      {state.ending && (
        <Panel className="p-4 mb-8 flex items-center gap-4" accent="#ff1f3d">
          <Portrait id="null" size={50} animated={false} />
          <div className="flex-1"><div className="hud text-xs text-crimson">Ending reached</div><div className="text-bright">{ENDINGS[state.ending as keyof typeof ENDINGS]?.name}</div></div>
          <Button size="sm" onClick={() => navigate('/ending')}>Revisit</Button>
        </Panel>
      )}

      <div className="relative">
        <div className="absolute left-5 sm:left-7 top-0 bottom-0 w-px bg-gradient-to-b from-cyan/40 via-orchid/30 to-crimson/40" aria-hidden="true" />
        <div className="space-y-5">
          {CHAPTERS.map((c, ci) => {
            const st = chapterStatus(state, c)
            const region = REGIONS.find((r) => r.id === c.region)!
            const boss = bossById(c.boss)!
            const br = state.bosses[c.boss]
            return (
              <motion.div key={c.n} initial={{ opacity: 0, x: -12 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: ci * 0.03 }} className="relative pl-12 sm:pl-16">
                <div className="absolute left-2 sm:left-4 top-5 w-7 h-7 rounded-full grid place-items-center border-2 bg-obsidian" style={{ borderColor: st.unlocked ? region.color : '#3b5070' }}>
                  {st.done ? <CheckCircle2 size={14} style={{ color: region.color }} /> : st.unlocked ? <span className="hud text-[10px]" style={{ color: region.color }}>{c.n}</span> : <Lock size={12} className="text-mist" />}
                </div>
                <Panel className={`p-4 sm:p-6 ${st.unlocked ? '' : 'opacity-60'}`} accent={region.color}>
                  <div className="flex flex-col lg:flex-row gap-5">
                    <div className="flex-1 min-w-0">
                      <div className="hud text-[11px]" style={{ color: region.color }}>Chapter {c.n} · {region.name}</div>
                      <h2 className="font-display text-2xl text-bright">{c.title}</h2>
                      <p className="text-sm text-mist mt-1">{c.blurb}</p>
                      <div className="chip mt-2" style={{ ['--accent' as string]: region.color }}>{c.topic}</div>
                      <div className="mt-4 space-y-2">
                        {c.missions.map((id) => {
                          const m = missionById(id)!
                          const unlocked = missionUnlocked(state, m)
                          const done = state.missions[id]?.completed
                          const prog = state.missions[id]?.step
                          return (
                            <button key={id} disabled={!unlocked} onClick={() => navigate(`/mission/${id}`)} className="w-full text-left rounded-xl border border-white/10 hover:border-white/25 disabled:hover:border-white/10 px-4 py-3 flex items-center gap-3 disabled:cursor-not-allowed transition">
                              {done ? <CheckCircle2 size={18} className="text-jade shrink-0" /> : unlocked ? <Play size={18} className="shrink-0" style={{ color: region.color }} /> : <Lock size={16} className="text-mist shrink-0" />}
                              <div className="flex-1 min-w-0">
                                <div className="text-bright text-sm">{m.title}</div>
                                <div className="text-xs text-mist truncate">{m.objective}</div>
                              </div>
                              {prog && !done ? <span className="chip">step {prog + 1}/{m.steps.length}</span> : null}
                              {unlocked && <ChevronRight size={16} className="text-mist" />}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    <div className="lg:w-64 shrink-0 rounded-xl bg-black/30 border border-white/5 p-4 flex lg:flex-col items-center gap-3 text-center">
                      <Portrait id={boss.art} size={80} animated={st.unlocked} mood={br?.defeated ? 'sad' : 'neutral'} />
                      <div className="flex-1 lg:flex-none text-left lg:text-center">
                        <div className="hud text-[10px] text-mist flex items-center gap-1 lg:justify-center"><Skull size={11} /> Boss</div>
                        <div className="text-bright text-sm">{boss.name}</div>
                        <div className="text-[11px] text-mist">{br?.defeated ? `Defeated · best ${Math.round(br.bestAccuracy * 100)}% · ${br.wins} win${br.wins === 1 ? '' : 's'}` : 'Awaits at the end of the chapter'}</div>
                        {br?.defeated && <Button size="sm" className="mt-2" accent={boss.color} onClick={() => navigate(`/boss/${boss.id}`)}><Swords size={12} /> Rematch</Button>}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4"><Bar value={st.progress} color={region.color} height={4} label={`${c.title} progress`} /></div>
                  {st.done && c.next && <p className="text-xs text-mist mt-2 italic">Next: {c.next}</p>}
                </Panel>
              </motion.div>
            )
          })}
        </div>
      </div>

      <h2 className="font-display text-2xl text-bright mt-12 mb-1">Side quests</h2>
      <p className="text-mist text-sm mb-4">Optional investigations with Vexa and Orion. They hold secrets the main story doesn’t tell — and they matter for one particular ending.</p>
      <div className="grid md:grid-cols-3 gap-4">
        {SIDE_MISSIONS.map((id) => {
          const m = missionById(id)!
          const unlocked = missionUnlocked(state, m)
          const done = state.missions[id]?.completed
          const who = id.includes('orion') ? 'orion' : 'vexa'
          return (
            <Panel key={id} className={`p-4 flex flex-col ${unlocked ? '' : 'opacity-60'}`} accent={who === 'vexa' ? '#ff3d6e' : '#5aa8ff'}>
              <div className="flex items-center gap-3">
                <Portrait id={who} size={54} animated={false} />
                <div>
                  <div className="hud text-[10px] text-mist">{who === 'vexa' ? 'Cryptanalysis Wastes' : 'Twin-Key Citadel'}</div>
                  <div className="text-bright">{m.title}</div>
                </div>
              </div>
              <p className="text-sm text-mist mt-3 flex-1">{m.summary}</p>
              <div className="mt-3">
                {unlocked ? <Button size="sm" variant={done ? 'default' : 'primary'} onClick={() => navigate(`/mission/${id}`)}>{done ? 'Replay' : 'Start'}</Button> : <span className="text-xs text-mist flex items-center gap-1"><Lock size={12} /> Requires {m.requires?.map((r) => missionById(r)?.title).join(' + ')}</span>}
              </div>
            </Panel>
          )
        })}
      </div>
    </div>
  )
}

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Lock, MapPin, Play, ScrollText, Skull, Swords, X } from 'lucide-react'
import { useGame } from '../game/GameContext'
import { CHAPTERS, MISSIONS, missionById, missionUnlocked, nextMission, regionStatus, SIDE_MISSIONS } from '../data/campaign'
import { BOSSES } from '../data/bosses'
import { REGIONS, SPEAKER_NAMES } from '../data/world'
import type { Mission, Region } from '../game/types'
import { Portrait } from '../components/Portrait'
import { Bar, Button, Panel } from '../components/ui'
import type { PlayerState } from '../game/state'

function regionMissions(r: Region): Mission[] {
  if (r.id === 'wastes') return SIDE_MISSIONS.map((id) => missionById(id)!).filter((m) => m.id.startsWith('w-vexa'))
  return r.chapters.flatMap((n) => CHAPTERS[n].missions.map((id) => missionById(id)!))
}

function regionLore(r: Region): string[] {
  const out: string[] = []
  for (const m of regionMissions(r)) for (const st of m.steps) {
    if (st.kind === 'investigate') st.clues.forEach((c) => c.lore && out.push(c.lore))
    if (st.kind === 'choice') st.options.forEach((o) => o.lore && out.push(o.lore))
  }
  return [...new Set(out)]
}

function guideLine(s: PlayerState, r: Region, status: ReturnType<typeof regionStatus>): string {
  const name = (s.profile.name || 'Kael').split(/\s+/)[0]
  if (!status.unlocked) {
    if (r.id === 'null') return 'Not yet. The throne waits for those who understand every layer.'
    if (r.id === 'wastes') return 'The Wastes open once you’ve escaped the Labyrinth. Vexa will find you.'
    return 'The way is sealed. Finish the path before it.'
  }
  if (status.done) {
    const lines: Record<string, string> = {
      archive: `The lanterns remember you, ${name}. So do I.`,
      labyrinth: 'The echoes are gone. I almost miss them. Almost.',
      forge: 'Ten rounds and a final round without mixing. You’ll never forget it now.',
      citadel: 'Aster and Vael are still arguing. Over an authenticated channel, at least.',
      frontier: 'Every message here carries a seal. Mirror-folk are unemployed.',
      storm: 'The storm is calm. Lattices hold where the old locks flickered.',
      wastes: 'Every lock out here has a label now. That’s how you honour a failure.',
      null: 'The crown lies on the steps. It was always glass.',
    }
    return lines[r.id]
  }
  return status.progress > 0 ? `You’re halfway through. Don’t stop now, ${name}.` : r.corrupted
}

export default function WorldMap() {
  const { state, sfx, reducedMotion } = useGame()
  const navigate = useNavigate()
  const [sel, setSel] = useState<Region | null>(null)
  const [travel, setTravel] = useState<Region | null>(null)
  const statuses = useMemo(() => Object.fromEntries(REGIONS.map((r) => [r.id, regionStatus(state, r.id)])), [state])
  const nm = nextMission(state)
  const order: Region['id'][] = ['archive', 'labyrinth', 'forge', 'citadel', 'frontier', 'storm', 'null']

  const greeting = useMemo(() => {
    const won = Object.entries(state.bosses).filter(([, b]) => b.defeated && b.at).sort((a, b) => (b[1].at ?? 0) - (a[1].at ?? 0))[0]
    const name = (state.profile.name || 'Kael').split(/\s+/)[0]
    if (state.stats.sessions > 1 && won) {
      const boss = BOSSES.find((b) => b.id === won[0])
      return { who: 'aura' as const, text: `Welcome back, ${name}. The Archive still talks about how you beat ${boss?.name}. ${nm ? `Next: “${nm.title}”.` : 'Every region is restored.'}` }
    }
    if (!state.missions['m0-terminal']?.completed) return { who: 'aura' as const, text: `This is the Atlas, ${name}. Every dark region is a broken lock. Start with the glowing one — the Forgotten Archive.` }
    return { who: 'aura' as const, text: nm ? `The Atlas updates as you learn. Your next path: “${nm.title}”.` : 'Every region is restored. Rematches, labs and the daily challenge await.' }
  }, [state, nm])

  const go = (m: Mission) => {
    if (!sel) return
    sfx('whoosh')
    setTravel(sel)
    window.setTimeout(() => navigate(`/mission/${m.id}`), reducedMotion ? 50 : 900)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row gap-4 lg:items-end justify-between">
        <div>
          <div className="hud text-xs text-cyan">Holographic Atlas</div>
          <h1 className="font-display text-3xl sm:text-4xl text-bright">The Broken Realms</h1>
        </div>
        <Panel className="p-3 flex items-center gap-3 max-w-xl" accent="#4dffb8">
          <Portrait id={greeting.who} size={46} mood="smile" animated={false} />
          <p className="text-sm text-ink">{greeting.text}</p>
          {nm && <Button size="sm" variant="primary" onClick={() => navigate(`/mission/${nm.id}`)}><Play size={14} /> {state.missions[nm.id]?.step ? 'Resume' : 'Play'}</Button>}
        </Panel>
      </div>

      <div className="relative">
        <motion.div
          className="relative rounded-3xl overflow-hidden border border-cyan/15 aspect-[4/5] sm:aspect-[16/10] lg:aspect-[16/8.5]"
          style={{ background: 'radial-gradient(ellipse at 50% 50%, #0d1a33 0%, #060a16 60%, #03050b 100%)' }}
          animate={travel && !reducedMotion ? { scale: 2.4, x: `${(50 - travel.x) * 2.4}%`, y: `${(50 - travel.y) * 2.4}%`, opacity: 0.2 } : { scale: 1, x: 0, y: 0, opacity: 1 }}
          transition={{ duration: 0.9, ease: [0.7, 0, 0.3, 1] }}
        >
          <div className="absolute inset-0 grid-floor opacity-50" />
          <div className="absolute inset-0 scanlines opacity-50 pointer-events-none" />
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full" aria-hidden="true">
            {/* concentric holo rings */}
            {[18, 32, 46].map((r) => <ellipse key={r} cx="50" cy="52" rx={r} ry={r * 0.62} fill="none" stroke="#22e4ff" strokeOpacity="0.07" strokeWidth="0.2" />)}
            {/* story path */}
            {order.slice(0, -1).map((id, i) => {
              const a = REGIONS.find((r) => r.id === id)!
              const b = REGIONS.find((r) => r.id === order[i + 1])!
              const lit = statuses[a.id].done
              return <path key={id} d={`M${a.x} ${a.y} Q${(a.x + b.x) / 2} ${(a.y + b.y) / 2 - 8} ${b.x} ${b.y}`} fill="none" stroke={lit ? a.color : '#3b5070'} strokeOpacity={lit ? 0.8 : 0.35} strokeWidth="0.35" strokeDasharray={lit ? '0' : '1 1.2'} vectorEffect="non-scaling-stroke" />
            })}
            {/* side path to the Wastes */}
            <path d="M32 38 Q34 24 40 14" fill="none" stroke={statuses.wastes.unlocked ? '#ff3d6e' : '#3b5070'} strokeOpacity="0.5" strokeWidth="0.3" strokeDasharray="0.8 1" vectorEffect="non-scaling-stroke" />
          </svg>

          {REGIONS.map((r) => {
            const st = statuses[r.id]
            const isNext = nm && (r.chapters.includes(nm.chapter))
            return (
              <button
                key={r.id}
                className="absolute -translate-x-1/2 -translate-y-1/2 group"
                style={{ left: `${r.x}%`, top: `${r.y}%` }}
                onClick={() => { setSel(r); sfx('click') }}
                onMouseEnter={() => sfx('hover')}
                aria-label={`${r.name}: ${st.done ? 'restored' : st.unlocked ? 'available' : 'locked'}`}
              >
                <div className="relative grid place-items-center">
                  {isNext && !reducedMotion && <span className="absolute w-24 h-24 sm:w-28 sm:h-28 rounded-full border" style={{ borderColor: r.color, animation: 'pulse-glow 1.8s ease-in-out infinite' }} />}
                  <div className="relative w-14 h-14 sm:w-20 sm:h-20 rounded-full grid place-items-center transition-transform group-hover:scale-110"
                    style={{
                      background: st.unlocked ? `radial-gradient(circle, ${r.color}55, ${r.color}11 60%, transparent 70%)` : 'radial-gradient(circle, #2a1018 0%, transparent 70%)',
                      boxShadow: st.done ? `0 0 40px ${r.color}88` : 'none',
                    }}>
                    <RegionGlyph id={r.id} color={st.unlocked ? r.color : '#5a3a44'} restored={st.done} />
                    {!st.unlocked && <Lock size={14} className="absolute text-mist" />}
                    {st.done && <CheckCircle2 size={16} className="absolute -top-1 -right-1 text-jade bg-obsidian rounded-full" />}
                  </div>
                  <div className="mt-1 text-center">
                    <div className="hud text-[9px] sm:text-[11px] whitespace-nowrap" style={{ color: st.unlocked ? r.color : '#6a7390' }}>{r.name.replace('The ', '')}</div>
                    {st.unlocked && <div className="w-14 sm:w-20 mx-auto mt-1"><Bar value={st.progress} color={r.color} height={3} /></div>}
                  </div>
                </div>
              </button>
            )
          })}
        </motion.div>

        <AnimatePresence>
          {sel && !travel && (
            <motion.aside
              className="fixed inset-x-2 bottom-2 z-50 sm:absolute sm:z-10 sm:inset-x-auto sm:right-3 sm:top-3 sm:bottom-3 sm:w-[380px]"
              initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }}
            >
              <RegionPanel region={sel} status={statuses[sel.id]} onClose={() => setSel(null)} onGo={go} />
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <Stat label="Regions restored" value={`${REGIONS.filter((r) => statuses[r.id].done).length}/${REGIONS.length}`} />
        <Stat label="Bosses defeated" value={`${Object.values(state.bosses).filter((b) => b.defeated).length}/${BOSSES.length}`} />
        <Stat label="Missions complete" value={`${MISSIONS.filter((m) => state.missions[m.id]?.completed).length}/${MISSIONS.length}`} />
        <Stat label="Lore fragments" value={`${state.lore.length}`} />
      </div>

      {travel && <div className="fixed inset-0 z-40 pointer-events-none" style={{ background: `radial-gradient(circle, transparent 0%, ${travel.color}33 60%, #000 100%)` }} />}
    </div>
  )

  function RegionPanel({ region, status, onClose, onGo }: { region: Region; status: ReturnType<typeof regionStatus>; onClose: () => void; onGo: (m: Mission) => void }) {
    const ms = regionMissions(region)
    const lore = regionLore(region)
    const found = lore.filter((l) => state.lore.includes(l)).length
    const bosses = region.chapters.map((n) => BOSSES.find((b) => b.id === CHAPTERS[n].boss)!)
    return (
      <Panel className="p-4 sm:p-5 h-full overflow-y-auto max-h-[70vh] sm:max-h-none" accent={region.color}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="hud text-[11px]" style={{ color: region.color }}>{region.epithet}</div>
            <h2 className="font-display text-xl text-bright">{region.name}</h2>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close region panel"><X size={14} /></button>
        </div>
        <p className="text-sm text-mist mt-2">{status.done ? region.restored : region.corrupted}</p>
        <div className="flex gap-3 items-start mt-4 rounded-xl bg-black/30 p-3">
          <Portrait id={region.guide} size={44} mood={status.done ? 'smile' : 'neutral'} animated={false} />
          <div><div className="hud text-[10px]" style={{ color: region.color }}>{SPEAKER_NAMES[region.guide]}</div><p className="text-sm text-ink italic">“{guideLine(state, region, status)}”</p></div>
        </div>
        <div className="mt-4 space-y-2">
          <div className="hud text-[11px] text-mist flex items-center gap-1"><MapPin size={12} /> Missions</div>
          {ms.map((m) => {
            const unlocked = missionUnlocked(state, m)
            const done = state.missions[m.id]?.completed
            return (
              <div key={m.id} className="rounded-xl border border-white/10 p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-bright truncate">{m.title}</div>
                  <div className="text-[11px] text-mist">{done ? 'Complete' : unlocked ? (state.missions[m.id]?.step ? `In progress · step ${state.missions[m.id].step + 1}` : 'Available') : `Requires: ${m.requires?.map((r) => missionById(r)?.title).join(', ')}`}</div>
                </div>
                {unlocked ? <Button size="sm" variant={done ? 'default' : 'primary'} accent={region.color} onClick={() => onGo(m)}>{done ? 'Replay' : 'Travel'}</Button> : <Lock size={14} className="text-mist" />}
              </div>
            )
          })}
        </div>
        {bosses.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="hud text-[11px] text-mist flex items-center gap-1"><Skull size={12} /> Guardians of this realm</div>
            {bosses.map((b) => (
              <div key={b.id} className="flex items-center gap-3 rounded-xl border border-white/10 p-2">
                <Portrait id={b.art} size={36} animated={false} />
                <div className="flex-1 text-sm"><div className="text-bright">{b.name}</div><div className="text-[11px] text-mist">{state.bosses[b.id]?.defeated ? `Defeated · best ${Math.round(state.bosses[b.id].bestAccuracy * 100)}%` : 'Undefeated'}</div></div>
                {state.bosses[b.id]?.defeated && <Button size="sm" onClick={() => navigate(`/boss/${b.id}`)}><Swords size={12} /> Rematch</Button>}
              </div>
            ))}
          </div>
        )}
        <div className="mt-4 flex items-center justify-between text-xs text-mist">
          <span className="flex items-center gap-1"><ScrollText size={12} /> Secrets found {found}/{lore.length}</span>
          <span>{Math.round(status.progress * 100)}% restored</span>
        </div>
        <p className="text-[11px] text-mist mt-2">Mastery requirement: {region.id === 'null' ? 'complete every chapter.' : region.id === 'wastes' ? 'escape the Shadow Labyrinth.' : 'complete the previous region.'}</p>
      </Panel>
    )
  }
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel p-3">
      <div className="hud text-[10px] text-mist">{label}</div>
      <div className="font-display text-xl text-bright">{value}</div>
    </div>
  )
}

/** Distinct emblem per region. */
function RegionGlyph({ id, color, restored }: { id: Region['id']; color: string; restored: boolean }) {
  const common = { fill: 'none', stroke: color, strokeWidth: 2.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  return (
    <svg viewBox="0 0 40 40" className="w-8 h-8 sm:w-11 sm:h-11" aria-hidden="true" style={{ filter: restored ? `drop-shadow(0 0 6px ${color})` : 'none' }}>
      {id === 'archive' && <><rect x="8" y="8" width="24" height="26" rx="2" {...common} /><path d="M12 14h16M12 19h16M12 24h10" {...common} /></>}
      {id === 'labyrinth' && <path d="M6 6h28v28H6V12h22v16H12V18h10v4" {...common} />}
      {id === 'forge' && <><circle cx="20" cy="20" r="9" {...common} /><path d="M20 4v6M20 30v6M4 20h6M30 20h6M9 9l4 4M27 27l4 4M31 9l-4 4M13 27l-4 4" {...common} /></>}
      {id === 'citadel' && <><circle cx="13" cy="20" r="6" {...common} /><circle cx="27" cy="20" r="6" {...common} /><path d="M19 20h2M6 34h28" {...common} /></>}
      {id === 'frontier' && <path d="M4 28 Q14 4 20 20 T36 12" {...common} />}
      {id === 'storm' && <path d="M22 4 L12 22h8l-4 14 12-20h-8z" {...common} />}
      {id === 'wastes' && <><rect x="10" y="18" width="20" height="16" rx="2" {...common} /><path d="M14 18v-5a6 6 0 0 1 12 0" {...common} /><path d="M18 24l4 4M22 24l-4 4" {...common} /></>}
      {id === 'null' && <path d="M8 30 L10 12 L16 20 L20 8 L24 20 L30 12 L32 30 Z" {...common} />}
    </svg>
  )
}

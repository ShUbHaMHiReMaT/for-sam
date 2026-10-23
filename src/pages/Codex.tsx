import { useState } from 'react'
import { motion } from 'framer-motion'
import { Lock, Heart } from 'lucide-react'
import { CHARACTERS, COMPANIONS, LORE } from '../data/world'
import { useGame } from '../game/GameContext'
import { Portrait } from '../components/Portrait'
import { Panel, SectionTitle } from '../components/ui'
import type { CharacterId, Mood } from '../game/types'
import { BOSSES } from '../data/bosses'

const MOODS: Mood[] = ['neutral', 'smile', 'smirk', 'surprised', 'angry', 'sad']
const REL_LABEL = (v: number) => (v >= 6 ? 'Bonded' : v >= 3 ? 'Trusted' : v >= 1 ? 'Friendly' : v <= -1 ? 'Wary' : 'Acquainted')

export default function Codex() {
  const { state } = useGame()
  const [sel, setSel] = useState<string>('kael')
  const [mood, setMood] = useState<Mood>('neutral')
  const c = CHARACTERS[sel]
  const metNull = !!state.missions['m6-horizon']?.completed || !!state.bosses.nullking
  const met = (id: string) => id === 'kael' || id === 'aura' || (id === 'nyra' && !!state.missions['m0-terminal']?.completed) || (id === 'orion' && !!state.missions['m2-echoes']?.completed) || (id === 'vexa' && (state.relationships.vexa ?? 0) !== 0) || (id === 'null' && metNull)
  const knownLore = LORE.filter((l) => l.character === sel && state.lore.includes(l.id))
  const rel = state.relationships[sel as CharacterId]

  return (
    <div>
      <SectionTitle kicker="Character codex" title="Guardians, rogues & kings" sub="Every character embodies a part of cryptography. Relationships shift with your choices." />
      <div className="flex gap-3 overflow-x-auto pb-3 -mx-1 px-1">
        {COMPANIONS.map((id) => {
          const ch = CHARACTERS[id]
          const known = met(id)
          return (
            <button key={id} onClick={() => known && setSel(id)} disabled={!known} className={`panel shrink-0 p-2 w-28 flex flex-col items-center transition ${sel === id ? '' : 'opacity-70 hover:opacity-100'} disabled:opacity-40`} style={sel === id ? { borderColor: ch.color } : undefined} aria-pressed={sel === id}>
              <div className="relative">
                <Portrait id={id} size={80} animated={false} costume={id === 'kael' ? state.profile.costume : undefined} />
                {!known && <Lock size={18} className="absolute inset-0 m-auto text-bright" />}
              </div>
              <div className="hud text-[10px] text-bright mt-1 text-center">{known ? ch.name : '???'}</div>
            </button>
          )
        })}
      </div>

      {c && met(sel) && (
        <motion.div key={sel} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid lg:grid-cols-[360px_1fr] gap-5 mt-4">
          <Panel className="p-5 flex flex-col items-center" accent={c.color}>
            <div className="relative">
              <div className="absolute inset-0 blur-3xl opacity-40 rounded-full" style={{ background: c.color }} />
              <Portrait id={c.id} mood={mood} size={240} costume={c.id === 'kael' ? state.profile.costume : undefined} className="relative" />
            </div>
            <div className="flex flex-wrap gap-1 justify-center mt-2" role="radiogroup" aria-label="Expression">
              {MOODS.map((m) => <button key={m} onClick={() => setMood(m)} role="radio" aria-checked={mood === m} className={`hud text-[10px] px-2 py-1 rounded-md ${mood === m ? 'bg-white/10 text-bright' : 'text-mist'}`}>{m}</button>)}
            </div>
          </Panel>
          <div className="space-y-4">
            <Panel className="p-5" accent={c.color}>
              <div className="hud text-xs" style={{ color: c.color }}>{c.role}</div>
              <h2 className="font-display text-3xl text-bright">{c.id === 'kael' ? state.profile.name : c.name}</h2>
              <div className="text-mist">{c.title}</div>
              <blockquote className="mt-4 border-l-2 pl-3 italic text-bright/90" style={{ borderColor: c.color }}>“{c.quote}”</blockquote>
              <p className="text-ink mt-4 leading-relaxed">{c.bio}</p>
              {rel !== undefined && c.id !== 'kael' && c.id !== 'null' && (
                <div className="mt-4 flex items-center gap-2 text-sm"><Heart size={14} style={{ color: c.color }} /> <span className="text-mist">Relationship:</span> <span className="text-bright">{REL_LABEL(rel)}</span> <span className="text-mist">({rel})</span></div>
              )}
            </Panel>
            <div className="grid md:grid-cols-2 gap-4">
              <Panel className="p-4"><div className="hud text-[11px]" style={{ color: c.color }}>Ability · {c.ability}</div><p className="text-sm text-ink mt-1">{c.abilityDesc}</p></Panel>
              <Panel className="p-4"><div className="hud text-[11px]" style={{ color: c.color }}>Personality</div><p className="text-sm text-ink mt-1">{c.personality}</p></Panel>
              <Panel className="p-4"><div className="hud text-[11px]" style={{ color: c.color }}>Arc</div><p className="text-sm text-ink mt-1">{c.arc}</p></Panel>
              <Panel className="p-4"><div className="hud text-[11px]" style={{ color: c.color }}>Cryptography</div><p className="text-sm text-ink mt-1">{c.cryptoLink}</p></Panel>
            </div>
            <Panel className="p-4">
              <div className="hud text-[11px] text-amber">Personal lore</div>
              {knownLore.length ? knownLore.map((l) => <div key={l.id} className="mt-2"><div className="text-bright text-sm">{l.title}</div><p className="text-sm text-mist italic">{l.text}</p></div>) : <p className="text-sm text-mist mt-1">Investigate the world to uncover their story.</p>}
            </Panel>
          </div>
        </motion.div>
      )}

      <h2 className="font-display text-2xl text-bright mt-10 mb-3">Bestiary</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {BOSSES.map((b) => {
          const seen = !!state.bosses[b.id]
          return (
            <Panel key={b.id} className="p-3 flex flex-col items-center text-center" accent={b.color}>
              <div className={seen ? '' : 'brightness-0 opacity-50'}><Portrait id={b.art} size={80} animated={false} /></div>
              <div className="text-sm text-bright mt-1">{seen ? b.name : '???'}</div>
              <div className="text-[11px] text-mist">{seen ? b.title : `Chapter ${b.chapter}`}</div>
            </Panel>
          )
        })}
      </div>
    </div>
  )
}

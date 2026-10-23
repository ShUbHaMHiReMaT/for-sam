import { useNavigate } from 'react-router-dom'
import { Clapperboard, Lock, Play, Scroll } from 'lucide-react'
import { useGame } from '../game/GameContext'
import { LORE } from '../data/world'
import { ENDINGS } from '../game/meta'
import { Button, Panel, SectionTitle } from '../components/ui'
import { Portrait } from '../components/Portrait'

export default function Archives() {
  const { state } = useGame()
  const navigate = useNavigate()
  const endingsSeen = Object.values(ENDINGS).filter((e) => state.flags[`ending_${e.id}`])
  return (
    <div>
      <SectionTitle kicker="The Archives" title="Memory of the Cipherverse" sub="Replay cinematics and read every recovered fragment of lore." accent="var(--color-amber)" />
      <h2 className="hud text-sm text-mist mb-3 flex items-center gap-2"><Clapperboard size={14} /> Cinematics</h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        <Panel className="p-0 overflow-hidden" accent="#22e4ff">
          <div className="h-36 relative grid place-items-center" style={{ background: 'radial-gradient(circle at 50% 60%, #3a0a14, #05040a)' }}>
            <Portrait id="null" size={90} animated={false} />
          </div>
          <div className="p-4">
            <div className="font-display text-lg text-bright">The Night the Keys Died</div>
            <p className="text-sm text-mist">The opening cinematic. ~70 seconds, subtitled.</p>
            <Button size="sm" variant="primary" className="mt-3" onClick={() => navigate('/')}><Play size={14} /> Replay</Button>
          </div>
        </Panel>
        {Object.values(ENDINGS).map((e) => {
          const seen = endingsSeen.includes(e)
          return (
            <Panel key={e.id} className={`p-0 overflow-hidden ${seen ? '' : 'opacity-50'}`} accent={e.id === 'truth' ? '#ff1f3d' : e.id === 'dawn' ? '#ffb547' : '#8d98b3'}>
              <div className="h-36 grid place-items-center" style={{ background: e.id === 'dawn' ? 'radial-gradient(circle at 50% 100%, #ffb54755, #05040a)' : e.id === 'truth' ? 'radial-gradient(circle, #ff1f3d44, #05040a)' : 'radial-gradient(circle, #33334455, #05040a)' }}>
                {seen ? <Portrait id={e.id === 'truth' ? 'null' : 'kael'} size={80} animated={false} costume={state.profile.costume} /> : <Lock className="text-mist" />}
              </div>
              <div className="p-4">
                <div className="font-display text-lg text-bright">{seen ? e.name : 'Ending — sealed'}</div>
                <p className="text-sm text-mist">{seen ? e.tagline : e.id === 'truth' ? 'A secret ending. The Wastes and the Storm hold its pieces.' : 'Reach the end of Chapter 7.'}</p>
                {seen && <Button size="sm" className="mt-3" onClick={() => navigate(`/ending?replay=${e.id}`)}><Play size={14} /> Replay</Button>}
              </div>
            </Panel>
          )
        })}
      </div>
      <h2 className="hud text-sm text-mist mb-3 flex items-center gap-2"><Scroll size={14} /> Lore fragments · {state.lore.length}/{LORE.length}</h2>
      <div className="grid md:grid-cols-2 gap-3">
        {LORE.map((l) => {
          const on = state.lore.includes(l.id)
          return (
            <Panel key={l.id} className={`p-4 ${on ? '' : 'opacity-45'}`}>
              <div className="hud text-[11px]" style={{ color: l.id.startsWith('null') ? '#ff6a85' : '#ffe29a' }}>{on ? l.source : 'Sealed'}</div>
              <div className="text-bright">{on ? l.title : '— — —'}</div>
              {on && <p className="text-sm text-mist italic mt-1 leading-relaxed">{l.text}</p>}
            </Panel>
          )
        })}
      </div>
    </div>
  )
}

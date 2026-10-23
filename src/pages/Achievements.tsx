import { useState } from 'react'
import { Award, BookOpen, Brain, Calendar, Cog, Crown, Eye, FlaskConical, Grid3x3, HelpCircle, Key, KeyRound, Library, Lightbulb, RotateCcw, Scale, ScanEye, Scroll, Shield, Sparkles, Star, Target, TrendingUp, VenetianMask, Waves, Zap, type LucideIcon } from 'lucide-react'
import { ACHIEVEMENTS, COSTUMES } from '../game/meta'
import { useGame } from '../game/GameContext'
import { LORE } from '../data/world'
import { Button, Panel, SectionTitle } from '../components/ui'
import { Toggle } from '../labs/common'
import { Portrait } from '../components/Portrait'

const ICONS: Record<string, LucideIcon> = {
  key: Key, sparkles: Sparkles, shield: Shield, grid: Grid3x3, waves: Waves, cog: Cog, 'key-round': KeyRound, 'scan-eye': ScanEye, zap: Zap,
  crown: Crown, target: Target, brain: Brain, lightbulb: Lightbulb, 'rotate-ccw': RotateCcw, 'flask-conical': FlaskConical, library: Library,
  scroll: Scroll, 'book-open': BookOpen, calendar: Calendar, 'trending-up': TrendingUp, star: Star, 'venetian-mask': VenetianMask, scale: Scale, eye: Eye,
}

function AchIcon({ name, color }: { name: string; color: string }) {
  const C = ICONS[name] ?? Award
  return <C size={22} style={{ color }} />
}

export default function Achievements() {
  const { state, dispatch, sfx } = useGame()
  const [tab, setTab] = useState<'trophies' | 'wardrobe' | 'fragments'>('trophies')
  const got = ACHIEVEMENTS.filter((a) => state.achievements[a.id]).length
  return (
    <div>
      <SectionTitle kicker="Achievements & inventory" title="Trophy Vault" sub={`${got}/${ACHIEVEMENTS.length} achievements · ${state.costumes.length}/${COSTUMES.length} costumes · ${state.lore.length}/${LORE.length} lore fragments`} accent="var(--color-amber)" />
      <div className="mb-5"><Toggle label="Section" value={tab} onChange={setTab} options={[{ id: 'trophies', label: 'Trophies' }, { id: 'wardrobe', label: 'Wardrobe' }, { id: 'fragments', label: 'Fragments' }]} /></div>

      {tab === 'trophies' && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ACHIEVEMENTS.map((a) => {
            const on = state.achievements[a.id]
            const hidden = a.hidden && !on
            return (
              <Panel key={a.id} className={`p-4 flex gap-3 items-start ${on ? '' : 'opacity-55'}`} accent={on ? '#ffb547' : undefined}>
                <div className="w-11 h-11 rounded-xl grid place-items-center shrink-0" style={{ background: on ? 'rgb(255 181 71 / 0.12)' : 'rgb(255 255 255 / 0.04)' }}>
                  {hidden ? <HelpCircle size={22} className="text-mist" /> : <AchIcon name={a.icon} color={on ? '#ffb547' : '#6a7390'} />}
                </div>
                <div className="min-w-0">
                  <div className="text-bright text-sm">{hidden ? 'Hidden achievement' : a.name}</div>
                  <div className="text-xs text-mist">{hidden ? 'Keep exploring. Some secrets reveal themselves.' : a.desc}</div>
                  {on && <div className="hud text-[10px] text-amber mt-1">Earned {new Date(on).toLocaleDateString()}</div>}
                </div>
              </Panel>
            )
          })}
        </div>
      )}

      {tab === 'wardrobe' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {COSTUMES.map((c) => {
            const owned = state.costumes.includes(c.id)
            const eq = state.profile.costume === c.id
            return (
              <Panel key={c.id} className={`p-4 flex flex-col items-center text-center ${owned ? '' : 'opacity-50'}`} accent={eq ? c.colors.glow : undefined}>
                <div className={owned ? '' : 'grayscale'}><Portrait id="kael" costume={c.id} size={110} animated={eq} /></div>
                <div className="text-bright text-sm mt-1">{c.name}</div>
                <div className="text-[11px] text-mist min-h-8">{owned ? c.desc : c.req}</div>
                <Button size="sm" className="mt-2" disabled={!owned || eq} accent={c.colors.glow} onClick={() => { dispatch({ type: 'equipCostume', costume: c.id }); sfx('unlock') }}>{eq ? 'Equipped' : owned ? 'Equip' : 'Locked'}</Button>
              </Panel>
            )
          })}
        </div>
      )}

      {tab === 'fragments' && (
        <div className="grid md:grid-cols-2 gap-3">
          {LORE.map((l) => {
            const on = state.lore.includes(l.id)
            return (
              <Panel key={l.id} className={`p-4 ${on ? '' : 'opacity-50'}`} accent={on ? (l.id.startsWith('null') ? '#ff1f3d' : '#ffe29a') : undefined}>
                <div className="hud text-[11px]" style={{ color: l.id.startsWith('null') ? '#ff6a85' : '#ffe29a' }}>{on ? l.source : 'Undiscovered fragment'}</div>
                <div className="text-bright">{on ? l.title : '— — —'}</div>
                {on && <p className="text-sm text-mist italic mt-1">{l.text}</p>}
              </Panel>
            )
          })}
        </div>
      )}
    </div>
  )
}

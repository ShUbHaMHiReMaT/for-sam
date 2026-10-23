import { motion } from 'framer-motion'
import { Check, Lock } from 'lucide-react'
import { SKILLS, SKILL_TREES } from '../game/meta'
import { useGame } from '../game/GameContext'
import { Panel, SectionTitle } from '../components/ui'
import type { SkillTreeId } from '../game/types'

export default function SkillTree() {
  const { state } = useGame()
  const trees = Object.keys(SKILL_TREES) as SkillTreeId[]
  const total = SKILLS.length
  const owned = SKILLS.filter((s) => state.skills[s.id]).length
  return (
    <div>
      <SectionTitle kicker="Skill trees" title={`Awakened skills · ${owned}/${total}`} sub="Skills cannot be bought or grinded. Each one awakens only when you demonstrate the competence it names." />
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
        {trees.map((t) => {
          const tree = SKILL_TREES[t]
          const nodes = SKILLS.filter((s) => s.tree === t).sort((a, b) => a.tier - b.tier)
          return (
            <Panel key={t} className="p-5" accent={tree.color}>
              <div className="hud text-xs" style={{ color: tree.color }}>{nodes.filter((n) => state.skills[n.id]).length}/{nodes.length} awakened</div>
              <h2 className="font-display text-xl text-bright">{tree.name}</h2>
              <p className="text-sm text-mist">{tree.blurb}</p>
              <ol className="mt-5 relative">
                <div className="absolute left-[19px] top-2 bottom-2 w-px" style={{ background: `linear-gradient(${tree.color}, transparent)` }} aria-hidden="true" />
                {nodes.map((n, i) => {
                  const on = !!state.skills[n.id]
                  return (
                    <motion.li key={n.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="relative flex gap-3 pb-4 last:pb-0">
                      <div className="relative z-10 w-10 h-10 shrink-0 rotate-45 rounded-md grid place-items-center border-2" style={{ borderColor: on ? tree.color : '#2b3550', background: on ? `${tree.color}22` : '#0a0f1f', boxShadow: on ? `0 0 16px ${tree.color}66` : 'none' }}>
                        <span className="-rotate-45">{on ? <Check size={16} style={{ color: tree.color }} /> : <Lock size={14} className="text-mist" />}</span>
                      </div>
                      <div className="min-w-0 pt-0.5">
                        <div className={`text-sm ${on ? 'text-bright' : 'text-ink/70'}`}>{n.name} <span className="hud text-[10px] text-mist ml-1">T{n.tier}</span></div>
                        <div className="text-xs text-mist">{n.desc}</div>
                        {!on && <div className="text-[11px] mt-0.5" style={{ color: tree.color }}>Requires: {n.req}</div>}
                      </div>
                    </motion.li>
                  )
                })}
              </ol>
            </Panel>
          )
        })}
      </div>
    </div>
  )
}

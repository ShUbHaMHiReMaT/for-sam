import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { CalendarCheck, Flame, Trophy } from 'lucide-react'
import { dailyChallenge } from '../data/campaign'
import { useGame } from '../game/GameContext'
import { dateKey } from '../game/progression'
import { PuzzleView } from '../components/PuzzleView'
import { Bar, Panel, SectionTitle } from '../components/ui'

const DAILY_XP = 80

export default function Daily() {
  const { state, dispatch, sfx } = useGame()
  const today = dateKey()
  const puzzles = useMemo(() => dailyChallenge(today), [today])
  const doneToday = state.daily.done.includes(today)
  const [i, setI] = useState(0)
  const [finished, setFinished] = useState(doneToday)

  const next = () => {
    if (i + 1 < puzzles.length) setI(i + 1)
    else {
      dispatch({ type: 'dailyComplete', date: today, xp: DAILY_XP })
      setFinished(true)
      sfx('levelup')
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <SectionTitle kicker={`Daily challenge · ${today}`} title="The Morning Cipher" sub="Four fresh puzzles generated for today from real cipher functions. Optional, always — missing a day never costs you XP or progress." accent="var(--color-magenta)" />
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Panel className="p-3"><div className="hud text-[10px] text-mist flex items-center gap-1"><Flame size={12} className="text-magenta" /> Current streak</div><div className="font-display text-2xl text-bright">{state.daily.streak}</div></Panel>
        <Panel className="p-3"><div className="hud text-[10px] text-mist flex items-center gap-1"><Trophy size={12} className="text-amber" /> Best streak</div><div className="font-display text-2xl text-bright">{state.daily.best}</div></Panel>
        <Panel className="p-3"><div className="hud text-[10px] text-mist flex items-center gap-1"><CalendarCheck size={12} className="text-jade" /> Days completed</div><div className="font-display text-2xl text-bright">{state.daily.done.length}</div></Panel>
      </div>
      {finished ? (
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
          <Panel className="p-8 text-center" accent="#ff4fd8">
            <CalendarCheck size={40} className="text-magenta mx-auto" />
            <h2 className="font-display text-2xl text-bright mt-3">Today’s cipher is solved</h2>
            <p className="text-mist mt-2">{doneToday && i === 0 ? 'You already completed today’s challenge.' : `+${DAILY_XP} XP.`} A new set appears tomorrow. Practice mode is always open if you want more.</p>
          </Panel>
        </motion.div>
      ) : (
        <>
          <div className="flex items-center gap-3 mb-4"><span className="hud text-xs text-mist">Puzzle {i + 1}/{puzzles.length}</span><Bar value={i / puzzles.length} color="var(--color-magenta)" /></div>
          <PuzzleView key={puzzles[i].id} puzzle={puzzles[i]} who={(['nyra', 'orion', 'vexa', 'aura'] as const)[i % 4]} onSolved={next} continueLabel={i + 1 < puzzles.length ? 'Next puzzle' : 'Complete the challenge'} />
        </>
      )}
    </div>
  )
}

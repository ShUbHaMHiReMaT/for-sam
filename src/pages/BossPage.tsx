import { useNavigate, useParams } from 'react-router-dom'
import { Swords } from 'lucide-react'
import { bossById } from '../data/bosses'
import { useGame } from '../game/GameContext'
import { BossBattle } from '../components/BossBattle'
import { Button, Empty } from '../components/ui'

/** Boss rematch arena — only for bosses already defeated in the story. */
export default function BossPage() {
  const { id = '' } = useParams()
  const boss = bossById(id)
  const { state } = useGame()
  const navigate = useNavigate()
  if (!boss) return <Empty icon={<Swords />} title="Unknown foe" text="No such boss exists." action={<Button onClick={() => navigate('/campaign')}>Back</Button>} />
  if (!state.bosses[id]?.defeated) return <Empty icon={<Swords />} title="Not yet" text="Defeat this boss in the story campaign first. Rematches unlock afterwards." action={<Button onClick={() => navigate('/campaign')}>To the campaign</Button>} />
  return (
    <div className="max-w-5xl mx-auto">
      <BossBattle key={boss.id + state.bosses[id].wins} boss={boss} onWin={() => navigate('/campaign')} onRetreat={() => navigate('/campaign')} />
    </div>
  )
}

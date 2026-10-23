import { lazy, Suspense } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Binary, Blocks, Fingerprint, FlaskConical, Grid3x3, KeyRound, Layers, Microscope, RotateCw, Waves } from 'lucide-react'
import { useGame } from '../game/GameContext'
import { Loading, SectionTitle } from '../components/ui'

export const LABS = [
  { id: 'caesar', name: 'Caesar', era: 'Historical', icon: RotateCw, color: '#ffb547', blurb: 'Shift wheel, brute force, frequencies.', C: lazy(() => import('../labs/CaesarLab')) },
  { id: 'playfair', name: 'Playfair', era: 'Historical', icon: Grid3x3, color: '#ffb547', blurb: '5×5 square, digraph rules, predict mode.', C: lazy(() => import('../labs/PlayfairLab')) },
  { id: 'vigenere', name: 'Vigenère & Transposition', era: 'Historical', icon: Waves, color: '#b77bff', blurb: 'Repeating keys, Kasiski, column grids.', C: lazy(() => import('../labs/VigenereLab')) },
  { id: 'aes', name: 'AES', era: 'Modern', icon: Blocks, color: '#22e4ff', blurb: 'State matrix, every round, key schedule.', C: lazy(() => import('../labs/AesLab')) },
  { id: 'modes', name: 'Modes of Operation', era: 'Modern', icon: Layers, color: '#22e4ff', blurb: 'ECB leaks, CTR nonce reuse, GCM tags.', C: lazy(() => import('../labs/ModesLab')) },
  { id: 'rsa', name: 'RSA', era: 'Modern', icon: KeyRound, color: '#5aa8ff', blurb: 'Toy key generation, modular exponentiation.', C: lazy(() => import('../labs/RsaLab')) },
  { id: 'dh', name: 'Diffie–Hellman', era: 'Modern', icon: Binary, color: '#ff4fd8', blurb: 'Key agreement and the man in the middle.', C: lazy(() => import('../labs/DhLab')) },
  { id: 'hash', name: 'Hashing & HMAC', era: 'Modern', icon: Fingerprint, color: '#4dffb8', blurb: 'Avalanche, keyed tags, what’s what.', C: lazy(() => import('../labs/HashLab')) },
  { id: 'analysis', name: 'Cryptanalysis', era: 'Attack', icon: Microscope, color: '#ff3d6e', blurb: 'Break substitution, estimate keyspaces.', C: lazy(() => import('../labs/AnalysisLab')) },
]

export default function LabHub() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { state, sfx } = useGame()
  const lab = LABS.find((l) => l.id === id)

  return (
    <div>
      <SectionTitle kicker="Interactive laboratory" title={lab ? `${lab.name} Lab` : 'The Guardian Laboratory'} sub={lab ? lab.blurb : 'Real implementations you can poke, break and watch. Every output here is computed — nothing is faked.'} />
      <nav className="flex gap-2 overflow-x-auto pb-3 mb-5 -mx-1 px-1" aria-label="Labs">
        {LABS.map((l) => (
          <button key={l.id} onClick={() => { sfx('click'); navigate(`/lab/${l.id}`) }} className={`shrink-0 flex items-center gap-2 rounded-xl border px-3 py-2 transition ${l.id === id ? 'bg-white/5' : 'border-white/10 hover:border-white/25'}`} style={l.id === id ? { borderColor: l.color } : undefined} aria-current={l.id === id ? 'page' : undefined}>
            <l.icon size={16} style={{ color: l.color }} />
            <span className="hud text-[11px] text-bright whitespace-nowrap">{l.name}</span>
            {state.stats.labs.includes(l.id) && <span className="w-1.5 h-1.5 rounded-full bg-jade" aria-label="visited" />}
          </button>
        ))}
      </nav>
      {lab ? (
        <Suspense fallback={<Loading label="Assembling apparatus…" />}><lab.C /></Suspense>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {LABS.map((l) => (
            <button key={l.id} onClick={() => navigate(`/lab/${l.id}`)} onMouseEnter={() => sfx('hover')} className="panel hud-corners p-5 text-left group transition hover:-translate-y-0.5" style={{ ['--accent' as string]: l.color }}>
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-xl grid place-items-center" style={{ background: `${l.color}1a`, color: l.color }}><l.icon size={22} /></div>
                <span className="chip" style={{ ['--accent' as string]: l.color }}>{l.era}</span>
              </div>
              <div className="font-display text-xl text-bright mt-3">{l.name}</div>
              <p className="text-sm text-mist mt-1">{l.blurb}</p>
              <div className="hud text-[11px] mt-3 flex items-center gap-1" style={{ color: l.color }}><FlaskConical size={12} /> {state.stats.labs.includes(l.id) ? 'Experimented' : 'Enter lab'}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

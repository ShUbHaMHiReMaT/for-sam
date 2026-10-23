import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Dices, Check } from 'lucide-react'
import { caesarBruteForce, caesarDecrypt, caesarEncrypt, normalize } from '../crypto/classical'
import { CaesarWheel, FreqChart } from '../components/widgets'
import { Button } from '../components/ui'
import { Field, LabSection, Note, Toggle, useLabTracker } from './common'

const PHRASES = ['THE ARCHIVE REMEMBERS EVERY KEY', 'NEVER TRUST A SECRET ALGORITHM', 'BRUTE FORCE NEEDS A SMALL KEYSPACE', 'GUARDIANS READ PATTERNS NOT LUCK', 'SHIFT THE LETTERS AND THE MEANING HIDES']

export default function CaesarLab() {
  const track = useLabTracker('caesar')
  const [text, setText] = useState('Meet me at the Forgotten Archive at dawn.')
  const [shift, setShift] = useState(3)
  const [mode, setMode] = useState<'enc' | 'dec'>('enc')
  const out = mode === 'enc' ? caesarEncrypt(text, shift) : caesarDecrypt(text, shift)
  const [bfInput, setBfInput] = useState(caesarEncrypt('THE GUARDIANS PROTECTED EVERY MEMORY', 11))
  const results = useMemo(() => caesarBruteForce(bfInput), [bfInput])
  const best = results.reduce((a, b) => (b.score > a.score ? b : a), results[0])
  const maxScore = Math.max(...results.map((r) => r.score), 1e-9)

  const [ch, setCh] = useState(() => newChallenge())
  const [guess, setGuess] = useState('')
  const [chResult, setChResult] = useState<null | boolean>(null)

  function newChallenge() {
    const p = PHRASES[Math.floor(Math.random() * PHRASES.length)]
    const s = 1 + Math.floor(Math.random() * 25)
    return { plain: p, shift: s, cipher: caesarEncrypt(p, s) }
  }

  return (
    <div className="space-y-5">
      <LabSection kicker="Experiment" title="Shift anything">
        <div className="grid lg:grid-cols-[auto_1fr] gap-6 items-start">
          <CaesarWheel value={shift} onChange={(n) => { setShift(n); track() }} interactive />
          <div className="space-y-3 min-w-0">
            <Toggle label="Direction" value={mode} onChange={(v) => { setMode(v); track() }} options={[{ id: 'enc', label: 'Encrypt' }, { id: 'dec', label: 'Decrypt' }]} />
            <Field label={mode === 'enc' ? 'Plaintext' : 'Ciphertext'}><textarea className="input min-h-20" value={text} onChange={(e) => { setText(e.target.value); track() }} /></Field>
            <div>
              <div className="hud text-[11px] text-mist">{mode === 'enc' ? 'Ciphertext' : 'Plaintext'} (shift {shift})</div>
              <div className="font-mono text-lg text-magenta break-words mt-1 min-h-7">{out}</div>
            </div>
            <Note>Case and punctuation are preserved; only letters move. Decryption with shift k equals encryption with shift 26 − k.</Note>
          </div>
        </div>
      </LabSection>

      <div className="grid lg:grid-cols-2 gap-5">
        <LabSection kicker="Attack" title="Brute-force demonstration" accent="var(--color-crimson)">
          <Field label="Ciphertext to attack"><input className="input" value={bfInput} onChange={(e) => { setBfInput(e.target.value); track() }} /></Field>
          <p className="text-sm text-mist mt-3">All 26 keys, ranked by how English-like the result is (χ² against English letter frequencies). The whole keyspace fits on one screen.</p>
          <div className="mt-3 max-h-80 overflow-y-auto space-y-1 pr-1">
            {results.map((r) => (
              <div key={r.shift} className={`flex items-center gap-2 font-mono text-xs rounded px-2 py-1 ${r === best ? 'bg-jade/10 border border-jade/40' : ''}`}>
                <span className="w-6 text-mist">{r.shift}</span>
                <div className="w-16 h-1.5 bg-white/5 rounded"><div className="h-full rounded bg-jade" style={{ width: `${(r.score / maxScore) * 100}%` }} /></div>
                <span className={`truncate ${r === best ? 'text-jade' : 'text-ink/80'}`}>{r.text}</span>
              </div>
            ))}
          </div>
        </LabSection>
        <LabSection kicker="Statistics" title="Frequency fingerprint" accent="var(--color-amber)">
          <FreqChart text={bfInput} />
          <p className="text-sm text-mist mt-3">A Caesar shift slides the whole English profile sideways. Spot where the tall “E” spike landed and you have the key — no brute force needed.</p>
        </LabSection>
      </div>

      <LabSection kicker="Challenge mode" title="Break the shift" accent="var(--color-magenta)">
        <div className="font-mono text-xl text-bright tracking-widest break-words">{ch.cipher}</div>
        <form className="flex flex-col sm:flex-row gap-2 mt-4" onSubmit={(e) => { e.preventDefault(); track(); setChResult(normalize(guess) === normalize(ch.plain)) }}>
          <input className="input" value={guess} onChange={(e) => setGuess(e.target.value)} placeholder="Your decryption…" aria-label="Your decryption" />
          <Button variant="primary" type="submit"><Check size={14} /> Check</Button>
          <Button type="button" onClick={() => { setCh(newChallenge()); setGuess(''); setChResult(null) }}><Dices size={14} /> New</Button>
        </form>
        {chResult !== null && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`mt-3 text-sm ${chResult ? 'text-jade' : 'text-crimson'}`}>
            {chResult ? `Correct — the shift was ${ch.shift}.` : 'Not yet. Try the brute-force panel above with this ciphertext.'}
          </motion.div>
        )}
      </LabSection>
    </div>
  )
}

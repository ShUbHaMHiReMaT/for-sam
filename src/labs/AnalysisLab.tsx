import { useMemo, useState } from 'react'
import { Dices, RotateCcw, Sparkles } from 'lucide-react'
import { ENGLISH_FREQ, applyPartialMapping, keywordAlphabet, letterCounts, substitutionEncrypt } from '../crypto/classical'
import { KEYSPACES, humanDuration, log10BruteForceSeconds } from '../crypto/keyspace'
import { FreqChart } from '../components/widgets'
import { Button } from '../components/ui'
import { LabSection, Note, useLabTracker } from './common'

const TEXTS = [
  'THE GUARDIANS BELIEVED THAT A SECRET WAS SAFE AS LONG AS NO ONE KNEW HOW THE SEAL WORKED BUT THE SEALS WERE STUDIED AND BROKEN AND THE LESSON WAS THAT THE KEY AND NOT THE DESIGN MUST BE THE ONLY SECRET IN THE SYSTEM',
  'IN THE WASTES THERE ARE MORE BROKEN LOCKS THAN STARS AND EVERY ONE OF THEM WAS CALLED UNBREAKABLE BY SOMEONE WHO NEVER TRIED TO BREAK IT THE ATTACKER DOES NOT PLAY YOUR GAME THE ATTACKER PLAYS THE CHEAPEST GAME',
  'FREQUENCY ANALYSIS WORKS BECAUSE LANGUAGE HAS A SHAPE THE LETTER E APPEARS MORE THAN ANY OTHER AND THE WORD THE APPEARS EVERYWHERE SO A SIMPLE SUBSTITUTION CANNOT HIDE THE SHAPE OF THE MESSAGE BENEATH IT',
]
const KEYWORDS = ['NULLKING', 'CROWNGLASS', 'VEXARUNE', 'WASTELAND', 'MIRRORMASK']
const ENGLISH_ORDER = Object.entries(ENGLISH_FREQ).sort((a, b) => b[1] - a[1]).map(([l]) => l)

export default function AnalysisLab() {
  const track = useLabTracker('analysis')
  const [seed, setSeed] = useState(0)
  const puzzle = useMemo(() => {
    const plain = TEXTS[seed % TEXTS.length]
    const alpha = keywordAlphabet(KEYWORDS[seed % KEYWORDS.length])
    return { plain, cipher: substitutionEncrypt(plain, alpha) }
  }, [seed])
  const [map, setMap] = useState<Record<string, string>>({})
  const [hl, setHl] = useState<string | undefined>()
  const counts = useMemo(() => letterCounts(puzzle.cipher), [puzzle])
  const cipherOrder = useMemo(() => Object.entries(counts).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).map(([l]) => l), [counts])
  const partial = applyPartialMapping(puzzle.cipher, map)
  const solved = partial === puzzle.plain

  const setGuess = (c: string, p: string) => {
    track()
    const v = p.toUpperCase().replace(/[^A-Z]/g, '').slice(-1)
    setMap((m) => {
      const n = { ...m }
      if (!v) delete n[c]
      else {
        for (const k of Object.keys(n)) if (n[k] === v) delete n[k]
        n[c] = v
      }
      return n
    })
  }

  const [ks, setKs] = useState('aes128')
  const [rate, setRate] = useState(12)
  const entry = KEYSPACES.find((k) => k.id === ks)!
  const dur = humanDuration(log10BruteForceSeconds(entry.log2, 10 ** rate))

  return (
    <div className="space-y-5">
      <LabSection kicker="Frequency analysis" title="Break a substitution cipher by hand" accent="var(--color-crimson)">
        <p className="text-sm text-mist">This self-contained ciphertext was made with a keyword-mixed alphabet. Map cipher letters to plain letters; the decryption updates live. Start with the most frequent letter.</p>
        <div className="mt-3 font-mono text-sm sm:text-base leading-relaxed break-words bg-black/30 rounded-xl p-3">
          {puzzle.cipher.split('').map((ch, i) => (
            <span key={i} className="inline-flex flex-col items-center mx-[1px]" onMouseEnter={() => /[A-Z]/.test(ch) && setHl(ch)}>
              <span className={`${map[ch] ? 'text-jade' : 'text-mist/60'} text-xs`}>{ch === ' ' ? ' ' : (map[ch] ?? '·')}</span>
              <span className={`${hl === ch ? 'text-magenta' : 'text-ink'} text-xs`}>{ch === ' ' ? ' ' : ch}</span>
            </span>
          ))}
        </div>
        <div className="grid lg:grid-cols-2 gap-5 mt-5">
          <FreqChart text={puzzle.cipher} highlight={hl} />
          <div>
            <div className="hud text-[11px] text-mist mb-2">Your mapping (cipher → plain), most frequent first</div>
            <div className="grid grid-cols-6 sm:grid-cols-9 gap-1.5">
              {cipherOrder.map((c) => (
                <label key={c} className="flex flex-col items-center rounded-lg border border-white/10 bg-black/20 p-1" onMouseEnter={() => setHl(c)}>
                  <span className="font-mono text-magenta text-sm">{c}<sup className="text-[8px] text-mist ml-0.5">{counts[c]}</sup></span>
                  <input className="w-8 text-center bg-transparent border-b border-white/20 font-mono text-jade uppercase focus:outline-none focus:border-cyan" maxLength={1} value={map[c] ?? ''} onChange={(e) => setGuess(c, e.target.value)} aria-label={`Plain letter for cipher ${c}`} />
                </label>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <Button size="sm" onClick={() => { track(); const m: Record<string, string> = {}; cipherOrder.slice(0, 3).forEach((c, i) => { m[c] = ENGLISH_ORDER[i] }); setMap(m) }}><Sparkles size={14} /> Guess top 3 by frequency</Button>
              <Button size="sm" onClick={() => setMap({})}><RotateCcw size={14} /> Clear</Button>
              <Button size="sm" onClick={() => { setSeed((s) => s + 1); setMap({}) }}><Dices size={14} /> New ciphertext</Button>
            </div>
            <p className="text-xs text-mist mt-3">English order: {ENGLISH_ORDER.slice(0, 12).join(' ')}… Look for THE, AND, doubled letters (LL, EE, SS) and one-letter words (A, I).</p>
            {solved && <div className="mt-3 text-jade text-sm" role="status">Solved! A keyspace of ~2⁸⁸ fell to statistics in minutes.</div>}
          </div>
        </div>
      </LabSection>

      <LabSection kicker="Keyspace" title="Theoretical vs practical security" accent="var(--color-azure)">
        <div className="grid md:grid-cols-2 gap-5">
          <div className="space-y-3">
            <label className="block"><span className="hud text-[11px] text-mist">Target</span>
              <select className="input mt-1" value={ks} onChange={(e) => { setKs(e.target.value); track() }}>{KEYSPACES.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}</select>
            </label>
            <label className="block"><span className="hud text-[11px] text-mist">Attacker speed: 10^{rate} guesses / second</span>
              <input type="range" className="range mt-2" min={3} max={18} value={rate} onChange={(e) => { setRate(+e.target.value); track() }} />
              <span className="text-[11px] text-mist">10³ ≈ a slow online login · 10¹² ≈ a large GPU cluster on a fast hash · 10¹⁸ ≈ far beyond any known machine</span>
            </label>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="hud text-[11px] text-mist">Keyspace</div>
            <div className="font-display text-2xl text-bright">2^{entry.log2.toFixed(1)} keys</div>
            <div className="hud text-[11px] text-mist mt-3">Expected brute-force time (half the keyspace)</div>
            <div className="font-display text-xl text-cyan">{dur}</div>
            <p className="text-sm text-mist mt-3">{entry.note}</p>
          </div>
        </div>
        <Note tone="warn">Brute force is the attack of last resort. Substitution’s 2⁸⁸ keys fall to frequency analysis; AES-256 falls to a stolen key, a reused nonce or a guessable passphrase. Always ask: what is the CHEAPEST attack?</Note>
      </LabSection>
    </div>
  )
}

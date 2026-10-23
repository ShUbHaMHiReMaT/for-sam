import { useMemo, useState } from 'react'
import { Wand2 } from 'lucide-react'
import { crackVigenereKey, estimateKeyLength, kasiski, lettersOnly, transpositionDecrypt, transpositionEncrypt, transpositionGrid, columnOrder, vigenereDecrypt, vigenereEncrypt } from '../crypto/classical'
import { VigenereAlign } from '../components/widgets'
import { Button } from '../components/ui'
import { ErrorNote, Field, LabSection, Note, Toggle, useLabTracker } from './common'

const LONG = 'THE LABYRINTH SHIFTS EVERY CORRIDOR BY A LETTER OF THE KEY AND THE KEY REPEATS AND REPEATS AGAIN SO THE SAME WORDS SOMETIMES FALL UNDER THE SAME LETTERS OF THE KEY AND THEN THE SAME CIPHERTEXT APPEARS AGAIN AT A DISTANCE THAT IS A MULTIPLE OF THE KEY LENGTH THE GUARDIANS CALLED THIS CIPHER INDECIPHERABLE BUT THE ECHO GAVE IT AWAY TO ANYONE PATIENT ENOUGH TO COUNT THE DISTANCES BETWEEN THE REPEATS'

export default function VigenereLab() {
  const track = useLabTracker('vigenere')
  const [mode, setMode] = useState<'enc' | 'dec'>('enc')
  const [text, setText] = useState('Attack at dawn')
  const [key, setKey] = useState('LEMON')
  const res = useMemo(() => {
    try { return { out: mode === 'enc' ? vigenereEncrypt(text, key) : vigenereDecrypt(text, key), err: null as string | null } } catch (e) { return { out: '', err: (e as Error).message } }
  }, [mode, text, key])

  const [anaKey, setAnaKey] = useState('ECHO')
  const anaCipher = useMemo(() => { try { return vigenereEncrypt(LONG, anaKey) } catch { return '' } }, [anaKey])
  const [custom, setCustom] = useState('')
  const target = custom.trim() ? custom : anaCipher
  const reps = useMemo(() => kasiski(target, 3).slice(0, 8), [target])
  const ics = useMemo(() => estimateKeyLength(target, 12).sort((a, b) => a.length - b.length), [target])
  const [crack, setCrack] = useState<{ len: number; key: string; plain: string } | null>(null)

  const [tKey, setTKey] = useState('ZEBRAS')
  const [tText, setTText] = useState('We are discovered, flee at once')
  const [tMode, setTMode] = useState<'enc' | 'dec'>('enc')
  const tRes = useMemo(() => {
    try {
      if (!lettersOnly(tKey)) throw new Error('The key must contain letters.')
      return { out: tMode === 'enc' ? transpositionEncrypt(tText, tKey) : transpositionDecrypt(tText, tKey), err: null as string | null }
    } catch (e) { return { out: '', err: (e as Error).message } }
  }, [tKey, tText, tMode])
  const grid = useMemo(() => (lettersOnly(tKey) ? transpositionGrid(tMode === 'enc' ? tText : tRes.out, tKey) : []), [tKey, tText, tMode, tRes.out])
  const order = useMemo(() => { try { return columnOrder(tKey) } catch { return [] } }, [tKey])

  return (
    <div className="space-y-5">
      <LabSection kicker="Vigenère" title="Repeating-key polyalphabetic cipher" accent="var(--color-orchid)">
        <div className="grid md:grid-cols-[auto_1fr_1fr] gap-3 items-end">
          <Toggle label="Direction" value={mode} onChange={(v) => { setMode(v); setText(res.out || text); track() }} options={[{ id: 'enc', label: 'Encrypt' }, { id: 'dec', label: 'Decrypt' }]} />
          <Field label={mode === 'enc' ? 'Plaintext' : 'Ciphertext'}><input className="input" value={text} onChange={(e) => { setText(e.target.value); track() }} /></Field>
          <Field label="Keyword"><input className="input" value={key} onChange={(e) => { setKey(e.target.value); track() }} /></Field>
        </div>
        <ErrorNote text={res.err} />
        {!res.err && (
          <>
            <div className="mt-4"><VigenereAlign text={text} keyword={key} decrypt={mode === 'dec'} reveal /></div>
            <div className="mt-3 font-mono text-lg text-magenta break-words">{res.out}</div>
          </>
        )}
      </LabSection>

      <LabSection kicker="Cryptanalysis" title="How the repeating key leaks" accent="var(--color-crimson)">
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Secret key used for the long sample"><input className="input" value={anaKey} onChange={(e) => { setAnaKey(e.target.value); setCrack(null); track() }} /></Field>
          <Field label="…or paste your own ciphertext" hint="Needs a few hundred letters to work well."><input className="input" value={custom} onChange={(e) => { setCustom(e.target.value); setCrack(null) }} /></Field>
        </div>
        <div className="mt-3 font-mono text-[11px] text-ink/80 break-all max-h-24 overflow-y-auto bg-black/30 rounded-lg p-2">{lettersOnly(target)}</div>
        <div className="grid lg:grid-cols-2 gap-5 mt-4">
          <div>
            <div className="hud text-[11px] text-mist mb-2">1 · Kasiski: repeated trigrams and their spacing</div>
            {reps.length ? (
              <table className="w-full text-xs font-mono">
                <thead><tr className="text-mist"><th className="text-left">seq</th><th className="text-left">positions</th><th className="text-left">distances</th></tr></thead>
                <tbody>{reps.map((r) => <tr key={r.seq} className="border-t border-white/5"><td className="text-amber py-0.5">{r.seq}</td><td>{r.positions.slice(0, 4).join(', ')}</td><td className="text-cyan">{r.distances.slice(0, 4).join(', ')}</td></tr>)}</tbody>
              </table>
            ) : <p className="text-sm text-mist">No repeats found — need more ciphertext.</p>}
            <p className="text-xs text-mist mt-2">Distances between true repeats are multiples of the key length.</p>
          </div>
          <div>
            <div className="hud text-[11px] text-mist mb-2">2 · Index of coincidence per guessed key length</div>
            <div className="flex items-end gap-1 h-28" role="img" aria-label="Average index of coincidence for each candidate key length">
              {ics.map((x) => (
                <div key={x.length} className="flex-1 flex flex-col items-center justify-end h-full">
                  <div className="w-full rounded-t-sm" style={{ height: `${Math.min(100, (x.ic / 0.075) * 100)}%`, background: x.ic > 0.058 ? '#4dffb8' : '#3b5070' }} title={`L=${x.length}: ${x.ic.toFixed(3)}`} />
                  <span className="text-[10px] text-mist font-mono">{x.length}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-mist mt-2">English ≈ 0.066, random ≈ 0.038. Lengths where each column looks like English (green) are likely the key length or its multiples.</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button variant="primary" accent="var(--color-crimson)" onClick={() => {
            track()
            const best = [...ics].filter((x) => x.ic > 0.058).sort((a, b) => a.length - b.length)[0] ?? [...ics].sort((a, b) => b.ic - a.ic)[0]
            if (!best) return
            const k = crackVigenereKey(target, best.length)
            setCrack({ len: best.length, key: k, plain: vigenereDecrypt(lettersOnly(target), k) })
          }}><Wand2 size={14} /> 3 · Recover the key</Button>
          {crack && <span className="text-sm">Key length <span className="text-cyan font-mono">{crack.len}</span> → key <span className="text-jade font-mono">{crack.key}</span></span>}
        </div>
        {crack && <div className="mt-3 font-mono text-xs text-jade break-all bg-black/30 rounded-lg p-2 max-h-28 overflow-y-auto">{crack.plain}</div>}
        <Note>Each column of every L-th letter is just a Caesar cipher, broken by frequency analysis (χ²). This is why a repeating key — however clever — leaks. A one-time pad avoids it only with a truly random, never-reused key as long as the message.</Note>
      </LabSection>

      <LabSection kicker="Transposition" title="Columnar transposition" accent="var(--color-azure)">
        <div className="grid md:grid-cols-[auto_1fr_1fr] gap-3 items-end">
          <Toggle label="Direction" value={tMode} onChange={(v) => { setTMode(v); if (tRes.out) setTText(tRes.out); track() }} options={[{ id: 'enc', label: 'Encrypt' }, { id: 'dec', label: 'Decrypt' }]} />
          <Field label={tMode === 'enc' ? 'Plaintext' : 'Ciphertext'}><input className="input" value={tText} onChange={(e) => { setTText(e.target.value); track() }} /></Field>
          <Field label="Keyword"><input className="input" value={tKey} onChange={(e) => { setTKey(e.target.value); track() }} /></Field>
        </div>
        <ErrorNote text={tRes.err} />
        {!tRes.err && grid.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="font-mono text-sm border-separate border-spacing-1">
              <thead>
                <tr>{lettersOnly(tKey).split('').map((ch, i) => <th key={i} className="w-8 h-8 rounded bg-amber/15 text-amber">{ch}</th>)}</tr>
                <tr>{lettersOnly(tKey).split('').map((_, i) => <th key={i} className="text-[10px] text-mist">#{order.indexOf(i) + 1}</th>)}</tr>
              </thead>
              <tbody>{grid.map((row, r) => <tr key={r}>{row.map((ch, c) => <td key={c} className="w-8 h-8 text-center rounded bg-white/5 text-ink">{ch}</td>)}</tr>)}</tbody>
            </table>
            <div className="mt-3 font-mono text-magenta break-all">{tRes.out}</div>
            <p className="text-xs text-mist mt-2">Columns are read in the alphabetical order of the keyword letters (#1, #2…). Letter frequencies never change — only positions.</p>
          </div>
        )}
      </LabSection>
    </div>
  )
}

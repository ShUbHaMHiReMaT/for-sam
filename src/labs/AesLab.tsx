import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { BadgeCheck, ChevronLeft, ChevronRight, Dices, Pause, Play, SkipBack, SkipForward, TriangleAlert } from 'lucide-react'
import { AES_PARAMS, SBOX, INV_SBOX, aesDecryptTrace, aesEncryptTrace, expandKey, fromHex, gmul, hex, toHex, utf8Bytes, type AesTraceStep, type AesVariant } from '../crypto/aes'
import { webCryptoAesBlock, randomBytes } from '../crypto/webcrypto'
import { SboxTable, StateGrid } from '../components/widgets'
import { Button } from '../components/ui'
import { ErrorNote, Field, LabSection, Note, Toggle, useLabTracker } from './common'
import { useGame } from '../game/GameContext'

const PRESETS: { id: string; label: string; variant: AesVariant; key: string; pt: string; ct: string }[] = [
  { id: 'c1', label: 'FIPS-197 C.1 (AES-128)', variant: 128, key: '000102030405060708090a0b0c0d0e0f', pt: '00112233445566778899aabbccddeeff', ct: '69c4e0d86a7b0430d8cdb78070b4c55a' },
  { id: 'c2', label: 'FIPS-197 C.2 (AES-192)', variant: 192, key: '000102030405060708090a0b0c0d0e0f1011121314151617', pt: '00112233445566778899aabbccddeeff', ct: 'dda97ca4864cdfe06eaf70a0ec0d7191' },
  { id: 'c3', label: 'FIPS-197 C.3 (AES-256)', variant: 256, key: '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f', pt: '00112233445566778899aabbccddeeff', ct: '8ea2b7ca516745bfeafc49904b496089' },
  { id: 'b', label: 'FIPS-197 Appendix B', variant: 128, key: '2b7e151628aed2a6abf7158809cf4f3c', pt: '3243f6a8885a308d313198a2e0370734', ct: '3925841d02dc09fbdc118597196a0b32' },
]

const OP_COLOR: Record<string, string> = {
  Input: '#8d98b3', Output: '#4dffb8', AddRoundKey: '#ffb547', SubBytes: '#ff4fd8', ShiftRows: '#22e4ff', MixColumns: '#b77bff',
  InvSubBytes: '#ff4fd8', InvShiftRows: '#22e4ff', InvMixColumns: '#b77bff',
}

const bin = (b: number) => b.toString(2).padStart(8, '0')

export default function AesLab() {
  const track = useLabTracker('aes')
  const { reducedMotion, sfx } = useGame()
  const [variant, setVariant] = useState<AesVariant>(128)
  const [keyHex, setKeyHex] = useState(PRESETS[0].key)
  const [inputMode, setInputMode] = useState<'hex' | 'text'>('hex')
  const [ptHex, setPtHex] = useState(PRESETS[0].pt)
  const [ptText, setPtText] = useState('Guardians rise!')
  const [dir, setDir] = useState<'enc' | 'dec'>('enc')
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [sel, setSel] = useState<number | undefined>(undefined)
  const [wc, setWc] = useState<null | { ok: boolean; hex: string } | { error: string }>(null)

  const parsed = useMemo(() => {
    try {
      const key = fromHex(keyHex)
      const need = AES_PARAMS[variant].keyBytes
      if (key.length !== need) return { error: `AES-${variant} needs a ${need}-byte key: exactly ${need * 2} hex digits (you have ${key.length * 2}).` }
      let block: number[]
      if (inputMode === 'hex' || dir === 'dec') {
        block = fromHex(ptHex)
        if (block.length !== 16) return { error: `A block is exactly 16 bytes = 32 hex digits (you have ${block.length * 2}). For longer data, see the Modes lab.` }
      } else {
        const b = utf8Bytes(ptText)
        if (b.length > 15) return { error: `“${ptText}” is ${b.length} bytes in UTF-8. This single-block lab accepts up to 15 bytes of text (PKCS#7 padding fills the rest). Use the Modes lab for longer messages.` }
        const n = 16 - b.length
        block = [...b, ...new Array(n).fill(n)]
      }
      return { key, block }
    } catch (e) {
      return { error: (e as Error).message }
    }
  }, [keyHex, ptHex, ptText, inputMode, variant, dir])

  const run = useMemo(() => {
    if ('error' in parsed) return null
    return dir === 'enc' ? aesEncryptTrace(parsed.block, parsed.key, variant) : aesDecryptTrace(parsed.block, parsed.key, variant)
  }, [parsed, variant, dir])
  const trace = run?.trace ?? []
  const st: AesTraceStep | undefined = trace[Math.min(i, trace.length - 1)]
  const prev = i > 0 ? trace[i - 1] : undefined
  const schedule = useMemo(() => ('error' in parsed ? null : expandKey(parsed.key, variant)), [parsed, variant])
  const preset = PRESETS.find((p) => p.key === keyHex && p.pt === ptHex && p.variant === variant)

  useEffect(() => { setI(0); setSel(undefined); setWc(null) }, [keyHex, ptHex, ptText, inputMode, variant, dir])
  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => setI((x) => { if (x >= trace.length - 1) { setPlaying(false); return x } return x + 1 }), reducedMotion ? 500 : 900)
    return () => clearInterval(id)
  }, [playing, trace.length, reducedMotion])

  // Cross-check every encryption against the browser's real AES (Web Crypto).
  useEffect(() => {
    if (!run || dir !== 'enc' || 'error' in parsed) return
    let live = true
    webCryptoAesBlock(parsed.block, parsed.key).then((ref) => { if (live) setWc({ ok: toHex(ref) === toHex(run.output), hex: toHex(ref) }) }).catch((e) => live && setWc({ error: String(e.message ?? e) }))
    return () => { live = false }
  }, [run, dir, parsed])

  const loadPreset = (id: string) => {
    const p = PRESETS.find((x) => x.id === id)!
    setVariant(p.variant); setKeyHex(p.key); setPtHex(p.pt); setInputMode('hex'); setDir('enc'); track()
  }

  const rounds = AES_PARAMS[variant].Nr
  const roundStart = (r: number) => trace.findIndex((t) => t.round === r && t.op !== 'Input')

  return (
    <div className="space-y-5">
      <Note tone="warn"><TriangleAlert size={14} className="inline mr-1" />This visualiser uses an <b>educational</b> AES implementation built for tracing. It is validated against the FIPS-197 test vectors and cross-checked live against your browser’s Web Crypto AES, but it is not constant-time — never use it to protect real data.</Note>

      <LabSection kicker="Configure" title="Key, block & variant">
        <div className="grid lg:grid-cols-[1fr_1fr] gap-5">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {([128, 192, 256] as AesVariant[]).map((v) => (
                <button key={v} onClick={() => { setVariant(v); setKeyHex(PRESETS[v === 128 ? 0 : v === 192 ? 1 : 2].key); track() }} className={`btn btn-sm ${variant === v ? 'btn-primary' : ''}`} aria-pressed={variant === v}>AES-{v}</button>
              ))}
            </div>
            <table className="text-xs w-full">
              <thead><tr className="text-mist hud"><th className="text-left py-1">Variant</th><th className="text-left">Key</th><th className="text-left">Block</th><th className="text-left">Rounds</th><th className="text-left">Round keys</th></tr></thead>
              <tbody className="font-mono">
                {([128, 192, 256] as AesVariant[]).map((v) => (
                  <tr key={v} className={v === variant ? 'text-cyan' : 'text-ink/70'}><td className="py-0.5">AES-{v}</td><td>{v} bits</td><td>128 bits</td><td>{AES_PARAMS[v].Nr}</td><td>{AES_PARAMS[v].Nr + 1}</td></tr>
                ))}
              </tbody>
            </table>
            <Field label="Presets (known test vectors)">
              <select className="input" value={preset?.id ?? ''} onChange={(e) => e.target.value && loadPreset(e.target.value)}>
                <option value="">Custom…</option>
                {PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </Field>
          </div>
          <div className="space-y-3">
            <Field label={`Key (${AES_PARAMS[variant].keyBytes * 2} hex digits)`}>
              <div className="flex gap-2"><input className="input" value={keyHex} onChange={(e) => { setKeyHex(e.target.value); track() }} spellCheck={false} /><Button size="sm" onClick={() => { setKeyHex(toHex(randomBytes(AES_PARAMS[variant].keyBytes))); track() }} title="Random key from the CSPRNG"><Dices size={14} /></Button></div>
            </Field>
            <div className="flex gap-3 items-center flex-wrap">
              <Toggle label="Direction" value={dir} onChange={(v) => { if (v === 'dec' && run && dir === 'enc') { setPtHex(toHex(run.output)); setInputMode('hex') } setDir(v); track() }} options={[{ id: 'enc', label: 'Encrypt' }, { id: 'dec', label: 'Decrypt' }]} />
              {dir === 'enc' && <Toggle label="Input format" value={inputMode} onChange={setInputMode} options={[{ id: 'hex', label: 'Hex' }, { id: 'text', label: 'Text' }]} />}
            </div>
            {inputMode === 'hex' || dir === 'dec' ? (
              <Field label={dir === 'enc' ? 'Plaintext block (32 hex digits)' : 'Ciphertext block (32 hex digits)'}><input className="input" value={ptHex} onChange={(e) => { setPtHex(e.target.value); track() }} spellCheck={false} /></Field>
            ) : (
              <Field label="Plaintext text (≤ 15 bytes, PKCS#7 padded)"><input className="input" value={ptText} onChange={(e) => { setPtText(e.target.value); track() }} /></Field>
            )}
            <ErrorNote text={'error' in parsed ? parsed.error ?? null : null} />
          </div>
        </div>
      </LabSection>

      {run && st && (
        <LabSection kicker="Trace" title={`${dir === 'enc' ? 'Encryption' : 'Decryption'} — step ${i + 1} of ${trace.length}`}>
          {/* round timeline */}
          <div className="flex flex-wrap gap-1 mb-4" aria-label="Rounds">
            {Array.from({ length: rounds + 1 }, (_, r) => {
              const rr = dir === 'enc' ? r : rounds - r
              const idx = roundStart(rr)
              const active = st.round === rr
              return <button key={r} onClick={() => { if (idx >= 0) setI(idx); track() }} className={`hud text-[10px] px-2 py-1 rounded-md border ${active ? 'border-cyan text-cyan bg-cyan/10' : 'border-white/10 text-mist hover:text-bright'}`}>R{rr}</button>
            })}
          </div>
          <input type="range" min={0} max={trace.length - 1} value={i} onChange={(e) => { setI(+e.target.value); track() }} className="range mb-4" aria-label="Trace position" />
          <div className="grid lg:grid-cols-[auto_1fr] gap-6">
            <div className="flex flex-col items-center gap-3">
              <motion.div key={i} initial={{ opacity: 0.5, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
                <StateGrid state={st.state} prev={prev?.state} size="lg" onCell={(k) => { setSel(k); sfx('click') }} selected={sel} />
              </motion.div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => setI(0)} aria-label="First step"><SkipBack size={14} /></Button>
                <Button size="sm" onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0} aria-label="Previous step"><ChevronLeft size={14} /></Button>
                <Button size="sm" variant="primary" onClick={() => { setPlaying(!playing); track() }} aria-label={playing ? 'Pause' : 'Play'}>{playing ? <Pause size={14} /> : <Play size={14} />}</Button>
                <Button size="sm" onClick={() => setI(Math.min(trace.length - 1, i + 1))} disabled={i >= trace.length - 1} aria-label="Next step"><ChevronRight size={14} /></Button>
                <Button size="sm" onClick={() => setI(trace.length - 1)} aria-label="Last step"><SkipForward size={14} /></Button>
              </div>
              <div className="text-[11px] text-mist">Highlighted cells changed in this step. Click a byte to inspect it.</div>
            </div>
            <div className="min-w-0 space-y-4">
              <div>
                <div className="hud text-xs text-mist">Round {st.round}</div>
                <div className="hud text-2xl" style={{ color: OP_COLOR[st.op] }}>{st.op}</div>
                <p className="text-ink text-sm mt-1">{st.note}</p>
                {st.round === rounds && dir === 'enc' && st.op === 'ShiftRows' && <p className="text-amber text-sm mt-1">Final round: MixColumns is skipped next.</p>}
              </div>
              <OpDetail st={st} prev={prev} sel={sel} dir={dir} />
              <ByteInspector st={st} prev={prev} sel={sel} />
            </div>
          </div>

          <div className="mt-6 grid md:grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/10 bg-black/30 p-3">
              <div className="hud text-[11px] text-mist">{dir === 'enc' ? 'Ciphertext' : 'Recovered plaintext'}</div>
              <div className="font-mono text-jade break-all">{toHex(run.output)}</div>
              {dir === 'dec' && <div className="text-xs text-mist mt-1">As text: <span className="text-ink">{safeText(run.output)}</span></div>}
            </div>
            <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm space-y-1">
              {preset && dir === 'enc' && <div className={`flex items-center gap-2 ${toHex(run.output) === preset.ct ? 'text-jade' : 'text-crimson'}`}><BadgeCheck size={16} /> {toHex(run.output) === preset.ct ? 'Matches the published FIPS-197 vector' : 'Does NOT match the published vector'}</div>}
              {dir === 'enc' && wc && ('error' in wc ? <div className="text-mist">Web Crypto unavailable: {wc.error}</div> : <div className={`flex items-center gap-2 ${wc.ok ? 'text-jade' : 'text-crimson'}`}><BadgeCheck size={16} /> {wc.ok ? 'Matches your browser’s Web Crypto AES' : `Mismatch with Web Crypto (${wc.hex})`}</div>)}
              {dir === 'dec' && <div className="text-mist">Decryption runs the inverse cipher: InvShiftRows, InvSubBytes, AddRoundKey and InvMixColumns, with round keys in reverse order.</div>}
            </div>
          </div>
        </LabSection>
      )}

      {schedule && (
        <LabSection kicker="Key schedule" title="Expanding the key into round keys" accent="var(--color-amber)">
          <p className="text-sm text-mist mb-3">The {AES_PARAMS[variant].keyBytes}-byte key becomes {schedule.words.length} four-byte words — {AES_PARAMS[variant].Nr + 1} round keys of 16 bytes. Every {AES_PARAMS[variant].Nk}th word is mixed with RotWord, SubWord (the S-box) and a round constant, so round keys differ nonlinearly from each other.</p>
          <div className="max-h-72 overflow-y-auto">
            <table className="w-full text-xs font-mono">
              <thead className="sticky top-0 bg-midnight"><tr className="text-mist hud"><th className="text-left py-1 pr-3">w[i]</th><th className="text-left pr-3">word</th><th className="text-left pr-3">round key</th><th className="text-left">how</th></tr></thead>
              <tbody>
                {schedule.log.map((w) => (
                  <tr key={w.i} className={`border-t border-white/5 ${st?.roundKey && Math.floor(w.i / 4) === st.round && st.op === 'AddRoundKey' ? 'bg-amber/10 text-amber' : 'text-ink/80'}`}>
                    <td className="py-1 pr-3">{w.i}</td><td className="pr-3">{toHex(w.word)}</td><td className="pr-3">{Math.floor(w.i / 4)}</td><td className="font-sans text-mist">{w.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </LabSection>
      )}

      <LabSection kicker="Reference" title="The S-box" accent="var(--color-magenta)">
        <SboxTable highlight={sel !== undefined && st ? (st.op === 'SubBytes' && prev ? prev.state[sel] : st.state[sel]) : undefined} />
        <Note>The S-box is built from the multiplicative inverse in GF(2⁸) followed by an affine transform; this lab generates it at start-up rather than pasting a table. It is the only nonlinear part of AES.</Note>
      </LabSection>
    </div>
  )
}

function safeText(b: number[]) {
  const n = b[15]
  const body = n > 0 && n <= 16 && b.slice(16 - n).every((x) => x === n) ? b.slice(0, 16 - n) : b
  try { return new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(body)) } catch { return '(not valid UTF-8 text)' }
}

function OpDetail({ st, prev, sel, dir }: { st: AesTraceStep; prev?: AesTraceStep; sel?: number; dir: 'enc' | 'dec' }) {
  if (!prev) return null
  if (st.op === 'AddRoundKey' && st.roundKey) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <StateGrid state={prev.state} size="sm" selected={sel} />
        <span className="text-amber font-mono text-xl">⊕</span>
        <div><div className="hud text-[10px] text-amber mb-1">Round key {st.round}</div><StateGrid state={st.roundKey} size="sm" selected={sel} /></div>
        <span className="text-mist font-mono text-xl">=</span>
        <StateGrid state={st.state} size="sm" selected={sel} />
      </div>
    )
  }
  if (st.op === 'ShiftRows' || st.op === 'InvShiftRows') {
    return (
      <div className="space-y-1 font-mono text-xs">
        {[0, 1, 2, 3].map((r) => (
          <div key={r} className="flex items-center gap-2">
            <span className="text-mist w-14">row {r}</span>
            {[0, 1, 2, 3].map((c) => <span key={c} className="w-7 text-center text-ink/70">{hex(prev.state[r + 4 * c])}</span>)}
            <span className="text-cyan">→</span>
            {[0, 1, 2, 3].map((c) => <motion.span key={c} className="w-7 text-center text-cyan" initial={{ x: (st.op === 'ShiftRows' ? r : -r) * 28 }} animate={{ x: 0 }} transition={{ duration: 0.6 }}>{hex(st.state[r + 4 * c])}</motion.span>)}
            <span className="text-mist">{r === 0 ? 'unchanged' : `${st.op === 'ShiftRows' ? '←' : '→'} ${r}`}</span>
          </div>
        ))}
      </div>
    )
  }
  if ((st.op === 'MixColumns' || st.op === 'InvMixColumns') && sel !== undefined) {
    const c = Math.floor(sel / 4), r = sel % 4
    const M = st.op === 'MixColumns' ? [[2, 3, 1, 1], [1, 2, 3, 1], [1, 1, 2, 3], [3, 1, 1, 2]] : [[14, 11, 13, 9], [9, 14, 11, 13], [13, 9, 14, 11], [11, 13, 9, 14]]
    const col = [0, 1, 2, 3].map((k) => prev.state[k + 4 * c])
    const terms = M[r].map((m, k) => ({ m, b: col[k], v: gmul(m, col[k]) }))
    return (
      <div className="text-xs font-mono rounded-lg bg-black/30 p-3 space-y-1">
        <div className="text-mist font-sans">Output byte (row {r}, column {c}) = row {r} of the {dir === 'enc' ? '' : 'inverse '}matrix · column {c}, in GF(2⁸):</div>
        <div className="text-orchid break-all">{terms.map((t) => `{${hex(t.m)}}·{${hex(t.b)}}`).join(' ⊕ ')}</div>
        <div className="text-ink break-all">= {terms.map((t) => hex(t.v)).join(' ⊕ ')} = <span className="text-cyan">{hex(st.state[sel])}</span></div>
      </div>
    )
  }
  if (st.op === 'MixColumns' || st.op === 'InvMixColumns') return <div className="text-xs text-mist">Click a byte to see how its column is multiplied.</div>
  return null
}

function ByteInspector({ st, prev, sel }: { st: AesTraceStep; prev?: AesTraceStep; sel?: number }) {
  if (sel === undefined) return null
  const v = st.state[sel]
  const before = prev?.state[sel]
  return (
    <div className="rounded-lg border border-magenta/30 bg-magenta/5 p-3 text-sm grid sm:grid-cols-2 gap-2">
      <div>
        <div className="hud text-[10px] text-magenta">Byte row {sel % 4}, column {Math.floor(sel / 4)}</div>
        <div className="font-mono">hex <span className="text-bright">{hex(v)}</span> · dec <span className="text-bright">{v}</span></div>
        <div className="font-mono">bin <span className="text-bright">{bin(v)}</span></div>
      </div>
      {before !== undefined && (st.op === 'SubBytes' || st.op === 'InvSubBytes') && (
        <div className="font-mono text-xs">
          <div className="hud text-[10px] text-mist font-sans">{st.op === 'SubBytes' ? 'S-box' : 'Inverse S-box'} lookup</div>
          row <span className="text-magenta">{hex(before)[0]}</span>, col <span className="text-magenta">{hex(before)[1]}</span>: {hex(before)} → <span className="text-cyan">{hex(st.op === 'SubBytes' ? SBOX[before] : INV_SBOX[before])}</span>
        </div>
      )}
      {before !== undefined && st.op === 'AddRoundKey' && st.roundKey && (
        <div className="font-mono text-xs">
          <div>{bin(before)} ({hex(before)})</div>
          <div className="text-amber">⊕ {bin(st.roundKey[sel])} ({hex(st.roundKey[sel])})</div>
          <div className="text-cyan">= {bin(v)} ({hex(v)})</div>
        </div>
      )}
    </div>
  )
}

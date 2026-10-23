import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, ChevronLeft, ChevronRight, Lock, Unlock } from 'lucide-react'
import { ALPHABET, ENGLISH_FREQ, caesarDecrypt, caesarEncrypt, letterFrequencies, vigenereAlignment } from '../crypto/classical'
import { buildSquare, cleanForPlayfair } from '../crypto/playfair'
import { SBOX, aesEncryptTrace, fromHex, hex } from '../crypto/aes'
import { modInverse, modPow, gcd } from '../crypto/publickey'
import { bitDifference, sha256Hex } from '../crypto/webcrypto'
import type { WidgetId } from '../game/types'

export interface WidgetCtx { reveal: boolean }

export function Widget({ id, props = {}, reveal }: { id: WidgetId; props?: Record<string, unknown>; reveal: boolean }) {
  const p = props as Record<string, any>
  switch (id) {
    case 'caesarWheel': return <CaesarWheel initial={p.shift ?? 3} interactive={p.interactive ?? true} sample={p.sample} />
    case 'playfairSquare': return <PlayfairSquare keyword={p.keyword ?? 'PLAYFAIR'} highlight={p.highlight} editable={p.editable ?? false} />
    case 'vigenereAlign': return <VigenereAlign text={p.text ?? 'ATTACK AT DAWN'} keyword={p.keyword ?? 'LEMON'} decrypt={!!p.decrypt} reveal={reveal} editable={!!p.editable} />
    case 'aesMini': return p.sbox !== undefined ? <SboxTable highlight={p.sbox} /> : <AesMini />
    case 'freqChart': return <FreqChart text={p.text ?? ''} />
    case 'dhMix': return <DhMix p={p.p ?? 23} g={p.g ?? 5} a={p.a ?? 6} b={p.b ?? 15} reveal={reveal} />
    case 'hashAvalanche': return <HashAvalanche />
    case 'rsaMini': return <RsaMini p={p.p ?? 61} q={p.q ?? 53} e={p.e ?? 17} m={p.m} reveal={reveal} />
    case 'pipeline': return <Pipeline />
  }
}

// ───────────── Caesar wheel ─────────────

export function CaesarWheel({ initial = 3, interactive = true, sample, size = 260, value, onChange }: { initial?: number; interactive?: boolean; sample?: string; size?: number; value?: number; onChange?: (n: number) => void }) {
  const [inner, setInner] = useState(initial)
  const shift = value ?? inner
  const setShift = (v: number | ((s: number) => number)) => {
    const n = typeof v === 'function' ? v(shift) : v
    setInner(n)
    onChange?.(n)
  }
  const R = 120, r = 88
  return (
    <div className="flex flex-col sm:flex-row items-center gap-5">
      <svg viewBox="-140 -140 280 280" width={size} height={size} role="img" aria-label={`Caesar wheel at shift ${shift}: A maps to ${ALPHABET[shift]}`}>
        <circle r="136" fill="#070b16" stroke="#22e4ff" strokeOpacity="0.35" />
        <circle r="104" fill="#0a1020" stroke="#ffb547" strokeOpacity="0.35" />
        {ALPHABET.split('').map((ch, i) => {
          const a = (i / 26) * Math.PI * 2 - Math.PI / 2
          return <text key={ch} x={Math.cos(a) * R} y={Math.sin(a) * R + 5} textAnchor="middle" fontSize="14" fill={i === 0 ? '#22e4ff' : '#c9d2e6'} fontFamily="JetBrains Mono" fontWeight={i === 0 ? 700 : 400}>{ch}</text>
        })}
        <motion.g animate={{ rotate: (-shift * 360) / 26 }} transition={{ type: 'spring', stiffness: 120, damping: 18 }}>
          {ALPHABET.split('').map((ch, i) => {
            const a = (i / 26) * Math.PI * 2 - Math.PI / 2
            return <text key={ch} x={Math.cos(a) * r} y={Math.sin(a) * r + 5} textAnchor="middle" fontSize="13" fill={i === shift ? '#ffb547' : '#8d98b3'} fontFamily="JetBrains Mono" fontWeight={i === shift ? 700 : 400} transform={`rotate(${(i * 360) / 26} ${Math.cos(a) * r} ${Math.sin(a) * r})`}>{ch}</text>
          })}
        </motion.g>
        <path d="M0 -138 L-6 -150 L6 -150 Z" fill="#22e4ff" />
        <text y="6" textAnchor="middle" fontSize="28" fill="#ffb547" fontFamily="Chakra Petch" fontWeight="700">{shift}</text>
        <text y="24" textAnchor="middle" fontSize="9" fill="#8d98b3" fontFamily="Chakra Petch" letterSpacing="2">SHIFT</text>
      </svg>
      <div className="flex-1 w-full min-w-0">
        <p className="text-sm text-mist">Outer ring: plaintext. Inner ring: ciphertext. <span className="text-cyan">A</span> → <span className="text-amber">{ALPHABET[shift]}</span>.</p>
        {interactive && (
          <div className="mt-3 flex items-center gap-2">
            <button className="btn btn-sm" onClick={() => setShift((s) => (s + 25) % 26)} aria-label="Decrease shift"><ChevronLeft size={14} /></button>
            <input type="range" min={0} max={25} value={shift} onChange={(e) => setShift(+e.target.value)} className="range" aria-label="Shift" />
            <button className="btn btn-sm" onClick={() => setShift((s) => (s + 1) % 26)} aria-label="Increase shift"><ChevronRight size={14} /></button>
          </div>
        )}
        {sample && (
          <div className="mt-3 font-mono text-sm">
            <div className="text-mist text-xs hud">Decrypted with shift {shift}</div>
            <div className="text-bright break-words">{caesarDecrypt(sample, shift)}</div>
          </div>
        )}
      </div>
    </div>
  )
}

// ───────────── Playfair square ─────────────

export function PlayfairSquare({ keyword, highlight, editable = false, active, targets, compact }: { keyword: string; highlight?: string; editable?: boolean; active?: [string, string]; targets?: [string, string]; compact?: boolean }) {
  const [kw, setKw] = useState(keyword)
  useEffect(() => setKw(keyword), [keyword])
  const sq = buildSquare(kw)
  const hl = highlight ? cleanForPlayfair(highlight) : ''
  const keyLetters = new Set(cleanForPlayfair(kw))
  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start">
      <div className={`grid grid-cols-5 gap-1.5 ${compact ? 'w-48' : 'w-full max-w-[260px]'} shrink-0`} role="grid" aria-label={`Playfair square for keyword ${kw}`}>
        {sq.flat().map((ch, i) => {
          const isA = active?.includes(ch) || hl.includes(ch)
          const isT = targets?.includes(ch)
          return (
            <motion.div
              key={ch + i}
              layout
              role="gridcell"
              className="aspect-square grid place-items-center rounded-lg font-mono font-bold text-lg border"
              animate={{ scale: isA || isT ? 1.08 : 1 }}
              style={{
                background: isT ? 'rgb(255 79 216 / 0.25)' : isA ? 'rgb(34 228 255 / 0.2)' : keyLetters.has(ch) ? 'rgb(255 181 71 / 0.08)' : 'rgb(4 8 18 / 0.8)',
                borderColor: isT ? '#ff4fd8' : isA ? '#22e4ff' : 'rgb(120 170 255 / 0.15)',
                color: isT ? '#ffd0f5' : isA ? '#bff6ff' : keyLetters.has(ch) ? '#ffd28a' : '#c9d2e6',
              }}
            >
              {ch === 'I' ? <span>I<span className="text-[9px] opacity-60">/J</span></span> : ch}
            </motion.div>
          )
        })}
      </div>
      <div className="text-sm text-mist flex-1">
        {editable ? (
          <label className="block mb-2"><span className="hud text-xs">Keyword</span><input className="input mt-1" value={kw} onChange={(e) => setKw(e.target.value)} /></label>
        ) : (
          <div className="mb-1"><span className="hud text-xs">Keyword</span> <span className="font-mono text-amber">{kw.toUpperCase()}</span></div>
        )}
        <p className="text-xs leading-relaxed"><span className="text-amber">Amber</span> letters come from the keyword; the rest of the alphabet follows. I and J share a cell.</p>
      </div>
    </div>
  )
}

// ───────────── Vigenère alignment ─────────────

export function VigenereAlign({ text, keyword, decrypt, reveal, editable }: { text: string; keyword: string; decrypt: boolean; reveal: boolean; editable?: boolean }) {
  const [kw, setKw] = useState(keyword)
  const [showOut, setShowOut] = useState(reveal)
  const rows = vigenereAlignment(text.toUpperCase(), kw)
  return (
    <div>
      {editable && (
        <label className="block mb-3 max-w-xs"><span className="hud text-xs text-mist">Try a key</span><input className="input mt-1" value={kw} onChange={(e) => setKw(e.target.value)} placeholder="Enter a keyword" /></label>
      )}
      <div className="overflow-x-auto pb-2">
        <table className="font-mono text-sm border-separate border-spacing-x-1 border-spacing-y-1">
          <tbody>
            <tr><th className="hud text-[10px] text-mist pr-2 text-left">{decrypt ? 'Cipher' : 'Plain'}</th>{rows.map((r, i) => <td key={i} className="w-7 h-7 text-center rounded bg-white/5 text-bright">{r.ch === ' ' ? '·' : r.ch}</td>)}</tr>
            <tr><th className="hud text-[10px] text-mist pr-2 text-left">Key</th>{rows.map((r, i) => <td key={i} className="w-7 h-7 text-center rounded bg-amber/10 text-amber">{r.k}</td>)}</tr>
            <tr><th className="hud text-[10px] text-mist pr-2 text-left">Shift</th>{rows.map((r, i) => <td key={i} className="w-7 text-center text-[11px] text-mist">{r.k ? (decrypt ? `−${r.shift}` : `+${r.shift}`) : ''}</td>)}</tr>
            {showOut && (
              <tr><th className="hud text-[10px] text-cyan pr-2 text-left">{decrypt ? 'Plain' : 'Cipher'}</th>{rows.map((r, i) => {
                const out = r.k ? String.fromCharCode(65 + ((r.ch.charCodeAt(0) - 65 + (decrypt ? -r.shift : r.shift) + 26) % 26)) : r.ch
                return <td key={i} className="w-7 h-7 text-center rounded bg-cyan/10 text-cyan">{out === ' ' ? '·' : out}</td>
              })}</tr>
            )}
          </tbody>
        </table>
      </div>
      {!reveal && editable && (
        <button className="btn btn-sm mt-2" onClick={() => setShowOut((v) => !v)}>{showOut ? 'Hide output' : 'Show output for this key'}</button>
      )}
    </div>
  )
}

// ───────────── AES ─────────────

const FIPS_KEY = fromHex('000102030405060708090a0b0c0d0e0f')
const FIPS_PT = fromHex('00112233445566778899aabbccddeeff')

export function StateGrid({ state, prev, size = 'md', onCell, selected }: { state: number[]; prev?: number[]; size?: 'sm' | 'md' | 'lg'; onCell?: (i: number) => void; selected?: number }) {
  const cell = size === 'sm' ? 'w-9 h-9 text-xs' : size === 'lg' ? 'w-14 h-14 sm:w-16 sm:h-16 text-base' : 'w-11 h-11 text-sm'
  return (
    <div className="grid grid-cols-4 gap-1.5 w-max" role="grid" aria-label="AES state (4 by 4 bytes, column-major)">
      {[0, 1, 2, 3].map((r) => [0, 1, 2, 3].map((c) => {
        const i = r + 4 * c
        const changed = prev && prev[i] !== state[i]
        return (
          <button
            key={`${r}-${c}`}
            type="button"
            role="gridcell"
            onClick={() => onCell?.(i)}
            className={`byte ${cell} ${onCell ? 'cursor-pointer hover:border-cyan' : 'cursor-default'}`}
            style={{ background: selected === i ? 'rgb(255 79 216 / 0.25)' : changed ? 'rgb(34 228 255 / 0.16)' : undefined, borderColor: selected === i ? '#ff4fd8' : changed ? 'rgb(34 228 255 / 0.5)' : undefined, color: changed ? '#bff6ff' : '#c9d2e6' }}
            aria-label={`row ${r} column ${c}: ${hex(state[i])}`}
            tabIndex={onCell ? 0 : -1}
          >
            {hex(state[i])}
          </button>
        )
      }))}
    </div>
  )
}

function AesMini() {
  const { trace } = useMemo(() => aesEncryptTrace(FIPS_PT, FIPS_KEY, 128), [])
  const [i, setI] = useState(0)
  const st = trace[i]
  return (
    <div className="flex flex-col sm:flex-row gap-5 items-start">
      <StateGrid state={st.state} prev={i > 0 ? trace[i - 1].state : undefined} />
      <div className="flex-1 min-w-0">
        <div className="hud text-xs text-mist">Round {st.round} · step {i + 1}/{trace.length}</div>
        <div className="hud text-lg text-cyan">{st.op}</div>
        <p className="text-sm text-ink mt-1">{st.note}</p>
        <div className="flex gap-2 mt-3">
          <button className="btn btn-sm" disabled={i === 0} onClick={() => setI(i - 1)}><ChevronLeft size={14} /> Back</button>
          <button className="btn btn-sm btn-primary" disabled={i === trace.length - 1} onClick={() => setI(i + 1)}>Next <ChevronRight size={14} /></button>
        </div>
        <p className="text-[11px] text-mist mt-3">FIPS-197 Appendix C.1 vector. Full controls in the AES Lab.</p>
      </div>
    </div>
  )
}

export function SboxTable({ highlight, onPick }: { highlight?: number; onPick?: (b: number) => void }) {
  const hr = highlight !== undefined ? highlight >> 4 : -1
  const hc = highlight !== undefined ? highlight & 15 : -1
  return (
    <div className="overflow-x-auto">
      <table className="font-mono text-[10px] sm:text-[11px] border-collapse" aria-label="AES S-box">
        <thead>
          <tr><th className="p-1 text-mist">S</th>{Array.from({ length: 16 }, (_, c) => <th key={c} className={`p-1 ${c === hc ? 'text-magenta' : 'text-mist'}`}>{c.toString(16)}</th>)}</tr>
        </thead>
        <tbody>
          {Array.from({ length: 16 }, (_, r) => (
            <tr key={r}>
              <th className={`p-1 ${r === hr ? 'text-magenta' : 'text-mist'}`}>{r.toString(16)}</th>
              {Array.from({ length: 16 }, (_, c) => {
                const v = SBOX[r * 16 + c]
                const inLine = r === hr || c === hc
                return (
                  <td key={c} onClick={() => onPick?.(r * 16 + c)} className={`px-1 py-0.5 text-center ${onPick ? 'cursor-pointer hover:text-cyan' : ''} ${inLine ? 'bg-magenta/10 text-bright' : 'text-ink/70'}`}>{hex(v)}</td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-mist mt-2">Row = high hex digit, column = low hex digit of the input byte.</p>
    </div>
  )
}

// ───────────── Frequency chart ─────────────

export function FreqChart({ text, compare = true, highlight }: { text: string; compare?: boolean; highlight?: string }) {
  const f = letterFrequencies(text)
  const max = Math.max(13, ...Object.values(f))
  return (
    <div>
      <div className="flex items-end gap-[3px] h-36" role="img" aria-label="Letter frequency chart comparing this text with English">
        {ALPHABET.split('').map((l) => (
          <div key={l} className="flex-1 flex flex-col items-center justify-end h-full gap-[2px] min-w-0">
            <div className="w-full flex items-end gap-[1px] h-full">
              <motion.div className="flex-1 rounded-t-sm" style={{ background: highlight === l ? '#ff4fd8' : '#22e4ff' }} initial={{ height: 0 }} animate={{ height: `${(f[l] / max) * 100}%` }} transition={{ duration: 0.6 }} title={`${l}: ${f[l].toFixed(1)}%`} />
              {compare && <div className="flex-1 rounded-t-sm bg-amber/40" style={{ height: `${(ENGLISH_FREQ[l] / max) * 100}%` }} title={`English ${l}: ${ENGLISH_FREQ[l]}%`} />}
            </div>
            <span className={`text-[9px] font-mono ${highlight === l ? 'text-magenta' : 'text-mist'}`}>{l}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-4 text-[11px] text-mist mt-2">
        <span><span className="inline-block w-2.5 h-2.5 bg-cyan rounded-sm mr-1" />this text</span>
        {compare && <span><span className="inline-block w-2.5 h-2.5 bg-amber/40 rounded-sm mr-1" />typical English</span>}
      </div>
    </div>
  )
}

// ───────────── Diffie–Hellman paint mixing ─────────────

function colorFor(n: bigint, p: bigint) {
  const h = Number((n * 360n) / p)
  return `hsl(${h} 80% 60%)`
}

export function DhMix({ p, g, a, b, reveal }: { p: number; g: number; a: number; b: number; reveal: boolean }) {
  const P = BigInt(p), G = BigInt(g), A = modPow(G, BigInt(a), P), B = modPow(G, BigInt(b), P)
  const S = modPow(B, BigInt(a), P)
  const Swatch = ({ c, label, sub, secret }: { c: string; label: string; sub: string; secret?: boolean }) => (
    <div className="flex flex-col items-center gap-1 w-20">
      <div className="w-12 h-12 rounded-full border-2 border-white/20 relative" style={{ background: c, boxShadow: `0 0 18px ${c}` }}>
        {secret && <Lock size={12} className="absolute -top-1 -right-1 text-amber" />}
      </div>
      <div className="hud text-[10px] text-bright text-center">{label}</div>
      <div className="font-mono text-[10px] text-mist text-center">{sub}</div>
    </div>
  )
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-center flex-wrap gap-2">
        <Swatch c={colorFor(G, P)} label="Public g" sub={`g=${g}, p=${p}`} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="panel p-3 flex flex-col items-center gap-2" style={{ borderColor: '#ff4fd855' }}>
          <div className="hud text-xs text-magenta">Nyra (Alice)</div>
          <div className="flex items-center gap-1"><Swatch c={`hsl(${a * 47 % 360} 70% 45%)`} label="secret a" sub={`a=${a}`} secret /><ArrowRight size={14} className="text-mist" /><Swatch c={colorFor(A, P)} label="sends A" sub={`gᵃ mod p = ${A}`} /></div>
        </div>
        <div className="panel p-3 flex flex-col items-center gap-2" style={{ borderColor: '#22e4ff55' }}>
          <div className="hud text-xs text-cyan">Kael (Bob)</div>
          <div className="flex items-center gap-1"><Swatch c={`hsl(${b * 47 % 360} 70% 45%)`} label="secret b" sub={`b=${b}`} secret /><ArrowRight size={14} className="text-mist" /><Swatch c={colorFor(B, P)} label="sends B" sub={`gᵇ mod p = ${B}`} /></div>
        </div>
      </div>
      <div className="flex justify-center">
        {reveal ? (
          <Swatch c={colorFor(S, P)} label="shared secret" sub={`Bᵃ = Aᵇ = ${S}`} secret />
        ) : (
          <div className="text-xs text-mist text-center max-w-sm">Each side mixes the other’s public colour with its own secret. The eavesdropper sees only g, A and B.</div>
        )}
      </div>
    </div>
  )
}

// ───────────── Hash avalanche ─────────────

export function HashAvalanche({ a: a0 = 'Guardian', b: b0 = 'Guardiam' }: { a?: string; b?: string }) {
  const [a, setA] = useState(a0)
  const [b, setB] = useState(b0)
  const [ha, setHa] = useState('')
  const [hb, setHb] = useState('')
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => {
    let live = true
    Promise.all([sha256Hex(a), sha256Hex(b)]).then(([x, y]) => { if (live) { setHa(x); setHb(y); setErr(null) } }).catch((e) => setErr(String(e.message ?? e)))
    return () => { live = false }
  }, [a, b])
  const bits = (h: string) => h.split('').flatMap((c) => parseInt(c, 16).toString(2).padStart(4, '0').split('').map(Number))
  const ba = ha ? bits(ha) : []
  const bb = hb ? bits(hb) : []
  const diff = ha && hb ? bitDifference(ha, hb) : 0
  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <label><span className="hud text-xs text-mist">Input A</span><input className="input mt-1" value={a} onChange={(e) => setA(e.target.value)} /></label>
        <label><span className="hud text-xs text-mist">Input B</span><input className="input mt-1" value={b} onChange={(e) => setB(e.target.value)} /></label>
      </div>
      {err ? <div className="text-crimson text-sm">{err}</div> : (
        <>
          <div className="font-mono text-[11px] break-all"><span className="text-mist">SHA-256(A) </span><span className="text-cyan">{ha}</span></div>
          <div className="font-mono text-[11px] break-all"><span className="text-mist">SHA-256(B) </span><span className="text-magenta">{hb}</span></div>
          <div className="grid gap-[2px]" style={{ gridTemplateColumns: 'repeat(32, minmax(0, 1fr))' }} role="img" aria-label={`${diff} of 256 bits differ`}>
            {ba.map((bit, i) => <div key={i} className="aspect-square rounded-[2px]" style={{ background: bit !== bb[i] ? '#ff4fd8' : bit ? '#1f3a52' : '#0d1626' }} />)}
          </div>
          <div className="text-sm"><span className="text-magenta font-semibold">{diff}</span><span className="text-mist"> of 256 bits differ ({((diff / 256) * 100).toFixed(1)}%). Computed with your browser’s Web Crypto API.</span></div>
        </>
      )}
    </div>
  )
}

// ───────────── RSA mini ─────────────

export function RsaMini({ p, q, e, m, reveal }: { p: number; q: number; e: number; m?: number; reveal: boolean }) {
  const P = BigInt(p), Q = BigInt(q), E = BigInt(e)
  const n = P * Q, phi = (P - 1n) * (Q - 1n)
  const valid = gcd(E, phi) === 1n
  const d = valid ? modInverse(E, phi) : null
  return (
    <div className="grid sm:grid-cols-2 gap-3 font-mono text-sm">
      <div className="panel p-3">
        <div className="hud text-xs text-azure mb-1">Public key</div>
        <div>n = {p} × {q} = <span className="text-bright">{n.toString()}</span></div>
        <div>e = <span className="text-bright">{e}</span></div>
      </div>
      <div className="panel p-3">
        <div className="hud text-xs text-amber mb-1 flex items-center gap-1"><Lock size={12} /> Private</div>
        <div>φ = ({p}−1)({q}−1) = {reveal ? <span className="text-bright">{phi.toString()}</span> : '?'}</div>
        <div>d = e⁻¹ mod φ = {reveal && d !== null ? <span className="text-bright">{d.toString()}</span> : '?'}</div>
      </div>
      {reveal && m !== undefined && d !== null && (
        <div className="panel p-3 sm:col-span-2 flex flex-wrap items-center gap-2">
          <span>m = {m}</span><ArrowRight size={14} /><Lock size={14} className="text-azure" /><span>c = mᵉ mod n = {modPow(BigInt(m), E, n).toString()}</span><ArrowRight size={14} /><Unlock size={14} className="text-amber" /><span>cᵈ mod n = {modPow(modPow(BigInt(m), E, n), d, n).toString()}</span>
        </div>
      )}
      <div className="sm:col-span-2 text-[11px] text-mist font-sans">Toy numbers for learning only. Real RSA uses 2048+ bit n and OAEP/PSS padding.</div>
    </div>
  )
}

// ───────────── Pipeline (plaintext → ciphertext → plaintext) ─────────────

export function Pipeline() {
  const [text, setText] = useState('MEET AT DAWN')
  const [key, setKey] = useState(3)
  const c = caesarEncrypt(text, key)
  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-end">
        <label><span className="hud text-xs text-mist">Plaintext</span><input className="input mt-1" value={text} onChange={(e) => setText(e.target.value.slice(0, 40))} /></label>
        <label className="w-full sm:w-40"><span className="hud text-xs text-mist">Key (shift) = {key}</span><input type="range" min={0} max={25} value={key} onChange={(e) => setKey(+e.target.value)} className="range mt-3" /></label>
      </div>
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 font-mono text-sm">
        <div className="panel p-3 flex-1 min-w-0"><div className="hud text-[10px] text-mist">plaintext</div><div className="text-bright break-words">{text || '—'}</div></div>
        <div className="flex md:flex-col items-center justify-center gap-1 text-amber px-2"><Lock size={16} /><span className="hud text-[10px]">encrypt k={key}</span></div>
        <div className="panel p-3 flex-1 min-w-0" style={{ borderColor: '#ff4fd855' }}><div className="hud text-[10px] text-magenta">ciphertext</div><div className="text-magenta break-words">{c || '—'}</div></div>
        <div className="flex md:flex-col items-center justify-center gap-1 text-cyan px-2"><Unlock size={16} /><span className="hud text-[10px]">decrypt k={key}</span></div>
        <div className="panel p-3 flex-1 min-w-0"><div className="hud text-[10px] text-mist">plaintext</div><div className="text-bright break-words">{caesarDecrypt(c, key) || '—'}</div></div>
      </div>
    </div>
  )
}

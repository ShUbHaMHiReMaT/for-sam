import { useEffect, useMemo, useRef, useState } from 'react'
import { KeyRound, RefreshCw, ShieldCheck, ShieldX, Zap } from 'lucide-react'
import { cbcEncrypt, ctrXor, ecbEncrypt, toHex, utf8Bytes, bytesToUtf8 } from '../crypto/aes'
import { gcmDecrypt, gcmEncrypt, gcmGenerateKey, randomBytes } from '../crypto/webcrypto'
import { Button } from '../components/ui'
import { ErrorNote, Field, LabSection, Note, useLabTracker } from './common'

const W = 64, H = 64

/** A synthetic emblem (the Guardian key) — original artwork generated procedurally. */
function emblem(): number[] {
  const px: number[] = []
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dx = x - 22, dy = y - 24
    const ring = Math.abs(Math.hypot(dx, dy) - 12) < 4
    const shaft = x > 30 && x < 56 && y > 21 && y < 28
    const tooth = (x > 44 && x < 49 && y >= 28 && y < 38) || (x > 51 && x < 56 && y >= 28 && y < 35)
    const frame = x < 3 || y < 3 || x > W - 4 || y > H - 4
    const band = y > 46 && y < 54 && x > 8 && x < 56
    px.push(ring || shaft || tooth ? 200 : frame ? 120 : band ? 60 : 16)
  }
  return px
}

function draw(canvas: HTMLCanvasElement | null, bytes: number[], tint: [number, number, number]) {
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const img = ctx.createImageData(W, H)
  for (let i = 0; i < W * H; i++) {
    const v = bytes[i]
    img.data[i * 4] = (v * tint[0]) >> 8
    img.data[i * 4 + 1] = (v * tint[1]) >> 8
    img.data[i * 4 + 2] = (v * tint[2]) >> 8
    img.data[i * 4 + 3] = 255
  }
  ctx.putImageData(img, 0, 0)
}

function Pic({ bytes, label, tint, sub }: { bytes: number[]; label: string; tint: [number, number, number]; sub: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => draw(ref.current, bytes, tint), [bytes, tint])
  return (
    <figure className="flex flex-col items-center gap-2">
      <canvas ref={ref} width={W} height={H} className="w-36 h-36 sm:w-44 sm:h-44 rounded-lg border border-white/10" style={{ imageRendering: 'pixelated' }} aria-label={label} role="img" />
      <figcaption className="text-center"><div className="hud text-xs text-bright">{label}</div><div className="text-[11px] text-mist max-w-44">{sub}</div></figcaption>
    </figure>
  )
}

export default function ModesLab() {
  const track = useLabTracker('modes')
  const [key, setKey] = useState(() => randomBytes(16))
  const plain = useMemo(emblem, [])
  const ecb = useMemo(() => ecbEncrypt(plain, key), [plain, key])
  const cbc = useMemo(() => cbcEncrypt(plain, key, randomBytes(16)), [plain, key])

  // CTR nonce reuse
  const [p1, setP1] = useState('ATTACK THE NORTH GATE AT DAWN')
  const [p2, setP2] = useState('THE KEY IS HIDDEN UNDER STONE')
  const [ctrKey] = useState(() => randomBytes(16))
  const [nonce] = useState(() => randomBytes(12))
  const b1 = utf8Bytes(p1), b2 = utf8Bytes(p2)
  const len = Math.min(b1.length, b2.length)
  const c1 = ctrXor(b1, ctrKey, nonce), c2 = ctrXor(b2, ctrKey, nonce)
  const x = c1.slice(0, len).map((b, i) => b ^ c2[i])
  const recovered = x.map((b, i) => b ^ b1[i])

  // GCM
  const [gKey, setGKey] = useState<CryptoKey | null>(null)
  const [msg, setMsg] = useState('Open the Citadel bridge at moonrise.')
  const [aad, setAad] = useState('from: Aster · to: Vael')
  const [sealed, setSealed] = useState<{ iv: Uint8Array; ct: Uint8Array } | null>(null)
  const [tampered, setTampered] = useState(false)
  const [verdict, setVerdict] = useState<{ ok: boolean; text: string } | null>(null)
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => { gcmGenerateKey().then(setGKey).catch((e) => setErr(String(e.message ?? e))) }, [])

  const seal = async () => {
    if (!gKey) return
    track()
    try {
      const r = await gcmEncrypt(gKey, msg, aad)
      setSealed({ iv: r.iv, ct: r.ciphertext })
      setTampered(false)
      setVerdict(null)
      setErr(null)
    } catch (e) { setErr(String((e as Error).message)) }
  }
  const tamper = () => {
    if (!sealed) return
    const ct = sealed.ct.slice()
    ct[Math.floor(Math.random() * Math.max(1, ct.length - 16))] ^= 0x01
    setSealed({ ...sealed, ct })
    setTampered(true)
    setVerdict(null)
    track()
  }
  const open = async (aadOverride?: string) => {
    if (!gKey || !sealed) return
    try {
      const pt = await gcmDecrypt(gKey, sealed.iv, sealed.ct, aadOverride ?? aad)
      setVerdict({ ok: true, text: `Tag verified. Plaintext: “${pt}”` })
    } catch {
      setVerdict({ ok: false, text: 'Authentication FAILED — the tag does not match. The browser refuses to release any plaintext.' })
    }
    track()
  }

  return (
    <div className="space-y-5">
      <LabSection kicker="ECB vs CBC" title="Why a mode matters: the leaking emblem">
        <p className="text-sm text-mist mb-4">A 64×64 synthetic image (4,096 bytes = 256 AES blocks) encrypted with the same AES-128 key. Each byte of ciphertext is drawn as one pixel.</p>
        <div className="flex flex-wrap justify-center gap-6">
          <Pic bytes={plain} label="Plaintext" tint={[255, 220, 140]} sub="The Guardian key emblem" />
          <Pic bytes={ecb} label="AES-ECB" tint={[255, 120, 200]} sub="Equal blocks → equal ciphertext. The shape leaks." />
          <Pic bytes={cbc} label="AES-CBC (random IV)" tint={[120, 230, 255]} sub="Chaining hides repeats — but still no integrity." />
        </div>
        <div className="flex justify-center mt-4"><Button size="sm" onClick={() => { setKey(randomBytes(16)); track() }}><RefreshCw size={14} /> New random key</Button></div>
        <Note>AES itself did nothing wrong here — ECB simply encrypts each 16-byte block independently, so structure survives. Never use ECB for data.</Note>
      </LabSection>

      <LabSection kicker="CTR" title="Nonce reuse: the keystream cancels" accent="var(--color-crimson)">
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Message 1 (attacker later learns this one)"><input className="input" value={p1} onChange={(e) => { setP1(e.target.value); track() }} /></Field>
          <Field label="Message 2 (secret)"><input className="input" value={p2} onChange={(e) => { setP2(e.target.value); track() }} /></Field>
        </div>
        <div className="mt-4 space-y-1 font-mono text-[11px] break-all">
          <div><span className="text-mist">nonce (reused!) </span><span className="text-amber">{toHex(nonce)}</span></div>
          <div><span className="text-mist">C₁ </span><span className="text-ink">{toHex(c1)}</span></div>
          <div><span className="text-mist">C₂ </span><span className="text-ink">{toHex(c2)}</span></div>
          <div><span className="text-mist">C₁ ⊕ C₂ = P₁ ⊕ P₂ </span><span className="text-crimson">{toHex(x)}</span></div>
        </div>
        <div className="mt-4 rounded-xl border border-crimson/40 bg-crimson/10 p-3">
          <div className="hud text-[11px] text-crimson flex items-center gap-1"><Zap size={12} /> Attacker computes (C₁ ⊕ C₂) ⊕ P₁</div>
          <div className="font-mono text-bright mt-1 break-words">{bytesToUtf8(recovered)}</div>
          <p className="text-xs text-mist mt-1">That’s message 2 — recovered without the AES key. Knowing (or guessing) one plaintext exposes every other message sharing its nonce.</p>
        </div>
      </LabSection>

      <LabSection kicker="GCM · real Web Crypto" title="Authenticated encryption: tamper and get caught" accent="var(--color-jade)">
        <ErrorNote text={err} />
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Message (confidential)"><input className="input" value={msg} onChange={(e) => setMsg(e.target.value)} /></Field>
          <Field label="Associated data (authenticated, not encrypted)" hint="e.g. headers that must be readable but untouched"><input className="input" value={aad} onChange={(e) => setAad(e.target.value)} /></Field>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          <Button variant="primary" accent="var(--color-jade)" onClick={seal} disabled={!gKey}><KeyRound size={14} /> Encrypt with AES-256-GCM</Button>
          <Button onClick={tamper} disabled={!sealed} accent="var(--color-crimson)">Flip one ciphertext bit</Button>
          <Button onClick={() => open()} disabled={!sealed}>Decrypt & verify</Button>
          <Button onClick={() => open(aad + ' (edited)')} disabled={!sealed}>Decrypt with altered header</Button>
        </div>
        {sealed && (
          <div className="mt-4 space-y-1 font-mono text-[11px] break-all">
            <div><span className="text-mist">IV/nonce (12 bytes, fresh random) </span><span className="text-amber">{toHex(sealed.iv)}</span></div>
            <div><span className="text-mist">ciphertext </span><span className={tampered ? 'text-crimson' : 'text-ink'}>{toHex(sealed.ct.slice(0, -16))}</span></div>
            <div><span className="text-mist">auth tag (16 bytes) </span><span className="text-jade">{toHex(sealed.ct.slice(-16))}</span></div>
          </div>
        )}
        {verdict && (
          <div className={`mt-4 rounded-xl p-3 border flex gap-2 items-start ${verdict.ok ? 'border-jade/50 bg-jade/10 text-jade' : 'border-crimson/50 bg-crimson/10 text-crimson'}`} role="status">
            {verdict.ok ? <ShieldCheck size={18} /> : <ShieldX size={18} />}<span className="text-sm">{verdict.text}</span>
          </div>
        )}
        <Note tone="warn">The key lives only in this tab as a non-extractable CryptoKey generated by your browser; nothing is sent anywhere. In GCM a nonce must never repeat under the same key — reuse leaks plaintext relations (as above) and allows tag forgery.</Note>
      </LabSection>

      <LabSection kicker="Summary" title="Choosing a mode" accent="var(--color-mist)">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-mist hud text-[11px]"><th className="text-left py-1 pr-3">Mode</th><th className="text-left pr-3">IV / nonce</th><th className="text-left pr-3">Padding</th><th className="text-left pr-3">Integrity</th><th className="text-left">Verdict</th></tr></thead>
            <tbody className="text-ink">
              <tr className="border-t border-white/5"><td className="py-1.5 pr-3 font-mono">ECB</td><td className="pr-3">none</td><td className="pr-3">yes</td><td className="pr-3">no</td><td className="text-crimson">Avoid — leaks patterns</td></tr>
              <tr className="border-t border-white/5"><td className="py-1.5 pr-3 font-mono">CBC</td><td className="pr-3">random, unpredictable</td><td className="pr-3">yes (e.g. PKCS#7)</td><td className="pr-3">no — add a MAC</td><td className="text-amber">Legacy; padding-oracle risks</td></tr>
              <tr className="border-t border-white/5"><td className="py-1.5 pr-3 font-mono">CTR</td><td className="pr-3">unique, never reused</td><td className="pr-3">no</td><td className="pr-3">no — add a MAC</td><td className="text-amber">OK as a building block</td></tr>
              <tr className="border-t border-white/5"><td className="py-1.5 pr-3 font-mono">GCM</td><td className="pr-3">unique 96-bit nonce</td><td className="pr-3">no</td><td className="pr-3">yes (tag)</td><td className="text-jade">Recommended AEAD</td></tr>
            </tbody>
          </table>
        </div>
      </LabSection>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Check, X } from 'lucide-react'
import { hmacSha256Hex } from '../crypto/webcrypto'
import { HashAvalanche } from '../components/widgets'
import { ErrorNote, Field, LabSection, Note, useLabTracker } from './common'

const ROWS = [
  { name: 'Encoding (Base64, hex)', key: 'none', reversible: 'yes, by anyone', gives: 'format conversion only', ex: 'Base64' },
  { name: 'Encryption', key: 'secret key', reversible: 'yes, with the key', gives: 'confidentiality', ex: 'AES-GCM, ChaCha20' },
  { name: 'Cryptographic hash', key: 'none', reversible: 'no (one-way by design)', gives: 'fingerprint / integrity vs. accidents', ex: 'SHA-256, SHA-3' },
  { name: 'HMAC', key: 'shared secret key', reversible: 'no', gives: 'integrity + authenticity between key holders', ex: 'HMAC-SHA256' },
  { name: 'Digital signature', key: 'private key (verify with public)', reversible: 'no', gives: 'integrity + publicly verifiable origin', ex: 'Ed25519, ECDSA, ML-DSA' },
  { name: 'Password hash / KDF', key: 'salt (not secret)', reversible: 'no; deliberately slow', gives: 'safe password storage', ex: 'Argon2id, scrypt, bcrypt' },
]

export default function HashLab() {
  const track = useLabTracker('hash')
  const [key, setKey] = useState('storm-tower-shared-key')
  const [msg, setMsg] = useState('WEATHER: clear skies over the Citadel')
  const [tag, setTag] = useState('')
  const [received, setReceived] = useState('WEATHER: clear skies over the Citadel')
  const [recvTag, setRecvTag] = useState('')
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    hmacSha256Hex(key, msg).then((t) => live && setTag(t)).catch((e) => setErr(String(e.message ?? e)))
    return () => { live = false }
  }, [key, msg])
  useEffect(() => {
    let live = true
    hmacSha256Hex(key, received).then((t) => live && setRecvTag(t)).catch(() => {})
    return () => { live = false }
  }, [key, received])

  const ok = tag && recvTag && tag === recvTag

  return (
    <div className="space-y-5">
      <LabSection kicker="SHA-256 · Web Crypto" title="The avalanche effect">
        <div onInput={track}><HashAvalanche /></div>
        <Note>A good hash looks random: change one character and about half of the 256 output bits flip, unpredictably. A digest is a fixed-size fingerprint — collisions must exist (infinitely many inputs, 2²⁵⁶ outputs), but for SHA-256 nobody knows how to find one.</Note>
      </LabSection>

      <LabSection kicker="HMAC-SHA256 · Web Crypto" title="A seal only key-holders can make" accent="var(--color-jade)">
        <ErrorNote text={err} />
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="hud text-xs text-jade">Sender</div>
            <Field label="Shared secret key"><input className="input" value={key} onChange={(e) => { setKey(e.target.value); track() }} /></Field>
            <Field label="Message"><input className="input" value={msg} onChange={(e) => { setMsg(e.target.value); setReceived(e.target.value); track() }} /></Field>
            <div className="font-mono text-[11px] break-all"><span className="text-mist">tag = </span><span className="text-jade">{tag}</span></div>
          </div>
          <div className="space-y-3">
            <div className="hud text-xs text-crimson">In transit — try tampering</div>
            <Field label="Message as received"><input className="input" value={received} onChange={(e) => { setReceived(e.target.value); track() }} /></Field>
            <div className="font-mono text-[11px] break-all"><span className="text-mist">receiver recomputes = </span><span className={ok ? 'text-jade' : 'text-crimson'}>{recvTag}</span></div>
            <div className={`flex items-center gap-2 text-sm ${ok ? 'text-jade' : 'text-crimson'}`} role="status">{ok ? <Check size={16} /> : <X size={16} />} {ok ? 'Tags match: message is authentic and unmodified.' : 'Tags differ: reject the message.'}</div>
          </div>
        </div>
        <Note tone="warn">HMAC provides no confidentiality — the message travels in the clear. And because both sides share the key, a tag cannot prove to a third party WHICH of them wrote it; that needs a digital signature. Compare tags in constant time in real code.</Note>
      </LabSection>

      <LabSection kicker="Don’t confuse them" title="Encoding · encryption · hashing · MAC · signature" accent="var(--color-amber)">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead><tr className="text-mist hud text-[11px]"><th className="text-left py-1 pr-3">Tool</th><th className="text-left pr-3">Key</th><th className="text-left pr-3">Reversible?</th><th className="text-left pr-3">Provides</th><th className="text-left">Examples</th></tr></thead>
            <tbody className="text-ink">{ROWS.map((r) => <tr key={r.name} className="border-t border-white/5"><td className="py-1.5 pr-3 text-bright">{r.name}</td><td className="pr-3">{r.key}</td><td className="pr-3">{r.reversible}</td><td className="pr-3">{r.gives}</td><td className="font-mono text-xs">{r.ex}</td></tr>)}</tbody>
          </table>
        </div>
      </LabSection>

      <LabSection kicker="Quantum horizon" title="Where post-quantum fits" accent="var(--color-orchid)">
        <ul className="text-sm text-ink space-y-2 list-disc pl-5">
          <li><b>Hashes and AES</b>: Grover’s algorithm gives at most a quadratic speed-up — SHA-256 and AES-256 keep comfortable margins.</li>
          <li><b>RSA, DH, ECC</b>: Shor’s algorithm on a large fault-tolerant quantum computer would break them. No such machine exists today, but recorded traffic could be decrypted later.</li>
          <li><b>Replacements</b>: ML-KEM (FIPS 203) for key establishment; ML-DSA (FIPS 204) and SLH-DSA (FIPS 205) for signatures. Many systems deploy hybrids such as X25519 + ML-KEM.</li>
        </ul>
      </LabSection>
    </div>
  )
}

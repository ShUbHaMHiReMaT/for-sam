import { useMemo, useState } from 'react'
import { Lock, Unlock, PenLine, Search, TriangleAlert } from 'lucide-react'
import { TOY_PRIMES, egcd, factorToy, gcd, lettersToNumber, modInverse, modPowSteps, numberToLetters, rsaKeygen, rsaSignToy, rsaVerifyToy, suggestE } from '../crypto/publickey'
import { Button } from '../components/ui'
import { ErrorNote, Field, LabSection, Note, Toggle, useLabTracker } from './common'

export default function RsaLab() {
  const track = useLabTracker('rsa')
  const [p, setP] = useState(61)
  const [q, setQ] = useState(53)
  const phiNow = BigInt((p - 1) * (q - 1))
  const [eStr, setEStr] = useState('17')
  const [msgMode, setMsgMode] = useState<'num' | 'text'>('num')
  const [mStr, setMStr] = useState('65')
  const [mText, setMText] = useState('HI')
  const [sigMsg, setSigMsg] = useState('123')
  const [attack, setAttack] = useState<ReturnType<typeof factorToy> | null>(null)

  const keys = useMemo(() => {
    try {
      const e = BigInt(eStr || '0')
      return { k: rsaKeygen(BigInt(p), BigInt(q), e), err: null as string | null }
    } catch (err) { return { k: null, err: (err as Error).message } }
  }, [p, q, eStr])
  const k = keys.k

  const m = useMemo(() => {
    try {
      const v = msgMode === 'num' ? BigInt(mStr || '0') : lettersToNumber(mText)
      if (k && v >= k.n) return { v: null, err: `m must be smaller than n = ${k.n}. ${msgMode === 'text' ? 'Use fewer letters or larger primes.' : ''}` }
      if (v < 0n) return { v: null, err: 'm must be non-negative.' }
      return { v, err: null as string | null }
    } catch (e) { return { v: null, err: (e as Error).message.includes('BigInt') ? 'Enter a whole number.' : (e as Error).message } }
  }, [mStr, mText, msgMode, k])

  const enc = k && m.v !== null ? modPowSteps(m.v, k.e, k.n) : null
  const dec = k && enc ? modPowSteps(enc.value, k.d, k.n) : null
  const eg = useMemo(() => (k ? egcd(k.e, k.phi) : null), [k])
  const sig = useMemo(() => {
    if (!k) return null
    try {
      const v = BigInt(sigMsg || '0')
      if (v >= k.n) return null
      const s = rsaSignToy(v, k)
      return { v, s, ok: rsaVerifyToy(v, s, k), tamperedOk: rsaVerifyToy((v + 1n) % k.n, s, k) }
    } catch { return null }
  }, [sigMsg, k])

  return (
    <div className="space-y-5">
      <Note tone="warn"><TriangleAlert size={14} className="inline mr-1" />Toy parameters only. These moduli are factored instantly. This is textbook RSA (no padding): deterministic and malleable. Real systems use ≥2048-bit moduli with OAEP (encryption) or PSS (signatures), usually to protect a symmetric key.</Note>
      <LabSection kicker="Key generation" title="Build a key pair">
        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="Prime p"><select className="input" value={p} onChange={(e) => { setP(+e.target.value); track() }}>{TOY_PRIMES.map((x) => <option key={x} value={x}>{x}</option>)}</select></Field>
          <Field label="Prime q"><select className="input" value={q} onChange={(e) => { setQ(+e.target.value); track() }}>{TOY_PRIMES.map((x) => <option key={x} value={x}>{x}</option>)}</select></Field>
          <Field label="Public exponent e" hint={`Must be coprime with φ(n). Suggested: ${(() => { try { return suggestE(phiNow).toString() } catch { return '—' } })()}`}>
            <div className="flex gap-2"><input className="input" value={eStr} onChange={(e) => { setEStr(e.target.value.replace(/[^0-9]/g, '')); track() }} /><Button size="sm" onClick={() => setEStr(suggestE(phiNow).toString())}>Suggest</Button></div>
          </Field>
        </div>
        <ErrorNote text={keys.err} />
        {k && (
          <div className="grid md:grid-cols-2 gap-3 mt-4 font-mono text-sm">
            <div className="rounded-xl border border-azure/40 bg-azure/5 p-3">
              <div className="hud text-[11px] text-azure">Public key (share it)</div>
              <div>n = p·q = {p}·{q} = <span className="text-bright">{k.n.toString()}</span></div>
              <div>e = <span className="text-bright">{k.e.toString()}</span></div>
            </div>
            <div className="rounded-xl border border-amber/40 bg-amber/5 p-3">
              <div className="hud text-[11px] text-amber">Private (never share)</div>
              <div>φ(n) = (p−1)(q−1) = <span className="text-bright">{k.phi.toString()}</span></div>
              <div>d = e⁻¹ mod φ = <span className="text-bright">{k.d.toString()}</span></div>
              <div className="text-xs text-mist font-sans mt-1">Check: e·d mod φ = {((k.e * k.d) % k.phi).toString()} ✓ (extended Euclid: {k.e.toString()}·{eg?.[1].toString()} + {k.phi.toString()}·{eg?.[2].toString()} = {eg?.[0].toString()})</div>
            </div>
          </div>
        )}
      </LabSection>

      {k && (
        <LabSection kicker="Encrypt / decrypt" title="Square-and-multiply in action" accent="var(--color-azure)">
          <div className="flex flex-wrap gap-3 items-end">
            <Toggle label="Message format" value={msgMode} onChange={setMsgMode} options={[{ id: 'num', label: 'Number' }, { id: 'text', label: 'Letters (A=01…Z=26)' }]} />
            {msgMode === 'num'
              ? <Field label="Message m"><input className="input !w-40" value={mStr} onChange={(e) => { setMStr(e.target.value.replace(/[^0-9]/g, '')); track() }} /></Field>
              : <Field label="Letters"><input className="input !w-40" value={mText} onChange={(e) => { setMText(e.target.value); track() }} /></Field>}
          </div>
          <ErrorNote text={m.err} />
          {enc && dec && m.v !== null && (
            <>
              <div className="mt-4 flex flex-wrap items-center gap-3 font-mono">
                <span className="chip">m = {m.v.toString()}{msgMode === 'text' ? ` (“${numberToLetters(m.v)}”)` : ''}</span>
                <Lock size={16} className="text-azure" />
                <span className="chip" style={{ ['--accent' as string]: '#5aa8ff' }}>c = mᵉ mod n = {enc.value.toString()}</span>
                <Unlock size={16} className="text-amber" />
                <span className="chip" style={{ ['--accent' as string]: '#ffb547' }}>cᵈ mod n = {dec.value.toString()}{msgMode === 'text' ? ` (“${numberToLetters(dec.value)}”)` : ''}</span>
              </div>
              <div className="grid md:grid-cols-2 gap-4 mt-4">
                {[{ title: `Encrypt: ${m.v}^${k.e} mod ${k.n}`, steps: enc.steps, exp: k.e }, { title: `Decrypt: ${enc.value}^${k.d} mod ${k.n}`, steps: dec.steps, exp: k.d }].map((blk) => (
                  <div key={blk.title} className="rounded-xl bg-black/30 border border-white/10 p-3">
                    <div className="hud text-[11px] text-mist">{blk.title} · exponent in binary {blk.exp.toString(2)}</div>
                    <table className="w-full text-xs font-mono mt-2">
                      <thead><tr className="text-mist"><th className="text-left">bit</th><th className="text-left">square</th><th className="text-left">× base?</th><th className="text-left">result</th></tr></thead>
                      <tbody>{blk.steps.map((s, i) => <tr key={i} className="border-t border-white/5"><td>{s.bit}</td><td>{s.squared.toString()}</td><td>{s.bit ? 'yes' : '—'}</td><td className="text-bright">{s.result.toString()}</td></tr>)}</tbody>
                    </table>
                  </div>
                ))}
              </div>
              <p className="text-xs text-mist mt-3">Each bit costs one squaring (and a multiplication if the bit is 1), always reduced mod n — so even 2048-bit exponents take only ~2048 steps.</p>
            </>
          )}
        </LabSection>
      )}

      {k && (
        <div className="grid lg:grid-cols-2 gap-5">
          <LabSection kicker="Signatures (toy)" title="Sign with d, verify with e" accent="var(--color-orchid)">
            <Field label="Message number to sign"><input className="input" value={sigMsg} onChange={(e) => { setSigMsg(e.target.value.replace(/[^0-9]/g, '')); track() }} /></Field>
            {sig ? (
              <div className="mt-3 text-sm space-y-1 font-mono">
                <div><PenLine size={14} className="inline text-orchid" /> s = mᵈ mod n = <span className="text-bright">{sig.s.toString()}</span></div>
                <div className={sig.ok ? 'text-jade' : 'text-crimson'}>verify sᵉ mod n == m → {String(sig.ok)}</div>
                <div className={sig.tamperedOk ? 'text-crimson' : 'text-jade'}>verify for m+1 → {String(sig.tamperedOk)} (changed message rejected)</div>
              </div>
            ) : <div className="text-sm text-mist mt-2">Enter a number smaller than n.</div>}
            <Note>Real signatures hash the message first and use padding such as PSS (or use ECDSA, Ed25519, ML-DSA). A signature proves origin and integrity; it does not hide the message.</Note>
          </LabSection>
          <LabSection kicker="Attack" title="Why toy keys fall" accent="var(--color-crimson)">
            <p className="text-sm text-mist">Anyone can see n. Factor it and the private key follows.</p>
            <Button className="mt-3" accent="var(--color-crimson)" onClick={() => { setAttack(factorToy(k.n)); track() }}><Search size={14} /> Factor n = {k.n.toString()}</Button>
            {attack && (
              <div className="mt-3 text-sm font-mono space-y-1">
                <div>n = <span className="text-bright">{attack.p.toString()} × {attack.q.toString()}</span> (found in {attack.tries} trial divisions)</div>
                <div>φ = {((attack.p - 1n) * (attack.q - 1n)).toString()} → d = <span className="text-crimson">{gcd(k.e, (attack.p - 1n) * (attack.q - 1n)) === 1n ? modInverse(k.e, (attack.p - 1n) * (attack.q - 1n)).toString() : '—'}</span></div>
                <p className="font-sans text-mist text-xs pt-1">A 2048-bit modulus has ~617 decimal digits; no known classical algorithm factors it in any practical time. Shor’s algorithm on a large fault-tolerant quantum computer would — which is why post-quantum schemes exist.</p>
              </div>
            )}
            <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-3 text-sm">
              <div className="hud text-[11px] text-amber">Determinism leak</div>
              <p className="text-mist mt-1">Encrypting “YES”-as-a-number twice gives the same ciphertext both times. An eavesdropper can encrypt guesses with the public key and compare. Randomised padding (OAEP) fixes this.</p>
            </div>
          </LabSection>
        </div>
      )}
    </div>
  )
}

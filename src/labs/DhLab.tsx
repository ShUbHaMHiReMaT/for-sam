import { useMemo, useState } from 'react'
import { Search, UserX } from 'lucide-react'
import { TOY_PRIMES, dhExchange, dhMitm, discreteLogToy } from '../crypto/publickey'
import { DhMix } from '../components/widgets'
import { Button } from '../components/ui'
import { ErrorNote, Field, LabSection, Note, useLabTracker } from './common'

export default function DhLab() {
  const track = useLabTracker('dh')
  const [p, setP] = useState(23)
  const [g, setG] = useState(5)
  const [a, setA] = useState(6)
  const [b, setB] = useState(15)
  const [m, setM] = useState(13)
  const [mitm, setMitm] = useState(false)
  const [dlog, setDlog] = useState<ReturnType<typeof discreteLogToy> | null>(null)

  const ex = useMemo(() => {
    try { return { r: dhExchange(BigInt(p), BigInt(g), BigInt(a), BigInt(b)), err: null as string | null } } catch (e) { return { r: null, err: (e as Error).message } }
  }, [p, g, a, b])
  const mm = useMemo(() => (ex.r ? dhMitm(BigInt(p), BigInt(g), BigInt(a), BigInt(b), BigInt(Math.min(m, p - 2))) : null), [ex.r, p, g, a, b, m])

  return (
    <div className="space-y-5">
      <LabSection kicker="Key agreement" title="Diffie–Hellman with toy numbers" accent="var(--color-magenta)">
        <div className="grid sm:grid-cols-4 gap-3">
          <Field label="Prime p"><select className="input" value={p} onChange={(e) => { const v = +e.target.value; setP(v); setA(Math.min(a, v - 2)); setB(Math.min(b, v - 2)); setG(Math.min(g, v - 2)); track() }}>{[23, ...TOY_PRIMES.filter((x) => x > 23 && x < 200)].map((x) => <option key={x} value={x}>{x}</option>)}</select></Field>
          <Field label="Generator g"><input type="number" className="input" value={g} min={2} max={p - 2} onChange={(e) => { setG(+e.target.value); track() }} /></Field>
          <Field label={`Nyra’s secret a = ${a}`}><input type="range" className="range" min={2} max={p - 2} value={a} onChange={(e) => { setA(+e.target.value); track() }} /></Field>
          <Field label={`Kael’s secret b = ${b}`}><input type="range" className="range" min={2} max={p - 2} value={b} onChange={(e) => { setB(+e.target.value); track() }} /></Field>
        </div>
        <ErrorNote text={ex.err} />
        {ex.r && (
          <>
            <div className="mt-5"><DhMix p={p} g={g} a={a} b={b} reveal /></div>
            <div className="mt-4 font-mono text-sm grid sm:grid-cols-2 gap-2">
              <div>Nyra computes Bᵃ mod p = {ex.r.B.toString()}^{a} mod {p} = <span className="text-jade">{ex.r.sharedAlice.toString()}</span></div>
              <div>Kael computes Aᵇ mod p = {ex.r.A.toString()}^{b} mod {p} = <span className="text-jade">{ex.r.sharedBob.toString()}</span></div>
            </div>
            <Note>Same secret on both sides, and it never crossed the wire. In practice the shared value is fed into a key-derivation function to produce AES keys. Note: for real security, g must generate a large prime-order subgroup and p must be 2048+ bits — or use elliptic curves like X25519.</Note>
          </>
        )}
      </LabSection>

      {ex.r && mm && (
        <div className="grid lg:grid-cols-2 gap-5">
          <LabSection kicker="Attack" title="The man in the middle" accent="var(--color-crimson)">
            <div className="flex items-center gap-3">
              <Button accent="var(--color-crimson)" variant={mitm ? 'primary' : 'default'} onClick={() => { setMitm(!mitm); track() }}><UserX size={14} /> {mitm ? 'Mallory is intercepting' : 'Let Mallory intercept'}</Button>
              {mitm && <Field label={`Mallory’s secret = ${Math.min(m, p - 2)}`}><input type="range" className="range" min={2} max={p - 2} value={Math.min(m, p - 2)} onChange={(e) => setM(+e.target.value)} /></Field>}
            </div>
            {mitm ? (
              <div className="mt-4 text-sm space-y-2 font-mono">
                <div>Nyra sends A = {mm.A.toString()} → Mallory replaces it with M = {mm.M.toString()}</div>
                <div>Kael sends B = {mm.B.toString()} → Mallory replaces it with M = {mm.M.toString()}</div>
                <div className="text-crimson">Nyra’s “shared” key: {mm.aliceKey.toString()} (really shared with Mallory: {mm.malloryWithAlice.toString()})</div>
                <div className="text-crimson">Kael’s “shared” key: {mm.bobKey.toString()} (really shared with Mallory: {mm.malloryWithBob.toString()})</div>
                <p className="font-sans text-mist">Mallory decrypts everything from one side and re-encrypts it for the other. Neither victim can tell — plain DH authenticates no one.</p>
              </div>
            ) : <p className="text-sm text-mist mt-3">Toggle Mallory to see why unauthenticated key exchange fails.</p>}
            <Note>Fix: authenticate the public values — sign them with long-term keys whose public halves you verify (certificates). TLS 1.3 does exactly this with ECDHE + signatures.</Note>
          </LabSection>
          <LabSection kicker="Hardness" title="The discrete logarithm" accent="var(--color-amber)">
            <p className="text-sm text-mist">An eavesdropper sees g, p and A = {ex.r.A.toString()}. Can they find a?</p>
            <Button className="mt-3" onClick={() => { setDlog(discreteLogToy(BigInt(g), ex.r!.A, BigInt(p))); track() }}><Search size={14} /> Brute-force a</Button>
            {dlog && <div className="mt-3 text-sm font-mono">Found x = <span className="text-amber">{dlog.x.toString()}</span> after {dlog.tries} tries (any x with gˣ ≡ A works).</div>}
            <p className="text-sm text-mist mt-3">With p ≈ 2²⁰⁴⁸ (or a 256-bit elliptic curve), the best known classical algorithms are still infeasible. Elliptic curves give similar security with much smaller keys (≈256-bit EC ≈ 3072-bit finite-field), per NIST SP 800-57.</p>
          </LabSection>
        </div>
      )}
    </div>
  )
}

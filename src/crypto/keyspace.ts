/**
 * Brute-force cost estimation. All numbers are order-of-magnitude teaching
 * estimates — real attack cost depends on hardware, parallelism and, above all,
 * on whether an attack better than brute force exists.
 */

export interface KeyspaceEntry { id: string; label: string; log2: number; note: string }

export const KEYSPACES: KeyspaceEntry[] = [
  { id: 'caesar', label: 'Caesar cipher', log2: Math.log2(25), note: '25 useful shifts — checkable by hand in minutes.' },
  { id: 'pin4', label: '4-digit PIN', log2: Math.log2(10_000), note: 'Why lockouts and rate limits matter.' },
  { id: 'pw8', label: '8 random lowercase letters', log2: 8 * Math.log2(26), note: 'Human-chosen passwords are far weaker than random ones.' },
  { id: 'subst', label: 'Monoalphabetic substitution', log2: Math.log2(4.0329146e26), note: '26! ≈ 2⁸⁸ keys — yet frequency analysis breaks it in minutes. Huge keyspace ≠ security.' },
  { id: 'des', label: 'DES (56-bit key)', log2: 56, note: 'Publicly brute-forced in 1998–99; withdrawn as a standard.' },
  { id: 'aes128', label: 'AES-128', log2: 128, note: 'No practical attack known; brute force is far beyond any foreseeable computer.' },
  { id: 'aes256', label: 'AES-256', log2: 256, note: 'Recommended where long-term or post-quantum margin is wanted.' },
]

const SECONDS_PER_YEAR = 31_557_600
export const AGE_OF_UNIVERSE_YEARS = 1.38e10

/** Expected time (on average half the keyspace) in seconds, as log10 to avoid overflow. */
export function log10BruteForceSeconds(log2Keys: number, guessesPerSecond: number): number {
  return (log2Keys - 1) * Math.log10(2) - Math.log10(guessesPerSecond)
}

export function humanDuration(log10Seconds: number): string {
  if (log10Seconds < 0) return 'less than a second'
  const s = 10 ** log10Seconds
  if (s < 60) return `${s.toFixed(1)} seconds`
  if (s < 3600) return `${(s / 60).toFixed(1)} minutes`
  if (s < 86400) return `${(s / 3600).toFixed(1)} hours`
  if (s < SECONDS_PER_YEAR) return `${(s / 86400).toFixed(1)} days`
  const log10Years = log10Seconds - Math.log10(SECONDS_PER_YEAR)
  if (log10Years < 6) return `${Math.round(10 ** log10Years).toLocaleString()} years`
  const ages = log10Years - Math.log10(AGE_OF_UNIVERSE_YEARS)
  if (ages > 0) return `≈10^${log10Years.toFixed(0)} years (${ages >= 1 ? `10^${ages.toFixed(0)} ×` : 'about'} the age of the universe)`
  return `≈10^${log10Years.toFixed(1)} years`
}

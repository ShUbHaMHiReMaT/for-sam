import { motion } from 'framer-motion'
import { useMemo } from 'react'
import { seededRandom } from '../game/progression'
import { Portrait } from './Portrait'

const SYMBOLS = ['∑', 'φ', 'λ', '⊕', 'mod', 'Ω', '∂', 'π', 'Δ', '∞', 'gᵃ', 'eᵈ', '2¹²⁸', 'ψ', '≡']

/** Floating fractured metallic structures and broken data blocks (scene 1). */
export function VoidStructures({ travelling }: { travelling: boolean }) {
  const shards = useMemo(() => {
    const r = seededRandom(7)
    return Array.from({ length: 14 }, (_, i) => ({ i, x: r() * 100, y: r() * 100, s: 30 + r() * 120, rot: r() * 360, d: 0.3 + r() * 0.7 }))
  }, [])
  return (
    <div className="absolute inset-0 overflow-hidden">
      {shards.map((s) => (
        <motion.div
          key={s.i}
          className="absolute"
          style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s * 0.6 }}
          initial={{ opacity: 0, scale: 0.6, rotate: s.rot }}
          animate={travelling ? { opacity: [0, 0.6 * s.d, 0], scale: [0.6, 2.6], rotate: s.rot + 40 } : { opacity: 0.25 * s.d, scale: 0.8, rotate: s.rot + 10 }}
          transition={{ duration: travelling ? 6 + s.d * 3 : 8, ease: 'easeIn', repeat: travelling ? Infinity : 0, delay: s.d * 2 }}
        >
          <svg viewBox="0 0 100 60" className="w-full h-full">
            <polygon points="0,10 30,0 100,8 92,50 40,60 6,48" fill="#0d1322" stroke="#3b5070" strokeWidth="1" />
            <path d="M10 20 H70 M10 30 H50 M10 40 H80" stroke="#22e4ff" strokeOpacity="0.25" strokeDasharray="4 3" />
          </svg>
        </motion.div>
      ))}
    </div>
  )
}

interface CityProps { redSeals: number; cracks: boolean; lightsOut: boolean; push: boolean; reduced: boolean }

/** The golden-age civilisation and its betrayal (scenes 2 & 3). */
export function City({ redSeals, cracks, lightsOut, push, reduced }: CityProps) {
  const data = useMemo(() => {
    const r = seededRandom(1337)
    const far = Array.from({ length: 34 }, (_, i) => ({ x: i * 50 - 20 + r() * 20, w: 26 + r() * 34, h: 160 + r() * 320 }))
    const near = Array.from({ length: 18 }, (_, i) => ({ x: i * 95 - 40 + r() * 30, w: 46 + r() * 50, h: 240 + r() * 360, spire: r() > 0.5 }))
    const wins = near.flatMap((b, bi) => Array.from({ length: 12 }, () => ({ bi, x: b.x + 6 + r() * (b.w - 12), y: 900 - 20 - r() * (b.h - 40) })))
    const discs = [{ x: 300, y: 250, r: 120 }, { x: 1250, y: 200, r: 150 }, { x: 800, y: 130, r: 90 }]
    const seals = [{ x: 300, y: 250, r: 70 }, { x: 800, y: 130, r: 52 }, { x: 1250, y: 200, r: 88 }, { x: 560, y: 420, r: 46 }, { x: 1020, y: 430, r: 56 }, { x: 800, y: 330, r: 150 }]
    const sym = Array.from({ length: 22 }, () => ({ x: r() * 1600, y: 60 + r() * 420, s: SYMBOLS[(r() * SYMBOLS.length) | 0], f: 14 + r() * 22 }))
    return { far, near, wins, discs, seals, sym }
  }, [])
  const sealColor = (i: number) => (i < redSeals ? '#ff1f3d' : i % 2 ? '#22e4ff' : '#ffb547')
  return (
    <motion.svg
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 w-full h-full"
      initial={{ scale: reduced ? 1 : 1.15 }}
      animate={{ scale: reduced ? 1 : push ? 1.9 : 1.02 }}
      transition={{ duration: push ? 6 : 10, ease: 'easeInOut' }}
      style={{ transformOrigin: '50% 37%' }}
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lightsOut ? '#0a0206' : '#0b1430'} />
          <stop offset="60%" stopColor={lightsOut ? '#1a0610' : '#1a1f45'} />
          <stop offset="100%" stopColor={lightsOut ? '#260812' : '#3b2a3a'} />
        </linearGradient>
        <linearGradient id="river" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#22e4ff" stopOpacity="0" />
          <stop offset="50%" stopColor="#22e4ff" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#b77bff" stopOpacity="0" />
        </linearGradient>
        <filter id="blur6"><feGaussianBlur stdDeviation="6" /></filter>
      </defs>
      <rect width="1600" height="900" fill="url(#sky)" style={{ transition: 'all 2s' }} />
      {/* sky symbols */}
      {data.sym.map((s, i) => (
        <text key={i} x={s.x} y={s.y} fontSize={s.f} fill={i < redSeals * 4 ? '#ff1f3d' : '#9fd8ff'} opacity={lightsOut ? 0.15 : 0.35} fontFamily="JetBrains Mono" style={{ transition: 'all 1.5s' }}>{s.s}</text>
      ))}
      {/* suspended cities */}
      {data.discs.map((d, i) => (
        <g key={i} className="anim-float" style={{ animationDelay: `${i * 1.3}s` }}>
          <ellipse cx={d.x} cy={d.y + 40} rx={d.r} ry={d.r * 0.22} fill="#0d1428" stroke={lightsOut ? '#3a1018' : '#ffb547'} strokeOpacity="0.5" />
          {[-0.6, -0.3, 0, 0.3, 0.55].map((o, j) => (
            <rect key={j} x={d.x + o * d.r - 8} y={d.y + 40 - 30 - j * 7} width="16" height={30 + j * 7} fill="#121b33" />
          ))}
          <path d={`M${d.x - d.r * 0.4} ${d.y + 50} L${d.x} ${d.y + 120} L${d.x + d.r * 0.4} ${d.y + 50}`} fill="#0a1020" />
        </g>
      ))}
      {/* light network */}
      {!lightsOut && [[300, 290, 800, 170], [800, 170, 1250, 240], [300, 290, 560, 460], [1250, 240, 1020, 470], [560, 460, 1020, 470], [300, 290, 1250, 240]].map(([x1, y1, x2, y2], i) => (
        <path key={i} d={`M${x1} ${y1} Q${(x1 + x2) / 2} ${Math.min(y1, y2) - 80} ${x2} ${y2}`} stroke={i < redSeals ? '#ff1f3d' : '#ffe29a'} strokeWidth="2" fill="none" strokeDasharray="6 14" opacity="0.8">
          {!reduced && <animate attributeName="stroke-dashoffset" from="200" to="0" dur={`${3 + i * 0.4}s`} repeatCount="indefinite" />}
        </path>
      ))}
      {/* far skyline */}
      {data.far.map((b, i) => <rect key={i} x={b.x} y={900 - b.h} width={b.w} height={b.h} fill="#0b1124" />)}
      {/* holographic river */}
      <path d="M0 800 Q400 760 800 800 T1600 790 L1600 830 Q1200 850 800 830 T0 840 Z" fill="url(#river)" opacity={lightsOut ? 0.1 : 0.55} filter="url(#blur6)" style={{ transition: 'opacity 2s' }} />
      {/* near skyline */}
      {data.near.map((b, i) => (
        <g key={i}>
          <rect x={b.x} y={900 - b.h} width={b.w} height={b.h} fill="#070b18" stroke="#1d2a48" />
          {b.spire && <path d={`M${b.x + b.w / 2 - 6} ${900 - b.h} L${b.x + b.w / 2} ${900 - b.h - 60} L${b.x + b.w / 2 + 6} ${900 - b.h} Z`} fill="#070b18" />}
        </g>
      ))}
      {data.wins.map((w, i) => (
        <rect key={i} x={w.x} y={w.y} width="4" height="6" fill={i % 7 === 0 ? '#22e4ff' : '#ffd88a'} opacity={lightsOut ? 0 : 0.8} style={{ transition: `opacity 0.4s ${(i % 40) * 0.05}s` }} />
      ))}
      {/* cryptographic seals */}
      {data.seals.map((s, i) => (
        <g key={i} style={{ transition: 'all 0.6s' }}>
          <circle cx={s.x} cy={s.y} r={s.r * 1.4} fill={sealColor(i)} opacity={0.12} filter="url(#blur6)" />
          <g style={{ transformOrigin: `${s.x}px ${s.y}px`, animation: reduced ? undefined : `spin-slow ${30 + i * 8}s linear infinite ${i % 2 ? 'reverse' : ''}` }}>
            <circle cx={s.x} cy={s.y} r={s.r} fill="none" stroke={sealColor(i)} strokeWidth="2" strokeDasharray={i === 5 ? '18 6 4 6' : '10 5'} />
            <circle cx={s.x} cy={s.y} r={s.r * 0.72} fill="none" stroke={sealColor(i)} strokeWidth="1.2" opacity="0.7" />
            {Array.from({ length: 8 }, (_, k) => {
              const a = (k / 8) * Math.PI * 2
              return <text key={k} x={s.x + Math.cos(a) * s.r * 0.86} y={s.y + Math.sin(a) * s.r * 0.86 + 4} fontSize={s.r * 0.16} fill={sealColor(i)} textAnchor="middle" fontFamily="JetBrains Mono">{'KEYSΣφλ⊕'[k]}</text>
            })}
            <polygon points={Array.from({ length: 6 }, (_, k) => `${s.x + Math.cos((k / 6) * Math.PI * 2) * s.r * 0.45},${s.y + Math.sin((k / 6) * Math.PI * 2) * s.r * 0.45}`).join(' ')} fill="none" stroke={sealColor(i)} strokeWidth="1.5" />
          </g>
        </g>
      ))}
      {/* fractures across the great seal and sky tear */}
      {cracks && (
        <g>
          <path d="M800 180 L760 260 L812 300 L770 380 L830 420 L800 480" stroke="#ff1f3d" strokeWidth="4" fill="none" strokeDasharray="600" strokeDashoffset="600" style={{ animation: 'dash 1.2s ease forwards' }} />
          <path d="M650 330 L720 320 L760 350 L860 300 L950 340" stroke="#ff6a85" strokeWidth="3" fill="none" strokeDasharray="500" strokeDashoffset="500" style={{ animation: 'dash 1.5s 0.3s ease forwards' }} />
          <path d="M0 120 L220 90 L260 140 L520 60 L600 110 L900 40 L1000 90 L1300 30 L1380 80 L1600 50 L1600 0 L0 0 Z" fill="#ff1f3d" opacity="0.18" />
          <path d="M0 120 L220 90 L260 140 L520 60 L600 110 L900 40 L1000 90 L1300 30 L1380 80 L1600 50" stroke="#ff1f3d" strokeWidth="2" fill="none" strokeDasharray="2000" strokeDashoffset="2000" style={{ animation: 'dash 2s 0.4s ease forwards' }} />
        </g>
      )}
    </motion.svg>
  )
}

/** The Null King on his shattered throne (scene 4). */
export function Throne({ raised, reduced }: { raised: boolean; reduced: boolean }) {
  return (
    <motion.div className="absolute inset-0" initial={{ scale: reduced ? 1 : 1.25, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 6, ease: 'easeOut' }}>
      <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 w-full h-full">
        <defs>
          <radialGradient id="nk" cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor="#5a0616" />
            <stop offset="45%" stopColor="#1a0208" />
            <stop offset="100%" stopColor="#030104" />
          </radialGradient>
          <filter id="b12"><feGaussianBlur stdDeviation="12" /></filter>
        </defs>
        <rect width="1600" height="900" fill="url(#nk)" />
        {/* shattered throne */}
        <path d="M560 900 L600 470 L660 360 L700 420 L740 300 L800 380 L860 290 L900 420 L940 360 L1000 470 L1040 900 Z" fill="#0a0408" stroke="#ff1f3d" strokeOpacity="0.4" strokeWidth="2" />
        <path d="M480 900 L520 760 L1080 760 L1120 900 Z" fill="#120609" />
        <path d="M640 520 L700 600 M960 520 L900 610 M780 400 L800 480" stroke="#ff1f3d" strokeWidth="2" opacity="0.5" />
        {/* silhouette */}
        <ellipse cx="800" cy="560" rx="230" ry="260" fill="#ff1f3d" opacity="0.12" filter="url(#b12)" className="anim-pulse" />
        <path d="M700 900 L710 640 Q720 560 760 540 L790 530 L810 530 L840 540 Q880 560 890 640 L900 900 Z" fill="#020102" />
        <ellipse cx="800" cy="500" rx="46" ry="56" fill="#020102" />
        <path d="M748 470 L756 400 L776 444 L790 380 L800 430 L812 378 L824 444 L846 404 L852 470 Q800 452 748 470 Z" fill="#05020a" stroke="#ff1f3d" strokeWidth="2.5" />
        <path d="M790 380 L796 420 M846 404 L840 440" stroke="#ff8aa0" strokeWidth="1.5" />
        <path d="M778 502 L792 506 L778 508 Z M822 502 L808 506 L822 508 Z" fill="#ff1f3d" className="anim-flicker" />
        {/* arm */}
        <motion.path
          d="M860 580 Q920 560 950 520"
          stroke="#020102" strokeWidth="26" strokeLinecap="round" fill="none"
          initial={false}
          animate={{ d: raised ? 'M860 580 Q920 500 960 400' : 'M860 580 Q900 640 900 700' }}
          transition={{ duration: 1.4, ease: 'easeInOut' }}
        />
        {raised && <circle cx="962" cy="396" r="16" fill="#ff1f3d" filter="url(#b12)" className="anim-pulse" />}
        {/* floating corrupted fragments */}
        {Array.from({ length: 30 }, (_, i) => {
          const r = seededRandom(i + 9)
          const x = 500 + r() * 600, y = 200 + r() * 500
          return <rect key={i} x={x} y={y} width={4 + r() * 10} height={4 + r() * 10} fill={i % 3 ? '#1a0208' : '#ff1f3d'} opacity={0.6} transform={`rotate(${r() * 90} ${x} ${y})`} className="anim-float" style={{ animationDelay: `${r() * 4}s` }} />
        })}
      </svg>
    </motion.div>
  )
}

/** The awakening in the ruins (scene 5). */
export function Awakening({ pulse, eyesOpen, reduced }: { pulse: boolean; eyesOpen: boolean; reduced: boolean }) {
  return (
    <motion.div className="absolute inset-0" initial={{ opacity: 0, scale: reduced ? 1 : 1.08 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 3 }}>
      <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 w-full h-full">
        <defs>
          <radialGradient id="aw" cx="50%" cy="70%" r="60%">
            <stop offset="0%" stopColor={pulse ? '#0d3a48' : '#0b0f1c'} />
            <stop offset="100%" stopColor="#030409" />
          </radialGradient>
          <filter id="b8"><feGaussianBlur stdDeviation="8" /></filter>
        </defs>
        <rect width="1600" height="900" fill="url(#aw)" style={{ transition: 'all 1.5s' }} />
        {/* ruined city */}
        {[[80, 380, 120], [240, 300, 90], [380, 460, 140], [1120, 420, 130], [1280, 280, 100], [1420, 360, 150]].map(([x, h, w], i) => (
          <path key={i} d={`M${x} 900 L${x} ${900 - h} L${x + w * 0.3} ${900 - h - 30} L${x + w * 0.5} ${900 - h + 20} L${x + w} ${900 - h - 10} L${x + w} 900 Z`} fill="#070a14" stroke="#1a2440" />
        ))}
        <path d="M0 820 Q400 780 800 800 T1600 790 L1600 900 L0 900 Z" fill="#05070f" />
        {/* broken arches */}
        <path d="M560 900 L560 620 Q640 520 720 600 L720 900 M880 900 L880 640 Q940 580 990 640" stroke="#121a30" strokeWidth="24" fill="none" />
        {/* artifact */}
        <circle cx="800" cy="790" r={pulse ? 60 : 22} fill="#22e4ff" opacity={pulse ? 0.5 : 0.25} filter="url(#b8)" className="anim-pulse" style={{ transition: 'all 1s' }} />
        <polygon points="800,770 816,790 800,810 784,790" fill="#0b1a24" stroke="#22e4ff" strokeWidth="2.5" />
        <circle cx="800" cy="790" r="4" fill="#ffb547" />
        {pulse && !reduced && (
          <circle cx="800" cy="790" r="20" fill="none" stroke="#22e4ff" strokeWidth="3">
            <animate attributeName="r" from="20" to="1400" dur="2.4s" fill="freeze" />
            <animate attributeName="opacity" from="0.9" to="0" dur="2.4s" fill="freeze" />
          </circle>
        )}
      </svg>
      {/* protagonist */}
      <div className="absolute left-1/2 bottom-[10%] -translate-x-1/2 flex flex-col items-center">
        <div className="relative">
          <Portrait id="kael" mood={eyesOpen ? 'neutral' : 'closed'} size={typeof window !== 'undefined' && window.innerWidth < 640 ? 170 : 240} animated={!reduced} title="Kael Vex" />
        </div>
      </div>
    </motion.div>
  )
}

/** Title letters that materialise from fragments. */
export function FragmentTitle({ text, reduced }: { text: string; reduced: boolean }) {
  const letters = text.split('')
  const offsets = useMemo(() => {
    const r = seededRandom(99)
    return letters.map(() => ({ x: (r() - 0.5) * 900, y: (r() - 0.5) * 500, rot: (r() - 0.5) * 180, d: r() * 0.6 }))
  }, [letters.length])
  return (
    <h1 className="title-cinematic flex justify-center flex-wrap text-[clamp(2.3rem,9vw,7.5rem)] leading-none" aria-label={text}>
      {letters.map((ch, i) => (
        <motion.span
          key={i}
          aria-hidden="true"
          className="inline-block"
          initial={reduced ? { opacity: 0 } : { opacity: 0, x: offsets[i].x, y: offsets[i].y, rotate: offsets[i].rot, scale: 2.4, filter: 'blur(12px)' }}
          animate={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 1, filter: 'blur(0px)' }}
          transition={{ duration: reduced ? 0.6 : 1.6, delay: reduced ? 0 : 0.2 + offsets[i].d, ease: [0.16, 1, 0.3, 1] }}
        >
          {ch === ' ' ? ' ' : ch}
        </motion.span>
      ))}
    </h1>
  )
}

import { useId, type ReactNode } from 'react'
import type { CharacterId, Mood } from '../game/types'
import { costumeColors } from '../game/meta'

interface Props {
  id: CharacterId
  mood?: Mood
  size?: number
  costume?: string
  animated?: boolean
  className?: string
  title?: string
}

/**
 * Original character portraits, drawn as layered SVG so every character keeps
 * a consistent silhouette and colour language across the whole platform.
 */
export function Portrait({ id, mood = 'neutral', size = 160, costume, animated = true, className = '', title }: Props) {
  const uid = useId().replace(/:/g, '')
  const art = (ART[id] ?? ART.aura)!
  return (
    <svg
      viewBox="0 0 200 240"
      width={size}
      height={size * 1.2}
      className={className}
      role="img"
      aria-label={title ?? `${id} portrait`}
      style={{ overflow: 'visible' }}
    >
      <g className={animated ? 'anim-breathe' : undefined}>{art(uid, mood, costume)}</g>
    </svg>
  )
}

// ───────────── shared parts ─────────────

function Glow({ uid, color, cy = 110, r = 95 }: { uid: string; color: string; cy?: number; r?: number }) {
  return (
    <>
      <defs>
        <radialGradient id={`g-${uid}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={color} stopOpacity="0.45" />
          <stop offset="60%" stopColor={color} stopOpacity="0.08" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="100" cy={cy} r={r} fill={`url(#g-${uid})`} className="anim-pulse" />
    </>
  )
}

const SKIN = { light: '#f2d6c4', warm: '#d9a582', deep: '#8d5a3f', pale: '#e8dcdc' }

function Face({ skin, shade }: { skin: string; shade: string }) {
  return (
    <>
      <path d="M86 150 L86 172 Q100 180 114 172 L114 150 Z" fill={shade} />
      <path d="M68 96 Q67 58 100 56 Q133 58 132 96 Q131 128 112 143 Q100 151 88 143 Q69 128 68 96 Z" fill={skin} />
      <path d="M68 100 Q70 126 88 143 Q100 151 112 143 Q104 146 100 146 Q84 140 74 118 Z" fill={shade} opacity="0.35" />
      <ellipse cx="67" cy="104" rx="4" ry="8" fill={skin} />
      <ellipse cx="133" cy="104" rx="4" ry="8" fill={skin} />
    </>
  )
}

function Eyes({ color, mood, y = 104, spread = 15, lash = '#141420' }: { color: string; mood: Mood; y?: number; spread?: number; lash?: string }) {
  const L = 100 - spread
  const R = 100 + spread
  const open = mood === 'surprised' ? 1.25 : mood === 'smile' ? 0.75 : 1
  const brow = (x: number, side: -1 | 1) => {
    let inner = -2, outer = 0
    if (mood === 'angry') { inner = 4; outer = -3 }
    if (mood === 'sad') { inner = -6; outer = 1 }
    if (mood === 'surprised') { inner = -6; outer = -6 }
    if (mood === 'smirk' && side === 1) { inner = -6; outer = -8 }
    const xi = x - side * 9
    const xo = x + side * 11
    return <path d={`M${xi} ${y - 12 + inner} Q${x} ${y - 16 + (inner + outer) / 2} ${xo} ${y - 12 + outer}`} stroke={lash} strokeWidth="3" fill="none" strokeLinecap="round" />
  }
  const eye = (x: number) => mood === 'closed' ? (
    <path d={`M${x - 10} ${y + 1} Q${x} ${y + 6} ${x + 10} ${y + 1}`} stroke={lash} strokeWidth="2.6" fill="none" strokeLinecap="round" />
  ) : (
    <g style={{ transformOrigin: `${x}px ${y}px`, animation: 'blink 5.5s infinite' }}>
      <path d={`M${x - 10} ${y} Q${x} ${y - 9 * open} ${x + 10} ${y} Q${x} ${y + 6 * open} ${x - 10} ${y} Z`} fill="#f4f8ff" />
      <circle cx={x} cy={y - 0.5} r={4.6 * Math.min(open, 1.1)} fill={color} />
      <circle cx={x} cy={y - 0.5} r={2.2} fill="#06070d" />
      <circle cx={x + 1.6} cy={y - 2.4} r={1.3} fill="white" />
      <path d={`M${x - 11} ${y} Q${x} ${y - 10 * open} ${x + 11} ${y}`} stroke={lash} strokeWidth="2.4" fill="none" strokeLinecap="round" />
    </g>
  )
  return (
    <g>
      {eye(L)}
      {eye(R)}
      {brow(L, -1)}
      {brow(R, 1)}
    </g>
  )
}

function Mouth({ mood, y = 130, color = '#7a3b3b' }: { mood: Mood; y?: number; color?: string }) {
  const d: Record<Mood, string> = {
    neutral: `M93 ${y} Q100 ${y + 1.5} 107 ${y}`,
    smile: `M91 ${y - 1} Q100 ${y + 6} 109 ${y - 1}`,
    angry: `M93 ${y + 2} Q100 ${y - 2} 107 ${y + 2}`,
    sad: `M93 ${y + 3} Q100 ${y - 1} 107 ${y + 3}`,
    surprised: '',
    smirk: `M93 ${y + 1} Q102 ${y + 2} 109 ${y - 3}`,
    closed: `M94 ${y + 1} Q100 ${y + 2} 106 ${y + 1}`,
  }
  if (mood === 'surprised') return <ellipse cx="100" cy={y + 1} rx="3.5" ry="4.5" fill={color} />
  return <path d={d[mood]} stroke={color} strokeWidth="2.4" fill="none" strokeLinecap="round" />
}

function Shoulders({ coat, trim, children }: { coat: string; trim: string; children?: ReactNode }) {
  return (
    <g>
      <path d="M14 240 Q18 196 56 182 L84 168 Q100 178 116 168 L144 182 Q182 196 186 240 Z" fill={coat} />
      <path d="M84 168 L100 200 L116 168" stroke={trim} strokeWidth="2" fill="none" opacity="0.8" />
      {children}
    </g>
  )
}

// ───────────── character art ─────────────

type Art = (uid: string, mood: Mood, costume?: string) => ReactNode

const ART: Partial<Record<CharacterId, Art>> = {
  kael: (uid, mood, costume) => {
    const c = costumeColors(costume ?? 'guardian')
    return (
      <>
        <Glow uid={uid} color={c.glow} />
        <Shoulders coat={c.coat} trim={c.glow}>
          {/* high tactical collar */}
          <path d="M70 176 L80 150 L92 170 Z M130 176 L120 150 L108 170 Z" fill={c.coat} stroke={c.glow} strokeOpacity="0.4" />
          {/* fractured armor plate on left shoulder */}
          <path d="M22 226 Q26 198 58 186 L74 200 L60 214 L68 226 Z" fill={c.armor} stroke={c.glow} strokeWidth="1.5" />
          <path d="M40 200 L52 208 L46 218 M60 192 L56 204" stroke={c.glow} strokeWidth="1.6" fill="none" className="anim-pulse" />
          {/* geometric chest marking */}
          <path d="M100 206 L112 218 L100 230 L88 218 Z" fill="none" stroke={c.glow} strokeWidth="2" className="anim-pulse" />
          <circle cx="100" cy="218" r="3" fill={c.glow} />
        </Shoulders>
        <Face skin={SKIN.warm} shade="#a4705a" />
        {/* cheek marking */}
        <path d="M120 112 L126 118 L122 124" stroke={c.glow} strokeWidth="1.8" fill="none" className="anim-pulse" />
        <Eyes color={c.glow} mood={mood} />
        <Mouth mood={mood} />
        {/* asymmetrical swept hair */}
        <path d="M62 98 Q56 52 96 42 Q140 36 146 78 Q150 96 138 112 Q138 86 126 72 Q118 92 92 86 Q100 78 98 70 Q84 84 66 106 Z" fill="#0d1018" />
        <path d="M96 42 Q124 30 150 52 Q140 46 128 50 Q142 62 140 74 Q128 58 108 56 Z" fill="#161b28" />
        <path d="M126 72 Q134 84 138 112" stroke={c.glow} strokeWidth="2" fill="none" opacity="0.9" />
        <path d="M66 106 Q58 120 62 134 Q56 116 62 98 Z" fill="#0d1018" />
      </>
    )
  },
  nyra: (uid, mood) => (
    <>
      <Glow uid={uid} color="#ff4fd8" />
      {/* flowing hair behind */}
      <path d="M58 92 Q48 160 40 210 Q70 200 76 150 Z M142 92 Q156 150 168 214 Q134 204 126 150 Z" fill="#2a1240" />
      <Shoulders coat="#1a0f2a" trim="#ff4fd8">
        <path d="M56 182 Q100 214 144 182 L150 192 Q100 228 50 192 Z" fill="#3a1d5c" />
        <path d="M60 196 Q100 222 140 196" stroke="#ff4fd8" strokeWidth="1.5" fill="none" className="anim-pulse" />
      </Shoulders>
      <Face skin={SKIN.light} shade="#c9a08e" />
      <Eyes color="#ff4fd8" mood={mood} lash="#1a0b26" />
      <Mouth mood={mood} color="#b0456e" />
      {/* bangs + side braid */}
      <path d="M64 100 Q58 50 100 46 Q144 50 138 100 Q130 74 116 66 Q112 82 96 80 Q104 70 100 64 Q86 82 64 100 Z" fill="#3a1858" />
      <path d="M100 46 Q118 40 132 56 Q120 52 112 60 Z" fill="#6b2aa0" opacity="0.8" />
      <path d="M138 96 Q148 130 140 168" stroke="#4b1f75" strokeWidth="9" fill="none" strokeLinecap="round" strokeDasharray="7 3" />
      {/* holographic daggers + light shards */}
      <g className="anim-float">
        <path d="M168 120 L176 92 L180 120 L174 128 Z" fill="#ff4fd8" opacity="0.75" />
        <path d="M22 140 L30 112 L34 140 L28 148 Z" fill="#b77bff" opacity="0.6" />
        <path d="M160 60 l6 -6 l2 8 z M34 70 l5 -7 l3 8 z" fill="#ffb0f0" opacity="0.6" />
      </g>
    </>
  ),
  orion: (uid, mood) => (
    <>
      <Glow uid={uid} color="#5aa8ff" />
      {/* rotating geometric shield ring */}
      <g style={{ transformOrigin: '100px 100px' }} className="anim-spin-slow">
        <polygon points="100,18 172,60 172,140 100,182 28,140 28,60" fill="none" stroke="#5aa8ff" strokeWidth="1.5" strokeOpacity="0.5" strokeDasharray="10 6" />
        <text x="100" y="26" textAnchor="middle" fontSize="9" fill="#9fd0ff" fontFamily="JetBrains Mono">2¹²⁸</text>
        <text x="174" y="104" textAnchor="middle" fontSize="9" fill="#9fd0ff" fontFamily="JetBrains Mono">mod n</text>
        <text x="26" y="104" textAnchor="middle" fontSize="9" fill="#9fd0ff" fontFamily="JetBrains Mono">φ(n)</text>
      </g>
      <Shoulders coat="#e9eef8" trim="#5aa8ff">
        <path d="M24 230 Q30 196 62 186 L78 206 L40 236 Z M176 230 Q170 196 138 186 L122 206 L160 236 Z" fill="#c8d4ea" stroke="#5aa8ff" strokeWidth="1.5" />
        <path d="M78 172 L100 190 L122 172 L118 162 L100 176 L82 162 Z" fill="#2c4f86" />
        <circle cx="100" cy="214" r="7" fill="none" stroke="#5aa8ff" strokeWidth="2" className="anim-pulse" />
      </Shoulders>
      <Face skin={SKIN.deep} shade="#6a3f2b" />
      <Eyes color="#7cc2ff" mood={mood} />
      <Mouth mood={mood} color="#4a2418" />
      {/* HUD monocle */}
      <circle cx="115" cy="104" r="12" fill="none" stroke="#5aa8ff" strokeWidth="1.4" opacity="0.8" />
      <path d="M127 104 L138 98" stroke="#5aa8ff" strokeWidth="1.4" />
      {/* short neat hair */}
      <path d="M66 94 Q64 54 100 50 Q136 54 134 94 Q130 70 118 64 Q100 72 80 66 Q70 74 66 94 Z" fill="#0f0f16" />
      <path d="M80 66 Q100 58 118 64" stroke="#2a2a3a" strokeWidth="2" fill="none" />
    </>
  ),
  vexa: (uid, mood) => (
    <>
      <Glow uid={uid} color="#ff3d6e" />
      {/* hood */}
      <path d="M44 120 Q40 40 100 32 Q160 40 156 120 Q158 170 140 186 L60 186 Q42 170 44 120 Z" fill="#0d0609" />
      <Shoulders coat="#140709" trim="#ff3d6e">
        <path d="M40 210 l10 -6 l4 10 M150 212 l-8 -8 l-6 10 M96 214 h8 v8 h-8 z" stroke="#ff3d6e" strokeWidth="1.6" fill="none" className="anim-flicker" />
      </Shoulders>
      <Face skin={SKIN.pale} shade="#b9a5a5" />
      <Mouth mood={mood} color="#8a1f33" y={132} />
      {/* mirrored half-mask */}
      <defs>
        <linearGradient id={`m-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f4f6ff" />
          <stop offset="45%" stopColor="#7d8496" />
          <stop offset="55%" stopColor="#1c1f29" />
          <stop offset="100%" stopColor="#c9ccd6" />
        </linearGradient>
      </defs>
      <path d="M66 92 Q100 80 134 92 L132 114 Q118 122 104 114 L100 118 L96 114 Q82 122 68 114 Z" fill={`url(#m-${uid})`} stroke="#ff3d6e" strokeWidth="1.2" />
      <path d="M78 104 Q86 98 94 104 M106 104 Q114 98 122 104" stroke="#ff3d6e" strokeWidth="2.5" fill="none" className={mood === 'angry' ? 'anim-flicker' : 'anim-pulse'} />
      {/* hair strands with red streak */}
      <path d="M70 90 Q78 60 100 56 Q90 72 92 86 Z M130 90 Q122 62 104 56 Q116 70 114 86 Z" fill="#1a0a10" />
      <path d="M126 78 Q132 110 126 140" stroke="#ff3d6e" strokeWidth="2" fill="none" opacity="0.8" />
      {/* glitch slices */}
      <rect x="60" y="120" width="30" height="3" fill="#ff3d6e" opacity="0.6" className="anim-flicker" />
      <rect x="118" y="70" width="22" height="2" fill="#22e4ff" opacity="0.5" className="anim-flicker" />
    </>
  ),
  aura: (uid, mood) => {
    const eyeY = mood === 'surprised' ? 96 : 98
    return (
      <>
        <Glow uid={uid} color="#4dffb8" cy={100} r={80} />
        <g className="anim-float">
          <g style={{ transformOrigin: '100px 100px' }} className="anim-spin-slow">
            <polygon points="100,30 160,64 160,136 100,170 40,136 40,64" fill="none" stroke="#4dffb8" strokeOpacity="0.35" strokeWidth="1.2" />
            <polygon points="100,44 148,72 148,128 100,156 52,128 52,72" fill="none" stroke="#22e4ff" strokeOpacity="0.25" strokeDasharray="4 4" />
          </g>
          <polygon points="100,52 140,76 140,124 100,148 60,124 60,76" fill="#062a24" stroke="#4dffb8" strokeWidth="2" />
          <polygon points="100,52 140,76 100,100 60,76" fill="#0b3b33" opacity="0.9" />
          <rect x="70" y="84" width="60" height="32" rx="12" fill="#02110e" stroke="#4dffb8" strokeOpacity="0.6" />
          {mood === 'smile' || mood === 'smirk' ? (
            <>
              <path d={`M80 ${eyeY + 4} Q86 ${eyeY - 4} 92 ${eyeY + 4}`} stroke="#4dffb8" strokeWidth="3.5" fill="none" strokeLinecap="round" />
              <path d={`M108 ${eyeY + 4} Q114 ${eyeY - 4} 120 ${eyeY + 4}`} stroke="#4dffb8" strokeWidth="3.5" fill="none" strokeLinecap="round" />
            </>
          ) : mood === 'sad' ? (
            <>
              <path d={`M80 ${eyeY} Q86 ${eyeY + 6} 92 ${eyeY}`} stroke="#4dffb8" strokeWidth="3.5" fill="none" strokeLinecap="round" />
              <path d={`M108 ${eyeY} Q114 ${eyeY + 6} 120 ${eyeY}`} stroke="#4dffb8" strokeWidth="3.5" fill="none" strokeLinecap="round" />
            </>
          ) : (
            <g style={{ transformOrigin: `100px ${eyeY}px`, animation: 'blink 4s infinite' }}>
              <rect x="80" y={eyeY - (mood === 'surprised' ? 8 : 5)} width="12" height={mood === 'surprised' ? 16 : 10} rx="5" fill="#4dffb8" />
              <rect x="108" y={eyeY - (mood === 'surprised' ? 8 : 5)} width="12" height={mood === 'surprised' ? 16 : 10} rx="5" fill="#4dffb8" />
            </g>
          )}
          {mood === 'angry' && <path d="M78 86 L94 92 M122 86 L106 92" stroke="#4dffb8" strokeWidth="2.5" />}
          <circle cx="100" cy="134" r="4" fill="#22e4ff" className="anim-pulse" />
          <circle cx="150" cy="56" r="3" fill="#4dffb8" className="anim-pulse" />
          <circle cx="46" cy="150" r="2.5" fill="#22e4ff" className="anim-pulse" />
        </g>
      </>
    )
  },
  null: (uid) => (
    <>
      <Glow uid={uid} color="#ff1f3d" r={100} />
      {/* floating fragments */}
      <g className="anim-float">
        <path d="M20 80 l10 -6 l2 12 z M176 70 l8 6 l-10 6 z M30 170 l12 2 l-6 8 z M170 160 l6 10 l-12 -2 z" fill="#ff1f3d" opacity="0.6" />
        <rect x="150" y="30" width="6" height="6" fill="#ff1f3d" opacity="0.5" transform="rotate(20 153 33)" />
        <rect x="40" y="36" width="5" height="5" fill="#ff1f3d" opacity="0.5" transform="rotate(-15 42 38)" />
      </g>
      <path d="M10 240 Q14 190 50 176 L70 150 L130 150 L150 176 Q186 190 190 240 Z" fill="#07040a" />
      <path d="M10 240 Q12 200 36 186 L60 200 L46 240 Z M190 240 Q188 200 164 186 L140 200 L154 240 Z" fill="#160a12" stroke="#ff1f3d" strokeOpacity="0.5" />
      <path d="M100 176 L110 200 L100 224 L90 200 Z" fill="none" stroke="#ff1f3d" strokeWidth="1.5" className="anim-pulse" />
      {/* shadowed head */}
      <path d="M68 98 Q66 56 100 54 Q134 56 132 98 Q130 132 100 150 Q70 132 68 98 Z" fill="#0a0508" />
      <path d="M80 104 L94 108 L80 110 Z M120 104 L106 108 L120 110 Z" fill="#ff1f3d" className="anim-pulse" />
      <path d="M84 112 L116 112" stroke="#ff1f3d" strokeOpacity="0.25" />
      {/* massive fractured crown */}
      <path d="M52 64 L60 14 L76 46 L88 4 L100 40 L112 4 L124 46 L140 14 L148 64 Q100 50 52 64 Z" fill="#1a0b10" stroke="#ff1f3d" strokeWidth="2" />
      <path d="M88 4 L94 30 L86 40 M124 46 L118 28 M60 14 L68 44" stroke="#ff8aa0" strokeWidth="1.2" fill="none" />
      <path d="M140 14 L150 4 M112 4 L120 -6" stroke="#ff1f3d" strokeWidth="1.5" opacity="0.7" className="anim-flicker" />
    </>
  ),
  sentinel: (uid, mood) => (
    <>
      <Glow uid={uid} color="#ffb547" />
      <path d="M20 240 L34 180 L70 164 L130 164 L166 180 L180 240 Z" fill="#2a2116" stroke="#ffb547" strokeOpacity="0.4" />
      <rect x="56" y="48" width="88" height="110" rx="16" fill="#3a2e1e" stroke="#ffb547" strokeWidth="2" />
      <path d="M56 80 H144 M56 120 H144 M86 48 V158 M114 48 V158" stroke="#ffb547" strokeOpacity="0.25" />
      <rect x="66" y={mood === 'sad' ? 98 : 92} width="68" height={mood === 'sad' ? 4 : 14} rx="6" fill="#120d07" />
      <rect x="70" y={mood === 'sad' ? 99 : 96} width="60" height={mood === 'sad' ? 2 : 6} rx="3" fill="#ffb547" className={mood === 'angry' ? 'anim-flicker' : 'anim-pulse'} />
      <path d="M70 134 h60" stroke="#ffb547" strokeWidth="3" strokeDasharray="6 4" />
      <path d="M140 60 l14 -20 M60 60 l-14 -20" stroke="#ffb547" strokeWidth="3" />
      <path d="M118 52 L126 70 L114 74" stroke="#ff3d6e" strokeWidth="1.5" fill="none" />
    </>
  ),
  eater: (uid, mood) => (
    <>
      <Glow uid={uid} color="#ffb547" />
      <g className="anim-float">
        <circle cx="100" cy="112" r="78" fill="#1c1206" stroke="#ffb547" strokeWidth="2" />
        {Array.from({ length: 16 }, (_, i) => {
          const a = (i / 16) * Math.PI * 2
          return <path key={i} d={`M${100 + 78 * Math.cos(a)} ${112 + 78 * Math.sin(a)} L${100 + 96 * Math.cos(a + 0.1)} ${112 + 96 * Math.sin(a + 0.1)} L${100 + 78 * Math.cos(a + 0.2)} ${112 + 78 * Math.sin(a + 0.2)}`} fill="#2a1a08" stroke="#ffb547" strokeOpacity="0.6" />
        })}
        {/* mouth grid (5×5) */}
        <rect x="62" y={mood === 'sad' ? 116 : 104} width="76" height={mood === 'sad' ? 20 : 54} rx="10" fill="#050302" />
        {mood !== 'sad' && Array.from({ length: 25 }, (_, i) => (
          <text key={i} x={70 + (i % 5) * 15} y={118 + Math.floor(i / 5) * 10} fontSize="8" fill="#ffb547" fontFamily="JetBrains Mono" opacity={0.4 + ((i * 7) % 5) / 8}>{'MONARCHYBDEFGIKLPQSTUVWXZ'[i]}</text>
        ))}
        <circle cx="76" cy="78" r="9" fill="#ffb547" className="anim-pulse" />
        <circle cx="124" cy="78" r="9" fill="#ffb547" className="anim-pulse" />
        <circle cx="76" cy="78" r="3" fill="#050302" />
        <circle cx="124" cy="78" r="3" fill="#050302" />
      </g>
    </>
  ),
  weaver: (uid) => (
    <>
      <Glow uid={uid} color="#b77bff" />
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2 + 0.2
        return <path key={i} d={`M100 110 Q${100 + 70 * Math.cos(a)} ${110 + 40 * Math.sin(a)} ${100 + 98 * Math.cos(a)} ${110 + 98 * Math.sin(a)}`} stroke="#b77bff" strokeWidth="2.5" fill="none" opacity="0.7" />
      })}
      <circle cx="100" cy="110" r="48" fill="none" stroke="#b77bff" strokeOpacity="0.3" strokeDasharray="3 5" />
      <circle cx="100" cy="110" r="70" fill="none" stroke="#b77bff" strokeOpacity="0.2" strokeDasharray="3 5" />
      <ellipse cx="100" cy="112" rx="30" ry="36" fill="#1b0d2e" stroke="#b77bff" strokeWidth="2" />
      {[[90, 100], [110, 100], [84, 112], [116, 112], [94, 92], [106, 92]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i < 2 ? 5 : 3} fill="#e7c9ff" className="anim-pulse" />
      ))}
      <text x="100" y="140" textAnchor="middle" fontSize="9" fill="#b77bff" fontFamily="JetBrains Mono">LOOMSLOOMS</text>
    </>
  ),
  colossus: (uid, mood) => (
    <>
      <Glow uid={uid} color="#c9d2e0" />
      <path d="M8 240 L22 170 L64 150 L136 150 L178 170 L192 240 Z" fill="#2a2f38" stroke="#c9d2e0" strokeOpacity="0.4" />
      <circle cx="100" cy="204" r="26" fill="#14171d" stroke="#c9d2e0" strokeWidth="2" />
      <g style={{ transformOrigin: '100px 204px' }} className="anim-spin-slow">
        {['SB', 'SR', 'MC', 'ARK'].map((t, i) => (
          <text key={t} x={100 + 15 * Math.cos((i * Math.PI) / 2)} y={207 + 15 * Math.sin((i * Math.PI) / 2)} textAnchor="middle" fontSize="7" fill="#ffb547" fontFamily="JetBrains Mono">{t}</text>
        ))}
      </g>
      <path d="M62 60 L138 60 L148 140 L52 140 Z" fill="#3a414d" stroke="#c9d2e0" strokeWidth="2" />
      <rect x="70" y="86" width="60" height="16" rx="3" fill="#0a0c10" />
      <rect x="74" y="90" width="52" height="8" fill={mood === 'sad' ? '#3a414d' : '#ff6a3d'} className={mood === 'angry' ? 'anim-flicker' : undefined} />
      <path d="M78 120 h44 M78 128 h44" stroke="#c9d2e0" strokeOpacity="0.5" strokeWidth="2" />
      <path d="M62 60 L52 40 L76 52 M138 60 L148 40 L124 52" fill="#3a414d" stroke="#c9d2e0" />
    </>
  ),
  sovereigns: (uid, mood) => (
    <>
      <Glow uid={uid} color="#b77bff" />
      <path d="M10 240 Q20 186 60 176 L100 190 L140 176 Q180 186 190 240 Z" fill="#120e24" />
      <path d="M100 190 L100 240" stroke="#5aa8ff" strokeWidth="2" />
      {/* Aster (light) */}
      <path d="M30 100 Q30 50 70 46 Q100 50 100 100 Q98 140 66 160 Q32 140 30 100 Z" fill="#e9eef8" stroke="#5aa8ff" strokeWidth="2" />
      <path d="M46 100 Q56 92 64 100 M76 100 Q84 92 92 100" stroke="#2c4f86" strokeWidth="3" fill="none" />
      <path d={mood === 'smile' ? 'M54 128 Q66 136 80 128' : 'M54 130 Q66 126 80 130'} stroke="#2c4f86" strokeWidth="2.5" fill="none" />
      <path d="M40 50 L50 24 L62 42 L70 18 L80 42 L92 26 L98 52" fill="none" stroke="#5aa8ff" strokeWidth="2" />
      {/* Vael (dark) */}
      <path d="M100 100 Q100 50 130 46 Q170 50 170 100 Q168 140 134 160 Q102 140 100 100 Z" fill="#1d1433" stroke="#b77bff" strokeWidth="2" />
      <path d="M108 100 Q116 92 124 100 M136 100 Q144 92 152 100" stroke="#ff4fd8" strokeWidth="3" fill="none" />
      <path d={mood === 'smile' ? 'M120 128 Q134 136 146 128' : 'M120 130 Q134 126 146 130'} stroke="#ff4fd8" strokeWidth="2.5" fill="none" />
      <path d="M102 52 L108 26 L120 42 L130 18 L138 42 L150 24 L160 50" fill="none" stroke="#b77bff" strokeWidth="2" />
      <circle cx="66" cy="76" r="4" fill="#5aa8ff" /><circle cx="134" cy="76" r="4" fill="#ff4fd8" />
    </>
  ),
  assassin: (uid) => (
    <>
      <Glow uid={uid} color="#ff4fd8" />
      <path d="M18 240 Q24 186 62 174 L84 160 Q100 168 116 160 L138 174 Q176 186 182 240 Z" fill="#0f0a16" />
      <defs>
        <linearGradient id={`a-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="30%" stopColor="#9aa3b8" />
          <stop offset="50%" stopColor="#20242f" />
          <stop offset="70%" stopColor="#c6ccdb" />
          <stop offset="100%" stopColor="#5a6276" />
        </linearGradient>
      </defs>
      <path d="M66 96 Q64 52 100 48 Q136 52 134 96 Q132 132 100 152 Q68 132 66 96 Z" fill={`url(#a-${uid})`} stroke="#ff4fd8" strokeWidth="1.5" />
      {/* reflections of other faces */}
      <path d="M80 92 Q86 86 92 92 M108 92 Q114 86 120 92" stroke="#22e4ff" strokeOpacity="0.5" strokeWidth="2" fill="none" className="anim-flicker" />
      <path d="M78 100 Q86 94 94 100 M106 100 Q114 94 122 100" stroke="#ff4fd8" strokeOpacity="0.6" strokeWidth="2" fill="none" className="anim-pulse" />
      <path d="M90 126 Q100 132 110 126" stroke="#ff4fd8" strokeOpacity="0.5" strokeWidth="2" fill="none" />
      <path d="M30 120 L52 60 M170 120 L148 60" stroke="#ff4fd8" strokeWidth="3" strokeLinecap="round" />
      <path d="M44 80 L60 74 M156 80 L140 74" stroke="#ff4fd8" strokeWidth="2" opacity="0.6" />
    </>
  ),
  engine: (uid) => (
    <>
      <Glow uid={uid} color="#4dffb8" />
      {[0, 60, 120].map((r) => (
        <ellipse key={r} cx="100" cy="110" rx="86" ry="28" fill="none" stroke="#4dffb8" strokeOpacity="0.5" strokeWidth="1.5" transform={`rotate(${r} 100 110)`} strokeDasharray="5 6" />
      ))}
      <circle cx="100" cy="110" r="44" fill="#032019" stroke="#4dffb8" strokeWidth="2" />
      <circle cx="100" cy="110" r="30" fill="none" stroke="#22e4ff" strokeOpacity="0.6" className="anim-pulse" />
      <text x="100" y="106" textAnchor="middle" fontSize="11" fill="#4dffb8" fontFamily="JetBrains Mono">|ψ⟩</text>
      <text x="100" y="124" textAnchor="middle" fontSize="8" fill="#9fffe0" fontFamily="JetBrains Mono">p = ½</text>
      {[[30, 60], [170, 70], [40, 170], [166, 160], [100, 20]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="4" fill="#4dffb8" className="anim-pulse" />
      ))}
    </>
  ),
}

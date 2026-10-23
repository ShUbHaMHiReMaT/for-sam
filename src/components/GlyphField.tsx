import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'

export interface FieldParams {
  /** forward camera speed (z units / frame at 60fps) */
  speed: number
  /** palette of colours glyphs are drawn in */
  colors: string[]
  /** 0..1 fraction of glyphs drawn as "corrupted" crimson */
  corruption: number
  /** pull glyphs into an orbit around the centre (awakening scene) */
  orbit: number
  /** extra lateral drift */
  drift: number
  /** overall opacity */
  alpha: number
  /** camera sway amount */
  sway: number
}

export interface GlyphFieldHandle {
  set: (p: Partial<FieldParams>) => void
  burst: (color?: string) => void
}

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789⊕∑∂λφψΩ#$%&{}<>/\\|=+*01'.split('')

interface P { x: number; y: number; z: number; g: string; c: number; s: number; vx: number; vy: number }

/**
 * A 3D field of encrypted glyphs rendered on canvas. The camera flies forward
 * along z; parameters are tweened so the cinematic can "direct" the field.
 */
export const GlyphField = forwardRef<GlyphFieldHandle, { density?: number; reduced?: boolean; className?: string; initial?: Partial<FieldParams> }>(
  function GlyphField({ density = 1, reduced = false, className = '', initial }, ref) {
    const canvas = useRef<HTMLCanvasElement>(null)
    const target = useRef<FieldParams>({ speed: 0.6, colors: ['#22e4ff', '#8fd8ff', '#b77bff'], corruption: 0, orbit: 0, drift: 0, alpha: 1, sway: 0.3, ...initial })
    const cur = useRef<FieldParams>({ ...target.current })
    const bursts = useRef<{ t: number; color: string }[]>([])

    useImperativeHandle(ref, () => ({
      set: (p) => { target.current = { ...target.current, ...p } },
      burst: (color = '#ffffff') => { bursts.current.push({ t: 0, color }) },
    }))

    useEffect(() => {
      const cv = canvas.current!
      const ctx = cv.getContext('2d')
      if (!ctx) return
      let w = 0, h = 0, dpr = 1
      const resize = () => {
        dpr = Math.min(window.devicePixelRatio || 1, 2)
        w = cv.clientWidth
        h = cv.clientHeight
        cv.width = w * dpr
        cv.height = h * dpr
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      }
      resize()
      window.addEventListener('resize', resize)

      const mobile = window.innerWidth < 700
      const count = Math.round((mobile ? 260 : 520) * density * (reduced ? 0.4 : 1))
      const parts: P[] = []
      const spawn = (p?: P, far = true): P => {
        const q = p ?? ({} as P)
        q.x = (Math.random() - 0.5) * 2400
        q.y = (Math.random() - 0.5) * 1500
        q.z = far ? 400 + Math.random() * 1600 : 50 + Math.random() * 2000
        q.g = GLYPHS[(Math.random() * GLYPHS.length) | 0]
        q.c = Math.random()
        q.s = 10 + Math.random() * 14
        q.vx = (Math.random() - 0.5) * 0.6
        q.vy = (Math.random() - 0.5) * 0.6
        return q
      }
      for (let i = 0; i < count; i++) parts.push(spawn(undefined, false))

      let raf = 0
      let t = 0
      let visible = true
      const onVis = () => { visible = document.visibilityState === 'visible' }
      document.addEventListener('visibilitychange', onVis)

      const frame = () => {
        raf = requestAnimationFrame(frame)
        if (!visible) return
        t += 1
        const c = cur.current
        const tg = target.current
        const k = 0.03
        c.speed += (tg.speed - c.speed) * k
        c.corruption += (tg.corruption - c.corruption) * k
        c.orbit += (tg.orbit - c.orbit) * k
        c.drift += (tg.drift - c.drift) * k
        c.alpha += (tg.alpha - c.alpha) * k
        c.sway += (tg.sway - c.sway) * k
        c.colors = tg.colors

        ctx.globalCompositeOperation = 'source-over'
        ctx.fillStyle = `rgba(3,4,9,${c.speed > 6 ? 0.35 : 0.9})`
        ctx.fillRect(0, 0, w, h)

        const fov = Math.min(w, h) * 0.9
        const cx = w / 2 + Math.sin(t * 0.004) * 40 * c.sway
        const cy = h / 2 + Math.cos(t * 0.003) * 24 * c.sway
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'

        for (const p of parts) {
          p.z -= reduced ? c.speed * 0.25 : c.speed
          p.x += p.vx * c.drift
          p.y += p.vy * c.drift
          if (c.orbit > 0.01) {
            const ang = Math.atan2(p.y, p.x) + 0.01 * c.orbit
            const r = Math.hypot(p.x, p.y)
            const tr = r + (260 - r) * 0.01 * c.orbit
            p.x = Math.cos(ang) * tr
            p.y = Math.sin(ang) * tr * 0.6
          }
          if (p.z < 20) spawn(p)
          const sc = fov / p.z
          const x = cx + p.x * sc
          const y = cy + p.y * sc
          if (x < -50 || x > w + 50 || y < -50 || y > h + 50) continue
          const depth = Math.min(1, Math.max(0, 1 - p.z / 2000))
          const corrupted = p.c < c.corruption
          const color = corrupted ? '#ff1f3d' : c.colors[(p.c * c.colors.length * 7 | 0) % c.colors.length]
          ctx.globalAlpha = depth * c.alpha * (corrupted ? 0.95 : 0.8)
          ctx.fillStyle = color
          const size = p.s * sc
          if (c.speed > 6 && !reduced) {
            // warp streaks
            const sc2 = fov / (p.z + c.speed * 6)
            ctx.strokeStyle = color
            ctx.lineWidth = Math.max(0.5, size * 0.08)
            ctx.beginPath()
            ctx.moveTo(x, y)
            ctx.lineTo(cx + p.x * sc2, cy + p.y * sc2)
            ctx.stroke()
          } else if (size > 3) {
            ctx.font = `${Math.min(64, size).toFixed(1)}px "JetBrains Mono", monospace`
            ctx.fillText(corrupted && t % 20 < 2 ? GLYPHS[(Math.random() * GLYPHS.length) | 0] : p.g, x, y)
          } else {
            ctx.fillRect(x, y, Math.max(1, size * 0.4), Math.max(1, size * 0.4))
          }
        }

        // shockwave bursts
        ctx.globalCompositeOperation = 'lighter'
        bursts.current = bursts.current.filter((b) => b.t < 1)
        for (const b of bursts.current) {
          b.t += 0.018
          const r = b.t * Math.max(w, h) * 0.9
          const grd = ctx.createRadialGradient(w / 2, h / 2, r * 0.7, w / 2, h / 2, r)
          grd.addColorStop(0, 'rgba(0,0,0,0)')
          grd.addColorStop(0.85, b.color)
          grd.addColorStop(1, 'rgba(0,0,0,0)')
          ctx.globalAlpha = (1 - b.t) * 0.6
          ctx.fillStyle = grd
          ctx.fillRect(0, 0, w, h)
        }
        ctx.globalAlpha = 1
      }
      frame()
      return () => {
        cancelAnimationFrame(raf)
        window.removeEventListener('resize', resize)
        document.removeEventListener('visibilitychange', onVis)
      }
    }, [density, reduced])

    return <canvas ref={canvas} className={`absolute inset-0 w-full h-full ${className}`} aria-hidden="true" />
  },
)

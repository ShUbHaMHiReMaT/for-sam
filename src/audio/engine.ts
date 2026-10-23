/**
 * CIPHERVERSE sound engine — every sound is synthesised live with the Web Audio
 * API (original, no third-party assets). Nothing plays until the user has
 * interacted with the page, and everything respects the global mute/volume.
 */

export type Sfx =
  | 'click' | 'hover' | 'success' | 'error' | 'heartbeat' | 'impact' | 'glitch' | 'whoosh'
  | 'reveal' | 'levelup' | 'unlock' | 'hit' | 'bossAttack' | 'type' | 'shield' | 'chime' | 'rumble'

export type MusicState = 'off' | 'void' | 'golden' | 'betrayal' | 'null' | 'awaken' | 'title' | 'world' | 'lab' | 'boss' | 'victory'

class AudioEngine {
  ctx: AudioContext | null = null
  master!: GainNode
  musicBus!: GainNode
  private sfxBus!: GainNode
  private noiseBuf: AudioBuffer | null = null
  private musicNodes: { stop: (t: number) => void } | null = null
  private musicState: MusicState = 'off'
  private enabled = true
  private musicEnabled = true
  private volume = 0.7
  private lastHover = 0

  /** Must be called from a user gesture before audio can play. */
  unlock() {
    if (this.ctx) {
      // A muted engine stays suspended: nothing can reach the speakers.
      if (this.enabled && this.ctx.state === 'suspended') void this.ctx.resume()
      return
    }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    try {
      this.ctx = new AC()
    } catch {
      return
    }
    const c = this.ctx
    this.master = c.createGain()
    this.master.gain.value = this.enabled ? this.volume : 0
    const comp = c.createDynamicsCompressor()
    comp.threshold.value = -14
    comp.ratio.value = 4
    this.master.connect(comp).connect(c.destination)
    this.musicBus = c.createGain()
    this.musicBus.gain.value = this.musicEnabled ? 0.55 : 0
    this.musicBus.connect(this.master)
    this.sfxBus = c.createGain()
    this.sfxBus.gain.value = 0.9
    this.sfxBus.connect(this.master)
    const len = c.sampleRate * 2
    this.noiseBuf = c.createBuffer(1, len, c.sampleRate)
    const d = this.noiseBuf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
    if (!this.enabled) void c.suspend()
    if (this.musicState !== 'off') {
      const s = this.musicState
      this.musicState = 'off'
      this.music(s)
    }
  }

  get ready() { return !!this.ctx }

  configure(o: { sound: boolean; music: boolean; volume: number }) {
    this.enabled = o.sound
    this.musicEnabled = o.music
    this.volume = o.volume
    if (!o.sound) stopSpeaking()
    if (!this.ctx) return
    const t = this.ctx.currentTime
    const g = this.master.gain
    g.cancelScheduledValues(t)
    if (o.sound) {
      g.setValueAtTime(g.value, t)
      g.linearRampToValueAtTime(o.volume, t + 0.08)
      if (this.ctx.state === 'suspended') void this.ctx.resume()
    } else {
      // Hard mute: zero the gain instantly and suspend the whole context.
      g.setValueAtTime(0, t)
      void this.ctx.suspend()
    }
    const mg = this.musicBus.gain
    mg.cancelScheduledValues(t)
    mg.setValueAtTime(mg.value, t)
    mg.linearRampToValueAtTime(o.music ? 0.55 : 0, t + 0.25)
  }

  get muted() { return !this.enabled }

  // ───────── primitives ─────────

  private env(g: GainNode, t: number, a: number, peak: number, d: number) {
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(peak, t + a)
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d)
  }

  private tone(freq: number, t: number, dur: number, type: OscillatorType = 'sine', peak = 0.2, dest?: AudioNode, slideTo?: number) {
    const c = this.ctx!
    const o = c.createOscillator()
    const g = c.createGain()
    o.type = type
    o.frequency.setValueAtTime(freq, t)
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur)
    this.env(g, t, Math.min(0.01, dur / 4), peak, dur)
    o.connect(g).connect(dest ?? this.sfxBus)
    o.start(t)
    o.stop(t + dur + 0.05)
  }

  private noise(t: number, dur: number, peak: number, filter: BiquadFilterType, f0: number, f1?: number, q = 1) {
    const c = this.ctx!
    const src = c.createBufferSource()
    src.buffer = this.noiseBuf
    const bf = c.createBiquadFilter()
    bf.type = filter
    bf.frequency.setValueAtTime(f0, t)
    if (f1) bf.frequency.exponentialRampToValueAtTime(f1, t + dur)
    bf.Q.value = q
    const g = c.createGain()
    this.env(g, t, Math.min(0.02, dur / 3), peak, dur)
    src.connect(bf).connect(g).connect(this.sfxBus)
    src.start(t, Math.random())
    src.stop(t + dur + 0.05)
  }

  play(s: Sfx) {
    if (!this.ctx || !this.enabled) return
    const t = this.ctx.currentTime + 0.005
    switch (s) {
      case 'hover': {
        const now = performance.now()
        if (now - this.lastHover < 60) return
        this.lastHover = now
        this.tone(2400, t, 0.04, 'sine', 0.025)
        break
      }
      case 'click': this.tone(1200, t, 0.05, 'triangle', 0.08, undefined, 700); break
      case 'type': this.tone(1800 + Math.random() * 400, t, 0.02, 'square', 0.012); break
      case 'success':
        ;[523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, t + i * 0.07, 0.35, 'triangle', 0.1))
        break
      case 'chime':
        ;[880, 1318.5].forEach((f, i) => this.tone(f, t + i * 0.09, 0.6, 'sine', 0.08))
        break
      case 'error':
        this.tone(160, t, 0.25, 'sawtooth', 0.06, undefined, 90)
        this.tone(166, t, 0.25, 'square', 0.03, undefined, 95)
        break
      case 'heartbeat':
        this.tone(58, t, 0.18, 'sine', 0.5, undefined, 40)
        this.tone(52, t + 0.24, 0.22, 'sine', 0.35, undefined, 36)
        break
      case 'impact':
        this.tone(90, t, 1.2, 'sine', 0.6, undefined, 28)
        this.noise(t, 0.6, 0.35, 'lowpass', 2400, 120)
        break
      case 'rumble': this.noise(t, 2.2, 0.25, 'lowpass', 180, 60, 0.5); break
      case 'glitch':
        for (let i = 0; i < 6; i++) this.tone(200 + Math.random() * 2400, t + i * 0.025, 0.03, 'square', 0.04)
        this.noise(t, 0.15, 0.08, 'bandpass', 3000, 800, 4)
        break
      case 'whoosh': this.noise(t, 0.9, 0.18, 'bandpass', 300, 4000, 1.5); break
      case 'reveal':
        ;[261.63, 392, 523.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, t + i * 0.05, 2.2, 'sine', 0.06))
        this.noise(t, 1.6, 0.05, 'highpass', 6000, 9000)
        break
      case 'levelup':
        ;[392, 523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => this.tone(f, t + i * 0.06, 0.5, 'triangle', 0.09))
        break
      case 'unlock':
        this.tone(660, t, 0.12, 'square', 0.04)
        this.tone(990, t + 0.1, 0.4, 'triangle', 0.09)
        break
      case 'hit':
        this.tone(220, t, 0.25, 'sawtooth', 0.12, undefined, 60)
        this.noise(t, 0.2, 0.25, 'highpass', 1500)
        this.tone(1320, t + 0.03, 0.3, 'triangle', 0.06)
        break
      case 'shield':
        this.tone(440, t, 0.5, 'sine', 0.06, undefined, 880)
        this.tone(660, t, 0.5, 'sine', 0.04, undefined, 1320)
        break
      case 'bossAttack':
        this.tone(70, t, 0.8, 'sawtooth', 0.15, undefined, 35)
        this.noise(t, 0.7, 0.2, 'lowpass', 800, 100)
        break
    }
  }

  // ───────── adaptive music ─────────

  music(state: MusicState) {
    if (state === this.musicState) return
    this.musicState = state
    if (!this.ctx) return
    const c = this.ctx
    const t = c.currentTime
    this.musicNodes?.stop(t)
    this.musicNodes = null
    if (state === 'off' || state === 'betrayal') return
    this.musicNodes = this.buildMusic(state)
  }

  private buildMusic(state: MusicState): { stop: (t: number) => void } {
    const c = this.ctx!
    const t = c.currentTime
    const out = c.createGain()
    out.gain.setValueAtTime(0.0001, t)
    out.gain.exponentialRampToValueAtTime(1, t + 2.5)
    const lp = c.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 900
    lp.Q.value = 0.7
    lp.connect(out).connect(this.musicBus)
    const nodes: AudioScheduledSourceNode[] = []
    const timers: number[] = []

    const preset: Record<string, { root: number; chord: number[]; type: OscillatorType; cutoff: number; lfo: number; pulse?: number; arp?: number[]; gain: number }> = {
      void: { root: 55, chord: [1, 1.5, 2.01], type: 'sine', cutoff: 420, lfo: 0.05, gain: 0.16 },
      golden: { root: 110, chord: [1, 1.25, 1.5, 2, 2.5], type: 'triangle', cutoff: 1800, lfo: 0.12, arp: [1, 1.25, 1.5, 2, 1.5, 1.25], gain: 0.09 },
      null: { root: 41.2, chord: [1, 1.06, 1.5, 2.12], type: 'sawtooth', cutoff: 380, lfo: 0.2, pulse: 1.1, gain: 0.08 },
      awaken: { root: 73.4, chord: [1, 1.5, 2, 3], type: 'triangle', cutoff: 900, lfo: 0.08, arp: [2, 3, 4, 3], gain: 0.09 },
      title: { root: 65.4, chord: [1, 1.5, 1.89, 2, 3], type: 'sawtooth', cutoff: 1100, lfo: 0.1, pulse: 0.5, arp: [2, 3, 3.78, 4, 3], gain: 0.07 },
      world: { root: 82.4, chord: [1, 1.5, 2, 2.52], type: 'triangle', cutoff: 700, lfo: 0.06, arp: [2, 3, 2.52, 4], gain: 0.07 },
      lab: { root: 98, chord: [1, 1.5, 2], type: 'sine', cutoff: 600, lfo: 0.05, gain: 0.08 },
      boss: { root: 49, chord: [1, 1.19, 1.5, 2], type: 'sawtooth', cutoff: 900, lfo: 0.5, pulse: 0.25, arp: [2, 2.38, 3, 4, 3, 2.38], gain: 0.07 },
      victory: { root: 130.8, chord: [1, 1.26, 1.5, 2], type: 'triangle', cutoff: 2200, lfo: 0.1, arp: [2, 2.52, 3, 4, 3, 2.52], gain: 0.08 },
    }
    const p = preset[state]
    lp.frequency.value = p.cutoff

    // Pad: detuned oscillators through a slowly breathing filter.
    for (const ratio of p.chord) {
      for (const det of [-6, 6]) {
        const o = c.createOscillator()
        o.type = p.type
        o.frequency.value = p.root * ratio
        o.detune.value = det
        const g = c.createGain()
        g.gain.value = p.gain / p.chord.length
        o.connect(g).connect(lp)
        o.start(t)
        nodes.push(o)
      }
    }
    const lfo = c.createOscillator()
    lfo.frequency.value = p.lfo
    const lfoGain = c.createGain()
    lfoGain.gain.value = p.cutoff * 0.5
    lfo.connect(lfoGain).connect(lp.frequency)
    lfo.start(t)
    nodes.push(lfo)

    // Sub pulse (heartbeat-like) for tense states.
    if (p.pulse) {
      const beat = () => {
        if (!this.ctx) return
        const tt = this.ctx.currentTime + 0.02
        const o = c.createOscillator()
        const g = c.createGain()
        o.frequency.setValueAtTime(p.root, tt)
        o.frequency.exponentialRampToValueAtTime(p.root * 0.6, tt + 0.3)
        g.gain.setValueAtTime(0.0001, tt)
        g.gain.exponentialRampToValueAtTime(0.25, tt + 0.01)
        g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.35)
        o.connect(g).connect(out)
        o.start(tt)
        o.stop(tt + 0.4)
      }
      timers.push(window.setInterval(beat, p.pulse * 1000))
    }

    // Gentle arpeggio.
    if (p.arp) {
      let i = 0
      const step = state === 'boss' ? 180 : 420
      const arpOut = c.createGain()
      arpOut.gain.value = 0.05
      const delay = c.createDelay()
      delay.delayTime.value = step / 1000 * 1.5
      const fb = c.createGain()
      fb.gain.value = 0.35
      arpOut.connect(out)
      arpOut.connect(delay).connect(fb).connect(delay)
      delay.connect(out)
      timers.push(window.setInterval(() => {
        if (!this.ctx) return
        const tt = this.ctx.currentTime + 0.02
        const f = p.root * 2 * p.arp![i++ % p.arp!.length]
        const o = c.createOscillator()
        const g = c.createGain()
        o.type = 'triangle'
        o.frequency.value = f
        g.gain.setValueAtTime(0.0001, tt)
        g.gain.exponentialRampToValueAtTime(0.7, tt + 0.01)
        g.gain.exponentialRampToValueAtTime(0.0001, tt + step / 1000 * 1.8)
        o.connect(g).connect(arpOut)
        o.start(tt)
        o.stop(tt + 1)
      }, step))
    }

    return {
      stop: (when: number) => {
        timers.forEach((id) => clearInterval(id))
        out.gain.cancelScheduledValues(when)
        out.gain.setValueAtTime(out.gain.value, when)
        out.gain.exponentialRampToValueAtTime(0.0001, when + 1.2)
        nodes.forEach((n) => { try { n.stop(when + 1.3) } catch { /* already stopped */ } })
      },
    }
  }
}

export const audio = new AudioEngine()
// Dev-only inspection hook for QA (e.g. checking that mute really suspends the context).
if (import.meta.env.DEV && typeof window !== 'undefined') (window as unknown as { __cvAudio: AudioEngine }).__cvAudio = audio

/** Optional narrator voice via the platform's speech synthesis (off by default). */
export function speak(textToSay: string, enabled: boolean) {
  if (!enabled || audio.muted || typeof speechSynthesis === 'undefined') return
  try {
    speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(textToSay)
    u.rate = 0.88
    u.pitch = 0.7
    u.volume = 0.9
    speechSynthesis.speak(u)
  } catch { /* speech unavailable */ }
}

export function stopSpeaking() {
  try { speechSynthesis?.cancel() } catch { /* ignore */ }
}

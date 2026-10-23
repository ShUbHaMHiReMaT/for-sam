import { useRef, useState, type ReactNode } from 'react'
import { Download, Trash2, Upload } from 'lucide-react'
import { useGame } from '../game/GameContext'
import { migrate } from '../game/state'
import { Button, Modal, Panel, SectionTitle } from '../components/ui'
import { Toggle } from '../labs/common'
import { speak } from '../audio/engine'

function Row({ label, desc, children }: { label: string; desc?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4 border-b border-white/5 last:border-0">
      <div><div className="text-bright text-sm">{label}</div>{desc && <div className="text-xs text-mist">{desc}</div>}</div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className={`w-12 h-7 rounded-full relative transition ${on ? 'bg-cyan/70' : 'bg-white/10'}`}>
      <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${on ? 'left-6' : 'left-1'}`} />
    </button>
  )
}

export default function Settings() {
  const { state, dispatch, sfx } = useGame()
  const s = state.settings
  const set = (patch: Partial<typeof s>) => dispatch({ type: 'settings', patch })
  const [confirm, setConfirm] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const file = useRef<HTMLInputElement>(null)

  const exportSave = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cipherverse-save-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setMsg('Save exported.')
  }
  const importSave = async (f: File) => {
    try {
      const data = JSON.parse(await f.text())
      if (typeof data !== 'object' || data === null || !('xp' in data)) throw new Error('Not a CIPHERVERSE save file.')
      dispatch({ type: 'import', state: migrate(data) })
      setMsg('Save imported.')
    } catch (e) {
      setMsg(`Import failed: ${(e as Error).message}`)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <SectionTitle kicker="Settings & accessibility" title="Configure the Cipherverse" />
      <Panel className="p-5 mb-5">
        <h2 className="hud text-sm text-cyan mb-1">Audio</h2>
        <Row label="Sound effects & music" desc="All audio is synthesised live. Nothing plays before you interact."><Switch label="Sound" on={s.sound} onChange={(v) => set({ sound: v })} /></Row>
        <Row label="Music"><Switch label="Music" on={s.music} onChange={(v) => set({ music: v })} /></Row>
        <Row label={`Master volume · ${Math.round(s.volume * 100)}%`}><input type="range" className="range w-48" min={0} max={1} step={0.05} value={s.volume} onChange={(e) => set({ volume: +e.target.value })} onMouseUp={() => sfx('chime')} aria-label="Master volume" /></Row>
        <Row label="Narrator voice" desc="Optional speech synthesis for the opening cinematic. Subtitles are always shown.">
          <div className="flex gap-2 items-center"><Switch label="Narrator voice" on={s.narrator} onChange={(v) => set({ narrator: v })} /><Button size="sm" disabled={!s.sound} title={s.sound ? 'Play a sample' : 'Turn sound on to test'} onClick={() => speak('Every secret has a key. Every key has a cost.', true)}>Test</Button></div>
        </Row>
      </Panel>
      <Panel className="p-5 mb-5">
        <h2 className="hud text-sm text-cyan mb-1">Motion & visuals</h2>
        <Row label="Motion" desc="“System” follows your operating system’s reduced-motion preference."><Toggle label="Motion" value={s.motion} onChange={(v) => set({ motion: v })} options={[{ id: 'system', label: 'System' }, { id: 'reduced', label: 'Reduced' }, { id: 'full', label: 'Full' }]} /></Row>
        <Row label="Screen shake" desc="Used sparingly for major impacts."><Switch label="Screen shake" on={s.screenShake} onChange={(v) => set({ screenShake: v })} /></Row>
        <Row label="High contrast" desc="Stronger borders and text, no film grain."><Switch label="High contrast" on={s.highContrast} onChange={(v) => set({ highContrast: v })} /></Row>
        <Row label="Subtitle size"><Toggle label="Subtitle size" value={s.subtitles} onChange={(v) => set({ subtitles: v })} options={[{ id: 'normal', label: 'Normal' }, { id: 'large', label: 'Large' }]} /></Row>
        <Row label="Dialogue text speed"><Toggle label="Text speed" value={s.textSpeed} onChange={(v) => set({ textSpeed: v })} options={[{ id: 'slow', label: 'Slow' }, { id: 'normal', label: 'Normal' }, { id: 'instant', label: 'Instant' }]} /></Row>
      </Panel>
      <Panel className="p-5">
        <h2 className="hud text-sm text-cyan mb-1">Save data</h2>
        <p className="text-sm text-mist">Guest mode: your progress is saved automatically in this browser only (localStorage). No account, no server, and no plaintext or keys from the labs ever leave your device.</p>
        <div className="flex flex-wrap gap-2 mt-4">
          <Button onClick={exportSave}><Download size={14} /> Export save</Button>
          <Button onClick={() => file.current?.click()}><Upload size={14} /> Import save</Button>
          <input ref={file} type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && importSave(e.target.files[0])} />
          <Button accent="var(--color-crimson)" onClick={() => setConfirm(true)}><Trash2 size={14} /> Reset progress</Button>
        </div>
        {msg && <p className="text-sm text-jade mt-3" role="status">{msg}</p>}
      </Panel>
      <Modal open={confirm} onClose={() => setConfirm(false)} title="Reset all progress?" accent="var(--color-crimson)">
        <p className="text-ink text-sm">This erases XP, missions, mastery, achievements and lore on this device. Settings are kept. Consider exporting a save first.</p>
        <div className="flex justify-end gap-2 mt-6">
          <Button onClick={() => setConfirm(false)}>Cancel</Button>
          <Button variant="primary" accent="var(--color-crimson)" onClick={() => { dispatch({ type: 'reset' }); setConfirm(false); setMsg('Progress reset.') }}>Erase progress</Button>
        </div>
      </Modal>
    </div>
  )
}

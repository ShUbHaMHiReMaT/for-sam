import { Component, type ErrorInfo, type ReactNode } from 'react'

interface State { error: Error | null }

/**
 * Catches render errors so a failure never leaves a blank screen. A failed
 * lazy-chunk load (e.g. after a redeploy) triggers one automatic reload.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[CIPHERVERSE] render error', error, info.componentStack)
    const chunk = /dynamically imported module|Loading chunk|Importing a module script failed/i.test(error.message)
    try {
      if (chunk && !sessionStorage.getItem('cv-chunk-reload')) {
        sessionStorage.setItem('cv-chunk-reload', '1')
        location.reload()
      }
    } catch { /* storage unavailable */ }
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="min-h-[60vh] grid place-items-center p-6">
        <div className="panel p-8 max-w-md text-center">
          <div className="hud text-crimson text-xs">Signal corrupted</div>
          <h1 className="font-display text-2xl text-bright mt-2">Something broke in the Cipherverse</h1>
          <p className="text-mist text-sm mt-2">Your progress is saved. Reloading usually repairs the connection.</p>
          <pre className="text-[11px] text-crimson/80 mt-3 whitespace-pre-wrap break-words">{this.state.error.message}</pre>
          <div className="flex justify-center gap-2 mt-5">
            <button className="btn btn-primary" onClick={() => { try { sessionStorage.removeItem('cv-chunk-reload') } catch { /* ignore */ } location.reload() }}>Reload</button>
            <button className="btn" onClick={() => { this.setState({ error: null }); location.hash = '#/map' }}>World Map</button>
          </div>
        </div>
      </div>
    )
  }
}

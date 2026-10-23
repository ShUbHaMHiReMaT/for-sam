import { lazy, Suspense, useEffect, type ReactElement } from 'react'
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { GameProvider, useGame } from './game/GameContext'
import { Shell } from './components/Shell'
import { Loading, Toasts } from './components/ui'
import { ErrorBoundary } from './components/ErrorBoundary'

const Intro = lazy(() => import('./pages/Intro'))
const CharacterCreate = lazy(() => import('./pages/CharacterCreate'))
const WorldMap = lazy(() => import('./pages/WorldMap'))
const Campaign = lazy(() => import('./pages/Campaign'))
const MissionPlayer = lazy(() => import('./pages/MissionPlayer'))
const BossPage = lazy(() => import('./pages/BossPage'))
const Codex = lazy(() => import('./pages/Codex'))
const Encyclopedia = lazy(() => import('./pages/Encyclopedia'))
const LabHub = lazy(() => import('./pages/LabHub'))
const SkillTree = lazy(() => import('./pages/SkillTree'))
const Achievements = lazy(() => import('./pages/Achievements'))
const Daily = lazy(() => import('./pages/Daily'))
const Profile = lazy(() => import('./pages/Profile'))
const Settings = lazy(() => import('./pages/Settings'))
const Archives = lazy(() => import('./pages/Archives'))
const Ending = lazy(() => import('./pages/Ending'))
const Practice = lazy(() => import('./pages/Practice'))

const NO_SHELL = ['/', '/create', '/ending']

function RouteTracker() {
  const loc = useLocation()
  const { dispatch, music } = useGame()
  useEffect(() => {
    const p = loc.pathname
    if (!NO_SHELL.includes(p) && !p.startsWith('/boss')) dispatch({ type: 'route', path: p })
    if (p.startsWith('/lab') || p.startsWith('/encyclopedia') || p.startsWith('/practice')) music('lab')
    else if (p === '/map' || p === '/campaign' || p === '/codex' || p === '/archives' || p === '/skills' || p === '/achievements' || p === '/profile' || p === '/daily' || p === '/settings') music('world')
    window.scrollTo(0, 0)
  }, [loc.pathname, dispatch, music])
  return null
}

function Guarded({ children }: { children: ReactElement }) {
  const { state } = useGame()
  if (!state.created) return <Navigate to="/create" replace />
  return children
}

function Routed() {
  const loc = useLocation()
  const shell = !NO_SHELL.includes(loc.pathname)
  const routes = (
    <ErrorBoundary key={loc.pathname}>
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/" element={<Intro />} />
        <Route path="/create" element={<CharacterCreate />} />
        <Route path="/map" element={<Guarded><WorldMap /></Guarded>} />
        <Route path="/campaign" element={<Guarded><Campaign /></Guarded>} />
        <Route path="/mission/:id" element={<Guarded><MissionPlayer /></Guarded>} />
        <Route path="/boss/:id" element={<Guarded><BossPage /></Guarded>} />
        <Route path="/codex" element={<Codex />} />
        <Route path="/encyclopedia" element={<Encyclopedia />} />
        <Route path="/encyclopedia/:id" element={<Encyclopedia />} />
        <Route path="/lab" element={<LabHub />} />
        <Route path="/lab/:id" element={<LabHub />} />
        <Route path="/practice" element={<Practice />} />
        <Route path="/skills" element={<SkillTree />} />
        <Route path="/achievements" element={<Achievements />} />
        <Route path="/daily" element={<Guarded><Daily /></Guarded>} />
        <Route path="/profile" element={<Guarded><Profile /></Guarded>} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/archives" element={<Archives />} />
        <Route path="/ending" element={<Guarded><Ending /></Guarded>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
    </ErrorBoundary>
  )
  return shell ? <Shell>{routes}</Shell> : routes
}

export default function App() {
  return (
    <GameProvider>
      <HashRouter>
        <RouteTracker />
        <Routed />
        <Toasts />
      </HashRouter>
    </GameProvider>
  )
}

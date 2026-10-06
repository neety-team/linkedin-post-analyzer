import { Routes, Route, Link, useLocation } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import CreatorDetail from './pages/CreatorDetail'
import OutlierExplorer from './pages/OutlierExplorer'
import Ideas from './pages/Ideas'
import Swipe from './pages/Swipe'
import Inspiration from './pages/Inspiration'
import Accounts from './pages/Accounts'

export default function App() {
  const location = useLocation();
  const navLink = (to: string, label: string) => {
    const active = location.pathname === to;
    return (
      <Link
        to={to}
        className={`px-2 py-1 rounded-md transition-colors text-xs whitespace-nowrap ${active ? 'text-accent font-medium bg-accent/10' : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'}`}
      >
        {label}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-bg-primary">
      <nav className="border-b border-border px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-accent">
            LinkedIn Outlier Analyzer
          </Link>
          <div className="flex items-center gap-1 text-sm">
            {/* Analyze */}
            <div className="flex gap-1 px-2 py-1 rounded-lg bg-bg-secondary/50">
              {navLink('/', '📊 Dashboard')}
              {navLink('/accounts', '📈 Accounts')}
              {navLink('/explore', '🔍 Explorer')}
            </div>
            <span className="text-border mx-1">|</span>
            {/* Create */}
            <div className="flex gap-1 px-2 py-1 rounded-lg bg-bg-secondary/50">
              {navLink('/swipe', '🔥 Swipe')}
              {navLink('/ideas', '💡 Ideas')}
              {navLink('/inspiration', '✨ Inspiration')}
            </div>
            {/* Post Creator y Network se retiraron el 2026-10-06 (Iker): los
                posts se escriben por Claude Code y los feeds de los jefes se
                miran en sus propios navegadores. Del creador se salvo solo el
                LinkedIn Preview, que vive en Accounts (boton arriba a la
                derecha). El backend (chat, network) sigue intacto: el prompt
                del chat es el cerebro en produccion y el perfil de comentarista
                lo leen el generador de respuestas y el de rastro. */}
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-6 py-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/accounts" element={<Accounts />} />
          <Route path="/creator/:id" element={<CreatorDetail />} />
          <Route path="/explore" element={<OutlierExplorer />} />
          <Route path="/swipe" element={<Swipe />} />
          <Route path="/ideas" element={<Ideas />} />
          <Route path="/inspiration" element={<Inspiration />} />
        </Routes>
      </main>
    </div>
  )
}

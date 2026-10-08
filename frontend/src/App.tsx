import { Routes, Route, Link, useLocation } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import CreatorDetail from './pages/CreatorDetail'
import OutlierExplorer from './pages/OutlierExplorer'
import Ideas from './pages/Ideas'
import Swipe from './pages/Swipe'
import Inspiration from './pages/Inspiration'
import Accounts from './pages/Accounts'
import { useTheme } from './theme'

export default function App() {
  const location = useLocation();
  const { theme, toggle } = useTheme();
  const navLink = (to: string, label: string) => {
    const active = location.pathname === to;
    return (
      <Link
        to={to}
        aria-current={active ? 'page' : undefined}
        className={`px-3 py-1.5 rounded-full transition-colors text-[13px] whitespace-nowrap ${active ? 'text-accent font-semibold bg-accent/10' : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'}`}
      >
        {label}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header sticky (08-oct-2026). Su contenido usa el MISMO contenedor que
          <main> (max-w-7xl + px-6 dentro): antes el padding iba fuera y el
          header quedaba 24 px más ancho que la página a cada lado. */}
      <header className="sticky top-0 z-40 border-b border-border bg-bg-primary/90 backdrop-blur-md">
        <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-6">
          <Link to="/" className="flex items-center gap-3 shrink-0" aria-label="Neety · Analizador de outliers">
            <img src="/neety-logo.svg" alt="Neety" className="h-6 w-auto block" />
            <span className="h-5 w-px bg-border" aria-hidden="true" />
            <span className="font-display text-[17px] font-medium tracking-tight text-text-primary whitespace-nowrap">
              Analizador de outliers
            </span>
          </Link>
          <div className="flex items-center gap-2 text-sm overflow-x-auto">
            {/* Analizar */}
            <div className="flex gap-0.5 p-1 rounded-full bg-bg-card border border-border shadow-sm">
              {navLink('/', '📊 Panel')}
              {navLink('/accounts', '📈 Cuentas')}
              {navLink('/explore', '🔍 Explorador')}
            </div>
            {/* Crear */}
            <div className="flex gap-0.5 p-1 rounded-full bg-bg-card border border-border shadow-sm">
              {navLink('/swipe', '🔥 Swipe')}
              {navLink('/ideas', '💡 Ideas')}
              {navLink('/inspiration', '✨ Inspiración')}
            </div>
            <button
              type="button"
              onClick={toggle}
              title={theme === 'dark' ? 'Pasar a modo claro' : 'Pasar a modo oscuro'}
              aria-label={theme === 'dark' ? 'Pasar a modo claro' : 'Pasar a modo oscuro'}
              className="shrink-0 w-10 h-10 grid place-items-center rounded-full bg-bg-card border border-border shadow-sm text-text-secondary hover:text-accent hover:border-accent/40 transition-colors"
            >
              {theme === 'dark' ? (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="4.2" />
                  <path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6" />
                </svg>
              ) : (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7Z" />
                </svg>
              )}
            </button>
            {/* Post Creator y Network se retiraron el 2026-10-06 (Iker): los
                posts se escriben por Claude Code y los feeds de los jefes se
                miran en sus propios navegadores. Del creador se salvo solo el
                LinkedIn Preview, que vive en Accounts (boton arriba a la
                derecha). El backend (chat, network) sigue intacto: el prompt
                del chat es el cerebro en produccion y el perfil de comentarista
                lo leen el generador de respuestas y el de rastro. */}
          </div>
        </nav>
      </header>
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

import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const NAV_ITEMS = [
  { to: '/',         label: 'Início',   emoji: '🏠' },
  { to: '/crushes',  label: 'Crushes',  emoji: '💘' },
  { to: '/timeline', label: 'Timeline', emoji: '📅' },
  { to: '/profile',  label: 'Perfil',   emoji: '👤' },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const { session } = useAuth()

  function isActive(to: string) {
    if (to === '/') return location.pathname === '/'
    if (to === '/crushes') return location.pathname === '/crushes' || location.pathname.startsWith('/crushes/')
    return location.pathname.startsWith(to)
  }

  return (
    <div className="min-h-screen bg-crush-bg flex">
      {/* Sidebar — desktop only */}
      <aside className="hidden md:flex flex-col w-56 border-r border-crush-border bg-crush-card fixed left-0 top-0 bottom-0 z-40">
        <div className="p-4 border-b border-crush-border flex items-center gap-3">
          <img
            src="icon.png"
            alt="CrushDex"
            style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0 }}
          />
          <div>
            <h1 className="text-white font-black text-lg leading-tight tracking-tight">CrushDex</h1>
            <p className="text-crush-muted text-[10px] leading-tight mt-0.5">Seu pokédex de crushes</p>
          </div>
        </div>

        <nav className="flex-1 p-3 flex flex-col gap-1 overflow-y-auto">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors
                ${isActive(item.to)
                  ? 'bg-crush-pink text-white'
                  : 'text-crush-muted hover:bg-crush-border hover:text-white'
                }`}
            >
              <span className="text-base">{item.emoji}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-crush-border">
          <p className="text-crush-muted text-xs truncate">{session?.user.email}</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 md:ml-56 pb-20 md:pb-0 min-h-screen overflow-x-hidden">
        {children}
      </main>

      {/* Bottom nav — mobile only */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-crush-card border-t border-crush-border flex z-50">
        {NAV_ITEMS.map(item => (
          <Link
            key={item.to}
            to={item.to}
            className={`flex-1 flex flex-col items-center justify-center py-2 text-xs gap-0.5 transition-colors
              ${isActive(item.to) ? 'text-crush-pink' : 'text-crush-muted'}`}
          >
            <span className="text-xl leading-tight">{item.emoji}</span>
            <span className="text-[10px]">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}

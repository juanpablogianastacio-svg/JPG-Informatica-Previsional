import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { BookOpen, Calculator, LayoutDashboard, LogOut, Menu, Scale, Settings, Users } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider.jsx';
import { useApp } from '../store/AppStore.jsx';
import AppLogo from './AppLogo.jsx';
import PoweredBy from './PoweredBy.jsx';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/consultantes', label: 'Consultantes', icon: Users },
  { to: '/regimenes', label: 'Regímenes', icon: Calculator },
  { to: '/casos', label: 'Casos de reajuste', icon: Scale },
  { to: '/normativa', label: 'Biblioteca normativa', icon: BookOpen },
  { to: '/configuracion', label: 'Configuración', icon: Settings },
];

function Nav({ onNavigate }) {
  return (
    <nav aria-label="Principal">
      {NAV.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onNavigate}>
          <Icon size={20} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const { settings } = useApp();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname]);

  return (
    <div className="app-shell">
      <header className="app-header">
        <button className="icon-btn menu-btn" onClick={() => setOpen(true)} aria-label="Abrir menú">
          <Menu size={22} />
        </button>
        <AppLogo />
        <div className="min-w-0 flex-1">
          <div className="font-medium text-[17px] truncate" style={{ color: '#202124' }}>
            JPG Informática Previsional
          </div>
          {settings.nombre_estudio && <div className="muted text-xs truncate">{settings.nombre_estudio}</div>}
        </div>
        <div className="hidden sm:block text-right mr-1">
          <div className="text-sm font-medium">{user?.nombre}</div>
          <div className="muted text-xs">{user?.email}</div>
        </div>
        <button className="icon-btn" onClick={logout} title="Cerrar sesión" aria-label="Cerrar sesión">
          <LogOut size={20} />
        </button>
      </header>

      <div className="app-body">
        <aside className="sidebar">
          <Nav />
        </aside>
        <main className="main">
          <Outlet />
        </main>
      </div>

      {open && (
        <>
          <div className="drawer-backdrop" onClick={() => setOpen(false)} />
          <div className="drawer" role="dialog" aria-label="Menú">
            <div className="flex items-center gap-3 px-6 py-3 mb-2">
              <AppLogo size={32} />
              <span className="font-medium">JPG Informática Previsional</span>
            </div>
            <div className="pr-3">
              <Nav onNavigate={() => setOpen(false)} />
            </div>
          </div>
        </>
      )}

      <PoweredBy />
    </div>
  );
}

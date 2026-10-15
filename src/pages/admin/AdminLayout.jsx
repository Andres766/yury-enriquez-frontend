import { useEffect, useState } from 'react';
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import { LogoMark } from '../../components/layout/Logo.jsx';
import { cx } from '../../components/ui/index.jsx';

const NAV = [
  {
    to: '/admin',
    end: true,
    label: 'Resumen',
    icon: 'M4 12h6V4H4v8Zm0 8h6v-6H4v6Zm10 0h6V12h-6v8Zm0-16v6h6V4h-6Z',
  },
  {
    to: '/admin/reservas',
    label: 'Reservas',
    icon: 'M4.5 6.5h15v13h-15zM4.5 10.5h15M8.5 3.5v3M15.5 3.5v3',
  },
  {
    to: '/admin/agenda',
    label: 'Agenda y horarios',
    icon: 'M12 7v5l3.2 2M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Z',
  },
  {
    to: '/admin/servicios',
    label: 'Servicios',
    icon: 'M12 3.5 14.4 9l5.6.5-4.3 3.9 1.3 5.6L12 16l-5 3 1.3-5.6L4 9.5 9.6 9z',
  },
  {
    to: '/admin/ocasiones',
    label: 'Ocasiones',
    icon: 'M4.5 7.5h15v12h-15zM8 7.5V5.5a4 4 0 0 1 8 0v2',
  },
  {
    to: '/admin/promociones',
    label: 'Promociones',
    icon: 'M3.5 12 12 3.5h8v8L11.5 20zM16 8h.01',
  },
  {
    to: '/admin/testimonios',
    label: 'Testimonios',
    icon: 'M5 5.5h14v10H9.5L5 19.5z',
  },
  {
    to: '/admin/fidelidad',
    label: 'Fidelidad',
    icon: 'M12 20s-7-4.4-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.6-7 9-7 9Z',
  },
  {
    to: '/admin/ajustes',
    label: 'Ajustes',
    icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 13a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1v.3a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-2.8-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 4.5 12H4a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.1-2.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 2.7-1.1V1a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.8 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7h.3a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.2 1.3Z',
  },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const settings = useSettings();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [location.pathname]);

  const navLink = ({ isActive }) =>
    cx(
      'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors',
      isActive ? 'bg-brand-600 text-on-brand shadow-soft' : 'text-ink-600 hover:bg-blush hover:text-brand-800',
    );

  const navContent = (
    <nav aria-label="Secciones del panel" className="space-y-1">
      {NAV.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.end} className={navLink}>
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0" fill="none" aria-hidden="true">
            <path d={item.icon} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-cream">
      {/* Barra superior */}
      <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[90rem] items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="admin-nav-movil"
              aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-line text-ink-600 transition hover:bg-blush lg:hidden"
            >
              <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden="true">
                <path d={open ? 'M5 5l10 10M15 5L5 15' : 'M3 6h14M3 10h14M3 14h14'} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>

            <Link to="/admin" className="flex items-center gap-2.5">
              <LogoMark className="h-8 w-8 text-brand-500" />
              <span className="hidden flex-col leading-none sm:flex">
                <span className="font-display text-lg text-ink-800">{settings.brandName}</span>
                <span className="mt-0.5 text-[10px] uppercase tracking-widest text-ink-400">
                  Panel de administración
                </span>
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="hidden rounded-full border border-line px-4 py-2 text-xs font-medium text-ink-600 transition hover:bg-blush sm:inline-block"
            >
              Ver la web
            </Link>
            <span className="hidden text-sm text-ink-500 md:inline">{user.fullName}</span>
            <button
              type="button"
              onClick={logout}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-ink-500 transition hover:bg-blush hover:text-brand-700"
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
            >
              <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden="true">
                <path
                  d="M12.5 6.5V5a1.5 1.5 0 0 0-1.5-1.5H5A1.5 1.5 0 0 0 3.5 5v10A1.5 1.5 0 0 0 5 16.5h6a1.5 1.5 0 0 0 1.5-1.5v-1.5M9 10h8m0 0-2.5-2.5M17 10l-2.5 2.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>

        {open && (
          <div id="admin-nav-movil" className="border-t border-line bg-surface px-4 py-3 lg:hidden">
            {navContent}
          </div>
        )}
      </header>

      <div className="mx-auto flex max-w-[90rem] gap-8 px-4 py-8 sm:px-6">
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-24">{navContent}</div>
        </aside>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

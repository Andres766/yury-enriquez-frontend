import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import { Button, cx } from '../ui/index.jsx';
import { Wordmark } from './Logo.jsx';
import UserMenu from './UserMenu.jsx';
import { Cobweb } from '../seasonal/HalloweenIcons.jsx';

/**
 * Navegación principal.
 *
 * Estructura: marca a la izquierda, secciones al centro y acciones a la
 * derecha, con la reserva como única llamada a la acción sólida — es lo
 * que el negocio quiere que se pulse, así que no compite con ningún otro
 * botón del mismo peso visual.
 *
 * Accesibilidad:
 *   · la sección activa se marca con `aria-current="page"` (lo pone
 *     NavLink) además del subrayado, que por sí solo no basta
 *   · el menú móvil declara `aria-expanded`/`aria-controls`, cierra con
 *     Escape, devuelve el foco al botón y bloquea el desplazamiento
 *   · el menú de cuenta sigue el patrón de menú de la WAI (UserMenu)
 *   · todas las zonas táctiles llegan a 44 px de alto
 */

const LINKS = [
  { to: '/', label: 'Inicio', end: true },
  { to: '/servicios', label: 'Servicios' },
  { to: '/ocasiones', label: 'Ocasiones' },
  { to: '/contacto', label: 'Contacto' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const { isAuthenticated } = useAuth();
  const settings = useSettings();
  const location = useLocation();
  const reduced = useReducedMotion();

  const toggleRef = useRef(null);
  const panelRef = useRef(null);

  const halloween = settings.theme === 'HALLOWEEN';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Al cambiar de página, el menú se cierra.
  useEffect(() => setOpen(false), [location.pathname]);

  useEffect(() => {
    if (!open) return undefined;

    const onKey = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    panelRef.current?.querySelector('a, button')?.focus();

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  const desktopLink = ({ isActive }) =>
    cx(
      'relative px-1 py-2 text-sm font-medium transition-colors',
      isActive ? 'text-brand-700' : 'text-ink-600 hover:text-brand-700',
    );

  return (
    <header
      className={cx(
        'sticky top-0 z-50 transition-all duration-300',
        scrolled
          ? 'border-b border-line bg-cream/90 shadow-soft backdrop-blur-md'
          : 'border-b border-transparent bg-transparent',
      )}
    >
      {/* Telaraña colgando de la esquina, solo en temporada */}
      {halloween && (
        <Cobweb className="pointer-events-none absolute left-0 top-0 h-16 w-16 text-brand-400/25 sm:h-20 sm:w-20" />
      )}

      <nav
        className="container-page relative flex h-[72px] items-center justify-between gap-4"
        aria-label="Principal"
      >
        <Link to="/" className="shrink-0 rounded-lg" aria-label={`${settings.brandName}, ir al inicio`}>
          <Wordmark brandName={settings.brandName} tagline={settings.tagline} compact={scrolled} />
        </Link>

        {/* ── Secciones (escritorio) ─────────────────────────────── */}
        <ul className="hidden items-center gap-7 lg:flex">
          {LINKS.map((link) => (
            <li key={link.to}>
              <NavLink to={link.to} end={link.end} className={desktopLink}>
                {({ isActive }) => (
                  <>
                    {link.label}
                    {isActive && (
                      <motion.span
                        layoutId="nav-underline"
                        className="absolute inset-x-0 -bottom-0.5 h-px bg-brand-500"
                        transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>

        {/* ── Acciones (escritorio) ──────────────────────────────── */}
        <div className="hidden items-center gap-3 lg:flex">
          <NavLink
            to="/mi-reserva"
            className={({ isActive }) =>
              cx(
                'flex items-center gap-1.5 text-sm font-medium transition-colors',
                isActive ? 'text-brand-700' : 'text-ink-500 hover:text-brand-700',
              )
            }
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
              <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" />
              <path d="m13.5 13.5 3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Mi reserva
          </NavLink>

          <span className="h-5 w-px bg-line" aria-hidden="true" />

          {isAuthenticated ? (
            <UserMenu />
          ) : (
            <Button to="/ingresar" variant="ghost" size="sm">
              Ingresar
            </Button>
          )}

          <Button to="/reservar" size="sm">
            Reservar cita
          </Button>
        </div>

        {/* ── Acciones (móvil) ───────────────────────────────────── */}
        <div className="flex items-center gap-2 lg:hidden">
          <Button to="/reservar" size="sm" className="px-4">
            Reservar
          </Button>

          <button
            ref={toggleRef}
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="menu-movil"
            aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-ink-700 shadow-soft transition hover:bg-blush"
          >
            <svg viewBox="0 0 22 22" className="h-5 w-5" fill="none" aria-hidden="true">
              <motion.path
                d="M3 6h16"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                animate={open ? { d: 'M5 5l12 12' } : { d: 'M3 6h16' }}
                transition={{ duration: 0.25 }}
              />
              <motion.path
                d="M3 11h16"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                animate={{ opacity: open ? 0 : 1 }}
                transition={{ duration: 0.15 }}
              />
              <motion.path
                d="M3 16h16"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                animate={open ? { d: 'M5 17l12-12' } : { d: 'M3 16h16' }}
                transition={{ duration: 0.25 }}
              />
            </svg>
          </button>
        </div>
      </nav>

      {/* ── Panel móvil ──────────────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 top-[72px] z-40 bg-scrim/30 backdrop-blur-sm lg:hidden"
              aria-hidden="true"
            />

            <motion.div
              id="menu-movil"
              ref={panelRef}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, y: -12 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="absolute inset-x-0 z-50 border-b border-line bg-cream px-5 pb-7 pt-3 shadow-lift lg:hidden"
            >
              <ul className="flex flex-col">
                {[...LINKS, { to: '/mi-reserva', label: 'Consultar mi reserva' }].map((link) => (
                  <li key={link.to}>
                    <NavLink
                      to={link.to}
                      end={link.end}
                      className={({ isActive }) =>
                        cx(
                          'flex min-h-[52px] items-center justify-between border-b border-line/70 text-[15px] font-medium transition',
                          isActive ? 'text-brand-700' : 'text-ink-700',
                        )
                      }
                    >
                      {link.label}
                      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-ink-400" fill="none" aria-hidden="true">
                        <path
                          d="M6 3.5 10.5 8 6 12.5"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </NavLink>
                  </li>
                ))}
              </ul>

              <div className="mt-5 flex flex-col gap-2.5">
                {isAuthenticated ? (
                  <MobileAccountLinks onNavigate={() => setOpen(false)} />
                ) : (
                  <>
                    <Button to="/ingresar" variant="secondary" size="md" className="w-full">
                      Ingresar
                    </Button>
                    <Button to="/registro" variant="ghost" size="md" className="w-full">
                      Crear cuenta
                    </Button>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}

/** Bloque de cuenta dentro del menú móvil. */
function MobileAccountLinks({ onNavigate }) {
  const { user, isAdmin, logout } = useAuth();

  return (
    <>
      <div className="mb-1 flex items-center gap-3 rounded-2xl bg-blush px-4 py-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600 font-display text-on-brand"
          aria-hidden="true"
        >
          {user.fullName.charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-ink-800">{user.fullName}</span>
          <span className="block truncate text-xs text-ink-500">{user.email}</span>
        </span>
      </div>

      {isAdmin && (
        <Button to="/admin" variant="secondary" size="md" className="w-full" onClick={onNavigate}>
          Panel de administración
        </Button>
      )}
      <Button to="/mi-cuenta" variant="secondary" size="md" className="w-full" onClick={onNavigate}>
        Mis citas y tarjeta
      </Button>
      <Button onClick={logout} variant="ghost" size="md" className="w-full">
        Cerrar sesión
      </Button>
    </>
  );
}

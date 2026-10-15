import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, useLocation, useMatch } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import { whatsappLink } from '../../lib/format.js';
import { Button, cx } from '../ui/index.jsx';
import { Wordmark } from './Logo.jsx';
import UserMenu from './UserMenu.jsx';
import WhatsAppIcon from '../home/WhatsAppIcon.jsx';
import { firstName, instagramHandle } from '../home/contactInfo.js';

/**
 * Navegación principal.
 *
 * Estructura: marca a la izquierda, secciones al centro y acciones a la
 * derecha, con la reserva como única llamada a la acción sólida — es lo
 * que el negocio quiere que se pulse, así que no compite con ningún otro
 * botón del mismo peso visual.
 *
 * El "Reservar" de la barra sigue a la página: en la ficha de un
 * servicio lleva ese servicio ya elegido, y en /reservar no se muestra
 * (ya estás ahí).
 *
 * Accesibilidad:
 *   · la sección activa se marca con `aria-current="page"` (lo pone
 *     NavLink) además del subrayado, que por sí solo no basta
 *   · el menú móvil declara `aria-expanded`/`aria-controls`, cierra con
 *     Escape, devuelve el foco al botón, bloquea el desplazamiento y no
 *     deja que Tab se escape a la página de atrás
 *   · el menú de cuenta sigue el patrón de menú de la WAI (UserMenu)
 *   · todas las zonas táctiles llegan a 44 px de alto
 */

const LINKS = [
  { to: '/', label: 'Inicio', end: true },
  { to: '/trabajos', label: 'Mi trabajo' },
  { to: '/servicios', label: 'Servicios' },
  { to: '/ocasiones', label: 'Ocasiones' },
  { to: '/contacto', label: 'Contacto' },
];

const FOCUSABLE = 'a[href], button:not([disabled])';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [scrimTop, setScrimTop] = useState(72);

  const { isAuthenticated } = useAuth();
  const settings = useSettings();
  const location = useLocation();
  const reduced = useReducedMotion();

  const headerRef = useRef(null);
  const toggleRef = useRef(null);
  const panelRef = useRef(null);

  const serviceMatch = useMatch('/servicios/:slug');
  const onBooking = Boolean(useMatch('/reservar'));
  const bookingTo = serviceMatch
    ? `/reservar?servicio=${encodeURIComponent(serviceMatch.params.slug)}`
    : '/reservar';

  const number = settings.whatsappNumber || settings.contactPhone;
  const handle = instagramHandle(settings.instagramUrl);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Al cambiar de página, el menú se cierra.
  useEffect(() => setOpen(false), [location.pathname, location.search]);

  useEffect(() => {
    if (!open) return undefined;

    // El fondo oscuro empieza justo debajo de la cabecera, que no siempre
    // está a 72 px del borde: en temporada la franja de arriba la empuja.
    setScrimTop(Math.max(0, headerRef.current?.getBoundingClientRect().bottom ?? 72));

    const onKey = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        toggleRef.current?.focus();
        return;
      }
      if (event.key !== 'Tab') return;

      // Trampa de foco: la cabecera (marca, Reservar, cerrar) y el panel.
      const focusables = [...(headerRef.current?.querySelectorAll(FOCUSABLE) ?? [])].filter(
        (el) => el.getClientRects().length > 0,
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    panelRef.current?.querySelector(FOCUSABLE)?.focus();

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
      ref={headerRef}
      className={cx(
        // El fondo y el desenfoque van en un pseudo-elemento y no en el
        // <header>: un `backdrop-filter` en el header lo vuelve el bloque
        // contenedor de sus hijos `fixed`, y el fondo oscuro del menú
        // quedaba encerrado en 72 px sin oscurecer nada.
        'sticky top-0 border-b transition-[border-color,box-shadow] duration-300',
        "before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:transition-colors before:duration-300 before:content-['']",
        open ? 'z-[80]' : 'z-50',
        scrolled
          ? 'border-line shadow-soft before:bg-cream/90 before:backdrop-blur-md'
          : 'border-transparent before:bg-transparent',
      )}
    >
      <nav
        className="container-page relative flex h-[72px] items-center justify-between gap-3 sm:gap-4"
        aria-label="Principal"
      >
        <Link to="/" className="shrink-0 rounded-lg" aria-label={`${settings.brandName}, ir al inicio`}>
          <Wordmark brandName={settings.brandName} tagline={settings.tagline} compact={scrolled} monogram={false} />
        </Link>

        {/* ── Secciones (escritorio) ─────────────────────────────── */}
        <ul className="hidden items-center gap-5 lg:flex xl:gap-7">
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
            {/* Calendario y no lupa: la lupa se leía como un buscador */}
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
              <rect x="2.8" y="4" width="14.4" height="13.2" rx="2.4" stroke="currentColor" strokeWidth="1.4" />
              <path d="M2.8 8h14.4M6.8 2.6v2.8M13.2 2.6v2.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
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

          {!onBooking && (
            <Button to={bookingTo} size="sm">
              Reservar mi cita
            </Button>
          )}
        </div>

        {/* ── Acciones (móvil) ───────────────────────────────────── */}
        <div className="flex items-center gap-2 lg:hidden">
          {!onBooking && (
            <Button to={bookingTo} size="sm" className="h-11">
              Reservar
            </Button>
          )}

          <button
            ref={toggleRef}
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="menu-movil"
            aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink-700 shadow-soft transition hover:bg-blush"
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
      {/* El fondo oscuro se pinta en <body>, por debajo de la cabecera
          (z-75 contra z-80) y por encima del botón flotante de WhatsApp. */}
      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              key="velo-menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              style={{ top: scrimTop }}
              className="fixed inset-x-0 bottom-0 z-[75] bg-scrim/30 backdrop-blur-sm lg:hidden"
              aria-hidden="true"
            />
          )}
        </AnimatePresence>,
        document.body,
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            id="menu-movil"
            ref={panelRef}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -12 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            // Alto disponible desde el borde real de la cabecera: con la
            // franja de temporada arriba, un tope fijo de 100svh-72px dejaba
            // los últimos enlaces fuera de la pantalla y, con el scroll de la
            // página bloqueado, no había cómo llegar a ellos.
            style={{ maxHeight: `calc(100svh - ${scrimTop}px)` }}
            className="absolute inset-x-0 overflow-y-auto overscroll-contain border-b border-line bg-cream px-5 pb-7 pt-3 shadow-lift lg:hidden"
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

            {/* Lo que busca quien llega desde Instagram: reservar o escribir */}
            <div className="mt-5 flex flex-col gap-2.5">
              {!onBooking && (
                <Button to={bookingTo} size="md" className="w-full">
                  Reservar mi cita
                </Button>
              )}
              {number && (
                <Button
                  href={whatsappLink(number, `Hola ${firstName(settings.brandName)}, quisiera consultar por una cita.`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="secondary"
                  size="md"
                  className="w-full"
                >
                  <WhatsAppIcon className="h-5 w-5 text-wa" />
                  Escribir por WhatsApp
                  <span className="sr-only">(se abre en una pestaña nueva)</span>
                </Button>
              )}
              {settings.instagramUrl && (
                <a
                  href={settings.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-[44px] items-center justify-center gap-2 text-sm font-medium text-ink-600 transition hover:text-brand-700"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                    <path d="M12 7.6a4.4 4.4 0 1 0 0 8.8 4.4 4.4 0 0 0 0-8.8Zm0 7.25a2.85 2.85 0 1 1 0-5.7 2.85 2.85 0 0 1 0 5.7ZM17.6 7.4a1.03 1.03 0 1 1-2.05 0 1.03 1.03 0 0 1 2.05 0ZM8 3.4h8A4.6 4.6 0 0 1 20.6 8v8a4.6 4.6 0 0 1-4.6 4.6H8A4.6 4.6 0 0 1 3.4 16V8A4.6 4.6 0 0 1 8 3.4Zm0 1.6A3 3 0 0 0 5 8v8a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3V8a3 3 0 0 0-3-3H8Z" />
                  </svg>
                  {handle ?? 'Instagram'}
                  <span className="sr-only">en Instagram (se abre en una pestaña nueva)</span>
                </a>
              )}
            </div>

            {/* La cuenta es opcional: va de segundo plano, en una línea */}
            <div className="mt-4 border-t border-line pt-4">
              {isAuthenticated ? (
                <div className="flex flex-col gap-2.5">
                  <MobileAccountLinks onNavigate={() => setOpen(false)} />
                </div>
              ) : (
                <p className="text-center text-sm text-ink-500">
                  ¿Ya tienes cuenta?{' '}
                  <Link to="/ingresar" className="inline-block py-3 font-medium text-brand-700 underline underline-offset-4">
                    Ingresar
                  </Link>
                  <span className="mx-2 text-ink-400" aria-hidden="true">
                    ·
                  </span>
                  <Link to="/registro" className="inline-block py-3 font-medium text-brand-700 underline underline-offset-4">
                    Crear cuenta
                  </Link>
                </p>
              )}
            </div>
          </motion.div>
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

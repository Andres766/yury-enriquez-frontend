import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext.jsx';
import { cx } from '../ui/index.jsx';

/**
 * Menú de cuenta de la barra de navegación.
 *
 * Sustituye a tres botones sueltos por un solo punto de entrada, que es
 * lo que espera quien ya ha usado cualquier otra web.
 *
 * Accesibilidad, siguiendo el patrón de menú de la WAI:
 *   · el disparador declara `aria-haspopup="menu"` y `aria-expanded`
 *   · el contenedor es `role="menu"` y cada opción `role="menuitem"`
 *   · ↓/↑ recorren las opciones, Inicio/Fin saltan a los extremos
 *   · Escape cierra y devuelve el foco al disparador
 *   · se cierra al pulsar fuera o al perder el foco el conjunto
 */
export default function UserMenu() {
  const { user, isAdmin, logout } = useAuth();
  const reduced = useReducedMotion();

  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const close = ({ refocus = false } = {}) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  };

  // Cerrar al pulsar fuera.
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  // Al abrir, el foco va a la primera opción.
  useEffect(() => {
    if (open) menuRef.current?.querySelector('[role="menuitem"]')?.focus();
  }, [open]);

  const items = () => Array.from(menuRef.current?.querySelectorAll('[role="menuitem"]') ?? []);

  const onMenuKeyDown = (event) => {
    const list = items();
    const index = list.indexOf(document.activeElement);

    const acciones = {
      Escape: () => close({ refocus: true }),
      Tab: () => setOpen(false),
      ArrowDown: () => list[(index + 1) % list.length]?.focus(),
      ArrowUp: () => list[(index - 1 + list.length) % list.length]?.focus(),
      Home: () => list[0]?.focus(),
      End: () => list[list.length - 1]?.focus(),
    };

    const accion = acciones[event.key];
    if (!accion) return;
    if (event.key !== 'Tab') event.preventDefault();
    accion();
  };

  const onTriggerKeyDown = (event) => {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setOpen(true);
    }
  };

  if (!user) return null;

  const firstName = user.fullName.split(' ')[0];
  const initial = firstName.charAt(0).toUpperCase();

  const itemClass =
    'flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-ink-700 transition-colors hover:bg-blush hover:text-brand-800 focus:bg-blush focus:text-brand-800 focus:outline-none';

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onTriggerKeyDown}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cx(
          'flex min-h-[40px] items-center gap-2 rounded-full border py-1 pl-1 pr-3 transition-all duration-200',
          open
            ? 'border-brand-300 bg-blush'
            : 'border-line bg-surface hover:border-brand-300 hover:bg-blush',
        )}
      >
        <span
          className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 font-display text-sm text-on-brand"
          aria-hidden="true"
        >
          {initial}
        </span>
        <span className="max-w-[8rem] truncate text-sm font-medium text-ink-700">{firstName}</span>
        <svg
          viewBox="0 0 16 16"
          className={cx('h-3 w-3 shrink-0 text-ink-400 transition-transform', open && 'rotate-180')}
          fill="none"
          aria-hidden="true"
        >
          <path d="m3.5 6 4.5 4.5L12.5 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={menuRef}
            role="menu"
            aria-label={`Cuenta de ${firstName}`}
            onKeyDown={onMenuKeyDown}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-56 overflow-hidden rounded-2xl border border-line bg-surface py-1.5 shadow-lift"
          >
            <div className="border-b border-line px-4 pb-2.5 pt-1.5">
              <p className="truncate text-sm font-medium text-ink-800">{user.fullName}</p>
              <p className="truncate text-xs text-ink-500">{user.email}</p>
            </div>

            <Link role="menuitem" to="/mi-cuenta" onClick={() => close()} className={itemClass}>
              <svg viewBox="0 0 20 20" className="h-4 w-4 text-ink-400" fill="none" aria-hidden="true">
                <circle cx="10" cy="6.8" r="3.3" stroke="currentColor" strokeWidth="1.4" />
                <path d="M3.8 17c.8-3.3 3.2-5 6.2-5s5.4 1.7 6.2 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              Mis citas y tarjeta
            </Link>

            {isAdmin && (
              <Link role="menuitem" to="/admin" onClick={() => close()} className={itemClass}>
                <svg viewBox="0 0 20 20" className="h-4 w-4 text-ink-400" fill="none" aria-hidden="true">
                  <path d="M3.5 10h5V3.5h-5zM3.5 16.5h5v-4h-5zM11.5 16.5h5V10h-5zM11.5 7.5h5v-4h-5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                </svg>
                Panel de administración
              </Link>
            )}

            <div className="my-1.5 border-t border-line" />

            <button
              role="menuitem"
              type="button"
              onClick={() => {
                close();
                logout();
              }}
              className={itemClass}
            >
              <svg viewBox="0 0 20 20" className="h-4 w-4 text-ink-400" fill="none" aria-hidden="true">
                <path
                  d="M12.5 6.5V5a1.5 1.5 0 0 0-1.5-1.5H5A1.5 1.5 0 0 0 3.5 5v10A1.5 1.5 0 0 0 5 16.5h6a1.5 1.5 0 0 0 1.5-1.5v-1.5M9 10h8m0 0-2.5-2.5M17 10l-2.5 2.5"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Cerrar sesión
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

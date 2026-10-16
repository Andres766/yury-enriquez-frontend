import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { cx } from '../ui/index.jsx';

/**
 * Hoja del panel: sube desde abajo en el celular y es una ventana
 * centrada en pantallas grandes. La usan el editor de fotos y el
 * selector de fotos.
 *
 * Se pinta en document.body (portal) porque a veces se abre DENTRO de
 * otra hoja (el formulario de un servicio): esa hoja se anima con
 * transform y un `position: fixed` dentro de un transform queda
 * atrapado en ella en vez de cubrir la pantalla.
 *
 * Accesibilidad: el foco entra al abrir, Tab no se escapa de la hoja,
 * Escape cierra SOLO la de encima (no también el formulario de atrás) y
 * al cerrar el foco vuelve al botón que la abrió.
 */

// Hojas abiertas, la de encima al final.
const stack = [];

// El scroll de la página se bloquea con la primera hoja y se suelta con
// la última. Si cada hoja guardara y restaurara el valor por su cuenta,
// al cerrarse dos a la vez (borrar una foto desde su editor cierra el
// editor y la confirmación) la de encima restauraría «hidden» después
// de la de abajo y la página quedaría sin poder desplazarse.
let scrollLocks = 0;
let overflowBeforeLock = '';

function onEscapeCapture(event) {
  if (event.key !== 'Escape' || stack.length === 0) return;
  // En la fase de captura, antes de que lo oigan los formularios de
  // atrás (que escuchan Escape en document para cerrarse).
  event.stopPropagation();
  stack[stack.length - 1].current?.();
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function Sheet({ open, onClose, title, description, children, footer, size = 'md', labelledBy }) {
  const reduced = useReducedMotion();
  const panelRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!open) return undefined;

    const previousFocus = document.activeElement;
    if (scrollLocks === 0) {
      overflowBeforeLock = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    scrollLocks += 1;

    stack.push(closeRef);
    if (stack.length === 1) document.addEventListener('keydown', onEscapeCapture, true);

    // Tras el primer pintado, para que el panel ya exista.
    const frame = requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (panel && !panel.contains(document.activeElement)) panel.focus({ preventScroll: true });
    });

    return () => {
      cancelAnimationFrame(frame);
      const index = stack.lastIndexOf(closeRef);
      if (index !== -1) stack.splice(index, 1);
      if (stack.length === 0) document.removeEventListener('keydown', onEscapeCapture, true);
      scrollLocks -= 1;
      if (scrollLocks === 0) document.body.style.overflow = overflowBeforeLock;
      if (previousFocus instanceof HTMLElement && document.contains(previousFocus)) {
        previousFocus.focus({ preventScroll: true });
      }
    };
  }, [open]);

  function trapTab(event) {
    if (event.key !== 'Tab') return;
    const items = [...(panelRef.current?.querySelectorAll(FOCUSABLE) ?? [])].filter(
      (el) => el.offsetParent !== null || el === document.activeElement,
    );
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  const widths = { md: 'sm:max-w-2xl', lg: 'sm:max-w-4xl' };

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60]" key="sheet">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-scrim/40 backdrop-blur-sm"
            aria-hidden="true"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy ?? titleId}
            aria-describedby={description ? descId : undefined}
            tabIndex={-1}
            onKeyDown={trapTab}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 24 }}
            transition={{ duration: 0.22, ease: [0.22, 0.61, 0.36, 1] }}
            className={cx(
              'absolute inset-x-0 bottom-0 top-6 mx-auto flex w-full flex-col overflow-hidden rounded-t-[2rem] border border-line bg-surface shadow-lift focus:outline-none',
              'sm:inset-6 sm:rounded-[2rem]',
              widths[size] ?? widths.md,
            )}
          >
            <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
              <div className="min-w-0">
                <h2 id={titleId} className="font-display text-2xl leading-tight text-ink-800">
                  {title}
                </h2>
                {description && (
                  <p id={descId} className="mt-0.5 text-xs leading-relaxed text-ink-500">
                    {description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-500 transition hover:bg-blush focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
                aria-label="Cerrar"
              >
                <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden="true">
                  <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </header>

            <div className="flex-1 overflow-y-auto overscroll-contain p-5">{children}</div>

            {footer && (
              <footer className="flex flex-wrap gap-3 border-t border-line bg-cream px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                {footer}
              </footer>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

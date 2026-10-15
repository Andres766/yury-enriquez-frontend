import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '../ui/index.jsx';
import { WhatsAppIcon, CalendarIcon } from './icons.jsx';

/**
 * Barra fija de abajo, solo en el celular.
 *
 * En una ficha el botón de reservar queda a casi mil píxeles de la
 * parte de arriba, y el navegador de Instagram recorta todavía más. La
 * barra lo deja siempre a mano, pero se esconde mientras los botones de
 * la página están a la vista (no tiene sentido verlos dos veces) y al
 * llegar al final del contenido, para no tapar el pie de página.
 *
 * `inlineRef` es el bloque de botones de la página; `endRef`, una marca
 * al final del contenido.
 */
export function useStickyCta(inlineRef, endRef, ready = true) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ready || typeof IntersectionObserver === 'undefined') return undefined;
    const seen = new Map();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => seen.set(entry.target, entry.isIntersecting));
      setVisible(![...seen.values()].some(Boolean));
    });
    [inlineRef.current, endRef.current].filter(Boolean).forEach((el) => {
      seen.set(el, false);
      observer.observe(el);
    });
    return () => observer.disconnect();
  }, [inlineRef, endRef, ready]);

  return visible;
}

const SECONDARY_ICON = { whatsapp: WhatsAppIcon, calendar: CalendarIcon };

export default function MobileCtaBar({ visible, title, price, primary, secondary }) {
  const reduced = useReducedMotion();
  const Icon = secondary ? SECONDARY_ICON[secondary.icon] ?? CalendarIcon : null;

  return (
    <AnimatePresence>
      {visible && primary && (
        <motion.div
          initial={reduced ? false : { y: '100%' }}
          animate={{ y: 0 }}
          exit={reduced ? undefined : { y: '100%' }}
          transition={{ type: 'spring', stiffness: 380, damping: 36 }}
          // Por debajo del menú (z-50) y por encima del contenido.
          className="fixed inset-x-0 bottom-0 z-[45] border-t border-line bg-surface/95 shadow-lift backdrop-blur-md lg:hidden"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="container-page flex items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink-800">{title}</p>
              {price && <p className="truncate text-xs text-ink-500">{price}</p>}
            </div>

            {secondary && (
              secondary.to ? (
                <Link
                  to={secondary.to}
                  aria-label={secondary.label}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink-700 transition hover:bg-blush focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
                >
                  <Icon />
                </Link>
              ) : (
                <a
                  href={secondary.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${secondary.label} (se abre en una pestaña nueva)`}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-wa transition hover:bg-blush focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
                >
                  <Icon />
                </a>
              )
            )}

            <Button
              to={primary.to}
              href={primary.href}
              target={primary.href ? '_blank' : undefined}
              rel={primary.href ? 'noopener noreferrer' : undefined}
              className="shrink-0 px-5"
            >
              {primary.href && <WhatsAppIcon className="h-4 w-4" />}
              {primary.label}
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

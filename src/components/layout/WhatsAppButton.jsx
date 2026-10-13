import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useSettings } from '../../context/SettingsContext.jsx';
import { whatsappLink } from '../../lib/format.js';

/**
 * Botón flotante de WhatsApp.
 *
 * Aparece tras un pequeño desplazamiento para no tapar el hero nada más
 * entrar. En móvil se sitúa por encima del área segura del sistema
 * (`env(safe-area-inset-bottom)`) para no quedar bajo la barra de gestos.
 */
export default function WhatsAppButton() {
  const settings = useSettings();
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 320);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const number = settings.whatsappNumber || settings.contactPhone;
  if (!number) return null;

  const message = `Hola ${settings.brandName}, me gustaría consultar por una cita.`;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={reduced ? false : { opacity: 0, scale: 0.7, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={reduced ? undefined : { opacity: 0, scale: 0.7, y: 20 }}
          transition={{ type: 'spring', stiffness: 320, damping: 24 }}
          className="fixed bottom-5 right-5 z-[70] sm:bottom-7 sm:right-7"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <a
            href={whatsappLink(number, message)}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lift transition
                       hover:h-14 hover:w-auto hover:gap-2 hover:px-5 focus-visible:ring-2 focus-visible:ring-wa focus-visible:ring-offset-2"
            aria-label="Escribirnos por WhatsApp (se abre en una pestaña nueva)"
          >
            <svg viewBox="0 0 24 24" className="h-7 w-7 shrink-0" fill="currentColor" aria-hidden="true">
              <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.64-2.05-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.07-.79.37s-1.03 1.01-1.03 2.46 1.06 2.86 1.2 3.06c.15.2 2.08 3.18 5.04 4.46.7.3 1.25.48 1.68.62.7.22 1.35.19 1.86.12.57-.09 1.75-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35ZM12.05 21.5h-.01a9.4 9.4 0 0 1-4.79-1.31l-.34-.2-3.56.93.95-3.47-.22-.36a9.38 9.38 0 0 1-1.44-5.01c0-5.18 4.22-9.4 9.42-9.4a9.35 9.35 0 0 1 6.65 2.76 9.32 9.32 0 0 1 2.76 6.65c0 5.18-4.23 9.41-9.42 9.41ZM20.06 3.9A11.1 11.1 0 0 0 12.05.6C5.9.6.91 5.59.9 11.73c0 1.96.52 3.88 1.5 5.57L.8 23.4l6.24-1.64a11.15 11.15 0 0 0 5.01 1.21h.01c6.15 0 11.15-5 11.15-11.14a11.1 11.1 0 0 0-3.15-7.93Z" />
            </svg>
            <span className="hidden whitespace-nowrap pr-1 text-sm font-semibold group-hover:inline sm:group-hover:inline">
              Escríbenos
            </span>
          </a>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

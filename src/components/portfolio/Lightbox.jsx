import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { photoImgProps } from './photoImage.js';

/**
 * Visor de fotos a pantalla completa.
 *
 * Es un diálogo modal de verdad:
 *   · `role="dialog"` + `aria-modal`, con el contador como nombre
 *   · Escape cierra; ← y → pasan de foto; en el celular, deslizar
 *   · el foco entra al botón de cerrar, no se escapa con Tab y, al
 *     cerrar, vuelve a la miniatura que lo abrió (lo hace quien lo monta,
 *     que es quien sabe cuál fue)
 *   · la página de atrás no se desplaza mientras está abierto
 *
 * Se pinta en <body> con un portal: dentro de la página, cualquier
 * ancestro con `transform` (las animaciones de entrada) convertiría el
 * `fixed` en relativo a ese bloque.
 *
 * El fondo y el texto no siguen el tema a propósito: una foto se mira
 * sobre oscuro en los tres temas, y el texto va claro encima.
 */
export default function Lightbox({ photos, index, onClose, onNavigate }) {
  const reduced = useReducedMotion();
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const touchX = useRef(null);

  const photo = photos[index];
  const total = photos.length;
  const go = (step) => onNavigate((index + step + total) % total);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      } else if (event.key === 'ArrowRight' && total > 1) {
        event.preventDefault();
        onNavigate((index + 1) % total);
      } else if (event.key === 'ArrowLeft' && total > 1) {
        event.preventDefault();
        onNavigate((index - 1 + total) % total);
      } else if (event.key === 'Tab') {
        // Trampa de foco: de la última pieza se vuelve a la primera.
        // Las flechas de escritorio y las del celular se esconden con
        // CSS según el ancho: solo cuentan las que se ven.
        const focusables = [...(dialogRef.current?.querySelectorAll('button:not([disabled])') ?? [])].filter(
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
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [index, total, onClose, onNavigate]);

  if (!photo) return null;
  // Foto completa (object-contain): sin punto de enfoque, que solo
  // sirve para recortar.
  const { src, srcSet, sizes } = photoImgProps(photo.url, {
    slot: 'full',
    sizes: '(min-width: 768px) 48rem, 100vw',
  });

  const onTouchStart = (event) => {
    touchX.current = event.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (event) => {
    if (touchX.current === null || total < 2) return;
    const dx = (event.changedTouches[0]?.clientX ?? touchX.current) - touchX.current;
    touchX.current = null;
    if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
  };

  const navButton =
    'flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-0';

  return createPortal(
    <motion.div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Foto ${index + 1} de ${total}`}
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[100] flex flex-col bg-scrim/95 text-white"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="flex items-center justify-between gap-4 px-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
        <p className="text-sm tabular-nums text-white/75" aria-hidden="true">
          {index + 1} / {total}
        </p>
        <button ref={closeRef} type="button" onClick={onClose} className={navButton} aria-label="Cerrar la foto">
          <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden="true">
            <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Tocar el fondo (no la foto) también cierra */}
      <div
        className="flex min-h-0 flex-1 items-center justify-center gap-3 px-2 py-4 sm:px-6"
        onClick={(event) => event.target === event.currentTarget && onClose()}
      >
        {total > 1 && (
          <button type="button" onClick={() => go(-1)} className={`${navButton} hidden sm:flex`} aria-label="Foto anterior">
            <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden="true">
              <path d="M10 3.5 5.5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}

        <figure className="flex h-full min-w-0 max-w-3xl flex-1 flex-col items-center justify-center">
          <img
            key={photo.url}
            src={src}
            srcSet={srcSet}
            sizes={sizes}
            alt={photo.alt}
            decoding="async"
            className="min-h-0 max-h-full w-auto max-w-full flex-1 rounded-2xl object-contain"
          />
          <figcaption className="mt-3 max-w-xl px-2 text-center text-sm leading-relaxed text-white/85">
            {photo.alt}
            {photo.credit && <span className="mt-1 block text-xs text-white/60">{photo.credit}</span>}
          </figcaption>
        </figure>

        {total > 1 && (
          <button type="button" onClick={() => go(1)} className={`${navButton} hidden sm:flex`} aria-label="Foto siguiente">
            <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden="true">
              <path d="M6 3.5 10.5 8 6 12.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>

      {/* En el celular las flechas van abajo, al alcance del pulgar */}
      {total > 1 && (
        <div className="flex items-center justify-center gap-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:hidden">
          <button type="button" onClick={() => go(-1)} className={navButton} aria-label="Foto anterior">
            <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden="true">
              <path d="M10 3.5 5.5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button type="button" onClick={() => go(1)} className={navButton} aria-label="Foto siguiente">
            <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden="true">
              <path d="M6 3.5 10.5 8 6 12.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      )}
    </motion.div>,
    document.body,
  );
}

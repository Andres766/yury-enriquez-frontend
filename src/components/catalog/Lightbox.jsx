import { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { imageSources } from '../../lib/images.js';
import { SLOTS } from '../portfolio/photoImage.js';

/**
 * Foto en pantalla completa.
 *
 * Se abre al tocar una foto de la galería: en el celular la casilla 4:5
 * se queda corta para ver el detalle de un delineado o de un peinado.
 * Escape cierra, las flechas cambian de foto, el foco entra al botón de
 * cerrar, no se escapa del diálogo con Tab y vuelve a la foto que se
 * tocó al salir.
 */
export default function Lightbox({ images, index, onIndex, onClose }) {
  const reduced = useReducedMotion();
  const closeRef = useRef(null);
  const dialogRef = useRef(null);
  const image = images[index];
  const many = images.length > 1;

  useEffect(() => {
    const returnTo = document.activeElement;
    closeRef.current?.focus();
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
      returnTo?.focus?.();
    };
  }, []);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'Tab') {
        const buttons = [...(dialogRef.current?.querySelectorAll('button') ?? [])];
        if (buttons.length === 0) return;
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
        return;
      }
      if (!many) return;
      if (event.key === 'ArrowRight') onIndex((index + 1) % images.length);
      if (event.key === 'ArrowLeft') onIndex((index - 1 + images.length) % images.length);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [index, images.length, many, onClose, onIndex]);

  if (!image) return null;

  // Foto entera (object-contain): sin punto de enfoque. Cloudinary la
  // entrega al ancho de la pantalla, no el original de varios megas.
  const { src, srcSet } = imageSources(image.url, SLOTS.full);

  const nav =
    'flex h-12 w-12 items-center justify-center rounded-full bg-surface/90 text-ink-800 shadow-soft transition hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600';

  return (
    <motion.div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Foto ${index + 1} de ${images.length}`}
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={reduced ? undefined : { opacity: 0 }}
      className="fixed inset-0 z-[90] flex flex-col bg-scrim/95"
      onClick={onClose}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
        <p className="text-sm text-white/80" aria-live="polite">
          {index + 1} / {images.length}
        </p>
        <button ref={closeRef} type="button" onClick={onClose} className={nav} aria-label="Cerrar la foto">
          <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden="true">
            <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-6" onClick={(e) => e.stopPropagation()}>
        <img
          key={image.url}
          src={src}
          srcSet={srcSet}
          sizes={srcSet ? '100vw' : undefined}
          alt={image.alt}
          className="max-h-full max-w-full rounded-xl object-contain"
        />

        {many && (
          <>
            <button
              type="button"
              onClick={() => onIndex((index - 1 + images.length) % images.length)}
              className={`${nav} absolute left-3 top-1/2 -translate-y-1/2`}
              aria-label="Foto anterior"
            >
              <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden="true">
                <path d="M10 3.5 5.5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => onIndex((index + 1) % images.length)}
              className={`${nav} absolute right-3 top-1/2 -translate-y-1/2`}
              aria-label="Foto siguiente"
            >
              <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden="true">
                <path d="m6 3.5 4.5 4.5L6 12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
}

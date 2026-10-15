import { useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { photoSources } from '../../data/portfolio.js';
import { cx } from '../ui/index.jsx';
import Lightbox from './Lightbox.jsx';

/**
 * Cuadrícula de trabajos con visor.
 *
 * Casillas 4:5 (las fotos son verticales y de proporciones distintas;
 * `focus` dice qué parte no se puede recortar). Cada casilla es un
 * botón que abre el visor; al cerrarlo, el foco vuelve a esa casilla.
 *
 * `sizes` describe el ancho real de la casilla en cada pantalla, para
 * que el celular baje la versión de 480 px y no la de 960.
 */
export default function PortfolioGallery({
  photos,
  className = 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
  sizes = '(min-width: 1024px) 280px, (min-width: 640px) 33vw, 50vw',
  eager = 0,
}) {
  const reduced = useReducedMotion();
  const [openIndex, setOpenIndex] = useState(null);
  const tileRefs = useRef([]);

  // Se devuelve el foco a la casilla de la foto que se estaba viendo: si
  // se navegó con las flechas, es la última que vio, no la que abrió.
  const close = () => {
    const last = openIndex;
    setOpenIndex(null);
    requestAnimationFrame(() => tileRefs.current[last]?.focus());
  };

  return (
    <>
      <ul className={cx('grid gap-2.5 sm:gap-4', className)}>
        {photos.map((photo, i) => {
          const { src, srcSet } = photoSources(photo.id);
          return (
            <motion.li
              key={photo.id}
              initial={reduced ? false : { opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: Math.min((i % 4) * 0.06, 0.24) }}
            >
              <button
                ref={(el) => {
                  tileRefs.current[i] = el;
                }}
                type="button"
                onClick={() => setOpenIndex(i)}
                className="group relative block aspect-[4/5] w-full overflow-hidden rounded-2xl border border-line bg-blush shadow-soft focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 sm:rounded-3xl"
              >
                <img
                  src={src}
                  srcSet={srcSet}
                  sizes={sizes}
                  alt={photo.alt}
                  loading={i < eager ? 'eager' : 'lazy'}
                  decoding="async"
                  style={{ objectPosition: photo.focus }}
                  className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                />
                <span className="sr-only">. Ver en grande</span>

                {/* Crédito del fotógrafo, visible sobre la foto. Va en
                    claro sobre un degradado oscuro en los tres temas,
                    porque lo que tiene debajo es una foto, no el fondo. */}
                {photo.credito && (
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-scrim/70 to-transparent px-2.5 pb-2 pt-6 text-left text-[10px] leading-tight text-white/90 sm:text-[11px]">
                    {photo.credito}
                  </span>
                )}
              </button>
            </motion.li>
          );
        })}
      </ul>

      {openIndex !== null && (
        <Lightbox photos={photos} index={openIndex} onClose={close} onNavigate={setOpenIndex} />
      )}
    </>
  );
}

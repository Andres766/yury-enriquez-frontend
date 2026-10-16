import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { duration, priceLabel, seasonText } from '../lib/format.js';
import { isSeasonalService, visibleImages } from '../lib/catalog.js';
import usePhotos from '../hooks/usePhotos.js';
import { photoImgProps } from './portfolio/photoImage.js';
import { Badge, cx } from './ui/index.jsx';
import { CalendarIcon, CheckIcon, StarPlaceholder } from './catalog/icons.jsx';

/**
 * Tarjeta de servicio.
 *
 * La tarjeta entera es un enlace, pero el nombre del servicio es el
 * texto accesible del enlace (`aria-label` explícito) para que un lector
 * de pantalla no anuncie "enlace, imagen, 85.000 pesos…".
 *
 * La foto va en vertical (4:5): las fotos reales son retratos y en una
 * casilla horizontal se perdían la frente y el mentón. Encima no va
 * ninguna etiqueta salvo la de temporada, que sí informa algo; la
 * categoría ya la dice el nombre.
 *
 * Si el servicio tiene temporada, bajo el nombre va cuándo se puede
 * hacer ("Solo del 22 al 31 de octubre"): el sello de la foto avisa que
 * es de temporada, pero sin las fechas la clienta tendría que entrar a
 * la ficha para saber si le sirve.
 *
 * `occasionSlug` viaja a la ficha (?ocasion=) para que la reserva llegue
 * con la ocasión ya elegida.
 */
export default function ServiceCard({ service, index = 0, occasionSlug, className }) {
  const reduced = useReducedMotion();
  const { byUrl } = usePhotos();
  const cover = visibleImages(service.images).find((image) => image?.url);
  const price = priceLabel(service);
  const season = seasonText(service);
  const highlights = service.includes?.slice(0, 2) ?? [];
  const href = occasionSlug ? `/servicios/${service.slug}?ocasion=${occasionSlug}` : `/servicios/${service.slug}`;

  return (
    <motion.article
      initial={reduced ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.55, delay: Math.min(index * 0.07, 0.35), ease: [0.22, 0.61, 0.36, 1] }}
      className={cx('group', className)}
    >
      <Link
        to={href}
        aria-label={`Ver detalles de ${service.name}`}
        className="flex h-full flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-soft transition-all duration-300
                   hover:-translate-y-1 hover:border-brand-200 hover:shadow-lift
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
      >
        <div className="relative aspect-[4/5] overflow-hidden bg-blush">
          {cover ? (
            <img
              {...photoImgProps(cover.url, {
                slot: 'tile',
                sizes: '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw',
                focus: cover.focus,
                byUrl,
              })}
              alt={cover.alt}
              loading={index < 3 ? 'eager' : 'lazy'}
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-brand-300" aria-hidden="true">
              <StarPlaceholder />
            </div>
          )}

          {isSeasonalService(service) && (
            <div className="absolute left-4 top-4">
              <Badge tone="gold">Temporada</Badge>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col p-5 sm:p-6">
          <h3 className="text-xl leading-snug transition-colors group-hover:text-brand-700 sm:text-[1.35rem]">
            {service.name}
          </h3>

          {season && (
            <p className="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-gold-700">
              <CalendarIcon className="h-4 w-4 shrink-0" />
              {season}
            </p>
          )}

          {/* Lo que incluye dice más que la frase corta, si Yury lo cargó. */}
          {highlights.length > 0 ? (
            <ul className="mt-2.5 flex-1 space-y-1.5">
              {highlights.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm leading-snug text-ink-600">
                  <CheckIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" strokeWidth={1.6} />
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-pretty mt-2.5 flex-1 text-sm leading-relaxed text-ink-500">
              {service.shortDescription}
            </p>
          )}

          <div className="mt-5 flex items-end justify-between gap-3 border-t border-line pt-4">
            <div>
              <p className={cx('font-display leading-none text-ink-800', price.isQuote ? 'text-xl' : 'text-2xl')}>
                {price.text}
              </p>
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-ink-500">
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
                  <circle cx="8" cy="8" r="6.4" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M8 4.8V8l2.2 1.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                {duration(service.durationMinutes)}
              </p>
            </div>

            <span
              className="flex items-center gap-1 text-sm font-medium text-brand-700 transition-transform group-hover:translate-x-1"
              aria-hidden="true"
            >
              Ver más
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
                <path d="M3 8h9m0 0L8.5 4.5M12 8l-3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}

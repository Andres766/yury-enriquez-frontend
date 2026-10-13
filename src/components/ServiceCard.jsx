import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { money, duration, CATEGORY_LABEL } from '../lib/format.js';
import { Badge, cx } from './ui/index.jsx';

/**
 * Tarjeta de servicio.
 *
 * La tarjeta entera es un enlace, pero el nombre del servicio es el
 * texto accesible del enlace (`aria-label` explícito) para que un lector
 * de pantalla no anuncie "enlace, imagen, 85.000 pesos…".
 */
export default function ServiceCard({ service, index = 0, className }) {
  const reduced = useReducedMotion();
  const cover = service.images?.[0];

  return (
    <motion.article
      initial={reduced ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.55, delay: Math.min(index * 0.07, 0.35), ease: [0.22, 0.61, 0.36, 1] }}
      className={cx('group', className)}
    >
      <Link
        to={`/servicios/${service.slug}`}
        aria-label={`Ver detalles de ${service.name}`}
        className="flex h-full flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-soft transition-all duration-300
                   hover:-translate-y-1 hover:border-brand-200 hover:shadow-lift
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-blush">
          {cover ? (
            <img
              src={cover.url}
              alt={cover.alt}
              loading={index < 3 ? 'eager' : 'lazy'}
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-brand-300" aria-hidden="true">
              <svg viewBox="0 0 24 24" className="h-12 w-12" fill="none">
                <path
                  d="M12 3.5 14.4 9l5.6.5-4.3 3.9 1.3 5.6L12 16l-5 3 1.3-5.6L4 9.5 9.6 9z"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          )}

          <div className="absolute left-4 top-4 flex flex-wrap gap-2">
            <Badge className="bg-surface/90 backdrop-blur-sm">{CATEGORY_LABEL[service.category]}</Badge>
            {service.featured && <Badge tone="gold">Destacado</Badge>}
          </div>
        </div>

        <div className="flex flex-1 flex-col p-5 sm:p-6">
          <h3 className="text-xl leading-snug transition-colors group-hover:text-brand-700 sm:text-[1.35rem]">
            {service.name}
          </h3>

          <p className="text-pretty mt-2.5 flex-1 text-sm leading-relaxed text-ink-500">
            {service.shortDescription}
          </p>

          <div className="mt-5 flex items-end justify-between gap-3 border-t border-line pt-4">
            <div>
              <p className="font-display text-2xl leading-none text-ink-800">
                {money(service.priceCents, service.currency)}
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

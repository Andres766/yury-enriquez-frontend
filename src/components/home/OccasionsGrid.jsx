import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { SectionTitle, Button } from '../ui/index.jsx';

/**
 * "Para cada ocasión".
 *
 * Cada tarjeta explica qué incluye ese tipo de servicio, que es la duda
 * real de quien entra: no "cuánto cuesta" sino "¿esto es para mi caso?".
 */
export default function OccasionsGrid({ occasions = [], limit }) {
  const reduced = useReducedMotion();
  const items = limit ? occasions.slice(0, limit) : occasions;

  if (items.length === 0) return null;

  return (
    <section className="container-page py-20 sm:py-24" aria-labelledby="titulo-ocasiones">
      <SectionTitle
        eyebrow="Para cada ocasión"
        title="Cada evento pide algo distinto"
        subtitle="No es lo mismo una boda de doce horas que una sesión de fotos de dos. Estos son los tipos de servicio que trabajamos y qué incluye cada uno."
        as="h2"
        className="mb-14"
      />
      <span id="titulo-ocasiones" className="sr-only">
        Ocasiones que atendemos
      </span>

      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((occasion, i) => (
          <motion.li
            key={occasion.id}
            initial={reduced ? false : { opacity: 0, y: 26 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.55, delay: Math.min(i * 0.06, 0.3), ease: [0.22, 0.61, 0.36, 1] }}
            className="group"
          >
            <Link
              to={`/ocasiones/${occasion.slug}`}
              className="relative flex h-full flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-soft transition-all duration-300
                         hover:-translate-y-1 hover:border-brand-200 hover:shadow-lift
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-blush">
                {occasion.heroImage && (
                  <img
                    src={occasion.heroImage}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.07]"
                  />
                )}
                <div
                  className="absolute inset-0 bg-gradient-to-t from-scrim/70 via-scrim/10 to-transparent"
                  aria-hidden="true"
                />
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <h3 className="font-display text-2xl text-white drop-shadow-sm">{occasion.name}</h3>
                  <p className="mt-0.5 text-sm italic text-white/85">{occasion.tagline}</p>
                </div>
              </div>

              <div className="flex flex-1 flex-col p-5">
                <p className="text-pretty text-sm leading-relaxed text-ink-500 line-clamp-3">
                  {occasion.description}
                </p>

                {occasion.includes?.length > 0 && (
                  <ul className="mt-4 space-y-2">
                    {occasion.includes.slice(0, 3).map((item) => (
                      <li key={item} className="flex items-start gap-2 text-[13px] leading-snug text-ink-600">
                        <svg viewBox="0 0 16 16" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" fill="none" aria-hidden="true">
                          <path d="m3.5 8.4 2.8 2.8 6.2-6.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        {item}
                      </li>
                    ))}
                  </ul>
                )}

                <span
                  className="mt-5 flex items-center gap-1 text-sm font-medium text-brand-700 transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                >
                  Ver qué incluye
                  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
                    <path d="M3 8h9m0 0L8.5 4.5M12 8l-3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </div>
            </Link>
          </motion.li>
        ))}
      </ul>

      {limit && occasions.length > limit && (
        <div className="mt-10 text-center">
          <Button to="/ocasiones" variant="secondary">
            Ver todas las ocasiones
          </Button>
        </div>
      )}
    </section>
  );
}

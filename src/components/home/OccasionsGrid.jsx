import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { SectionTitle, Button } from '../ui/index.jsx';
import { isHiddenPhoto, occasionPriceFrom, photoProps } from '../../lib/catalog.js';

/**
 * "Para cada ocasión".
 *
 * Mosaico de fichas verticales: foto, nombre y "desde $X". Antes cada
 * tarjeta traía párrafo y tres viñetas, y en el celular las seis sumaban
 * miles de píxeles antes de "Cómo funciona"; además esas viñetas
 * prometían cosas que solo trae uno de los servicios. El detalle vive en
 * la página de cada ocasión.
 *
 * En el celular van dos por fila: con fotos verticales, una por fila
 * haría la portada larguísima.
 *
 * `showTitle={false}` en /ocasiones, donde el h1 ya dice lo mismo.
 */
export default function OccasionsGrid({ occasions = [], limit, showTitle = true }) {
  const reduced = useReducedMotion();
  const items = limit ? occasions.slice(0, limit) : occasions;

  if (items.length === 0) return null;

  return (
    <section
      className="container-page py-20 sm:py-24"
      aria-labelledby={showTitle ? 'titulo-ocasiones' : undefined}
      aria-label={showTitle ? undefined : 'Ocasiones que atendemos'}
    >
      {showTitle && (
        <>
          <SectionTitle
            eyebrow="Para cada ocasión"
            title="Cada evento pide algo distinto"
            subtitle="No es lo mismo una boda de doce horas que una sesión de fotos de dos. Estos son los tipos de servicio que trabajamos; toca uno para ver qué incluye."
            as="h2"
            className="mb-14"
          />
          <span id="titulo-ocasiones" className="sr-only">
            Ocasiones que atendemos
          </span>
        </>
      )}

      <ul className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
        {items.map((occasion, i) => {
          const priceFrom = occasionPriceFrom(occasion.services);
          const hero = occasion.heroImage && !isHiddenPhoto(occasion.heroImage) ? occasion.heroImage : null;

          return (
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
                className="relative block overflow-hidden rounded-3xl border border-line bg-blush shadow-soft transition-all duration-300
                           hover:-translate-y-1 hover:border-brand-200 hover:shadow-lift
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
              >
                <div className="relative aspect-[3/4] overflow-hidden">
                  {hero && (
                    <img
                      {...photoProps(hero, '(min-width: 1024px) 33vw, 50vw')}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.07]"
                    />
                  )}
                  {/* Velo solo en el tercio de abajo, donde va el texto. */}
                  <div
                    className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-scrim/75 via-scrim/30 to-transparent"
                    aria-hidden="true"
                  />
                  <div className="absolute inset-x-0 bottom-0 p-3.5 sm:p-5">
                    <h3 className="font-display text-xl leading-tight text-white drop-shadow-sm sm:text-2xl">
                      {occasion.name}
                    </h3>
                    <div className="hidden sm:block">
                      <p className="mt-0.5 text-sm italic text-white/85 line-clamp-2">{occasion.tagline}</p>
                    </div>
                    {priceFrom && <p className="mt-1 text-xs font-medium text-white/90 sm:text-sm">{priceFrom}</p>}
                  </div>
                </div>
              </Link>
            </motion.li>
          );
        })}
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

import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { Reveal, SectionTitle } from '../ui/index.jsx';

/**
 * "Lo que dicen mis clientas".
 *
 * Solo testimonios reales, autorizados y publicados desde el panel: el
 * servidor no manda los borradores. Si no hay ninguno, o la API no
 * responde, la sección no existe — nunca se rellena con textos de
 * ejemplo, porque un testimonio inventado le quita credibilidad a todo
 * lo demás.
 *
 * En el celular es una fila que se desliza de lado (scroll-snap), con la
 * siguiente tarjeta asomándose para que se note que hay más; desde `md`,
 * cuadrícula.
 */
export default function Testimonials() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    let cancelled = false;
    api
      .get('/testimonials')
      .then((data) => {
        if (!cancelled) setItems(Array.isArray(data?.testimonials) ? data.testimonials : []);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = items.filter((t) => t?.quote && t?.name);
  if (visible.length === 0) return null;

  return (
    <section className="border-y border-line bg-surface py-14 sm:py-20" aria-labelledby="titulo-testimonios">
      <div className="container-page">
        <SectionTitle eyebrow="Testimonios" title="Lo que dicen mis clientas" className="mb-8 sm:mb-12" as="h2" />
        <span id="titulo-testimonios" className="sr-only">
          Testimonios de clientas
        </span>

        {/* La animación de entrada va en el bloque entero y no en cada
            tarjeta: en la fila deslizable, las que están fuera de la vista
            se quedarían invisibles y no se asomaría la siguiente. */}
        <Reveal>
          <ul
            className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-4 sm:-mx-6 sm:px-6 md:mx-0 md:grid md:snap-none md:grid-cols-2 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-3"
            aria-label="Testimonios"
          >
            {visible.map((t, i) => (
              <li key={t.id ?? i} className="w-[82%] shrink-0 snap-start md:w-auto">
                <figure className="card-surface flex h-full flex-col p-6">
                  {Number.isInteger(t.rating) && t.rating > 0 && <Stars rating={Math.min(t.rating, 5)} />}

                  <blockquote className="text-pretty mt-3 flex-1 font-display text-xl leading-snug text-ink-800">
                    “{t.quote}”
                  </blockquote>

                  <figcaption className="mt-5 flex items-center gap-3 border-t border-line pt-4">
                    {t.photoUrl && (
                      <img
                        src={t.photoUrl}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="h-11 w-11 shrink-0 rounded-full border border-line object-cover"
                      />
                    )}
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-ink-800">{t.name}</span>
                      {t.occasionLabel && (
                        <span className="block truncate text-xs text-ink-500">{t.occasionLabel}</span>
                      )}
                    </span>
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}

/** Estrellas de la calificación; el número va en texto para el lector. */
function Stars({ rating }) {
  return (
    <p className="flex items-center gap-0.5 text-gold-500">
      <span className="sr-only">{rating} de 5 estrellas</span>
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          viewBox="0 0 20 20"
          className={i < rating ? 'h-4 w-4' : 'h-4 w-4 text-line'}
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M10 1.8 12.5 7l5.7.6-4.3 3.9 1.2 5.6L10 14.3 4.9 17.1l1.2-5.6L1.8 7.6 7.5 7z" />
        </svg>
      ))}
    </p>
  );
}

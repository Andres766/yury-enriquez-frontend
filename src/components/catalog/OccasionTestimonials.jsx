import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { testimonialsForOccasion } from '../../lib/catalog.js';
import { Reveal } from '../ui/index.jsx';

/**
 * Testimonios de la misma ocasión ("¿Qué dicen otras novias?").
 *
 * Solo los publicados desde el panel (el servidor no manda borradores)
 * cuya ocasión encaje con esta página. Si no hay ninguno, o la API no
 * responde, el bloque no existe: nunca se rellena con textos de ejemplo.
 *
 * Como mucho tres, en una columna en el celular: aquí acompañan a la
 * decisión, no son la sección principal como en el inicio.
 */
export default function OccasionTestimonials({ slug }) {
  const config = testimonialsForOccasion(slug);
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!config) return undefined;
    let cancelled = false;
    api
      .get('/testimonials')
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data?.testimonials) ? data.testimonials : [];
        setItems(list.filter((t) => t?.quote && t?.name && config.match.test(t.occasionLabel ?? '')).slice(0, 3));
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [config]);

  if (!config || items.length === 0) return null;

  return (
    <section className="container-page mt-20" aria-labelledby="titulo-testimonios-ocasion">
      <h2 id="titulo-testimonios-ocasion" className="mb-8 text-2xl sm:text-3xl">
        {config.title}
      </h2>
      <Reveal>
        <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((t) => (
            <li key={t.id}>
              <figure className="card-surface flex h-full flex-col p-6">
                <blockquote className="text-pretty flex-1 font-display text-xl leading-snug text-ink-800">
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
                    {t.occasionLabel && <span className="block truncate text-xs text-ink-500">{t.occasionLabel}</span>}
                  </span>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}

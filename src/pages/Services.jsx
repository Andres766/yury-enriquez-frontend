import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { duration, priceLabel, seasonText } from '../lib/format.js';
import { groupMenu, isSeasonalService, photoProps, visibleImages } from '../lib/catalog.js';
import { SectionTitle, LoadingBlock, EmptyState, Badge, Button, Reveal } from '../components/ui/index.jsx';
import { CalendarIcon, StarPlaceholder } from '../components/catalog/icons.jsx';

/**
 * Carta de precios.
 *
 * Antes eran diez filtros de categoría y ocasión que se sumaban (y daban
 * "no hay servicios" con facilidad) y cada toque volvía a pedir los datos
 * a la API. Para nueve servicios basta una carta por tipo de clienta: se
 * pide todo una vez y se agrupa aquí, porque cada servicio ya trae sus
 * ocasiones. Los botones de arriba llevan a cada sección, no filtran.
 *
 * Un servicio que sirve para varias ocasiones aparece en cada una: es
 * lo que espera quien entra buscando "lo de grados". Los talleres van
 * aparte, en su propia sección (ver groupMenu), y se llega a ella con
 * /servicios#talleres.
 */
export default function Services() {
  const [searchParams] = useSearchParams();
  const wanted = searchParams.get('ocasion');

  const [services, setServices] = useState([]);
  const [occasions, setOccasions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([api.get('/services'), api.get('/occasions')])
      .then(([s, o]) => {
        setServices(s.value?.services ?? []);
        setOccasions(o.value?.occasions ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  const sections = useMemo(() => groupMenu(services, occasions), [services, occasions]);

  // Los enlaces viejos /servicios?ocasion=bodas siguen sirviendo: bajan
  // a la sección de esa ocasión.
  useEffect(() => {
    if (loading || !wanted) return;
    const section = sections.find((item) => item.occasions.includes(wanted));
    if (section) document.getElementById(section.id)?.scrollIntoView({ block: 'start' });
  }, [loading, wanted, sections]);

  return (
    <div className="container-page py-14 sm:py-20">
      <SectionTitle
        eyebrow="Catálogo"
        title="Servicios y precios"
        subtitle="Todo lo que ofrecemos, con su duración y su valor, ordenado por tipo de evento. Toca un servicio para ver qué incluye."
        className="mb-10"
        as="h1"
      />

      {loading ? (
        <LoadingBlock />
      ) : sections.length === 0 ? (
        <EmptyState
          title="Estamos actualizando el catálogo"
          description="Vuelve en un rato o escríbenos y te contamos lo que ofrecemos."
          action={<Button to="/contacto" variant="secondary">Escribirnos</Button>}
        />
      ) : (
        <>
          {sections.length > 1 && (
            <nav aria-label="Ir a una sección" className="-mx-5 mb-12 overflow-x-auto px-5 sm:mx-0 sm:px-0">
              <ul className="flex w-max gap-2 sm:w-auto sm:flex-wrap sm:justify-center">
                {sections.map((section) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className="inline-flex min-h-[44px] items-center whitespace-nowrap rounded-full border border-line bg-surface px-5 text-sm font-medium text-ink-600 transition hover:border-brand-300 hover:bg-blush hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
                    >
                      {section.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          <div className="mx-auto max-w-3xl space-y-14">
            {sections.map((section) => (
              <section key={section.id} id={section.id} className="scroll-mt-24" aria-labelledby={`titulo-${section.id}`}>
                <div className="mb-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-1 border-b border-line pb-3">
                  <h2 id={`titulo-${section.id}`} className="text-2xl sm:text-3xl">
                    {section.label}
                  </h2>
                  {section.occasion && (
                    <Link
                      to={`/ocasiones/${section.occasion.slug}`}
                      className="inline-flex min-h-[44px] items-center text-sm font-medium text-brand-700 underline-offset-4 hover:underline"
                    >
                      Más sobre {section.occasion.name.toLowerCase()}
                    </Link>
                  )}
                </div>

                <ul className="space-y-3">
                  {section.services.map((service, i) => (
                    <Reveal as="li" key={service.id} delay={Math.min(i * 0.05, 0.2)} y={14}>
                      <MenuRow service={service} occasionSlug={section.occasions.length === 1 ? section.occasions[0] : null} />
                    </Reveal>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** Una línea de la carta: foto vertical, nombre, lo que incluye y el valor. */
function MenuRow({ service, occasionSlug }) {
  const cover = visibleImages(service.images)[0];
  const price = priceLabel(service);
  const season = seasonText(service);
  const summary = service.includes?.length ? service.includes.slice(0, 3).join(' · ') : service.shortDescription;
  const href = occasionSlug ? `/servicios/${service.slug}?ocasion=${occasionSlug}` : `/servicios/${service.slug}`;

  return (
    <Link
      to={href}
      className="group flex gap-4 rounded-2xl border border-line bg-surface p-3 shadow-soft transition hover:border-brand-200 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 sm:p-4"
    >
      <div className="w-20 shrink-0 overflow-hidden rounded-xl bg-blush sm:w-24">
        {cover ? (
          <img {...photoProps(cover.url, '6rem')} alt="" loading="lazy" decoding="async" className="aspect-[4/5] w-full object-cover" />
        ) : (
          <div className="flex aspect-[4/5] items-center justify-center text-brand-300">
            <StarPlaceholder className="h-7 w-7" />
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-sans text-[15px] font-medium leading-snug text-ink-800 transition-colors group-hover:text-brand-700 sm:text-base">
            {service.name}
          </h3>
          <p className="shrink-0 whitespace-nowrap text-right font-display text-lg leading-tight text-brand-700 sm:text-xl">
            {price.short}
          </p>
        </div>
        <p className="mt-1 text-[13px] leading-snug text-ink-500 line-clamp-2">{summary}</p>
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-2 text-xs text-ink-500">
          <span>{duration(service.durationMinutes)}</span>
          {/* Con fechas se dicen cuáles (en minúscula, que se lee mejor que
              un sello en mayúsculas); sin ellas, el sello "Temporada". */}
          {season ? (
            <span className="inline-flex items-center gap-1 font-medium text-gold-700">
              <CalendarIcon className="h-3.5 w-3.5" />
              {season}
            </span>
          ) : (
            isSeasonalService(service) && <Badge tone="gold">Temporada</Badge>
          )}
        </div>
      </div>
    </Link>
  );
}

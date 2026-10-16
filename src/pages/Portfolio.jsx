import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PORTFOLIO_CATEGORIES } from '../data/portfolio.js';
import { useSettings } from '../context/SettingsContext.jsx';
import { whatsappLink } from '../lib/format.js';
import { SectionTitle, EmptyState, Button, Reveal, cx } from '../components/ui/index.jsx';
import PortfolioGallery from '../components/portfolio/PortfolioGallery.jsx';
import { categoriesWithPhotos, photosFor } from '../components/portfolio/selection.js';
import usePhotos from '../hooks/usePhotos.js';
import WhatsAppIcon from '../components/home/WhatsAppIcon.jsx';
import { firstName, instagramHandle } from '../components/home/contactInfo.js';

/**
 * Mi trabajo: la galería completa.
 *
 * El filtro vive en la URL (?categoria=novias) para que Yury pueda
 * mandar por WhatsApp el enlace directo a las fotos de novias, y para
 * que la franja de temporada enlace a las de Halloween.
 *
 * Las fotos salen de la biblioteca del panel (usePhotos), en el orden
 * que Yury eligió.
 */
export default function Portfolio() {
  const settings = useSettings();
  const { photos: library, loading } = usePhotos();
  const [searchParams, setSearchParams] = useSearchParams();
  const inSeason = settings.theme === 'HALLOWEEN';

  const requested = searchParams.get('categoria') ?? '';
  const category = PORTFOLIO_CATEGORIES.some((c) => c.id === requested) ? requested : '';

  const photos = useMemo(() => photosFor(library, category, { inSeason }), [library, category, inSeason]);

  // Solo se ofrecen los filtros que tienen fotos (por ejemplo, si se
  // ocultan las de menores, Quinceañeras puede quedar vacía).
  const filters = [
    { id: '', label: 'Todos' },
    ...categoriesWithPhotos(library),
  ];

  const setCategory = (value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set('categoria', value);
    else next.delete('categoria');
    setSearchParams(next, { replace: true });
  };

  const number = settings.whatsappNumber || settings.contactPhone;
  const handle = instagramHandle(settings.instagramUrl);

  return (
    <div className="container-page py-14 sm:py-20">
      <SectionTitle
        eyebrow="Portafolio"
        title="Mi trabajo"
        // Sin nombrar categorías: si se ocultan las fotos de menores
        // (SHOW_MINORS), "quinceañeras" prometería algo que no está.
        subtitle="Fotos reales de mi trabajo, por ocasión. Toca una foto para verla en grande."
        className="mb-10"
        as="h1"
      />

      <div className="mb-8 flex flex-wrap justify-center gap-2" role="group" aria-label="Filtrar trabajos por tipo">
        {filters.map((filter) => {
          const active = category === filter.id;
          return (
            <button
              key={filter.id || 'todos'}
              type="button"
              onClick={() => setCategory(filter.id)}
              aria-pressed={active}
              className={cx(
                'min-h-[44px] rounded-full border px-5 text-sm font-medium transition-all duration-200',
                active
                  ? 'border-brand-600 bg-brand-600 text-on-brand shadow-soft'
                  : 'border-line bg-surface text-ink-600 hover:border-brand-300 hover:bg-blush',
              )}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      {/* Se anuncia el cambio de filtro a quien usa lector de pantalla */}
      <p className="sr-only" aria-live="polite">
        {loading ? 'Cargando fotos' : `${photos.length} fotos`}
      </p>

      {loading ? (
        <GallerySkeleton />
      ) : photos.length === 0 ? (
        <EmptyState
          title="Todavía no hay fotos aquí"
          description="Por ahora no hay fotos de este tipo. Mira las demás categorías."
          action={
            <Button onClick={() => setCategory('')} variant="secondary">
              Ver todos
            </Button>
          }
        />
      ) : (
        <PortfolioGallery key={category || 'todos'} photos={photos} eager={4} />
      )}

      <Reveal className="mt-14">
        <div className="veil flex flex-col items-center gap-5 rounded-[2rem] border border-line px-6 py-10 text-center sm:px-12">
          <h2 className="text-balance text-2xl sm:text-3xl">¿Te gusta lo que ves?</h2>
          <p className="text-pretty max-w-lg text-[15px] leading-relaxed text-ink-600">
            Reserva tu cita en línea o escríbeme para contarme qué tienes en mente.
          </p>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button to="/reservar" size="lg">
              Reservar mi cita
            </Button>
            {number && (
              <Button
                href={whatsappLink(number, `Hola ${firstName(settings.brandName)}, vi tus trabajos en la web y quisiera cotizar.`)}
                target="_blank"
                rel="noopener noreferrer"
                variant="secondary"
                size="lg"
              >
                <WhatsAppIcon className="h-5 w-5 text-wa" />
                Escribir por WhatsApp
                <span className="sr-only">(se abre en una pestaña nueva)</span>
              </Button>
            )}
          </div>
          {settings.instagramUrl && (
            <a
              href={settings.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block py-2 text-sm font-medium text-brand-700 underline decoration-brand-300 underline-offset-4 transition hover:decoration-brand-600"
            >
              Ver más en Instagram{handle ? ` ${handle}` : ''}
              <span className="sr-only"> (se abre en una pestaña nueva)</span>
            </a>
          )}
        </div>
      </Reveal>
    </div>
  );
}

/** Casillas vacías del mismo tamaño mientras llegan las fotos: la página no salta. */
function GallerySkeleton() {
  return (
    <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4" aria-hidden="true">
      {Array.from({ length: 8 }, (_, i) => (
        <li key={i} className="aspect-[4/5] animate-pulse rounded-2xl border border-line bg-blush sm:rounded-3xl" />
      ))}
    </ul>
  );
}

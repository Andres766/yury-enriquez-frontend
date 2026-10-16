import { Button, Reveal, SectionTitle } from '../ui/index.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import PortfolioGallery from '../portfolio/PortfolioGallery.jsx';
import { HALLOWEEN_HERO_URL, previewPhotos, seasonalPhotos } from '../portfolio/selection.js';
import usePhotos from '../../hooks/usePhotos.js';

/**
 * "Mi trabajo" en el inicio: seis fotos reales justo después de la
 * portada. Para una maquilladora, el trabajo es lo que convence; por
 * eso va antes que los precios.
 *
 * Sin filtro aquí: con seis fotos, cuatro pestañas dejarían una o dos
 * por pestaña. El filtro está en /trabajos.
 *
 * Primero van las que Yury marcó como destacadas en Panel → Fotos.
 */
export default function PortfolioPreview() {
  const settings = useSettings();
  const inSeason = settings.theme === 'HALLOWEEN';
  const { photos: library, loading } = usePhotos();

  // En temporada la portada ya muestra la media catrina y la franja de
  // temporada otras dos: ninguna se repite aquí.
  const photos = previewPhotos(library, {
    inSeason,
    exclude: inSeason ? [HALLOWEEN_HERO_URL, ...seasonalPhotos(library).map((p) => p.url)] : [],
  });
  if (!loading && photos.length === 0) return null;

  return (
    <section className="container-page py-14 sm:py-20" aria-labelledby="titulo-trabajos">
      <SectionTitle eyebrow="Mi trabajo" title="Trabajos reales" className="mb-8 sm:mb-12" as="h2" />
      <span id="titulo-trabajos" className="sr-only">
        Mi trabajo
      </span>

      {loading ? (
        // Mismas casillas mientras llegan las fotos, para que el inicio no salte.
        <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4" aria-hidden="true">
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i} className="aspect-[4/5] animate-pulse rounded-2xl border border-line bg-blush sm:rounded-3xl" />
          ))}
        </ul>
      ) : (
        <PortfolioGallery
          photos={photos}
          className="grid-cols-2 sm:grid-cols-3"
          sizes="(min-width: 1024px) 370px, (min-width: 640px) 33vw, 50vw"
        />
      )}

      <Reveal delay={0.1} className="mt-8 flex flex-col items-center gap-3 sm:mt-10">
        <Button to="/trabajos" variant="secondary" size="lg">
          Ver todos mis trabajos
        </Button>
      </Reveal>
    </section>
  );
}

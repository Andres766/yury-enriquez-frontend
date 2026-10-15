import { Button, Reveal, SectionTitle } from '../ui/index.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import PortfolioGallery from '../portfolio/PortfolioGallery.jsx';
import { previewPhotos } from '../portfolio/selection.js';
import { PORTFOLIO } from '../../data/portfolio.js';

/**
 * "Mi trabajo" en el inicio: seis fotos reales justo después de la
 * portada. Para una maquilladora, el trabajo es lo que convence; por
 * eso va antes que los precios.
 *
 * Sin filtro aquí: con seis fotos, cuatro pestañas dejarían una o dos
 * por pestaña. El filtro está en /trabajos.
 */
export default function PortfolioPreview() {
  const settings = useSettings();
  const inSeason = settings.theme === 'HALLOWEEN';

  // En temporada la portada ya muestra la media catrina y la sección de
  // Catrina el resto de catrinas: ninguna se repite aquí.
  const photos = previewPhotos({
    inSeason,
    exclude: inSeason ? PORTFOLIO.filter((p) => p.catrina).map((p) => p.id) : [],
  });
  if (photos.length === 0) return null;

  return (
    <section className="container-page py-14 sm:py-20" aria-labelledby="titulo-trabajos">
      <SectionTitle eyebrow="Mi trabajo" title="Trabajos reales" className="mb-8 sm:mb-12" as="h2" />
      <span id="titulo-trabajos" className="sr-only">
        Mi trabajo
      </span>

      <PortfolioGallery
        photos={photos}
        className="grid-cols-2 sm:grid-cols-3"
        sizes="(min-width: 1024px) 370px, (min-width: 640px) 33vw, 50vw"
      />

      <Reveal delay={0.1} className="mt-8 flex flex-col items-center gap-3 sm:mt-10">
        <Button to="/trabajos" variant="secondary" size="lg">
          Ver todos mis trabajos
        </Button>
      </Reveal>
    </section>
  );
}

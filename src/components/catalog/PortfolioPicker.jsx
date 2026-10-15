import { useState } from 'react';
import { PORTFOLIO, PORTFOLIO_CATEGORIES, photoSources } from '../../data/portfolio.js';
import { Badge, cx } from '../ui/index.jsx';

/**
 * "Elegir de mis trabajos" (panel).
 *
 * Las fotos reales ya están en la web (public/img/trabajos), así que
 * Yury no tiene que copiar rutas a mano: toca una y queda puesta con su
 * texto alternativo. Se guarda la versión de 960 px; la web pública pide
 * sola la de 480 en el celular.
 *
 * Las fotos de menores llevan aviso: antes de publicarlas hace falta la
 * autorización por escrito de su acudiente.
 */
export const portfolioUrl = (id) => `/img/trabajos/${id}-960.webp`;

export default function PortfolioPicker({ onPick, selected = [], label = 'Elegir de mis trabajos' }) {
  const [open, setOpen] = useState(false);
  const chosen = new Set(selected);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="min-h-[44px] text-xs font-medium text-brand-700 transition hover:underline"
      >
        {open ? 'Cerrar mis trabajos' : `${label} (${PORTFOLIO.length})`}
      </button>

      {open && (
        <div className="mt-2 space-y-4 rounded-xl border border-line bg-cream p-3">
          {PORTFOLIO_CATEGORIES.map((category) => {
            const photos = PORTFOLIO.filter((photo) => photo.category === category.id);
            if (photos.length === 0) return null;
            return (
              <div key={category.id}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-ink-400">{category.label}</p>
                <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {photos.map((photo) => {
                    const url = portfolioUrl(photo.id);
                    const isChosen = chosen.has(url);
                    return (
                      <li key={photo.id}>
                        <button
                          type="button"
                          onClick={() => onPick({ url, alt: photo.alt, photo })}
                          aria-pressed={isChosen}
                          aria-label={`${photo.alt}${photo.menor ? ' (menor de edad)' : ''}`}
                          title={photo.alt}
                          className={cx(
                            'relative block w-full overflow-hidden rounded-lg border-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600',
                            isChosen ? 'border-brand-500' : 'border-transparent hover:border-brand-200',
                          )}
                        >
                          <img
                            src={photoSources(photo.id).src.replace('-960', '-480')}
                            alt=""
                            loading="lazy"
                            style={{ objectPosition: photo.focus }}
                            className="aspect-[4/5] w-full object-cover"
                          />
                          {photo.menor && (
                            <span className="absolute inset-x-1 bottom-1">
                              <Badge tone="gold" className="px-1.5 py-0 text-[9px]">Menor</Badge>
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
          <p className="hint-text">
            Las marcadas «Menor» necesitan la autorización por escrito de la mamá, el papá o el acudiente antes de
            publicarlas.
          </p>
        </div>
      )}
    </div>
  );
}

import { PORTFOLIO, PORTFOLIO_CATEGORIES } from '../../data/portfolio.js';

/**
 * Qué fotos se muestran en cada sitio.
 *
 * Las de Halloween y catrinas son un grupo aparte: fuera de temporada
 * no se mezclan con las novias en "Todos" ni en el inicio (payasos de
 * terror junto a un vestido blanco confunden a quien viene a cotizar su
 * boda). En la página de trabajos siempre se pueden ver con su filtro.
 */

export const SEASON_CATEGORY = 'temporada';

/** Orden de las categorías en "Todos": en temporada, la de temporada primero. */
function categoryOrder(inSeason) {
  const ids = PORTFOLIO_CATEGORIES.map((c) => c.id).filter((id) => id !== SEASON_CATEGORY);
  return inSeason ? [SEASON_CATEGORY, ...ids] : ids;
}

/** Fotos de una categoría, o de "Todos" si `category` está vacía. */
export function photosFor(category, { inSeason = false } = {}) {
  if (category) return PORTFOLIO.filter((p) => p.category === category);
  return categoryOrder(inSeason).flatMap((id) => PORTFOLIO.filter((p) => p.category === id));
}

/**
 * Las fotos del inicio: primero las destacadas de novias, quinceañeras y
 * social (las clientas que más deciden mirando trabajos), luego se va
 * rellenando por turnos entre categorías para que no salgan seis de lo
 * mismo. En temporada abren dos de Halloween o catrina, sin repetir la
 * que ya está en la portada (`exclude`).
 */
export function previewPhotos({ inSeason = false, count = 6, exclude = [] } = {}) {
  const skip = new Set(exclude);
  const picked = [];
  const take = (photo) => {
    if (photo && !skip.has(photo.id) && !picked.includes(photo) && picked.length < count) picked.push(photo);
  };

  if (inSeason) {
    PORTFOLIO.filter((p) => p.category === SEASON_CATEGORY && !skip.has(p.id))
      .slice(0, 2)
      .forEach(take);
  }

  const regular = categoryOrder(false);
  regular.forEach((id) => take(PORTFOLIO.find((p) => p.category === id && p.featured)));

  const queues = regular.map((id) => PORTFOLIO.filter((p) => p.category === id));
  while (picked.length < count && queues.some((q) => q.length > 0)) {
    queues.forEach((q) => {
      while (q.length > 0) {
        const next = q.shift();
        if (!picked.includes(next) && !skip.has(next.id)) {
          take(next);
          break;
        }
      }
    });
  }

  return picked;
}

import { PORTFOLIO_CATEGORIES } from '../../data/portfolio.js';

/**
 * Qué fotos se muestran en cada sitio.
 *
 * Todas las funciones reciben la lista de fotos (de usePhotos), que ya
 * viene en el orden que Yury eligió en el panel: aquí se respeta ese
 * orden y solo se decide qué entra.
 *
 * Las de Halloween y catrinas son un grupo aparte: fuera de temporada
 * no se mezclan con las novias en "Todos" ni en el inicio (payasos de
 * terror junto a un vestido blanco confunden a quien viene a cotizar su
 * boda). En la página de trabajos siempre se pueden ver con su filtro.
 */

export const SEASON_CATEGORY = 'temporada';

/**
 * La catrina de la portada en temporada (ver Hero). Va fija porque es la
 * foto de la web elegida para eso; las demás de temporada salen de la
 * biblioteca.
 */
export const HALLOWEEN_HERO_URL = '/img/trabajos/catrina-media-cara-960.webp';

/** Categorías que tienen al menos una foto, en el orden de siempre. */
export const categoriesWithPhotos = (photos) =>
  PORTFOLIO_CATEGORIES.filter((c) => photos.some((p) => p.category === c.id));

/**
 * Fotos de una categoría, o de "Todos" si `category` está vacía. En
 * "Todos" las de temporada solo salen en temporada, y entonces primero.
 */
export function photosFor(photos, category, { inSeason = false } = {}) {
  if (category) return photos.filter((p) => p.category === category);
  const regular = photos.filter((p) => p.category !== SEASON_CATEGORY);
  return inSeason ? [...photos.filter((p) => p.category === SEASON_CATEGORY), ...regular] : regular;
}

/**
 * Las dos fotos de la franja de temporada del inicio: las de temporada
 * que Yury marcó como destacadas y, si no hay, las primeras de su orden.
 * Nunca la catrina que ya está en la portada.
 */
export function seasonalPhotos(photos, count = 2) {
  const season = photos.filter((p) => p.category === SEASON_CATEGORY && p.url !== HALLOWEEN_HERO_URL);
  return [...season.filter((p) => p.featured), ...season.filter((p) => !p.featured)].slice(0, count);
}

/**
 * Las fotos del inicio: primero las destacadas (las que Yury marcó, en
 * su orden), luego se va rellenando por turnos entre categorías para que
 * no salgan seis de lo mismo. En temporada abren dos de Halloween o
 * catrina, sin repetir las que ya están en la portada y en la franja
 * (`exclude`, por URL).
 */
export function previewPhotos(photos, { inSeason = false, count = 6, exclude = [] } = {}) {
  const skip = new Set(exclude);
  const picked = [];
  const take = (photo) => {
    if (photo && !skip.has(photo.url) && !picked.includes(photo) && picked.length < count) picked.push(photo);
  };

  if (inSeason) {
    const season = photos.filter((p) => p.category === SEASON_CATEGORY && !skip.has(p.url));
    [...season.filter((p) => p.featured), ...season.filter((p) => !p.featured)].slice(0, 2).forEach(take);
  }

  const regular = photos.filter((p) => p.category !== SEASON_CATEGORY);
  regular.filter((p) => p.featured).forEach(take);

  // Por turnos entre categorías; las fotos sin categoría van en su propia fila.
  const groups = [...new Set(regular.map((p) => p.category ?? ''))];
  const queues = groups.map((id) => regular.filter((p) => (p.category ?? '') === id));
  while (picked.length < count && queues.some((q) => q.length > 0)) {
    queues.forEach((q) => {
      while (q.length > 0) {
        const next = q.shift();
        if (!picked.includes(next) && !skip.has(next.url)) {
          take(next);
          break;
        }
      }
    });
  }

  return picked;
}

/**
 * Qué categoría de fotos va con cada ocasión. Grados, fiestas y eventos
 * usan las fotos de social y noche; sesiones de fotos aún no tiene
 * categoría propia, así que no muestra galería.
 */
const OCCASION_CATEGORY = {
  bodas: 'novias',
  quinceaneros: 'quinceaneras',
  grados: 'social',
  fiestas: 'social',
  'eventos-sociales': 'social',
};

export const categoryForOccasion = (slug) => OCCASION_CATEGORY[slug] ?? null;

export const photosForOccasion = (photos, slug) => {
  const category = categoryForOccasion(slug);
  return category ? photos.filter((p) => p.category === category) : [];
};

import { api } from '../../lib/api.js';
import { PORTFOLIO, PORTFOLIO_CATEGORIES } from '../../data/portfolio.js';
import usePhotos, { refreshPhotos } from '../../hooks/usePhotos.js';

/**
 * Biblioteca de fotos del panel: lo que comparten la página Fotos, el
 * selector de fotos y los editores de servicios, ocasiones y ajustes.
 */

/** Las mismas categorías de «Mi trabajo», con los mismos nombres. */
export const PHOTO_CATEGORIES = PORTFOLIO_CATEGORIES;
export const CATEGORY_LABEL = Object.fromEntries(PHOTO_CATEGORIES.map((c) => [c.id, c.label]));

/** Filtros del panel: todas, cada categoría y las que aún no tienen. */
export const PHOTO_FILTERS = [
  { id: 'all', label: 'Todas' },
  ...PHOTO_CATEGORIES,
  { id: 'none', label: 'Sin categoría' },
];

export function filterPhotos(photos, filter) {
  if (filter === 'all') return photos;
  if (filter === 'none') return photos.filter((p) => !p.category);
  return photos.filter((p) => p.category === filter);
}

// ── Punto de enfoque ("50% 30%", igual que CSS object-position) ─────

export const DEFAULT_FOCUS = '50% 50%';
const FOCUS_RE = /^(\d{1,3})% (\d{1,3})%$/;

export function parseFocus(focus) {
  const match = FOCUS_RE.exec(focus ?? '');
  if (!match) return [50, 50];
  return [Math.min(100, Number(match[1])), Math.min(100, Number(match[2]))];
}

const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)));
export const formatFocus = (x, y) => `${clamp(x)}% ${clamp(y)}%`;

// ── Dónde se usa una foto ────────────────────────────────────────────

const USED_BY_KIND = {
  service: 'Servicio',
  occasion: 'Ocasión',
  hero: 'Inicio',
  about: 'Inicio',
};

/** "Servicio: Maquillaje de novia" / "Inicio: foto principal". */
export function usedByLabel(use) {
  if (use.type === 'hero') return 'Inicio: foto principal';
  if (use.type === 'about') return 'Inicio: foto de «Sobre mí»';
  return `${USED_BY_KIND[use.type] ?? 'En uso'}: ${use.name ?? ''}`.trim();
}

// ── Carga compartida ─────────────────────────────────────────────────

/*
 * Respaldo sin conexión: si la API de fotos no responde (servidor
 * dormido, internet caído), el selector ofrece al menos las fotos que
 * vienen con la web, para no dejar a Yury sin poder elegir.
 */
const OFFLINE_LIBRARY = PORTFOLIO.map((photo, index) => ({
  id: `local-${photo.id}`,
  url: `/img/trabajos/${photo.id}-960.webp`,
  alt: photo.alt,
  category: photo.category,
  focus: photo.focus ?? DEFAULT_FOCUS,
  minor: Boolean(photo.menor),
  featured: Boolean(photo.featured),
  inGallery: true,
  credit: photo.credito ?? null,
  sortOrder: index,
  usedBy: [],
  offline: true,
}));

let cache = null; // { at, promise }
const CACHE_MS = 60_000;

/**
 * Todas las fotos (también las que no salen en «Mi trabajo»), con
 * `usedBy`. Se guarda un minuto para no pedirlas cada vez que se abre el
 * selector. Devuelve { photos, offline }.
 */
export function loadPhotoLibrary({ force = false } = {}) {
  if (!force && cache && Date.now() - cache.at < CACHE_MS) return cache.promise;
  const promise = api
    .get('/photos/admin')
    .then((data) => ({ photos: data?.photos ?? [], offline: false }))
    .catch(() => {
      cache = null;
      return { photos: OFFLINE_LIBRARY, offline: true };
    });
  cache = { at: Date.now(), promise };
  return promise;
}

/**
 * Tras subir, editar, ordenar o borrar: la próxima apertura del selector
 * vuelve a pedirlas, y la web pública abierta en esta misma pestaña
 * (si Yury pasa del panel a «Mi trabajo») ya ve el cambio sin recargar.
 */
export function invalidatePhotoLibrary() {
  cache = null;
  refreshPhotos().catch(() => {});
}

/**
 * Mapa url → foto, para que las vistas previas del panel usen el mismo
 * encuadre que usará la web.
 *
 * Sale de la MISMA fuente que la parte pública (usePhotos: solo las fotos
 * que salen en «Mi trabajo», sin las de menores si SHOW_MINORS está
 * apagado, y las de serie como respaldo), no de la biblioteca completa
 * del panel. Con la completa, una portada que no sale en la galería se
 * veía aquí con su encuadre de la biblioteca y en la web con el de serie.
 */
export function useLibraryByUrl() {
  return usePhotos().byUrl;
}

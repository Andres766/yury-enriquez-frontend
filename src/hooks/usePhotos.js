import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { PORTFOLIO, SHOW_MINORS } from '../data/portfolio.js';

/**
 * La biblioteca de fotos del sitio (Panel → Fotos).
 *
 * Se pide UNA vez por visita y se guarda en memoria del módulo: la
 * galería, el inicio, las fichas y las tarjetas la comparten sin repetir
 * la petición. Todas las fotos llegan con la misma forma:
 *   { id, url, width, height, alt, category, featured, focus, credit, minor }
 *
 * Respaldo: si la API no responde o devuelve la lista vacía, se usan las
 * fotos que vienen con la web (data/portfolio.js). Así la galería nunca
 * aparece vacía por una caída del servidor ni antes de importar las
 * fotos a la base de datos. Un fallo no queda guardado: la siguiente
 * página que la pida lo vuelve a intentar.
 *
 * `refreshPhotos()` vuelve a pedirla y avisa a todos los componentes
 * montados; es para que el panel, después de guardar, deje la web
 * abierta en la misma pestaña con las fotos nuevas sin recargar.
 */

/** Las fotos que vienen con la web, con la misma forma que las de la API. */
export const STATIC_PHOTOS = PORTFOLIO.map((photo) => ({
  id: photo.id,
  url: `/img/trabajos/${photo.id}-960.webp`,
  width: null,
  height: null,
  alt: photo.alt ?? '',
  category: photo.category ?? null,
  featured: Boolean(photo.featured),
  focus: photo.focus ?? '50% 50%',
  credit: photo.credito ?? null,
  minor: Boolean(photo.menor),
}));

/**
 * Clave para buscar una foto por su URL. Las de la web existen en 480 y
 * 960: un servicio puede guardar cualquiera de las dos y es la misma foto.
 */
export function photoKey(url) {
  return String(url ?? '').replace(/^(\/img\/trabajos\/.+)-480\.webp$/, '$1-960.webp');
}

function snapshot(photos, error = null, fromApi = false) {
  return { photos, byUrl: new Map(photos.map((photo) => [photoKey(photo.url), photo])), error, fromApi };
}

const FALLBACK = snapshot(STATIC_PHOTOS);

let cache = null; // la última respuesta buena de la API
// El respaldo del último fallo: las páginas que se abren después lo
// muestran de una vez mientras se reintenta, en vez del esqueleto (si la
// API tarda en fallar, cada página se quedaría en blanco ese rato).
let lastFailure = null;
let pending = null;
// Cada refreshPhotos() abre una "generación" nueva. Una respuesta de una
// generación anterior se descarta: si Yury guarda dos cambios seguidos en
// el panel, la petición que salió antes del segundo no puede quedar como
// la buena (la web de esa pestaña seguiría sin el último cambio).
let generation = 0;
const listeners = new Set();

function publish(value) {
  listeners.forEach((listener) => listener(value));
}

function load() {
  if (cache) return Promise.resolve(cache);
  if (!pending) {
    const gen = generation;
    pending = api
      .get('/photos')
      .then((data) => {
        // El interruptor de fotos de menores (SHOW_MINORS) también manda
        // sobre las de la biblioteca: apagado, no sale ninguna marcada.
        const photos = (Array.isArray(data?.photos) ? data.photos : []).filter(
          (photo) => photo?.url && (SHOW_MINORS || !photo.minor),
        );
        return { ok: photos.length > 0 ? snapshot(photos, null, true) : FALLBACK };
      })
      .catch((error) => ({ failed: snapshot(STATIC_PHOTOS, error) }))
      .then(({ ok, failed }) => {
        // Llegó tarde: ya hay otra petición más nueva; se espera esa.
        if (gen !== generation) return load();
        pending = null;
        if (ok) {
          cache = ok;
          lastFailure = null;
        } else {
          lastFailure = failed;
        }
        const value = ok ?? failed;
        publish(value);
        return value;
      });
  }
  return pending;
}

/** Vuelve a pedir la biblioteca (por ejemplo, después de editarla en el panel). */
export function refreshPhotos() {
  generation += 1;
  cache = null;
  pending = null;
  return load();
}

/**
 * { photos, byUrl, loading, error }. Mientras carga, `photos` está
 * vacía y `loading` es true: quien pinta la galería pone su esqueleto en
 * vez de mostrar fotos que quizás Yury ya quitó.
 */
export default function usePhotos() {
  const [state, setState] = useState(() => cache ?? lastFailure);

  useEffect(() => {
    let alive = true;
    const listener = (value) => alive && setState(value);
    listeners.add(listener);
    // Si la respuesta llegó entre el primer render y este efecto, se
    // toma de la caché; si no, se pide (o se espera la que ya va).
    if (cache) setState(cache);
    else load();
    return () => {
      alive = false;
      listeners.delete(listener);
    };
  }, []);

  if (!state) return { photos: [], byUrl: FALLBACK.byUrl, loading: true, error: null };
  return { photos: state.photos, byUrl: state.byUrl, loading: false, error: state.error };
}

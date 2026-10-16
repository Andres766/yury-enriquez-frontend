import { imageSources } from '../../lib/images.js';
import { DEFAULT_FOCUS, portfolioPhoto } from '../../lib/catalog.js';
import { photoKey } from '../../hooks/usePhotos.js';

/**
 * Atributos de <img> para cualquier foto del sitio, según la casilla.
 *
 * Cada casilla pide solo el tamaño que necesita: una miniatura del
 * asistente no baja la foto de 1600 px que se ve en el visor. Las fotos
 * de Cloudinary se piden ya recortadas de ancho (ver lib/images.js); las
 * de la web traen su par 480/960; cualquier otra URL va tal cual.
 */

export const SLOTS = {
  /** Miniaturas: botones de la ficha, asistente de reserva. */
  thumb: { widths: [160, 320], fallback: 320 },
  /** Casillas de una cuadrícula y tarjetas. */
  tile: { widths: [320, 480, 640, 960], fallback: 640 },
  /** Portadas y la foto grande de la ficha. */
  large: { widths: [480, 960, 1600], fallback: 960 },
  /** Visor a pantalla completa. */
  full: { widths: [960, 1600, 2400], fallback: 1600 },
};

const FOCUS = /^(\d{1,3})% (\d{1,3})%$/;
// Lo que guarda la base de datos cuando nadie eligió un punto.
const UNSET_FOCUS = '50% 50%';

function validFocus(value) {
  const match = FOCUS.exec(value ?? '');
  return match && Number(match[1]) <= 100 && Number(match[2]) <= 100 ? value : null;
}

/**
 * Qué parte de la foto no se puede recortar (CSS object-position).
 *
 * Se mira, en orden:
 *   1. el punto que se eligió para esta casilla (la foto de un servicio,
 *      la portada), salvo "50% 50%", que es lo que guarda la base de
 *      datos cuando nadie eligió nada;
 *   2. el de esa foto en la biblioteca, tal cual (ahí Yury lo elige);
 *   3. el que traía la foto en la web (data/portfolio.js);
 *   4. el centro, si la casilla lo decía, o la cara en el tercio de
 *      arriba, como siempre en el catálogo.
 * Sin el paso 1 así, las fotos que ya estaban en los servicios perderían
 * su encuadre (la cara arriba) el día que se creó el campo.
 */
export function focusFor(url, explicit, byUrl) {
  const own = validFocus(explicit);
  if (own && own !== UNSET_FOCUS) return own;
  return (
    validFocus(byUrl?.get(photoKey(url))?.focus) ?? validFocus(portfolioPhoto(url)?.focus) ?? own ?? DEFAULT_FOCUS
  );
}

/**
 * { src, srcSet, sizes, style } listos para esparcir en <img>.
 * `slot` es una clave de SLOTS; `sizes` el ancho real de la casilla.
 *
 * Para una foto de la biblioteca (la galería) se pasa `photo`: su punto
 * es el que Yury eligió para esa foto y manda tal cual, aunque sea el
 * centro. Para la foto de un servicio, una ocasión o la portada se pasa
 * `focus` (el de esa casilla, si hay) y `byUrl` (de usePhotos), y el
 * punto se busca con focusFor.
 */
export function photoImgProps(url, { slot = 'tile', sizes, focus, byUrl, photo } = {}) {
  const { src, srcSet } = imageSources(url, SLOTS[slot] ?? SLOTS.tile);
  const objectPosition = photo ? validFocus(photo.focus) ?? DEFAULT_FOCUS : focusFor(url, focus, byUrl);
  return {
    src,
    srcSet,
    sizes: srcSet ? sizes : undefined,
    style: { objectPosition },
  };
}

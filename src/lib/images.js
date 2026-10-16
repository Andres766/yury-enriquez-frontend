/**
 * Fuentes de imagen para cualquier foto del sitio.
 *
 * Las fotos llegan de dos sitios:
 *   · Cloudinary (las que Yury sube desde el panel): se pide cada tamaño
 *     con una transformación en la URL. f_auto entrega WebP/AVIF según el
 *     navegador, q_auto ajusta la calidad y c_limit nunca agranda.
 *   · La propia web (/img/trabajos/<id>-960.webp): ya vienen en 480 y 960.
 * Cualquier otra URL se usa tal cual, sin srcSet.
 *
 * Uso:  const { src, srcSet } = imageSources(url);
 *       <img src={src} srcSet={srcSet} sizes="…" />
 */

const CLOUDINARY_UPLOAD = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/;
const SITE_VARIANT = /^(\/img\/trabajos\/.+)-(480|960)\.webp$/;

export const isCloudinary = (url) => CLOUDINARY_UPLOAD.test(url ?? '');

/** URL de Cloudinary con ancho máximo `width` (o la misma URL si no es de Cloudinary). */
export function cloudinaryVariant(url, width) {
  const match = (url ?? '').match(CLOUDINARY_UPLOAD);
  if (!match) return url;
  return `${match[1]}f_auto,q_auto,c_limit,w_${width}/${match[2]}`;
}

/**
 * { src, srcSet } listos para <img>. `widths` son los anchos que se
 * ofrecen al navegador; `fallback` es el ancho de `src`.
 */
export function imageSources(url, { widths = [480, 960, 1600], fallback = 960 } = {}) {
  if (!url) return { src: undefined, srcSet: undefined };

  if (isCloudinary(url)) {
    return {
      src: cloudinaryVariant(url, fallback),
      srcSet: widths.map((w) => `${cloudinaryVariant(url, w)} ${w}w`).join(', '),
    };
  }

  const site = url.match(SITE_VARIANT);
  if (site) {
    return {
      src: `${site[1]}-960.webp`,
      srcSet: `${site[1]}-480.webp 480w, ${site[1]}-960.webp 960w`,
    };
  }

  return { src: url, srcSet: undefined };
}

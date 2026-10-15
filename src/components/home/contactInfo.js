import { normalizeCoPhone } from '../../lib/format.js';

/**
 * Datos de contacto listos para mostrar.
 *
 * El panel guarda el teléfono como lo escriba Yury ("+573218549608",
 * "321 854 9608"…). Para leerlo de un vistazo se muestra siempre igual:
 * "+57 321 854 9608". Lo que no sea un celular colombiano se deja tal
 * cual, sin adivinar el formato.
 */
export function formatCoPhone(raw) {
  const digits = normalizeCoPhone(raw);
  if (digits.length === 12 && digits.startsWith('573')) {
    return `+57 ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
  }
  return String(raw ?? '').trim();
}

/**
 * "@usuario" a partir del enlace de Instagram. Quien llega desde
 * Instagram reconoce la cuenta por el usuario, no por el ícono.
 * Si el enlace no tiene la forma esperada, devuelve null.
 */
export function instagramHandle(url) {
  if (!url) return null;
  try {
    const [first] = new URL(url).pathname.split('/').filter(Boolean);
    return first ? `@${first}` : null;
  } catch {
    return null;
  }
}

/** Primer nombre de la marca, para los saludos de WhatsApp ("Hola Yury"). */
export function firstName(brandName) {
  return String(brandName ?? '').trim().split(/\s+/)[0] || '';
}

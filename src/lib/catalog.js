/**
 * Reglas del catálogo que comparten las fichas, las tarjetas y el panel.
 *
 * Todo sale de datos que ya existen (servicios, ocasiones, ajustes y el
 * portafolio de fotos reales): aquí no se inventa ningún precio ni
 * ninguna condición del negocio.
 */
import { PORTFOLIO, SHOW_MINORS, photoSources } from '../data/portfolio.js';
import { money, priceLabel, whatsappLink } from './format.js';

// ── Ocasiones "de fecha" ─────────────────────────────────────────────

/**
 * Bodas y quinceañeros se separan con meses de anticipación y casi
 * siempre necesitan una conversación antes (prueba, lugar, horario de
 * madrugada). En esas, el botón principal es WhatsApp y el calendario
 * queda de segundo. Son los slugs del catálogo: el panel no deja
 * cambiarlos, así que no se rompen al editar una ocasión.
 */
export const DATE_OCCASIONS = new Set(['bodas', 'quinceaneros']);

/**
 * ¿Este servicio se separa por WhatsApp?
 *   · si se llegó desde una ocasión de fecha (?ocasion=bodas);
 *   · si es de novia (tiene Bodas);
 *   · o si TODAS sus ocasiones son de fecha (Paquete Quinceañera).
 * Maquillaje de noche también sirve para quinceañeros, pero sobre todo
 * para fiestas: ese sigue reservándose en línea.
 */
export function isDateService(service, occasionSlug) {
  if (occasionSlug && DATE_OCCASIONS.has(occasionSlug)) return true;
  const slugs = (service?.occasions ?? []).map((o) => o.slug);
  if (slugs.includes('bodas')) return true;
  return slugs.length > 0 && slugs.every((slug) => DATE_OCCASIONS.has(slug));
}

/**
 * Servicio de temporada: lleva su propio sello. Manda la temporada que
 * Yury pone en el panel (Desde/Hasta); el slug queda de respaldo para
 * catrinas y Halloween mientras no tengan fechas cargadas.
 */
export const isSeasonalService = (service) =>
  Boolean(service?.availableFrom || service?.availableUntil) || /catrina|halloween/i.test(service?.slug ?? '');

/**
 * ¿Ya pasó la temporada de este servicio? `today` es "YYYY-MM-DD" en la
 * zona del negocio; las fechas son inclusive, así que el último día
 * todavía cuenta. Comparar textos ISO basta: tienen el mismo formato.
 */
export const seasonIsOver = (service, today) => Boolean(service?.availableUntil) && service.availableUntil < today;

/** ¿La temporada aún no empieza? Se puede reservar desde ya para esos días. */
export const seasonIsAhead = (service, today) => Boolean(service?.availableFrom) && service.availableFrom > today;

// ── Enlaces con contexto ─────────────────────────────────────────────

/**
 * La ocasión que acompaña a una reserva desde la ficha: la de la URL si
 * el servicio de verdad la tiene, o la única que tenga. Así el asistente
 * no vuelve a preguntar algo que ya se sabe.
 */
export function bookingOccasion(service, occasionSlug) {
  const slugs = (service?.occasions ?? []).map((o) => o.slug);
  if (occasionSlug && slugs.includes(occasionSlug)) return occasionSlug;
  return slugs.length === 1 ? slugs[0] : null;
}

/** /reservar?servicio=…&ocasion=… sin parámetros vacíos. */
export function bookingPath({ service, occasion } = {}) {
  const params = new URLSearchParams();
  if (service) params.set('servicio', service);
  if (occasion) params.set('ocasion', occasion);
  const query = params.toString();
  return query ? `/reservar?${query}` : '/reservar';
}

/** Número de WhatsApp del negocio, o null si aún no está en Ajustes. */
export const businessWhatsapp = (settings) => settings?.whatsappNumber || settings?.contactPhone || null;

/**
 * Mensajes prellenados. Los "__" son huecos para que la clienta escriba
 * su fecha y su lugar sin tener que pensar qué contar.
 */
export function waMessage(kind, { brand, service, occasion } = {}) {
  const hola = `Hola ${brand || 'Yury'}`;
  const servicio = service?.name ? ` el ${service.name}` : '';
  switch (kind) {
    case 'fecha':
      if (occasion?.slug === 'bodas' || (!occasion && service?.occasions?.some((o) => o.slug === 'bodas'))) {
        return `${hola}, me caso el __ en __ y quiero asesoría para${servicio || ' mi maquillaje'}.`;
      }
      return `${hola}, mi evento${occasion ? ` (${occasion.name.toLowerCase()})` : ''} es el __ en __ y quiero separar la fecha para${servicio || ' el maquillaje'}.`;
    case 'cotizar':
      return `${hola}, vi${servicio} en tu página y quiero cotizarlo. Mi evento es el __ en __.`;
    case 'grupo':
      return `${hola}, somos __ personas para el __ y nos interesa${servicio || ' maquillarnos'}.`;
    default:
      return `${hola}, vi${servicio || (occasion ? ` la página de ${occasion.name.toLowerCase()}` : ' tu página')} y quería preguntarte…`;
  }
}

export function waHref(settings, kind, context) {
  const number = businessWhatsapp(settings);
  return number ? whatsappLink(number, waMessage(kind, { brand: settings.brandName, ...context })) : null;
}

// ── Precio de una ocasión ────────────────────────────────────────────

/**
 * "Desde $85.000": el precio más bajo entre los servicios de la ocasión
 * que tienen precio publicado (los de "cotizar" no cuentan). Es un dato
 * cierto aunque todos sean de precio fijo.
 */
export function occasionPriceFrom(services = []) {
  const priced = services.filter((s) => !priceLabel(s).isQuote && s.priceCents > 0);
  if (priced.length === 0) return null;
  const cheapest = priced.reduce((min, s) => (s.priceCents < min.priceCents ? s : min));
  return `Desde ${money(cheapest.priceCents, cheapest.currency)}`;
}

/** Días que se puede reservar en línea este servicio. */
export const advanceDaysFor = (service, settings) => service?.maxAdvanceDays ?? settings?.maxAdvanceDays ?? 90;

// ── Fotos ────────────────────────────────────────────────────────────

/**
 * Las casillas del catálogo son verticales (4:5) y las caras van en el
 * tercio de arriba: ese es el punto que se protege cuando la foto no
 * trae uno propio.
 */
export const DEFAULT_FOCUS = '50% 30%';

const TRABAJO = /^\/img\/trabajos\/([a-z0-9-]+)-(?:480|960)\.webp$/;
const BY_ID = new Map(PORTFOLIO.map((photo) => [photo.id, photo]));

/** Ficha del portafolio si la URL es una foto de /img/trabajos. */
export function portfolioPhoto(url) {
  const match = TRABAJO.exec(url ?? '');
  return match ? BY_ID.get(match[1]) ?? null : null;
}

/**
 * Fotos que no se deben mostrar. Si SHOW_MINORS está apagado, el
 * portafolio ya no trae las de menores; una foto de /img/trabajos que no
 * aparece en él se trata como oculta, aunque el panel la haya puesto en
 * un servicio o en una ocasión antes de apagarlo.
 */
export function isHiddenPhoto(url) {
  return !SHOW_MINORS && TRABAJO.test(url ?? '') && !portfolioPhoto(url);
}

/**
 * Atributos de <img> para una foto del catálogo: si es del portafolio,
 * con sus dos anchos y su punto de enfoque; si no, tal cual.
 */
export function photoProps(url, sizes = '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw') {
  const photo = portfolioPhoto(url);
  if (!photo) return { src: url, style: { objectPosition: DEFAULT_FOCUS } };
  const { src, srcSet } = photoSources(photo.id);
  return { src, srcSet, sizes, style: { objectPosition: photo.focus } };
}

/** Galería visible de un servicio (sin las fotos ocultas). */
export const visibleImages = (images = []) => images.filter((image) => !isHiddenPhoto(image.url));

/**
 * Qué parte del portafolio va con cada ocasión. Grados, fiestas y
 * eventos usan las fotos de social y noche; sesiones de fotos aún no
 * tiene categoría propia.
 */
const OCCASION_PORTFOLIO = {
  bodas: 'novias',
  quinceaneros: 'quinceaneras',
  grados: 'social',
  fiestas: 'social',
  'eventos-sociales': 'social',
};

export const portfolioForOccasion = (slug) =>
  OCCASION_PORTFOLIO[slug] ? PORTFOLIO.filter((photo) => photo.category === OCCASION_PORTFOLIO[slug]) : [];

// ── Antes de reservar (bodas y quinceañeros) ─────────────────────────

/**
 * Preguntas de src/data/faq.js que se repiten en la página de una
 * ocasión de fecha, en el orden en que las hace una novia. Las que
 * siguen en borrador (prueba, abono, domicilio) no salen hasta que Yury
 * dé la respuesta: entonces aparecen aquí solas, sin tocar esta lista.
 */
export const DATE_OCCASION_FAQ = ['prueba-novia', 'abono', 'domicilio', 'antelacion', 'varias-personas', 'cancelar', 'pago'];

/**
 * Testimonios que van con cada ocasión. El panel guarda la ocasión como
 * texto libre ("Novia · marzo 2026"), así que se reconoce por palabras.
 * Si ninguno encaja, el bloque no aparece.
 */
const OCCASION_TESTIMONIALS = {
  bodas: { match: /novi|boda/i, title: '¿Qué dicen otras novias?' },
  quinceaneros: { match: /quince/i, title: '¿Qué dicen otras quinceañeras?' },
  grados: { match: /grad/i, title: 'Lo que dicen mis clientas de grado' },
  'sesiones-de-fotos': { match: /sesi[oó]n|fotos/i, title: 'Lo que dicen de sus sesiones' },
};

export const testimonialsForOccasion = (slug) => OCCASION_TESTIMONIALS[slug] ?? null;

// ── Carta de precios (/servicios) ────────────────────────────────────

/**
 * Secciones fijas de la carta, por tipo de clienta. Fiestas y eventos
 * sociales tienen los mismos servicios, así que van juntas con grados.
 * Una ocasión nueva que cree el panel sale en su propia sección, y lo
 * que no tenga ocasión va en "Otros servicios".
 *
 * Los talleres no son un maquillaje para un evento, sino clases: van
 * siempre en su propia sección "Talleres" (por categoría, no por
 * ocasión), aunque en el panel les hayan marcado alguna ocasión. Así
 * quien busca "lo de grados" no se encuentra un taller entre los
 * maquillajes.
 */
export const MENU_SECTIONS = [
  { id: 'novias', label: 'Novias', occasions: ['bodas'] },
  { id: 'quinceaneras', label: 'Quinceañeras', occasions: ['quinceaneros'] },
  { id: 'grados-y-fiestas', label: 'Grados, fiestas y eventos', occasions: ['grados', 'fiestas', 'eventos-sociales'] },
  { id: 'sesiones', label: 'Sesiones de fotos', occasions: ['sesiones-de-fotos'] },
];

export const WORKSHOP_SECTION = { id: 'talleres', label: 'Talleres' };

export const isWorkshop = (service) => service?.category === 'TALLER';

export function groupMenu(allServices = [], occasions = []) {
  const workshops = allServices.filter(isWorkshop);
  const services = allServices.filter((s) => !isWorkshop(s));
  const known = new Set(MENU_SECTIONS.flatMap((section) => section.occasions));
  const extra = occasions
    .filter((o) => !known.has(o.slug))
    .map((o) => ({ id: o.slug, label: o.name, occasions: [o.slug] }));

  const sections = [...MENU_SECTIONS, ...extra].map((section) => ({
    ...section,
    // Enlace a la página de la ocasión cuando la sección es una sola.
    occasion: section.occasions.length === 1 ? occasions.find((o) => o.slug === section.occasions[0]) : null,
    services: services.filter((s) => s.occasions?.some((o) => section.occasions.includes(o.slug))),
  }));

  if (workshops.length) sections.push({ ...WORKSHOP_SECTION, occasions: [], occasion: null, services: workshops });

  const orphans = services.filter((s) => !s.occasions?.length);
  if (orphans.length) sections.push({ id: 'otros', label: 'Otros servicios', occasions: [], services: orphans });

  return sections.filter((section) => section.services.length > 0);
}

/**
 * Utilidades del flujo de reserva.
 *
 * Viven aparte del asistente porque las usan también la consulta de
 * reserva, el botón flotante de WhatsApp y el panel. Nada de esto toca
 * la API: son reglas de presentación y del navegador.
 */
import { money, normalizeCoPhone, seasonText } from '../../lib/format.js';

// ── Textos ───────────────────────────────────────────────────────────

/**
 * Mayúscula solo en la primera letra.
 *
 * La clase CSS `capitalize` pone mayúscula a CADA palabra y deja
 * "Sábado, 24 De Octubre De 2026". Aquí se toca solo la primera.
 */
export function capFirst(value) {
  const text = String(value ?? '');
  return text ? text.charAt(0).toLocaleUpperCase('es-CO') + text.slice(1) : text;
}

/** "Hora de Colombia" en vez de "Hora de Bogota" (sin tilde) para una clienta de Pasto. */
export function timezoneLabel(timezone) {
  if (!timezone || timezone === 'America/Bogota') return 'Hora de Colombia';
  return `Hora de ${timezone.split('/').pop().replace(/_/g, ' ')}`;
}

/** Primer nombre de la marca para los saludos: "Hola Yury, …". */
export function ownerFirstName(settings) {
  return (settings?.brandName || 'Yury').trim().split(/\s+/)[0];
}

/** Número de WhatsApp del negocio, o null si no hay ninguno configurado. */
export function businessWhatsapp(settings) {
  return settings?.whatsappNumber || settings?.contactPhone || null;
}

// ── Servicios que necesitan conversación ─────────────────────────────

/**
 * Servicios de novia, y el paquete de novios.
 *
 * No hay un campo para esto en el catálogo, así que se deduce del slug,
 * que sale del nombre ("maquillaje-de-novia", "paquete-novia-…",
 * "bienestar-integrativo-para-novios"). El de novios entra aquí porque
 * también se arma conversando (de 5 a 10 sesiones en pareja) y no se
 * puede meter tal cual en el calendario. Si algún día se renombra, el
 * peor caso es que el servicio vuelva al flujo normal del calendario,
 * que sigue funcionando.
 */
export function isBridalService(service) {
  return /(^|-)novi(a|as|o|os)(-|$)/.test(service?.slug ?? '');
}

/**
 * El paquete de novios no es maquillaje: son sesiones en pareja con la
 * psicóloga. No se les pregunta «¿Dónde te maquillo?» ni se les suma el
 * adicional del domicilio, que es del servicio de maquillaje (Yury no
 * dijo que aplique a las sesiones).
 */
export function isCouplesProgram(service) {
  return /(^|-)novios(-|$)/.test(service?.slug ?? '');
}

/** Pregunta del campo de dirección según el servicio. */
export function addressLabel(service) {
  if (isCouplesProgram(service)) return '¿Dónde hacemos las sesiones?';
  if (service?.category === 'TALLER') return '¿Dónde hacemos el taller?';
  return '¿Dónde te maquillo?';
}

/** ¿Se le muestra el adicional del domicilio a este servicio? */
export function chargesHomeVisit(service) {
  return !isCouplesProgram(service);
}

/** El paquete de novios (acompañamiento psicológico en pareja), no un maquillaje. */
export function isCouplesService(service) {
  return /(^|-)novios(-|$)/.test(service?.slug ?? '');
}

/** Paquetes de quinceañera ("paquete-quinceanera"). */
export function isQuinceService(service) {
  return /(^|-)quincea/.test(service?.slug ?? '');
}

/**
 * ¿Conviene hablar antes de mandar al calendario?
 * Las novias (prueba previa, hora de inicio, acompañantes) y todo lo que
 * esté en modo "se cotiza por WhatsApp", que no tiene precio cerrado.
 */
export function needsConversation(service) {
  return Boolean(service) && (service.priceMode === 'QUOTE' || isBridalService(service));
}

// ── Madrugadas ───────────────────────────────────────────────────────

/** Ocasiones cuyos turnos de madrugada se cuadran por WhatsApp. */
const EARLY_OCCASIONS = new Set(['bodas', 'quinceaneros', 'grados']);

/**
 * ¿Es un caso de madrugada (desde las 4:00 a. m.)?
 *
 * Yury atiende las madrugadas de grados, bodas y quinceañeras SOLO por
 * WhatsApp y con mínimo 20 días de anticipación: esos turnos no salen en
 * la agenda en línea. Se avisa con los paquetes de novia y quinceañera,
 * o cuando la ocasión elegida es una de esas tres. El paquete de novios
 * queda fuera: son sesiones de acompañamiento, no un maquillaje para la
 * ceremonia.
 */
export function isEarlyMorningCase(service, occasion) {
  if (isCouplesService(service)) return false;
  return isBridalService(service) || isQuinceService(service) || EARLY_OCCASIONS.has(occasion?.slug ?? '');
}

// ── Domicilio ────────────────────────────────────────────────────────

export const ADDRESS_MIN = 5;
export const ADDRESS_MAX = 200;

/**
 * El servicio es 100 % a domicilio: sin dirección Yury no sabe a dónde
 * ir. Mismos límites que la API (5 a 200 caracteres). null si está bien
 * o si aún está vacío (el vacío lo frena el botón, no un error en rojo).
 */
export function addressError(raw) {
  const value = String(raw ?? '').trim();
  if (!value) return null;
  if (value.length < ADDRESS_MIN) return 'Escribe la dirección completa, con el barrio y la ciudad o municipio.';
  if (value.length > ADDRESS_MAX) return `La dirección puede tener hasta ${ADDRESS_MAX} caracteres.`;
  return null;
}

/** ¿La dirección ya sirve para seguir? */
export function addressReady(raw) {
  const value = String(raw ?? '').trim();
  return value.length >= ADDRESS_MIN && value.length <= ADDRESS_MAX;
}

/**
 * Valor del adicional del domicilio dentro de Pasto ("$21.000"), o null
 * si en Ajustes está vacío. Un 0 explícito también cuenta como "no se
 * cobra": no tiene sentido anunciar "un adicional de $0".
 */
export function homeVisitFee(settings) {
  const cents = settings?.homeVisitFeeCents;
  return Number.isInteger(cents) && cents > 0 ? money(cents) : null;
}

/**
 * La pista bajo el campo de dirección. Sin valor en Ajustes se omite la
 * primera frase: no se inventa una tarifa.
 */
export function homeVisitHint(settings) {
  const fee = homeVisitFee(settings);
  const outside = 'Fuera de la ciudad se calcula según el transporte (taxi o InDrive).';
  return fee ? `Dentro de Pasto el domicilio tiene un adicional de ${fee}. ${outside}` : outside;
}

/** Junto al precio: "+ domicilio $21.000 dentro de Pasto". No toca el precio guardado. */
export function homeVisitShort(settings) {
  const fee = homeVisitFee(settings);
  return fee ? `+ domicilio ${fee} dentro de Pasto` : null;
}

/**
 * Búsqueda en Google Maps de una dirección escrita por la clienta. Va
 * con encodeURIComponent porque el texto es libre (#, &, tildes…): sin
 * eso, "Cra 5 # 10-20" cortaría la búsqueda en el "#".
 */
export function mapsSearchUrl(address) {
  const value = String(address ?? '').trim();
  if (!value) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value)}`;
}

// ── Temporada del servicio ───────────────────────────────────────────

/**
 * Temporada de un servicio como `{ from, until }` (fechas 'YYYY-MM-DD',
 * ambas incluidas), o null si se reserva todo el año. Acepta tanto el
 * servicio del catálogo como el `season` que devuelve /availability/month.
 */
export function serviceSeason(service) {
  const from = service?.availableFrom ?? service?.from ?? null;
  const until = service?.availableUntil ?? service?.until ?? null;
  return from || until ? { from, until } : null;
}

/** ¿Ese día cae dentro de la temporada? Sin temporada, siempre sí. */
export function inSeason(season, dateISO) {
  if (!season || !dateISO) return true;
  if (season.from && dateISO < season.from) return false;
  if (season.until && dateISO > season.until) return false;
  return true;
}

/**
 * ¿Ya terminó la temporada? Un servicio de Catrinas que siga activo en
 * noviembre no puede ofrecerse: todo su calendario saldría cerrado.
 */
export function seasonOver(service, todayISO) {
  const until = serviceSeason(service)?.until;
  return Boolean(until) && until < todayISO;
}

/**
 * La frase de una línea para el calendario:
 * "Este servicio solo se reserva del 22 al 31 de octubre."
 * "Este servicio se reserva desde el 22 de octubre."
 */
export function seasonSentence(season) {
  const text = season ? seasonText({ availableFrom: season.from, availableUntil: season.until }) : null;
  if (!text) return null;
  if (text.startsWith('Solo ')) return `Este servicio solo se reserva ${text.slice(5)}.`;
  return `Este servicio se reserva ${text.charAt(0).toLowerCase()}${text.slice(1)}.`;
}

// ── Abono ────────────────────────────────────────────────────────────

/**
 * El abono en datos sueltos, para filas y mensajes cortos (la frase
 * completa la da `depositText` de lib/format.js). Con precio fijo se
 * calcula el valor; con "desde" o "a cotizar" no se puede, porque el
 * valor final lo confirma Yury. null si no hay política de abono.
 */
export function depositInfo(depositPercent, service) {
  const pct = Number(depositPercent);
  if (!pct || pct <= 0) return null;
  const mode = service?.priceMode ?? 'FIXED';
  const amount =
    mode === 'FIXED' ? money(Math.round(((service?.priceCents ?? 0) * pct) / 100), service?.currency) : null;
  const short = amount
    ? `${pct} % · ${amount}`
    : `${pct} % del valor ${mode === 'QUOTE' ? 'acordado' : 'final'}`;
  return { pct, amount, short };
}

// ── Celular ──────────────────────────────────────────────────────────

/**
 * Lo que se guardará, en el formato que se le enseña a la clienta.
 * "3001234567" → "+57 300 123 4567". Un número extranjero (Ecuador
 * queda al lado) se muestra con su + y sus dígitos, sin tocarlo.
 */
export function displayPhone(raw) {
  const value = String(raw ?? '').trim();
  if (!value) return '';
  const digits = normalizeCoPhone(value);
  const co = digits.match(/^57(3\d{2})(\d{3})(\d{4})$/);
  if (co) return `+57 ${co[1]} ${co[2]} ${co[3]}`;
  return digits ? `+${digits}` : value;
}

/** Valor que se envía a la API: el mismo que se le mostró a la clienta. */
export function phoneForSubmit(raw) {
  const digits = normalizeCoPhone(raw);
  return digits ? `+${digits}` : String(raw ?? '').trim();
}

/**
 * Validación amable al salir del campo. Devuelve el mensaje de error o
 * null. Acepta celulares colombianos (con o sin +57) y números con
 * indicativo internacional escritos con "+".
 */
export function phoneError(raw) {
  const value = String(raw ?? '').trim();
  if (!value) return null;
  const digits = normalizeCoPhone(value);
  if (/^573\d{9}$/.test(digits)) return null;
  if ((value.startsWith('+') || value.startsWith('00')) && digits.length >= 8 && digits.length <= 15) return null;
  return 'Escribe tu celular de 10 dígitos, por ejemplo 300 123 4567.';
}

// ── Origen de la visita ──────────────────────────────────────────────

const SOURCE_KEY = 'reserva-origen';

const REFERRERS = [
  [/instagram\.com$/, 'instagram'],
  [/facebook\.com$|fb\.me$/, 'facebook'],
  [/tiktok\.com$/, 'tiktok'],
  [/whatsapp\.com$|wa\.me$/, 'whatsapp'],
  [/google\./, 'google'],
];

/**
 * Anota de dónde llegó la clienta: `utm_source` (y `utm_campaign`) o
 * `ref` del enlace; si no hay, el dominio que la trajo (Instagram,
 * Google…). Se guarda en sessionStorage la PRIMERA vez de la visita, para
 * que no se pierda al pasar de la portada a /reservar.
 *
 * Solo es un dato para el panel de Yury: no se usa ninguna herramienta
 * de terceros ni se sigue a nadie entre visitas.
 */
export function captureSource(search = window.location.search) {
  try {
    if (sessionStorage.getItem(SOURCE_KEY)) return;

    const params = new URLSearchParams(search);
    const utm = params.get('utm_source') || params.get('ref');
    let source = utm ? [utm, params.get('utm_campaign')].filter(Boolean).join('/') : '';

    if (!source && document.referrer) {
      const host = new URL(document.referrer).hostname.replace(/^www\.|^l\.|^m\./, '');
      if (host && host !== window.location.hostname) {
        source = REFERRERS.find(([pattern]) => pattern.test(host))?.[1] ?? host;
      }
    }

    sessionStorage.setItem(SOURCE_KEY, (source || 'directo').slice(0, 60));
  } catch {
    // Almacenamiento bloqueado o referrer extraño: se reserva sin origen.
  }
}

export function readSource() {
  try {
    const value = sessionStorage.getItem(SOURCE_KEY);
    return value && value !== 'directo' ? value : undefined;
  } catch {
    return undefined;
  }
}

// ── Borrador de la reserva ───────────────────────────────────────────

const DRAFT_KEY = 'reserva-borrador';
const DRAFT_TTL_MS = 6 * 60 * 60 * 1000;

/**
 * El avance del asistente se guarda en sessionStorage (solo esta
 * pestaña, se borra al cerrarla): quien sale a Instagram o WhatsApp a
 * consultar algo y vuelve no empieza de cero si el navegador recargó.
 */
export function saveDraft(draft) {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, savedAt: Date.now() }));
  } catch {
    // Sin almacenamiento: solo se pierde la comodidad.
  }
}

export function loadDraft() {
  try {
    const draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || 'null');
    if (!draft || Date.now() - (draft.savedAt ?? 0) > DRAFT_TTL_MS) return null;
    return draft;
  } catch {
    return null;
  }
}

export function clearDraft() {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    // Nada que limpiar.
  }
}

// ── Agregar al calendario ────────────────────────────────────────────

const compactUtc = (date) => new Date(date).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

/** Enlace de Google Calendar con inicio, fin y lugar ya puestos. */
export function googleCalendarUrl({ title, start, end, location, details }) {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${compactUtc(start)}/${compactUtc(end)}`,
  });
  if (location) params.set('location', location);
  if (details) params.set('details', details);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

const icsEscape = (value) => String(value ?? '').replace(/[\\,;]/g, (ch) => `\\${ch}`).replace(/\n/g, '\\n');

/** Archivo .ics para el calendario del iPhone, Outlook y compañía. */
export function icsDataUrl({ uid, title, start, end, location, details }) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Agenda en linea//ES',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${compactUtc(Date.now())}`,
    `DTSTART:${compactUtc(start)}`,
    `DTEND:${compactUtc(end)}`,
    `SUMMARY:${icsEscape(title)}`,
    location ? `LOCATION:${icsEscape(location)}` : null,
    details ? `DESCRIPTION:${icsEscape(details)}` : null,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(lines.join('\r\n'))}`;
}

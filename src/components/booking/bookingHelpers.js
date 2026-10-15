/**
 * Utilidades del flujo de reserva.
 *
 * Viven aparte del asistente porque las usan también la consulta de
 * reserva, el botón flotante de WhatsApp y el panel. Nada de esto toca
 * la API: son reglas de presentación y del navegador.
 */
import { normalizeCoPhone } from '../../lib/format.js';

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
 * Servicios de novia.
 *
 * No hay un campo para esto en el catálogo, así que se deduce del slug,
 * que sale del nombre ("maquillaje-de-novia", "paquete-novia-…"). Si
 * algún día se renombra, el peor caso es que el servicio vuelva al flujo
 * normal del calendario, que sigue funcionando.
 */
export function isBridalService(service) {
  return /(^|-)novias?(-|$)/.test(service?.slug ?? '');
}

/**
 * ¿Conviene hablar antes de mandar al calendario?
 * Las novias (prueba previa, hora de inicio, acompañantes) y todo lo que
 * esté en modo "se cotiza por WhatsApp", que no tiene precio cerrado.
 */
export function needsConversation(service) {
  return Boolean(service) && (service.priceMode === 'QUOTE' || isBridalService(service));
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

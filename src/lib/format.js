/**
 * Formateo para mostrar.
 *
 * Todas las fechas llegan de la API en UTC (ISO-8601). Aquí se
 * convierten a la zona horaria del negocio —no a la del navegador— para
 * que una clienta de viaje vea la hora real de su cita en el estudio.
 */

const DEFAULT_TZ = 'America/Bogota';

export function money(cents, currency = 'COP') {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format((cents ?? 0) / 100);
}

export function duration(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

const fmt = (value, options, tz) =>
  new Intl.DateTimeFormat('es-CO', { timeZone: tz || DEFAULT_TZ, ...options }).format(
    value instanceof Date ? value : new Date(value),
  );

/** "sábado, 4 de octubre de 2026" */
export const longDate = (value, tz) =>
  fmt(value, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }, tz);

/** "4 de octubre" */
export const mediumDate = (value, tz) => fmt(value, { day: 'numeric', month: 'long' }, tz);

/** "04/10/2026" */
export const shortDate = (value, tz) =>
  fmt(value, { day: '2-digit', month: '2-digit', year: 'numeric' }, tz);

/** "2:30 p. m." */
export const time = (value, tz) => fmt(value, { hour: 'numeric', minute: '2-digit', hour12: true }, tz);

/** "4 oct 2026, 2:30 p. m." */
export const dateTime = (value, tz) =>
  fmt(
    value,
    { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true },
    tz,
  );

/** Fecha ISO "YYYY-MM-DD" de un Date, en la zona indicada. */
export function toDateISO(value, tz = DEFAULT_TZ) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value instanceof Date ? value : new Date(value));
  const get = (type) => parts.find((p) => p.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** "en 3 días", "mañana", "hace 2 semanas" */
export function relative(value, tz = DEFAULT_TZ) {
  const target = new Date(value);
  const todayISO = toDateISO(new Date(), tz);
  const targetISO = toDateISO(target, tz);
  const days = Math.round((new Date(targetISO) - new Date(todayISO)) / 86_400_000);

  const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
  if (Math.abs(days) < 31) return rtf.format(days, 'day');
  return rtf.format(Math.round(days / 30), 'month');
}

export const CATEGORY_LABEL = {
  MAQUILLAJE: 'Maquillaje',
  PEINADO: 'Peinado',
  PAQUETE: 'Paquete',
};

export const STATUS_LABEL = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
  NO_SHOW: 'No asistió',
};

export const STATUS_TONE = {
  PENDING: 'bg-gold-100 text-gold-700 border-gold-300',
  CONFIRMED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  COMPLETED: 'bg-brand-100 text-brand-800 border-brand-200',
  CANCELLED: 'bg-line/60 text-ink-600 border-line',
  NO_SHOW: 'bg-red-50 text-red-800 border-red-200',
};

export const PAYMENT_LABEL = {
  TRANSFERENCIA: 'Transferencia',
  EFECTIVO: 'Efectivo',
};

export const WEEKDAYS = [
  { value: 1, label: 'Lunes', short: 'Lun' },
  { value: 2, label: 'Martes', short: 'Mar' },
  { value: 3, label: 'Miércoles', short: 'Mié' },
  { value: 4, label: 'Jueves', short: 'Jue' },
  { value: 5, label: 'Viernes', short: 'Vie' },
  { value: 6, label: 'Sábado', short: 'Sáb' },
  { value: 7, label: 'Domingo', short: 'Dom' },
];

/** Enlace de WhatsApp con mensaje prellenado. */
export function whatsappLink(number, message) {
  const clean = (number ?? '').replace(/\D/g, '');
  const text = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${clean}${text}`;
}

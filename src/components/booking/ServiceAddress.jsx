import { cx } from '../ui/index.jsx';
import { mapsSearchUrl } from './bookingHelpers.js';

/**
 * Dirección donde se hace el servicio, con su enlace a Google Maps.
 *
 * Todo el servicio es a domicilio, así que en el panel la dirección es
 * tan importante como la hora: va con un ícono de ubicación y un enlace
 * para abrir la ruta desde el celular. Las reservas antiguas o las que
 * se crearon desde el panel pueden no tenerla; entonces se dice que hay
 * que pedirla, en vez de dejar un hueco que pase desapercibido.
 */

export function PinIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 20 20" className={cx('shrink-0', className)} fill="none" aria-hidden="true">
      <path
        d="M10 18s5.5-5.2 5.5-9.5a5.5 5.5 0 1 0-11 0C4.5 12.8 10 18 10 18Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="8.5" r="2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

/** Enlace "Cómo llegar" (se abre aparte, sin dar acceso a esta pestaña). */
export function MapsLink({ address, children = 'Cómo llegar', className }) {
  const href = mapsSearchUrl(address);
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cx(
        'inline-flex min-h-[44px] items-center gap-1.5 rounded-lg text-sm font-medium text-brand-700 underline-offset-4 hover:text-brand-800 hover:underline',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
        className,
      )}
    >
      {children}
      <span aria-hidden="true">↗</span>
      <span className="sr-only">(se abre Google Maps)</span>
    </a>
  );
}

/**
 * Fila compacta para listados: ícono + dirección + "Cómo llegar".
 * `missing` decide qué decir cuando la reserva no trae dirección.
 */
export function AddressRow({ address, className, missing = 'Sin dirección: pídesela por WhatsApp' }) {
  const value = String(address ?? '').trim();
  return (
    <div className={cx('flex flex-wrap items-center gap-x-3 text-sm', className)}>
      <p className={cx('flex min-w-0 items-start gap-1.5', value ? 'text-ink-700' : 'text-ink-500')}>
        <PinIcon className="mt-0.5 h-4 w-4 text-brand-600" />
        <span className="sr-only">Lugar del servicio: </span>
        <span className="min-w-0 break-words">{value || missing}</span>
      </p>
      {value && <MapsLink address={value} />}
    </div>
  );
}

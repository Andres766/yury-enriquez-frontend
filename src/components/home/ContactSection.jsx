import { Reveal, SectionTitle } from '../ui/index.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import { whatsappLink, WEEKDAYS } from '../../lib/format.js';
import WhatsAppIcon from './WhatsAppIcon.jsx';
import { firstName, formatCoPhone } from './contactInfo.js';

/**
 * Contacto y horario.
 *
 * Yury atiende 100 % a domicilio: no hay estudio al que llegar, así que
 * en vez de una dirección se dice dónde atiende (Pasto y municipios
 * cercanos). El bloque de ubicación y el mapa solo aparecen si algún día
 * se llena `addressLine` en Ajustes; hoy está vacío y no se pinta.
 *
 * El horario se pinta desde las reglas reales de la agenda, así que si
 * la maquilladora cambia su disponibilidad en el panel, esta sección se
 * actualiza sola. `businessHoursNote` queda como respaldo escrito: solo
 * se muestra si no llegaron las reglas, para no repetir la tabla.
 *
 * `rules` es null mientras no se sabe (cargando, o la API no respondió).
 * Entonces no se pinta la tabla: vacía decía "Cerrado" los siete días,
 * justo al lado de la nota con el horario.
 *
 * Se usa en /contacto: ahí la gente llega a escribir, así que WhatsApp
 * va de primero en la lista. Los botones de WhatsApp y Reservar no se
 * repiten aquí: la página cierra con ClosingCTA, que ya los trae, y
 * tenerlos dos veces sumaba tres enlaces de WhatsApp en una sola página.
 */
export default function ContactSection({ rules = null, loading = false, compact = false }) {
  const settings = useSettings();

  const byDay = WEEKDAYS.map((day) => ({
    ...day,
    ranges: (rules ?? [])
      .filter((r) => r.weekday === day.value && r.active)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
      .map((r) => `${r.startTime} – ${r.endTime}`),
  }));

  const hasSchedule = byDay.some((day) => day.ranges.length > 0);

  const number = settings.whatsappNumber || settings.contactPhone;
  const greeting = `Hola ${firstName(settings.brandName)}, quisiera consultar por una cita.`;

  return (
    <section className="container-page py-14 sm:py-20" aria-labelledby="titulo-contacto">
      {!compact && (
        <SectionTitle
          eyebrow="Contacto"
          title="Contacto y horario"
          subtitle="Atiendo únicamente con cita previa y a domicilio. Escríbeme si necesitas un horario que no aparece en el calendario."
          className="mb-8 sm:mb-12"
          as="h2"
        />
      )}
      <span id="titulo-contacto" className="sr-only">
        Contacto y horario
      </span>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <Reveal className="card-surface overflow-hidden">
          <div className="p-6 sm:p-8">
            <h3 className="text-2xl">Escríbeme</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-500">
              Por WhatsApp te respondo más rápido. Si prefieres, también puedes llamar o enviar un correo.
            </p>

            {/* No es un enlace: no hay a dónde ir, es ella la que va. */}
            <p className="mt-5 flex items-center gap-4 rounded-2xl bg-blush p-4 text-sm leading-snug text-ink-700">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface text-brand-600">
                <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden="true">
                  <path d="M3 9.2 10 3.5l7 5.7M5 7.7v8.8h10V7.7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M8.3 16.5v-4.2h3.4v4.2" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="min-w-0 flex-1">Atiendo 100 % a domicilio en Pasto y municipios cercanos.</span>
            </p>

            <ul className="mt-7 space-y-3">
              {number && (
                <li>
                  <a
                    href={whatsappLink(number, greeting)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 rounded-2xl border border-line p-4 transition hover:border-brand-200 hover:bg-blush"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-wa/10 text-wa">
                      <WhatsAppIcon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-ink-800">WhatsApp</span>
                      <span className="block truncate text-sm tabular-nums text-ink-500">{formatCoPhone(number)}</span>
                    </span>
                    <span className="text-xs font-medium text-brand-700">
                      Escribir
                      <span className="sr-only"> (se abre en una pestaña nueva)</span>
                    </span>
                  </a>
                </li>
              )}

              {settings.contactEmail && (
                <li>
                  <a
                    href={`mailto:${settings.contactEmail}`}
                    className="flex items-center gap-4 rounded-2xl border border-line p-4 transition hover:border-brand-200 hover:bg-blush"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blush text-brand-600">
                      <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden="true">
                        <rect x="2.5" y="4.5" width="15" height="11" rx="2" stroke="currentColor" strokeWidth="1.3" />
                        <path d="m3.5 6 6.5 4.6L16.5 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                      </svg>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-ink-800">Correo</span>
                      <span className="block truncate text-sm text-ink-500">{settings.contactEmail}</span>
                    </span>
                  </a>
                </li>
              )}

              {settings.addressLine && (
                <li>
                  <a
                    href={settings.mapUrl || `https://maps.google.com/?q=${encodeURIComponent(settings.addressLine)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 rounded-2xl border border-line p-4 transition hover:border-brand-200 hover:bg-blush"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blush text-brand-600">
                      <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden="true">
                        <path d="M10 17.5s5.5-4.6 5.5-8.6a5.5 5.5 0 1 0-11 0c0 4 5.5 8.6 5.5 8.6Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                        <circle cx="10" cy="8.8" r="2" stroke="currentColor" strokeWidth="1.3" />
                      </svg>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-ink-800">Ubicación</span>
                      <span className="block text-sm leading-snug text-ink-500">{settings.addressLine}</span>
                    </span>
                    <span className="shrink-0 text-xs font-medium text-brand-700">
                      Mapa
                      <span className="sr-only"> (se abre en una pestaña nueva)</span>
                    </span>
                  </a>
                </li>
              )}
            </ul>
          </div>
        </Reveal>

        <Reveal delay={0.1} className="card-surface p-6 sm:p-8">
          <h3 className="text-2xl">Horario de atención</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-500">
            {hasSchedule
              ? 'Solo con cita previa. Estos son los días y las franjas en que atiendo.'
              : 'Solo con cita previa.'}
          </p>

          {hasSchedule ? (
            <dl className="mt-7 divide-y divide-line">
              {byDay.map((day) => (
                <div key={day.value} className="flex items-baseline justify-between gap-4 py-3">
                  <dt
                    className={`text-sm ${day.ranges.length > 0 ? 'font-medium text-ink-800' : 'text-ink-400'}`}
                  >
                    {day.label}
                  </dt>
                  <dd className="text-right text-sm text-ink-600">
                    {day.ranges.length > 0 ? (
                      day.ranges.map((range) => (
                        <span key={range} className="block tabular-nums">
                          {range}
                        </span>
                      ))
                    ) : (
                      <span className="text-ink-400">Cerrado</span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          ) : settings.businessHoursNote ? (
            <p className="mt-6 rounded-2xl bg-blush px-4 py-3 text-sm leading-relaxed text-ink-600">
              {settings.businessHoursNote}
            </p>
          ) : loading ? (
            <p className="mt-6 text-sm text-ink-500" aria-busy="true">
              Cargando el horario…
            </p>
          ) : (
            <p className="mt-6 text-sm leading-relaxed text-ink-600">
              Escríbeme y te cuento qué horarios tengo libres.
            </p>
          )}
        </Reveal>
      </div>
    </section>
  );
}

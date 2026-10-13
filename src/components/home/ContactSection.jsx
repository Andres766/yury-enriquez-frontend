import { Reveal, SectionTitle, Button } from '../ui/index.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import { whatsappLink, WEEKDAYS } from '../../lib/format.js';

/**
 * Contacto, ubicación y horario.
 *
 * El horario se pinta desde las reglas reales de la agenda, así que si
 * la maquilladora cambia su disponibilidad en el panel, esta sección se
 * actualiza sola. `businessHoursNote` queda como resumen escrito.
 */
export default function ContactSection({ rules = [], compact = false }) {
  const settings = useSettings();

  const byDay = WEEKDAYS.map((day) => ({
    ...day,
    ranges: rules
      .filter((r) => r.weekday === day.value && r.active)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
      .map((r) => `${r.startTime} – ${r.endTime}`),
  }));

  const number = settings.whatsappNumber || settings.contactPhone;

  return (
    <section className="container-page py-20 sm:py-24" aria-labelledby="titulo-contacto">
      {!compact && (
        <SectionTitle
          eyebrow="Contacto"
          title="Dónde estamos y cuándo atendemos"
          subtitle="Trabajamos únicamente con cita previa. Escríbenos si necesitas un horario que no aparece en el calendario."
          className="mb-14"
          as="h2"
        />
      )}
      <span id="titulo-contacto" className="sr-only">
        Contacto y ubicación
      </span>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <Reveal className="card-surface overflow-hidden">
          <div className="p-6 sm:p-8">
            <h3 className="text-2xl">Escríbenos</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-500">
              Por WhatsApp respondemos más rápido. Si prefieres, también puedes llamar o enviar un correo.
            </p>

            <ul className="mt-7 space-y-3">
              {number && (
                <li>
                  <a
                    href={whatsappLink(number, `Hola ${settings.brandName}, quisiera consultar por una cita.`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 rounded-2xl border border-line p-4 transition hover:border-brand-200 hover:bg-blush"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#25D366]/12 text-wa">
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                        <path d="M12.05 21.5h-.01a9.4 9.4 0 0 1-4.79-1.31l-.34-.2-3.56.93.95-3.47-.22-.36a9.38 9.38 0 0 1-1.44-5.01c0-5.18 4.22-9.4 9.42-9.4a9.35 9.35 0 0 1 6.65 2.76 9.32 9.32 0 0 1 2.76 6.65c0 5.18-4.23 9.41-9.42 9.41Z" />
                      </svg>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-ink-800">WhatsApp</span>
                      <span className="block truncate text-sm text-ink-500">{settings.contactPhone}</span>
                    </span>
                    <span className="text-xs font-medium text-brand-700">Abrir</span>
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
                    <span className="shrink-0 text-xs font-medium text-brand-700">Mapa</span>
                  </a>
                </li>
              )}
            </ul>

            <div className="mt-7 border-t border-line pt-6">
              <Button to="/reservar" className="w-full sm:w-auto">
                Reservar en línea
              </Button>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.1} className="card-surface p-6 sm:p-8">
          <h3 className="text-2xl">Horario de atención</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-500">
            Solo con cita previa. Estos son los días y las franjas en que atendemos.
          </p>

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

          {settings.businessHoursNote && (
            <p className="mt-6 rounded-2xl bg-blush px-4 py-3 text-xs leading-relaxed text-ink-600">
              {settings.businessHoursNote}
            </p>
          )}
        </Reveal>
      </div>
    </section>
  );
}

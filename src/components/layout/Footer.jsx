import { Link } from 'react-router-dom';
import { useSettings } from '../../context/SettingsContext.jsx';
import { Wordmark } from './Logo.jsx';

const SOCIAL = [
  {
    key: 'instagramUrl',
    label: 'Instagram',
    path: 'M12 7.6a4.4 4.4 0 1 0 0 8.8 4.4 4.4 0 0 0 0-8.8Zm0 7.25a2.85 2.85 0 1 1 0-5.7 2.85 2.85 0 0 1 0 5.7ZM17.6 7.4a1.03 1.03 0 1 1-2.05 0 1.03 1.03 0 0 1 2.05 0ZM8 3.4h8A4.6 4.6 0 0 1 20.6 8v8a4.6 4.6 0 0 1-4.6 4.6H8A4.6 4.6 0 0 1 3.4 16V8A4.6 4.6 0 0 1 8 3.4Zm0 1.6A3 3 0 0 0 5 8v8a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3V8a3 3 0 0 0-3-3H8Z',
  },
  {
    key: 'tiktokUrl',
    label: 'TikTok',
    path: 'M16.2 3.2h-2.6v11.3a2.5 2.5 0 1 1-2.1-2.47V9.3a5.1 5.1 0 1 0 4.7 5.08V9.1a6.3 6.3 0 0 0 3.6 1.14V7.6a3.7 3.7 0 0 1-3.6-3.7v-.7Z',
  },
  {
    key: 'facebookUrl',
    label: 'Facebook',
    path: 'M13.6 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.25-1.5 1.55-1.5h1.65V3.62A22 22 0 0 0 14.4 3.5c-2.4 0-4 1.45-4 4.12V9.9H7.7V13h2.7v8h3.2Z',
  },
];

export default function Footer() {
  const settings = useSettings();
  const year = new Date().getFullYear();
  const socials = SOCIAL.filter((s) => settings[s.key]);

  return (
    <footer className="mt-24 border-t border-line bg-surface">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8 lg:py-16">
        <div className="sm:col-span-2 lg:col-span-1">
          <Wordmark brandName={settings.brandName} tagline={settings.tagline} />

          {socials.length > 0 && (
            <ul className="mt-6 flex items-center gap-2">
              {socials.map((social) => (
                <li key={social.key}>
                  <a
                    href={settings[social.key]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-line text-ink-500 transition hover:border-brand-300 hover:bg-blush hover:text-brand-700"
                    aria-label={`${social.label} de ${settings.brandName} (se abre en una pestaña nueva)`}
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                      <path d={social.path} />
                    </svg>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <nav aria-labelledby="footer-explorar">
          <h2 id="footer-explorar" className="mb-4 text-xs font-semibold uppercase tracking-widest text-ink-400">
            Explorar
          </h2>
          <ul className="space-y-3 text-sm">
            {[
              ['/servicios', 'Servicios y precios'],
              ['/ocasiones', 'Para cada ocasión'],
              ['/reservar', 'Reservar una cita'],
              ['/mi-reserva', 'Consultar mi reserva'],
              ['/contacto', 'Contacto y ubicación'],
            ].map(([to, label]) => (
              <li key={to}>
                <Link to={to} className="text-ink-600 transition hover:text-brand-700">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-labelledby="footer-cuenta">
          <h2 id="footer-cuenta" className="mb-4 text-xs font-semibold uppercase tracking-widest text-ink-400">
            Mi cuenta
          </h2>
          <ul className="space-y-3 text-sm">
            <li>
              <Link to="/ingresar" className="text-ink-600 transition hover:text-brand-700">
                Ingresar
              </Link>
            </li>
            <li>
              <Link to="/registro" className="text-ink-600 transition hover:text-brand-700">
                Crear cuenta
              </Link>
            </li>
            <li>
              <Link to="/mi-cuenta" className="text-ink-600 transition hover:text-brand-700">
                Tarjeta de fidelidad
              </Link>
            </li>
          </ul>
          <p className="mt-4 text-xs leading-relaxed text-ink-400">
            Reservar no requiere cuenta. Registrarse solo suma beneficios.
          </p>
        </nav>

        <div>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-ink-400">Contacto</h2>
          <ul className="space-y-3 text-sm text-ink-600">
            {settings.contactPhone && (
              <li>
                <a
                  href={`tel:${settings.contactPhone.replace(/\s/g, '')}`}
                  className="transition hover:text-brand-700"
                >
                  {settings.contactPhone}
                </a>
              </li>
            )}
            {settings.contactEmail && (
              <li>
                <a href={`mailto:${settings.contactEmail}`} className="transition hover:text-brand-700">
                  {settings.contactEmail}
                </a>
              </li>
            )}
            {settings.addressLine && <li className="leading-relaxed">{settings.addressLine}</li>}
            {settings.businessHoursNote && (
              <li className="leading-relaxed text-ink-500">{settings.businessHoursNote}</li>
            )}
          </ul>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-6 text-xs text-ink-400 sm:flex-row">
          <p>
            © {year} {settings.brandName}. Todos los derechos reservados.
          </p>
          <p>Hecho con cuidado para cada cita.</p>
        </div>
      </div>
    </footer>
  );
}

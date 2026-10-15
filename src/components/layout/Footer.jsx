import { Link } from 'react-router-dom';
import { useSettings } from '../../context/SettingsContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { Wordmark } from './Logo.jsx';
import { normalizeCoPhone, whatsappLink } from '../../lib/format.js';
import WhatsAppIcon from '../home/WhatsAppIcon.jsx';
import { firstName, formatCoPhone, instagramHandle } from '../home/contactInfo.js';

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

/**
 * Pie de página.
 *
 * WhatsApp va de primero en Contacto porque es el canal real del
 * negocio. La cuenta, que es opcional, queda en una sola línea en vez de
 * una columna entera. Los títulos de columna van en Jost, como los
 * eyebrows: en Cormorant a 12 px y en mayúsculas salían demasiado finos.
 *
 * En el celular cada enlace tiene unos 40 px de alto (py-2), para que se
 * pueda tocar sin acertarle al de al lado.
 */
const linkClass = 'inline-block py-2 text-ink-600 transition hover:text-brand-700 sm:py-1';
const headingClass = 'mb-3 font-sans text-xs font-semibold uppercase tracking-widest text-ink-400';

/**
 * Enlace para llamar. El "+" solo va cuando el número ya trae el 57: a
 * un fijo sin indicativo ("602 7234567") anteponerle "+" lo convierte en
 * un número de otro país.
 */
function telHref(raw) {
  const digits = normalizeCoPhone(raw);
  return `tel:${digits.length === 12 && digits.startsWith('57') ? '+' : ''}${digits}`;
}

export default function Footer() {
  const settings = useSettings();
  const { isAuthenticated } = useAuth();
  const year = new Date().getFullYear();
  const socials = SOCIAL.filter((s) => settings[s.key]);
  const number = settings.whatsappNumber || settings.contactPhone;
  const handle = instagramHandle(settings.instagramUrl);

  return (
    <footer className="mt-16 border-t border-line bg-surface sm:mt-24">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8 lg:py-16">
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

          {/* El usuario junto a los íconos: quien viene de Instagram
              reconoce así que es la misma cuenta. */}
          {handle && (
            <a
              href={settings.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`${linkClass} mt-2 text-sm`}
            >
              {handle}
              <span className="sr-only"> en Instagram (se abre en una pestaña nueva)</span>
            </a>
          )}
        </div>

        <nav aria-labelledby="footer-explorar">
          <h2 id="footer-explorar" className={headingClass}>
            Explorar
          </h2>
          <ul className="space-y-1 text-sm">
            {[
              ['/trabajos', 'Mi trabajo'],
              ['/servicios', 'Servicios y precios'],
              ['/ocasiones', 'Para cada ocasión'],
              ['/reservar', 'Reservar mi cita'],
              ['/mi-reserva', 'Consultar mi reserva'],
              ['/contacto', 'Contacto'],
            ].map(([to, label]) => (
              <li key={to}>
                <Link to={to} className={linkClass}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Con sesión iniciada, "Ingresar" no tiene sentido: se va
              directo a la cuenta. */}
          <p className="mt-4 text-sm text-ink-500">
            {isAuthenticated ? (
              <Link to="/mi-cuenta" className={linkClass}>
                Mis citas y tarjeta de fidelidad
              </Link>
            ) : (
              <>
                <Link to="/ingresar" className={linkClass}>
                  Ingresar
                </Link>
                <span className="mx-2 text-ink-400" aria-hidden="true">
                  ·
                </span>
                <Link to="/mi-cuenta" className={linkClass}>
                  Tarjeta de fidelidad
                </Link>
              </>
            )}
          </p>
          {!isAuthenticated && <p className="text-xs leading-relaxed text-ink-400">Reservar no requiere cuenta.</p>}
        </nav>

        <div>
          <h2 className={headingClass}>Contacto</h2>
          <ul className="space-y-1 text-sm text-ink-600">
            {number && (
              <li>
                <a
                  href={whatsappLink(number, `Hola ${firstName(settings.brandName)}, quisiera consultar por una cita.`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${linkClass} inline-flex items-center gap-2`}
                >
                  <WhatsAppIcon className="h-4 w-4 text-wa" />
                  <span>
                    WhatsApp <span className="tabular-nums">{formatCoPhone(number)}</span>
                  </span>
                  <span className="sr-only">(se abre en una pestaña nueva)</span>
                </a>
              </li>
            )}
            {settings.contactPhone && (
              <li>
                <a href={telHref(settings.contactPhone)} className={linkClass}>
                  Llamar al <span className="tabular-nums">{formatCoPhone(settings.contactPhone)}</span>
                </a>
              </li>
            )}
            {settings.contactEmail && (
              <li>
                <a href={`mailto:${settings.contactEmail}`} className={`${linkClass} break-all`}>
                  {settings.contactEmail}
                </a>
              </li>
            )}
            {settings.addressLine && (
              <li>
                <a
                  href={settings.mapUrl || `https://maps.google.com/?q=${encodeURIComponent(settings.addressLine)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${linkClass} leading-relaxed`}
                >
                  {settings.addressLine}
                  <span className="sr-only"> (ver en el mapa, se abre en una pestaña nueva)</span>
                </a>
              </li>
            )}
            {/* Sin dirección de local: atiende a domicilio. */}
            <li className="pt-1 leading-relaxed text-ink-500">A domicilio en Pasto y municipios cercanos</li>
            {settings.businessHoursNote && (
              <li className="pt-1 leading-relaxed text-ink-500">{settings.businessHoursNote}</li>
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

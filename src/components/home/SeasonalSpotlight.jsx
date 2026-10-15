import { Badge, Button, Reveal, cx } from '../ui/index.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import { duration, priceLabel, seasonText, whatsappLink } from '../../lib/format.js';
import { PORTFOLIO, photoSources } from '../../data/portfolio.js';
import WhatsAppIcon from './WhatsAppIcon.jsx';
import { firstName } from './contactInfo.js';
import { findCatrina, useSeasonalService } from './useSeasonalService.js';

/**
 * La Catrina, de primera en el inicio durante la temporada.
 *
 * Solo aparece con el tema Halloween y el servicio activo (ver
 * useSeasonalService). Así no hay que marcarla y desmarcarla como
 * destacada cada año: se enciende y se apaga sola con la temporada y con
 * el interruptor del servicio en el panel.
 *
 * Nombre, descripción, precio, duración y temporada salen del servicio
 * tal como lo dejó Yury en el panel; aquí no se promete nada más.
 *
 * Puede haber varios servicios de temporada (Catrinas y caracterización,
 * Pintucaritas). Con uno solo se presenta como siempre, con su nombre de
 * título; con varios, cada uno va en su fila con su temporada, su precio
 * y su botón.
 */

// La media catrina ya está en la portada durante la temporada.
const PHOTOS = PORTFOLIO.filter((p) => p.catrina && p.id !== 'catrina-media-cara').slice(0, 2);

export default function SeasonalSpotlight() {
  const settings = useSettings();
  const { services = [] } = useSeasonalService();
  if (settings.theme !== 'HALLOWEEN' || services.length === 0) return null;

  const number = settings.whatsappNumber || settings.contactPhone;
  const hello = `Hola ${firstName(settings.brandName)}`;
  const single = services.length === 1 ? services[0] : null;
  const catrina = findCatrina(services);
  const labelFor = (service) => (service === catrina ? 'Reservar mi Catrina' : 'Reservar');

  return (
    <section className="container-page pt-4 sm:pt-8" aria-labelledby="titulo-temporada">
      <Reveal>
        <div className="veil grid items-center gap-6 overflow-hidden rounded-[2rem] border border-line bg-surface p-5 shadow-soft sm:p-8 md:grid-cols-[auto_1fr] md:gap-10">
          {PHOTOS.length > 0 && (
            <div className="flex gap-3">
              {PHOTOS.map((photo) => {
                const { src, srcSet } = photoSources(photo.id);
                return (
                  <img
                    key={photo.id}
                    src={src}
                    srcSet={srcSet}
                    sizes="(min-width: 768px) 12rem, 40vw"
                    alt={photo.alt}
                    loading="lazy"
                    decoding="async"
                    style={{ objectPosition: photo.focus }}
                    className="aspect-[4/5] w-32 rounded-2xl border border-line object-cover sm:w-40 md:w-48"
                  />
                );
              })}
            </div>
          )}

          <div className="min-w-0">
            <Badge tone="gold">Temporada</Badge>
            <h2 id="titulo-temporada" className="text-balance mt-3 text-2xl leading-tight sm:text-3xl">
              {single ? single.name : 'Maquillaje artístico y temporada de Halloween'}
            </h2>

            {single ? (
              <>
                {single.shortDescription && (
                  <p className="text-pretty mt-3 text-[15px] leading-relaxed text-ink-600">{single.shortDescription}</p>
                )}
                <SeasonLine service={single} className="mt-3" />
                <PriceLine service={single} className="mt-2" />
              </>
            ) : (
              <ul className="mt-5 space-y-3">
                {services.map((service) => (
                  <li
                    key={service.id}
                    className="flex flex-col gap-3 rounded-2xl border border-line bg-surface-2 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <h3 className="font-display text-xl leading-snug text-ink-800">{service.name}</h3>
                      <SeasonLine service={service} className="mt-1" />
                      <PriceLine service={service} className="mt-1" />
                    </div>
                    <ServiceAction
                      service={service}
                      number={number}
                      hello={hello}
                      label={labelFor(service)}
                      variant="secondary"
                      className="shrink-0"
                    />
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              {single && <ServiceAction service={single} number={number} hello={hello} label={labelFor(single)} />}
              {number && (
                <Button
                  href={whatsappLink(number, `${hello}, quiero cotizar maquillaje de Halloween para un grupo de ___ personas el día ___.`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="secondary"
                >
                  <WhatsAppIcon className="h-5 w-5 text-wa" />
                  Cotizar para un grupo
                  <span className="sr-only">por WhatsApp (se abre en una pestaña nueva)</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/** "Solo del 22 al 31 de octubre", si el servicio tiene temporada. */
function SeasonLine({ service, className }) {
  const text = seasonText(service);
  if (!text) return null;
  return <p className={cx('text-sm font-medium text-gold-700', className)}>{text}</p>;
}

function PriceLine({ service, className }) {
  const price = priceLabel(service);
  return (
    <p className={cx('text-sm text-ink-500', className)}>
      <span className="font-display text-xl text-ink-800">{price.text}</span>
      <span className="mx-2 text-ink-400" aria-hidden="true">
        ·
      </span>
      {duration(service.durationMinutes)}
    </p>
  );
}

/**
 * Reservar en el asistente o, si el servicio se cotiza, escribir por
 * WhatsApp. Cuando el texto visible es corto ("Reservar", "Cotizar"), el
 * nombre del servicio va para el lector de pantalla: en la lista hay
 * varios botones iguales.
 */
function ServiceAction({ service, number, hello, label, ...buttonProps }) {
  const price = priceLabel(service);
  if (price.isQuote && number) {
    return (
      <Button
        href={whatsappLink(number, `${hello}, quiero cotizar el ${service.name.toLowerCase()}.`)}
        target="_blank"
        rel="noopener noreferrer"
        {...buttonProps}
      >
        <WhatsAppIcon className="h-5 w-5" />
        Cotizar
        <span className="sr-only"> {service.name} por WhatsApp (se abre en una pestaña nueva)</span>
      </Button>
    );
  }
  return (
    <Button to={`/reservar?servicio=${encodeURIComponent(service.slug)}`} {...buttonProps}>
      {label}
      {label === 'Reservar' && <span className="sr-only"> {service.name}</span>}
    </Button>
  );
}

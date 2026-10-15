import { Badge, Button, Reveal } from '../ui/index.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import { duration, priceLabel, whatsappLink } from '../../lib/format.js';
import { PORTFOLIO, photoSources } from '../../data/portfolio.js';
import WhatsAppIcon from './WhatsAppIcon.jsx';
import { firstName } from './contactInfo.js';
import { useSeasonalService } from './useSeasonalService.js';

/**
 * La Catrina, de primera en el inicio durante la temporada.
 *
 * Solo aparece con el tema Halloween y el servicio activo (ver
 * useSeasonalService). Así no hay que marcarla y desmarcarla como
 * destacada cada año: se enciende y se apaga sola con la temporada y con
 * el interruptor del servicio en el panel.
 *
 * Nombre, descripción, precio y duración salen del servicio tal como lo
 * dejó Yury en el panel; aquí no se promete nada más.
 */

// La media catrina ya está en la portada durante la temporada.
const PHOTOS = PORTFOLIO.filter((p) => p.catrina && p.id !== 'catrina-media-cara').slice(0, 2);

export default function SeasonalSpotlight() {
  const settings = useSettings();
  const { service } = useSeasonalService();
  if (settings.theme !== 'HALLOWEEN' || !service) return null;

  const price = priceLabel(service);
  const number = settings.whatsappNumber || settings.contactPhone;
  const hello = `Hola ${firstName(settings.brandName)}`;

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

          <div>
            <Badge tone="gold">Temporada</Badge>
            <h2 id="titulo-temporada" className="text-balance mt-3 text-2xl leading-tight sm:text-3xl">
              {service.name}
            </h2>
            {service.shortDescription && (
              <p className="text-pretty mt-3 text-[15px] leading-relaxed text-ink-600">{service.shortDescription}</p>
            )}
            <p className="mt-3 text-sm text-ink-500">
              <span className="font-display text-xl text-ink-800">{price.text}</span>
              <span className="mx-2 text-ink-400" aria-hidden="true">
                ·
              </span>
              {duration(service.durationMinutes)}
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              {price.isQuote && number ? (
                <Button
                  href={whatsappLink(number, `${hello}, quiero cotizar el ${service.name.toLowerCase()}.`)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <WhatsAppIcon className="h-5 w-5" />
                  Cotizar mi Catrina
                  <span className="sr-only">por WhatsApp (se abre en una pestaña nueva)</span>
                </Button>
              ) : (
                <Button to={`/reservar?servicio=${encodeURIComponent(service.slug)}`}>Reservar mi Catrina</Button>
              )}
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

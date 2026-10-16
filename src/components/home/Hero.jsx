import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '../ui/index.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import { whatsappLink } from '../../lib/format.js';
import { PORTFOLIO } from '../../data/portfolio.js';
import usePhotos, { photoKey } from '../../hooks/usePhotos.js';
import { HALLOWEEN_HERO_URL } from '../portfolio/selection.js';
import { photoImgProps } from '../portfolio/photoImage.js';
import PapelPicadoGarland from '../seasonal/PapelPicadoGarland.jsx';
import WhatsAppIcon from './WhatsAppIcon.jsx';
import { firstName } from './contactInfo.js';

/**
 * Portada.
 *
 * Mobile-first: en el celular va primero la foto, baja (unos 44svh), y
 * debajo quién es, qué hace y dónde (a domicilio, en Pasto), el titular y los botones. Así
 * quien llega desde Instagram ve el trabajo real en el primer pantallazo
 * y el botón de reservar no queda enterrado. A partir de `lg` pasa a dos
 * columnas, con la foto a la derecha.
 *
 * Dos caminos: reservar en línea, o cotizar por WhatsApp. Novias,
 * quinceañeras y grupos suelen preguntar antes de decidir (y reservan
 * con meses de anticipación); para ellas el calendario no es el primer paso.
 *
 * En temporada de Halloween cambia la foto, no el decorado: se muestra
 * una catrina real hecha por Yury, sin tintes encima (un filtro de color
 * cambia el tono de piel y del maquillaje, que es justo lo que se vende).
 *
 * Foto: si Yury eligió una en Panel → Ajustes (heroImageUrl), va esa, con
 * su texto alternativo y su punto de enfoque; si no, la de siempre. La
 * catrina de temporada manda sobre las dos. No se pinta ninguna hasta
 * saber cuál toca (settings.loaded): si no, el celular bajaría la foto de
 * siempre y enseguida la nueva.
 */

const HALLOWEEN_PHOTO = PORTFOLIO.find((p) => p.id === 'catrina-media-cara');
const HERO_SIZES = '(min-width: 1024px) 45vw, 90vw';

export default function Hero() {
  const settings = useSettings();
  const reduced = useReducedMotion();
  const halloween = settings.theme === 'HALLOWEEN' && Boolean(HALLOWEEN_PHOTO);
  const { byUrl } = usePhotos();
  const customUrl = settings.heroImageUrl || null;

  const number = settings.whatsappNumber || settings.contactPhone;
  const quoteMessage = `Hola ${firstName(settings.brandName)}, quiero cotizar un servicio. Es para ___ el día ___.`;

  const fadeUp = (delay = 0) => ({
    initial: reduced ? false : { opacity: 0, y: 22 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.7, delay, ease: [0.22, 0.61, 0.36, 1] },
  });

  return (
    <section className="veil relative overflow-hidden" aria-labelledby="titulo-portada">
      {/* La guirnalda solo desde `sm`: en el celular empujaba la foto
          fuera del primer pantallazo. */}
      {halloween && (
        <div className="container-page absolute inset-x-0 top-0 z-10 hidden sm:block">
          <PapelPicadoGarland />
        </div>
      )}

      <div
        className={`container-page relative grid items-center gap-7 pb-14 pt-4 sm:gap-10 sm:pb-20 sm:pt-10 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:py-24 ${
          halloween ? 'sm:pt-28 lg:pt-32' : ''
        }`}
      >
        <motion.div
          initial={reduced ? false : { opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.22, 0.61, 0.36, 1] }}
          className="relative order-first mx-auto w-full max-w-md lg:order-last lg:max-w-none"
        >
          <div className="relative h-[44svh] min-h-[15rem] max-h-[32rem] overflow-hidden rounded-[2rem] border border-line bg-blush shadow-lift lg:aspect-[4/5] lg:h-auto lg:max-h-none lg:rounded-[2.5rem]">
            {!settings.loaded ? null : halloween ? (
              <img
                {...photoImgProps(HALLOWEEN_HERO_URL, { slot: 'large', sizes: HERO_SIZES, photo: HALLOWEEN_PHOTO })}
                alt={HALLOWEEN_PHOTO.alt}
                className="h-full w-full object-cover"
                fetchpriority="high"
                decoding="async"
              />
            ) : customUrl ? (
              <img
                {...photoImgProps(customUrl, {
                  slot: 'large',
                  sizes: HERO_SIZES,
                  focus: settings.heroImageFocus,
                  byUrl,
                })}
                alt={settings.heroImageAlt || byUrl.get(photoKey(customUrl))?.alt || ''}
                className="h-full w-full object-cover"
                fetchpriority="high"
                decoding="async"
              />
            ) : (
              /* Foto real de Yury trabajando. WebP para quien lo soporte, JPG
                 de respaldo; dos anchos para no bajar 1084 px en un celular.
                 El texto alternativo no dice dónde: atiende a domicilio. */
              <picture>
                <source
                  type="image/webp"
                  srcSet="/img/hero-yury-640.webp 640w, /img/hero-yury-1084.webp 1084w"
                  sizes="(min-width: 1024px) 45vw, 90vw"
                />
                <img
                  src="/img/hero-yury-1084.jpg"
                  srcSet="/img/hero-yury-640.jpg 640w, /img/hero-yury-1084.jpg 1084w"
                  sizes="(min-width: 1024px) 45vw, 90vw"
                  width="1084"
                  height="1451"
                  alt="Yury Enríquez maquillando a una clienta frente al aro de luz"
                  className="h-full w-full object-cover object-[50%_35%]"
                  fetchpriority="high"
                  decoding="async"
                />
              </picture>
            )}
          </div>
        </motion.div>

        <div className="text-center lg:text-left">
          <motion.p {...fadeUp(0.05)} className="eyebrow text-balance">
            {settings.brandName} · Maquilladora profesional a domicilio en Pasto
          </motion.p>

          <motion.h1
            {...fadeUp(0.1)}
            id="titulo-portada"
            className="text-balance mt-4 text-[2.25rem] leading-[1.08] sm:mt-5 sm:text-6xl lg:text-[4.1rem]"
          >
            Que el día que
            <span className="relative mx-2 inline-block italic text-brand-600">
              importa
              <svg
                viewBox="0 0 200 12"
                className="absolute -bottom-1 left-0 h-2.5 w-full text-brand-300"
                fill="none"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <motion.path
                  d="M2 8c40-5 90-7 196-4"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  initial={reduced ? false : { pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1, delay: 0.7, ease: 'easeInOut' }}
                />
              </svg>
            </span>
            te encuentre lista
          </motion.h1>

          <motion.p
            {...fadeUp(0.16)}
            className="text-pretty mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-ink-600 sm:mt-6 sm:text-lg lg:mx-0"
          >
            Maquillaje y peinado a domicilio para novias, quinceañeras, grados y sesiones de fotos.
            Reserva en línea con los horarios que de verdad tengo libres.
          </motion.p>

          <motion.div
            {...fadeUp(0.22)}
            className="mt-7 flex flex-col items-stretch gap-3 sm:mt-9 sm:flex-row sm:items-center sm:justify-center lg:justify-start"
          >
            <Button to="/reservar" size="lg">
              Reservar mi cita
              <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden="true">
                <path d="M3 8h9m0 0L8.5 4.5M12 8l-3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Button>
            {number ? (
              <Button
                href={whatsappLink(number, quoteMessage)}
                target="_blank"
                rel="noopener noreferrer"
                variant="secondary"
                size="lg"
              >
                <WhatsAppIcon className="h-5 w-5 text-wa" />
                Cotizar por WhatsApp
                <span className="sr-only">(se abre en una pestaña nueva)</span>
              </Button>
            ) : (
              <Button to="/servicios" variant="secondary" size="lg">
                Ver servicios y precios
              </Button>
            )}
          </motion.div>

          <motion.p {...fadeUp(0.28)} className="mt-5 text-sm text-ink-500">
            {/* Con abono en Ajustes, "pagas en efectivo" a secas lo contradiría. */}
            {Number(settings.depositPercent) > 0
              ? `Sin crear cuenta · Separas tu fecha con un abono del ${Number(settings.depositPercent)} %`
              : 'Sin crear cuenta · Pagas por transferencia o en efectivo'}
            <span className="mx-2 text-ink-400" aria-hidden="true">
              ·
            </span>
            <Link
              to="/servicios"
              className="inline-block py-2 font-medium text-brand-700 underline decoration-brand-300 underline-offset-4 transition hover:decoration-brand-600"
            >
              Ver servicios y precios
            </Link>
          </motion.p>
        </div>
      </div>
    </section>
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { AnimatePresence, useReducedMotion } from 'framer-motion';
import { api } from '../lib/api.js';
import { depositText, duration, longDate, priceLabel, seasonText, toDateISO, CATEGORY_LABEL } from '../lib/format.js';
import {
  DATE_OCCASIONS,
  advanceDaysFor,
  bookingOccasion,
  bookingPath,
  isDateService,
  isSeasonalService,
  seasonIsAhead,
  seasonIsOver,
  visibleImages,
  waHref,
} from '../lib/catalog.js';
import { useSettings } from '../context/SettingsContext.jsx';
import { Button, Badge, LoadingBlock, EmptyState, Reveal, cx } from '../components/ui/index.jsx';
import ServiceCard from '../components/ServiceCard.jsx';
import MobileCtaBar, { useStickyCta } from '../components/catalog/MobileCtaBar.jsx';
import Lightbox from '../components/catalog/Lightbox.jsx';
import usePageTitle from '../components/catalog/usePageTitle.js';
import usePhotos from '../hooks/usePhotos.js';
import { photoImgProps } from '../components/portfolio/photoImage.js';
import { CalendarIcon, CheckIcon, StarPlaceholder, WhatsAppIcon } from '../components/catalog/icons.jsx';

// Ocasiones en las que la clienta suele venir acompañada (mamá, damas,
// compañeras de grado): ahí se ofrece escribir por el grupo.
const GROUP_OCCASIONS = new Set(['bodas', 'quinceaneros', 'grados']);

export default function ServiceDetail() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const fromOccasion = searchParams.get('ocasion');
  const settings = useSettings();
  const reduced = useReducedMotion();
  const { byUrl } = usePhotos();

  const [service, setService] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [lightbox, setLightbox] = useState(null);

  const trackRef = useRef(null);
  const inlineCtaRef = useRef(null);
  const endRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setRelated([]);
    setActiveImage(0);
    trackRef.current?.scrollTo({ left: 0 });

    api
      .get(`/services/${slug}`)
      .then((d) => {
        if (cancelled) return;
        const found = d.service;
        setService(found);
        // "También te puede interesar" sale de la misma ocasión, no de la
        // misma categoría: a una novia le sirve el peinado de novia, no el
        // Paquete Quinceañera. Si esa petición falla, la ficha se queda
        // sin relacionados, pero no se convierte en "no encontrado".
        const occasion =
          bookingOccasion(found, fromOccasion) ??
          found.occasions?.find((o) => DATE_OCCASIONS.has(o.slug))?.slug ??
          found.occasions?.[0]?.slug;
        api
          .get(occasion ? `/services?occasion=${occasion}` : `/services?category=${found.category}`)
          .then((r) => {
            if (!cancelled) setRelated((r.services ?? []).filter((s) => s.slug !== slug).slice(0, 3));
          })
          .catch(() => {});
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug, fromOccasion]);

  usePageTitle(service?.name);
  const showBar = useStickyCta(inlineCtaRef, endRef, Boolean(service) && !loading);

  const goTo = useCallback(
    (index) => {
      const track = trackRef.current;
      if (!track) return;
      track.scrollTo({ left: index * track.clientWidth, behavior: reduced ? 'auto' : 'smooth' });
    },
    [reduced],
  );

  const onTrackScroll = () => {
    const track = trackRef.current;
    if (track?.clientWidth) setActiveImage(Math.round(track.scrollLeft / track.clientWidth));
  };

  const closeLightbox = useCallback(() => setLightbox(null), []);
  const changeLightbox = useCallback(
    (index) => {
      setLightbox(index);
      goTo(index);
    },
    [goTo],
  );

  if (loading) return <LoadingBlock label="Cargando servicio…" />;

  if (notFound || !service) {
    return (
      <div className="container-page py-20">
        <EmptyState
          title="No encontramos ese servicio"
          description="Puede que ya no esté disponible o que el enlace esté mal."
          action={<Button to="/servicios">Ver el catálogo</Button>}
        />
      </div>
    );
  }

  // Sin URL no hay foto que mostrar (una fila a medio cargar en el panel).
  const images = visibleImages(service.images).filter((image) => image?.url);
  const price = priceLabel(service);

  // La ocasión de la URL solo cuenta si el servicio de verdad la tiene.
  const occasionSlug = bookingOccasion(service, fromOccasion);
  const occasion = service.occasions?.find((o) => o.slug === occasionSlug) ?? null;
  const bookingTo = bookingPath({ service: service.slug, occasion: occasionSlug });

  /*
   * Botón principal:
   *   · "cotizar" → WhatsApp, porque no hay un valor que reservar;
   *   · novias y quinceañeras → separar la fecha por WhatsApp, porque
   *     se reserva con meses y casi siempre hay que hablar antes;
   *   · lo demás → reservar en línea, con WhatsApp para preguntar.
   * Sin número de WhatsApp en Ajustes, siempre queda reservar.
   */
  const dateMode = isDateService(service, occasionSlug);
  const waKind = price.isQuote ? 'cotizar' : dateMode ? 'fecha' : null;
  const waPrimary = waKind ? waHref(settings, waKind, { service, occasion }) : null;
  const waAsk = waHref(settings, 'pregunta', { service });
  const waGroup = service.occasions?.some((o) => GROUP_OCCASIONS.has(o.slug))
    ? waHref(settings, 'grupo', { service })
    : null;

  /*
   * Temporada (catrinas): solo se atiende esos días, pero el turno se
   * puede separar antes. Se dice junto al precio para que nadie llegue
   * al calendario buscando una fecha que no va a encontrar. El "hoy" es
   * el del estudio, no el del navegador.
   *
   * "Ya puedes separar" solo si la temporada empieza dentro de la agenda
   * en línea (maxAdvanceDays): si Yury carga en noviembre las fechas del
   * año siguiente, el calendario aún no las muestra y la frase mentiría.
   */
  const lastBookable = new Date(Date.now() + advanceDaysFor(service, settings) * 86_400_000);
  const season = seasonText(service);
  const today = toDateISO(new Date(), settings.timezone);
  const seasonNote = !season
    ? null
    : seasonIsOver(service, today)
      ? 'Las fechas de esta temporada ya pasaron.'
      : seasonIsAhead(service, today)
        ? service.availableFrom <= toDateISO(lastBookable, settings.timezone)
          ? 'Ya puedes separar tu turno para esos días.'
          : 'La agenda en línea para esas fechas abre más adelante.'
        : null;

  // Abono para separar la fecha, si Yury lo dejó en Ajustes.
  const deposit = depositText(settings.depositPercent, service);

  const bar = waPrimary
    ? {
        primary: { label: price.isQuote ? 'Cotizar' : 'Separar fecha', href: waPrimary },
        secondary: { label: 'Ver disponibilidad', to: bookingTo, icon: 'calendar' },
      }
    : {
        primary: { label: 'Reservar', to: bookingTo },
        secondary: waAsk ? { label: 'Preguntar por WhatsApp', href: waAsk, icon: 'whatsapp' } : null,
      };

  return (
    <article className="pb-20">
      {/* Migas de pan */}
      <nav aria-label="Ruta de navegación" className="container-page pt-8">
        <ol className="flex flex-wrap items-center gap-1.5 text-xs text-ink-500">
          <li>
            <Link to="/" className="hover:text-brand-700">
              Inicio
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link to="/servicios" className="hover:text-brand-700">
              Servicios
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="font-medium text-ink-700">
            {service.name}
          </li>
        </ol>
      </nav>

      <div className="container-page mt-7 grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
        {/* Galería: en el celular se desliza con el dedo; tocar amplía. */}
        <div className="lg:max-w-[32rem]">
          <div className="relative overflow-hidden rounded-[2rem] border border-line bg-blush shadow-soft">
            {images.length > 0 ? (
              <div
                ref={trackRef}
                onScroll={onTrackScroll}
                className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {images.map((image, i) => (
                  <button
                    key={`${i}-${image.url}`}
                    type="button"
                    onClick={() => setLightbox(i)}
                    aria-label={`Ampliar foto ${i + 1} de ${images.length}: ${image.alt}`}
                    className="relative aspect-[4/5] w-full shrink-0 snap-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-600"
                  >
                    <img
                      {...photoImgProps(image.url, {
                        slot: 'large',
                        sizes: '(min-width: 1024px) 32rem, 100vw',
                        focus: image.focus,
                        byUrl,
                      })}
                      alt=""
                      loading={i === 0 ? 'eager' : 'lazy'}
                      decoding="async"
                      fetchpriority={i === 0 ? 'high' : undefined}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex aspect-[4/5] items-center justify-center text-brand-300">
                <StarPlaceholder className="h-16 w-16" />
              </div>
            )}

            {images.length > 1 && (
              <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5 sm:hidden" aria-hidden="true">
                {images.map((image, i) => (
                  <span
                    key={`${i}-${image.url}`}
                    className={cx(
                      'h-1.5 rounded-full bg-surface shadow-soft transition-all',
                      activeImage === i ? 'w-5 opacity-100' : 'w-1.5 opacity-60',
                    )}
                  />
                ))}
              </div>
            )}
          </div>

          {images.length > 1 && (
            <div className="mt-3 hidden grid-cols-5 gap-2 sm:grid">
              {images.map((image, i) => (
                <button
                  key={`${i}-${image.url}`}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`Ver imagen ${i + 1} de ${images.length}: ${image.alt}`}
                  aria-current={activeImage === i}
                  className={cx(
                    'overflow-hidden rounded-xl border-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600',
                    activeImage === i
                      ? 'border-brand-500 opacity-100'
                      : 'border-transparent opacity-65 hover:opacity-100',
                  )}
                >
                  <img
                    {...photoImgProps(image.url, { slot: 'thumb', sizes: '6rem', focus: image.focus, byUrl })}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="aspect-[4/5] w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Información */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="flex flex-wrap items-center gap-3">
            <p className="eyebrow">{CATEGORY_LABEL[service.category]}</p>
            {isSeasonalService(service) && <Badge tone="gold">Temporada</Badge>}
          </div>

          <h1 className="text-balance mt-3 text-3xl leading-tight sm:text-4xl">{service.name}</h1>

          <p className="text-pretty mt-4 text-[15px] leading-relaxed text-ink-600">
            {service.shortDescription}
          </p>

          <div className="mt-7 flex flex-wrap items-end gap-x-8 gap-y-4 rounded-2xl border border-line bg-surface p-5 shadow-soft">
            <div>
              <p className="text-xs uppercase tracking-widest text-ink-400">Valor</p>
              <p className={cx('mt-1 font-display text-brand-700', price.isQuote ? 'text-2xl' : 'text-3xl')}>
                {price.text}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-ink-400">Duración</p>
              <p className="mt-1 font-display text-3xl text-ink-800">{duration(service.durationMinutes)}</p>
            </div>
            {season && (
              <div className="w-full border-t border-line pt-4">
                <p className="flex items-center gap-2 text-sm font-medium text-gold-700">
                  <CalendarIcon className="h-4 w-4 shrink-0" />
                  {season}
                </p>
                {seasonNote && <p className="mt-1 text-xs leading-relaxed text-ink-500">{seasonNote}</p>}
              </div>
            )}
            {price.isQuote && (
              <p className="w-full text-xs leading-relaxed text-ink-500">
                El valor depende de lo que necesites: te lo confirmamos por WhatsApp antes de agendar.
              </p>
            )}
          </div>

          {service.includes?.length > 0 && (
            <div className="mt-6">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-ink-400">Qué incluye</h2>
              <ul className="mt-3 space-y-2.5">
                {service.includes.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blush text-brand-600">
                      <CheckIcon />
                    </span>
                    <span className="text-sm leading-relaxed text-ink-600">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div ref={inlineCtaRef} className="mt-7 flex flex-col gap-3 sm:flex-row">
            {waPrimary ? (
              <>
                <Button href={waPrimary} target="_blank" rel="noopener noreferrer" size="lg" className="flex-1 px-5 sm:px-8">
                  <WhatsAppIcon />
                  {price.isQuote ? 'Cotizar por WhatsApp' : 'Separar mi fecha por WhatsApp'}
                </Button>
                <Button to={bookingTo} variant="secondary" size="lg">
                  Ver disponibilidad
                </Button>
              </>
            ) : (
              <>
                <Button to={bookingTo} size="lg" className="flex-1">
                  Reservar este servicio
                </Button>
                {waAsk && (
                  <Button href={waAsk} target="_blank" rel="noopener noreferrer" variant="secondary" size="lg">
                    <WhatsAppIcon className="h-5 w-5 text-wa" />
                    Preguntar por WhatsApp
                  </Button>
                )}
              </>
            )}
          </div>

          {deposit && <p className="mt-3 text-sm leading-relaxed text-ink-600">{deposit}.</p>}

          {waPrimary && dateMode && !price.isQuote && (
            <p className="mt-3 text-xs leading-relaxed text-ink-500">
              La agenda en línea llega hasta el {longDate(lastBookable, settings.timezone)}. Si tu fecha es más
              adelante, escríbenos y la separamos contigo.
            </p>
          )}

          {service.occasions?.length > 0 && (
            <div className="mt-8">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-ink-400">
                Ideal para
              </p>
              <ul className="flex flex-wrap gap-2">
                {service.occasions.map((item) => (
                  <li key={item.id}>
                    <Link
                      to={`/ocasiones/${item.slug}`}
                      className="inline-flex min-h-[34px] items-center rounded-full border border-line bg-surface px-3.5 text-xs font-medium text-ink-600 transition hover:border-brand-300 hover:bg-blush hover:text-brand-700"
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Descripción detallada */}
      <div className="container-page mt-16">
        <Reveal className="mx-auto max-w-3xl">
          <h2 className="text-2xl sm:text-3xl">En qué consiste</h2>
          <div className="mt-5 space-y-4">
            {service.description.split('\n\n').map((paragraph, i) => (
              <p key={i} className="text-pretty text-[15px] leading-relaxed text-ink-600">
                {paragraph}
              </p>
            ))}
          </div>

          {waGroup && (
            <div className="veil mt-10 flex flex-col gap-4 rounded-[2rem] border border-line p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
              <div>
                <h2 className="font-display text-2xl text-ink-800">¿Vienen más personas?</h2>
                <p className="text-pretty mt-2 max-w-md text-sm leading-relaxed text-ink-600">
                  Si también quieres maquillaje para tu mamá, tus damas o tus compañeras, cuéntanos cuántas son y
                  para qué fecha, y te decimos cómo organizarlo.
                </p>
              </div>
              <Button href={waGroup} target="_blank" rel="noopener noreferrer" variant="secondary" className="shrink-0">
                <WhatsAppIcon className="h-5 w-5 text-wa" />
                Escribir por WhatsApp
              </Button>
            </div>
          )}
        </Reveal>
      </div>

      {related.length > 0 && (
        <div className="container-page mt-20">
          <h2 className="mb-8 text-2xl sm:text-3xl">También te puede interesar</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item, i) => (
              <ServiceCard key={item.id} service={item} index={i} occasionSlug={occasionSlug ?? undefined} />
            ))}
          </div>
        </div>
      )}

      <div ref={endRef} aria-hidden="true" />

      <MobileCtaBar visible={showBar} title={service.name} price={price.short} {...bar} />

      <AnimatePresence>
        {lightbox !== null && (
          <Lightbox images={images} index={lightbox} onIndex={changeLightbox} onClose={closeLightbox} />
        )}
      </AnimatePresence>
    </article>
  );
}

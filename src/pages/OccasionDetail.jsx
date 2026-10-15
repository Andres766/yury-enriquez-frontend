import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { photoSources, PORTFOLIO_CATEGORIES } from '../data/portfolio.js';
import { longDate } from '../lib/format.js';
import {
  DATE_OCCASIONS,
  advanceDaysFor,
  bookingPath,
  isHiddenPhoto,
  occasionPriceFrom,
  photoProps,
  portfolioForOccasion,
  waHref,
} from '../lib/catalog.js';
import { useSettings } from '../context/SettingsContext.jsx';
import ServiceCard from '../components/ServiceCard.jsx';
import MobileCtaBar, { useStickyCta } from '../components/catalog/MobileCtaBar.jsx';
import usePageTitle from '../components/catalog/usePageTitle.js';
import OccasionFaq from '../components/catalog/OccasionFaq.jsx';
import OccasionTestimonials from '../components/catalog/OccasionTestimonials.jsx';
import { CheckIcon, WhatsAppIcon } from '../components/catalog/icons.jsx';
import { Button, LoadingBlock, EmptyState, Reveal } from '../components/ui/index.jsx';

export default function OccasionDetail() {
  const { slug } = useParams();
  const settings = useSettings();
  const [occasion, setOccasion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const inlineCtaRef = useRef(null);
  const endRef = useRef(null);

  // Si se cambia de ocasión antes de que llegue la respuesta anterior,
  // esa respuesta se descarta: si no, podía pintar la ocasión vieja.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    api
      .get(`/occasions/${slug}`)
      .then((d) => {
        if (!cancelled) setOccasion(d.occasion);
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
  }, [slug]);

  usePageTitle(occasion?.name);
  const showBar = useStickyCta(inlineCtaRef, endRef, Boolean(occasion) && !loading);

  if (loading) return <LoadingBlock />;

  if (notFound || !occasion) {
    return (
      <div className="container-page py-20">
        <EmptyState
          title="No encontramos esa ocasión"
          description="Puede que el enlace esté mal o que ya no esté publicada."
          action={<Button to="/ocasiones">Ver todas las ocasiones</Button>}
        />
      </div>
    );
  }

  const services = occasion.services ?? [];
  const priceFrom = occasionPriceFrom(services);
  const bookingTo = bookingPath({ occasion: occasion.slug });
  const hero = occasion.heroImage && !isHiddenPhoto(occasion.heroImage) ? occasion.heroImage : null;

  /*
   * Bodas y quinceañeros: la fecha se separa por WhatsApp (se reservan
   * con meses de anticipación) y el calendario queda de segundo. En el
   * resto, reservar en línea es lo principal. Sin WhatsApp en Ajustes,
   * siempre queda el botón de reservar: la página nunca se queda sin uno.
   */
  const dateMode = DATE_OCCASIONS.has(occasion.slug);
  const waDate = dateMode ? waHref(settings, 'fecha', { occasion }) : null;
  const waAsk = waHref(settings, 'pregunta', { occasion });
  const name = occasion.name.toLowerCase();

  // Hasta dónde llega el calendario con el servicio que más deja
  // adelantarse: una novia de dentro de ocho meses tiene que saber que
  // su fecha no sale en línea y que igual se separa por WhatsApp.
  const advanceDays = Math.max(
    ...(services.length ? services : [null]).map((service) => advanceDaysFor(service, settings)),
  );
  const lastBookable = new Date(Date.now() + advanceDays * 86_400_000);

  const ctas = waDate ? (
    <>
      <Button href={waDate} target="_blank" rel="noopener noreferrer" size="lg" className="px-5 sm:px-8">
        <WhatsAppIcon />
        Separar mi fecha por WhatsApp
      </Button>
      <Button to={bookingTo} variant="secondary" size="lg">
        Ver disponibilidad
      </Button>
    </>
  ) : (
    <>
      <Button to={bookingTo} size="lg">
        Reservar para {name}
      </Button>
      {waAsk && (
        <Button href={waAsk} target="_blank" rel="noopener noreferrer" variant="secondary" size="lg">
          <WhatsAppIcon className="h-5 w-5 text-wa" />
          Preguntar por WhatsApp
        </Button>
      )}
    </>
  );

  const bar = waDate
    ? {
        primary: { label: 'Separar fecha', href: waDate },
        secondary: { label: 'Ver disponibilidad', to: bookingTo, icon: 'calendar' },
      }
    : {
        primary: { label: 'Reservar', to: bookingTo },
        secondary: waAsk ? { label: 'Preguntar por WhatsApp', href: waAsk, icon: 'whatsapp' } : null,
      };

  const gallery = portfolioForOccasion(occasion.slug).slice(0, 6);
  const galleryLabel = PORTFOLIO_CATEGORIES.find((c) => c.id === gallery[0]?.category)?.label;

  return (
    <article className="pb-20">
      {/*
        Portada. Antes la foto iba de fondo con un velo oscuro del 85 %:
        un vestido blanco se veía gris y los botones quedaban muy abajo.
        Ahora en el celular van primero el título y los botones, y la
        foto vertical debajo; en computador, lado a lado.
      */}
      <header className="veil border-b border-line">
        <div className="container-page grid gap-8 py-8 sm:py-12 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-14 lg:py-16">
          <div>
            <nav aria-label="Ruta de navegación" className="mb-6">
              <ol className="flex flex-wrap items-center gap-1.5 text-xs text-ink-500">
                <li>
                  <Link to="/" className="hover:text-brand-700">
                    Inicio
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li>
                  <Link to="/ocasiones" className="hover:text-brand-700">
                    Ocasiones
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li aria-current="page" className="font-medium text-ink-700">
                  {occasion.name}
                </li>
              </ol>
            </nav>

            <p className="eyebrow">Para cada ocasión</p>
            <h1 className="text-balance mt-3 text-4xl leading-tight sm:text-5xl">{occasion.name}</h1>
            <p className="text-pretty mt-3 max-w-xl text-lg italic text-ink-600">{occasion.tagline}</p>
            {priceFrom && <p className="mt-4 text-sm font-medium text-brand-700">{priceFrom}</p>}

            <div ref={inlineCtaRef} className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {ctas}
            </div>
            {waDate && (
              <p className="mt-3 max-w-xl text-xs leading-relaxed text-ink-500">
                La agenda en línea llega hasta el {longDate(lastBookable, settings.timezone)}. Si tu fecha es más
                adelante, escríbenos y la separamos contigo.
              </p>
            )}
          </div>

          {hero && (
            <div className="mx-auto w-full max-w-sm overflow-hidden rounded-[2rem] border border-line bg-blush shadow-soft lg:max-w-md">
              <img
                {...photoProps(hero, '(min-width: 1024px) 28rem, 90vw')}
                alt=""
                fetchpriority="high"
                decoding="async"
                className="aspect-[4/5] w-full object-cover"
              />
            </div>
          )}
        </div>
      </header>

      {/*
        Las opciones van justo después de la portada: es lo que viene a
        comparar quien llega desde Instagram. El texto largo va después.
      */}
      {services.length > 0 && (
        <section id="servicios" className="container-page mt-14 scroll-mt-24 sm:mt-16" aria-labelledby="titulo-servicios-ocasion">
          <h2 id="titulo-servicios-ocasion" className="mb-3 text-2xl sm:text-3xl">
            Servicios para esta ocasión
          </h2>
          <p className="mb-9 max-w-2xl text-sm leading-relaxed text-ink-500">
            Estos son los que mejor funcionan para {name}. Toca uno para ver qué incluye y su valor.
          </p>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service, i) => (
              <ServiceCard key={service.id} service={service} index={i} occasionSlug={occasion.slug} />
            ))}
          </div>
        </section>
      )}

      <div className="container-page mt-20 grid gap-12 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
        <Reveal>
          <h2 className="text-2xl sm:text-3xl">Cómo trabajamos este tipo de evento</h2>
          <div className="mt-5 space-y-4">
            {occasion.description.split('\n\n').map((paragraph, i) => (
              <p key={i} className="text-pretty text-[15px] leading-relaxed text-ink-600">
                {paragraph}
              </p>
            ))}
          </div>
        </Reveal>

        {/*
          Lo que se cuida en cualquier servicio de la ocasión. Lo que trae
          un servicio concreto (pruebas, descuentos, retoques) va en la
          ficha de ese servicio: por eso aquí no hay botón de reservar,
          que haría pensar que todo viene en cualquier reserva.
        */}
        {occasion.includes?.length > 0 && (
          <Reveal delay={0.1}>
            <div className="rounded-[2rem] border border-line bg-surface p-6 shadow-soft sm:p-8">
              <h2 className="font-display text-2xl text-ink-800">Lo que cuidamos</h2>
              <ul className="mt-5 space-y-4">
                {occasion.includes.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blush text-brand-600">
                      <CheckIcon />
                    </span>
                    <span className="text-sm leading-relaxed text-ink-600">{item}</span>
                  </li>
                ))}
              </ul>

              {services.length > 0 && (
                <p className="mt-6 text-xs leading-relaxed text-ink-500">
                  Lo que incluye cada servicio está en su ficha.
                </p>
              )}
            </div>
          </Reveal>
        )}
      </div>

      {/* Trabajos reales de esta ocasión, del portafolio. */}
      {gallery.length > 0 && (
        <section className="container-page mt-20" aria-labelledby="titulo-trabajos-ocasion">
          <h2 id="titulo-trabajos-ocasion" className="mb-8 text-2xl sm:text-3xl">
            Trabajos reales{galleryLabel ? `: ${galleryLabel.toLowerCase()}` : ''}
          </h2>
          <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            {gallery.map((photo) => {
              const { src, srcSet } = photoSources(photo.id);
              return (
                <li key={photo.id} className="overflow-hidden rounded-2xl border border-line bg-blush">
                  <figure>
                    <img
                      src={src}
                      srcSet={srcSet}
                      sizes="(min-width: 1024px) 33vw, 50vw"
                      alt={photo.alt}
                      loading="lazy"
                      decoding="async"
                      style={{ objectPosition: photo.focus }}
                      className="aspect-[4/5] w-full object-cover"
                    />
                    {photo.credito && (
                      <figcaption className="px-3 py-2 text-[11px] text-ink-500">{photo.credito}</figcaption>
                    )}
                  </figure>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Novias y quinceañeras preguntan lo mismo antes de decidir. */}
      {dateMode && <OccasionFaq occasion={occasion} />}

      <OccasionTestimonials slug={occasion.slug} />

      {/* Cierre: los mismos botones, para quien llegó hasta abajo. */}
      <Reveal className="container-page mt-20">
        <div className="veil flex flex-col items-center gap-5 rounded-[2rem] border border-line px-6 py-12 text-center sm:px-12">
          <h2 className="text-balance text-2xl sm:text-3xl">
            {dateMode ? '¿Ya tienes la fecha?' : '¿Te ayudamos con tu evento?'}
          </h2>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">{ctas}</div>
        </div>
      </Reveal>

      <div ref={endRef} aria-hidden="true" />

      <MobileCtaBar visible={showBar} title={occasion.name} price={priceFrom} {...bar} />
    </article>
  );
}

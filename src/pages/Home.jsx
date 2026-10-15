import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import Hero from '../components/home/Hero.jsx';
import SeasonalSpotlight from '../components/home/SeasonalSpotlight.jsx';
import PortfolioPreview from '../components/home/PortfolioPreview.jsx';
import PromoStrip from '../components/home/PromoStrip.jsx';
import AboutStrip from '../components/home/AboutStrip.jsx';
import Testimonials from '../components/home/Testimonials.jsx';
import FaqSection from '../components/home/FaqSection.jsx';
import ClosingCTA from '../components/home/ClosingCTA.jsx';
import ServiceCard from '../components/ServiceCard.jsx';
import { SectionTitle, Button, Reveal } from '../components/ui/index.jsx';

/**
 * Inicio.
 *
 * Orden pensado para el celular, donde llega casi todo el mundo desde
 * Instagram: portada → trabajos reales → servicios destacados → quién es
 * Yury → testimonios → preguntas → cierre con los dos botones. Unas 8 a
 * 10 pantallas en vez de 18. La grilla de ocasiones, el paso a paso y el
 * horario completo viven en sus páginas (/ocasiones, preguntas
 * frecuentes y /contacto).
 *
 * Solo el bloque de servicios espera a la API. Con el servidor dormido
 * (Render gratuito tarda hasta un minuto en despertar), antes toda la
 * página debajo de la portada era un spinner; ahora lo fijo se pinta de
 * una vez, y los servicios muestran tarjetas de espera o, si ya visitó
 * antes, los de la última vez mientras llegan los nuevos.
 */

const FEATURED_COUNT = 3;
const CACHE_KEY = 'inicio-catalogo';

function readCache() {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null');
    return Array.isArray(cached?.services) ? cached : null;
  } catch {
    return null;
  }
}

function writeCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // Modo privado o almacenamiento lleno: solo se pierde el atajo.
  }
}

/**
 * Los paquetes primero: son lo que buscan novias y quinceañeras, el
 * público principal. Dentro de cada grupo se respeta el orden del panel.
 */
function pickFeatured(services) {
  const featured = services.filter((s) => s.featured);
  const pool = featured.length > 0 ? featured : services;
  const packages = pool.filter((s) => s.category === 'PAQUETE');
  const rest = pool.filter((s) => s.category !== 'PAQUETE');
  return [...packages, ...rest].slice(0, FEATURED_COUNT);
}

export default function Home() {
  const [data, setData] = useState(() => {
    const cached = readCache();
    return {
      services: cached?.services ?? [],
      occasions: cached?.occasions ?? [],
      promotions: [],
      loading: !cached,
    };
  });

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([api.get('/services'), api.get('/occasions'), api.get('/promotions')]).then(
      ([services, occasions, promotions]) => {
        if (cancelled) return;
        setData((prev) => {
          // Si una llamada falla, se conserva lo que hubiera (la caché).
          const next = {
            services: services.status === 'fulfilled' ? (services.value?.services ?? []) : prev.services,
            occasions: occasions.status === 'fulfilled' ? (occasions.value?.occasions ?? []) : prev.occasions,
            promotions: promotions.value?.promotions ?? [],
            loading: false,
          };
          if (services.status === 'fulfilled') writeCache({ services: next.services, occasions: next.occasions });
          return next;
        });
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const toShow = pickFeatured(data.services);

  return (
    <>
      <Hero />
      <SeasonalSpotlight />
      <PortfolioPreview />

      <section className="border-y border-line bg-surface py-14 sm:py-20" aria-labelledby="titulo-servicios">
        <div className="container-page">
          <SectionTitle eyebrow="Servicios" title="Lo que hago" className="mb-6 sm:mb-8" as="h2" />
          <span id="titulo-servicios" className="sr-only">
            Servicios destacados
          </span>

          {/* Atajo por ocasión: lleva al catálogo ya filtrado */}
          {data.occasions.length > 0 && (
            <nav aria-label="Servicios por ocasión" className="mb-8 sm:mb-10">
              <ul className="flex flex-wrap justify-center gap-2">
                {data.occasions.map((occasion) => (
                  <li key={occasion.id}>
                    <Link
                      to={`/servicios?ocasion=${encodeURIComponent(occasion.slug)}`}
                      className="inline-flex min-h-[44px] items-center rounded-full border border-line bg-cream px-4 text-sm font-medium text-ink-600 transition hover:border-brand-300 hover:bg-blush hover:text-brand-700"
                    >
                      {occasion.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          {data.loading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
              <p className="sr-only">Cargando servicios…</p>
              {Array.from({ length: FEATURED_COUNT }, (_, i) => (
                <ServiceCardSkeleton key={i} />
              ))}
            </div>
          ) : toShow.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {toShow.map((service, i) => (
                <ServiceCard key={service.id} service={service} index={i} />
              ))}
            </div>
          ) : null}

          <Reveal delay={0.1} className="mt-10 text-center">
            <Button to="/servicios" variant="secondary" size="lg">
              Ver todos los servicios y precios
            </Button>
          </Reveal>
        </div>
      </section>

      <PromoStrip promotions={data.promotions} />
      <AboutStrip />
      <Testimonials />
      <FaqSection />
      <ClosingCTA />
    </>
  );
}

/** Tarjeta de espera con la misma forma que ServiceCard. */
function ServiceCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-soft" aria-hidden="true">
      <div className="aspect-[4/5] animate-pulse bg-blush" />
      <div className="space-y-3 p-5 sm:p-6">
        <div className="h-5 w-2/3 animate-pulse rounded-full bg-blush" />
        <div className="h-3.5 w-full animate-pulse rounded-full bg-blush" />
        <div className="h-3.5 w-4/5 animate-pulse rounded-full bg-blush" />
        <div className="mt-5 h-6 w-1/3 animate-pulse rounded-full bg-blush" />
      </div>
    </div>
  );
}

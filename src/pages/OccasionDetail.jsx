import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import ServiceCard from '../components/ServiceCard.jsx';
import { Button, LoadingBlock, EmptyState, Reveal } from '../components/ui/index.jsx';

export default function OccasionDetail() {
  const { slug } = useParams();
  const [occasion, setOccasion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    api
      .get(`/occasions/${slug}`)
      .then((d) => setOccasion(d.occasion))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

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

  return (
    <article className="pb-20">
      {/* Portada */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-blush">
          {occasion.heroImage && (
            <img src={occasion.heroImage} alt="" className="h-full w-full object-cover" fetchpriority="high" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-scrim/85 via-scrim/55 to-scrim/30" aria-hidden="true" />
        </div>

        <div className="container-page relative flex min-h-[22rem] flex-col justify-end py-12 sm:min-h-[26rem] sm:py-16">
          <nav aria-label="Ruta de navegación" className="mb-5">
            <ol className="flex flex-wrap items-center gap-1.5 text-xs text-white/70">
              <li>
                <Link to="/" className="hover:text-white">
                  Inicio
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link to="/ocasiones" className="hover:text-white">
                  Ocasiones
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-white">
                {occasion.name}
              </li>
            </ol>
          </nav>

          <p className="text-[11px] font-medium uppercase tracking-widest text-white/75">Para cada ocasión</p>
          <h1 className="text-balance mt-3 max-w-2xl text-4xl leading-tight text-white sm:text-5xl">
            {occasion.name}
          </h1>
          <p className="mt-3 max-w-xl text-lg italic text-white/85">{occasion.tagline}</p>
        </div>
      </header>

      <div className="container-page mt-14 grid gap-12 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
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

        {occasion.includes?.length > 0 && (
          <Reveal delay={0.1}>
            <div className="rounded-[2rem] border border-line bg-surface p-6 shadow-soft sm:p-8">
              <h2 className="font-display text-2xl text-ink-800">Qué incluye</h2>
              <ul className="mt-5 space-y-4">
                {occasion.includes.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blush text-brand-600">
                      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
                        <path d="m3.5 8.4 2.8 2.8 6.2-6.4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <span className="text-sm leading-relaxed text-ink-600">{item}</span>
                  </li>
                ))}
              </ul>

              <Button to="/reservar" className="mt-7 w-full">
                Reservar para {occasion.name.toLowerCase()}
              </Button>
            </div>
          </Reveal>
        )}
      </div>

      {occasion.services?.length > 0 && (
        <div className="container-page mt-20">
          <h2 className="mb-3 text-2xl sm:text-3xl">Servicios para esta ocasión</h2>
          <p className="mb-9 max-w-2xl text-sm leading-relaxed text-ink-500">
            Estos son los que mejor funcionan para {occasion.name.toLowerCase()}. Puedes reservar
            cualquiera de ellos en línea.
          </p>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {occasion.services.map((service, i) => (
              <ServiceCard key={service.id} service={service} index={i} />
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

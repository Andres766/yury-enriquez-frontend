import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { api } from '../lib/api.js';
import { money, duration, CATEGORY_LABEL } from '../lib/format.js';
import { Button, Badge, LoadingBlock, EmptyState, Reveal, cx } from '../components/ui/index.jsx';
import ServiceCard from '../components/ServiceCard.jsx';

export default function ServiceDetail() {
  const { slug } = useParams();
  const reduced = useReducedMotion();

  const [service, setService] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    setActiveImage(0);

    api
      .get(`/services/${slug}`)
      .then((d) => {
        setService(d.service);
        return api.get(`/services?category=${d.service.category}`);
      })
      .then((d) => setRelated((d.services ?? []).filter((s) => s.slug !== slug).slice(0, 3)))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

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

  const images = service.images ?? [];

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
        {/* Galería */}
        <div>
          <div className="overflow-hidden rounded-[2rem] border border-line bg-blush shadow-soft">
            <AnimatePresence mode="wait">
              {images[activeImage] ? (
                <motion.img
                  key={images[activeImage].url}
                  src={images[activeImage].url}
                  alt={images[activeImage].alt}
                  initial={reduced ? false : { opacity: 0, scale: 1.02 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35 }}
                  className="aspect-[4/3] w-full object-cover"
                />
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center text-brand-300">
                  <svg viewBox="0 0 24 24" className="h-16 w-16" fill="none" aria-hidden="true">
                    <path d="M12 3.5 14.4 9l5.6.5-4.3 3.9 1.3 5.6L12 16l-5 3 1.3-5.6L4 9.5 9.6 9z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </AnimatePresence>
          </div>

          {images.length > 1 && (
            <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5">
              {images.map((image, i) => (
                <button
                  key={image.url}
                  type="button"
                  onClick={() => setActiveImage(i)}
                  aria-label={`Ver imagen ${i + 1} de ${images.length}: ${image.alt}`}
                  aria-current={activeImage === i}
                  className={cx(
                    'overflow-hidden rounded-xl border-2 transition',
                    activeImage === i
                      ? 'border-brand-500 opacity-100'
                      : 'border-transparent opacity-65 hover:opacity-100',
                  )}
                >
                  <img src={image.url} alt="" loading="lazy" className="aspect-square w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Información */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{CATEGORY_LABEL[service.category]}</Badge>
            {service.featured && <Badge tone="gold">Destacado</Badge>}
          </div>

          <h1 className="text-balance mt-4 text-3xl leading-tight sm:text-4xl">{service.name}</h1>

          <p className="text-pretty mt-4 text-[15px] leading-relaxed text-ink-600">
            {service.shortDescription}
          </p>

          <div className="mt-7 flex flex-wrap items-end gap-x-8 gap-y-4 rounded-2xl border border-line bg-surface p-5 shadow-soft">
            <div>
              <p className="text-xs uppercase tracking-widest text-ink-400">Valor</p>
              <p className="mt-1 font-display text-3xl text-brand-700">
                {money(service.priceCents, service.currency)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-ink-400">Duración</p>
              <p className="mt-1 font-display text-3xl text-ink-800">{duration(service.durationMinutes)}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button to={`/reservar?servicio=${service.slug}`} size="lg" className="flex-1">
              Reservar este servicio
            </Button>
            <Button to="/servicios" variant="secondary" size="lg">
              Ver otros
            </Button>
          </div>

          {service.occasions?.length > 0 && (
            <div className="mt-8">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-ink-400">
                Ideal para
              </p>
              <ul className="flex flex-wrap gap-2">
                {service.occasions.map((occasion) => (
                  <li key={occasion.id}>
                    <Link
                      to={`/ocasiones/${occasion.slug}`}
                      className="inline-flex min-h-[34px] items-center rounded-full border border-line bg-surface px-3.5 text-xs font-medium text-ink-600 transition hover:border-brand-300 hover:bg-blush hover:text-brand-700"
                    >
                      {occasion.name}
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
        </Reveal>
      </div>

      {related.length > 0 && (
        <div className="container-page mt-20">
          <h2 className="mb-8 text-2xl sm:text-3xl">También te puede interesar</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item, i) => (
              <ServiceCard key={item.id} service={item} index={i} />
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

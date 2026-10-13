import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, qs } from '../lib/api.js';
import ServiceCard from '../components/ServiceCard.jsx';
import { SectionTitle, LoadingBlock, EmptyState, Button, cx } from '../components/ui/index.jsx';

const FILTERS = [
  { value: '', label: 'Todos' },
  { value: 'PAQUETE', label: 'Paquetes' },
  { value: 'MAQUILLAJE', label: 'Maquillaje' },
  { value: 'PEINADO', label: 'Peinado' },
];

export default function Services() {
  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get('categoria') ?? '';
  const occasion = searchParams.get('ocasion') ?? '';

  const [services, setServices] = useState([]);
  const [occasions, setOccasions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/occasions').then((d) => setOccasions(d.occasions ?? [])).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    api
      .get(`/services${qs({ category, occasion })}`)
      .then((d) => setServices(d.services ?? []))
      .catch(() => setServices([]))
      .finally(() => setLoading(false));
  }, [category, occasion]);

  const setFilter = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  const activeOccasion = useMemo(
    () => occasions.find((o) => o.slug === occasion),
    [occasions, occasion],
  );

  return (
    <div className="container-page py-14 sm:py-20">
      <SectionTitle
        eyebrow="Catálogo"
        title="Servicios y precios"
        subtitle="Todo lo que ofrecemos, con su duración y su valor. Los paquetes combinan maquillaje y peinado a mejor precio que por separado."
        className="mb-12"
        as="h1"
      />

      {/* Filtros por categoría */}
      <div className="mb-5 flex flex-wrap justify-center gap-2" role="group" aria-label="Filtrar por categoría">
        {FILTERS.map((filter) => {
          const active = category === filter.value;
          return (
            <button
              key={filter.value || 'all'}
              type="button"
              onClick={() => setFilter('categoria', filter.value)}
              aria-pressed={active}
              className={cx(
                'min-h-[40px] rounded-full border px-5 text-sm font-medium transition-all duration-200',
                active
                  ? 'border-brand-600 bg-brand-600 text-on-brand shadow-soft'
                  : 'border-line bg-surface text-ink-600 hover:border-brand-300 hover:bg-blush',
              )}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      {/* Filtro por ocasión */}
      {occasions.length > 0 && (
        <div className="mb-12 flex flex-wrap items-center justify-center gap-2" role="group" aria-label="Filtrar por ocasión">
          <span className="mr-1 text-xs uppercase tracking-widest text-ink-400">Ocasión</span>
          {occasions.map((item) => {
            const active = occasion === item.slug;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter('ocasion', active ? '' : item.slug)}
                aria-pressed={active}
                className={cx(
                  'min-h-[34px] rounded-full border px-3.5 text-xs font-medium transition',
                  active
                    ? 'border-brand-400 bg-blush text-brand-800'
                    : 'border-line bg-surface text-ink-500 hover:border-brand-200 hover:text-brand-700',
                )}
              >
                {item.name}
              </button>
            );
          })}
        </div>
      )}

      {activeOccasion && (
        <p className="mb-8 text-center text-sm text-ink-500">
          Mostrando servicios para <span className="font-medium text-ink-800">{activeOccasion.name}</span>.{' '}
          <button
            type="button"
            onClick={() => setFilter('ocasion', '')}
            className="font-medium text-brand-700 underline underline-offset-4"
          >
            Quitar filtro
          </button>
        </p>
      )}

      {loading ? (
        <LoadingBlock />
      ) : services.length === 0 ? (
        <EmptyState
          title="No hay servicios con esos filtros"
          description="Prueba quitando algún filtro o mira el catálogo completo."
          action={
            <Button onClick={() => setSearchParams({}, { replace: true })} variant="secondary">
              Ver todos
            </Button>
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service, i) => (
            <ServiceCard key={service.id} service={service} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

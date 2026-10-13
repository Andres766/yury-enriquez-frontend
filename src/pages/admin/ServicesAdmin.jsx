import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { api, ApiError } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { money, duration, CATEGORY_LABEL } from '../../lib/format.js';
import {
  Button, Input, Textarea, Select, Checkbox, Badge, LoadingBlock, EmptyState, Alert, cx,
} from '../../components/ui/index.jsx';

const EMPTY = {
  name: '',
  category: 'MAQUILLAJE',
  shortDescription: '',
  description: '',
  durationMinutes: 60,
  priceCents: 0,
  currency: 'COP',
  active: true,
  featured: false,
  sortOrder: 0,
  images: [],
  occasionIds: [],
};

export default function ServicesAdmin() {
  const toast = useToast();
  const [services, setServices] = useState([]);
  const [occasions, setOccasions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

  const load = () =>
    Promise.allSettled([api.get('/services/admin/all'), api.get('/occasions/admin/all')]).then(([s, o]) => {
      setServices(s.value?.services ?? []);
      setOccasions(o.value?.occasions ?? []);
      setLoading(false);
    });

  useEffect(() => {
    load();
  }, []);

  async function remove(service) {
    if (!window.confirm(`¿Eliminar "${service.name}"? Si tiene reservas, se desactivará en su lugar.`)) return;
    try {
      await api.delete(`/services/admin/${service.id}`);
      toast.success('Servicio eliminado.');
      load();
    } catch (error) {
      // El backend desactiva en vez de borrar cuando hay reservas: eso
      // llega como 409 con un mensaje explicativo, no como un fallo.
      if (error instanceof ApiError && error.code === 'DEACTIVATED_INSTEAD') {
        toast.info(error.message, 9000);
        load();
      } else {
        toast.error(error.message);
      }
    }
  }

  async function toggleActive(service) {
    try {
      await api.patch(`/services/admin/${service.id}`, { active: !service.active });
      setServices((list) => list.map((s) => (s.id === service.id ? { ...s, active: !s.active } : s)));
    } catch (error) {
      toast.error(error.message);
    }
  }

  if (loading) return <LoadingBlock />;

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl">Servicios</h1>
          <p className="mt-1.5 text-sm text-ink-500">
            {services.length} en el catálogo · {services.filter((s) => s.active).length} visibles en la web.
          </p>
        </div>
        <Button onClick={() => setEditing({ ...EMPTY })}>Nuevo servicio</Button>
      </header>

      {services.length === 0 ? (
        <EmptyState
          title="Aún no hay servicios"
          description="Crea el primero para que la agenda en línea empiece a funcionar."
          action={<Button onClick={() => setEditing({ ...EMPTY })}>Crear servicio</Button>}
        />
      ) : (
        <ul className="space-y-3">
          {services.map((service) => (
            <li
              key={service.id}
              className={cx(
                'flex flex-wrap items-center gap-4 rounded-2xl border bg-surface p-4 shadow-soft',
                service.active ? 'border-line' : 'border-dashed border-line opacity-70',
              )}
            >
              {service.images?.[0] ? (
                <img
                  src={service.images[0].url}
                  alt=""
                  className="h-16 w-16 shrink-0 rounded-xl object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-blush text-brand-300">
                  <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" aria-hidden="true">
                    <path d="M12 3.5 14.4 9l5.6.5-4.3 3.9 1.3 5.6L12 16l-5 3 1.3-5.6L4 9.5 9.6 9z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                  </svg>
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-ink-800">{service.name}</p>
                  <Badge>{CATEGORY_LABEL[service.category]}</Badge>
                  {service.featured && <Badge tone="gold">Destacado</Badge>}
                  {!service.active && <Badge tone="outline">Oculto</Badge>}
                </div>
                <p className="mt-1 truncate text-sm text-ink-500">{service.shortDescription}</p>
                <p className="mt-0.5 text-xs text-ink-400">
                  {money(service.priceCents, service.currency)} · {duration(service.durationMinutes)} ·{' '}
                  {service.images?.length ?? 0} foto(s)
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={() => toggleActive(service)}>
                  {service.active ? 'Ocultar' : 'Publicar'}
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setEditing(service)}>
                  Editar
                </Button>
                <button
                  type="button"
                  onClick={() => remove(service)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-400 transition hover:bg-red-50 hover:text-red-700"
                  aria-label={`Eliminar ${service.name}`}
                >
                  <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden="true">
                    <path d="M3 4.5h10M6.5 4.5V3h3v1.5M5 4.5l.5 8h5l.5-8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <AnimatePresence>
        {editing && (
          <ServiceForm
            service={editing}
            occasions={occasions}
            onClose={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              load();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ServiceForm({ service, occasions, onClose, onSaved }) {
  const toast = useToast();
  const isNew = !service.id;

  const [form, setForm] = useState({
    ...service,
    // El formulario trabaja en pesos; el backend guarda centavos.
    price: (service.priceCents ?? 0) / 100,
    occasionIds: service.occasions?.map((o) => o.id) ?? service.occasionIds ?? [],
    images: service.images?.map(({ url, alt }) => ({ url, alt })) ?? [],
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const set = (key) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
  };

  const toggleOccasion = (id) =>
    setForm((f) => ({
      ...f,
      occasionIds: f.occasionIds.includes(id)
        ? f.occasionIds.filter((x) => x !== id)
        : [...f.occasionIds, id],
    }));

  const setImage = (index, key, value) =>
    setForm((f) => ({
      ...f,
      images: f.images.map((img, i) => (i === index ? { ...img, [key]: value } : img)),
    }));

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setErrors({});

    const payload = {
      name: form.name,
      category: form.category,
      shortDescription: form.shortDescription,
      description: form.description,
      durationMinutes: Number(form.durationMinutes),
      priceCents: Math.round(Number(form.price) * 100),
      currency: form.currency || 'COP',
      active: form.active,
      featured: form.featured,
      sortOrder: Number(form.sortOrder) || 0,
      images: form.images.filter((img) => img.url && img.alt),
      occasionIds: form.occasionIds,
    };

    try {
      if (isNew) await api.post('/services/admin', payload);
      else await api.patch(`/services/admin/${service.id}`, payload);

      toast.success(isNew ? 'Servicio creado.' : 'Servicio actualizado.');
      onSaved();
    } catch (error) {
      if (error instanceof ApiError && error.details?.length) {
        setErrors(error.fieldErrors);
        toast.error('Revisa los campos marcados.');
      } else {
        toast.error(error.message);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-scrim/35 backdrop-blur-sm"
        aria-hidden="true"
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={isNew ? 'Crear servicio' : `Editar ${service.name}`}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        className="fixed inset-x-0 bottom-0 top-8 z-50 mx-auto flex w-full max-w-2xl flex-col overflow-hidden rounded-t-[2rem] border border-line bg-surface shadow-lift sm:inset-6 sm:rounded-[2rem]"
      >
        <header className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
          <h2 className="font-display text-2xl text-ink-800">
            {isNew ? 'Nuevo servicio' : 'Editar servicio'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full text-ink-500 transition hover:bg-blush"
            aria-label="Cerrar"
          >
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden="true">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <form onSubmit={submit} noValidate className="flex-1 space-y-5 overflow-y-auto p-5">
          <Input label="Nombre" required value={form.name} onChange={set('name')} error={errors.name} maxLength={120} />

          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Categoría" required value={form.category} onChange={set('category')} error={errors.category}>
              <option value="MAQUILLAJE">Maquillaje</option>
              <option value="PEINADO">Peinado</option>
              <option value="PAQUETE">Paquete (maquillaje + peinado)</option>
            </Select>

            <Input
              label="Orden en el listado"
              type="number"
              min={0}
              max={999}
              value={form.sortOrder}
              onChange={set('sortOrder')}
              hint="Menor número, aparece antes."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Precio (pesos)"
              type="number"
              required
              min={0}
              step={1000}
              value={form.price}
              onChange={set('price')}
              error={errors.priceCents}
              hint={`Se mostrará como ${money(Math.round(Number(form.price || 0) * 100))}`}
            />
            <Input
              label="Duración (minutos)"
              type="number"
              required
              min={15}
              max={600}
              step={15}
              value={form.durationMinutes}
              onChange={set('durationMinutes')}
              error={errors.durationMinutes}
              hint={`Equivale a ${duration(Number(form.durationMinutes) || 0)}`}
            />
          </div>

          <Textarea
            label="Descripción corta"
            required
            rows={2}
            maxLength={240}
            value={form.shortDescription}
            onChange={set('shortDescription')}
            error={errors.shortDescription}
            hint="La frase que se ve en la tarjeta del catálogo."
          />

          <Textarea
            label="Descripción detallada"
            required
            rows={7}
            maxLength={4000}
            value={form.description}
            onChange={set('description')}
            error={errors.description}
            hint="Deja una línea en blanco entre párrafos."
          />

          {/* Galería */}
          <fieldset>
            <div className="mb-2 flex items-center justify-between">
              <legend className="label-base mb-0">Galería de fotos</legend>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, images: [...f.images, { url: '', alt: '' }] }))}
                disabled={form.images.length >= 12}
                className="text-xs font-medium text-brand-700 transition hover:underline disabled:text-ink-400"
              >
                + Añadir foto
              </button>
            </div>

            {form.images.length === 0 ? (
              <p className="rounded-xl border border-dashed border-line p-4 text-sm text-ink-400">
                Sin fotos todavía. Añade al menos una: el catálogo entra mucho mejor con imagen.
              </p>
            ) : (
              <ul className="space-y-3">
                {form.images.map((image, index) => (
                  <li key={index} className="rounded-xl border border-line p-3">
                    <div className="flex gap-3">
                      {image.url && (
                        <img
                          src={image.url}
                          alt=""
                          className="h-16 w-16 shrink-0 rounded-lg bg-blush object-cover"
                          onError={(e) => {
                            e.currentTarget.style.visibility = 'hidden';
                          }}
                        />
                      )}
                      <div className="min-w-0 flex-1 space-y-2">
                        <input
                          type="url"
                          value={image.url}
                          onChange={(e) => setImage(index, 'url', e.target.value)}
                          placeholder="https://… o /ruta-local.jpg"
                          aria-label={`URL de la foto ${index + 1}`}
                          className="input-base px-3 py-2 text-sm"
                        />
                        <input
                          type="text"
                          value={image.alt}
                          onChange={(e) => setImage(index, 'alt', e.target.value)}
                          placeholder="Descripción para accesibilidad (obligatoria)"
                          aria-label={`Texto alternativo de la foto ${index + 1}`}
                          maxLength={160}
                          className="input-base px-3 py-2 text-sm"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== index) }))}
                        className="h-8 w-8 shrink-0 rounded-lg text-ink-400 transition hover:bg-red-50 hover:text-red-700"
                        aria-label={`Quitar foto ${index + 1}`}
                      >
                        ✕
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p className="hint-text">
              El texto alternativo describe la imagen para quien usa lector de pantalla. Las fotos sin
              descripción no se guardan.
            </p>
          </fieldset>

          {/* Ocasiones */}
          <fieldset>
            <legend className="label-base">Ocasiones para las que aplica</legend>
            <div className="flex flex-wrap gap-2">
              {occasions.map((occasion) => {
                const active = form.occasionIds.includes(occasion.id);
                return (
                  <button
                    key={occasion.id}
                    type="button"
                    onClick={() => toggleOccasion(occasion.id)}
                    aria-pressed={active}
                    className={cx(
                      'min-h-[36px] rounded-full border px-3.5 text-xs font-medium transition',
                      active
                        ? 'border-brand-500 bg-brand-100 text-brand-800'
                        : 'border-line bg-surface text-ink-500 hover:border-brand-200',
                    )}
                  >
                    {occasion.name}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="flex flex-wrap gap-6 border-t border-line pt-5">
            <Checkbox label="Visible en la web" checked={form.active} onChange={set('active')} />
            <Checkbox label="Destacado en la portada" checked={form.featured} onChange={set('featured')} />
          </div>

          {Object.keys(errors).length > 0 && (
            <Alert tone="error">Hay campos con errores. Revísalos antes de guardar.</Alert>
          )}
        </form>

        <footer className="flex gap-3 border-t border-line bg-cream px-5 py-4">
          <Button variant="ghost" onClick={onClose} className="flex-1 sm:flex-none">
            Cancelar
          </Button>
          <Button onClick={submit} loading={saving} className="flex-1">
            {isNew ? 'Crear servicio' : 'Guardar cambios'}
          </Button>
        </footer>
      </motion.div>
    </>
  );
}

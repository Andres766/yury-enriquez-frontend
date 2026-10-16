import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { api, ApiError } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import { duration, priceLabel, seasonText, toDateISO, CATEGORY_LABEL, PRICE_MODE_LABEL } from '../../lib/format.js';
import { seasonIsOver } from '../../lib/catalog.js';
import IncludesEditor from '../../components/catalog/IncludesEditor.jsx';
import ServiceImagesEditor, { imageKey } from '../../components/admin/ServiceImagesEditor.jsx';
import { imageSources } from '../../lib/images.js';
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
  priceMode: 'FIXED',
  includes: [],
  maxAdvanceDays: null,
  availableFrom: null,
  availableUntil: null,
};

/** Qué ve la clienta con cada modo, para elegir sin adivinar. */
const PRICE_MODE_HELP = {
  FIXED: 'Se muestra el valor exacto y se reserva en línea. Para servicios de valor cerrado.',
  FROM: 'Se muestra «Desde $…». Para servicios que cambian según el caso (novias, paquetes).',
  QUOTE: 'No se muestra valor: el botón principal pasa a «Cotizar por WhatsApp» y el calendario queda de segundo.',
};

export default function ServicesAdmin() {
  const toast = useToast();
  const settings = useSettings();
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

  const today = toDateISO(new Date(), settings.timezone);

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
                  {...imageSources(service.images[0].url, { widths: [160, 320], fallback: 320 })}
                  sizes="4rem"
                  alt=""
                  style={{ objectPosition: service.images[0].focus || undefined }}
                  className="h-16 w-16 shrink-0 rounded-xl bg-blush object-cover"
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
                  {/* Una temporada vencida no se reserva aunque esté visible:
                      se avisa para que Yury cambie las fechas del año siguiente. */}
                  {seasonText(service) && (
                    <Badge tone={seasonIsOver(service, today) ? 'outline' : 'gold'} className="normal-case !tracking-normal">
                      {seasonText(service)}
                      {seasonIsOver(service, today) ? ' · ya pasó' : ''}
                    </Badge>
                  )}
                </div>
                <p className="mt-1 truncate text-sm text-ink-500">{service.shortDescription}</p>
                <p className="mt-0.5 text-xs text-ink-400">
                  {priceLabel(service).text} · {duration(service.durationMinutes)} ·{' '}
                  {service.images?.length ?? 0} foto(s)
                  {service.maxAdvanceDays ? ` · reserva hasta ${service.maxAdvanceDays} días` : ''}
                </p>
              </div>

              {/* En el celular los botones bajan a su propia fila: al lado
                  del texto lo dejaban en una columna de pocas letras. */}
              <div className="flex w-full items-center justify-end gap-2 border-t border-line pt-3 sm:w-auto sm:border-0 sm:pt-0">
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
  const settings = useSettings();
  const isNew = !service.id;

  const [form, setForm] = useState({
    ...service,
    // El formulario trabaja en pesos; el backend guarda centavos.
    price: (service.priceCents ?? 0) / 100,
    occasionIds: service.occasions?.map((o) => o.id) ?? service.occasionIds ?? [],
    // `key` solo vive en el panel (para reordenar sin confundir filas).
    images: service.images?.map(({ url, alt, focus }) => ({ key: imageKey(), url, alt: alt ?? '', focus: focus || '50% 50%' })) ?? [],
    priceMode: service.priceMode ?? 'FIXED',
    includes: service.includes ?? [],
    // El campo trabaja con texto: vacío = usar el límite general.
    maxAdvanceDays: service.maxAdvanceDays ?? '',
    // Igual las fechas de temporada: vacío = se reserva todo el año.
    availableFrom: service.availableFrom ?? '',
    availableUntil: service.availableUntil ?? '',
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

  /** Quita los errores de las fotos: al mover o quitar una, sus números cambian. */
  const clearImageErrors = () =>
    setErrors((e) => Object.fromEntries(Object.entries(e).filter(([key]) => !key.startsWith('images'))));

  async function submit(event) {
    event.preventDefault();

    // Antes se descartaban en silencio las fotos sin descripción; ahora se
    // marca cuál falta, para que Yury no pierda una foto sin darse cuenta.
    const missing = Object.fromEntries(
      form.images
        .map((img, i) => [`images.${i}.alt`, img.alt.trim() ? null : 'Escribe qué se ve en esta foto.'])
        .filter(([, message]) => message),
    );
    if (Object.keys(missing).length > 0) {
      setErrors(missing);
      toast.error('Hay fotos sin descripción. Escríbela para poder guardar.');
      const first = form.images.find((img) => !img.alt.trim());
      document.getElementById(`service-image-alt-${first.key}`)?.focus();
      return;
    }

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
      images: form.images.map(({ url, alt, focus }) => ({ url, alt: alt.trim(), focus: focus || '50% 50%' })),
      occasionIds: form.occasionIds,
      priceMode: form.priceMode,
      includes: form.includes,
      maxAdvanceDays: form.maxAdvanceDays === '' ? null : Number(form.maxAdvanceDays),
      availableFrom: form.availableFrom || null,
      availableUntil: form.availableUntil || null,
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
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-500 transition hover:bg-blush"
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
            <Select
              label="Categoría"
              required
              value={form.category}
              onChange={set('category')}
              error={errors.category}
              hint={form.category === 'TALLER' ? 'Los talleres salen en su propia sección «Talleres» de la carta.' : undefined}
            >
              <option value="MAQUILLAJE">Maquillaje</option>
              <option value="PEINADO">Peinado</option>
              <option value="PAQUETE">Paquete (maquillaje + peinado)</option>
              <option value="TALLER">Taller</option>
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
              hint={
                form.priceMode === 'QUOTE'
                  ? 'En modo cotizar no se muestra: queda como referencia para ti.'
                  : `Se mostrará como «${priceLabel({ priceMode: form.priceMode, priceCents: Math.round(Number(form.price || 0) * 100) }).text}»`
              }
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

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Cómo se muestra el precio"
              required
              value={form.priceMode}
              onChange={set('priceMode')}
              error={errors.priceMode}
              hint={PRICE_MODE_HELP[form.priceMode]}
            >
              {Object.entries(PRICE_MODE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>

            <Input
              label="Reservar en línea con hasta (días)"
              type="number"
              inputMode="numeric"
              min={1}
              max={730}
              value={form.maxAdvanceDays}
              onChange={set('maxAdvanceDays')}
              error={errors.maxAdvanceDays}
              placeholder={String(settings.maxAdvanceDays)}
              hint={`Vacío = lo general de Ajustes (${settings.maxAdvanceDays} días). Las novias suelen separar con 6 a 12 meses: 365 deja ver todo el año.`}
            />
          </div>

          <SeasonFields form={form} setForm={setForm} errors={errors} setErrors={setErrors} set={set} />

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

          <IncludesEditor
            label="Qué incluye"
            items={form.includes}
            onChange={(includes) => {
              setForm((f) => ({ ...f, includes }));
              setErrors((e) => (e.includes ? { ...e, includes: undefined } : e));
            }}
            error={errors.includes ?? Object.entries(errors).find(([k, v]) => k.startsWith('includes.') && v)?.[1]}
            placeholder="Ej.: Pestañas postizas"
            hint="Frases cortas, una por fila. Se ven como lista en la ficha y las dos primeras en la tarjeta. Pon solo lo que de verdad trae este servicio."
          />

          {/* Fotos: se eligen de la biblioteca (o se suben) en vez de pegar direcciones. */}
          <ServiceImagesEditor
            images={form.images}
            onChange={(images) => setForm((f) => ({ ...f, images }))}
            errors={errors}
            onClearError={clearImageErrors}
          />

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
            <p className="hint-text">
              Si el servicio es para Bodas (o solo para Quinceañeros), en su ficha el botón principal es «Separar mi
              fecha por WhatsApp» y el calendario queda de segundo, aunque el precio sea fijo.
            </p>
          </fieldset>

          <div className="flex flex-wrap gap-6 border-t border-line pt-5">
            <Checkbox label="Visible en la web" checked={form.active} onChange={set('active')} />
            <Checkbox label="Destacado en la portada" checked={form.featured} onChange={set('featured')} />
          </div>

          {Object.values(errors).some(Boolean) && (
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

/**
 * Temporada del servicio (catrinas: del 22 al 31 de octubre).
 *
 * Limita los días PARA los que se reserva, no cuándo se hace la
 * reserva: con fechas puestas, una clienta puede separar hoy su turno
 * del 30 de octubre. Las dos fechas son opcionales e inclusive; si
 * Hasta queda antes de Desde, el servidor lo rechaza y el error sale
 * en el campo.
 */
function SeasonFields({ form, setForm, errors, setErrors, set }) {
  const preview = seasonText({ availableFrom: form.availableFrom || null, availableUntil: form.availableUntil || null });
  const clear = () => {
    setForm((f) => ({ ...f, availableFrom: '', availableUntil: '' }));
    setErrors((e) => ({ ...e, availableFrom: undefined, availableUntil: undefined }));
  };

  return (
    <fieldset>
      <legend className="label-base">Temporada</legend>
      <p className="mb-3 text-xs leading-relaxed text-ink-500">
        Si lo dejas vacío, se reserva todo el año. Con fechas, solo se puede reservar para esos días, aunque la
        reserva se haga antes.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Desde"
          type="date"
          value={form.availableFrom}
          onChange={set('availableFrom')}
          error={errors.availableFrom}
        />
        <Input
          label="Hasta"
          type="date"
          min={form.availableFrom || undefined}
          value={form.availableUntil}
          onChange={set('availableUntil')}
          error={errors.availableUntil}
        />
      </div>
      {preview && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs leading-relaxed text-ink-500">En la web se verá «{preview}».</p>
          <button
            type="button"
            onClick={clear}
            className="min-h-[44px] text-xs font-medium text-brand-700 transition hover:underline"
          >
            Quitar temporada
          </button>
        </div>
      )}
    </fieldset>
  );
}

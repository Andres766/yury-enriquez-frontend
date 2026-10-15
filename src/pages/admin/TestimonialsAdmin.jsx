import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { api, ApiError } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import {
  Button, Input, Textarea, Select, Checkbox, Badge, Alert, LoadingBlock, EmptyState, cx,
} from '../../components/ui/index.jsx';

/**
 * Testimonios de clientas.
 *
 * Todo testimonio nace oculto y solo sale a la web cuando se publica a
 * mano. La regla es sencilla y se repite en la pantalla: opiniones
 * reales, con el permiso de la clienta. Nada de inventarlas ni de
 * "mejorarlas".
 */

const QUOTE_MAX = 800;

const EMPTY = {
  name: '',
  occasionLabel: '',
  quote: '',
  rating: '',
  photoUrl: '',
  published: false,
};

export default function TestimonialsAdmin() {
  const toast = useToast();
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [announcement, setAnnouncement] = useState('');
  // Si la lista no carga hay que decirlo: mostrar «Todavía no hay
  // testimonios» haría creer que se borraron.
  const [loadError, setLoadError] = useState(null);

  const load = () =>
    api
      .get('/testimonials/admin/all')
      .then((d) => {
        setTestimonials(d.testimonials ?? []);
        setLoadError(null);
      })
      .catch((error) => setLoadError(error.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  async function remove(testimonial) {
    if (!window.confirm(`¿Eliminar el testimonio de ${testimonial.name}? No se puede deshacer.`)) return;
    try {
      await api.delete(`/testimonials/admin/${testimonial.id}`);
      toast.success('Testimonio eliminado.');
      load();
    } catch (error) {
      toast.error(error.message);
    }
  }

  async function togglePublished(testimonial) {
    // Publicar es el paso que importa: se pregunta por el permiso justo ahí.
    if (
      !testimonial.published &&
      !window.confirm(`¿${testimonial.name} te dio permiso para publicar su opinión en la web?`)
    ) {
      return;
    }
    try {
      await api.patch(`/testimonials/admin/${testimonial.id}`, { published: !testimonial.published });
      setTestimonials((list) =>
        list.map((t) => (t.id === testimonial.id ? { ...t, published: !t.published } : t)),
      );
      toast.success(testimonial.published ? 'Testimonio oculto de la web.' : 'Testimonio publicado.');
    } catch (error) {
      toast.error(error.message);
    }
  }

  /*
   * El cambio de orden se pinta al instante y se guarda enviando la
   * lista completa. Si el servidor lo rechaza, se vuelve a la anterior.
   */
  async function move(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= testimonials.length) return;

    const previous = testimonials;
    const next = [...testimonials];
    [next[index], next[target]] = [next[target], next[index]];
    setTestimonials(next);
    setAnnouncement(`${next[target].name} quedó en la posición ${target + 1} de ${next.length}.`);

    try {
      await api.put('/testimonials/admin/order', { ids: next.map((t) => t.id) });
    } catch (error) {
      setTestimonials(previous);
      toast.error(error.message);
    }
  }

  if (loading) return <LoadingBlock />;

  const publishedCount = testimonials.filter((t) => t.published).length;

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl">Testimonios</h1>
          <p className="mt-1.5 text-sm text-ink-500">
            {publishedCount} publicados de {testimonials.length} en total.
          </p>
        </div>
        <Button onClick={() => setEditing({ ...EMPTY })}>Nuevo testimonio</Button>
      </header>

      <Alert tone="info" title="Solo opiniones reales y con permiso" className="mb-6">
        Escribe lo que de verdad te dijo la clienta (por WhatsApp, en persona o en una reseña) y publícalo
        solo si ella aceptó que salga en la web con su nombre. Si prefiere no aparecer, usa solo su
        primer nombre o no lo publiques. Los testimonios nuevos quedan ocultos hasta que los publiques.
      </Alert>

      {/* Anuncia los cambios de orden a quien usa lector de pantalla. */}
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>

      {loadError ? (
        <Alert tone="error" title="No se pudieron cargar los testimonios">
          {loadError}{' '}
          <button type="button" onClick={load} className="font-medium underline underline-offset-2">
            Reintentar
          </button>
        </Alert>
      ) : testimonials.length === 0 ? (
        <EmptyState
          title="Todavía no hay testimonios"
          description="Cuando una clienta te comparta su opinión y te dé permiso, agrégala aquí."
          action={<Button onClick={() => setEditing({ ...EMPTY })}>Agregar testimonio</Button>}
        />
      ) : (
        <ol className="space-y-3">
          {testimonials.map((testimonial, index) => (
            <li
              key={testimonial.id}
              className={cx(
                'rounded-2xl border bg-surface p-5 shadow-soft',
                testimonial.published ? 'border-line' : 'border-dashed border-line',
              )}
            >
              <div className="flex gap-4">
                {testimonial.photoUrl && (
                  <img
                    src={testimonial.photoUrl}
                    alt=""
                    loading="lazy"
                    className="h-14 w-14 shrink-0 rounded-full border border-line object-cover"
                  />
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {testimonial.published ? <Badge>Publicado</Badge> : <Badge tone="outline">Oculto</Badge>}
                    {testimonial.rating && <Stars value={testimonial.rating} />}
                  </div>

                  <blockquote className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-700">
                    “{testimonial.quote}”
                  </blockquote>

                  <p className="mt-2 text-sm font-medium text-ink-800">
                    {testimonial.name}
                    {testimonial.occasionLabel && (
                      <span className="font-normal text-ink-500"> · {testimonial.occasionLabel}</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
                <OrderButton
                  direction="up"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  label={`Subir el testimonio de ${testimonial.name}`}
                />
                <OrderButton
                  direction="down"
                  disabled={index === testimonials.length - 1}
                  onClick={() => move(index, 1)}
                  label={`Bajar el testimonio de ${testimonial.name}`}
                />

                <Button size="sm" variant="ghost" onClick={() => togglePublished(testimonial)}>
                  {testimonial.published ? 'Ocultar' : 'Publicar'}
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setEditing(testimonial)}>
                  Editar
                </Button>
                <button
                  type="button"
                  onClick={() => remove(testimonial)}
                  className="ml-auto min-h-[44px] rounded-lg px-3 text-xs font-medium text-red-700 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                >
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}

      <AnimatePresence>
        {editing && (
          <TestimonialForm
            testimonial={editing}
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

function Stars({ value }) {
  return (
    <span className="text-sm tracking-wide text-gold-600" role="img" aria-label={`${value} de 5 estrellas`}>
      {'★'.repeat(value)}
      <span className="text-line">{'★'.repeat(5 - value)}</span>
    </span>
  );
}

function OrderButton({ direction, disabled, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={direction === 'up' ? 'Subir' : 'Bajar'}
      className="flex h-11 w-11 items-center justify-center rounded-xl border border-line text-ink-600 transition hover:bg-blush hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
    >
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
        <path
          d={direction === 'up' ? 'M10 15V5m0 0-4.5 4.5M10 5l4.5 4.5' : 'M10 5v10m0 0-4.5-4.5M10 15l4.5-4.5'}
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

function TestimonialForm({ testimonial, onClose, onSaved }) {
  const toast = useToast();
  const isNew = !testimonial.id;

  const [form, setForm] = useState({
    name: testimonial.name ?? '',
    occasionLabel: testimonial.occasionLabel ?? '',
    quote: testimonial.quote ?? '',
    rating: testimonial.rating ? String(testimonial.rating) : '',
    photoUrl: testimonial.photoUrl ?? '',
    published: Boolean(testimonial.published),
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const set = (key) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
  };

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setErrors({});

    const payload = {
      name: form.name,
      occasionLabel: form.occasionLabel,
      quote: form.quote,
      rating: form.rating ? Number(form.rating) : null,
      photoUrl: form.photoUrl.trim(),
      published: form.published,
    };

    try {
      if (isNew) await api.post('/testimonials/admin', payload);
      else await api.patch(`/testimonials/admin/${testimonial.id}`, payload);

      toast.success(isNew ? 'Testimonio guardado.' : 'Testimonio actualizado.');
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

  const quoteLength = form.quote.trim().length;

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

      {/*
        El centrado lo hace este contenedor y no un -translate-y-1/2:
        framer-motion escribe su propio `transform` en línea al animar `y`
        y lo pisaría, dejando el modal con la mitad fuera de la pantalla
        (y el botón Guardar inalcanzable en el celular).
      */}
      <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={isNew ? 'Nuevo testimonio' : 'Editar testimonio'}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          className="pointer-events-auto max-h-[88vh] w-full max-w-xl overflow-y-auto rounded-[2rem] border border-line bg-surface p-6 shadow-lift"
        >
          <h2 className="mb-5 font-display text-2xl text-ink-800">
            {isNew ? 'Nuevo testimonio' : 'Editar testimonio'}
          </h2>

          <form onSubmit={submit} noValidate className="space-y-5">
            <Input
              label="Nombre de la clienta"
              required
              value={form.name}
              onChange={set('name')}
              error={errors.name}
              maxLength={80}
              hint="Como ella quiera aparecer: nombre completo, solo el nombre o con la inicial del apellido."
            />

            <Input
              label="Ocasión"
              value={form.occasionLabel}
              onChange={set('occasionLabel')}
              error={errors.occasionLabel}
              maxLength={80}
              placeholder="Novia · marzo 2026"
            />

            <Textarea
              label="Lo que dijo"
              required
              rows={5}
              maxLength={QUOTE_MAX}
              value={form.quote}
              onChange={set('quote')}
              error={errors.quote}
              hint={`Con sus palabras. Entre 10 y ${QUOTE_MAX} caracteres (${quoteLength}/${QUOTE_MAX}).`}
            />

            <Select label="Calificación" value={form.rating} onChange={set('rating')} error={errors.rating}>
              <option value="">Sin calificación</option>
              <option value="5">5 estrellas</option>
              <option value="4">4 estrellas</option>
              <option value="3">3 estrellas</option>
              <option value="2">2 estrellas</option>
              <option value="1">1 estrella</option>
            </Select>

            <Input
              label="Foto"
              value={form.photoUrl}
              onChange={set('photoUrl')}
              error={errors.photoUrl}
              placeholder="/img/trabajos/… o https://…"
              hint="Una foto de ella, solo si también aceptó que se publique."
            />

            <div className="border-t border-line pt-5">
              <Checkbox
                label="Publicar en la web"
                description="Márcalo solo si la clienta te dio permiso para mostrar su opinión."
                checked={form.published}
                onChange={set('published')}
              />
            </div>

            <div className="flex gap-3 border-t border-line pt-5">
              <Button type="button" variant="ghost" onClick={onClose} className="flex-1 sm:flex-none">
                Cancelar
              </Button>
              <Button type="submit" loading={saving} className="flex-1">
                {isNew ? 'Guardar' : 'Guardar cambios'}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </>
  );
}

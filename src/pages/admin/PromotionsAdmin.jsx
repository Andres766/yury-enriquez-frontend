import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { api, ApiError } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { money, shortDate } from '../../lib/format.js';
import {
  Button, Input, Textarea, Select, Checkbox, Badge, LoadingBlock, EmptyState, cx,
} from '../../components/ui/index.jsx';

const todayISO = () => new Date().toISOString().slice(0, 10);
const inDaysISO = (days) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

const EMPTY = {
  title: '',
  description: '',
  code: '',
  discountType: 'PERCENT',
  discountValue: 10,
  image: '',
  startsAt: todayISO(),
  endsAt: inDaysISO(30),
  active: true,
  membersOnly: false,
};

export default function PromotionsAdmin() {
  const toast = useToast();
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

  const load = () =>
    api
      .get('/promotions/admin/all')
      .then((d) => setPromotions(d.promotions ?? []))
      .catch(() => setPromotions([]))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  async function remove(promotion) {
    if (!window.confirm(`¿Eliminar la promoción "${promotion.title}"?`)) return;
    try {
      await api.delete(`/promotions/admin/${promotion.id}`);
      toast.success('Promoción eliminada.');
      load();
    } catch (error) {
      toast.error(error.message);
    }
  }

  async function toggleActive(promotion) {
    try {
      await api.patch(`/promotions/admin/${promotion.id}`, { active: !promotion.active });
      setPromotions((list) =>
        list.map((p) => (p.id === promotion.id ? { ...p, active: !p.active } : p)),
      );
    } catch (error) {
      toast.error(error.message);
    }
  }

  if (loading) return <LoadingBlock />;

  const now = new Date();
  const isLive = (p) => p.active && new Date(p.startsAt) <= now && new Date(p.endsAt) >= now;

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl">Promociones</h1>
          <p className="mt-1.5 text-sm text-ink-500">
            {promotions.filter(isLive).length} vigentes de {promotions.length} en total.
          </p>
        </div>
        <Button onClick={() => setEditing({ ...EMPTY })}>Nueva promoción</Button>
      </header>

      {promotions.length === 0 ? (
        <EmptyState
          title="Sin promociones"
          description="Crea una para que aparezca en la portada de la web."
          action={<Button onClick={() => setEditing({ ...EMPTY })}>Crear promoción</Button>}
        />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {promotions.map((promotion) => (
            <li
              key={promotion.id}
              className={cx(
                'flex flex-col rounded-2xl border bg-surface p-5 shadow-soft',
                isLive(promotion) ? 'border-line' : 'border-dashed border-line opacity-70',
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex flex-wrap gap-2">
                  <Badge tone="gold">
                    {promotion.discountType === 'PERCENT'
                      ? `${promotion.discountValue}%`
                      : money(promotion.discountValue)}
                  </Badge>
                  {promotion.membersOnly && <Badge tone="dark">Registradas</Badge>}
                  {isLive(promotion) ? (
                    <Badge>Vigente</Badge>
                  ) : (
                    <Badge tone="outline">{promotion.active ? 'Fuera de fecha' : 'Inactiva'}</Badge>
                  )}
                </div>
                {promotion.code && (
                  <span className="rounded-lg border border-dashed border-brand-300 bg-brand-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-brand-800">
                    {promotion.code}
                  </span>
                )}
              </div>

              <h2 className="mt-3 font-display text-xl leading-snug text-ink-800">{promotion.title}</h2>
              <p className="mt-1.5 flex-1 text-sm leading-relaxed text-ink-500 line-clamp-3">
                {promotion.description}
              </p>

              <p className="mt-3 text-xs text-ink-400">
                {shortDate(promotion.startsAt)} — {shortDate(promotion.endsAt)}
              </p>

              <div className="mt-4 flex gap-2 border-t border-line pt-4">
                <Button size="sm" variant="ghost" onClick={() => toggleActive(promotion)}>
                  {promotion.active ? 'Desactivar' : 'Activar'}
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setEditing(promotion)}>
                  Editar
                </Button>
                <button
                  type="button"
                  onClick={() => remove(promotion)}
                  className="ml-auto rounded-lg px-2.5 text-xs font-medium text-red-700 transition hover:bg-red-50"
                >
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <AnimatePresence>
        {editing && (
          <PromotionForm
            promotion={editing}
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

function PromotionForm({ promotion, onClose, onSaved }) {
  const toast = useToast();
  const isNew = !promotion.id;

  const [form, setForm] = useState({
    ...promotion,
    code: promotion.code ?? '',
    image: promotion.image ?? '',
    startsAt: String(promotion.startsAt).slice(0, 10),
    endsAt: String(promotion.endsAt).slice(0, 10),
    discountValue:
      promotion.discountType === 'AMOUNT' ? (promotion.discountValue ?? 0) / 100 : promotion.discountValue,
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
      title: form.title,
      description: form.description,
      code: form.code || '',
      discountType: form.discountType,
      discountValue:
        form.discountType === 'AMOUNT'
          ? Math.round(Number(form.discountValue) * 100)
          : Number(form.discountValue),
      image: form.image || '',
      startsAt: new Date(`${form.startsAt}T00:00:00`).toISOString(),
      endsAt: new Date(`${form.endsAt}T23:59:59`).toISOString(),
      active: form.active,
      membersOnly: form.membersOnly,
    };

    try {
      if (isNew) await api.post('/promotions/admin', payload);
      else await api.patch(`/promotions/admin/${promotion.id}`, payload);

      toast.success(isNew ? 'Promoción creada.' : 'Promoción actualizada.');
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

      {/*
        Centrado con un contenedor flex y no con -translate-y-1/2: framer-motion
        escribe su propio transform al animar `y` y anulaba el centrado, dejando
        el modal medio fuera de la pantalla (y Guardar inalcanzable en el celular).
      */}
      <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={isNew ? 'Crear promoción' : 'Editar promoción'}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          className="pointer-events-auto max-h-[88vh] w-full max-w-xl overflow-y-auto rounded-[2rem] border border-line bg-surface p-6 shadow-lift"
        >
          <h2 className="mb-5 font-display text-2xl text-ink-800">
            {isNew ? 'Nueva promoción' : 'Editar promoción'}
          </h2>

          <form onSubmit={submit} noValidate className="space-y-5">
            <Input label="Título" required value={form.title} onChange={set('title')} error={errors.title} maxLength={120} />

            <Textarea
              label="Descripción"
              required
              rows={3}
              maxLength={1000}
              value={form.description}
              onChange={set('description')}
              error={errors.description}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Select label="Tipo de descuento" value={form.discountType} onChange={set('discountType')}>
                <option value="PERCENT">Porcentaje</option>
                <option value="AMOUNT">Monto fijo</option>
              </Select>

              <Input
                label={form.discountType === 'PERCENT' ? 'Porcentaje (%)' : 'Monto (pesos)'}
                type="number"
                required
                min={0}
                max={form.discountType === 'PERCENT' ? 100 : undefined}
                value={form.discountValue}
                onChange={set('discountValue')}
                error={errors.discountValue}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Empieza" type="date" required value={form.startsAt} onChange={set('startsAt')} error={errors.startsAt} />
              <Input label="Termina" type="date" required value={form.endsAt} onChange={set('endsAt')} error={errors.endsAt} />
            </div>

            <Input
              label="Código promocional"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
              error={errors.code}
              placeholder="GRADOS15"
              maxLength={24}
              hint="Opcional. Solo letras, números y guiones."
            />

            <Input
              label="Imagen"
              type="url"
              value={form.image}
              onChange={set('image')}
              error={errors.image}
              placeholder="https://…"
            />

            <div className="flex flex-wrap gap-6 border-t border-line pt-5">
              <Checkbox label="Activa" checked={form.active} onChange={set('active')} />
              <Checkbox
                label="Solo para clientas registradas"
                description="No se muestra a quien no tiene sesión iniciada."
                checked={form.membersOnly}
                onChange={set('membersOnly')}
              />
            </div>

            <div className="flex gap-3 border-t border-line pt-5">
              <Button type="button" variant="ghost" onClick={onClose} className="flex-1 sm:flex-none">
                Cancelar
              </Button>
              <Button type="submit" loading={saving} className="flex-1">
                {isNew ? 'Crear' : 'Guardar'}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </>
  );
}

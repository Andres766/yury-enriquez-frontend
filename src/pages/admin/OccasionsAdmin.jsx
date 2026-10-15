import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { api, ApiError } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { photoProps } from '../../lib/catalog.js';
import IncludesEditor from '../../components/catalog/IncludesEditor.jsx';
import PortfolioPicker from '../../components/catalog/PortfolioPicker.jsx';
import {
  Button, Input, Textarea, Checkbox, Badge, LoadingBlock, EmptyState, Alert, cx,
} from '../../components/ui/index.jsx';

/**
 * Ocasiones (bodas, quinceañeros, grados…).
 *
 * Aquí Yury cambia lo que se ve en /ocasiones/<nombre>: la frase, el
 * texto, la lista de "Lo que cuidamos" y la foto de portada. Qué
 * servicios salen en cada ocasión se decide desde la ficha de cada
 * servicio, para no tener la misma relación en dos sitios.
 *
 * No se crean ni se borran ocasiones desde aquí: la dirección (slug) de
 * cada una ya circula en enlaces de Instagram y WhatsApp, y borrarla los
 * rompería. Para dejar de mostrar una, se oculta.
 */
export default function OccasionsAdmin() {
  const toast = useToast();
  const [occasions, setOccasions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = () =>
    api
      .get('/occasions/admin/all')
      .then((d) => {
        setOccasions(d.occasions ?? []);
        setFailed(false);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  async function toggleActive(occasion) {
    try {
      await api.patch(`/occasions/admin/${occasion.id}`, { active: !occasion.active });
      setOccasions((list) => list.map((o) => (o.id === occasion.id ? { ...o, active: !o.active } : o)));
    } catch (error) {
      toast.error(error.message);
    }
  }

  if (loading) return <LoadingBlock />;

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-3xl">Ocasiones</h1>
        <p className="mt-1.5 text-sm text-ink-500">
          {occasions.length} en total · {occasions.filter((o) => o.active).length} visibles en la web. Los
          servicios de cada una se eligen en{' '}
          <Link to="/admin/servicios" className="font-medium text-brand-700 underline-offset-4 hover:underline">
            Servicios
          </Link>
          .
        </p>
      </header>

      {failed ? (
        <Alert tone="error">No pudimos cargar las ocasiones. Revisa la conexión y recarga la página.</Alert>
      ) : occasions.length === 0 ? (
        <EmptyState title="Aún no hay ocasiones" description="Las ocasiones se crean con los datos iniciales del sitio." />
      ) : (
        <ul className="space-y-3">
          {occasions.map((occasion) => (
            <li
              key={occasion.id}
              className={cx(
                'flex flex-wrap items-center gap-4 rounded-2xl border bg-surface p-4 shadow-soft',
                occasion.active ? 'border-line' : 'border-dashed border-line opacity-70',
              )}
            >
              {occasion.heroImage ? (
                <img
                  {...photoProps(occasion.heroImage, '4rem')}
                  alt=""
                  className="h-20 w-16 shrink-0 rounded-xl bg-blush object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-20 w-16 shrink-0 items-center justify-center rounded-xl bg-blush text-center text-[10px] leading-tight text-ink-400">
                  Sin foto
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-ink-800">{occasion.name}</p>
                  {!occasion.active && <Badge tone="outline">Oculta</Badge>}
                </div>
                <p className="mt-1 truncate text-sm text-ink-500">{occasion.tagline}</p>
                <p className="mt-0.5 text-xs text-ink-400">
                  {occasion.services?.length
                    ? occasion.services.map((s) => (s.active ? s.name : `${s.name} (oculto)`)).join(' · ')
                    : 'Sin servicios: asígnale alguno desde Servicios'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {occasion.active && (
                  <Button
                    size="sm"
                    variant="ghost"
                    href={`/ocasiones/${occasion.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Ver ${occasion.name} en la web (se abre en una pestaña nueva)`}
                  >
                    Ver
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => toggleActive(occasion)}>
                  {occasion.active ? 'Ocultar' : 'Publicar'}
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setEditing(occasion)}>
                  Editar
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <AnimatePresence>
        {editing && (
          <OccasionForm
            occasion={editing}
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

function OccasionForm({ occasion, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({
    name: occasion.name ?? '',
    tagline: occasion.tagline ?? '',
    description: occasion.description ?? '',
    includes: occasion.includes ?? [],
    heroImage: occasion.heroImage ?? '',
    sortOrder: occasion.sortOrder ?? 0,
    active: occasion.active ?? true,
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [previewBroken, setPreviewBroken] = useState(false);

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
    if (key === 'heroImage') setPreviewBroken(false);
  };

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setErrors({});

    const payload = {
      name: form.name,
      tagline: form.tagline,
      description: form.description,
      includes: form.includes,
      heroImage: form.heroImage.trim(),
      sortOrder: Number(form.sortOrder) || 0,
      active: form.active,
    };

    try {
      await api.patch(`/occasions/admin/${occasion.id}`, payload);
      toast.success('Ocasión actualizada.');
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

  const includesError =
    errors.includes ?? Object.entries(errors).find(([key, value]) => key.startsWith('includes.') && value)?.[1];

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
        aria-label={`Editar ${occasion.name}`}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        className="fixed inset-x-0 bottom-0 top-8 z-50 mx-auto flex w-full max-w-2xl flex-col overflow-hidden rounded-t-[2rem] border border-line bg-surface shadow-lift sm:inset-6 sm:rounded-[2rem]"
      >
        <header className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 className="font-display text-2xl text-ink-800">Editar ocasión</h2>
            <p className="truncate text-xs text-ink-400">Dirección: /ocasiones/{occasion.slug}</p>
          </div>
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
          <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
            <Input label="Nombre" required value={form.name} onChange={set('name')} error={errors.name} maxLength={80} />
            <Input
              label="Orden"
              type="number"
              min={0}
              max={999}
              value={form.sortOrder}
              onChange={set('sortOrder')}
              error={errors.sortOrder}
              hint="Menor número, aparece antes."
            />
          </div>

          <Input
            label="Frase corta"
            required
            value={form.tagline}
            onChange={set('tagline')}
            error={errors.tagline}
            maxLength={160}
            hint="Va debajo del nombre, en la portada y en la ficha de la ocasión."
          />

          <Textarea
            label="Descripción"
            required
            rows={6}
            maxLength={2000}
            value={form.description}
            onChange={set('description')}
            error={errors.description}
            hint="Sale en «Cómo trabajamos este tipo de evento». Deja una línea en blanco entre párrafos."
          />

          <IncludesEditor
            label="Lo que cuidamos"
            items={form.includes}
            onChange={(includes) => {
              setForm((f) => ({ ...f, includes }));
              setErrors((e) => (e.includes ? { ...e, includes: undefined } : e));
            }}
            error={includesError}
            maxLength={200}
            placeholder="Ej.: Productos de larga duración"
            hint="Solo lo que vale para TODOS los servicios de esta ocasión. Lo que trae un servicio en particular (pruebas, descuentos, retoques) va en «Qué incluye» de ese servicio."
          />

          {/* Portada */}
          <fieldset>
            <legend className="label-base">
              Foto de portada <span className="ml-1 text-xs font-normal text-ink-400">(opcional)</span>
            </legend>
            <div className="flex gap-3">
              {form.heroImage && !previewBroken ? (
                <img
                  {...photoProps(form.heroImage, '5rem')}
                  alt=""
                  onError={() => setPreviewBroken(true)}
                  className="h-24 w-20 shrink-0 rounded-lg bg-blush object-cover"
                />
              ) : (
                <div className="flex h-24 w-20 shrink-0 items-center justify-center rounded-lg bg-blush px-1 text-center text-[10px] leading-tight text-ink-400">
                  {form.heroImage ? 'No se pudo cargar' : 'Sin foto'}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <Input
                  label="Dirección de la foto"
                  type="text"
                  inputMode="url"
                  value={form.heroImage}
                  onChange={set('heroImage')}
                  error={errors.heroImage}
                  placeholder="/img/trabajos/… o https://…"
                  hint="Elígela de tus trabajos o pega una dirección. Va en vertical (4:5)."
                />
              </div>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-4">
              <PortfolioPicker
                selected={form.heroImage ? [form.heroImage] : []}
                onPick={({ url }) => {
                  setForm((f) => ({ ...f, heroImage: f.heroImage === url ? '' : url }));
                  setErrors((e) => (e.heroImage ? { ...e, heroImage: undefined } : e));
                  setPreviewBroken(false);
                }}
              />
              {form.heroImage && (
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, heroImage: '' }))}
                  className="min-h-[44px] text-xs font-medium text-ink-500 transition hover:text-red-700"
                >
                  Quitar foto
                </button>
              )}
            </div>
          </fieldset>

          <div className="border-t border-line pt-5">
            <Checkbox
              label="Visible en la web"
              description="Si la ocultas, su página deja de verse en la web y sale de la portada."
              checked={form.active}
              onChange={set('active')}
            />
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
            Guardar cambios
          </Button>
        </footer>
      </motion.div>
    </>
  );
}

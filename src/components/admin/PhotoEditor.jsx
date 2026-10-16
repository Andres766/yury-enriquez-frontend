import { useEffect, useState } from 'react';
import { api, ApiError } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Alert, Button, Checkbox, Input, Select, Textarea } from '../ui/index.jsx';
import FocusPicker from './FocusPicker.jsx';
import Sheet from './Sheet.jsx';
import { DEFAULT_FOCUS, PHOTO_CATEGORIES, invalidatePhotoLibrary, usedByLabel } from './photoLibrary.js';

/**
 * Editar una foto de la biblioteca: descripción, categoría, dónde sale,
 * crédito y punto de enfoque. Se abre como hoja desde abajo en el
 * celular, que es donde Yury lo va a usar.
 */

const toForm = (photo) => ({
  alt: photo.alt ?? '',
  category: photo.category ?? '',
  inGallery: photo.inGallery ?? true,
  featured: photo.featured ?? false,
  minor: photo.minor ?? false,
  credit: photo.credit ?? '',
  focus: photo.focus || DEFAULT_FOCUS,
});

export default function PhotoEditor({ photo, open, onClose, onSaved, onDelete }) {
  const toast = useToast();
  const [form, setForm] = useState(() => (photo ? toForm(photo) : null));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Cada vez que se abre otra foto, el formulario arranca con sus datos.
  useEffect(() => {
    if (photo) {
      setForm(toForm(photo));
      setErrors({});
    }
  }, [photo?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (key) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
  };

  async function submit(event) {
    event?.preventDefault();
    if (!photo || photo.offline) return;
    setSaving(true);
    setErrors({});
    try {
      const { photo: saved } = await api.patch(`/photos/admin/${photo.id}`, {
        alt: form.alt.trim(),
        category: form.category || null,
        inGallery: form.inGallery,
        featured: form.featured,
        minor: form.minor,
        credit: form.credit.trim() || null,
        focus: form.focus,
      });
      invalidatePhotoLibrary();
      toast.success('Foto guardada.');
      onSaved?.({ ...photo, ...saved });
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

  const usedBy = photo?.usedBy ?? [];

  return (
    <Sheet
      open={open && Boolean(photo && form)}
      onClose={onClose}
      title="Editar foto"
      description={photo?.offline ? 'Sin conexión: solo puedes mirarla.' : undefined}
      footer={
        photo && (
          <>
            {onDelete && !photo.offline && (
              <Button type="button" variant="ghost" onClick={() => onDelete(photo)} className="text-red-700 hover:bg-red-50 hover:text-red-800">
                Borrar foto
              </Button>
            )}
            <div className="ml-auto flex flex-1 gap-3 sm:flex-none">
              <Button type="button" variant="secondary" onClick={onClose} className="flex-1 sm:flex-none">
                Cancelar
              </Button>
              <Button type="submit" form="photo-editor-form" loading={saving} disabled={photo.offline} className="flex-1 sm:flex-none">
                Guardar
              </Button>
            </div>
          </>
        )
      }
    >
      {photo && form && (
        <form id="photo-editor-form" onSubmit={submit} noValidate className="space-y-6">
          <section aria-labelledby="focus-title">
            <h3 id="focus-title" className="label-base">
              Encuadre
            </h3>
            <FocusPicker url={photo.url} focus={form.focus} onChange={(focus) => setForm((f) => ({ ...f, focus }))} />
            {errors.focus && <p className="error-text" role="alert">{errors.focus}</p>}
          </section>

          <Textarea
            label="¿Qué se ve en la foto?"
            rows={3}
            maxLength={200}
            value={form.alt}
            onChange={set('alt')}
            error={errors.alt}
            placeholder="Ej.: Novia con recogido bajo y maquillaje en tonos tierra"
            hint={`Una frase corta. La leen en voz alta los celulares de las personas ciegas y ayuda a que Google muestre tus trabajos. ${form.alt.length}/200`}
          />

          <Select label="Categoría" value={form.category} onChange={set('category')} error={errors.category}>
            <option value="">Sin categoría</option>
            {PHOTO_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>

          <div className="space-y-4 rounded-2xl border border-line p-4">
            <Checkbox
              label="Sale en Mi trabajo"
              description="Si la apagas, no se ve en la galería, pero puedes seguir usándola en servicios y ocasiones."
              checked={form.inGallery}
              onChange={set('inGallery')}
            />
            <Checkbox
              label="Destacada en el inicio"
              description="Las destacadas salen primero entre los trabajos de la página principal."
              checked={form.featured}
              onChange={set('featured')}
            />
            <Checkbox
              label="Sale una persona menor de edad"
              description="Niñas, niños o quinceañeras."
              checked={form.minor}
              onChange={set('minor')}
            />
            {form.minor && (
              <Alert tone="warning">
                Antes de publicarla necesitas la autorización por escrito de la mamá, el papá o el acudiente (Ley
                1581 de 2012). Si todavía no la tienes, apaga «Sale en Mi trabajo».
              </Alert>
            )}
          </div>

          <Input
            label="Crédito de la foto"
            maxLength={120}
            value={form.credit}
            onChange={set('credit')}
            error={errors.credit}
            placeholder="Ej.: Foto: Silvio Maya Fotografía"
            hint="Si la tomó un fotógrafo, su nombre se muestra junto a la foto."
          />

          {usedBy.length > 0 && (
            <div>
              <p className="label-base">Dónde más se usa</p>
              <ul className="space-y-1 text-sm text-ink-600">
                {usedBy.map((use, i) => (
                  <li key={`${use.type}-${use.id ?? i}`}>· {usedByLabel(use)}</li>
                ))}
              </ul>
              <p className="hint-text">El encuadre y la descripción de aquí valen para «Mi trabajo»; en cada servicio se ajustan aparte.</p>
            </div>
          )}

          {Object.values(errors).some(Boolean) && (
            <Alert tone="error">Hay campos con errores. Revísalos antes de guardar.</Alert>
          )}
        </form>
      )}
    </Sheet>
  );
}

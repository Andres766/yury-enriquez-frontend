import { useEffect, useMemo, useState } from 'react';
import { getMediaConfig } from '../../lib/cloudinary.js';
import { imageSources } from '../../lib/images.js';
import { Alert, Badge, Button, Checkbox, LoadingBlock, cx } from '../ui/index.jsx';
import Sheet from './Sheet.jsx';
import { UploadDropzone, UploadList, useUploads } from './PhotoUploader.jsx';
import { DEFAULT_FOCUS, PHOTO_FILTERS, filterPhotos, invalidatePhotoLibrary, loadPhotoLibrary } from './photoLibrary.js';

/**
 * Selector de fotos del panel.
 *
 * Reemplaza a pegar direcciones a mano: Yury elige de su biblioteca (la
 * misma de Panel → Fotos) o sube una nueva ahí mismo, sin salir del
 * formulario que estaba llenando.
 *
 *   <PhotoPicker open onClose onPick={({ url, alt, focus }) => …} />
 *   <PhotoPicker multiple max={5} onPick={(fotos) => …} />
 *
 * Con `multiple`, onPick recibe un arreglo. Las fotos de `selectedUrls`
 * ya están puestas: se marcan «Ya está» y no se pueden volver a elegir.
 */

const toPick = (photo) => ({ url: photo.url, alt: photo.alt ?? '', focus: photo.focus || DEFAULT_FOCUS, photo });

export default function PhotoPicker({
  open,
  onClose,
  onPick,
  multiple = false,
  max = Infinity,
  selectedUrls = [],
  title,
  description,
}) {
  const [library, setLibrary] = useState({ photos: [], offline: false, loading: true });
  const [config, setConfig] = useState(null);
  const [filter, setFilter] = useState('all');
  const [chosen, setChosen] = useState([]); // ids, en el orden en que se tocaron
  const [inGallery, setInGallery] = useState(true);

  const already = useMemo(() => new Set(selectedUrls), [selectedUrls]);

  useEffect(() => {
    if (!open) return;
    setChosen([]);
    setLibrary((l) => ({ ...l, loading: true }));
    loadPhotoLibrary().then((result) => setLibrary({ ...result, loading: false }));
    getMediaConfig()
      .then(setConfig)
      .catch(() => setConfig({ enabled: false, unreachable: true }));
  }, [open]);

  const select = (photo) =>
    setChosen((ids) => {
      if (ids.includes(photo.id)) return ids.filter((id) => id !== photo.id);
      if (!multiple) return [photo.id];
      if (ids.length >= max) return ids;
      return [...ids, photo.id];
    });

  const uploads = useUploads({
    onUploaded: (photo) => {
      invalidatePhotoLibrary();
      setLibrary((l) => ({ ...l, photos: [...l.photos, { ...photo, usedBy: [] }] }));
      // La recién subida queda elegida: es casi seguro la que se quería.
      select(photo);
    },
  });

  const visible = filterPhotos(library.photos, filter);
  const category = PHOTO_FILTERS.some((f) => f.id === filter) && !['all', 'none'].includes(filter) ? filter : null;

  function confirm() {
    const byId = new Map(library.photos.map((p) => [p.id, p]));
    const picked = chosen.map((id) => byId.get(id)).filter(Boolean).map(toPick);
    if (picked.length === 0) return;
    onPick(multiple ? picked : picked[0]);
    onClose();
  }

  const remaining = Number.isFinite(max) ? Math.max(0, max - chosen.length) : null;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      size="lg"
      title={title ?? (multiple ? 'Elegir fotos' : 'Elegir foto')}
      description={
        description ??
        (multiple
          ? `Toca las fotos que quieras añadir${Number.isFinite(max) ? ` (hasta ${max})` : ''}.`
          : 'Toca una foto de tu biblioteca o sube una nueva.')
      }
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} className="flex-1 sm:flex-none">
            Cancelar
          </Button>
          <Button type="button" onClick={confirm} disabled={chosen.length === 0} className="flex-1 sm:ml-auto sm:flex-none">
            {multiple
              ? chosen.length === 0
                ? 'Añadir fotos'
                : `Añadir ${chosen.length} ${chosen.length === 1 ? 'foto' : 'fotos'}`
              : 'Usar esta foto'}
          </Button>
        </>
      }
    >
      {/* ── Subir una nueva ── */}
      <section aria-label="Subir una foto nueva" className="mb-6">
        {config?.enabled ? (
          <>
            <UploadDropzone
              compact
              multiple={multiple}
              label={multiple ? 'Subir fotos nuevas' : 'Subir una foto nueva'}
              onFiles={(files) =>
                uploads.add(multiple ? files : [...files].slice(0, 1), {
                  inGallery,
                  ...(category ? { category } : {}),
                })
              }
            />
            <Checkbox
              className="mt-3"
              label="Mostrarla también en Mi trabajo"
              description={
                category
                  ? `Quedará en la categoría ${PHOTO_FILTERS.find((f) => f.id === category)?.label}.`
                  : 'Luego le pones categoría y descripción en Panel → Fotos.'
              }
              checked={inGallery}
              onChange={(e) => setInGallery(e.target.checked)}
            />
            <UploadList items={uploads.items} onRetry={uploads.retry} onDismiss={uploads.dismiss} />
          </>
        ) : config ? (
          <p className="rounded-xl border border-dashed border-line px-4 py-3 text-xs leading-relaxed text-ink-500">
            {config.unreachable
              ? 'Sin conexión con el servidor: por ahora solo puedes elegir de las fotos que ya tiene la web.'
              : 'La subida de fotos aún no está activada. Por ahora elige de las que ya están en tu biblioteca.'}
          </p>
        ) : null}
      </section>

      {/* ── Biblioteca ── */}
      <section aria-labelledby="picker-library-title">
        <h3 id="picker-library-title" className="label-base">
          Tu biblioteca
        </h3>

        {library.offline && !library.loading && (
          <Alert tone="warning" className="mb-3">
            No pudimos cargar tu biblioteca. Te mostramos las fotos que vienen con la web.
          </Alert>
        )}

        <FilterChips value={filter} onChange={setFilter} photos={library.photos} />

        {library.loading ? (
          <LoadingBlock label="Cargando fotos…" className="py-10" />
        ) : visible.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-line p-4 text-sm text-ink-500">
            No hay fotos en esta categoría todavía.
          </p>
        ) : (
          <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
            {visible.map((photo) => {
              const isAlready = already.has(photo.url);
              const isChosen = chosen.includes(photo.id);
              const full = multiple && !isChosen && remaining === 0;
              const { src, srcSet } = imageSources(photo.url, { widths: [240, 480], fallback: 480 });
              return (
                <li key={photo.id}>
                  <button
                    type="button"
                    onClick={() => select(photo)}
                    disabled={isAlready || full}
                    aria-pressed={isChosen}
                    aria-label={`${photo.alt || 'Foto sin descripción'}${photo.minor ? ' (menor de edad)' : ''}${isAlready ? ' (ya está puesta)' : ''}`}
                    className={cx(
                      'relative block w-full overflow-hidden rounded-xl border-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2',
                      isChosen ? 'border-brand-600' : 'border-transparent hover:border-brand-200',
                      (isAlready || full) && 'cursor-not-allowed opacity-50',
                    )}
                  >
                    <img
                      src={src}
                      srcSet={srcSet}
                      sizes="(min-width: 768px) 9rem, 33vw"
                      alt=""
                      loading="lazy"
                      style={{ objectPosition: photo.focus || DEFAULT_FOCUS }}
                      className="aspect-[4/5] w-full bg-blush object-cover"
                    />
                    {isChosen && (
                      <span className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-on-brand shadow-soft">
                        {multiple ? (
                          <span className="text-xs font-semibold">{chosen.indexOf(photo.id) + 1}</span>
                        ) : (
                          <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden="true">
                            <path d="m3.5 8.2 2.8 2.8 6-6.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                    )}
                    <span className="absolute inset-x-1 bottom-1 flex flex-wrap gap-1">
                      {isAlready && <Badge tone="dark" className="px-1.5 py-0 text-[9px]">Ya está</Badge>}
                      {photo.minor && <Badge tone="gold" className="px-1.5 py-0 text-[9px]">Menor</Badge>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {library.photos.some((p) => p.minor) && (
          <p className="hint-text">
            Las marcadas «Menor» necesitan la autorización por escrito de la mamá, el papá o el acudiente antes de
            publicarlas.
          </p>
        )}
      </section>
    </Sheet>
  );
}

/** Filtro por categoría, con cuántas fotos hay en cada una. */
export function FilterChips({ value, onChange, photos, label = 'Filtrar por categoría' }) {
  return (
    <div role="group" aria-label={label} className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      {PHOTO_FILTERS.map((f) => {
        const count = filterPhotos(photos, f.id).length;
        if (f.id === 'none' && count === 0 && value !== 'none') return null;
        const active = value === f.id;
        return (
          <button
            key={f.id}
            type="button"
            onClick={() => onChange(f.id)}
            aria-pressed={active}
            className={cx(
              'min-h-[44px] shrink-0 whitespace-nowrap rounded-full border px-4 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600',
              active ? 'border-brand-500 bg-brand-100 text-brand-800' : 'border-line bg-surface text-ink-600 hover:border-brand-200',
            )}
          >
            {f.label} <span className="text-ink-400">({count})</span>
          </button>
        );
      })}
    </div>
  );
}

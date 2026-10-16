import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { api, ApiError } from '../../lib/api.js';
import { getMediaConfig } from '../../lib/cloudinary.js';
import { imageSources } from '../../lib/images.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Alert, Badge, Button, EmptyState, LoadingBlock, Select, cx } from '../../components/ui/index.jsx';
import PhotoEditor from '../../components/admin/PhotoEditor.jsx';
import Sheet from '../../components/admin/Sheet.jsx';
import { FilterChips } from '../../components/admin/PhotoPicker.jsx';
import { UploadDropzone, UploadList, useUploads } from '../../components/admin/PhotoUploader.jsx';
import {
  CATEGORY_LABEL,
  DEFAULT_FOCUS,
  PHOTO_CATEGORIES,
  PHOTO_FILTERS,
  filterPhotos,
  invalidatePhotoLibrary,
  loadPhotoLibrary,
  usedByLabel,
} from '../../components/admin/photoLibrary.js';

/**
 * Panel → Fotos.
 *
 * Todas las fotos de la web en un solo sitio: Yury las sube desde el
 * celular, les pone descripción y categoría, elige el encuadre, las
 * ordena (el orden de aquí es el de «Mi trabajo») y las borra.
 *
 * Orden: en el computador se arrastran; en el celular, y con teclado,
 * con los botones de antes/después (o Alt + flecha arriba/abajo). Cada movimiento se
 * ve al instante y se guarda un momento después, todos juntos; si el
 * servidor falla, las fotos vuelven a donde estaban y se avisa.
 */

const SAVE_DELAY_MS = 700;

/** Reordena `list` según `ids`; lo que no esté en `ids` queda al final. */
function sortByIds(list, ids) {
  const position = new Map(ids.map((id, i) => [id, i]));
  return [...list].sort((a, b) => (position.get(a.id) ?? Infinity) - (position.get(b.id) ?? Infinity));
}

/** Saca `id` y lo pone antes (o después) de `targetId`. */
function moveNextTo(list, id, targetId, after) {
  const item = list.find((p) => p.id === id);
  if (!item || id === targetId) return list;
  const rest = list.filter((p) => p.id !== id);
  const index = rest.findIndex((p) => p.id === targetId) + (after ? 1 : 0);
  rest.splice(index, 0, item);
  return rest;
}

const sameOrder = (a, b) => a.length === b.length && a.every((id, i) => id === b[i]);

const shortAlt = (photo) => {
  const alt = (photo.alt ?? '').trim();
  if (!alt) return 'Foto sin descripción';
  return alt.length > 60 ? `${alt.slice(0, 57)}…` : alt;
};

export default function PhotosAdmin() {
  const toast = useToast();
  const [photos, setPhotos] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | failed
  const [config, setConfig] = useState(null);
  const [filter, setFilter] = useState('all');
  const [uploadCategory, setUploadCategory] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [removing, setRemoving] = useState(null); // { photo, usedBy, stage, busy }
  const [announcement, setAnnouncement] = useState('');
  const [dragId, setDragId] = useState(null);
  const [overId, setOverId] = useState(null);
  const [canDrag, setCanDrag] = useState(false);

  // El orden que el servidor ya tiene guardado: a él se vuelve si falla.
  const committed = useRef([]);
  const photosRef = useRef(photos);
  photosRef.current = photos;
  const saveTimer = useRef(null);
  const saving = useRef(false); // hay un PUT del orden en camino
  const saveAgain = useRef(false); // se movió algo mientras tanto
  const gridRef = useRef(null);
  const pendingFocus = useRef(null); // selector del control que tenía el foco al mover

  // Al mover una foto, React saca su casilla y la vuelve a poner en otro
  // puesto, y el navegador le quita el foco: se le devuelve al mismo
  // botón para poder seguir moviéndola sin buscarlo otra vez.
  useLayoutEffect(() => {
    const pending = pendingFocus.current;
    if (!pending) return;
    pendingFocus.current = null;
    gridRef.current?.querySelector(pending)?.focus();
  }, [photos]);

  const load = useCallback(async () => {
    setStatus('loading');
    // La configuración se pide de nuevo al entrar: si Yury acaba de poner
    // las claves en Render, la subida aparece sin tener que recargar.
    const [list, media] = await Promise.allSettled([api.get('/photos/admin'), getMediaConfig({ refresh: true })]);
    setConfig(media.status === 'fulfilled' ? media.value : { enabled: false, unreachable: true });
    if (list.status === 'fulfilled') {
      const loaded = list.value?.photos ?? [];
      setPhotos(loaded);
      committed.current = loaded.map((p) => p.id);
      setStatus('ready');
    } else {
      setStatus('failed');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Arrastrar solo con ratón: en pantallas táctiles el arrastre nativo
  // choca con el desplazamiento, y ahí están los botones.
  useEffect(() => {
    const query = window.matchMedia?.('(pointer: fine)');
    if (!query) return undefined;
    const update = () => setCanDrag(query.matches);
    update();
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);

  // Al salir de la página con un orden sin guardar, se guarda igual.
  useEffect(
    () => () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
        // Si hay un PUT en camino, el suyo repite al terminar con este orden.
        if (saving.current) {
          saveAgain.current = true;
          return;
        }
        const ids = photosRef.current.map((p) => p.id);
        if (!sameOrder(ids, committed.current)) api.put('/photos/admin/order', { ids }).catch(() => {});
      }
    },
    [],
  );

  const announce = (text) => {
    // Vaciar primero hace que se anuncie aunque el texto se repita.
    setAnnouncement('');
    requestAnimationFrame(() => setAnnouncement(text));
  };

  // ── Orden ──────────────────────────────────────────────────────────

  async function saveOrder() {
    saveTimer.current = null;
    // Un solo guardado a la vez: con la señal lenta el PUT puede tardar
    // más que la pausa, y dos PUT cruzados podrían llegar al revés y dejar
    // guardado el orden viejo. Si ya hay uno en camino, se repite al final
    // con el orden más reciente.
    if (saving.current) {
      saveAgain.current = true;
      return;
    }
    const ids = photosRef.current.map((p) => p.id);
    if (sameOrder(ids, committed.current)) return;
    saving.current = true;
    try {
      await api.put('/photos/admin/order', { ids });
      committed.current = ids;
      invalidatePhotoLibrary();
    } catch (error) {
      // Se vuelve al último orden guardado (también lo movido mientras
      // tanto), así que no queda nada pendiente por repetir.
      saveAgain.current = false;
      setPhotos((list) => sortByIds(list, committed.current));
      announce('No se pudo guardar el orden. Las fotos volvieron a como estaban.');
      toast.error(
        error instanceof ApiError && error.status === 0
          ? 'Sin conexión: no se guardó el orden. Las fotos volvieron a como estaban.'
          : 'No se pudo guardar el orden. Las fotos volvieron a como estaban.',
      );
    } finally {
      saving.current = false;
      if (saveAgain.current) {
        saveAgain.current = false;
        saveOrder();
      }
    }
  }

  function scheduleSave() {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(saveOrder, SAVE_DELAY_MS);
  }

  /** Aplica el nuevo orden, lo anuncia y programa el guardado. */
  function applyOrder(next, movedId) {
    setPhotos(next);
    const visibleNext = filterPhotos(next, filter);
    const position = visibleNext.findIndex((p) => p.id === movedId) + 1;
    const moved = next.find((p) => p.id === movedId);
    announce(`«${shortAlt(moved)}» quedó en el puesto ${position} de ${visibleNext.length}.`);
    scheduleSave();
  }

  /**
   * Mueve una foto un puesto antes (-1) o después (+1) dentro de lo que
   * se está viendo: con un filtro puesto, salta a la vecina de la misma
   * categoría, que es la que Yury tiene al lado en pantalla.
   */
  function moveBy(id, direction) {
    const visible = filterPhotos(photos, filter);
    const index = visible.findIndex((p) => p.id === id);
    const neighbor = visible[index + direction];
    if (!neighbor) {
      announce(direction < 0 ? 'Ya es la primera.' : 'Ya es la última.');
      return;
    }
    // Solo si el foco estaba en la casilla (botón o Alt + flecha).
    const active = document.activeElement;
    if (gridRef.current?.contains(active)) {
      pendingFocus.current = active.dataset?.move ? `[data-move="${active.dataset.move}"]` : `[data-edit="${id}"]`;
    }
    applyOrder(moveNextTo(photos, id, neighbor.id, direction > 0), id);
  }

  function dropOn(targetId) {
    const from = photos.findIndex((p) => p.id === dragId);
    const to = photos.findIndex((p) => p.id === targetId);
    if (from !== -1 && to !== -1 && from !== to) applyOrder(moveNextTo(photos, dragId, targetId, from < to), dragId);
    setDragId(null);
    setOverId(null);
  }

  // ── Subidas ────────────────────────────────────────────────────────

  const uploads = useUploads({
    onUploaded: (photo) => {
      invalidatePhotoLibrary();
      setPhotos((list) => [...list, { ...photo, usedBy: photo.usedBy ?? [] }]);
      // El servidor la pone de última: el orden guardado ya la incluye.
      committed.current = [...committed.current, photo.id];
      announce('Foto subida. Quedó de última; ponle una descripción.');
    },
  });

  // Si Yury está mirando una categoría, lo que suba va a esa categoría.
  useEffect(() => {
    if (PHOTO_CATEGORIES.some((c) => c.id === filter)) setUploadCategory(filter);
    else if (filter === 'none') setUploadCategory('');
  }, [filter]);

  // ── Editar y borrar ────────────────────────────────────────────────

  const editing = useMemo(() => photos.find((p) => p.id === editingId) ?? null, [photos, editingId]);

  function onSaved(saved) {
    setPhotos((list) => list.map((p) => (p.id === saved.id ? { ...p, ...saved } : p)));
    setEditingId(null);
  }

  function askRemove(photo) {
    // Si ya se sabe que está en uso, se dice dónde desde el principio.
    const usedBy = photo.usedBy ?? [];
    setRemoving({ photo, usedBy, stage: usedBy.length > 0 ? 'inUse' : 'confirm', busy: false });
  }

  async function remove(force) {
    const { photo } = removing;
    setRemoving((r) => ({ ...r, busy: true }));
    try {
      const result = await api.delete(`/photos/admin/${photo.id}${force ? '?force=1' : ''}`);
      setPhotos((list) => list.filter((p) => p.id !== photo.id));
      committed.current = committed.current.filter((id) => id !== photo.id);
      invalidatePhotoLibrary();
      setRemoving(null);
      if (editingId === photo.id) setEditingId(null);
      announce('Foto borrada.');
      if (photo.publicId && result?.cloudinaryDeleted === false) {
        toast.info(
          'La foto ya no sale en la web, pero no se pudo borrar de Cloudinary. Puedes borrarla allá a mano cuando quieras.',
          10000,
        );
      } else {
        toast.success('Foto borrada.');
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 409 && error.code === 'PHOTO_IN_USE') {
        // El cliente de la API no guarda `usedBy` de la respuesta: se
        // vuelve a pedir la lista para mostrar dónde se usa hoy.
        let usedBy = error.usedBy;
        if (!usedBy) {
          const fresh = await loadPhotoLibrary({ force: true });
          usedBy = fresh.photos.find((p) => p.id === photo.id)?.usedBy ?? photo.usedBy ?? [];
        }
        setRemoving((r) => ({ ...r, usedBy, stage: 'inUse', busy: false }));
      } else {
        toast.error(error.message);
        setRemoving((r) => (r ? { ...r, busy: false } : r));
      }
    }
  }

  // ── Pantalla ───────────────────────────────────────────────────────

  if (status === 'loading') return <LoadingBlock label="Cargando tus fotos…" />;

  const visible = filterPhotos(photos, filter);
  const withoutAlt = photos.filter((p) => !(p.alt ?? '').trim()).length;

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-3xl">Fotos</h1>
        <p className="mt-1.5 text-sm text-ink-500">
          {photos.length} {photos.length === 1 ? 'foto' : 'fotos'} ·{' '}
          {photos.filter((p) => p.inGallery).length} en «Mi trabajo». El orden de aquí es el de la galería.
        </p>
      </header>

      {/* Anuncios para lector de pantalla (orden, subidas, borrados). */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      {status === 'failed' && (
        <Alert tone="error" className="mb-6">
          <p>No pudimos cargar tus fotos. Revisa la conexión.</p>
          <Button size="sm" variant="secondary" className="mt-3" onClick={load}>
            Intentar otra vez
          </Button>
        </Alert>
      )}

      {/* ── Subir ── */}
      {config && !config.enabled ? (
        <Alert tone="warning" title="La subida de fotos aún no está activada" className="mb-6">
          {config.unreachable ? (
            <p>No pudimos consultar el servidor. Recarga la página en un momento.</p>
          ) : (
            <>
              <p>
                Para subir fotos nuevas hay que conectar una cuenta gratuita de Cloudinary (donde se guardan las
                fotos). En Render, en el servicio del backend → <strong>Environment</strong>, agrega:
              </p>
              <ul className="mt-2 space-y-0.5 font-mono text-xs">
                <li>CLOUDINARY_CLOUD_NAME</li>
                <li>CLOUDINARY_API_KEY</li>
                <li>CLOUDINARY_API_SECRET</li>
                <li>CLOUDINARY_FOLDER (opcional; si no, «yury-enriquez»)</li>
              </ul>
              <p className="mt-2">
                Los tres primeros salen de la sección de claves de API de tu cuenta de Cloudinary. Mientras tanto
                puedes ordenar, editar y borrar las fotos que ya están.
              </p>
            </>
          )}
        </Alert>
      ) : config?.enabled ? (
        <section aria-labelledby="upload-title" className="mb-8 rounded-2xl border border-line bg-surface p-4 shadow-soft sm:p-5">
          <h2 id="upload-title" className="mb-3 font-display text-xl text-ink-800">
            Subir fotos
          </h2>
          <Select
            label="Categoría de las fotos nuevas"
            value={uploadCategory}
            onChange={(e) => setUploadCategory(e.target.value)}
            className="mb-4 max-w-sm"
          >
            <option value="">Sin categoría (la pongo después)</option>
            {PHOTO_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
          <UploadDropzone
            onFiles={(files) => uploads.add(files, uploadCategory ? { category: uploadCategory } : {})}
            hint="Puedes elegir varias a la vez, desde la cámara o la galería del celular. Las achicamos antes de subirlas para que no gasten tantos datos."
          />
          <UploadList items={uploads.items} onRetry={uploads.retry} onDismiss={uploads.dismiss} />
        </section>
      ) : null}

      {status === 'ready' && (
        <section aria-labelledby="library-title">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <h2 id="library-title" className="font-display text-xl text-ink-800">
              Tus fotos
            </h2>
            {withoutAlt > 0 && (
              <p className="text-xs text-ink-500">
                {withoutAlt} sin descripción: tócalas para completarla.
              </p>
            )}
          </div>

          <FilterChips value={filter} onChange={setFilter} photos={photos} />

          <p id="reorder-help" className="hint-text mb-3">
            Toca una foto para editarla. Para cambiar el orden usa las flechas de cada foto
            {canDrag ? ' o arrástrala' : ''}. Con teclado: Alt + flecha arriba o abajo.
          </p>

          {photos.length === 0 ? (
            <EmptyState
              title="Aún no hay fotos"
              description={config?.enabled ? 'Sube la primera desde arriba.' : 'Cuando se active la subida, podrás añadirlas desde aquí.'}
            />
          ) : visible.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line p-4 text-sm text-ink-500">
              No hay fotos en «{PHOTO_FILTERS.find((f) => f.id === filter)?.label}» todavía.
            </p>
          ) : (
            <ol ref={gridRef} className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {visible.map((photo, index) => (
                <PhotoTile
                  key={photo.id}
                  photo={photo}
                  position={index + 1}
                  total={visible.length}
                  draggable={canDrag}
                  dragging={dragId === photo.id}
                  over={overId === photo.id && dragId !== photo.id}
                  onEdit={() => setEditingId(photo.id)}
                  onMove={(direction) => moveBy(photo.id, direction)}
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = 'move';
                    event.dataTransfer.setData('text/plain', photo.id);
                    setDragId(photo.id);
                  }}
                  onDragOver={(event) => {
                    if (!dragId) return;
                    event.preventDefault();
                    event.dataTransfer.dropEffect = 'move';
                    if (overId !== photo.id) setOverId(photo.id);
                  }}
                  onDrop={(event) => {
                    if (!dragId) return;
                    event.preventDefault();
                    dropOn(photo.id);
                  }}
                  onDragEnd={() => {
                    setDragId(null);
                    setOverId(null);
                  }}
                />
              ))}
            </ol>
          )}
        </section>
      )}

      <PhotoEditor
        photo={editing}
        open={Boolean(editing)}
        onClose={() => setEditingId(null)}
        onSaved={onSaved}
        onDelete={askRemove}
      />

      <RemoveDialog state={removing} onCancel={() => setRemoving(null)} onConfirm={remove} />
    </div>
  );
}

function PhotoTile({ photo, position, total, draggable, dragging, over, onEdit, onMove, onDragStart, onDragOver, onDrop, onDragEnd }) {
  const { src, srcSet } = imageSources(photo.url, { widths: [320, 640], fallback: 640 });
  const label = shortAlt(photo);
  const missingAlt = !(photo.alt ?? '').trim();

  function onKeyDown(event) {
    if (!event.altKey) return;
    // Solo arriba/abajo: Alt + flecha izquierda es «Atrás» en el navegador.
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      onMove(-1);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      onMove(1);
    }
  }

  return (
    <li
      draggable={draggable}
      onDragStart={draggable ? onDragStart : undefined}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onKeyDown={onKeyDown}
      className={cx(
        'flex flex-col overflow-hidden rounded-2xl border bg-surface shadow-soft transition',
        over ? 'border-brand-500 ring-2 ring-brand-300' : 'border-line',
        dragging && 'opacity-50',
        draggable && 'cursor-grab active:cursor-grabbing',
      )}
    >
      <button
        type="button"
        data-edit={photo.id}
        onClick={onEdit}
        aria-label={`Editar foto ${position} de ${total}: ${label}`}
        aria-describedby="reorder-help"
        className="relative block w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-600"
      >
        <img
          src={src}
          srcSet={srcSet}
          sizes="(min-width: 1280px) 15vw, (min-width: 1024px) 20vw, (min-width: 640px) 30vw, 46vw"
          alt=""
          loading="lazy"
          draggable={false}
          style={{ objectPosition: photo.focus || DEFAULT_FOCUS }}
          className="aspect-[4/5] w-full bg-blush object-cover"
        />
        <span className="absolute inset-x-1.5 top-1.5 flex flex-wrap gap-1">
          {photo.featured && <Badge tone="gold" className="px-2 py-0.5 text-[9px]">Destacada</Badge>}
          {!photo.inGallery && <Badge tone="dark" className="px-2 py-0.5 text-[9px]">No sale en Mi trabajo</Badge>}
          {photo.minor && <Badge tone="gold" className="px-2 py-0.5 text-[9px]">Menor</Badge>}
        </span>
        {missingAlt && (
          <span className="absolute inset-x-1.5 bottom-1.5">
            <Badge tone="neutral" className="px-2 py-0.5 text-[9px]">Falta descripción</Badge>
          </span>
        )}
      </button>

      <div className="flex items-center gap-1 px-1.5 py-1">
        <MoveButton id={photo.id} direction={-1} disabled={position === 1} label={`Mover antes: ${label}`} onClick={() => onMove(-1)} />
        <span className="min-w-0 flex-1 truncate text-center text-xs text-ink-500" aria-hidden="true">
          {position} · {photo.category ? CATEGORY_LABEL[photo.category] : 'Sin categoría'}
        </span>
        <MoveButton id={photo.id} direction={1} disabled={position === total} label={`Mover después: ${label}`} onClick={() => onMove(1)} />
      </div>
      {photo.usedBy?.length > 0 && (
        <p className="truncate px-2.5 pb-2 text-[11px] text-ink-400" title={photo.usedBy.map(usedByLabel).join(' · ')}>
          También en: {photo.usedBy.map(usedByLabel).join(' · ')}
        </p>
      )}
    </li>
  );
}

/**
 * En el borde no se deshabilita del todo (aria-disabled): si el botón
 * con el foco se apagara, el foco se perdería justo después de mover.
 */
function MoveButton({ id, direction, disabled, label, onClick }) {
  return (
    <button
      type="button"
      data-move={`${id}:${direction}`}
      onClick={onClick}
      aria-disabled={disabled || undefined}
      aria-label={label}
      className={cx(
        'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600',
        disabled ? 'text-ink-400 opacity-40' : 'text-ink-600 hover:bg-blush hover:text-brand-700',
      )}
    >
      <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden="true">
        <path
          d={direction < 0 ? 'M12 5 7 10l5 5' : 'm8 5 5 5-5 5'}
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

/** Confirmar el borrado y, si la foto se usa en otra parte, decir dónde. */
function RemoveDialog({ state, onCancel, onConfirm }) {
  const photo = state?.photo;
  const inUse = state?.stage === 'inUse';
  const usedBy = state?.usedBy ?? [];
  const { src, srcSet } = imageSources(photo?.url, { widths: [240, 480], fallback: 480 });

  return (
    <Sheet
      open={Boolean(state)}
      onClose={onCancel}
      title={inUse ? 'Esta foto se está usando' : '¿Borrar esta foto?'}
      footer={
        state && (
          <>
            <Button type="button" variant="ghost" onClick={onCancel} className="flex-1 sm:flex-none">
              No, dejarla
            </Button>
            <Button
              type="button"
              variant="danger"
              loading={state.busy}
              onClick={() => onConfirm(inUse)}
              className="flex-1 sm:ml-auto sm:flex-none"
            >
              {inUse ? 'Quitarla de todos lados y borrarla' : 'Sí, borrarla'}
            </Button>
          </>
        )
      }
    >
      {photo && (
        <div className="flex flex-col gap-4 sm:flex-row">
          <img
            src={src}
            srcSet={srcSet}
            sizes="8rem"
            alt=""
            style={{ objectPosition: photo.focus || DEFAULT_FOCUS }}
            className="aspect-[4/5] w-28 shrink-0 rounded-xl bg-blush object-cover"
          />
          <div className="min-w-0 space-y-3 text-sm leading-relaxed text-ink-700">
            {inUse ? (
              <>
                <p>Además de la galería, esta foto está puesta en:</p>
                <ul className="space-y-1">
                  {usedBy.map((use, i) => (
                    <li key={`${use.type}-${use.id ?? i}`} className="font-medium text-ink-800">
                      · {usedByLabel(use)}
                    </li>
                  ))}
                </ul>
                <p>
                  Si la borras, se quita de esos lugares. Donde era la foto principal del inicio o de «Sobre mí»
                  vuelve la de siempre; los servicios y ocasiones quedan sin esa foto hasta que les pongas otra.
                </p>
              </>
            ) : (
              <>
                <p>Se quita de la web y no se puede deshacer.</p>
                {photo.publicId && <p className="text-xs text-ink-500">También se borra de Cloudinary.</p>}
              </>
            )}
          </div>
        </div>
      )}
    </Sheet>
  );
}

import { useLayoutEffect, useRef, useState } from 'react';
import { imageSources } from '../../lib/images.js';
import { focusFor } from '../portfolio/photoImage.js';
import { Button, cx } from '../ui/index.jsx';
import FocusPicker from './FocusPicker.jsx';
import PhotoPicker from './PhotoPicker.jsx';
import { DEFAULT_FOCUS, useLibraryByUrl } from './photoLibrary.js';

/**
 * Fotos de un servicio: se eligen de la biblioteca (o se suben ahí
 * mismo), se ordenan, se quitan y a cada una se le escribe su
 * descripción y su encuadre PARA ESTE SERVICIO (la misma foto puede ir
 * con otro encuadre en «Mi trabajo»).
 *
 * Cada foto llega como { key, url, alt, focus }. `key` solo existe en el
 * panel (para que React no confunda dos filas al reordenar); el
 * formulario la quita al guardar.
 *
 * El orden se cambia con los botones de subir y bajar, que sirven igual
 * con el dedo, el ratón y el teclado. Sin arrastrar: dentro de una hoja
 * que se desplaza, arrastrar con el dedo es un tormento.
 */

export const MAX_SERVICE_IMAGES = 12;
/** Límite de la descripción de una foto de servicio en el servidor. */
export const SERVICE_ALT_MAX = 160;

let counter = 0;
export const imageKey = () => {
  counter += 1;
  return `img-${counter}`;
};

export default function ServiceImagesEditor({ images, onChange, errors = {}, onClearError }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [focusOpen, setFocusOpen] = useState(null); // key de la foto con el encuadre abierto
  const [announcement, setAnnouncement] = useState('');
  const pendingFocus = useRef(null); // { key, direction } tras mover
  const listRef = useRef(null);
  const byUrl = useLibraryByUrl();

  const remaining = MAX_SERVICE_IMAGES - images.length;

  // Al mover una fila, React la saca y la vuelve a poner en otra parte
  // de la lista y el navegador le quita el foco: se le devuelve al mismo
  // botón para que se pueda seguir moviendo con Enter sin buscarlo.
  useLayoutEffect(() => {
    const pending = pendingFocus.current;
    if (!pending) return;
    pendingFocus.current = null;
    listRef.current?.querySelector(`[data-move="${pending.key}:${pending.direction}"]`)?.focus();
  }, [images]);

  const announce = (text) => {
    setAnnouncement('');
    requestAnimationFrame(() => setAnnouncement(text));
  };

  const update = (key, changes) => onChange(images.map((img) => (img.key === key ? { ...img, ...changes } : img)));

  function add(picked) {
    const list = Array.isArray(picked) ? picked : [picked];
    const known = new Set(images.map((img) => img.url));
    const added = list
      .filter((p) => !known.has(p.url))
      .slice(0, remaining)
      .map((p) => ({
        key: imageKey(),
        url: p.url,
        alt: (p.alt ?? '').slice(0, SERVICE_ALT_MAX),
        // El encuadre que la foto ya tiene en la biblioteca es el mejor
        // punto de partida; aquí se puede afinar para este servicio.
        focus: p.focus || DEFAULT_FOCUS,
      }));
    if (added.length === 0) return;
    onChange([...images, ...added]);
    announce(added.length === 1 ? 'Foto añadida al final.' : `${added.length} fotos añadidas al final.`);
  }

  function move(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= images.length) {
      announce(direction < 0 ? 'Ya es la primera.' : 'Ya es la última.');
      return;
    }
    const next = [...images];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    pendingFocus.current = { key: item.key, direction };
    onChange(next);
    onClearError?.();
    announce(
      target === 0
        ? 'La foto quedó de primera: ahora es la portada del servicio.'
        : `La foto quedó en el puesto ${target + 1} de ${next.length}.`,
    );
  }

  function remove(index) {
    const item = images[index];
    onChange(images.filter((img) => img.key !== item.key));
    onClearError?.();
    if (focusOpen === item.key) setFocusOpen(null);
    announce('Foto quitada del servicio. Sigue guardada en tu biblioteca.');
  }

  return (
    <fieldset>
      <legend className="label-base">Fotos del servicio</legend>

      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      {images.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line p-4 text-sm text-ink-500">
          Sin fotos todavía. Añade al menos una: el catálogo entra mucho mejor con imagen.
        </p>
      ) : (
        <ol ref={listRef} className="space-y-3">
          {images.map((image, index) => (
            <ImageRow
              key={image.key}
              image={image}
              byUrl={byUrl}
              index={index}
              total={images.length}
              altError={errors[`images.${index}.alt`]}
              urlError={errors[`images.${index}.url`] ?? errors[`images.${index}.focus`]}
              focusOpen={focusOpen === image.key}
              onToggleFocus={() => setFocusOpen((k) => (k === image.key ? null : image.key))}
              onChange={(changes) => update(image.key, changes)}
              onMove={(direction) => move(index, direction)}
              onRemove={() => remove(index)}
            />
          ))}
        </ol>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="min-h-[44px]"
          onClick={() => setPickerOpen(true)}
          disabled={remaining <= 0}
        >
          {images.length === 0 ? 'Elegir fotos' : 'Añadir más fotos'}
        </Button>
        <p className="text-xs text-ink-500">
          {remaining > 0
            ? `${images.length} de ${MAX_SERVICE_IMAGES}.`
            : `Ya tiene las ${MAX_SERVICE_IMAGES} fotos que caben. Quita una para poner otra.`}
        </p>
      </div>

      {errors.images && (
        <p className="error-text" role="alert">
          {errors.images}
        </p>
      )}
      <p className="hint-text">
        La primera es la portada de la tarjeta del servicio. Puedes elegirlas de tu biblioteca o subir nuevas desde
        el celular.
      </p>

      <PhotoPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={add}
        multiple
        max={Math.max(0, remaining)}
        selectedUrls={images.map((img) => img.url)}
        title="Añadir fotos al servicio"
      />
    </fieldset>
  );
}

function ImageRow({ image, byUrl, index, total, altError, urlError, focusOpen, onToggleFocus, onChange, onMove, onRemove }) {
  const { src, srcSet } = imageSources(image.url, { widths: [240, 480], fallback: 480 });
  const [broken, setBroken] = useState(false);
  const altId = `service-image-alt-${image.key}`;
  const hintId = `${altId}-hint`;
  const errorId = `${altId}-error`;
  const number = index + 1;
  const missingAlt = !image.alt.trim();
  // El mismo punto que usará la web: el de esta foto en el servicio o,
  // si nunca se eligió («50% 50%»), el que tiene en la biblioteca.
  const focus = focusFor(image.url, image.focus, byUrl);

  return (
    <li className={cx('rounded-2xl border p-3', altError || urlError ? 'border-red-300' : 'border-line')}>
      <div className="flex gap-3">
        <div className="shrink-0">
          {broken ? (
            <div className="flex aspect-[4/5] w-20 items-center justify-center rounded-xl bg-blush px-1 text-center text-[10px] leading-tight text-ink-500">
              No se pudo cargar
            </div>
          ) : (
            <img
              src={src}
              srcSet={srcSet}
              sizes="5rem"
              alt=""
              onError={() => setBroken(true)}
              style={{ objectPosition: focus }}
              className="aspect-[4/5] w-20 rounded-xl bg-blush object-cover"
            />
          )}
          <p className="mt-1 text-center text-[11px] font-medium text-ink-500">
            {index === 0 ? 'Portada' : `Foto ${number}`}
          </p>
        </div>

        <div className="min-w-0 flex-1">
          <label htmlFor={altId} className="mb-1 block text-xs font-medium text-ink-700">
            ¿Qué se ve en la foto {number}?
          </label>
          <textarea
            id={altId}
            rows={2}
            value={image.alt}
            maxLength={SERVICE_ALT_MAX}
            onChange={(event) => onChange({ alt: event.target.value })}
            placeholder="Ej.: Novia con maquillaje natural y recogido bajo"
            aria-invalid={altError ? 'true' : undefined}
            aria-describedby={altError ? errorId : hintId}
            className={cx(
              'input-base resize-none px-3 py-2 text-sm leading-snug',
              altError && 'border-red-400 focus:border-red-500 focus:ring-red-300',
            )}
          />
          {altError ? (
            <p id={errorId} className="error-text" role="alert">
              {altError}
            </p>
          ) : (
            <p id={hintId} className={cx('mt-1 text-[11px] leading-snug', missingAlt ? 'text-red-700' : 'text-ink-400')}>
              {missingAlt ? 'Falta: sin descripción no se puede guardar.' : `${image.alt.length}/${SERVICE_ALT_MAX}`}
            </p>
          )}
          {urlError && (
            <p className="error-text" role="alert">
              {urlError}
            </p>
          )}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1 border-t border-line pt-2">
        <IconButton
          data-move={`${image.key}:-1`}
          label={`Subir la foto ${number}`}
          disabled={index === 0}
          onClick={() => onMove(-1)}
          path="M5 12.5 10 7.5l5 5"
        />
        <IconButton
          data-move={`${image.key}:1`}
          label={`Bajar la foto ${number}`}
          disabled={index === total - 1}
          onClick={() => onMove(1)}
          path="m5 7.5 5 5 5-5"
        />
        <button
          type="button"
          onClick={onToggleFocus}
          aria-expanded={focusOpen}
          className="min-h-[44px] rounded-lg px-3 text-xs font-medium text-brand-700 transition hover:bg-blush focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
        >
          {focusOpen ? 'Listo con el encuadre' : 'Encuadre'}
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="ml-auto min-h-[44px] rounded-lg px-3 text-xs font-medium text-ink-500 transition hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
          aria-label={`Quitar la foto ${number} del servicio`}
        >
          Quitar
        </button>
      </div>

      {focusOpen && (
        <div className="mt-3">
          <FocusPicker compact url={image.url} focus={focus} onChange={(next) => onChange({ focus: next })} />
        </div>
      )}
    </li>
  );
}

/**
 * En el borde no se apaga del todo (aria-disabled): si el botón con el
 * foco se deshabilitara, el foco se perdería justo después de mover.
 */
function IconButton({ label, disabled, onClick, path, ...props }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-disabled={disabled || undefined}
      aria-label={label}
      title={label}
      className={cx(
        'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600',
        disabled ? 'text-ink-400 opacity-40' : 'text-ink-600 hover:bg-blush hover:text-brand-700',
      )}
      {...props}
    >
      <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden="true">
        <path d={path} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

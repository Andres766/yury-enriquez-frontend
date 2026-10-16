import { useEffect, useId, useState } from 'react';
import { imageSources } from '../../lib/images.js';
import { focusFor } from '../portfolio/photoImage.js';
import { Button, Input } from '../ui/index.jsx';
import FocusPicker from './FocusPicker.jsx';
import PhotoPicker from './PhotoPicker.jsx';
import { useLibraryByUrl } from './photoLibrary.js';

/**
 * Una foto suelta de la web (la portada de una ocasión, la foto grande
 * del inicio, la de «Sobre mí»): se ve cuál está puesta, se cambia con el
 * selector de fotos y, si hace falta, se le escribe la descripción y se
 * ajusta el encuadre ahí mismo.
 *
 *   value    { url, alt, focus } (url vacía o null = sin foto)
 *   onChange recibe el value nuevo completo
 *   onClear  quita la foto; `clearLabel` dice qué pasa al quitarla
 *            («Quitar foto», «Usar la de siempre»…)
 *
 * Sin `withFocus`, la vista previa usa el encuadre que la foto tiene en
 * Panel → Fotos, que es el mismo que usará la web.
 */
export default function PhotoField({
  label,
  hint,
  value,
  onChange,
  onClear,
  clearLabel = 'Quitar foto',
  emptyText = 'Sin foto',
  withAlt = false,
  withFocus = false,
  altMaxLength = 200,
  errors = {},
  pickerTitle,
}) {
  const url = value?.url || '';
  const [pickerOpen, setPickerOpen] = useState(false);
  const [focusOpen, setFocusOpen] = useState(false);
  const [broken, setBroken] = useState(false);
  const byUrl = useLibraryByUrl();
  const labelId = useId();
  const altId = useId();

  useEffect(() => setBroken(false), [url]);

  // Lo que se ve en la web: el punto elegido aquí o, si no hay, el de la
  // foto en la biblioteca (la misma regla que usa la parte pública).
  const previewFocus = focusFor(url, value?.focus, byUrl);
  const { src, srcSet } = imageSources(url, { widths: [240, 480], fallback: 480 });
  const error = errors.url;

  function pick(photo) {
    onChange({
      url: photo.url,
      // Al cambiar de foto, la descripción y el encuadre de la anterior ya
      // no sirven: se toman los de la foto nueva (Yury los puede cambiar).
      alt: (photo.alt ?? '').slice(0, altMaxLength),
      focus: photo.focus || null,
    });
    setBroken(false);
  }

  return (
    <div role="group" aria-labelledby={labelId}>
      <p id={labelId} className="label-base">
        {label}
      </p>

      <div className="flex gap-3 sm:gap-4">
        {url && !broken ? (
          <img
            src={src}
            srcSet={srcSet}
            sizes="6rem"
            alt=""
            onError={() => setBroken(true)}
            style={{ objectPosition: previewFocus }}
            className="aspect-[4/5] w-24 shrink-0 rounded-xl border border-line bg-blush object-cover"
          />
        ) : (
          <div className="flex aspect-[4/5] w-24 shrink-0 items-center justify-center rounded-xl border border-dashed border-line bg-blush px-2 text-center text-[11px] leading-tight text-ink-500">
            {url ? 'No se pudo cargar' : emptyText}
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
          <Button type="button" size="sm" variant="secondary" className="min-h-[44px]" onClick={() => setPickerOpen(true)}>
            {url ? 'Cambiar foto' : 'Elegir foto'}
          </Button>
          {url && withFocus && (
            <button
              type="button"
              onClick={() => setFocusOpen((v) => !v)}
              aria-expanded={focusOpen}
              className="min-h-[44px] text-xs font-medium text-brand-700 transition hover:underline"
            >
              {focusOpen ? 'Listo con el encuadre' : 'Ajustar encuadre'}
            </button>
          )}
          {url && onClear && (
            <button
              type="button"
              onClick={() => {
                setFocusOpen(false);
                onClear();
              }}
              className="min-h-[44px] text-xs font-medium text-ink-500 transition hover:text-red-700"
            >
              {clearLabel}
            </button>
          )}
        </div>
      </div>

      {hint && !error && <p className="hint-text">{hint}</p>}
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}

      {url && withFocus && focusOpen && (
        <div className="mt-3 rounded-2xl border border-line p-3">
          <FocusPicker
            compact
            url={url}
            focus={previewFocus}
            onChange={(focus) => onChange({ ...value, url, focus })}
          />
          {errors.focus && (
            <p className="error-text" role="alert">
              {errors.focus}
            </p>
          )}
        </div>
      )}

      {url && withAlt && (
        <Input
          id={altId}
          className="mt-3"
          label="¿Qué se ve en la foto?"
          maxLength={altMaxLength}
          value={value?.alt ?? ''}
          onChange={(event) => onChange({ ...value, url, alt: event.target.value })}
          error={errors.alt}
          placeholder="Ej.: Yury maquillando a una novia frente al espejo"
          hint="Una frase corta. La leen en voz alta los celulares de las personas ciegas y ayuda a Google a entender la foto."
        />
      )}

      <PhotoPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={pick}
        selectedUrls={url ? [url] : []}
        title={pickerTitle ?? `Elegir: ${label.toLowerCase()}`}
      />
    </div>
  );
}

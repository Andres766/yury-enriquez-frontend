import { useId } from 'react';
import { cx } from '../ui/index.jsx';

/**
 * Editor de viñetas de "Qué incluye" (panel).
 *
 * Una fila por viñeta, con subir y quitar. Las filas vacías no molestan:
 * el backend las descarta al guardar, así que se puede dejar una en
 * blanco al final sin que salte un error.
 */
export default function IncludesEditor({ label, items, onChange, hint, error, max = 12, maxLength = 140, placeholder }) {
  const id = useId();
  const update = (index, value) => onChange(items.map((item, i) => (i === index ? value : item)));
  const remove = (index) => onChange(items.filter((_, i) => i !== index));
  const moveUp = (index) => {
    if (index === 0) return;
    const next = [...items];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onChange(next);
  };

  const iconButton =
    'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-ink-400 transition hover:bg-blush hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 disabled:opacity-30';

  return (
    <fieldset aria-describedby={hint || error ? `${id}-help` : undefined}>
      {/* La leyenda tiene que ser el primer hijo del fieldset para que el
          lector de pantalla la asocie; la visible va junto al botón. */}
      <legend className="sr-only">{label}</legend>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="label-base mb-0" aria-hidden="true">
          {label} <span className="ml-1 text-xs font-normal text-ink-400">(opcional)</span>
        </p>
        <button
          type="button"
          onClick={() => onChange([...items, ''])}
          disabled={items.length >= max}
          className="min-h-[44px] text-xs font-medium text-brand-700 transition hover:underline disabled:text-ink-400"
        >
          + Añadir viñeta
        </button>
      </div>

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line p-4 text-sm text-ink-400">
          Sin viñetas. Si no hay ninguna, la sección no aparece en la web.
        </p>
      ) : (
        <ol className="space-y-2">
          {items.map((item, index) => (
            <li key={index} className="flex items-center gap-1.5">
              <input
                type="text"
                value={item}
                onChange={(e) => update(index, e.target.value)}
                maxLength={maxLength}
                placeholder={index === 0 ? placeholder : undefined}
                aria-label={`Viñeta ${index + 1}`}
                className={cx('input-base px-3 py-2 text-sm', error && 'border-red-400')}
              />
              <button type="button" onClick={() => moveUp(index)} disabled={index === 0} className={iconButton} aria-label={`Subir la viñeta ${index + 1}`}>
                <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden="true">
                  <path d="M8 12.5v-9m0 0L4.5 7M8 3.5 11.5 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => remove(index)}
                className={cx(iconButton, 'hover:bg-red-50 hover:text-red-700')}
                aria-label={`Quitar la viñeta ${index + 1}`}
              >
                <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden="true">
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </li>
          ))}
        </ol>
      )}

      {error ? (
        <p id={`${id}-help`} className="error-text" role="alert">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-help`} className="hint-text">
            {hint}
          </p>
        )
      )}
    </fieldset>
  );
}

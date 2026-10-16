import { useId } from 'react';
import { imageSources } from '../../lib/images.js';
import { cx } from '../ui/index.jsx';
import { formatFocus, parseFocus } from './photoLibrary.js';

/**
 * Punto de enfoque de una foto: lo que nunca se recorta.
 *
 * La web muestra la misma foto en casillas de formas distintas
 * (verticales 4:5 en tarjetas, cuadradas en miniaturas). Si la cara
 * queda arriba y la casilla recorta el centro, se pierde la cara. Yury
 * toca en la foto el punto importante (normalmente los ojos) y ve al
 * lado cómo queda en cada forma.
 *
 * Sin pantalla táctil ni ratón: nueve botones (arriba, centro, abajo ×
 * izquierda, centro, derecha) y, con la foto enfocada, las flechas la
 * mueven de 5 en 5.
 */

const PRESETS = [
  { x: 20, y: 20, label: 'Arriba a la izquierda' },
  { x: 50, y: 20, label: 'Arriba al centro' },
  { x: 80, y: 20, label: 'Arriba a la derecha' },
  { x: 20, y: 50, label: 'Centro a la izquierda' },
  { x: 50, y: 50, label: 'Centro' },
  { x: 80, y: 50, label: 'Centro a la derecha' },
  { x: 20, y: 80, label: 'Abajo a la izquierda' },
  { x: 50, y: 80, label: 'Abajo al centro' },
  { x: 80, y: 80, label: 'Abajo a la derecha' },
];

const STEP = 5;

export default function FocusPicker({ url, focus, onChange, compact = false }) {
  const [x, y] = parseFocus(focus);
  const hintId = useId();
  const { src, srcSet } = imageSources(url, { widths: [480, 960], fallback: 960 });

  // Con clic (no al apoyar el dedo) para que deslizar sobre la foto
  // siga desplazando la hoja sin mover el punto por accidente.
  function pick(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    onChange(
      formatFocus(((event.clientX - rect.left) / rect.width) * 100, ((event.clientY - rect.top) / rect.height) * 100),
    );
  }

  function onKeyDown(event) {
    const moves = { ArrowLeft: [-STEP, 0], ArrowRight: [STEP, 0], ArrowUp: [0, -STEP], ArrowDown: [0, STEP] };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    onChange(formatFocus(x + move[0], y + move[1]));
  }

  return (
    <div className={cx('grid gap-4', !compact && 'sm:grid-cols-[minmax(0,1fr)_auto]')}>
      <div>
        {/* La foto completa, sin recortar: así se ve qué se está eligiendo. */}
        <div className="flex justify-center rounded-2xl bg-blush p-2">
          <div
            role="group"
            aria-roledescription="selector de punto de enfoque"
            tabIndex={0}
            onClick={pick}
            onKeyDown={onKeyDown}
            aria-label={`Punto de enfoque: ${x} % desde la izquierda, ${y} % desde arriba. Toca la foto o usa las flechas para moverlo.`}
            aria-describedby={hintId}
            className="relative inline-block max-w-full cursor-crosshair select-none rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
          >
            <img
              src={src}
              srcSet={srcSet}
              sizes="(min-width: 640px) 26rem, 90vw"
              alt=""
              draggable={false}
              className={cx('block h-auto w-auto max-w-full rounded-lg', compact ? 'max-h-56' : 'max-h-[42vh]')}
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface shadow-lift ring-2 ring-brand-600"
              style={{ left: `${x}%`, top: `${y}%` }}
            >
              <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-600" />
            </span>
          </div>
        </div>
        <p id={hintId} className="hint-text">
          Toca en la foto lo que no se debe cortar, por ejemplo los ojos.
        </p>
      </div>

      <div className="flex flex-wrap items-start gap-4 sm:flex-col">
        <fieldset>
          <legend className="mb-1.5 text-xs font-medium text-ink-600">Atajos</legend>
          <div className="grid w-[8.75rem] grid-cols-3 gap-1">
            {PRESETS.map((preset) => {
              const active = preset.x === x && preset.y === y;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => onChange(formatFocus(preset.x, preset.y))}
                  aria-pressed={active}
                  aria-label={preset.label}
                  title={preset.label}
                  className={cx(
                    'flex h-11 w-11 items-center justify-center rounded-lg border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600',
                    active ? 'border-brand-500 bg-brand-100' : 'border-line bg-surface hover:border-brand-300',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cx('h-2 w-2 rounded-full', active ? 'bg-brand-600' : 'bg-ink-400')}
                  />
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="flex items-end gap-3" aria-label="Así se verá" role="group">
          <Preview url={url} focus={focus} ratio="aspect-[4/5]" width="w-20" label="Tarjeta" />
          <Preview url={url} focus={focus} ratio="aspect-square" width="w-20" label="Cuadrada" />
        </div>
      </div>
    </div>
  );
}

function Preview({ url, focus, ratio, width, label }) {
  const { src, srcSet } = imageSources(url, { widths: [240, 480], fallback: 480 });
  return (
    <figure className={width}>
      <img
        src={src}
        srcSet={srcSet}
        sizes="5rem"
        alt=""
        style={{ objectPosition: focus }}
        className={cx('w-full rounded-lg border border-line bg-blush object-cover', ratio)}
      />
      <figcaption className="mt-1 text-center text-[11px] text-ink-500">{label}</figcaption>
    </figure>
  );
}

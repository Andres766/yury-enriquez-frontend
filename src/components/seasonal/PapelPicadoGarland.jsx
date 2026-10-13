import { PapelPicado } from './HalloweenIcons.jsx';

/**
 * Guirnalda de papel picado colgada de un hilo en catenaria.
 *
 * El hilo es una curva cuadrática en un SVG estirado
 * (`preserveAspectRatio="none"`); cada banderín se coloca sobre la
 * misma curva calculando su altura en el punto `t` donde cuelga, así
 * que hilo y banderines coinciden a cualquier ancho de pantalla.
 *
 * Los colores alternan los del Día de Muertos dentro de la paleta del
 * tema. Decorativa: `aria-hidden` y sin eventos de puntero.
 */

const FLAGS = 13;
const TOP = 4; // px: altura del hilo en los extremos
const SAG = 22; // px: cuánto cae el hilo en el centro

const COLORS = [
  'text-brand-500',
  'text-[rgb(var(--c-rose))]',
  'text-gold-500',
  'text-[rgb(150_96_200)]',
  'text-emerald-500',
];

/** Altura del hilo (px) en la posición t ∈ [0, 1]. */
const curveY = (t) => TOP + 4 * SAG * t * (1 - t);

export default function PapelPicadoGarland({ className = '' }) {
  return (
    <div aria-hidden="true" className={`pointer-events-none relative h-24 ${className}`}>
      <svg
        className="absolute inset-x-0 top-0 h-full w-full text-ink-500/70"
        viewBox="0 0 100 96"
        preserveAspectRatio="none"
        fill="none"
      >
        <path
          d={`M0 ${TOP} Q50 ${TOP + 2 * SAG} 100 ${TOP}`}
          stroke="currentColor"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {Array.from({ length: FLAGS }, (_, i) => {
        // Se deja un margen en los extremos para que no cuelguen del borde
        const t = 0.04 + (i / (FLAGS - 1)) * 0.92;
        return (
          // El contenedor centra el banderín sobre su punto del hilo; el
          // hijo es el que se mece, para que la animación (transform) no
          // pise el translate del centrado.
          <span
            key={i}
            className={`absolute w-[9%] max-w-[2.4rem] -translate-x-1/2 sm:w-[5.2%] ${
              i % 2 === 1 ? 'hidden sm:block' : ''
            }`}
            style={{ left: `${t * 100}%`, top: `${curveY(t) - 1}px` }}
          >
            <span
              className={`block origin-top animate-papel-sway ${COLORS[i % COLORS.length]}`}
              style={{
                animationDelay: `${-(i * 0.37) % 3.6}s`,
                animationDuration: `${3.2 + (i % 4) * 0.4}s`,
              }}
            >
              <PapelPicado className="block h-auto w-full opacity-90 drop-shadow-[0_4px_6px_rgb(0_0_0/0.35)]" />
            </span>
          </span>
        );
      })}
    </div>
  );
}

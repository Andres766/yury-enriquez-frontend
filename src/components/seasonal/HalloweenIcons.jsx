/**
 * Ilustraciones de temporada.
 *
 * Dibujadas a mano en SVG, en línea fina y sin relleno, para que se lean
 * como adorno de marca y no como pegatinas. Todas heredan `currentColor`
 * y el grosor de trazo, así que se pueden teñir y escalar desde las
 * clases de Tailwind sin tocar el componente.
 *
 * La catrina es la pieza central a propósito: el maquillaje de catrina
 * es un servicio real de temporada para una maquilladora, no un adorno
 * genérico de Halloween. Por eso lleva más detalle que el resto.
 *
 * Todas son decorativas: se marcan `aria-hidden` en quien las usa.
 */

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

/** Murciélago con las alas desplegadas. */
export function Bat({ className, strokeWidth = 1.4 }) {
  return (
    <svg viewBox="0 0 64 32" className={className} {...base} strokeWidth={strokeWidth}>
      <path d="M32 7c2.3 0 3.9 1.8 4.5 4 2.3-2.8 5.3-5 9.1-6 1.3-.3 2.2.8 1.8 2-.7 2.4-.5 4.7.6 6.9 2.8-1.1 6-.9 8.8.7 1.3.8.9 2.6-.6 2.8-4.3.8-7.5 3.2-9.7 6.7-.8 1.2-2.5 1-2.9-.4-.5-2-1.9-3.5-3.7-4.5-2 2.2-4.8 3.5-8 3.5s-6-1.3-8-3.5c-1.8 1-3.2 2.5-3.7 4.5-.4 1.4-2.1 1.6-2.9.4-2.2-3.5-5.4-5.9-9.7-6.7-1.5-.2-1.9-2-.6-2.8 2.8-1.6 6-1.8 8.8-.7 1.1-2.2 1.3-4.5.6-6.9-.4-1.2.5-2.3 1.8-2 3.8 1 6.8 3.2 9.1 6 .6-2.2 2.2-4 4.5-4Z" />
      <path d="M32 11v5" opacity=".6" />
    </svg>
  );
}

/** Calavera de azúcar, con pétalos alrededor de las cuencas. */
export function SugarSkull({ className, strokeWidth = 1.4 }) {
  return (
    <svg viewBox="0 0 64 64" className={className} {...base} strokeWidth={strokeWidth}>
      {/* Cráneo */}
      <path d="M32 5c-12.7 0-21 8.2-21 19.6 0 6.2 2.5 11 6.2 14v5.8c0 3.3 2.2 5.6 5.4 5.6h18.8c3.2 0 5.4-2.3 5.4-5.6v-5.8c3.7-3 6.2-7.8 6.2-14C53 13.2 44.7 5 32 5Z" />

      {/* Cuencas */}
      <circle cx="22.5" cy="26" r="5.6" />
      <circle cx="41.5" cy="26" r="5.6" />

      {/* Pétalos alrededor de cada cuenca */}
      {[
        [22.5, 26],
        [41.5, 26],
      ].map(([cx, cy]) =>
        [0, 60, 120, 180, 240, 300].map((deg) => {
          const rad = (deg * Math.PI) / 180;
          return (
            <circle
              key={`${cx}-${deg}`}
              cx={cx + Math.cos(rad) * 8}
              cy={cy + Math.sin(rad) * 8}
              r="1.7"
              opacity=".7"
            />
          );
        }),
      )}

      {/* Nariz de corazón invertido */}
      <path d="M32 33c-1.6 1.2-3 2.6-3 4.1 0 1.2 1.3 2 3 3.4 1.7-1.4 3-2.2 3-3.4 0-1.5-1.4-2.9-3-4.1Z" />

      {/* Boca cosida */}
      <path d="M20 47h24" />
      {[24, 28, 32, 36, 40].map((x) => (
        <path key={x} d={`M${x} 43.5v7`} opacity=".8" />
      ))}

      {/* Flor en la frente */}
      <circle cx="32" cy="14" r="2.2" />
      {[0, 72, 144, 216, 288].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        return (
          <circle
            key={deg}
            cx={32 + Math.cos(rad) * 4.6}
            cy={14 + Math.sin(rad) * 4.6}
            r="1.6"
            opacity=".75"
          />
        );
      })}
    </svg>
  );
}

/**
 * Catrina: calavera con corona de flores y velo.
 * La pieza más elaborada del set, por ser la que da nombre a la
 * temporada en un estudio de maquillaje.
 */
export function Catrina({ className, strokeWidth = 1.3 }) {
  return (
    <svg viewBox="0 0 72 96" className={className} {...base} strokeWidth={strokeWidth}>
      {/* Ala del sombrero */}
      <path d="M8 27c0-3.5 12.5-6.5 28-6.5S64 23.5 64 27s-12.5 6.5-28 6.5S8 30.5 8 27Z" />
      {/* Copa */}
      <path d="M19 26c0-7 2-15 4.5-18.5C26 4 31 2.5 36 2.5S46 4 48.5 7.5C51 11 53 19 53 26" />
      {/* Cinta */}
      <path d="M20.5 22.5c10-2.5 21-2.5 31 0" opacity=".8" />

      {/* Flores en el sombrero */}
      {[
        [21, 20, 3.4],
        [30, 17.5, 2.8],
        [46, 19, 3],
        [54, 22, 2.4],
      ].map(([cx, cy, r], i) => (
        <g key={i}>
          <circle cx={cx} cy={cy} r={r * 0.4} />
          {[0, 72, 144, 216, 288].map((deg) => {
            const rad = (deg * Math.PI) / 180;
            return (
              <circle
                key={deg}
                cx={cx + Math.cos(rad) * r}
                cy={cy + Math.sin(rad) * r}
                r={r * 0.46}
                opacity=".8"
              />
            );
          })}
        </g>
      ))}

      {/* Rostro */}
      <path d="M36 32c-9.5 0-15.8 6.2-15.8 14.8 0 4.7 1.9 8.3 4.7 10.6v4.4c0 2.5 1.7 4.2 4.1 4.2h14c2.4 0 4.1-1.7 4.1-4.2v-4.4c2.8-2.3 4.7-5.9 4.7-10.6C51.8 38.2 45.5 32 36 32Z" />

      {/* Ojos con pestañas pintadas */}
      <circle cx="29.5" cy="46" r="4.2" />
      <circle cx="42.5" cy="46" r="4.2" />
      {[29.5, 42.5].map((cx) =>
        [-60, -30, 0, 30, 60].map((deg) => {
          const rad = ((deg - 90) * Math.PI) / 180;
          return (
            <path
              key={`${cx}-${deg}`}
              d={`M${cx + Math.cos(rad) * 4.6} ${46 + Math.sin(rad) * 4.6} L${cx + Math.cos(rad) * 7.4} ${46 + Math.sin(rad) * 7.4}`}
              opacity=".75"
            />
          );
        }),
      )}

      {/* Nariz y boca cosida */}
      <path d="M36 51.5c-1.2.9-2.2 2-2.2 3.1 0 .9 1 1.5 2.2 2.6 1.2-1.1 2.2-1.7 2.2-2.6 0-1.1-1-2.2-2.2-3.1Z" />
      <path d="M27.5 61.5h17" />
      {[30.5, 34, 37.5, 41].map((x) => (
        <path key={x} d={`M${x} 59v5`} opacity=".8" />
      ))}

      {/* Cuello y cuello de encaje */}
      <path d="M30 66.5v4.5c0 2-2 3-4 3.5m16-8v4.5c0 2 2 3 4 3.5" />
      <path d="M14 82c0-4.5 9.8-8 22-8s22 3.5 22 8" />
      {[20, 28, 36, 44, 52].map((x) => (
        <circle key={x} cx={x} cy={80 - Math.abs(36 - x) * 0.18} r="2.2" opacity=".65" />
      ))}
    </svg>
  );
}

/** Telaraña de esquina. Se gira con `rotate-*` según dónde vaya. */
export function Cobweb({ className, strokeWidth = 1 }) {
  return (
    <svg viewBox="0 0 120 120" className={className} {...base} strokeWidth={strokeWidth}>
      {/* Radios */}
      <path d="M0 0 L120 46 M0 0 L104 78 M0 0 L78 104 M0 0 L46 120 M0 0 L118 14 M0 0 L14 118" />
      {/* Hilos en catenaria */}
      {[20, 38, 58, 80, 104].map((r) => (
        <path
          key={r}
          d={`M${r * 0.98} ${r * 0.12} Q${r * 0.72} ${r * 0.72} ${r * 0.12} ${r * 0.98}`}
          opacity=".85"
        />
      ))}
      {/* Araña colgando */}
      <path d="M62 30v9" opacity=".7" />
      <ellipse cx="62" cy="43" rx="3.4" ry="4" />
      <path d="M59 40l-4-3M59 43h-5M59 46l-4 3M65 40l4-3M65 43h5M65 46l4 3" opacity=".8" />
    </svg>
  );
}

/** Calabaza con gajos. */
export function Pumpkin({ className, strokeWidth = 1.4 }) {
  return (
    <svg viewBox="0 0 64 64" className={className} {...base} strokeWidth={strokeWidth}>
      <path d="M32 18c-2.5 0-4.4 1.2-5.8 3-1.6-1.4-3.4-2-5.4-2C13.6 19 9 26 9 35.5S14.5 55 21.5 55c2 0 3.9-.7 5.5-2 1.5 1.3 3.2 2 5 2s3.5-.7 5-2c1.6 1.3 3.5 2 5.5 2 7 0 12.5-10 12.5-19.5S49.4 19 42.2 19c-2 0-3.8.6-5.4 2-1.4-1.8-3.3-3-5.8-3Z" />
      <path d="M32 19v34M23 22c-2 4-3 8.5-3 13.5S21 45 23 49M41 22c2 4 3 8.5 3 13.5S43 45 41 49" opacity=".65" />
      <path d="M32 18V9c0-3 2.5-5 5.5-5" />
      <path d="M37.5 4c2.5 1.5 3.5 4 3 6.5" opacity=".7" />
    </svg>
  );
}

/** Luna creciente con cráteres. */
export function Moon({ className, strokeWidth = 1.3 }) {
  return (
    <svg viewBox="0 0 64 64" className={className} {...base} strokeWidth={strokeWidth}>
      <path d="M40 4a28 28 0 1 0 20 47.5A24 24 0 0 1 40 4Z" />
      <circle cx="30" cy="28" r="4" opacity=".55" />
      <circle cx="22" cy="42" r="2.6" opacity=".45" />
      <circle cx="38" cy="47" r="1.8" opacity=".4" />
    </svg>
  );
}

/** Vela encendida: el guiño más sobrio del set. */
export function Candle({ className, strokeWidth = 1.4 }) {
  return (
    <svg viewBox="0 0 32 64" className={className} {...base} strokeWidth={strokeWidth}>
      <path d="M16 6c3.5 4 5 6.8 5 9.4a5 5 0 0 1-10 0C11 12.8 12.5 10 16 6Z" />
      <path d="M16 20.5v4" opacity=".7" />
      <path d="M9.5 24.5h13v30h-13z" />
      <path d="M9.5 30.5c2.5 1.6 4.5 1.6 6.5 0s4 1.6 6.5 0" opacity=".6" />
      <path d="M6.5 54.5h19" />
    </svg>
  );
}

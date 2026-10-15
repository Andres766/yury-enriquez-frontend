import { motion, useReducedMotion } from 'framer-motion';
import { useSettings } from '../../context/SettingsContext.jsx';
import { Bat, Catrina, Cobweb, SugarSkull, Marigold } from '../seasonal/HalloweenIcons.jsx';

/**
 * Ambientación de temporada.
 *
 * Solo se dibuja con el tema Halloween activo. Es puramente decorativa:
 * `aria-hidden`, `pointer-events-none` y fuera del flujo, así que no
 * estorba a la navegación por teclado ni la anuncia un lector de
 * pantalla.
 *
 * Poca y en los márgenes, a propósito. Antes había luna, bruma, cuatro
 * telarañas, calabaza, vela, seis murciélagos, tres calaveras, dieciséis
 * chispas y diez pétalos: competía con las fotos, que son lo que se
 * vende. La temporada la cuenta ahora la foto de la portada (una catrina
 * real de Yury); aquí queda un acento:
 *
 *   · un resplandor cálido arriba
 *   · la catrina como marca de agua (solo en pantallas grandes)
 *   · una telaraña y dos murciélagos, desde `sm`
 *   · una calavera de azúcar, desde `md`
 *   · pocos pétalos de cempasúchil cayendo (tres en el celular)
 *
 * Todo vive por debajo del contenido (`z-0` contra el `z-10` del
 * <main>): se ve en los márgenes y entre secciones, nunca encima del
 * texto. Las animaciones son CSS y se apagan solas con
 * `prefers-reduced-motion` (regla global en index.css).
 */

/** Generador determinista: las partículas no saltan entre renders. */
function seeded(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const rand = seeded(1031);

const PETALS = Array.from({ length: 6 }, (_, i) => ({
  left: `${rand() * 96}%`,
  size: 10 + Math.round(rand() * 8),
  duration: 16 + rand() * 12,
  delay: -rand() * 28,
  dx: `${Math.round((rand() - 0.3) * 160)}px`,
  // La mitad solo desde `sm`, para aligerar el móvil
  desktopOnly: i % 2 === 1,
  gold: i % 2 === 0,
}));

const BATS = [
  { pos: 'left-[8%] top-[18%]', size: 'h-8 w-8 lg:h-10 lg:w-10', tone: 'text-ink-900/35' },
  { pos: 'right-[10%] top-[62%]', size: 'h-6 w-6 lg:h-7 lg:w-7', tone: 'text-ink-900/25' },
];

export default function SeasonalDecor() {
  const { theme } = useSettings();
  const reduced = useReducedMotion();

  if (theme !== 'HALLOWEEN') return null;

  /** Deriva suave; si el sistema pide menos movimiento, se queda quieto. */
  const drift = (i) =>
    reduced
      ? {}
      : {
          animate: { y: [0, -14, 0], x: [0, 10, 0], rotate: [-4, 4, -4] },
          transition: {
            duration: 9 + i * 2.4,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 1.3,
          },
        };

  const breathe = (i) =>
    reduced
      ? {}
      : {
          animate: { opacity: [0.6, 1, 0.6] },
          transition: { duration: 4 + i, repeat: Infinity, ease: 'easeInOut', delay: i * 0.8 },
        };

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* Resplandor cálido arriba a la derecha */}
      <div className="absolute -right-16 -top-20 h-96 w-96 rounded-full bg-gold-500/[0.12] blur-3xl" />

      {/* La catrina, anclada al borde izquierdo: marca de agua, no protagonista */}
      <motion.div {...breathe(2)} className="absolute -left-4 bottom-16 hidden xl:block">
        <Catrina className="h-80 w-auto text-brand-500/15" />
      </motion.div>

      <Cobweb className="absolute -left-3 -top-3 hidden h-36 w-36 text-ink-600/25 sm:block" />

      {BATS.map((bat, i) => (
        <motion.div key={i} {...drift(i)} className={`absolute hidden sm:block ${bat.pos}`}>
          <Bat className={`${bat.size} ${bat.tone}`} />
        </motion.div>
      ))}

      <SugarSkull className="absolute right-[6%] top-[38%] hidden h-10 w-10 text-gold-500/25 md:block" />

      {/* Pétalos de cempasúchil cayendo */}
      {PETALS.map((p, i) => (
        <span
          key={`p${i}`}
          className={`absolute top-0 animate-petal-fall ${p.desktopOnly ? 'hidden sm:block' : ''}`}
          style={{
            left: p.left,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            '--petal-dx': p.dx,
          }}
        >
          <Marigold
            className={p.gold ? 'text-gold-500/50' : 'text-brand-500/45'}
            style={{ width: p.size, height: p.size }}
          />
        </span>
      ))}
    </div>
  );
}

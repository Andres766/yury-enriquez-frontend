import { motion, useReducedMotion } from 'framer-motion';
import { useSettings } from '../../context/SettingsContext.jsx';
import { Bat, Catrina, Cobweb, Moon, Pumpkin, SugarSkull, Candle, Marigold } from '../seasonal/HalloweenIcons.jsx';

/**
 * Ambientación de temporada.
 *
 * Solo se dibuja con el tema Halloween activo. Es puramente decorativa:
 * `aria-hidden`, `pointer-events-none` y fuera del flujo, así que no
 * estorba a la navegación por teclado ni la anuncia un lector de
 * pantalla.
 *
 * Está montada en capas de profundidad:
 *
 *   fondo   — luna con halo, resplandores y bruma a ras de suelo
 *   media   — telarañas de esquina, catrina, calabaza y vela
 *   frente  — murciélagos, calaveras, chispas que suben y pétalos de
 *             cempasúchil que caen
 *
 * Todo vive por debajo del contenido (`z-0` contra el `z-10` del
 * <main>): se ve en los márgenes y entre secciones, nunca encima del
 * texto. Las animaciones son CSS y se apagan solas con
 * `prefers-reduced-motion` (regla global en index.css).
 *
 * En móvil se recorta a lo esencial (`hidden sm:block` en lo
 * accesorio) y hay menos partículas: ahí el adorno compite con el
 * contenido y con la batería.
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

const EMBERS = Array.from({ length: 16 }, (_, i) => ({
  left: `${4 + rand() * 92}%`,
  size: 2 + Math.round(rand() * 3),
  duration: 8 + rand() * 8,
  delay: -rand() * 16,
  dx: `${Math.round((rand() - 0.5) * 120)}px`,
  // La mitad solo desde `sm`, para aligerar el móvil
  desktopOnly: i % 2 === 1,
  gold: i % 3 === 0,
}));

const PETALS = Array.from({ length: 10 }, (_, i) => ({
  left: `${rand() * 96}%`,
  size: 10 + Math.round(rand() * 9),
  duration: 14 + rand() * 12,
  delay: -rand() * 26,
  dx: `${Math.round((rand() - 0.3) * 160)}px`,
  desktopOnly: i % 2 === 1,
  gold: i % 2 === 0,
}));

const BATS = [
  { pos: 'left-[8%] top-[16%]', size: 'h-8 w-8 sm:h-11 sm:w-11', tone: 'text-ink-900/45' },
  { pos: 'right-[12%] top-[30%]', size: 'h-6 w-6 sm:h-8 sm:w-8', tone: 'text-ink-900/35' },
  { pos: 'left-[22%] top-[60%]', size: 'h-7 w-7 sm:h-9 sm:w-9', tone: 'text-ink-900/30' },
  { pos: 'right-[26%] top-[76%]', size: 'h-5 w-5 sm:h-6 sm:w-6', tone: 'text-ink-900/30' },
  { pos: 'left-[60%] top-[10%]', size: 'hidden sm:block h-6 w-6', tone: 'text-ink-900/30' },
  { pos: 'left-[42%] top-[40%]', size: 'hidden lg:block h-5 w-5', tone: 'text-ink-900/25' },
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
          animate: { y: [0, -16, 0], x: [0, 12, 0], rotate: [-4, 4, -4] },
          transition: {
            duration: 8 + i * 2.2,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 1.1,
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
      {/* ── Fondo ──────────────────────────────────────────────── */}

      {/* Halo de luna arriba a la derecha y bruma morada abajo */}
      <div className="absolute -right-16 -top-20 h-96 w-96 rounded-full bg-gold-500/[0.16] blur-3xl" />
      <div className="absolute -bottom-32 -left-24 h-[28rem] w-[28rem] rounded-full bg-brand-600/[0.12] blur-3xl" />
      <div className="absolute left-1/3 top-1/2 h-80 w-80 rounded-full bg-[rgb(140_90_190/0.10)] blur-3xl" />

      <motion.div {...breathe(0)} className="absolute right-10 top-24 hidden lg:block">
        <div className="absolute inset-0 scale-150 rounded-full bg-gold-500/20 blur-2xl" />
        <Moon className="relative h-20 w-20 text-gold-500/60" />
      </motion.div>

      {/* Bruma a ras de suelo: dos capas que se cruzan a distinta velocidad */}
      <div className="absolute inset-x-0 bottom-0 h-[32vh] overflow-hidden opacity-70">
        <div
          className="absolute inset-y-0 left-0 w-[200%] animate-fog-drift"
          style={{
            backgroundImage:
              'radial-gradient(40% 60% at 20% 100%, rgb(140 90 190 / 0.22), transparent 70%), radial-gradient(35% 50% at 55% 100%, rgb(160 146 176 / 0.14), transparent 70%), radial-gradient(40% 60% at 85% 100%, rgb(140 90 190 / 0.2), transparent 70%)',
            backgroundSize: '50% 100%',
            backgroundRepeat: 'repeat-x',
          }}
        />
        <div
          className="absolute inset-y-0 left-0 w-[200%] animate-fog-drift"
          style={{
            animationDuration: '95s',
            animationDirection: 'reverse',
            backgroundImage:
              'radial-gradient(30% 45% at 35% 100%, rgb(240 146 62 / 0.08), transparent 70%), radial-gradient(45% 55% at 75% 100%, rgb(160 146 176 / 0.12), transparent 70%)',
            backgroundSize: '50% 100%',
            backgroundRepeat: 'repeat-x',
          }}
        />
      </div>

      {/* ── Capa media ─────────────────────────────────────────── */}

      {/* Telarañas de esquina */}
      <Cobweb className="absolute -left-3 -top-3 h-32 w-32 text-ink-600/40 sm:h-48 sm:w-48" />
      <Cobweb className="absolute -right-3 -top-3 hidden h-40 w-40 -scale-x-100 text-ink-600/30 sm:block" />
      <Cobweb className="absolute -bottom-4 -left-4 hidden h-32 w-32 -scale-y-100 text-ink-600/25 md:block" />
      <Cobweb className="absolute -bottom-4 -right-4 hidden h-36 w-36 -scale-100 text-ink-600/25 lg:block" />

      {/* La catrina, anclada al borde izquierdo: marca de agua, no protagonista */}
      <motion.div {...breathe(2)} className="absolute -left-4 bottom-16 hidden xl:block">
        <Catrina className="h-80 w-auto text-brand-500/20" />
      </motion.div>

      {/* Calabaza y vela a ras de suelo, con su resplandor */}
      <div className="absolute bottom-6 right-10 hidden items-end gap-4 lg:flex">
        <div className="relative">
          <div className="absolute inset-2 rounded-full bg-brand-500/25 blur-xl" />
          <Pumpkin className="relative h-16 w-16 text-brand-500/55" />
        </div>
        <div className="relative">
          <div className="absolute -top-2 left-1/2 h-10 w-10 -translate-x-1/2 animate-flicker rounded-full bg-gold-500/35 blur-lg" />
          <Candle className="relative h-20 w-auto text-gold-500/55" />
        </div>
      </div>

      {/* ── Frente ─────────────────────────────────────────────── */}

      {/* Murciélagos a distintas alturas y velocidades */}
      {BATS.map((bat, i) => (
        <motion.div key={i} {...drift(i)} className={`absolute ${bat.pos}`}>
          <Bat className={`${bat.size} ${bat.tone}`} />
        </motion.div>
      ))}

      {/* Calaveras de azúcar */}
      <SugarSkull className="absolute left-[5%] top-[44%] hidden h-12 w-12 text-brand-500/30 md:block" />
      <SugarSkull className="absolute right-[6%] top-[58%] hidden h-10 w-10 text-gold-500/30 lg:block" />
      <SugarSkull className="absolute left-[48%] top-[88%] hidden h-8 w-8 text-brand-500/25 xl:block" />

      {/* Chispas que suben, como de vela */}
      {EMBERS.map((e, i) => (
        <span
          key={`e${i}`}
          className={`absolute bottom-0 animate-ember-rise rounded-full ${e.desktopOnly ? 'hidden sm:block' : ''} ${
            e.gold ? 'bg-gold-500' : 'bg-brand-500'
          }`}
          style={{
            left: e.left,
            width: e.size,
            height: e.size,
            animationDuration: `${e.duration}s`,
            animationDelay: `${e.delay}s`,
            '--ember-dx': e.dx,
            boxShadow: `0 0 ${e.size * 3}px ${e.size}px rgb(240 146 62 / 0.45)`,
          }}
        />
      ))}

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
            className={p.gold ? 'text-gold-500/60' : 'text-brand-500/55'}
            style={{ width: p.size, height: p.size }}
          />
        </span>
      ))}
    </div>
  );
}

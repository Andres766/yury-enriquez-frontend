import { motion, useReducedMotion } from 'framer-motion';
import { useSettings } from '../../context/SettingsContext.jsx';
import { Bat, Catrina, Cobweb, Moon, Pumpkin, SugarSkull, Candle } from '../seasonal/HalloweenIcons.jsx';

/**
 * Ambientación de temporada.
 *
 * Solo se dibuja con el tema Halloween activo. Es puramente decorativa:
 * `aria-hidden`, `pointer-events-none` y fuera del flujo, así que no
 * estorba a la navegación por teclado ni la anuncia un lector de
 * pantalla.
 *
 * Está montada en tres capas de profundidad, con opacidades muy bajas,
 * para que se lea como textura y no como un collage encima del
 * contenido:
 *
 *   fondo   — luna y resplandores difusos
 *   media   — telarañas de esquina y la catrina, ancladas a los bordes
 *   frente  — murciélagos y calaveras pequeñas, con deriva lenta
 *
 * Sigue siendo una marca de belleza: la contención es la decisión de
 * diseño, no un descuido. Nada se cruza por delante del texto y todo
 * vive por debajo del contenido (`z-0` contra el `z-10` del <main>).
 *
 * En pantallas pequeñas se recorta a lo esencial (`hidden sm:block` en
 * lo accesorio): en un móvil el adorno compite con el contenido.
 */
export default function SeasonalDecor() {
  const { theme } = useSettings();
  const reduced = useReducedMotion();

  if (theme !== 'HALLOWEEN') return null;

  /** Deriva suave; si el sistema pide menos movimiento, se queda quieto. */
  const drift = (i) =>
    reduced
      ? {}
      : {
          animate: { y: [0, -14, 0], x: [0, 10, 0], rotate: [-3, 3, -3] },
          transition: {
            duration: 9 + i * 2.5,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 1.3,
          },
        };

  const breathe = (i) =>
    reduced
      ? {}
      : {
          animate: { opacity: [0.5, 1, 0.5] },
          transition: { duration: 4 + i, repeat: Infinity, ease: 'easeInOut', delay: i * 0.8 },
        };

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* ── Fondo ──────────────────────────────────────────────── */}

      {/* Resplandor de luna arriba a la derecha */}
      <div className="absolute -right-20 -top-24 h-80 w-80 rounded-full bg-gold-500/10 blur-3xl" />
      {/* Bruma morada abajo a la izquierda */}
      <div className="absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-brand-600/[0.07] blur-3xl" />

      <motion.div {...breathe(0)} className="absolute right-8 top-10 hidden lg:block">
        <Moon className="h-16 w-16 text-gold-500/25" />
      </motion.div>

      {/* ── Capa media ─────────────────────────────────────────── */}

      {/* Telarañas de esquina */}
      <Cobweb className="absolute -left-3 -top-3 h-28 w-28 text-brand-400/20 sm:h-40 sm:w-40" />
      <Cobweb className="absolute -right-3 -top-3 hidden h-32 w-32 -scale-x-100 text-brand-400/[0.14] sm:block" />
      <Cobweb className="absolute -bottom-4 -right-4 hidden h-24 w-24 -scale-100 text-brand-400/10 lg:block" />

      {/* La catrina, anclada al borde izquierdo y muy tenue: es marca
          de agua, no ilustración protagonista. */}
      <motion.div
        {...breathe(2)}
        className="absolute -left-6 bottom-8 hidden xl:block"
      >
        <Catrina className="h-64 w-auto text-brand-500/[0.13]" />
      </motion.div>

      {/* Calabaza y vela a ras de suelo, al otro extremo */}
      <div className="absolute bottom-6 right-10 hidden items-end gap-4 lg:flex">
        <Pumpkin className="h-14 w-14 text-brand-600/20" />
        <motion.div {...breathe(1)}>
          <Candle className="h-16 w-auto text-gold-500/20" />
        </motion.div>
      </div>

      {/* ── Frente ─────────────────────────────────────────────── */}

      {/* Murciélagos a distintas alturas y velocidades */}
      {[
        { pos: 'left-[10%] top-[18%]', size: 'h-7 w-7 sm:h-9 sm:w-9', tone: 'text-ink-900/25' },
        { pos: 'right-[14%] top-[34%]', size: 'h-5 w-5 sm:h-6 sm:w-6', tone: 'text-ink-900/[0.18]' },
        { pos: 'left-[24%] top-[58%]', size: 'h-6 w-6 sm:h-8 sm:w-8', tone: 'text-ink-900/20' },
        { pos: 'right-[28%] top-[72%]', size: 'h-4 w-4 sm:h-5 sm:w-5', tone: 'text-ink-900/[0.14]' },
        { pos: 'left-[62%] top-[12%]', size: 'hidden sm:block h-5 w-5', tone: 'text-ink-900/[0.16]' },
      ].map((bat, i) => (
        <motion.div key={i} {...drift(i)} className={`absolute ${bat.pos}`}>
          <Bat className={`${bat.size} ${bat.tone}`} />
        </motion.div>
      ))}

      {/* Calaveras de azúcar, quietas y muy sutiles */}
      <SugarSkull className="absolute left-[6%] top-[44%] hidden h-10 w-10 text-brand-500/[0.16] md:block" />
      <SugarSkull className="absolute right-[7%] top-[56%] hidden h-8 w-8 text-brand-500/[0.13] lg:block" />
      <SugarSkull className="absolute left-[48%] top-[86%] hidden h-7 w-7 text-brand-500/10 xl:block" />
    </div>
  );
}

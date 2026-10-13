import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useSettings } from '../../context/SettingsContext.jsx';
import { SugarSkull, Bat } from '../seasonal/HalloweenIcons.jsx';

/**
 * Franja de temporada, sobre la barra de navegación.
 *
 * Solo aparece con el tema Halloween activo, y no es sticky: se va al
 * hacer scroll y deja la barra de navegación limpia. Esa es la razón de
 * que viva en el Layout y no dentro del <header>.
 *
 * El texto apunta al maquillaje de catrina porque es un servicio real de
 * temporada, no un adorno: es lo que convierte la ambientación en algo
 * que además vende.
 */
export default function SeasonalBanner() {
  const { theme } = useSettings();
  const reduced = useReducedMotion();

  if (theme !== 'HALLOWEEN') return null;

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="relative overflow-hidden border-b border-line bg-brand-gradient"
    >
      {/* Adornos del propio banner */}
      <SugarSkull
        className="pointer-events-none absolute -left-2 top-1/2 h-14 w-14 -translate-y-1/2 text-white/[0.14]"
        aria-hidden="true"
      />
      <Bat
        className="pointer-events-none absolute right-2 top-1/2 hidden h-8 w-8 -translate-y-1/2 text-white/[0.16] sm:block"
        aria-hidden="true"
      />

      <div className="container-page relative flex flex-wrap items-center justify-center gap-x-3 gap-y-1 py-2.5 text-center">
        <p className="text-[13px] leading-snug text-white/90">
          <span className="font-medium text-white">Temporada de Catrinas</span>
          <span className="mx-2 text-white/40" aria-hidden="true">
            ·
          </span>
          Maquillaje artístico de Día de Muertos, con cita previa
        </p>

        <Link
          to="/reservar"
          className="rounded-full border border-white/35 px-3 py-0.5 text-[12px] font-medium text-white transition hover:border-white/70 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-0"
        >
          Reservar
        </Link>
      </div>
    </motion.div>
  );
}

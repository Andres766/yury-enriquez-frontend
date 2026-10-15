import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useSettings } from '../../context/SettingsContext.jsx';
import { SugarSkull } from '../seasonal/HalloweenIcons.jsx';
import { useSeasonalService } from '../home/useSeasonalService.js';

/**
 * Franja de temporada, sobre la barra de navegación.
 *
 * Solo aparece con el tema Halloween activo, y no es sticky: se va al
 * hacer scroll y deja la barra de navegación limpia. Esa es la razón de
 * que viva en el Layout y no dentro del <header>.
 *
 * El botón depende de si el servicio de Catrina está activo, no solo del
 * tema: el tema se enciende solo por fechas y el servicio se activa a
 * mano. Si está activo, lleva directo a reservarlo (el asistente salta
 * al calendario con ?servicio=); si no, a los trabajos de temporada, sin
 * prometer una reserva que no existe. Mientras se averigua, la franja no
 * se pinta, para que el botón no cambie debajo del dedo.
 *
 * El texto dice Halloween y Catrinas porque es lo que Yury hace en
 * temporada: payasos, vampiras y catrinas.
 */
export default function SeasonalBanner() {
  const { theme } = useSettings();
  const reduced = useReducedMotion();
  const { service, ready } = useSeasonalService();

  if (theme !== 'HALLOWEEN' || !ready) return null;

  const cta = service
    ? { to: `/reservar?servicio=${encodeURIComponent(service.slug)}`, label: 'Reservar mi Catrina' }
    : { to: '/trabajos?categoria=temporada', label: 'Ver trabajos' };

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="relative overflow-hidden border-b border-line bg-brand-gradient"
    >
      <SugarSkull
        className="pointer-events-none absolute -left-2 top-1/2 h-14 w-14 -translate-y-1/2 text-white/[0.14]"
        aria-hidden="true"
      />

      <div className="container-page relative flex items-center justify-between gap-3 py-2 sm:justify-center sm:gap-5">
        <p className="min-w-0 text-[13px] leading-snug text-white/90">
          {/* Corto en el celular, para que quepa en una línea junto al botón */}
          <span className="font-medium text-white">
            <span className="hidden min-[400px]:inline">Temporada de </span>Halloween y Catrinas
          </span>
          <span className="hidden sm:inline">
            <span className="mx-2 text-white/40" aria-hidden="true">
              ·
            </span>
            {service ? 'Maquillaje artístico con cita previa' : 'Mira mis maquillajes de temporada'}
          </span>
        </p>

        <Link
          to={cta.to}
          className="inline-flex min-h-[44px] shrink-0 items-center rounded-full border border-white/40 px-4 text-[13px] font-medium text-white transition hover:border-white/70 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-0"
        >
          {cta.label}
        </Link>
      </div>
    </motion.div>
  );
}

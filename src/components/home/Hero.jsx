import { motion, useReducedMotion } from 'framer-motion';
import { Button } from '../ui/index.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import PapelPicadoGarland from '../seasonal/PapelPicadoGarland.jsx';
import { Cobweb, HangingSpider } from '../seasonal/HalloweenIcons.jsx';

/**
 * Portada.
 *
 * Mobile-first: en móvil es una columna (texto, imagen, indicadores);
 * a partir de `lg` pasa a dos columnas con la imagen desbordando hacia
 * el margen derecho. El texto nunca se superpone a la foto en pantallas
 * pequeñas, que es donde ese recurso suele romper la legibilidad.
 *
 * En temporada de Halloween se viste: guirnalda de papel picado sobre
 * el contenido, la foto a luz de vela, una telaraña en su esquina y
 * una araña que sube y baja por su hilo. El texto no cambia de sitio.
 */
export default function Hero() {
  const settings = useSettings();
  const reduced = useReducedMotion();
  const halloween = settings.theme === 'HALLOWEEN';

  const fadeUp = (delay = 0) => ({
    initial: reduced ? false : { opacity: 0, y: 26 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.75, delay, ease: [0.22, 0.61, 0.36, 1] },
  });

  return (
    <section className="veil relative overflow-hidden">
      {/* Adornos de fondo, decorativos */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-100/60 blur-3xl sm:h-96 sm:w-96" />
        <div className="absolute -left-32 top-1/3 h-72 w-72 rounded-full bg-gold-100/70 blur-3xl" />
      </div>

      {halloween && (
        <div className="container-page absolute inset-x-0 top-0 z-10">
          <PapelPicadoGarland />
        </div>
      )}

      <div
        className={`container-page relative grid items-center gap-12 py-16 sm:py-20 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:py-28 ${
          halloween ? 'pt-24 sm:pt-28 lg:pt-32' : ''
        }`}
      >
        <div className="text-center lg:text-left">
          <motion.p {...fadeUp(0)} className="eyebrow">
            {halloween ? 'Temporada de Catrinas · Maquillaje · Peinado' : 'Maquillaje · Peinado · Cita previa'}
          </motion.p>

          <motion.h1
            {...fadeUp(0.08)}
            className="text-balance mt-5 text-[2.5rem] leading-[1.08] sm:text-6xl lg:text-[4.1rem]"
          >
            Que el día que
            <span className="relative mx-2 inline-block italic text-brand-600">
              importa
              <svg
                viewBox="0 0 200 12"
                className="absolute -bottom-1 left-0 h-2.5 w-full text-brand-300"
                fill="none"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <motion.path
                  d="M2 8c40-5 90-7 196-4"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  initial={reduced ? false : { pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1, delay: 0.7, ease: 'easeInOut' }}
                />
              </svg>
            </span>
            te encuentre lista
          </motion.h1>

          <motion.p
            {...fadeUp(0.16)}
            className="text-pretty mx-auto mt-6 max-w-xl text-base leading-relaxed text-ink-600 sm:text-lg lg:mx-0"
          >
            Bodas, quinceañeros, grados y sesiones de fotos. Un solo turno a la vez, productos
            profesionales de larga duración y un look pensado para ti, no para una plantilla.
          </motion.p>

          <motion.div
            {...fadeUp(0.24)}
            className="mt-9 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center lg:justify-start"
          >
            <Button to="/reservar" size="lg">
              Reservar mi cita
              <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden="true">
                <path d="M3 8h9m0 0L8.5 4.5M12 8l-3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Button>
            <Button to="/servicios" variant="secondary" size="lg">
              Ver servicios y precios
            </Button>
          </motion.div>

          <motion.p {...fadeUp(0.3)} className="mt-5 text-sm text-ink-500">
            Sin registro obligatorio · Pago por transferencia o en efectivo
          </motion.p>

          <motion.dl
            {...fadeUp(0.38)}
            className="mt-12 grid grid-cols-3 gap-4 border-t border-line pt-8 text-center lg:text-left"
          >
            {[
              ['8+', 'años de experiencia'],
              ['1', 'clienta por turno'],
              ['24 h', 'para reprogramar'],
            ].map(([value, label]) => (
              <div key={label}>
                <dt className="sr-only">{label}</dt>
                <dd>
                  <span className="block font-display text-3xl text-brand-600 sm:text-4xl">{value}</span>
                  <span className="mt-1 block text-xs leading-snug text-ink-500">{label}</span>
                </dd>
              </div>
            ))}
          </motion.dl>
        </div>

        <motion.div
          initial={reduced ? false : { opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.15, ease: [0.22, 0.61, 0.36, 1] }}
          className="relative mx-auto w-full max-w-md lg:max-w-none"
        >
          <div className="relative aspect-[4/5] overflow-hidden rounded-[2.5rem] border border-line bg-blush shadow-lift">
            <img
              src="https://picsum.photos/seed/estudio-hero/900/1125"
              alt="Maquilladora profesional aplicando maquillaje a una clienta en el estudio"
              className="h-full w-full object-cover"
              fetchpriority="high"
              decoding="async"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-scrim/25 via-transparent to-transparent" aria-hidden="true" />

            {halloween && (
              <>
                {/* Foto a luz de vela: cálido desde abajo, noche morada arriba */}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 mix-blend-soft-light"
                  style={{
                    backgroundImage:
                      'linear-gradient(to top, rgb(240 146 62 / 0.75), transparent 55%), linear-gradient(to bottom, rgb(74 32 96 / 0.85), transparent 60%)',
                  }}
                />
                <div aria-hidden="true" className="absolute inset-0 shadow-[inset_0_0_80px_20px_rgb(22_17_27/0.65)]" />
                <Cobweb
                  className="pointer-events-none absolute -left-2 -top-2 h-28 w-28 text-white/45 sm:h-36 sm:w-36"
                  strokeWidth={0.9}
                />
              </>
            )}
          </div>

          {halloween && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-2 left-[30%] z-10 h-40 overflow-hidden sm:h-48"
            >
              <HangingSpider className="h-40 w-auto animate-spider-bob text-ink-800/80 sm:h-48" />
            </div>
          )}

          {/* Tarjeta flotante decorativa */}
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.6 }}
            className="absolute -bottom-5 left-4 flex items-center gap-3 rounded-2xl border border-line bg-surface/95 px-4 py-3 shadow-lift backdrop-blur-sm sm:-left-6 sm:bottom-8"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blush text-brand-600">
              <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden="true">
                <rect x="2.8" y="4" width="14.4" height="13.2" rx="2.4" stroke="currentColor" strokeWidth="1.3" />
                <path d="M2.8 8h14.4M6.8 2.6v2.8M13.2 2.6v2.8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                <circle cx="10" cy="12.4" r="1.5" fill="currentColor" />
              </svg>
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-semibold text-ink-800">Agenda en línea</span>
              <span className="block text-xs text-ink-500">Elige tu día y tu hora</span>
            </span>
          </motion.div>

          {settings.businessHoursNote && (
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.75 }}
              className="absolute -top-4 right-3 hidden max-w-[13rem] rounded-2xl border border-line bg-surface/95 px-4 py-3 text-xs leading-relaxed text-ink-600 shadow-lift backdrop-blur-sm sm:block"
            >
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-brand-700">
                Horario
              </span>
              {settings.businessHoursNote}
            </motion.div>
          )}
        </motion.div>
      </div>
    </section>
  );
}

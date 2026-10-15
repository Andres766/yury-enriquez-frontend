import { cx } from '../ui/index.jsx';

/**
 * Identidad de marca — Yury Enríquez · Makeup Artist.
 *
 * Reconstruye el logo con tipografía en vez de una imagen: el monograma
 * "YE" en dorado al fondo, la firma manuscrita encima y "MAKEUP ARTIST"
 * espaciado debajo. Ventajas frente a un PNG: escala sin pixelarse, pesa
 * cero, es texto para los buscadores y toma el color del tema activo
 * (en modo oscuro la firma se vuelve clara sola).
 *
 * ¿Tienes el archivo original en SVG o PNG? Déjalo en
 * `public/logo.svg` y cambia el cuerpo de <Wordmark> por:
 *     <img src="/logo.svg" alt={brandName} className="h-12 w-auto" />
 * El resto del sitio no se entera.
 */

/** Monograma suelto, para espacios pequeños (pie, favicon, avatares). */
export function LogoMark({ className = 'h-9 w-9' }) {
  return (
    <span
      className={cx('relative inline-flex shrink-0 items-center justify-center', className)}
      aria-hidden="true"
    >
      <span className="font-display text-[1.6em] font-medium leading-none tracking-tight text-brand-400">
        YE
      </span>
    </span>
  );
}

/**
 * Lockup completo: monograma + firma + bajada.
 *
 * `compact` lo reduce para la cabecera cuando se hace scroll.
 *
 * `monogram={false}` quita el "YE" de fondo: al tamaño de la barra se
 * montaba sobre la "E" de Enríquez y se veía como una mancha. Se deja en
 * el pie, el acceso y la pantalla de entrada, donde hay sitio.
 *
 * Por debajo de 380 px la firma baja un punto: en un Android de 360 px,
 * logo, "Reservar" y el botón del menú no cabían en la barra.
 */
export function Wordmark({
  brandName = 'Yury Enríquez',
  tagline = 'Makeup Artist',
  compact = false,
  monogram = true,
}) {
  return (
    <span className="flex flex-col items-start leading-none">
      <span className="relative inline-flex items-center justify-center">
        {/* Monograma al fondo, como en el logo original */}
        {monogram && (
          <span
            aria-hidden="true"
            className={cx(
              'absolute inset-0 flex items-center justify-center font-display font-medium leading-none tracking-tight text-brand-400/55 transition-all duration-300',
              compact ? 'text-[2rem]' : 'text-[2.6rem] sm:text-[3rem]',
            )}
          >
            YE
          </span>
        )}

        {/* Firma manuscrita al frente */}
        <span
          className={cx(
            'relative whitespace-nowrap font-script text-ink-900 transition-all duration-300',
            compact ? 'text-[1.6rem]' : 'text-[1.75rem] min-[380px]:text-[2rem] sm:text-[2.35rem]',
          )}
        >
          {brandName}
        </span>
      </span>

      {!compact && tagline && (
        <span className="mt-1 w-full text-center text-[0.55rem] font-medium uppercase tracking-[0.3em] text-ink-500 sm:text-[0.62rem]">
          {tagline}
        </span>
      )}
    </span>
  );
}

/**
 * Versión grande con el filete doble del papel de marca. Se usa en la
 * portada y en la pantalla de acceso.
 */
export function LogoFramed({ brandName = 'Yury Enríquez', tagline = 'Makeup Artist', className }) {
  return (
    <div className={cx('logo-frame rounded-sm p-px', className)}>
      <div className="rounded-sm bg-blush px-8 py-10 sm:px-14 sm:py-14">
        <div className="logo-frame rounded-sm p-px">
          <div className="flex flex-col items-center rounded-sm bg-blush px-6 py-10 sm:px-12 sm:py-14">
            <span className="relative inline-flex items-center justify-center">
              <span
                aria-hidden="true"
                className="absolute inset-0 flex items-center justify-center font-display text-[4.5rem] font-medium leading-none tracking-tight text-brand-400/55 sm:text-[6rem]"
              >
                YE
              </span>
              <span className="relative whitespace-nowrap font-script text-[3rem] leading-none text-ink-900 sm:text-[4.2rem]">
                {brandName}
              </span>
            </span>
            <span className="mt-4 text-[0.7rem] font-medium uppercase tracking-[0.35em] text-ink-600 sm:text-sm">
              {tagline}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LogoMark;

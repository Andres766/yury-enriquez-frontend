import { motion, useReducedMotion } from 'framer-motion';
import { Badge, Button, Reveal, SectionTitle } from '../ui/index.jsx';
import { money, mediumDate } from '../../lib/format.js';
import { useAuth } from '../../context/AuthContext.jsx';

/**
 * Promociones vigentes.
 *
 * Las marcadas "solo para registradas" ni siquiera llegan del servidor
 * si no hay sesión; el bloque de invitación a registrarse se muestra
 * para que se entienda que existen.
 */
export default function PromoStrip({ promotions = [] }) {
  const reduced = useReducedMotion();
  const { isAuthenticated } = useAuth();

  if (promotions.length === 0) return null;

  const discountLabel = (promo) =>
    promo.discountType === 'PERCENT' ? `${promo.discountValue}% off` : `${money(promo.discountValue)} off`;

  return (
    <section className="veil border-y border-line py-20 sm:py-24" aria-labelledby="titulo-promos">
      <div className="container-page">
        <SectionTitle
          eyebrow="Promociones"
          title="Lo que está vigente ahora"
          subtitle="Dinámicas y descuentos por temporada. Se aplican al agendar, mencionándolos en las notas de tu reserva."
          className="mb-14"
          as="h2"
        />
        <span id="titulo-promos" className="sr-only">
          Promociones vigentes
        </span>

        <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {promotions.map((promo, i) => (
            <motion.li
              key={promo.id}
              initial={reduced ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.55, delay: Math.min(i * 0.08, 0.3) }}
              className="relative flex flex-col overflow-hidden rounded-3xl border border-line bg-surface p-6 shadow-soft"
            >
              <span
                aria-hidden="true"
                className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-gold-100/80 blur-xl"
              />

              <div className="relative flex flex-wrap items-center gap-2">
                <Badge tone="gold">{discountLabel(promo)}</Badge>
                {promo.membersOnly && <Badge tone="dark">Solo registradas</Badge>}
              </div>

              <h3 className="relative mt-4 text-xl leading-snug">{promo.title}</h3>
              <p className="text-pretty relative mt-2.5 flex-1 text-sm leading-relaxed text-ink-500">
                {promo.description}
              </p>

              <div className="relative mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-xs text-ink-500">
                <span>Hasta el {mediumDate(promo.endsAt)}</span>
                {promo.code && (
                  <span className="rounded-lg border border-dashed border-brand-300 bg-brand-50 px-2.5 py-1 font-mono text-[11px] font-semibold tracking-wider text-brand-800">
                    {promo.code}
                  </span>
                )}
              </div>
            </motion.li>
          ))}
        </ul>

        {!isAuthenticated && (
          <Reveal delay={0.15} className="mt-12">
            <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 rounded-3xl border border-line bg-surface/80 px-6 py-7 text-center shadow-soft backdrop-blur-sm sm:flex-row sm:text-left">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blush text-brand-600">
                <svg viewBox="0 0 20 20" className="h-6 w-6" fill="none" aria-hidden="true">
                  <path d="M10 2.5 12 7l4.8.4-3.7 3.2 1.2 4.7L10 12.9 5.7 15.3l1.2-4.7L3.2 7.4 8 7z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                </svg>
              </span>
              <p className="flex-1 text-sm leading-relaxed text-ink-600">
                Hay promociones reservadas para clientas registradas, además de la tarjeta de fidelidad.
                Crear la cuenta es gratis y no es necesario para reservar.
              </p>
              <Button to="/registro" variant="secondary" className="shrink-0">
                Crear cuenta
              </Button>
            </div>
          </Reveal>
        )}
      </div>
    </section>
  );
}

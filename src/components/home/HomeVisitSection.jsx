import { Reveal, SectionTitle } from '../ui/index.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import { OUT_OF_TOWN_TEXT, urbanFeeText } from '../../data/faq.js';

/**
 * Servicio a domicilio.
 *
 * Yury no tiene estudio: atiende 100 % a domicilio, y es lo primero que
 * una clienta necesita saber antes de reservar (por eso va justo después
 * de «Mi trabajo»). El texto es el suyo («Modalidad de servicio y
 * experiencia a domicilio»), pasado a primera persona como el resto del
 * sitio, y partido en un párrafo corto y tres puntos para que en el
 * celular se lea de un vistazo.
 *
 * El adicional dentro de Pasto sale de Ajustes (`homeVisitFeeCents`), con
 * la misma frase que la pregunta frecuente; si está vacío, solo se dice
 * cómo se calcula fuera de la ciudad.
 */

const BENEFITS = [
  {
    key: 'calma',
    text: 'Te preparas con total calma, sin afanes, tráfico ni prisas.',
    // Taza: la calma de arreglarse en casa.
    icon: (
      <>
        <path d="M4.5 9.5h11v4a4.5 4.5 0 0 1-4.5 4.5H9a4.5 4.5 0 0 1-4.5-4.5v-4Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M15.5 11h1a2 2 0 0 1 0 4h-1.2M8 3.5c-.6.8.6 1.6 0 2.5M11.5 3.5c-.6.8.6 1.6 0 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </>
    ),
  },
  {
    key: 'ritmo',
    text: 'Te vistas a tu ritmo, en la tranquilidad y privacidad de tu espacio.',
    // Gancho de ropa.
    icon: (
      <path d="M10 6.5a1.75 1.75 0 1 1 1.75 1.75c-.97 0-1.75.78-1.75 1.75v.5m0 0L3 15.2c-.7.5-.35 1.3.5 1.3h13c.85 0 1.2-.8.5-1.3L10 10.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    key: 'retoques',
    text: 'Recibes los últimos retoques justo antes de salir a tu evento.',
    // Pincel con un destello.
    icon: (
      <>
        <path d="m11 9 5.5-5.5a1.4 1.4 0 0 1 2 2L13 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M11 9c-1.6-.4-3.4.5-3.8 2.3-.3 1.4-.9 2.4-2.2 3 2.3 1.4 6.4.7 7.6-1.7.5-1 .4-2-.6-2.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 4v3M2.5 5.5h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </>
    ),
  },
];

export default function HomeVisitSection() {
  const settings = useSettings();
  const urbanFee = urbanFeeText(settings);

  return (
    <section className="veil border-y border-line py-14 sm:py-20" aria-labelledby="titulo-domicilio">
      <div className="container-page">
        <SectionTitle
          eyebrow="Servicio a domicilio"
          title="Voy hasta donde estés"
          subtitle="Mi servicio es 100 % a domicilio, en la comodidad de tu hogar. Disfruta de una experiencia de belleza de alto nivel sin salir de tu espacio: más que un servicio, te brindo confort, agilidad y serenidad para facilitarte la vida."
          className="mb-8 sm:mb-12"
          as="h2"
        />
        <span id="titulo-domicilio" className="sr-only">
          Servicio 100 % a domicilio
        </span>

        <ul className="mx-auto grid max-w-4xl gap-3 sm:grid-cols-3 sm:gap-5">
          {BENEFITS.map((benefit, i) => (
            <Reveal
              as="li"
              key={benefit.key}
              delay={Math.min(i * 0.08, 0.2)}
              className="flex items-start gap-4 rounded-3xl border border-line bg-surface p-5 shadow-soft sm:flex-col sm:gap-3 sm:p-6"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blush text-brand-600">
                <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden="true">
                  {benefit.icon}
                </svg>
              </span>
              <p className="text-pretty text-[15px] leading-relaxed text-ink-700">{benefit.text}</p>
            </Reveal>
          ))}
        </ul>

        <Reveal delay={0.1}>
          <p className="text-pretty mx-auto mt-6 max-w-2xl text-center text-sm leading-relaxed text-ink-500 sm:mt-8">
            {urbanFee ? `${urbanFee} ` : ''}
            {OUT_OF_TOWN_TEXT}
          </p>
        </Reveal>
      </div>
    </section>
  );
}

import { Reveal, Button } from '../ui/index.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';

const PILLARS = [
  {
    title: 'Un turno a la vez',
    text: 'No agendamos dos clientas en paralelo. Tu cita tiene el tiempo que necesita.',
  },
  {
    title: 'Productos profesionales',
    text: 'Alta duración y resistencia al agua. Higiene estricta entre servicio y servicio.',
  },
  {
    title: 'Look conversado',
    text: 'Antes de empezar revisamos referencias y hablamos de qué te hace sentir cómoda.',
  },
];

export default function AboutStrip() {
  const settings = useSettings();

  return (
    <section className="container-page py-20 sm:py-24" aria-labelledby="sobre-mi">
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <Reveal className="order-2 lg:order-1">
          <p className="eyebrow">Sobre el estudio</p>
          <h2 id="sobre-mi" className="text-balance mt-4 text-3xl leading-tight sm:text-4xl">
            Detrás de cada cita hay una conversación
          </h2>

          {settings.aboutText && (
            <p className="text-pretty mt-6 text-[15px] leading-relaxed text-ink-600 sm:text-base">
              {settings.aboutText}
            </p>
          )}

          <ul className="mt-9 space-y-5">
            {PILLARS.map((pillar) => (
              <li key={pillar.title} className="flex gap-4">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blush text-brand-600">
                  <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden="true">
                    <path d="m3.5 8.4 2.8 2.8 6.2-6.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span>
                  <span className="block font-medium text-ink-800">{pillar.title}</span>
                  <span className="mt-1 block text-sm leading-relaxed text-ink-500">{pillar.text}</span>
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Button to="/reservar">Reservar cita</Button>
            <Button to="/contacto" variant="secondary">
              Cómo llegar
            </Button>
          </div>
        </Reveal>

        <Reveal delay={0.12} className="order-1 lg:order-2">
          <div className="relative">
            <div className="aspect-[4/5] overflow-hidden rounded-[2.5rem] border border-line bg-blush shadow-lift">
              <img
                src="https://picsum.photos/seed/estudio-sobre-mi/900/1125"
                alt="Espacio del estudio de maquillaje, con tocador e iluminación profesional"
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
            </div>
            <div
              aria-hidden="true"
              className="absolute -bottom-6 -left-6 -z-10 h-40 w-40 rounded-full bg-gold-100 blur-2xl"
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

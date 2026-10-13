import { Reveal, SectionTitle, Button } from '../ui/index.jsx';

const STEPS = [
  {
    n: '01',
    title: 'Elige tu servicio',
    text: 'Maquillaje, peinado o el paquete completo. Cada uno indica su duración y su precio, sin sorpresas al final.',
  },
  {
    n: '02',
    title: 'Escoge día y hora',
    text: 'El calendario solo muestra los horarios realmente libres. Lo que ves disponible, lo está.',
  },
  {
    n: '03',
    title: 'Deja tus datos',
    text: 'Nombre, WhatsApp y correo. Sin crear cuenta, salvo que quieras los beneficios de registrarte.',
  },
  {
    n: '04',
    title: 'Recibe la confirmación',
    text: 'Te llega un correo al instante y te escribimos por WhatsApp para confirmar la cita.',
  },
];

export default function HowItWorks() {
  return (
    <section className="border-y border-line bg-surface py-20 sm:py-24">
      <div className="container-page">
        <SectionTitle
          eyebrow="Cómo funciona"
          title="Reservar toma menos de dos minutos"
          subtitle="Sin llamadas, sin esperar respuesta, sin descargar nada."
          className="mb-14"
        />

        <ol className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <Reveal key={step.n} as="li" delay={i * 0.08} className="relative">
              {/* Línea conectora entre pasos, solo en escritorio */}
              {i < STEPS.length - 1 && (
                <span
                  aria-hidden="true"
                  className="absolute left-[3.25rem] top-6 hidden h-px w-[calc(100%-2rem)] bg-gradient-to-r from-brand-200 to-transparent lg:block"
                />
              )}

              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-brand-200 bg-blush font-display text-lg text-brand-700">
                {step.n}
              </span>
              <h3 className="mt-5 text-xl">{step.title}</h3>
              <p className="text-pretty mt-2.5 text-sm leading-relaxed text-ink-500">{step.text}</p>
            </Reveal>
          ))}
        </ol>

        <Reveal delay={0.2} className="mt-14 text-center">
          <Button to="/reservar" size="lg">
            Empezar mi reserva
          </Button>
        </Reveal>
      </div>
    </section>
  );
}

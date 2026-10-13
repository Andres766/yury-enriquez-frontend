import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import ContactSection from '../components/home/ContactSection.jsx';
import { SectionTitle, Reveal, Button } from '../components/ui/index.jsx';
import { useSettings } from '../context/SettingsContext.jsx';

export default function Contact() {
  const settings = useSettings();
  const [rules, setRules] = useState([]);

  useEffect(() => {
    api
      .get('/availability/rules')
      .then((d) => setRules(d.rules ?? []))
      .catch(() => setRules([]));
  }, []);

  return (
    <div className="pb-10">
      <div className="veil border-b border-line py-14 sm:py-20">
        <div className="container-page">
          <SectionTitle
            eyebrow="Contacto"
            title="Hablemos de tu cita"
            subtitle="Resolvemos dudas por WhatsApp en minutos. Si ya sabes qué quieres, puedes reservar directamente en línea."
            as="h1"
          />
        </div>
      </div>

      <ContactSection rules={rules} compact />

      {settings.mapUrl && (
        <Reveal className="container-page pb-16">
          <div className="overflow-hidden rounded-[2rem] border border-line shadow-soft">
            <a
              href={settings.mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative flex min-h-[16rem] flex-col items-center justify-center gap-4 bg-blush p-10 text-center transition hover:bg-brand-100"
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-surface text-brand-600 shadow-soft transition group-hover:scale-105">
                <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" aria-hidden="true">
                  <path d="M12 21s6.5-5.5 6.5-10.2A6.5 6.5 0 0 0 5.5 10.8C5.5 15.5 12 21 12 21Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                  <circle cx="12" cy="10.5" r="2.4" stroke="currentColor" strokeWidth="1.4" />
                </svg>
              </span>
              <span>
                <span className="block font-display text-2xl text-ink-800">{settings.addressLine}</span>
                <span className="mt-1.5 block text-sm text-ink-500">
                  Abrir en Google Maps (se abre en una pestaña nueva)
                </span>
              </span>
            </a>
          </div>
        </Reveal>
      )}

      <Reveal className="container-page pb-4">
        <div className="veil flex flex-col items-center gap-5 rounded-[2rem] border border-line px-6 py-12 text-center sm:px-12">
          <h2 className="text-balance text-2xl sm:text-3xl">¿Lista para agendar?</h2>
          <p className="text-pretty max-w-lg text-[15px] leading-relaxed text-ink-600">
            El calendario en línea muestra los horarios reales disponibles. Elige el tuyo y te
            confirmamos enseguida.
          </p>
          <Button to="/reservar" size="lg">
            Reservar mi cita
          </Button>
        </div>
      </Reveal>
    </div>
  );
}

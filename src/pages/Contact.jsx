import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import ContactSection from '../components/home/ContactSection.jsx';
import ClosingCTA from '../components/home/ClosingCTA.jsx';
import { SectionTitle, Reveal } from '../components/ui/index.jsx';
import { useSettings } from '../context/SettingsContext.jsx';

/**
 * Contacto.
 *
 * Yury atiende a domicilio: la página habla de cómo escribirle y cuándo
 * atiende, no de cómo llegar. El mapa solo sale si en Ajustes hay una
 * dirección (`addressLine`) además del enlace: sin ella, la tarjeta del
 * mapa quedaba con un título vacío.
 */
export default function Contact() {
  const settings = useSettings();
  // null mientras no se sabe: con el servidor dormido la respuesta tarda,
  // y una tabla vacía se leía como "Cerrado" toda la semana.
  const [rules, setRules] = useState(null);
  const [rulesLoading, setRulesLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .get('/availability/rules')
      .then((d) => {
        if (!cancelled) setRules(d.rules ?? []);
      })
      .catch(() => {
        if (!cancelled) setRules(null);
      })
      .finally(() => {
        if (!cancelled) setRulesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="pb-10">
      <div className="veil border-b border-line py-14 sm:py-20">
        <div className="container-page">
          <SectionTitle
            eyebrow="Contacto"
            title="Hablemos de tu cita"
            subtitle="Voy hasta donde estés, en Pasto y municipios cercanos. Escríbeme por WhatsApp y resolvemos tus dudas; si ya sabes qué quieres, reserva en línea y me dejas la dirección."
            as="h1"
          />
        </div>
      </div>

      <ContactSection rules={rules} loading={rulesLoading} compact />

      {settings.addressLine && settings.mapUrl && (
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

      <ClosingCTA
        primary="whatsapp"
        title="¿Lista para agendar?"
        text="Cuéntame qué necesitas por WhatsApp, o elige tu horario en el calendario en línea: solo muestra los que tengo libres."
        showContactLink={false}
      />
    </div>
  );
}

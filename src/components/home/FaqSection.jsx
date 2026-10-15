import { useState } from 'react';
import { Reveal, SectionTitle } from '../ui/index.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import { whatsappLink } from '../../lib/format.js';
import { publishedFaq } from '../../data/faq.js';
import WhatsAppIcon from './WhatsAppIcon.jsx';
import { firstName } from './contactInfo.js';

/**
 * Preguntas frecuentes.
 *
 * Con <details>/<summary>: el navegador ya da el abrir y cerrar con
 * teclado, el estado expandido para el lector de pantalla y funciona
 * aunque falle el JavaScript. Las preguntas viven en src/data/faq.js.
 *
 * Las respuestas con cifras del panel (abono, domicilio, antelación) son
 * funciones de los ajustes: publishedFaq las resuelve con los ajustes
 * actuales, así que al cambiar el valor en Panel → Ajustes cambia aquí
 * sin tocar este archivo.
 *
 * En el inicio se ven las primeras FIRST y el resto queda detrás de un
 * botón: con todas abiertas a la vista, la portada volvía a ser larga.
 */
const FIRST = 6;

export default function FaqSection() {
  const settings = useSettings();
  const [showAll, setShowAll] = useState(false);
  const all = publishedFaq(settings);
  if (all.length === 0) return null;
  const items = showAll ? all : all.slice(0, FIRST);
  const hidden = all.length - items.length;

  const number = settings.whatsappNumber || settings.contactPhone;

  return (
    <section className="container-page py-14 sm:py-20" aria-labelledby="titulo-faq">
      <SectionTitle eyebrow="Antes de reservar" title="Preguntas frecuentes" className="mb-8 sm:mb-12" as="h2" />
      <span id="titulo-faq" className="sr-only">
        Preguntas frecuentes
      </span>

      <Reveal className="mx-auto max-w-3xl">
        <div className="divide-y divide-line overflow-hidden rounded-3xl border border-line bg-surface shadow-soft">
          {items.map((item) => (
            <details key={item.id} className="group">
              <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left font-medium text-ink-800 transition hover:bg-blush focus-visible:bg-blush focus-visible:ring-inset focus-visible:ring-offset-0 sm:px-6 [&::-webkit-details-marker]:hidden">
                <span className="text-[15px] leading-snug">{item.question}</span>
                <svg
                  viewBox="0 0 16 16"
                  className="h-4 w-4 shrink-0 text-brand-600 transition-transform duration-200 group-open:rotate-45"
                  fill="none"
                  aria-hidden="true"
                >
                  <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </summary>
              <p className="text-pretty px-5 pb-5 text-sm leading-relaxed text-ink-600 sm:px-6">{item.answer}</p>
            </details>
          ))}
        </div>

        {hidden > 0 && (
          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="inline-flex min-h-[44px] items-center rounded-full border border-line bg-surface px-5 text-sm font-medium text-ink-700 shadow-soft transition hover:border-brand-300 hover:bg-blush"
            >
              Ver las otras {hidden} preguntas
            </button>
          </div>
        )}

        {number && (
          <p className="mt-6 text-center text-sm text-ink-500">
            ¿Tienes otra pregunta?{' '}
            <a
              href={whatsappLink(number, `Hola ${firstName(settings.brandName)}, tengo una pregunta antes de reservar.`)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 py-2 font-medium text-brand-700 underline decoration-brand-300 underline-offset-4 transition hover:decoration-brand-600"
            >
              <WhatsAppIcon className="h-4 w-4 text-wa" />
              Pregúntame por WhatsApp
              <span className="sr-only">(se abre en una pestaña nueva)</span>
            </a>
          </p>
        )}
      </Reveal>
    </section>
  );
}

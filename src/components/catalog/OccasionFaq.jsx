import { publishedFaq } from '../../data/faq.js';
import { useSettings } from '../../context/SettingsContext.jsx';
import { DATE_OCCASION_FAQ, waHref } from '../../lib/catalog.js';
import { Reveal } from '../ui/index.jsx';
import { WhatsAppIcon } from './icons.jsx';

/**
 * "Antes de reservar" en la página de bodas y quinceañeros.
 *
 * Son las mismas preguntas del inicio (src/data/faq.js), filtradas y en
 * el orden de una novia: aquí no se escribe ninguna respuesta nueva,
 * para que lo que se promete sea lo mismo en toda la web. Las que siguen
 * en borrador no salen. Mismo acordeón con <details> que el inicio:
 * teclado y lector de pantalla sin JavaScript extra.
 */
export default function OccasionFaq({ occasion }) {
  const settings = useSettings();
  const byId = new Map(publishedFaq(settings).map((item) => [item.id, item]));
  const items = DATE_OCCASION_FAQ.map((id) => byId.get(id)).filter(Boolean);
  if (items.length === 0) return null;

  const waAsk = waHref(settings, 'pregunta', { occasion });

  return (
    <section className="container-page mt-20" aria-labelledby="titulo-antes-de-reservar">
      <Reveal className="mx-auto max-w-3xl">
        <p className="eyebrow">Preguntas frecuentes</p>
        <h2 id="titulo-antes-de-reservar" className="mt-3 text-2xl sm:text-3xl">
          Antes de reservar
        </h2>

        <div className="mt-8 divide-y divide-line overflow-hidden rounded-3xl border border-line bg-surface shadow-soft">
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

        {waAsk && (
          <p className="mt-6 text-center text-sm text-ink-500">
            ¿Tienes otra pregunta?{' '}
            <a
              href={waAsk}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center gap-1.5 font-medium text-brand-700 underline decoration-brand-300 underline-offset-4 transition hover:decoration-brand-600"
            >
              <WhatsAppIcon className="h-4 w-4 text-wa" />
              Pregúntanos por WhatsApp
              <span className="sr-only">(se abre en una pestaña nueva)</span>
            </a>
          </p>
        )}
      </Reveal>
    </section>
  );
}

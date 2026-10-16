import { Reveal } from '../ui/index.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import usePhotos, { photoKey } from '../../hooks/usePhotos.js';
import { photoImgProps } from '../portfolio/photoImage.js';
import { instagramHandle } from './contactInfo.js';

/**
 * Conoce a Yury.
 *
 * La marca es una persona, así que la sección habla de ella y en primera
 * persona, como el texto que escribe en Panel → Ajustes (`aboutText`).
 *
 * Foto: si Yury eligió una en Panel → Ajustes (aboutImageUrl), va esa,
 * entera, con su texto alternativo y su punto de enfoque. Si no, la de
 * siempre: la foto de la portada, trabajando, recortada sobre ella (no
 * sobre la clienta), que es mejor que una foto de relleno. No se pinta
 * ninguna hasta saber cuál toca, para no bajar las dos.
 *
 * Texto: si la primera línea va entre comillas (“…” o "…"), es su frase
 * de cabecera y se pinta como cita destacada; el resto se parte en
 * párrafos por las líneas en blanco. Sin esa frase se pinta tal cual,
 * como siempre. Lo que diga de su formación y experiencia sale de ese
 * mismo texto: aquí no se escribe ninguna cifra.
 */

// Una línea entera entre comillas tipográficas, rectas o angulares.
const QUOTE_LINE = /^\s*([“"«])([^\n]+?)([”"»])\s*$/;

/** { quote, paragraphs } si el texto abre con una cita; si no, null. */
function splitAbout(text) {
  const value = String(text ?? '').replace(/\r\n?/g, '\n').trim();
  const [firstLine, ...rest] = value.split('\n');
  const match = firstLine?.match(QUOTE_LINE);
  if (!match) return null;
  const paragraphs = rest
    .join('\n')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  return { quote: match[2].trim(), paragraphs };
}

const PORTRAIT = {
  webp: '/img/hero-yury-640.webp 640w, /img/hero-yury-1084.webp 1084w',
  jpg: '/img/hero-yury-640.jpg 640w, /img/hero-yury-1084.jpg 1084w',
  src: '/img/hero-yury-1084.jpg',
  // Sin «en su estudio»: atiende a domicilio y no tiene local.
  alt: 'Yury Enríquez con el pincel en la mano',
  focus: '30% 28%',
};

export default function AboutStrip() {
  const settings = useSettings();
  const handle = instagramHandle(settings.instagramUrl);
  const about = splitAbout(settings.aboutText);
  const { byUrl } = usePhotos();
  const customUrl = settings.aboutImageUrl || null;

  return (
    <section className="container-page py-14 sm:py-20" aria-labelledby="sobre-mi">
      <div className="grid items-center gap-8 sm:gap-12 lg:grid-cols-2 lg:gap-16">
        <Reveal className="order-2 lg:order-1">
          <p className="eyebrow">Sobre mí</p>
          <h2 id="sobre-mi" className="text-balance mt-4 text-3xl leading-tight sm:text-4xl">
            Hola, soy Yury
          </h2>

          {about ? (
            <>
              <blockquote className="mt-5 border-l-2 border-brand-300 pl-4 sm:pl-5">
                <p className="text-balance font-display text-2xl italic leading-snug text-brand-700 sm:text-[1.75rem]">
                  “{about.quote}”
                </p>
              </blockquote>
              {about.paragraphs.map((paragraph, i) => (
                <p
                  key={i}
                  className="text-pretty mt-4 whitespace-pre-line text-[15px] leading-relaxed text-ink-600 sm:text-base"
                >
                  {paragraph}
                </p>
              ))}
            </>
          ) : (
            settings.aboutText && (
              <p className="text-pretty mt-5 whitespace-pre-line text-[15px] leading-relaxed text-ink-600 sm:text-base">
                {settings.aboutText}
              </p>
            )
          )}

          {settings.instagramUrl && (
            <a
              href={settings.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex min-h-[44px] items-center gap-2 text-sm font-medium text-brand-700 underline decoration-brand-300 underline-offset-4 transition hover:decoration-brand-600"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                <path d="M12 7.6a4.4 4.4 0 1 0 0 8.8 4.4 4.4 0 0 0 0-8.8Zm0 7.25a2.85 2.85 0 1 1 0-5.7 2.85 2.85 0 0 1 0 5.7ZM17.6 7.4a1.03 1.03 0 1 1-2.05 0 1.03 1.03 0 0 1 2.05 0ZM8 3.4h8A4.6 4.6 0 0 1 20.6 8v8a4.6 4.6 0 0 1-4.6 4.6H8A4.6 4.6 0 0 1 3.4 16V8A4.6 4.6 0 0 1 8 3.4Zm0 1.6A3 3 0 0 0 5 8v8a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3V8a3 3 0 0 0-3-3H8Z" />
              </svg>
              Ver mi trabajo en Instagram{handle ? ` ${handle}` : ''}
              <span className="sr-only">(se abre en una pestaña nueva)</span>
            </a>
          )}
        </Reveal>

        <Reveal delay={0.1} className="order-1 lg:order-2">
          <div className="mx-auto aspect-[4/5] max-w-xs overflow-hidden rounded-[2rem] border border-line bg-blush shadow-lift sm:max-w-sm lg:max-w-none lg:rounded-[2.5rem]">
            {!settings.loaded ? null : customUrl ? (
              <img
                {...photoImgProps(customUrl, {
                  slot: 'large',
                  sizes: '(min-width: 1024px) 45vw, (min-width: 640px) 24rem, 20rem',
                  focus: settings.aboutImageFocus,
                  byUrl,
                })}
                alt={settings.aboutImageAlt || byUrl.get(photoKey(customUrl))?.alt || ''}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
            ) : (
              <picture>
                <source type="image/webp" srcSet={PORTRAIT.webp} sizes="(min-width: 1024px) 45vw, 20rem" />
                <img
                  src={PORTRAIT.src}
                  srcSet={PORTRAIT.jpg}
                  sizes="(min-width: 1024px) 45vw, 20rem"
                  width="1084"
                  height="1451"
                  alt={PORTRAIT.alt}
                  loading="lazy"
                  decoding="async"
                  style={{ objectPosition: PORTRAIT.focus }}
                  className="h-full w-full origin-[30%_28%] scale-[1.35] object-cover"
                />
              </picture>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

import { useEffect, useState } from 'react';
import { matchPath, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { api } from '../../lib/api.js';
import { useSettings } from '../../context/SettingsContext.jsx';
import { whatsappLink, priceLabel } from '../../lib/format.js';
import { WhatsAppIcon } from '../booking/WhatsAppAction.jsx';
import { ownerFirstName, captureSource } from '../booking/bookingHelpers.js';

/**
 * Botón flotante de WhatsApp.
 *
 * Aparece tras un pequeño desplazamiento para no tapar el hero nada más
 * entrar. En móvil se sitúa por encima del área segura del sistema
 * (`env(safe-area-inset-bottom)`) para no quedar bajo la barra de gestos.
 *
 * No se muestra en /reservar ni en /mi-reserva: ahí tapaba el
 * "Continuar" del asistente (justo la flecha, en el celular) y esas
 * páginas ya tienen su propio enlace de WhatsApp con el contexto de la
 * reserva.
 *
 * El mensaje depende de la página: en la ficha de un servicio lleva su
 * nombre y precio, y en la de una ocasión, la ocasión. Un "quiero
 * consultar por una cita" genérico desde la ficha de novia obliga a la
 * clienta a explicarlo todo otra vez.
 */

const HIDDEN_ON = ['/reservar', '/mi-reserva'];

// Lo que ya se pidió no se vuelve a pedir al ir y volver entre fichas.
const cache = new Map();

function fetchOnce(path) {
  if (!cache.has(path)) {
    cache.set(
      path,
      api.get(path).catch(() => {
        cache.delete(path);
        return null;
      }),
    );
  }
  return cache.get(path);
}

/** Mensaje prellenado según la ruta. */
function useContextMessage(pathname, settings) {
  const first = ownerFirstName(settings);
  const generic = `Hola ${first}, me gustaría consultar por una cita.`;
  const [message, setMessage] = useState(generic);

  useEffect(() => {
    let cancelled = false;
    setMessage(generic);

    const serviceMatch = matchPath('/servicios/:slug', pathname);
    const occasionMatch = matchPath('/ocasiones/:slug', pathname);

    if (serviceMatch) {
      fetchOnce(`/services/${serviceMatch.params.slug}`).then((data) => {
        const service = data?.service;
        if (cancelled || !service) return;
        const price = priceLabel(service);
        const priceText = price.isQuote ? '' : ` (${price.text})`;
        setMessage(`Hola ${first}, vi el ${service.name}${priceText} en tu web y quiero saber si tienes libre el día __.`);
      });
    } else if (occasionMatch?.params.slug === 'bodas') {
      setMessage(`Hola ${first}, me caso el día __ y quiero asesoría para mi maquillaje.`);
    } else if (occasionMatch) {
      fetchOnce(`/occasions/${occasionMatch.params.slug}`).then((data) => {
        const occasion = data?.occasion;
        if (cancelled || !occasion) return;
        setMessage(`Hola ${first}, vi en tu web la sección de ${occasion.name.toLowerCase()} y quiero consultar por una cita.`);
      });
    }

    return () => {
      cancelled = true;
    };
  }, [pathname, generic, first]);

  return message;
}

export default function WhatsAppButton() {
  const settings = useSettings();
  const reduced = useReducedMotion();
  const { pathname } = useLocation();
  const [visible, setVisible] = useState(false);
  const message = useContextMessage(pathname, settings);

  /*
   * De dónde llegó la clienta (utm_source / ref / dominio que la trajo).
   * Se anota aquí porque este botón vive en el Layout y se monta en la
   * página por la que ENTRA: si se esperara a /reservar, el
   * ?utm_source=instagram de la portada ya se habría perdido al navegar.
   */
  useEffect(() => {
    captureSource();
  }, []);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 320);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const number = settings.whatsappNumber || settings.contactPhone;
  const hidden = HIDDEN_ON.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  if (!number || hidden) return null;

  // Las fichas de servicio y de ocasión tienen su propia barra fija abajo
  // en el celular, con su botón de WhatsApp: el flotante la tapaba.
  const hasMobileBar = Boolean(matchPath('/servicios/:slug', pathname) || matchPath('/ocasiones/:slug', pathname));

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={reduced ? false : { opacity: 0, scale: 0.7, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={reduced ? undefined : { opacity: 0, scale: 0.7, y: 20 }}
          transition={{ type: 'spring', stiffness: 320, damping: 24 }}
          className={`fixed bottom-5 right-5 z-[70] sm:bottom-7 sm:right-7 ${hasMobileBar ? 'hidden lg:block' : ''}`}
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {/*
           * El verde es el de la marca WhatsApp y no cambia con el tema.
           * El texto va en `scrim` (casi negro en los tres temas): blanco
           * sobre ese verde da 1,98:1 y no se lee.
           */}
          <a
            href={whatsappLink(number, message)}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-scrim shadow-lift transition
                       hover:h-14 hover:w-auto hover:gap-2 hover:px-5 focus-visible:ring-2 focus-visible:ring-wa focus-visible:ring-offset-2"
            aria-label="Escribirnos por WhatsApp (se abre en una pestaña nueva)"
          >
            <WhatsAppIcon className="h-7 w-7" />
            <span className="hidden whitespace-nowrap pr-1 text-sm font-semibold group-hover:inline">
              Escríbenos
            </span>
          </a>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useSettings } from '../../context/SettingsContext.jsx';
import { Wordmark } from './Logo.jsx';

/**
 * Pantalla de entrada con el logo.
 *
 * El logo aparece despacio, una línea fina baja desde el borde
 * superior marcando el avance de la carga y, al terminar, la pantalla
 * se abre en dos como un telón y deja ver la web.
 *
 * Además de adorno, tapa dos parpadeos reales: el de la tipografía
 * manuscrita del logo mientras llega la fuente y el del tema, que se
 * conoce cuando responde GET /api/settings.
 *
 * Reglas para que no estorbe a quien viene a reservar:
 *   · Una sola vez por sesión del navegador (sessionStorage).
 *   · Nunca dura más de MAX_WAIT aunque la API tarde.
 *   · La web carga por debajo desde el primer momento: el telón no
 *     retrasa nada, solo lo cubre.
 *   · Con "reducir movimiento" activado no se muestra.
 */

const SEEN_KEY = 'intro-visto';
const MIN_SHOW = 1100; // ms: lo justo para que el gesto se lea
const MAX_WAIT = 2600; // ms: tope aunque la API o la fuente tarden
const EASE = [0.76, 0, 0.24, 1];

function alreadySeen() {
  try {
    return sessionStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

function markSeen() {
  try {
    sessionStorage.setItem(SEEN_KEY, '1');
  } catch {
    // Almacenamiento bloqueado: se verá otra vez en la próxima carga.
  }
}

export default function IntroLoader() {
  const settings = useSettings();
  const reduced = useReducedMotion();

  const [visible, setVisible] = useState(() => !reduced && !alreadySeen());
  const [fontsReady, setFontsReady] = useState(false);
  const [minElapsed, setMinElapsed] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!visible) return undefined;

    document.fonts?.ready.then(() => setFontsReady(true)) ?? setFontsReady(true);
    const min = setTimeout(() => setMinElapsed(true), MIN_SHOW);
    const max = setTimeout(() => setTimedOut(true), MAX_WAIT);

    // Sin scroll mientras está el telón
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      clearTimeout(min);
      clearTimeout(max);
      document.body.style.overflow = prev;
    };
  }, [visible]);

  const ready = timedOut || (minElapsed && fontsReady && settings.loaded);

  useEffect(() => {
    if (!visible || !ready) return undefined;
    // Se deja un instante con la línea completa antes de abrir el telón
    const t = setTimeout(() => {
      markSeen();
      setVisible(false);
    }, 250);
    return () => clearTimeout(t);
  }, [visible, ready]);

  // Avance de la línea: arranca solo, se detiene en ~70 % mientras
  // espera y llega al 100 % cuando todo está listo.
  const progress = ready ? 1 : fontsReady && settings.loaded ? 0.85 : 0.7;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="intro"
          aria-hidden="true"
          className="fixed inset-0 z-[100]"
          exit={{ transition: { duration: 0.9 } }}
        >
          {/* Telón: dos mitades que se abren hacia arriba y hacia abajo */}
          <motion.div
            className="absolute inset-x-0 top-0 h-1/2 bg-cream transition-colors duration-500"
            exit={{ y: '-100%', transition: { duration: 0.85, ease: EASE, delay: 0.05 } }}
          />
          <motion.div
            className="absolute inset-x-0 bottom-0 h-1/2 bg-cream transition-colors duration-500"
            exit={{ y: '100%', transition: { duration: 0.85, ease: EASE, delay: 0.05 } }}
          />

          {/* Línea que baja desde el borde hasta el logo */}
          <div className="absolute left-1/2 top-0 h-[calc(50%-4.5rem)] w-px -translate-x-1/2 overflow-hidden">
            <motion.div
              className="h-full w-full origin-top bg-ink-800 transition-colors duration-500"
              initial={{ scaleY: 0 }}
              animate={{ scaleY: progress }}
              exit={{ y: '-100%', transition: { duration: 0.6, ease: EASE } }}
              transition={{ duration: ready ? 0.35 : 1.4, ease: [0.22, 0.61, 0.36, 1] }}
            />
          </div>

          {/* Logo */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } }}
            exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.35, ease: 'easeIn' } }}
          >
            <div className="origin-center scale-[1.35] sm:scale-150">
              <Wordmark brandName={settings.brandName} tagline={settings.tagline} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

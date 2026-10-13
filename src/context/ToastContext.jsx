import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

/**
 * Avisos emergentes.
 *
 * La región es `aria-live="polite"`, de modo que un lector de pantalla
 * anuncia el mensaje sin interrumpir lo que la persona esté haciendo.
 */

const ToastContext = createContext(null);

const ICONS = {
  success: (
    <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5 shrink-0" aria-hidden="true">
      <circle cx="10" cy="10" r="9" className="fill-emerald-100" />
      <path d="m6.5 10.2 2.3 2.3 4.7-4.9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  error: (
    <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5 shrink-0" aria-hidden="true">
      <circle cx="10" cy="10" r="9" className="fill-red-100" />
      <path d="M10 6v4.5M10 13.6h.01" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  ),
  info: (
    <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5 shrink-0" aria-hidden="true">
      <circle cx="10" cy="10" r="9" className="fill-brand-100" />
      <path d="M10 9v5M10 6.4h.01" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  ),
};

const TONE = {
  success: 'border-emerald-200 bg-surface text-emerald-900',
  error: 'border-red-200 bg-surface text-red-900',
  info: 'border-line bg-surface text-ink-800',
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counter = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message, type = 'info', duration = 5000) => {
      counter.current += 1;
      const id = counter.current;
      setToasts((list) => [...list, { id, message, type }]);
      if (duration) setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss],
  );

  const value = useMemo(
    () => ({
      toast: push,
      success: (msg, d) => push(msg, 'success', d),
      error: (msg, d) => push(msg, 'error', d ?? 7000),
      info: (msg, d) => push(msg, 'info', d),
      dismiss,
    }),
    [push, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[80] flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-0 sm:top-0 sm:bottom-auto sm:items-end sm:p-6"
      >
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97, transition: { duration: 0.18 } }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border px-4 py-3 shadow-lift ${TONE[t.type]}`}
            >
              {ICONS[t.type]}
              <p className="flex-1 text-sm leading-relaxed">{t.message}</p>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="-mr-1 -mt-0.5 rounded-full p-1 text-ink-400 transition hover:bg-blush hover:text-ink-700"
                aria-label="Cerrar aviso"
              >
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
                  <path d="m4 4 8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>');
  return ctx;
}

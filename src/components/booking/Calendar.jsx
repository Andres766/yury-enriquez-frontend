import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { api, qs } from '../../lib/api.js';
import { Spinner, cx } from '../ui/index.jsx';
import { toDateISO } from '../../lib/format.js';

/**
 * Calendario de disponibilidad.
 *
 * Los días que se pueden elegir los decide el servidor: pide
 * /availability/month y pinta solo lo que viene marcado como disponible.
 * El frontend no calcula horarios por su cuenta, de modo que nunca puede
 * ofrecer un hueco que el backend fuese a rechazar.
 *
 * Accesibilidad: es una rejilla (`role="grid"`) navegable con flechas,
 * Inicio/Fin y RePág/AvPág, con un solo día en el orden de tabulación
 * (patrón "roving tabindex"), como el date picker nativo.
 */

const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const DAY_NAMES = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const pad = (n) => String(n).padStart(2, '0');
const iso = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;

export default function Calendar({ serviceId, value, onChange, timezone }) {
  const reduced = useReducedMotion();
  const todayISO = useMemo(() => toDateISO(new Date(), timezone), [timezone]);

  const [cursor, setCursor] = useState(() => {
    const base = value ? new Date(`${value}T12:00:00`) : new Date(`${todayISO}T12:00:00`);
    return { year: base.getFullYear(), month: base.getMonth() + 1 };
  });
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [focusedISO, setFocusedISO] = useState(value ?? todayISO);
  const [direction, setDirection] = useState(0);

  const gridRef = useRef(null);
  const shouldFocus = useRef(false);

  useEffect(() => {
    if (!serviceId) return undefined;

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    api
      .get(`/availability/month${qs({ serviceId, year: cursor.year, month: cursor.month })}`, {
        signal: controller.signal,
      })
      .then((data) => setDays(data.days ?? []))
      .catch((err) => {
        if (err.name !== 'AbortError') setError('No pudimos cargar la disponibilidad.');
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [serviceId, cursor.year, cursor.month]);

  const availability = useMemo(() => new Map(days.map((d) => [d.date, d])), [days]);

  // Rejilla del mes empezando en lunes.
  const cells = useMemo(() => {
    const first = new Date(cursor.year, cursor.month - 1, 1);
    const daysInMonth = new Date(cursor.year, cursor.month, 0).getDate();
    const offset = (first.getDay() + 6) % 7; // 0 = lunes

    const out = Array.from({ length: offset }, () => null);
    for (let d = 1; d <= daysInMonth; d += 1) out.push(iso(cursor.year, cursor.month, d));
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [cursor]);

  // Al cambiar de mes, se lleva el foco al primer día seleccionable.
  useEffect(() => {
    if (!shouldFocus.current || loading) return;
    shouldFocus.current = false;
    const first = cells.find((c) => c && availability.get(c)?.available) ?? cells.find(Boolean);
    if (first) {
      setFocusedISO(first);
      requestAnimationFrame(() => {
        gridRef.current?.querySelector(`[data-date="${first}"]`)?.focus();
      });
    }
  }, [cells, availability, loading]);

  const move = (delta) => {
    setDirection(delta > 0 ? 1 : -1);
    setCursor((c) => {
      const next = new Date(c.year, c.month - 1 + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() + 1 };
    });
  };

  const goToMonthOf = (dateISO) => {
    const [y, m] = dateISO.split('-').map(Number);
    if (y !== cursor.year || m !== cursor.month) {
      setDirection(dateISO > `${cursor.year}-${pad(cursor.month)}` ? 1 : -1);
      setCursor({ year: y, month: m });
    }
  };

  const shiftFocus = (deltaDays) => {
    const base = new Date(`${focusedISO}T12:00:00`);
    base.setDate(base.getDate() + deltaDays);
    const next = iso(base.getFullYear(), base.getMonth() + 1, base.getDate());
    setFocusedISO(next);
    goToMonthOf(next);
    requestAnimationFrame(() => {
      gridRef.current?.querySelector(`[data-date="${next}"]`)?.focus();
    });
  };

  const onKeyDown = (event) => {
    const actions = {
      ArrowLeft: () => shiftFocus(-1),
      ArrowRight: () => shiftFocus(1),
      ArrowUp: () => shiftFocus(-7),
      ArrowDown: () => shiftFocus(7),
      PageUp: () => move(-1),
      PageDown: () => move(1),
      Home: () => shiftFocus(-((new Date(`${focusedISO}T12:00:00`).getDay() + 6) % 7)),
      End: () => shiftFocus(6 - ((new Date(`${focusedISO}T12:00:00`).getDay() + 6) % 7)),
    };

    const action = actions[event.key];
    if (action) {
      event.preventDefault();
      action();
    }
  };

  const monthLabel = `${MONTHS[cursor.month - 1]} de ${cursor.year}`;
  const canGoBack = `${cursor.year}-${pad(cursor.month)}` > todayISO.slice(0, 7);

  return (
    <div className="rounded-3xl border border-line bg-surface p-4 shadow-soft sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => move(-1)}
          disabled={!canGoBack}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-ink-600 transition enabled:hover:border-brand-300 enabled:hover:bg-blush disabled:cursor-not-allowed disabled:opacity-35"
          aria-label="Mes anterior"
        >
          <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden="true">
            <path d="M10 3.5 5.5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <p aria-live="polite" className="font-display text-xl capitalize text-ink-800">
          {monthLabel}
        </p>

        <button
          type="button"
          onClick={() => move(1)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-ink-600 transition hover:border-brand-300 hover:bg-blush"
          aria-label="Mes siguiente"
        >
          <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden="true">
            <path d="m6 3.5 4.5 4.5L6 12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div className="relative">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-surface/70 backdrop-blur-[2px]">
            <Spinner className="h-6 w-6 text-brand-500" />
          </div>
        )}

        <div role="grid" aria-label={`Calendario de ${monthLabel}`} ref={gridRef} onKeyDown={onKeyDown}>
          <div role="row" className="mb-1 grid grid-cols-7">
            {DAY_LABELS.map((label, i) => (
              <div
                key={label}
                role="columnheader"
                aria-label={DAY_NAMES[i]}
                className="pb-2 text-center text-[11px] font-semibold uppercase tracking-wider text-ink-400"
              >
                {label}
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <motion.div
              key={`${cursor.year}-${cursor.month}`}
              custom={direction}
              initial={reduced ? false : { opacity: 0, x: direction * 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduced ? undefined : { opacity: 0, x: direction * -24 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="grid grid-cols-7 gap-1"
            >
              {cells.map((dateISO, index) => {
                if (!dateISO) return <div key={`empty-${index}`} role="gridcell" aria-hidden="true" />;

                const info = availability.get(dateISO);
                const isAvailable = Boolean(info?.available);
                const isSelected = value === dateISO;
                const isToday = dateISO === todayISO;
                const dayNumber = Number(dateISO.slice(-2));

                return (
                  <div role="gridcell" key={dateISO} aria-selected={isSelected}>
                    <button
                      type="button"
                      data-date={dateISO}
                      tabIndex={focusedISO === dateISO ? 0 : -1}
                      disabled={!isAvailable}
                      onClick={() => {
                        setFocusedISO(dateISO);
                        onChange(dateISO);
                      }}
                      onFocus={() => setFocusedISO(dateISO)}
                      aria-label={`${dayNumber} de ${MONTHS[cursor.month - 1]}${
                        isAvailable ? `, ${info.slotCount} horarios disponibles` : ', sin disponibilidad'
                      }`}
                      className={cx(
                        'relative flex aspect-square w-full items-center justify-center rounded-xl text-sm font-medium transition-all duration-200',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-1',
                        isSelected
                          ? 'bg-brand-600 text-on-brand shadow-soft'
                          : isAvailable
                            ? 'bg-blush text-ink-800 hover:bg-brand-200 hover:text-brand-900'
                            : 'cursor-not-allowed text-ink-400/70',
                        isToday && !isSelected && 'ring-1 ring-inset ring-brand-300',
                      )}
                    >
                      {dayNumber}
                      {isAvailable && !isSelected && (
                        <span
                          aria-hidden="true"
                          className="absolute bottom-1.5 h-1 w-1 rounded-full bg-brand-500"
                        />
                      )}
                    </button>
                  </div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-4 text-xs text-ink-500">
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded bg-blush ring-1 ring-line" aria-hidden="true" />
          Con cupo
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded bg-brand-600" aria-hidden="true" />
          Seleccionado
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded bg-cream ring-1 ring-line" aria-hidden="true" />
          Sin cupo
        </span>
      </div>
    </div>
  );
}

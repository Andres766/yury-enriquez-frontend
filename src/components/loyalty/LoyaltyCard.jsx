import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Badge, Button, cx } from '../ui/index.jsx';
import { mediumDate } from '../../lib/format.js';

/**
 * Tarjeta de fidelidad digital.
 *
 * El detalle que la hace sentir física: cuando llega un sello nuevo, se
 * "estampa" —entra grande y rotado, rebota y se asienta— en lugar de
 * aparecer sin más. Se detecta comparando el número de sellos con el de
 * la vez anterior, así solo se anima el que acaba de sumarse.
 *
 * Accesibilidad: el progreso va en un role="progressbar" con sus
 * valores ARIA, y el cambio se anuncia por una región aria-live, de modo
 * que la animación no sea la única forma de enterarse.
 */
export default function LoyaltyCard({ card, onRedeem, canRedeem = false, compact = false }) {
  const reduced = useReducedMotion();
  const [justStamped, setJustStamped] = useState(null);
  const previous = useRef(card?.stampsTotal ?? 0);

  useEffect(() => {
    const total = card?.stampsTotal ?? 0;
    if (total > previous.current) {
      setJustStamped(card.stampsCurrent === 0 ? card.stampsRequired : card.stampsCurrent);
      const timer = setTimeout(() => setJustStamped(null), 1400);
      previous.current = total;
      return () => clearTimeout(timer);
    }
    previous.current = total;
    return undefined;
  }, [card?.stampsTotal, card?.stampsCurrent, card?.stampsRequired]);

  if (!card) return null;

  const { stampsCurrent, stampsRequired, stampsTotal, rewardDescription, hasReward, rewards = [] } = card;
  const percent = Math.round((stampsCurrent / Math.max(1, stampsRequired)) * 100);
  const missing = Math.max(0, stampsRequired - stampsCurrent);
  const availableReward = rewards.find((r) => r.status === 'AVAILABLE');

  return (
    <div className="overflow-hidden rounded-[2rem] border border-line bg-surface shadow-lift">
      {/* Cabecera */}
      <div className="relative overflow-hidden bg-brand-gradient px-6 py-7 text-white sm:px-8">
        <span
          aria-hidden="true"
          className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-surface/10 blur-2xl"
        />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-white/70">Tarjeta de fidelidad</p>
            <h3 className="mt-1.5 font-display text-2xl leading-tight sm:text-[1.7rem]">
              {rewardDescription || 'Tu recompensa'}
            </h3>
            <p className="mt-1.5 text-sm text-white/80">
              {missing > 0
                ? `Te ${missing === 1 ? 'falta' : 'faltan'} ${missing} ${missing === 1 ? 'sello' : 'sellos'}`
                : '¡Tarjeta completa!'}
            </p>
          </div>

          <div className="text-right">
            <p className="font-display text-4xl leading-none">
              {stampsCurrent}
              <span className="text-2xl text-white/60">/{stampsRequired}</span>
            </p>
            <p className="mt-1 text-[11px] uppercase tracking-wider text-white/60">
              {stampsTotal} en total
            </p>
          </div>
        </div>

        {/* Barra de progreso */}
        <div
          className="relative mt-6 h-2 overflow-hidden rounded-full bg-surface/25"
          role="progressbar"
          aria-valuenow={stampsCurrent}
          aria-valuemin={0}
          aria-valuemax={stampsRequired}
          aria-label={`Progreso de la tarjeta: ${stampsCurrent} de ${stampsRequired} sellos`}
        >
          <motion.div
            className="h-full rounded-full bg-surface"
            initial={reduced ? false : { width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 0.9, ease: [0.22, 0.61, 0.36, 1], delay: 0.15 }}
          />
        </div>
      </div>

      {/* Rejilla de sellos */}
      <div className="px-6 py-7 sm:px-8">
        <ul
          className={cx(
            'grid gap-3',
            stampsRequired <= 6 ? 'grid-cols-3 sm:grid-cols-6' : 'grid-cols-4 sm:grid-cols-4 md:grid-cols-8',
          )}
        >
          {Array.from({ length: stampsRequired }, (_, i) => {
            const position = i + 1;
            const filled = position <= stampsCurrent;
            const isNew = justStamped === position;

            return (
              <li key={position}>
                <motion.div
                  initial={reduced ? false : { opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.25 + i * 0.045, duration: 0.35 }}
                  className={cx(
                    'relative flex aspect-square items-center justify-center rounded-full border-2 transition-colors duration-300',
                    filled
                      ? 'border-brand-400 bg-blush'
                      : 'border-dashed border-line bg-cream/60',
                  )}
                >
                  <span className="sr-only">
                    Sello {position} de {stampsRequired}: {filled ? 'conseguido' : 'pendiente'}
                  </span>

                  <AnimatePresence>
                    {filled && (
                      <motion.span
                        key="mark"
                        initial={
                          reduced
                            ? false
                            : isNew
                              ? { scale: 2.4, rotate: -22, opacity: 0 }
                              : { scale: 0.7, opacity: 0 }
                        }
                        animate={{ scale: 1, rotate: 0, opacity: 1 }}
                        transition={
                          isNew
                            ? { type: 'spring', stiffness: 260, damping: 13, mass: 0.7 }
                            : { duration: 0.3 }
                        }
                        className="text-brand-600"
                        aria-hidden="true"
                      >
                        <svg viewBox="0 0 28 28" className="h-6 w-6 sm:h-7 sm:w-7" fill="none">
                          <path
                            d="M14 4.2 16.6 10l6.4.6-4.9 4.3 1.5 6.3L14 17.9l-5.6 3.3 1.5-6.3L5 10.6 11.4 10z"
                            fill="currentColor"
                            opacity=".9"
                          />
                        </svg>
                      </motion.span>
                    )}
                  </AnimatePresence>

                  {/* Onda que acompaña al sello recién estampado */}
                  {isNew && !reduced && (
                    <motion.span
                      className="pointer-events-none absolute inset-0 rounded-full border-2 border-brand-400"
                      initial={{ scale: 1, opacity: 0.8 }}
                      animate={{ scale: 1.9, opacity: 0 }}
                      transition={{ duration: 0.75, ease: 'easeOut' }}
                      aria-hidden="true"
                    />
                  )}
                </motion.div>
              </li>
            );
          })}
        </ul>

        {/* Anuncio para lectores de pantalla */}
        <p aria-live="polite" className="sr-only">
          {justStamped ? `Nuevo sello conseguido. Llevas ${stampsCurrent} de ${stampsRequired}.` : ''}
        </p>

        {/* Estado de la recompensa */}
        <AnimatePresence mode="wait">
          {hasReward ? (
            <motion.div
              key="disponible"
              initial={reduced ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mt-7 flex flex-col gap-4 rounded-2xl border border-gold-300 bg-gold-100 p-5 sm:flex-row sm:items-center"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface text-gold-600">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
                  <path d="M6 9h12v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M4.5 6.2h15V9h-15zM12 6.2V21" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M12 6.2S10.8 3 8.9 3a1.9 1.9 0 0 0 0 3.8zM12 6.2S13.2 3 15.1 3a1.9 1.9 0 0 1 0 3.8z" stroke="currentColor" strokeWidth="1.4" />
                </svg>
              </span>
              <div className="flex-1">
                <p className="font-medium text-gold-800">¡Recompensa desbloqueada!</p>
                <p className="mt-0.5 text-sm leading-relaxed text-gold-700">
                  {availableReward?.description || rewardDescription}. Menciónala al agendar tu próxima cita.
                </p>
                {availableReward?.unlockedAt && (
                  <p className="mt-1 text-xs text-gold-700/80">
                    Desbloqueada el {mediumDate(availableReward.unlockedAt)}
                  </p>
                )}
              </div>
              {canRedeem && onRedeem && availableReward && (
                <Button variant="gold" size="sm" onClick={() => onRedeem(availableReward.id)}>
                  Marcar canjeada
                </Button>
              )}
            </motion.div>
          ) : (
            <motion.p
              key="progreso"
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-7 rounded-2xl bg-blush px-5 py-4 text-sm leading-relaxed text-ink-600"
            >
              Cada servicio completado suma un sello. Los otorga la maquilladora después de tu cita, así
              que no hace falta que hagas nada: aparecerán aquí.
            </motion.p>
          )}
        </AnimatePresence>

        {!compact && rewards.filter((r) => r.status === 'REDEEMED').length > 0 && (
          <div className="mt-6 border-t border-line pt-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-ink-400">
              Recompensas ya canjeadas
            </p>
            <ul className="space-y-2">
              {rewards
                .filter((r) => r.status === 'REDEEMED')
                .map((reward) => (
                  <li key={reward.id} className="flex items-center justify-between gap-3 text-sm text-ink-500">
                    <span>{reward.description}</span>
                    <Badge tone="outline">{mediumDate(reward.redeemedAt ?? reward.unlockedAt)}</Badge>
                  </li>
                ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

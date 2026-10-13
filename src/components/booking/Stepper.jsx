import { motion } from 'framer-motion';
import { cx } from '../ui/index.jsx';

/**
 * Indicador de pasos de la reserva.
 *
 * En móvil se reduce a una barra con "Paso 2 de 5" para no comerse la
 * pantalla; desde `sm` se despliega la lista completa. El paso actual se
 * marca con aria-current y los completados se pueden pulsar para volver.
 */
export default function Stepper({ steps, current, onStepClick }) {
  const percent = ((current + 1) / steps.length) * 100;

  return (
    <nav aria-label="Progreso de la reserva">
      {/* Móvil */}
      <div className="sm:hidden">
        <div className="mb-2 flex items-baseline justify-between">
          <p className="text-sm font-medium text-ink-800">{steps[current].label}</p>
          <p className="text-xs text-ink-500">
            Paso {current + 1} de {steps.length}
          </p>
        </div>
        <div
          className="h-1.5 overflow-hidden rounded-full bg-line"
          role="progressbar"
          aria-valuenow={current + 1}
          aria-valuemin={1}
          aria-valuemax={steps.length}
          aria-label={`Paso ${current + 1} de ${steps.length}: ${steps[current].label}`}
        >
          <motion.div
            className="h-full rounded-full bg-brand-500"
            animate={{ width: `${percent}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Escritorio */}
      <ol className="hidden items-center sm:flex">
        {steps.map((step, index) => {
          const done = index < current;
          const active = index === current;
          const clickable = done && onStepClick;

          return (
            <li key={step.key} className={cx('flex items-center', index < steps.length - 1 && 'flex-1')}>
              <button
                type="button"
                onClick={clickable ? () => onStepClick(index) : undefined}
                disabled={!clickable}
                aria-current={active ? 'step' : undefined}
                className={cx(
                  'group flex items-center gap-2.5 rounded-full py-1 pr-2 transition',
                  clickable && 'cursor-pointer',
                  !clickable && 'cursor-default',
                )}
              >
                <span
                  className={cx(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-medium transition-all duration-300',
                    active && 'border-brand-600 bg-brand-600 text-on-brand shadow-soft',
                    done && 'border-brand-300 bg-brand-100 text-brand-700 group-hover:bg-brand-200',
                    !active && !done && 'border-line bg-surface text-ink-400',
                  )}
                >
                  {done ? (
                    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden="true">
                      <path d="m3.5 8.4 2.8 2.8 6.2-6.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </span>
                <span
                  className={cx(
                    'hidden whitespace-nowrap text-sm transition-colors lg:inline',
                    active ? 'font-medium text-ink-800' : 'text-ink-500',
                  )}
                >
                  {step.label}
                </span>
              </button>

              {index < steps.length - 1 && (
                <span className="mx-2 h-px flex-1 bg-line lg:mx-3" aria-hidden="true">
                  <motion.span
                    className="block h-px bg-brand-300"
                    initial={false}
                    animate={{ width: done ? '100%' : '0%' }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                  />
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

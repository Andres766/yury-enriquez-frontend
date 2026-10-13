import { forwardRef, useId } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';

/**
 * Piezas base de la interfaz.
 *
 * Reglas transversales que se cumplen aquí y se heredan en todo el
 * sitio: cada campo tiene su <label> asociado por id, los errores se
 * enlazan con aria-describedby y se anuncian con role="alert", los
 * estados de foco son siempre visibles, y las zonas táctiles no bajan
 * de 44 px de alto en móvil.
 */

const cx = (...classes) => classes.filter(Boolean).join(' ');

// ── Botón ────────────────────────────────────────────────────────────

const VARIANTS = {
  primary:
    'bg-brand-600 text-on-brand shadow-soft hover:bg-brand-700 active:bg-brand-800 disabled:bg-brand-300',
  secondary:
    'bg-surface text-ink-800 border border-line shadow-soft hover:border-brand-300 hover:bg-blush disabled:text-ink-400',
  ghost: 'text-ink-700 hover:bg-blush hover:text-brand-700 disabled:text-ink-400',
  dark: 'bg-ink-800 text-on-ink shadow-soft hover:bg-ink-900 disabled:bg-ink-400',
  danger: 'bg-red-600 text-on-danger shadow-soft hover:bg-red-700 disabled:bg-red-300',
  gold: 'bg-gold-500 text-on-gold shadow-soft hover:bg-gold-600 disabled:bg-gold-300',
};

const SIZES = {
  sm: 'min-h-[38px] px-4 text-sm',
  md: 'min-h-[46px] px-6 text-sm sm:text-[15px]',
  lg: 'min-h-[54px] px-8 text-base',
};

export const Button = forwardRef(function Button(
  { as, to, href, variant = 'primary', size = 'md', className, loading, children, disabled, ...props },
  ref,
) {
  const classes = cx(
    'inline-flex items-center justify-center gap-2 rounded-full font-medium tracking-wide transition-all duration-200',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 focus-visible:ring-offset-cream',
    'disabled:cursor-not-allowed disabled:shadow-none',
    VARIANTS[variant],
    SIZES[size],
    className,
  );

  const content = (
    <>
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </>
  );

  if (to) {
    return (
      <Link ref={ref} to={to} className={classes} {...props}>
        {content}
      </Link>
    );
  }
  if (href) {
    return (
      <a ref={ref} href={href} className={classes} {...props}>
        {content}
      </a>
    );
  }

  const Component = as ?? 'button';
  return (
    <Component
      ref={ref}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {content}
    </Component>
  );
});

// ── Indicador de carga ───────────────────────────────────────────────

export function Spinner({ className = 'h-5 w-5' }) {
  return (
    <svg className={cx('animate-spin', className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" className="opacity-25" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        className="opacity-90"
      />
    </svg>
  );
}

export function LoadingBlock({ label = 'Cargando…', className = '' }) {
  return (
    <div className={cx('flex flex-col items-center justify-center gap-3 py-16 text-ink-500', className)}>
      <Spinner className="h-7 w-7 text-brand-500" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

// ── Campos de formulario ─────────────────────────────────────────────

function FieldShell({ id, label, error, hint, required, children, className }) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  return (
    <div className={className}>
      <label htmlFor={id} className="label-base">
        {label}
        {required && (
          <span className="ml-1 text-brand-600" aria-hidden="true">
            *
          </span>
        )}
        {!required && <span className="ml-1.5 text-xs font-normal text-ink-400">(opcional)</span>}
      </label>

      {children({ hintId, errorId })}

      {hint && !error && (
        <p id={hintId} className="hint-text">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="error-text" role="alert">
          <svg viewBox="0 0 16 16" className="mt-px h-3.5 w-3.5 shrink-0" fill="none" aria-hidden="true">
            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4" />
            <path d="M8 4.6v4M8 10.9h.01" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}

export const Input = forwardRef(function Input(
  { label, error, hint, required, className, id: providedId, ...props },
  ref,
) {
  const generatedId = useId();
  const id = providedId ?? generatedId;

  return (
    <FieldShell id={id} label={label} error={error} hint={hint} required={required} className={className}>
      {({ hintId, errorId }) => (
        <input
          ref={ref}
          id={id}
          required={required}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={cx(hint && !error ? hintId : null, error ? errorId : null) || undefined}
          className={cx('input-base', error && 'border-red-400 focus:border-red-500 focus:ring-red-300')}
          {...props}
        />
      )}
    </FieldShell>
  );
});

export const Textarea = forwardRef(function Textarea(
  { label, error, hint, required, className, rows = 4, id: providedId, ...props },
  ref,
) {
  const generatedId = useId();
  const id = providedId ?? generatedId;

  return (
    <FieldShell id={id} label={label} error={error} hint={hint} required={required} className={className}>
      {({ hintId, errorId }) => (
        <textarea
          ref={ref}
          id={id}
          rows={rows}
          required={required}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={cx(hint && !error ? hintId : null, error ? errorId : null) || undefined}
          className={cx(
            'input-base resize-y leading-relaxed',
            error && 'border-red-400 focus:border-red-500 focus:ring-red-300',
          )}
          {...props}
        />
      )}
    </FieldShell>
  );
});

export const Select = forwardRef(function Select(
  { label, error, hint, required, className, children, id: providedId, ...props },
  ref,
) {
  const generatedId = useId();
  const id = providedId ?? generatedId;

  return (
    <FieldShell id={id} label={label} error={error} hint={hint} required={required} className={className}>
      {({ hintId, errorId }) => (
        <div className="relative">
          <select
            ref={ref}
            id={id}
            required={required}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={cx(hint && !error ? hintId : null, error ? errorId : null) || undefined}
            className={cx(
              'input-base appearance-none pr-11',
              error && 'border-red-400 focus:border-red-500 focus:ring-red-300',
            )}
            {...props}
          >
            {children}
          </select>
          <svg
            viewBox="0 0 16 16"
            className="pointer-events-none absolute right-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400"
            fill="none"
            aria-hidden="true"
          >
            <path d="m3.5 6 4.5 4.5L12.5 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </div>
      )}
    </FieldShell>
  );
});

export function Checkbox({ label, description, id: providedId, className, ...props }) {
  const generatedId = useId();
  const id = providedId ?? generatedId;

  return (
    <div className={cx('flex items-start gap-3', className)}>
      <input
        type="checkbox"
        id={id}
        className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded border-line text-brand-600 shadow-inset transition focus:ring-2 focus:ring-brand-400 focus:ring-offset-1"
        {...props}
      />
      <label htmlFor={id} className="cursor-pointer text-sm leading-relaxed text-ink-700">
        <span className="font-medium">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-ink-500">{description}</span>}
      </label>
    </div>
  );
}

// ── Presentación ─────────────────────────────────────────────────────

export function Badge({ children, className, tone = 'neutral' }) {
  const tones = {
    neutral: 'bg-blush text-brand-800 border-line',
    gold: 'bg-gold-100 text-gold-700 border-gold-300',
    dark: 'bg-ink-800 text-on-ink border-ink-800',
    outline: 'bg-transparent text-ink-600 border-line',
  };
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-wider',
        tones[tone] ?? tone,
        className,
      )}
    >
      {children}
    </span>
  );
}

export function SectionTitle({ eyebrow, title, subtitle, align = 'center', className, as: Tag = 'h2' }) {
  const alignment = align === 'left' ? 'text-left' : 'text-center mx-auto';
  return (
    <div className={cx('max-w-2xl', alignment, className)}>
      {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
      <Tag
        className={cx(
          'text-balance text-3xl leading-tight sm:text-4xl md:text-[2.75rem]',
          align === 'center' && 'rule-ornament',
        )}
      >
        {title}
      </Tag>
      {subtitle && (
        <p className={cx('text-pretty mt-5 text-[15px] leading-relaxed text-ink-600 sm:text-base')}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

export function EmptyState({ title, description, action, icon }) {
  return (
    <div className="card-surface flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blush text-brand-600">
        {icon ?? (
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
            <path
              d="M12 3.5 14.4 9l5.6.5-4.3 3.9 1.3 5.6L12 16l-5 3 1.3-5.6L4 9.5 9.6 9z"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
      <h3 className="text-xl">{title}</h3>
      {description && <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-500">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function Alert({ tone = 'info', title, children, className }) {
  const tones = {
    info: 'border-brand-200 bg-brand-50 text-brand-900',
    warning: 'border-gold-300 bg-gold-100 text-gold-700',
    error: 'border-red-200 bg-red-50 text-red-900',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  };
  return (
    <div className={cx('rounded-2xl border px-4 py-3.5 text-sm leading-relaxed', tones[tone], className)}>
      {title && <p className="mb-1 font-semibold">{title}</p>}
      {children}
    </div>
  );
}

// ── Animación de entrada al hacer scroll ────────────────────────────

/**
 * Aparición suave cuando el bloque entra en pantalla.
 * Si el sistema pide menos movimiento, se muestra sin animar.
 */
export function Reveal({ children, delay = 0, y = 22, className, as = 'div', once = true }) {
  const reduced = useReducedMotion();
  const Component = motion[as] ?? motion.div;

  if (reduced) {
    const Plain = as;
    return <Plain className={className}>{children}</Plain>;
  }

  return (
    <Component
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: '-60px' }}
      transition={{ duration: 0.6, delay, ease: [0.22, 0.61, 0.36, 1] }}
      className={className}
    >
      {children}
    </Component>
  );
}

export { cx };

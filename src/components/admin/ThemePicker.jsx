import { motion } from 'framer-motion';
import { cx } from '../ui/index.jsx';

/**
 * Selector de tema del sitio público.
 *
 * Vive solo en el panel: las visitantes no pueden cambiarlo. Cada opción
 * muestra sus colores reales para poder decidir sin tener que aplicarlo
 * y volver atrás.
 *
 * Es un grupo de radios de verdad (`role="radiogroup"`), no una lista de
 * botones, de modo que las flechas del teclado funcionan como se espera.
 */

const THEMES = [
  {
    value: 'LIGHT',
    name: 'Claro',
    description: 'La marca: beige, dorado y negro. El de siempre.',
    swatches: ['#F4EFE6', '#E9E1D4', '#C8B287', '#7D6640', '#111111'],
    preview: { bg: '#F4EFE6', card: '#FDFBF7', text: '#1F1D1A', accent: '#7D6640' },
  },
  {
    value: 'DARK',
    name: 'Oscuro',
    description: 'La misma marca de noche. Elegante para temporada alta.',
    swatches: ['#181512', '#2D271F', '#A0885C', '#CDB68A', '#EFE8DB'],
    preview: { bg: '#181512', card: '#211D18', text: '#EFE8DB', accent: '#CDB68A' },
  },
  {
    value: 'HALLOWEEN',
    name: 'Halloween',
    description: 'Morado y calabaza, con murciélagos y telaraña discretos.',
    swatches: ['#16111B', '#2D2138', '#7A3B8F', '#F0923E', '#F0EAF8'],
    preview: { bg: '#16111B', card: '#1F1826', text: '#F0EAF8', accent: '#F0923E' },
    seasonal: true,
  },
];

export default function ThemePicker({ value, onChange }) {
  return (
    <div
      role="radiogroup"
      aria-label="Tema visual del sitio público"
      className="grid gap-4 sm:grid-cols-3"
    >
      {THEMES.map((theme) => {
        const active = value === theme.value;

        return (
          <label
            key={theme.value}
            className={cx(
              'group relative cursor-pointer overflow-hidden rounded-2xl border-2 transition-all duration-200',
              active
                ? 'border-brand-500 shadow-lift'
                : 'border-line hover:border-brand-300 hover:shadow-soft',
            )}
          >
            <input
              type="radio"
              name="tema-sitio"
              value={theme.value}
              checked={active}
              onChange={() => onChange(theme.value)}
              className="sr-only-focusable absolute left-3 top-3 h-4 w-4"
            />

            {/* Maqueta en miniatura del sitio con ese tema */}
            <span
              className="block px-4 pb-4 pt-5"
              style={{ backgroundColor: theme.preview.bg }}
              aria-hidden="true"
            >
              <span
                className="block rounded-lg px-3 py-2.5 shadow-sm"
                style={{ backgroundColor: theme.preview.card }}
              >
                <span
                  className="block h-1.5 w-2/3 rounded-full"
                  style={{ backgroundColor: theme.preview.text, opacity: 0.85 }}
                />
                <span
                  className="mt-1.5 block h-1 w-1/2 rounded-full"
                  style={{ backgroundColor: theme.preview.text, opacity: 0.4 }}
                />
                <span
                  className="mt-3 block h-5 w-20 rounded-full"
                  style={{ backgroundColor: theme.preview.accent }}
                />
              </span>

              <span className="mt-3 flex gap-1.5">
                {theme.swatches.map((color) => (
                  <span
                    key={color}
                    className="h-4 w-4 rounded-full ring-1 ring-black/10"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </span>
            </span>

            <span className="block bg-surface p-4">
              <span className="flex items-center justify-between gap-2">
                <span className="font-medium text-ink-800">{theme.name}</span>

                <span
                  className={cx(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition',
                    active ? 'border-brand-600 bg-brand-600' : 'border-line',
                  )}
                  aria-hidden="true"
                >
                  {active && (
                    <motion.span
                      layoutId="tema-activo"
                      className="h-2 w-2 rounded-full bg-on-brand"
                    />
                  )}
                </span>
              </span>

              <span className="mt-1 block text-xs leading-relaxed text-ink-500">
                {theme.description}
              </span>

              {theme.seasonal && (
                <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-gold-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-gold-700">
                  De temporada
                </span>
              )}
            </span>
          </label>
        );
      })}
    </div>
  );
}

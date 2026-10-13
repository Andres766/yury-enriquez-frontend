/**
 * ─────────────────────────────────────────────────────────────────────
 *  SISTEMA DE COLOR
 *
 *  Los valores NO viven aquí: cada token apunta a una variable CSS que
 *  se define en src/index.css, una vez por tema (claro, oscuro y
 *  Halloween). Así una misma clase —`bg-surface`, `text-ink-800`,
 *  `bg-brand-600`— se adapta sola al tema activo, sin duplicar clases
 *  ni escribir variantes `dark:` por todo el proyecto.
 *
 *  El tema se aplica con el atributo `data-theme` en <html>, y lo
 *  decide la maquilladora desde Panel → Ajustes.
 *
 *  La paleta clara sale del logo de Yury Enríquez:
 *    beige del fondo  #E9E1D4
 *    dorado del monograma  #C8B287
 *    negro de la firma  #111111
 *    gris del filete  #6E747C   ·   rosado del degradado  #C9A8A0
 *
 *  `/ <alpha-value>` es lo que permite seguir usando modificadores de
 *  opacidad (`bg-surface/80`) sobre un color definido por variable.
 * ─────────────────────────────────────────────────────────────────────
 */

const c = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;

const scale = (name, steps) =>
  Object.fromEntries(steps.map((step) => [step, c(`${name}-${step}`)]));

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Superficies
        cream: c('cream'), // fondo de página
        surface: c('surface'), // tarjetas y paneles
        'surface-2': c('surface-2'), // superficie elevada o alterna
        blush: c('blush'), // bloques tintados
        line: c('line'), // bordes y separadores

        // Texto: 400 el más tenue, 900 el más fuerte.
        // En los temas oscuros la escala se invierte, así que
        // `text-ink-800` sigue siendo "el texto principal" siempre.
        ink: scale('ink', [400, 500, 600, 700, 800, 900]),

        // Color de marca (dorado del logo, oscurecido para cumplir
        // contraste en botones y enlaces).
        brand: scale('brand', [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]),

        // Dorado puro, para adornos y distintivos.
        gold: scale('gold', [100, 300, 400, 500, 600, 700, 800]),

        // Estados. Se mantienen los nombres `red` y `emerald` para no
        // reescribir clases, pero ahora también son conscientes del tema.
        red: scale('red', [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]),
        emerald: scale('emerald', [50, 100, 200, 500, 600, 700, 800, 900]),

        // Colores de "encima de": el texto que va sobre un fondo de
        // color. Invierten con el tema para no perder legibilidad.
        'on-brand': c('on-brand'),
        'on-ink': c('on-ink'),
        'on-gold': c('on-gold'),
        'on-danger': c('on-danger'),

        // Detalles del logo y WhatsApp.
        scrim: c('scrim'),
        'scrim-brand': c('scrim-brand'),
        frame: c('frame'),
        rose: c('rose'),
        wa: c('wa'),
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['Jost', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        script: ['Parisienne', '"Cormorant Garamond"', 'cursive'],
      },
      letterSpacing: {
        widest: '.2em',
      },
      boxShadow: {
        soft: 'var(--shadow-soft)',
        lift: 'var(--shadow-lift)',
        inset: 'var(--shadow-inset)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      backgroundImage: {
        'brand-gradient': 'var(--grad-brand)',
        'petal-gradient': 'var(--grad-petal)',
      },
      keyframes: {
        'stamp-in': {
          '0%': { transform: 'scale(2.2) rotate(-18deg)', opacity: '0' },
          '55%': { transform: 'scale(.88) rotate(4deg)', opacity: '1' },
          '100%': { transform: 'scale(1) rotate(0deg)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'bat-drift': {
          '0%': { transform: 'translate(0, 0) rotate(-4deg)' },
          '50%': { transform: 'translate(18px, -14px) rotate(4deg)' },
          '100%': { transform: 'translate(0, 0) rotate(-4deg)' },
        },
      },
      animation: {
        'stamp-in': 'stamp-in .55s cubic-bezier(.22,1.2,.36,1) both',
        shimmer: 'shimmer 2.4s linear infinite',
        'float-slow': 'float-slow 7s ease-in-out infinite',
        'bat-drift': 'bat-drift 9s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

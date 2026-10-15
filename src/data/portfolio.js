/**
 * Trabajos reales de Yury para la galería.
 *
 * Las fotos viven en /public/img/trabajos en dos anchos (480 y 960 px,
 * WebP, sin metadatos: se les quitó la ubicación GPS del celular). Para
 * añadir una foto: prepararla igual (ver README) y sumar una entrada
 * aquí; no hace falta tocar ningún componente.
 *
 * `focus` es el punto que no se puede recortar (CSS object-position):
 * las fotos son verticales y de proporciones distintas, y las casillas
 * de la web son 4:5.
 *
 * `menor: true` marca fotos de niñas, niños o quinceañeras. Antes de
 * publicarlas hace falta la autorización por escrito de su madre, padre
 * o acudiente (Ley 1581 de 2012 y Código de la Infancia). Mientras no
 * esté, se ocultan con SHOW_MINORS = false.
 *
 * `credito`: foto de un fotógrafo profesional. Se le da crédito visible.
 */

export const SHOW_MINORS = true;

export const PORTFOLIO_CATEGORIES = [
  { id: 'novias', label: 'Novias' },
  { id: 'quinceaneras', label: 'Quinceañeras' },
  { id: 'social', label: 'Social y noche' },
  { id: 'temporada', label: 'Halloween y Catrinas' },
];

const SILVIO = 'Foto: Silvio Maya Fotografía';

const ALL = [
  // ── Novias ──────────────────────────────────────────────────────────
  {
    id: 'novia-boda-iglesia',
    category: 'novias',
    alt: 'Novia con maquillaje luminoso y recogido con ondas, a la entrada de la iglesia junto a un arco de rosas blancas',
    focus: '35% 30%',
    featured: true,
  },
  {
    id: 'novia-maquillaje-velo',
    category: 'novias',
    alt: 'Maquillaje de novia en tonos tierra con delineado sutil, diadema de cristal y velo',
    focus: '50% 40%',
  },
  {
    id: 'novia-peinado-mono-cristales',
    category: 'novias',
    alt: 'Peinado de novia: moño bajo torcido con enredadera de cristales',
    focus: '50% 45%',
    peinado: true,
  },
  {
    id: 'novia-peinado-semirecogido-flores',
    category: 'novias',
    alt: 'Peinado de novia semirecogido con trenzas torcidas, ondas y tocado de flores plateadas',
    focus: '50% 30%',
    peinado: true,
  },

  // ── Quinceañeras ────────────────────────────────────────────────────
  {
    id: 'quince-espalda-balcon',
    category: 'quinceaneras',
    alt: 'Quinceañera de espaldas con vestido rosa de cola larga y corona, en un balcón al atardecer',
    focus: '50% 40%',
    credito: SILVIO,
    menor: true,
    featured: true,
  },
  {
    id: 'quince-vestido-rosa-ramo',
    category: 'quinceaneras',
    alt: 'Quinceañera con vestido rosa bordado, corona y ramo de rosas, maquillaje en tonos rosados',
    focus: '50% 25%',
    credito: SILVIO,
    menor: true,
  },
  {
    id: 'quince-corona-dorada-sonrisa',
    category: 'quinceaneras',
    alt: 'Maquillaje de quinceañera natural y luminoso, con corona dorada y ondas sueltas',
    focus: '50% 35%',
    menor: true,
  },
  {
    id: 'quince-corona-dorada-ojos',
    category: 'quinceaneras',
    alt: 'Detalle de sombras rosadas y labios gloss en una quinceañera con corona dorada',
    focus: '50% 35%',
    menor: true,
  },
  {
    id: 'quince-maquillaje-rosa-corona',
    category: 'quinceaneras',
    alt: 'Maquillaje de quinceañera con sombras rosa y labios nude, corona de pedrería',
    focus: '50% 40%',
    menor: true,
  },
  {
    id: 'quince-peinado-ondas-tiara',
    category: 'quinceaneras',
    alt: 'Peinado de quinceañera semirecogido con ondas largas y tiara plateada',
    focus: '50% 35%',
    peinado: true,
    menor: true,
  },

  // ── Social y noche ──────────────────────────────────────────────────
  {
    id: 'social-ojos-calidos',
    category: 'social',
    alt: 'Maquillaje social con sombras cálidas, delineado y pestañas, labios rosados',
    focus: '50% 35%',
    featured: true,
  },
  {
    id: 'noche-ahumado-morado',
    category: 'social',
    alt: 'Maquillaje de noche con ahumado morado y labios vino, cabello en ondas',
    focus: '50% 30%',
  },
  {
    id: 'social-glitter-rosa',
    category: 'social',
    alt: 'Sombra fucsia difuminada con delineado en glitter dorado y labios gloss',
    focus: '50% 40%',
  },
  {
    id: 'social-glitter-rosa-perfil',
    category: 'social',
    alt: 'Perfil de un maquillaje fucsia con glitter dorado en el párpado',
    focus: '50% 35%',
  },

  // ── Halloween y Catrinas ────────────────────────────────────────────
  {
    id: 'catrina-media-cara',
    category: 'temporada',
    alt: 'Media catrina: ojo con encaje negro y pedrería roja y plateada, labio mitad rojo y mitad calavera',
    focus: '50% 40%',
    catrina: true,
    featured: true,
  },
  {
    id: 'catrina-nina',
    category: 'temporada',
    alt: 'Niña maquillada de catrina con corona de flores de colores y velo negro',
    focus: '50% 25%',
    catrina: true,
    menor: true,
  },
  {
    id: 'halloween-payasos-grupo',
    category: 'temporada',
    alt: 'Grupo de amigos con maquillaje de payasos de terror para Halloween, bajo un túnel de luces',
    focus: '50% 30%',
  },
  {
    id: 'halloween-payasos-ascensor',
    category: 'temporada',
    alt: 'Selfie de un grupo con maquillaje de payasos de Halloween',
    focus: '50% 50%',
  },
  {
    id: 'halloween-payasa',
    category: 'temporada',
    alt: 'Maquillaje de payasa de terror con líneas rojas, nariz roja y sombras con brillo',
    focus: '50% 35%',
  },
  {
    id: 'halloween-payaso',
    category: 'temporada',
    alt: 'Maquillaje de payaso de terror para hombre con líneas rojas',
    focus: '50% 30%',
  },
  {
    id: 'halloween-vampira-nina',
    category: 'temporada',
    alt: 'Niña con maquillaje de vampira: piel pálida, ojos ahumados y gotas de sangre',
    focus: '50% 25%',
    menor: true,
  },
  {
    id: 'halloween-joker-nino',
    category: 'temporada',
    alt: 'Niño con maquillaje del Joker, cabello verde y sonrisa roja',
    focus: '50% 25%',
    menor: true,
  },
];

export const PORTFOLIO = ALL.filter((photo) => SHOW_MINORS || !photo.menor);

/** URLs de una foto: `src` para la casilla, `srcSet` para el navegador. */
export function photoSources(id) {
  return {
    src: `/img/trabajos/${id}-960.webp`,
    srcSet: `/img/trabajos/${id}-480.webp 480w, /img/trabajos/${id}-960.webp 960w`,
  };
}

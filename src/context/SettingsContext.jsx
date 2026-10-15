import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/api.js';

/**
 * Datos del negocio (marca, contacto, redes, zona horaria, tema).
 *
 * Se piden al arrancar y se vuelven a pedir:
 *   · cuando el panel guarda cambios (`reload()`), para que la web
 *     abierta en la misma pestaña no siga mostrando lo anterior: antes,
 *     al quitar Halloween, la decoración seguía puesta hasta recargar;
 *   · cuando la pestaña vuelve a estar visible tras un rato, para que
 *     una pestaña abierta desde la víspera recoja el tema de temporada
 *     que empezó a medianoche.
 * Los valores por defecto evitan que la interfaz aparezca vacía durante
 * la carga o si la API no responde.
 */

const STALE_AFTER_MS = 5 * 60 * 1000;

const FALLBACK = {
  brandName: 'Yury Enríquez',
  tagline: 'Makeup Artist',
  aboutText: '',
  contactEmail: '',
  contactPhone: '',
  whatsappNumber: '',
  instagramUrl: null,
  tiktokUrl: null,
  facebookUrl: null,
  addressLine: '',
  mapUrl: null,
  businessHoursNote: '',
  transferInstructions: '',
  theme: 'LIGHT',
  timezone: 'America/Bogota',
  stampsRequired: 8,
  rewardDescription: '',
  minNoticeHours: 12,
  maxAdvanceDays: 90,
  slotIntervalMinutes: 30,
  bufferMinutes: 15,
  /** Adicional del domicilio dentro de Pasto, en centavos; null = no se muestra. */
  homeVisitFeeCents: null,
  /** true cuando ya respondió GET /api/settings (o falló). */
  loaded: false,
};

/** El enum del backend en mayúsculas → el atributo CSS en minúsculas. */
const THEME_ATTR = { LIGHT: null, DARK: 'dark', HALLOWEEN: 'halloween' };
const THEME_COLOR = { LIGHT: '#E9E1D4', DARK: '#181512', HALLOWEEN: '#16111B' };

/**
 * Aplica el tema al documento.
 *
 * El tema NO es una preferencia de quien visita: lo decide la
 * maquilladora desde el panel, así que no se ofrece ningún selector en
 * la web pública ni se consulta `prefers-color-scheme`. Se guarda en el
 * navegador solo para evitar el parpadeo en la siguiente visita (ver el
 * script en línea de index.html).
 */
export function applyTheme(theme) {
  const attr = THEME_ATTR[theme] ?? null;
  const root = document.documentElement;

  if (attr) root.setAttribute('data-theme', attr);
  else root.removeAttribute('data-theme');

  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme] ?? THEME_COLOR.LIGHT);

  try {
    localStorage.setItem('tema-sitio', attr ?? 'light');
  } catch {
    // Modo privado o almacenamiento bloqueado: solo se pierde el
    // antiparpadeo, el tema se sigue aplicando igual.
  }
}

export const SettingsContext = createContext(FALLBACK);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(FALLBACK);
  const mounted = useRef(true);
  const fetchedAt = useRef(0);

  const reload = useCallback(() => {
    fetchedAt.current = Date.now();
    return api
      .get('/settings')
      .then((data) => {
        if (mounted.current && data?.settings) setSettings({ ...FALLBACK, ...data.settings, loaded: true });
      })
      .catch(() => {
        // Se mantienen los valores que hubiera, pero se marca como
        // cargado para que la pantalla de entrada no espere en vano.
        if (mounted.current) setSettings((prev) => ({ ...prev, loaded: true }));
      });
  }, []);

  useEffect(() => {
    mounted.current = true;
    reload();

    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - fetchedAt.current > STALE_AFTER_MS) reload();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      mounted.current = false;
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [reload]);

  useEffect(() => {
    applyTheme(settings.theme);
  }, [settings.theme]);

  useEffect(() => {
    // Igual que el <title> de index.html: «Maquilladora profesional a
    // domicilio en Pasto» es lo que la gente busca (y dice de entrada que
    // no hay estudio); el tagline en inglés no ayuda.
    document.title = `${settings.brandName} · Maquilladora profesional a domicilio en Pasto`;
  }, [settings.brandName]);

  const value = useMemo(() => ({ ...settings, reload }), [settings, reload]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export { FALLBACK as DEFAULT_SETTINGS };

export function useSettings() {
  return useContext(SettingsContext);
}

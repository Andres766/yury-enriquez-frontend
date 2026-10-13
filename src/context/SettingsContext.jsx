import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api.js';

/**
 * Datos del negocio (marca, contacto, redes, zona horaria, tema).
 *
 * Se piden una sola vez al arrancar. Los valores por defecto evitan que
 * la interfaz aparezca vacía durante la carga o si la API no responde.
 */

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

  useEffect(() => {
    let cancelled = false;
    api
      .get('/settings')
      .then((data) => {
        if (!cancelled && data?.settings) setSettings({ ...FALLBACK, ...data.settings });
      })
      .catch(() => {
        // Se mantienen los valores por defecto.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    applyTheme(settings.theme);
  }, [settings.theme]);

  useEffect(() => {
    document.title = `${settings.brandName} · ${settings.tagline}`;
  }, [settings.brandName, settings.tagline]);

  return <SettingsContext.Provider value={settings}>{children}</SettingsContext.Provider>;
}

export { FALLBACK as DEFAULT_SETTINGS };

export function useSettings() {
  return useContext(SettingsContext);
}

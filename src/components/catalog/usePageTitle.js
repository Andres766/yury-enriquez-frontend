import { useEffect } from 'react';
import { useSettings } from '../../context/SettingsContext.jsx';

/**
 * Título de la pestaña mientras la ficha está abierta ("Paquete Novia ·
 * Yury Enríquez"); al salir vuelve el de siempre. Sirve para pestañas,
 * historial y favoritos. La vista previa de WhatsApp no lo lee, porque
 * no ejecuta JavaScript.
 *
 * Se aplica en una microtarea: cuando se entra directo a una ficha, los
 * ajustes llegan en el mismo render y SettingsContext pone el título
 * genérico DESPUÉS de los efectos de esta página (los efectos del padre
 * corren después que los del hijo). Sin esperar, ganaría el genérico.
 */
export default function usePageTitle(title) {
  const { brandName, tagline } = useSettings();

  useEffect(() => {
    if (!title) return undefined;
    let active = true;
    queueMicrotask(() => {
      if (active) document.title = `${title} · ${brandName}`;
    });
    return () => {
      active = false;
      document.title = `${brandName} · ${tagline}`;
    };
  }, [title, brandName, tagline]);
}

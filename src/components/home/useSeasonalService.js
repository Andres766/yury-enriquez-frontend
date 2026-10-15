import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { useSettings } from '../../context/SettingsContext.jsx';

/**
 * El servicio de temporada (la Catrina), si está activo.
 *
 * El tema de Halloween se enciende solo por fechas, pero el servicio de
 * Catrina se activa a mano en Panel → Servicios. Si alguien se olvida,
 * la franja y la portada no pueden invitar a "Reservar" algo que el
 * asistente no ofrece: por eso todo lo que vende la Catrina pregunta
 * aquí primero. GET /services solo devuelve los servicios activos, así
 * que encontrarlo en la lista ya significa que se puede reservar.
 *
 * La franja (en el Layout) y el inicio lo piden a la vez: comparten la
 * misma petición, que se repite como mucho cada 5 minutos.
 */

export const CATRINA_SLUG = 'maquillaje-artistico-de-catrina';

const FRESH_FOR_MS = 5 * 60 * 1000;
let cache = { at: 0, promise: null };

function activeServices() {
  if (!cache.promise || Date.now() - cache.at > FRESH_FOR_MS) {
    cache = {
      at: Date.now(),
      promise: api
        .get('/services')
        .then((data) => data?.services ?? [])
        .catch(() => {
          // Sin respuesta se asume que no hay Catrina, y se deja la caché
          // vacía para reintentar en la próxima visita a la página.
          cache = { at: 0, promise: null };
          return [];
        }),
    };
  }
  return cache.promise;
}

/**
 * El slug sale del nombre y cambiaría si Yury renombra el servicio; por
 * eso, si no aparece, se busca "catrina" en el nombre como respaldo.
 */
export function findCatrina(services = []) {
  return (
    services.find((s) => s.slug === CATRINA_SLUG) ??
    services.find((s) => /catrina/i.test(s.name ?? '')) ??
    null
  );
}

/**
 * `{ service, ready }`. Fuera de temporada no pide nada a la API y
 * responde `{ service: null, ready: true }`.
 */
export function useSeasonalService() {
  const { theme } = useSettings();
  const inSeason = theme === 'HALLOWEEN';
  const [state, setState] = useState({ service: null, ready: !inSeason });

  useEffect(() => {
    if (!inSeason) {
      setState({ service: null, ready: true });
      return undefined;
    }
    let cancelled = false;
    setState((prev) => ({ ...prev, ready: false }));
    activeServices().then((services) => {
      if (!cancelled) setState({ service: findCatrina(services), ready: true });
    });
    return () => {
      cancelled = true;
    };
  }, [inSeason]);

  return state;
}

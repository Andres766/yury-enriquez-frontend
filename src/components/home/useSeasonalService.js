import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { useSettings } from '../../context/SettingsContext.jsx';
import { toDateISO } from '../../lib/format.js';
import { seasonOver, serviceSeason } from '../booking/bookingHelpers.js';

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
 *
 * En temporada puede haber más de un servicio (Catrinas y
 * caracterización, Pintucaritas): `services` los trae todos, con la
 * Catrina primero, y `service` sigue siendo solo la Catrina para la
 * franja. Uno cuya temporada ya terminó (`availableUntil` pasado) no
 * cuenta: el asistente tampoco lo ofrece.
 */

export const CATRINA_SLUG = 'maquillaje-artistico-de-catrina';
const PINTUCARITAS_SLUG = 'pintucaritas-y-maquillaje-infantil';

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
 * Servicios de temporada: los que tienen fechas propias (`availableFrom`
 * / `availableUntil`) más la Catrina y las Pintucaritas, que son de la
 * temporada de Halloween aunque no tengan fechas. Mismo respaldo por
 * nombre que findCatrina. La Catrina va primero; el resto, en el orden
 * del panel.
 */
export function findSeasonal(services = []) {
  const catrina = findCatrina(services);
  const rest = services.filter(
    (s) =>
      s !== catrina &&
      (serviceSeason(s) || s.slug === PINTUCARITAS_SLUG || /pintucarita/i.test(s.name ?? '')),
  );
  return catrina ? [catrina, ...rest] : rest;
}

/**
 * `{ service, services, ready }`. Fuera de temporada no pide nada a la API y
 * responde `{ service: null, services: [], ready: true }`.
 */
export function useSeasonalService() {
  const { theme, timezone } = useSettings();
  const inSeason = theme === 'HALLOWEEN';
  const [state, setState] = useState({ service: null, services: [], ready: !inSeason });

  useEffect(() => {
    if (!inSeason) {
      setState({ service: null, services: [], ready: true });
      return undefined;
    }
    let cancelled = false;
    setState((prev) => ({ ...prev, ready: false }));
    activeServices().then((services) => {
      if (cancelled) return;
      const today = toDateISO(new Date(), timezone);
      const open = services.filter((s) => !seasonOver(s, today));
      setState({ service: findCatrina(open), services: findSeasonal(open), ready: true });
    });
    return () => {
      cancelled = true;
    };
  }, [inSeason, timezone]);

  return state;
}

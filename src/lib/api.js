/**
 * Cliente HTTP de la aplicación.
 *
 * Tres responsabilidades que conviene tener en un solo sitio:
 *
 *  1. El access token vive SOLO en memoria (variable de módulo), nunca
 *     en localStorage ni sessionStorage. Si alguien lograra inyectar un
 *     script, no encontraría un token esperándole en el almacenamiento.
 *     La sesión sobrevive a los recargas gracias a la cookie httpOnly
 *     de refresco, que JavaScript no puede leer.
 *
 *  2. Adjunta la cabecera X-CSRF-Token en todo método que modifique
 *     estado, copiando el valor de la cookie `csrfToken` (doble envío).
 *
 *  3. Si una petición falla con 401, intenta renovar el token una sola
 *     vez y reintenta. Las llamadas simultáneas comparten la misma
 *     promesa de renovación para no lanzar varias a la vez.
 */

const BASE_URL = import.meta.env.VITE_API_URL || '';

let accessToken = null;
let refreshPromise = null;
const subscribers = new Set();

export function setAccessToken(token) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

/** Avisa a la app cuando la sesión se pierde de forma irrecuperable. */
export function onSessionLost(callback) {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}

function notifySessionLost() {
  accessToken = null;
  subscribers.forEach((cb) => cb());
}

function readCookie(name) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export class ApiError extends Error {
  constructor(status, payload) {
    super(payload?.error || 'Error de conexión');
    this.name = 'ApiError';
    this.status = status;
    this.code = payload?.code;
    /** Errores de validación por campo: [{ field, message }] */
    this.details = payload?.details ?? [];
  }

  /** Mapa campo → mensaje, listo para pintar bajo cada input. */
  get fieldErrors() {
    return Object.fromEntries(this.details.map((d) => [d.field, d.message]));
  }
}

const UNSAFE = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

async function rawRequest(path, { method = 'GET', body, headers = {}, signal } = {}) {
  const finalHeaders = { Accept: 'application/json', ...headers };

  if (body !== undefined) finalHeaders['Content-Type'] = 'application/json';
  if (accessToken) finalHeaders.Authorization = `Bearer ${accessToken}`;

  if (UNSAFE.has(method)) {
    const csrf = readCookie('csrfToken');
    if (csrf) finalHeaders['X-CSRF-Token'] = csrf;
  }

  const response = await fetch(`${BASE_URL}/api${path}`, {
    method,
    headers: finalHeaders,
    // Necesario para que viajen la cookie de refresco y la de CSRF.
    credentials: 'include',
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });

  return response;
}

async function parse(response) {
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { error: 'Respuesta inesperada del servidor' };
  }
}

/** Renueva el access token. Una sola renovación en vuelo a la vez. */
async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await rawRequest('/auth/refresh', { method: 'POST' });
        if (!response.ok) return null;
        const data = await parse(response);
        accessToken = data?.accessToken ?? null;
        return data;
      } catch {
        return null;
      } finally {
        // Se libera en el siguiente tick para que las llamadas
        // encoladas lean el token ya actualizado.
        setTimeout(() => {
          refreshPromise = null;
        }, 0);
      }
    })();
  }
  return refreshPromise;
}

async function request(path, options = {}, { retryOn401 = true } = {}) {
  let response;
  try {
    response = await rawRequest(path, options);
  } catch (networkError) {
    if (networkError.name === 'AbortError') throw networkError;
    throw new ApiError(0, { error: 'No pudimos conectar con el servidor. Revisa tu conexión.' });
  }

  if (response.status === 401 && retryOn401 && !path.startsWith('/auth/refresh')) {
    const refreshed = await refreshAccessToken();
    if (refreshed?.accessToken) {
      return request(path, options, { retryOn401: false });
    }
    notifySessionLost();
  }

  const payload = await parse(response);

  if (!response.ok) throw new ApiError(response.status, payload);
  return payload;
}

export const api = {
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
  patch: (path, body, options) => request(path, { ...options, method: 'PATCH', body }),
  put: (path, body, options) => request(path, { ...options, method: 'PUT', body }),
  delete: (path, body, options) => request(path, { ...options, method: 'DELETE', body }),
  refresh: refreshAccessToken,
};

/** Convierte un objeto en query string, omitiendo vacíos. */
export function qs(params) {
  const search = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, value);
  });
  const str = search.toString();
  return str ? `?${str}` : '';
}

export default api;

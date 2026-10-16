import { api, ApiError } from './api.js';

/**
 * Subida de fotos a Cloudinary desde el navegador (panel de Yury).
 *
 * El archivo NUNCA pasa por nuestro servidor: el backend solo firma la
 * subida (con el secreto que vive en Render) y después verifica la
 * respuesta de Cloudinary antes de guardar la foto. Así el servidor
 * gratuito no carga con megas de fotos y el secreto no sale de allá.
 *
 * Pasos de uploadPhoto():
 *   1. Achicar la foto en el celular (lado largo ≤ 2400 px, JPEG 0,9).
 *      Las fotos de un celular moderno pesan 5–15 MB; achicadas quedan
 *      en 1–2 MB, suben mucho más rápido con datos móviles y siguen
 *      viéndose nítidas en cualquier pantalla.
 *   2. Pedir la firma a /api/media/sign (el cliente api pone CSRF y sesión).
 *   3. Subir a Cloudinary con XMLHttpRequest, porque fetch todavía no
 *      informa el avance de la subida y con datos móviles la barra de
 *      progreso es lo que evita que Yury crea que se colgó.
 *   4. Registrar la foto en /api/photos/admin con la respuesta firmada.
 */

/** Límite de Cloudinary en el plan gratuito para una imagen. */
export const MAX_BYTES = 10 * 1024 * 1024;
const MAX_SIDE = 2400;
const JPEG_QUALITY = 0.9;
const UPLOAD_TIMEOUT_MS = 5 * 60 * 1000;

/** Formatos que el navegador muestra sin problema y no hace falta convertir. */
const WEB_FRIENDLY = new Set(['image/jpeg', 'image/png', 'image/webp']);
/** Por si el celular no informa el tipo (pasa con HEIC en Android). */
const IMAGE_EXTENSION = /\.(jpe?g|png|webp|gif|heic|heif|avif|bmp|tiff?)$/i;

export class UploadError extends Error {
  constructor(message, code = 'UPLOAD_FAILED') {
    super(message);
    this.name = 'UploadError';
    this.code = code;
  }
}

const megas = (bytes) => `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;

// ── Configuración ────────────────────────────────────────────────────

let configPromise = null;

/**
 * { enabled, cloudName, folder, maxBytes }. Se pide una vez por visita
 * al panel; si falla (sin conexión), se vuelve a intentar la próxima vez
 * en vez de quedarse con el error guardado.
 */
export function getMediaConfig({ refresh = false } = {}) {
  if (!configPromise || refresh) {
    configPromise = api
      .get('/media/config')
      .then((config) => ({ enabled: false, maxBytes: MAX_BYTES, ...config }))
      .catch((error) => {
        configPromise = null;
        throw error;
      });
  }
  return configPromise;
}

// ── 1. Preparar la foto ──────────────────────────────────────────────

function looksLikeImage(file) {
  if (file.type) return file.type.startsWith('image/');
  return IMAGE_EXTENSION.test(file.name ?? '');
}

/**
 * Abre la foto con lo que tenga el navegador. createImageBitmap respeta
 * la orientación de la cámara (EXIF) en los navegadores actuales; si no
 * existe o falla, se intenta con un <img>, que también la respeta.
 * Devuelve null si el navegador no sabe leer ese formato (HEIC en
 * Chrome de Android, por ejemplo).
 */
async function decode(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return { source: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close?.() };
    } catch {
      // Se prueba abajo con <img>.
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return {
      source: img,
      width: img.naturalWidth,
      height: img.naturalHeight,
      release: () => URL.revokeObjectURL(url),
    };
  } catch {
    URL.revokeObjectURL(url);
    return null;
  }
}

function canvasToJpeg(canvas) {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));
}

/**
 * Deja la foto lista para subir: { blob, filename }.
 * Si ya es pequeña y de un formato web, se sube tal cual (sin perder
 * calidad por volver a comprimirla).
 */
export async function prepareImage(file) {
  if (!looksLikeImage(file)) {
    throw new UploadError(`«${file.name}» no es una foto. Elige un archivo de imagen (JPG, PNG, WebP o HEIC).`, 'NOT_IMAGE');
  }

  const decoded = await decode(file);

  if (!decoded) {
    // El navegador no la puede abrir, pero Cloudinary sí sabe leer HEIC:
    // se sube el original si cabe en el límite.
    if (file.size <= MAX_BYTES) return { blob: file, filename: file.name };
    throw new UploadError(
      `No pudimos abrir «${file.name}» en este navegador y pesa ${megas(file.size)} (el máximo es 10 MB). ` +
        'Ábrela en la galería del celular, compártela o guárdala como JPG, y vuelve a intentarlo.',
      'TOO_BIG',
    );
  }

  const { source, width, height, release } = decoded;
  try {
    const longest = Math.max(width, height);
    const keepOriginal = longest <= MAX_SIDE && WEB_FRIENDLY.has(file.type) && file.size <= MAX_BYTES;
    if (keepOriginal) return { blob: file, filename: file.name };

    const scale = Math.min(1, MAX_SIDE / longest);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext('2d');
    // Con muy poca memoria algunos celulares no dan el lienzo: se sube la
    // original si cabe, en vez de fallar.
    if (!ctx) {
      if (file.size <= MAX_BYTES) return { blob: file, filename: file.name };
      throw new UploadError(`No pudimos achicar «${file.name}» y pesa más de 10 MB. Cierra otras apps y vuelve a intentarlo.`, 'TOO_BIG');
    }
    // JPEG no tiene transparencia: un PNG con fondo transparente quedaría
    // negro. Se pinta blanco debajo (es el lienzo, no un color de la web).
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);

    const blob = await canvasToJpeg(canvas);
    // Liberar el lienzo ya: en celulares con poca memoria, varias fotos
    // seguidas pueden cerrar la pestaña.
    canvas.width = 0;
    canvas.height = 0;

    if (!blob) {
      if (file.size <= MAX_BYTES) return { blob: file, filename: file.name };
      throw new UploadError(`No pudimos achicar «${file.name}» y pesa más de 10 MB. Prueba con otra foto.`, 'TOO_BIG');
    }
    // Si ya era pequeña, a veces la "achicada" pesa más: se queda la original.
    if (blob.size >= file.size && longest <= MAX_SIDE && file.size <= MAX_BYTES) {
      return { blob: file, filename: file.name };
    }
    if (blob.size > MAX_BYTES) {
      throw new UploadError(`«${file.name}» sigue pesando más de 10 MB aun achicada. Prueba con otra foto.`, 'TOO_BIG');
    }
    const base = (file.name || 'foto').replace(/\.[^.]+$/, '');
    return { blob, filename: `${base}.jpg` };
  } finally {
    release();
  }
}

// ── 2. Firma ─────────────────────────────────────────────────────────

const DISABLED_MESSAGE =
  'La subida de fotos todavía no está activada en el servidor. Mientras tanto puedes ordenar y editar las fotos que ya están.';

async function requestSignature() {
  try {
    return await api.post('/media/sign', {});
  } catch (error) {
    if (error instanceof ApiError && (error.code === 'MEDIA_DISABLED' || error.status === 503)) {
      throw new UploadError(DISABLED_MESSAGE, 'MEDIA_DISABLED');
    }
    if (error instanceof ApiError && error.status === 0) {
      throw new UploadError('No hay conexión con el servidor. Revisa el internet e inténtalo de nuevo.', 'NETWORK');
    }
    throw new UploadError(error.message || 'No pudimos preparar la subida. Inténtalo de nuevo.', 'SIGN_FAILED');
  }
}

// ── 3. Subida a Cloudinary ───────────────────────────────────────────

function sendToCloudinary({ blob, filename }, signed, { onProgress, signal }) {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('file', blob, filename);
    form.append('api_key', signed.apiKey);
    form.append('timestamp', String(signed.timestamp));
    form.append('folder', signed.folder);
    form.append('signature', signed.signature);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${encodeURIComponent(signed.cloudName)}/image/upload`);
    xhr.timeout = UPLOAD_TIMEOUT_MS;

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total);
    };

    const fail = (message, code) => reject(new UploadError(message, code));

    xhr.onload = () => {
      let body = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        // Respuesta vacía o no JSON: se trata abajo como error.
      }
      if (xhr.status >= 200 && xhr.status < 300 && body?.public_id) return resolve(body);

      const detail = body?.error?.message ?? '';
      if (xhr.status === 401 || /signature|api[_ ]key/i.test(detail)) {
        return fail('Cloudinary no aceptó la firma de la subida. Revisa que las claves de Cloudinary en Render estén bien copiadas.', 'BAD_SIGNATURE');
      }
      if (/file size|too large/i.test(detail)) {
        return fail('La foto pesa más de lo que permite Cloudinary (10 MB). Prueba con otra.', 'TOO_BIG');
      }
      if (/invalid image|unsupported|format/i.test(detail)) {
        return fail('Cloudinary no pudo leer esa foto. Prueba guardándola como JPG.', 'NOT_IMAGE');
      }
      fail('Cloudinary no recibió la foto. Inténtalo de nuevo en un momento.', 'UPLOAD_FAILED');
    };
    xhr.onerror = () => fail('Se cortó la conexión mientras subía la foto. Revisa el internet e inténtalo de nuevo.', 'NETWORK');
    xhr.ontimeout = () => fail('La subida tardó demasiado. Con una mejor señal (o wifi) debería funcionar.', 'NETWORK');
    xhr.onabort = () => reject(new DOMException('Subida cancelada', 'AbortError'));

    if (signal) {
      if (signal.aborted) return reject(new DOMException('Subida cancelada', 'AbortError'));
      signal.addEventListener('abort', () => xhr.abort(), { once: true });
    }

    xhr.send(form);
  });
}

// ── Todo junto ───────────────────────────────────────────────────────

/**
 * Sube una foto y la deja guardada en la biblioteca.
 *
 * onProgress({ phase, percent }) con phase = 'preparing' | 'uploading' |
 * 'saving'. `metadata` es lo que se guarda junto a la foto (alt,
 * category, inGallery, featured, focus, credit, minor).
 *
 * Devuelve la foto creada. Lanza UploadError con un mensaje listo para
 * mostrarle a Yury.
 */
export async function uploadPhoto(file, { onProgress, metadata = {}, signal } = {}) {
  onProgress?.({ phase: 'preparing', percent: 0 });
  const prepared = await prepareImage(file);
  if (prepared.blob.size > MAX_BYTES) {
    throw new UploadError(`«${file.name}» pesa ${megas(prepared.blob.size)}; el máximo es 10 MB.`, 'TOO_BIG');
  }

  const signed = await requestSignature();

  onProgress?.({ phase: 'uploading', percent: 0 });
  const uploaded = await sendToCloudinary(prepared, signed, {
    signal,
    // Se deja el último 5 % para el registro en nuestro servidor.
    onProgress: (fraction) => onProgress?.({ phase: 'uploading', percent: Math.round(fraction * 95) }),
  });

  onProgress?.({ phase: 'saving', percent: 96 });
  const { public_id, version, signature, secure_url, width, height, bytes, format } = uploaded;
  try {
    const { photo } = await api.post('/photos/admin', {
      public_id,
      version,
      signature,
      secure_url,
      width,
      height,
      bytes,
      format,
      ...metadata,
    });
    onProgress?.({ phase: 'saving', percent: 100 });
    return photo;
  } catch (error) {
    if (error instanceof ApiError && error.status === 0) {
      throw new UploadError('La foto subió, pero se cortó la conexión al guardarla. Inténtalo de nuevo.', 'NETWORK');
    }
    throw new UploadError(error.message || 'La foto subió, pero no pudimos guardarla. Inténtalo de nuevo.', 'SAVE_FAILED');
  }
}

/** Mensaje amable para cualquier error de subida. */
export function uploadErrorMessage(error) {
  if (error instanceof UploadError) return error.message;
  if (error?.name === 'AbortError') return 'Subida cancelada.';
  return 'No pudimos subir la foto. Inténtalo de nuevo.';
}

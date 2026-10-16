import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { uploadPhoto, uploadErrorMessage } from '../../lib/cloudinary.js';
import { Button, cx } from '../ui/index.jsx';

/**
 * Subida de fotos del panel: la zona para elegirlas (o arrastrarlas en
 * el computador) y la lista con el avance de cada una.
 *
 * Las fotos suben de UNA en una, no todas a la vez: con datos móviles,
 * diez subidas en paralelo se estorban, todas van lentas y si se cae la
 * señal fallan todas. En fila, cada una que termina ya queda guardada.
 */

const PHASE_LABEL = {
  waiting: 'En espera',
  preparing: 'Preparando…',
  uploading: 'Subiendo',
  saving: 'Guardando…',
  done: 'Lista',
  error: 'No se subió',
};

let counter = 0;

export function useUploads({ onUploaded } = {}) {
  const [items, setItems] = useState([]);
  const queue = useRef([]);
  const files = useRef(new Map()); // key → { file, metadata }, para reintentar
  const running = useRef(false);
  const mounted = useRef(true);
  const onUploadedRef = useRef(onUploaded);
  onUploadedRef.current = onUploaded;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const patch = (key, changes) => {
    if (mounted.current) setItems((list) => list.map((it) => (it.key === key ? { ...it, ...changes } : it)));
  };

  const run = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    while (queue.current.length > 0 && mounted.current) {
      const key = queue.current.shift();
      const entry = files.current.get(key);
      if (!entry) continue;
      try {
        const photo = await uploadPhoto(entry.file, {
          metadata: entry.metadata,
          onProgress: ({ phase, percent }) => patch(key, { status: phase, percent }),
        });
        files.current.delete(key);
        patch(key, { status: 'done', percent: 100, photo });
        onUploadedRef.current?.(photo);
      } catch (error) {
        patch(key, { status: 'error', error: uploadErrorMessage(error) });
      }
    }
    running.current = false;
  }, []);

  /** Pone en fila las fotos elegidas. `metadata` va con cada una. */
  const add = useCallback(
    (fileList, metadata = {}) => {
      const picked = [...(fileList ?? [])];
      if (picked.length === 0) return;
      const added = picked.map((file) => {
        counter += 1;
        const key = `up-${counter}`;
        files.current.set(key, { file, metadata });
        queue.current.push(key);
        return { key, name: file.name || 'Foto', status: 'waiting', percent: 0, error: null };
      });
      setItems((list) => [...list.filter((it) => it.status !== 'done'), ...added]);
      run();
    },
    [run],
  );

  const retry = useCallback(
    (key) => {
      if (!files.current.has(key)) return;
      patch(key, { status: 'waiting', percent: 0, error: null });
      queue.current.push(key);
      run();
    },
    [run],
  );

  const dismiss = useCallback((key) => {
    files.current.delete(key);
    queue.current = queue.current.filter((k) => k !== key);
    setItems((list) => list.filter((it) => it.key !== key));
  }, []);

  const busy = items.some((it) => !['done', 'error'].includes(it.status));
  return { items, add, retry, dismiss, busy };
}

/**
 * Zona de subida. En el celular, accept="image/*" hace que el sistema
 * ofrezca tomar una foto con la cámara o elegirla de la galería.
 */
export function UploadDropzone({ onFiles, disabled, multiple = true, label = 'Subir fotos', hint, compact = false }) {
  const inputRef = useRef(null);
  const inputId = useId();
  const hintId = useId();
  const [over, setOver] = useState(false);

  // Solo se reacciona a archivos, no a una foto de la grilla que se
  // está arrastrando para reordenar.
  const hasFiles = (event) => [...(event.dataTransfer?.types ?? [])].includes('Files');

  return (
    <div
      onDragOver={(event) => {
        if (disabled || !hasFiles(event)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
        setOver(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOver(false);
      }}
      onDrop={(event) => {
        if (disabled || !hasFiles(event)) return;
        event.preventDefault();
        setOver(false);
        onFiles(event.dataTransfer.files);
      }}
      className={cx(
        'flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed text-center transition',
        compact ? 'px-4 py-4' : 'px-4 py-7',
        over ? 'border-brand-500 bg-brand-50' : 'border-line bg-cream',
        disabled && 'opacity-60',
      )}
    >
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/*"
        multiple={multiple}
        disabled={disabled}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          onFiles(event.target.files);
          // Para poder elegir la misma foto otra vez (p. ej. tras un error).
          event.target.value = '';
        }}
      />
      {!compact && (
        <svg viewBox="0 0 24 24" className="h-8 w-8 text-brand-500" fill="none" aria-hidden="true">
          <path
            d="M4.5 16.5v2a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1v-2M12 15V4.5M7.5 9 12 4.5 16.5 9"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      <Button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        aria-describedby={hint ? hintId : undefined}
      >
        {label}
      </Button>
      <p id={hintId} className="text-xs leading-relaxed text-ink-500">
        {hint ?? 'Desde la cámara o la galería del celular.'}
        <span className="hidden sm:inline"> En el computador también puedes arrastrarlas aquí.</span>
      </p>
    </div>
  );
}

/** Avance de cada foto. Las terminadas se van solas de la lista al subir más. */
export function UploadList({ items, onRetry, onDismiss }) {
  if (items.length === 0) return null;
  return (
    <ul className="mt-3 space-y-2" aria-label="Fotos subiendo">
      {items.map((item) => {
        const active = !['done', 'error', 'waiting'].includes(item.status);
        return (
          <li
            key={item.key}
            className={cx(
              'rounded-xl border px-3 py-2.5',
              item.status === 'error' ? 'border-red-200 bg-red-50' : 'border-line bg-surface',
            )}
          >
            <div className="flex items-center gap-3">
              <p className="min-w-0 flex-1 truncate text-sm text-ink-700">{item.name}</p>
              <span
                className={cx(
                  'shrink-0 text-xs font-medium',
                  item.status === 'error' ? 'text-red-700' : item.status === 'done' ? 'text-emerald-700' : 'text-ink-500',
                )}
              >
                {PHASE_LABEL[item.status]}
                {item.status === 'uploading' ? ` ${item.percent} %` : ''}
              </span>
              {(item.status === 'error' || item.status === 'done') && (
                <button
                  type="button"
                  onClick={() => onDismiss(item.key)}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-ink-400 transition hover:bg-blush hover:text-ink-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
                  aria-label={`Quitar «${item.name}» de la lista`}
                >
                  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
                    <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </div>

            {(active || item.status === 'waiting') && (
              <div
                role="progressbar"
                aria-label={`Subiendo ${item.name}`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={item.percent}
                className="mt-2 h-1.5 overflow-hidden rounded-full bg-blush"
              >
                <div
                  className="h-full rounded-full bg-brand-600 transition-[width] duration-300"
                  style={{ width: `${Math.max(item.status === 'waiting' ? 0 : 4, item.percent)}%` }}
                />
              </div>
            )}

            {item.status === 'error' && (
              <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs leading-relaxed text-red-800" role="alert">
                  {item.error}
                </p>
                {onRetry && (
                  <button
                    type="button"
                    onClick={() => onRetry(item.key)}
                    className="min-h-[44px] text-xs font-medium text-brand-700 transition hover:underline"
                  >
                    Intentar otra vez
                  </button>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

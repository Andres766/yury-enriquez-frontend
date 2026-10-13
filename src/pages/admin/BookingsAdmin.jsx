import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { api, qs } from '../../lib/api.js';
import { useSettings } from '../../context/SettingsContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import {
  money, longDate, time, shortDate, duration, toDateISO,
  STATUS_LABEL, STATUS_TONE, PAYMENT_LABEL, whatsappLink, WEEKDAYS,
} from '../../lib/format.js';
import {
  Button, Input, Select, Textarea, Badge, Alert, LoadingBlock, EmptyState, Spinner, cx,
} from '../../components/ui/index.jsx';

/**
 * Gestión de reservas.
 *
 * Dos vistas sobre los mismos datos: listado filtrable (lo que se usa
 * para trabajar) y calendario semanal (lo que se usa para ver de un
 * vistazo cómo viene la semana).
 */

const STATUSES = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];

export default function BookingsAdmin() {
  const settings = useSettings();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [view, setView] = useState('lista');
  const [filters, setFilters] = useState({
    status: searchParams.get('estado') ?? '',
    q: searchParams.get('codigo') ?? '',
    from: '',
    to: '',
  });
  const [data, setData] = useState({ items: [], total: 0, page: 1, pageSize: 25 });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const load = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const result = await api.get(
          `/bookings/admin${qs({
            status: filters.status || undefined,
            q: filters.q || undefined,
            from: filters.from ? new Date(`${filters.from}T00:00:00`).toISOString() : undefined,
            to: filters.to ? new Date(`${filters.to}T23:59:59`).toISOString() : undefined,
            page,
            pageSize: 25,
          })}`,
        );
        setData(result);
      } catch (error) {
        toast.error(error.message);
      } finally {
        setLoading(false);
      }
    },
    [filters, toast],
  );

  useEffect(() => {
    const timer = setTimeout(() => load(1), 250);
    return () => clearTimeout(timer);
  }, [load]);

  // Mantiene la URL en sintonía con los filtros, para poder compartirla.
  useEffect(() => {
    const next = new URLSearchParams();
    if (filters.status) next.set('estado', filters.status);
    if (filters.q) next.set('codigo', filters.q);
    setSearchParams(next, { replace: true });
  }, [filters.status, filters.q, setSearchParams]);

  const setFilter = (key) => (event) => setFilters((f) => ({ ...f, [key]: event.target.value }));

  async function act(booking, action, payload = {}) {
    try {
      const path =
        action === 'reschedule'
          ? `/bookings/admin/${booking.id}/reschedule`
          : `/bookings/admin/${booking.id}/status`;

      const { booking: updated } = await api.patch(path, payload);

      setData((d) => ({ ...d, items: d.items.map((b) => (b.id === updated.id ? { ...b, ...updated } : b)) }));
      setSelected((s) => (s?.id === updated.id ? { ...s, ...updated } : s));

      const messages = {
        CONFIRMED: 'Cita confirmada. Se envió el correo a la clienta.',
        CANCELLED: 'Cita cancelada. Se avisó a la clienta.',
        COMPLETED: 'Cita marcada como completada. Ya puedes otorgar el sello.',
        NO_SHOW: 'Marcada como no asistió.',
        reschedule: 'Cita reprogramada. Se avisó a la clienta.',
      };
      toast.success(messages[payload.status ?? action] ?? 'Reserva actualizada.');
      return true;
    } catch (error) {
      toast.error(error.message);
      return false;
    }
  }

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl">Reservas</h1>
          <p className="mt-1.5 text-sm text-ink-500">
            {data.total} {data.total === 1 ? 'reserva' : 'reservas'} con los filtros actuales.
          </p>
        </div>

        <div className="flex rounded-full border border-line bg-surface p-1 shadow-soft" role="group" aria-label="Cambiar vista">
          {[
            ['lista', 'Listado'],
            ['calendario', 'Calendario'],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setView(key)}
              aria-pressed={view === key}
              className={cx(
                'min-h-[36px] rounded-full px-4 text-sm font-medium transition',
                view === key ? 'bg-brand-600 text-on-brand' : 'text-ink-600 hover:bg-blush',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {/* Filtros */}
      <div className="mb-6 grid gap-3 rounded-2xl border border-line bg-surface p-4 shadow-soft sm:grid-cols-2 lg:grid-cols-4">
        <Input
          label="Buscar"
          value={filters.q}
          onChange={setFilter('q')}
          placeholder="Nombre, correo, teléfono o código"
          type="search"
        />
        <Select label="Estado" value={filters.status} onChange={setFilter('status')}>
          <option value="">Todos</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABEL[status]}
            </option>
          ))}
        </Select>
        <Input label="Desde" type="date" value={filters.from} onChange={setFilter('from')} />
        <Input label="Hasta" type="date" value={filters.to} onChange={setFilter('to')} />
      </div>

      {loading ? (
        <LoadingBlock />
      ) : data.items.length === 0 ? (
        <EmptyState
          title="Sin reservas"
          description="No hay reservas que coincidan con estos filtros."
          action={
            <Button variant="secondary" onClick={() => setFilters({ status: '', q: '', from: '', to: '' })}>
              Quitar filtros
            </Button>
          }
        />
      ) : view === 'lista' ? (
        <BookingList items={data.items} settings={settings} onSelect={setSelected} />
      ) : (
        <WeekCalendar items={data.items} settings={settings} onSelect={setSelected} />
      )}

      {/* Paginación */}
      {data.total > data.pageSize && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            disabled={data.page <= 1}
            onClick={() => load(data.page - 1)}
          >
            Anterior
          </Button>
          <span className="text-sm text-ink-500">
            Página {data.page} de {Math.ceil(data.total / data.pageSize)}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={data.page >= Math.ceil(data.total / data.pageSize)}
            onClick={() => load(data.page + 1)}
          >
            Siguiente
          </Button>
        </div>
      )}

      <AnimatePresence>
        {selected && (
          <BookingDrawer
            booking={selected}
            settings={settings}
            onClose={() => setSelected(null)}
            onAct={act}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Listado ──────────────────────────────────────────────────────────

function BookingList({ items, settings, onSelect }) {
  return (
    <ul className="space-y-3">
      {items.map((booking) => (
        <li key={booking.id}>
          <button
            type="button"
            onClick={() => onSelect(booking)}
            className="flex w-full flex-wrap items-center gap-4 rounded-2xl border border-line bg-surface p-4 text-left shadow-soft transition hover:border-brand-200 hover:shadow-lift focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
          >
            <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-blush text-brand-800">
              <span className="text-[10px] uppercase leading-none">
                {new Intl.DateTimeFormat('es-CO', { month: 'short', timeZone: settings.timezone })
                  .format(new Date(booking.startAt))
                  .replace('.', '')}
              </span>
              <span className="font-display text-xl leading-tight">
                {new Intl.DateTimeFormat('es-CO', { day: 'numeric', timeZone: settings.timezone }).format(
                  new Date(booking.startAt),
                )}
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-ink-800">{booking.customerName}</p>
                {!booking.userId && <Badge tone="outline">Invitada</Badge>}
              </div>
              <p className="mt-0.5 truncate text-sm text-ink-500">{booking.service.name}</p>
              <p className="mt-0.5 text-xs text-ink-400">
                {time(booking.startAt, settings.timezone)} · {booking.customerPhone} ·{' '}
                {PAYMENT_LABEL[booking.paymentMethod]}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="font-display text-lg text-ink-800">
                  {money(booking.priceCents, booking.currency)}
                </p>
                <p className="font-mono text-[10px] tracking-wider text-ink-400">{booking.code}</p>
              </div>
              <span className={cx('rounded-full border px-2.5 py-1 text-[11px] font-medium', STATUS_TONE[booking.status])}>
                {STATUS_LABEL[booking.status]}
              </span>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}

// ── Calendario semanal ───────────────────────────────────────────────

function WeekCalendar({ items, settings, onSelect }) {
  const [offset, setOffset] = useState(0);

  const { days, label } = useMemo(() => {
    const base = new Date();
    base.setDate(base.getDate() + offset * 7);
    const weekday = (base.getDay() + 6) % 7;
    const monday = new Date(base);
    monday.setDate(base.getDate() - weekday);
    monday.setHours(0, 0, 0, 0);

    const list = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });

    return {
      days: list,
      label: `${shortDate(list[0], settings.timezone)} – ${shortDate(list[6], settings.timezone)}`,
    };
  }, [offset, settings.timezone]);

  const byDay = useMemo(() => {
    const map = new Map();
    items.forEach((booking) => {
      const key = toDateISO(booking.startAt, settings.timezone);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(booking);
    });
    map.forEach((list) => list.sort((a, b) => new Date(a.startAt) - new Date(b.startAt)));
    return map;
  }, [items, settings.timezone]);

  return (
    <div className="rounded-2xl border border-line bg-surface p-4 shadow-soft sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <Button variant="secondary" size="sm" onClick={() => setOffset((o) => o - 1)}>
          ← Anterior
        </Button>
        <p className="text-sm font-medium text-ink-700">{label}</p>
        <Button variant="secondary" size="sm" onClick={() => setOffset((o) => o + 1)}>
          Siguiente →
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {days.map((day, i) => {
          const key = toDateISO(day, settings.timezone);
          const list = byDay.get(key) ?? [];
          const isToday = key === toDateISO(new Date(), settings.timezone);

          return (
            <div
              key={key}
              className={cx(
                'min-h-[8rem] rounded-xl border p-3',
                isToday ? 'border-brand-300 bg-brand-50' : 'border-line bg-cream/40',
              )}
            >
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-500">
                {WEEKDAYS[i].short}{' '}
                <span className="font-normal text-ink-400">{day.getDate()}</span>
              </p>

              {list.length === 0 ? (
                <p className="text-xs text-ink-400">Sin citas</p>
              ) : (
                <ul className="space-y-1.5">
                  {list.map((booking) => (
                    <li key={booking.id}>
                      <button
                        type="button"
                        onClick={() => onSelect(booking)}
                        className={cx(
                          'w-full rounded-lg border p-2 text-left text-xs transition hover:shadow-soft',
                          STATUS_TONE[booking.status],
                        )}
                      >
                        <span className="block font-semibold tabular-nums">
                          {time(booking.startAt, settings.timezone)}
                        </span>
                        <span className="block truncate">{booking.customerName}</span>
                        <span className="block truncate opacity-75">{booking.service.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Panel lateral de detalle ─────────────────────────────────────────

function BookingDrawer({ booking, settings, onClose, onAct }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState(null); // 'cancel' | 'reschedule'
  const [reason, setReason] = useState('');
  const [adminNotes, setAdminNotes] = useState(booking.adminNotes ?? '');
  const [slots, setSlots] = useState([]);
  const [newDate, setNewDate] = useState('');
  const [newSlot, setNewSlot] = useState('');
  const [slotsLoading, setSlotsLoading] = useState(false);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  useEffect(() => {
    if (!newDate) return;
    setSlotsLoading(true);
    setNewSlot('');
    api
      .get(`/availability/slots${qs({ serviceId: booking.service.id, date: newDate })}`)
      .then((d) => setSlots(d.slots ?? []))
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [newDate, booking.service.id]);

  const run = async (action, payload) => {
    setBusy(true);
    const ok = await onAct(booking, action, payload);
    setBusy(false);
    if (ok) {
      setMode(null);
      setReason('');
    }
  };

  const serviceEnd = new Date(new Date(booking.startAt).getTime() + booking.service.durationMinutes * 60_000);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-scrim/35 backdrop-blur-sm"
        aria-hidden="true"
      />

      <motion.aside
        role="dialog"
        aria-modal="true"
        aria-label={`Reserva ${booking.code}`}
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 34 }}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-line bg-surface shadow-lift"
      >
        <header className="flex items-start justify-between gap-4 border-b border-line p-5">
          <div>
            <p className="font-mono text-xs tracking-wider text-ink-400">{booking.code}</p>
            <h2 className="mt-1 font-display text-2xl text-ink-800">{booking.customerName}</h2>
            <span className={cx('mt-2 inline-block rounded-full border px-2.5 py-1 text-[11px] font-medium', STATUS_TONE[booking.status])}>
              {STATUS_LABEL[booking.status]}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-500 transition hover:bg-blush"
            aria-label="Cerrar detalle"
          >
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden="true">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5">
          <dl className="space-y-3 text-sm">
            {[
              ['Servicio', booking.service.name],
              ['Duración', duration(booking.service.durationMinutes)],
              ['Ocasión', booking.occasion?.name],
              ['Fecha', longDate(booking.startAt, settings.timezone)],
              ['Hora', `${time(booking.startAt, settings.timezone)} – ${time(serviceEnd, settings.timezone)}`],
              ['Valor', money(booking.priceCents, booking.currency)],
              ['Pago', PAYMENT_LABEL[booking.paymentMethod]],
              ['Tipo', booking.userId ? 'Clienta registrada' : 'Invitada (sin cuenta)'],
            ]
              .filter(([, v]) => v)
              .map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                  <dt className="text-ink-500">{label}</dt>
                  <dd className="text-right font-medium capitalize text-ink-800">{value}</dd>
                </div>
              ))}
          </dl>

          <div className="mt-5 space-y-2 rounded-2xl bg-blush p-4 text-sm">
            <a
              href={whatsappLink(booking.customerPhone, `Hola ${booking.customerName.split(' ')[0]}, te escribo de ${settings.brandName}.`)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-2 font-medium text-wa hover:underline"
            >
              {booking.customerPhone}
              <span className="text-xs">WhatsApp →</span>
            </a>
            <a href={`mailto:${booking.customerEmail}`} className="block truncate text-brand-700 hover:underline">
              {booking.customerEmail}
            </a>
          </div>

          {booking.notes && (
            <div className="mt-4 rounded-2xl border border-line p-4">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-ink-400">
                Notas de la clienta
              </p>
              <p className="whitespace-pre-line text-sm leading-relaxed text-ink-600">{booking.notes}</p>
            </div>
          )}

          {/* Reprogramar */}
          {mode === 'reschedule' && (
            <div className="mt-5 rounded-2xl border border-brand-200 bg-brand-50 p-4">
              <p className="mb-3 font-medium text-ink-800">Reprogramar cita</p>
              <Input
                label="Nueva fecha"
                type="date"
                value={newDate}
                min={toDateISO(new Date(), settings.timezone)}
                onChange={(e) => setNewDate(e.target.value)}
              />

              {newDate && (
                <div className="mt-3">
                  <p className="label-base">Nuevo horario</p>
                  {slotsLoading ? (
                    <div className="flex justify-center py-4">
                      <Spinner className="h-5 w-5 text-brand-500" />
                    </div>
                  ) : slots.length === 0 ? (
                    <Alert tone="warning">Ese día no tiene huecos libres para este servicio.</Alert>
                  ) : (
                    <div className="grid grid-cols-3 gap-1.5">
                      {slots.map((slot) => (
                        <button
                          key={slot.start}
                          type="button"
                          onClick={() => setNewSlot(slot.start)}
                          className={cx(
                            'min-h-[38px] rounded-lg border text-xs font-medium transition',
                            newSlot === slot.start
                              ? 'border-brand-600 bg-brand-600 text-on-brand'
                              : 'border-line bg-surface text-ink-700 hover:bg-blush',
                          )}
                        >
                          {slot.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <Button
                  size="sm"
                  disabled={!newSlot}
                  loading={busy}
                  onClick={() => run('reschedule', { startAt: newSlot })}
                >
                  Confirmar cambio
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setMode(null)}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {/* Cancelar */}
          {mode === 'cancel' && (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4">
              <p className="mb-3 font-medium text-red-900">Cancelar esta cita</p>
              <Textarea
                label="Motivo (se incluye en el correo)"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={300}
                placeholder="Imprevisto de agenda, solicitud de la clienta…"
              />
              <div className="mt-4 flex gap-2">
                <Button
                  size="sm"
                  variant="danger"
                  loading={busy}
                  onClick={() => run('status', { status: 'CANCELLED', reason: reason || undefined })}
                >
                  Confirmar cancelación
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setMode(null)}>
                  Volver
                </Button>
              </div>
            </div>
          )}

          {/* Notas internas */}
          <div className="mt-5">
            <Textarea
              label="Notas internas"
              rows={3}
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              maxLength={1000}
              hint="Solo las ves tú. No se envían a la clienta."
            />
            <Button
              size="sm"
              variant="secondary"
              className="mt-2"
              loading={busy}
              onClick={() => run('status', { status: booking.status, adminNotes })}
            >
              Guardar notas
            </Button>
          </div>
        </div>

        {/* Acciones */}
        <footer className="border-t border-line bg-cream p-4">
          <div className="grid grid-cols-2 gap-2">
            {booking.status !== 'CONFIRMED' && booking.status !== 'CANCELLED' && (
              <Button size="sm" loading={busy} onClick={() => run('status', { status: 'CONFIRMED' })}>
                Confirmar
              </Button>
            )}
            {['CONFIRMED', 'PENDING'].includes(booking.status) && (
              <Button size="sm" variant="secondary" loading={busy} onClick={() => run('status', { status: 'COMPLETED' })}>
                Completada
              </Button>
            )}
            {booking.status !== 'CANCELLED' && (
              <Button size="sm" variant="secondary" onClick={() => setMode('reschedule')}>
                Reprogramar
              </Button>
            )}
            {['CONFIRMED', 'PENDING'].includes(booking.status) && (
              <Button size="sm" variant="secondary" loading={busy} onClick={() => run('status', { status: 'NO_SHOW' })}>
                No asistió
              </Button>
            )}
            {booking.status !== 'CANCELLED' && (
              <Button size="sm" variant="ghost" className="col-span-2" onClick={() => setMode('cancel')}>
                Cancelar cita
              </Button>
            )}
          </div>
        </footer>
      </motion.aside>
    </>
  );
}

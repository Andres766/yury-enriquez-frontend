import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { api, qs } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import { longDate, shortDate, STATUS_LABEL } from '../../lib/format.js';
import {
  Button, Input, Textarea, Badge, Alert, LoadingBlock, EmptyState, Select, cx,
} from '../../components/ui/index.jsx';

/**
 * Fidelidad.
 *
 * Los sellos SOLO se otorgan desde aquí. Es intencional: un sello
 * representa un servicio efectivamente prestado, no una reserva creada.
 * Por eso al sellar se puede (y conviene) vincular la reserva concreta,
 * y la API exige que esa reserva esté marcada como completada.
 */
export default function LoyaltyAdmin() {
  const toast = useToast();
  const settings = useSettings();

  const [query, setQuery] = useState('');
  const [data, setData] = useState({ items: [], total: 0, stampsRequired: 8 });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await api.get(`/loyalty/admin/cards${qs({ q: query || undefined, pageSize: 50 })}`));
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [query, toast]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-3xl">Tarjetas de fidelidad</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-500">
          {data.total} {data.total === 1 ? 'clienta registrada' : 'clientas registradas'}. La recompensa se
          desbloquea a los {data.stampsRequired} sellos:{' '}
          <span className="font-medium text-ink-700">{settings.rewardDescription}</span>.
        </p>
      </header>

      <div className="mb-5 max-w-md">
        <Input
          label="Buscar clienta"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nombre, correo o teléfono"
        />
      </div>

      <Alert tone="info" className="mb-6">
        Las clientas que reservan como invitadas no tienen tarjeta: solo aparece quien creó una cuenta.
        Si alguien quiere acumular sellos, invítala a registrarse con el mismo correo de sus reservas.
      </Alert>

      {loading ? (
        <LoadingBlock />
      ) : data.items.length === 0 ? (
        <EmptyState
          title="Sin clientas registradas"
          description="Cuando alguien cree su cuenta, su tarjeta aparecerá aquí."
        />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.items.map((client) => {
            const percent = Math.round((client.stampsCurrent / Math.max(1, data.stampsRequired)) * 100);

            return (
              <li key={client.id}>
                <button
                  type="button"
                  onClick={() => setSelected(client)}
                  className="flex h-full w-full flex-col rounded-2xl border border-line bg-surface p-5 text-left shadow-soft transition hover:border-brand-200 hover:shadow-lift focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink-800">{client.fullName}</p>
                      <p className="truncate text-xs text-ink-500">{client.email}</p>
                    </div>
                    {client.availableRewards.length > 0 && <Badge tone="gold">Premio</Badge>}
                  </div>

                  <div className="mt-4">
                    <div className="flex items-baseline justify-between">
                      <span className="font-display text-2xl text-brand-700">
                        {client.stampsCurrent}
                        <span className="text-base text-ink-400">/{data.stampsRequired}</span>
                      </span>
                      <span className="text-xs text-ink-400">{client.stampsTotal} históricos</span>
                    </div>

                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-line">
                      <div
                        className="h-full rounded-full bg-brand-500 transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>

                  <p className="mt-4 text-xs text-ink-400">
                    {client.bookingsCount} {client.bookingsCount === 1 ? 'reserva' : 'reservas'} · desde{' '}
                    {shortDate(client.createdAt)}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <AnimatePresence>
        {selected && (
          <ClientPanel
            client={selected}
            stampsRequired={data.stampsRequired}
            settings={settings}
            onClose={() => setSelected(null)}
            onChanged={() => {
              load();
              setSelected(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ClientPanel({ client, stampsRequired, settings, onClose, onChanged }) {
  const toast = useToast();
  const [bookings, setBookings] = useState([]);
  const [bookingId, setBookingId] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadingBookings, setLoadingBookings] = useState(true);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  // Solo se ofrecen para sellar las citas completadas y aún sin sello.
  useEffect(() => {
    api
      .get(`/bookings/admin${qs({ q: client.email, status: 'COMPLETED', pageSize: 50 })}`)
      .then((d) => setBookings(d.items ?? []))
      .catch(() => setBookings([]))
      .finally(() => setLoadingBookings(false));
  }, [client.email]);

  async function grantStamp() {
    setBusy(true);
    try {
      const result = await api.post('/loyalty/admin/stamps', {
        userId: client.id,
        bookingId: bookingId || null,
        note: note || undefined,
      });

      if (result.unlockedReward) {
        toast.success(`¡${client.fullName.split(' ')[0]} completó su tarjeta! Le avisamos por correo.`, 9000);
      } else {
        toast.success('Sello otorgado.');
      }
      onChanged();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function revokeLast() {
    if (!window.confirm('¿Quitar el último sello de esta clienta?')) return;
    setBusy(true);
    try {
      await api.delete('/loyalty/admin/stamps/last', { userId: client.id });
      toast.success('Sello retirado.');
      onChanged();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function redeem(rewardId) {
    setBusy(true);
    try {
      await api.post(`/loyalty/admin/rewards/${rewardId}/redeem`);
      toast.success('Recompensa marcada como canjeada.');
      onChanged();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  }

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
        aria-label={`Tarjeta de ${client.fullName}`}
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 34 }}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-line bg-surface shadow-lift"
      >
        <header className="flex items-start justify-between gap-4 border-b border-line p-5">
          <div className="min-w-0">
            <h2 className="font-display text-2xl text-ink-800">{client.fullName}</h2>
            <p className="mt-0.5 truncate text-sm text-ink-500">{client.email}</p>
            {client.phone && <p className="text-sm text-ink-500">{client.phone}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-500 transition hover:bg-blush"
            aria-label="Cerrar"
          >
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden="true">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5">
          {/* Estado de la tarjeta */}
          <div className="rounded-2xl bg-brand-gradient p-5 text-white">
            <p className="text-[11px] uppercase tracking-widest text-white/70">Sellos del ciclo</p>
            <p className="mt-1 font-display text-4xl leading-none">
              {client.stampsCurrent}
              <span className="text-2xl text-white/60">/{stampsRequired}</span>
            </p>

            <ul className="mt-4 flex flex-wrap gap-1.5">
              {Array.from({ length: stampsRequired }, (_, i) => (
                <li
                  key={i}
                  className={cx(
                    'h-6 w-6 rounded-full border-2',
                    i < client.stampsCurrent ? 'border-white bg-surface/90' : 'border-white/40',
                  )}
                  aria-hidden="true"
                />
              ))}
            </ul>
            <p className="sr-only">
              {client.stampsCurrent} de {stampsRequired} sellos conseguidos.
            </p>
          </div>

          {/* Recompensas disponibles */}
          {client.availableRewards.length > 0 && (
            <div className="mt-5 rounded-2xl border border-gold-300 bg-gold-100 p-4">
              <p className="font-medium text-gold-800">Recompensa lista para canjear</p>
              {client.availableRewards.map((reward) => (
                <div key={reward.id} className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-sm text-gold-700">{reward.description}</span>
                  <Button size="sm" variant="gold" loading={busy} onClick={() => redeem(reward.id)}>
                    Canjear
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Otorgar sello */}
          <div className="mt-6 rounded-2xl border border-line p-4">
            <h3 className="font-medium text-ink-800">Otorgar un sello</h3>
            <p className="mt-1 text-xs leading-relaxed text-ink-500">
              Hazlo después de prestar el servicio. Vincular la cita evita sellar dos veces la misma.
            </p>

            <div className="mt-4 space-y-4">
              {loadingBookings ? (
                <p className="text-sm text-ink-400">Buscando sus citas completadas…</p>
              ) : bookings.length === 0 ? (
                <Alert tone="warning">
                  Esta clienta no tiene citas marcadas como completadas. Puedes sellar igualmente sin
                  vincular reserva, o marcar primero la cita como completada en <strong>Reservas</strong>.
                </Alert>
              ) : (
                <Select
                  label="Vincular a una cita completada"
                  value={bookingId}
                  onChange={(e) => setBookingId(e.target.value)}
                  hint="Recomendado, pero opcional."
                >
                  <option value="">Sin vincular</option>
                  {bookings
                    .filter((b) => !b.stamp)
                    .map((booking) => (
                      <option key={booking.id} value={booking.id}>
                        {shortDate(booking.startAt, settings.timezone)} · {booking.service.name}
                      </option>
                    ))}
                </Select>
              )}

              <Textarea
                label="Nota"
                rows={2}
                maxLength={200}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Maquillaje de novia, enero"
              />

              <div className="flex gap-2">
                <Button loading={busy} onClick={grantStamp} className="flex-1">
                  Sellar
                </Button>
                <Button
                  variant="ghost"
                  disabled={client.stampsTotal === 0}
                  loading={busy}
                  onClick={revokeLast}
                >
                  Quitar último
                </Button>
              </div>
            </div>
          </div>

          <p className="mt-5 text-xs leading-relaxed text-ink-400">
            Clienta desde {longDate(client.createdAt, settings.timezone)} · {client.bookingsCount}{' '}
            {client.bookingsCount === 1 ? 'reserva' : 'reservas'} · {client.stampsTotal} sellos históricos.
          </p>
        </div>
      </motion.aside>
    </>
  );
}

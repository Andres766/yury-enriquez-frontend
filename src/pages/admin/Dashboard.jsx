import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../../lib/api.js';
import { useSettings } from '../../context/SettingsContext.jsx';
import { money, longDate, time, STATUS_LABEL, STATUS_TONE, whatsappLink } from '../../lib/format.js';
import { LoadingBlock, Button, EmptyState, cx } from '../../components/ui/index.jsx';

export default function Dashboard() {
  const settings = useSettings();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/bookings/admin/stats')
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingBlock label="Cargando el resumen…" />;
  if (!stats) return <EmptyState title="No pudimos cargar el resumen" description="Recarga la página." />;

  const cards = [
    {
      label: 'Pendientes de confirmar',
      value: stats.pending,
      hint: 'Reservas esperando tu confirmación',
      tone: stats.pending > 0 ? 'urgent' : 'calm',
      to: '/admin/reservas?estado=PENDING',
    },
    {
      label: 'Próximos 7 días',
      value: stats.upcoming7Days,
      hint: 'Citas agendadas esta semana',
      tone: 'calm',
      to: '/admin/reservas',
    },
    {
      label: 'Servicios del mes',
      value: stats.monthCompletedCount,
      hint: 'Citas marcadas como completadas',
      tone: 'calm',
    },
    {
      label: 'Ingresos del mes',
      value: money(stats.monthRevenueCents),
      hint: 'Suma de las citas completadas',
      tone: 'accent',
    },
  ];

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl">Resumen</h1>
        <p className="mt-1.5 text-sm text-ink-500">Lo que necesita tu atención hoy.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card, i) => {
          const body = (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className={cx(
                'h-full rounded-2xl border p-5 shadow-soft transition',
                card.tone === 'urgent' && 'border-gold-300 bg-gold-100',
                card.tone === 'accent' && 'border-brand-200 bg-brand-50',
                card.tone === 'calm' && 'border-line bg-surface',
                card.to && 'hover:-translate-y-0.5 hover:shadow-lift',
              )}
            >
              <p className="text-xs font-medium uppercase tracking-wider text-ink-500">{card.label}</p>
              <p
                className={cx(
                  'mt-2 font-display leading-none',
                  typeof card.value === 'number' ? 'text-4xl' : 'text-[1.75rem]',
                  card.tone === 'urgent' ? 'text-gold-700' : 'text-ink-800',
                )}
              >
                {card.value}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-ink-500">{card.hint}</p>
            </motion.div>
          );

          return card.to ? (
            <Link key={card.label} to={card.to} className="rounded-2xl focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2">
              {body}
            </Link>
          ) : (
            <div key={card.label}>{body}</div>
          );
        })}
      </div>

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-xl">Próximas citas</h2>
          <Button to="/admin/reservas" variant="ghost" size="sm">
            Ver todas
          </Button>
        </div>

        {stats.nextBookings.length === 0 ? (
          <EmptyState title="No hay citas próximas" description="Cuando alguien reserve, aparecerá aquí." />
        ) : (
          <ul className="space-y-3">
            {stats.nextBookings.map((booking) => (
              <li
                key={booking.id}
                className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-surface p-4 shadow-soft"
              >
                <div className="flex w-full items-center gap-4 sm:w-auto sm:flex-1">
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

                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink-800">{booking.customerName}</p>
                    <p className="truncate text-sm text-ink-500">{booking.service.name}</p>
                    <p className="mt-0.5 text-xs text-ink-400">
                      {time(booking.startAt, settings.timezone)} · {money(booking.priceCents, booking.currency)}
                    </p>
                  </div>
                </div>

                <div className="flex w-full items-center justify-between gap-3 sm:w-auto">
                  <span className={cx('rounded-full border px-2.5 py-1 text-[11px] font-medium', STATUS_TONE[booking.status])}>
                    {STATUS_LABEL[booking.status]}
                  </span>
                  <div className="flex gap-1.5">
                    <a
                      href={whatsappLink(booking.customerPhone, `Hola ${booking.customerName.split(' ')[0]}, te escribo de ${settings.brandName} por tu cita del ${longDate(booking.startAt, settings.timezone)}.`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-wa transition hover:bg-blush"
                      aria-label={`Escribir por WhatsApp a ${booking.customerName}`}
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                        <path d="M12.05 21.5h-.01a9.4 9.4 0 0 1-4.79-1.31l-.34-.2-3.56.93.95-3.47-.22-.36a9.38 9.38 0 0 1-1.44-5.01c0-5.18 4.22-9.4 9.42-9.4a9.35 9.35 0 0 1 6.65 2.76 9.32 9.32 0 0 1 2.76 6.65c0 5.18-4.23 9.41-9.42 9.41Z" />
                      </svg>
                    </a>
                    <Link
                      to={`/admin/reservas?codigo=${booking.code}`}
                      className="flex h-9 items-center rounded-lg border border-line px-3 text-xs font-medium text-ink-600 transition hover:bg-blush"
                    >
                      Gestionar
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10 rounded-2xl border border-line bg-surface p-5 shadow-soft">
        <h2 className="text-lg">Accesos rápidos</h2>
        <div className="mt-4 flex flex-wrap gap-2.5">
          <Button to="/admin/agenda" variant="secondary" size="sm">
            Bloquear un día
          </Button>
          <Button to="/admin/servicios" variant="secondary" size="sm">
            Crear servicio
          </Button>
          <Button to="/admin/promociones" variant="secondary" size="sm">
            Nueva promoción
          </Button>
          <Button to="/admin/fidelidad" variant="secondary" size="sm">
            Otorgar sellos
          </Button>
        </div>
        <p className="mt-4 text-xs leading-relaxed text-ink-500">
          Tienes {stats.totalClients} {stats.totalClients === 1 ? 'clienta registrada' : 'clientas registradas'}.
        </p>
      </section>
    </div>
  );
}

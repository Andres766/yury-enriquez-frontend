import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api, ApiError } from '../lib/api.js';
import { useSettings } from '../context/SettingsContext.jsx';
import { money, longDate, time, duration, STATUS_LABEL, STATUS_TONE, PAYMENT_LABEL, whatsappLink } from '../lib/format.js';
import { Button, Input, SectionTitle, Alert, cx } from '../components/ui/index.jsx';

/**
 * Consulta de reserva para invitadas.
 *
 * Pide código Y correo. Solo con el código no basta: así nadie puede
 * probar combinaciones y leer los datos personales de otra clienta.
 * El endpoint además está limitado en número de intentos.
 */
export default function BookingLookup() {
  const [searchParams] = useSearchParams();
  const settings = useSettings();

  const [form, setForm] = useState({ code: searchParams.get('codigo') ?? '', email: '' });
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const code = searchParams.get('codigo');
    if (code) setForm((f) => ({ ...f, code }));
  }, [searchParams]);

  async function onSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});

    try {
      const data = await api.post('/bookings/lookup', {
        code: form.code.trim().toUpperCase(),
        email: form.email.trim(),
      });
      setBooking(data.booking);
    } catch (err) {
      setBooking(null);
      if (err instanceof ApiError && err.details?.length) setFieldErrors(err.fieldErrors);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const serviceEnd = booking
    ? new Date(new Date(booking.startAt).getTime() + booking.service.durationMinutes * 60_000)
    : null;

  return (
    <div className="container-page py-14 sm:py-20">
      <SectionTitle
        eyebrow="Tu cita"
        title="Consultar mi reserva"
        subtitle="Escribe el código que te llegó por correo junto al correo con el que reservaste."
        className="mb-12"
        as="h1"
      />

      <div className="mx-auto max-w-lg">
        <form onSubmit={onSubmit} noValidate className="card-surface space-y-5 p-6 sm:p-8">
          <Input
            label="Código de reserva"
            required
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
            error={fieldErrors.code}
            placeholder="ABCD-2345"
            autoComplete="off"
            spellCheck={false}
            className="font-mono"
            hint="Aparece en el correo de confirmación."
          />

          <Input
            label="Correo electrónico"
            type="email"
            required
            autoComplete="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            error={fieldErrors.email}
            placeholder="tucorreo@ejemplo.com"
          />

          {error && <Alert tone="error">{error}</Alert>}

          <Button type="submit" loading={loading} className="w-full" size="lg">
            {loading ? 'Buscando…' : 'Buscar mi reserva'}
          </Button>
        </form>

        {booking && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="card-surface mt-6 overflow-hidden"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-blush px-6 py-5">
              <div>
                <p className="text-xs uppercase tracking-widest text-ink-400">Código</p>
                <p className="mt-0.5 font-mono text-xl font-semibold tracking-wider text-brand-700">
                  {booking.code}
                </p>
              </div>
              <span
                className={cx(
                  'rounded-full border px-3 py-1 text-xs font-medium',
                  STATUS_TONE[booking.status],
                )}
              >
                {STATUS_LABEL[booking.status]}
              </span>
            </div>

            <dl className="space-y-3 px-6 py-6 text-sm">
              {[
                ['Servicio', booking.service.name],
                ['Duración', duration(booking.service.durationMinutes)],
                ['Ocasión', booking.occasion?.name],
                ['Fecha', longDate(booking.startAt, settings.timezone)],
                ['Hora', `${time(booking.startAt, settings.timezone)} – ${time(serviceEnd, settings.timezone)}`],
                ['Medio de pago', PAYMENT_LABEL[booking.paymentMethod]],
                ['Valor', money(booking.priceCents, booking.currency)],
                ['A nombre de', booking.customerName],
                ['Notas', booking.notes],
              ]
                .filter(([, value]) => value)
                .map(([label, value]) => (
                  <div key={label} className="flex flex-wrap justify-between gap-x-6 gap-y-1">
                    <dt className="text-ink-500">{label}</dt>
                    <dd className="max-w-[60%] text-right font-medium capitalize text-ink-800">{value}</dd>
                  </div>
                ))}
            </dl>

            {booking.status === 'CANCELLED' ? (
              <div className="border-t border-line px-6 py-5">
                <Alert tone="warning">
                  Esta reserva está cancelada. Si quieres retomar la cita, puedes{' '}
                  <Link to="/reservar" className="font-medium underline underline-offset-2">
                    reservar de nuevo
                  </Link>
                  .
                </Alert>
              </div>
            ) : (
              <div className="border-t border-line px-6 py-5">
                <p className="mb-4 text-sm leading-relaxed text-ink-500">
                  ¿Necesitas cambiar la fecha o cancelar? Escríbenos por WhatsApp y lo resolvemos.
                </p>
                <Button
                  href={whatsappLink(
                    settings.whatsappNumber || settings.contactPhone,
                    `Hola, quisiera modificar mi reserva ${booking.code}.`,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="secondary"
                  className="w-full"
                >
                  Escribir por WhatsApp
                </Button>
              </div>
            )}
          </motion.div>
        )}

        <p className="mt-8 text-center text-sm text-ink-500">
          ¿Tienes cuenta?{' '}
          <Link to="/mi-cuenta" className="font-medium text-brand-700 underline underline-offset-4">
            Entra y mira todo tu historial
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

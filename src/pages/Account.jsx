import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api, ApiError } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useSettings } from '../context/SettingsContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import LoyaltyCard from '../components/loyalty/LoyaltyCard.jsx';
import {
  money, longDate, time, duration, relative,
  STATUS_LABEL, STATUS_TONE, PAYMENT_LABEL,
} from '../lib/format.js';
import {
  Button, Input, Checkbox, Badge, Alert, LoadingBlock, EmptyState, cx,
} from '../components/ui/index.jsx';

const TABS = [
  { key: 'citas', label: 'Mis citas' },
  { key: 'fidelidad', label: 'Tarjeta de fidelidad' },
  { key: 'perfil', label: 'Mis datos' },
];

export default function Account() {
  const { user, isAdmin, updateProfile, changeEmail } = useAuth();
  const settings = useSettings();
  const toast = useToast();

  const [tab, setTab] = useState('citas');
  const [bookings, setBookings] = useState([]);
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () =>
    Promise.allSettled([api.get('/bookings/mine'), api.get('/loyalty/me')]).then(([b, c]) => {
      setBookings(b.value?.bookings ?? []);
      setCard(c.value?.card ?? null);
      setLoading(false);
    });

  useEffect(() => {
    load();
  }, []);

  const now = Date.now();
  const upcoming = bookings.filter(
    (b) => new Date(b.startAt).getTime() >= now && !['CANCELLED'].includes(b.status),
  );
  const past = bookings.filter(
    (b) => new Date(b.startAt).getTime() < now || b.status === 'CANCELLED',
  );

  async function cancelBooking(booking) {
    if (!window.confirm(`¿Seguro que quieres cancelar tu cita del ${longDate(booking.startAt, settings.timezone)}?`)) {
      return;
    }
    try {
      // La API identifica la reserva por id; el listado propio lo incluye.
      await api.post(`/bookings/${booking.id}/cancel`);
      toast.success('Tu cita quedó cancelada.');
      load();
    } catch (error) {
      toast.error(error.message);
    }
  }

  if (loading) return <LoadingBlock label="Cargando tu cuenta…" />;

  return (
    <div className="container-page py-12 sm:py-16">
      <header className="mb-10">
        <p className="eyebrow">Mi cuenta</p>
        <h1 className="mt-3 text-3xl sm:text-4xl">Hola, {user.fullName.split(' ')[0]}</h1>
        <p className="mt-2 text-sm text-ink-500">{user.email}</p>
      </header>

      {/* Pestañas */}
      <div role="tablist" aria-label="Secciones de mi cuenta" className="mb-8 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((item) => (
          <button
            key={item.key}
            role="tab"
            type="button"
            id={`tab-${item.key}`}
            aria-selected={tab === item.key}
            aria-controls={`panel-${item.key}`}
            onClick={() => setTab(item.key)}
            className={cx(
              'relative whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors',
              tab === item.key ? 'text-brand-700' : 'text-ink-500 hover:text-ink-800',
            )}
          >
            {item.label}
            {tab === item.key && (
              <motion.span layoutId="account-tab" className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-600" />
            )}
          </button>
        ))}
      </div>

      {/* Citas */}
      {tab === 'citas' && (
        <div role="tabpanel" id="panel-citas" aria-labelledby="tab-citas" tabIndex={0} className="focus:outline-none">
          {bookings.length === 0 ? (
            <EmptyState
              title="Todavía no tienes citas"
              description="Cuando reserves, aparecerán aquí con todos sus detalles."
              action={<Button to="/reservar">Reservar mi primera cita</Button>}
            />
          ) : (
            <div className="space-y-10">
              <section>
                <h2 className="mb-4 text-xl">Próximas ({upcoming.length})</h2>
                {upcoming.length === 0 ? (
                  <Alert tone="info">
                    No tienes citas próximas.{' '}
                    <Link to="/reservar" className="font-medium underline underline-offset-2">
                      Agendar una
                    </Link>
                    .
                  </Alert>
                ) : (
                  <ul className="space-y-3">
                    {upcoming.map((booking) => (
                      <BookingRow
                        key={booking.code}
                        booking={booking}
                        timezone={settings.timezone}
                        onCancel={() => cancelBooking(booking)}
                        highlight
                      />
                    ))}
                  </ul>
                )}
              </section>

              {past.length > 0 && (
                <section>
                  <h2 className="mb-4 text-xl">Anteriores ({past.length})</h2>
                  <ul className="space-y-3">
                    {past.map((booking) => (
                      <BookingRow key={booking.code} booking={booking} timezone={settings.timezone} />
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}
        </div>
      )}

      {/* Fidelidad */}
      {tab === 'fidelidad' && (
        <div role="tabpanel" id="panel-fidelidad" aria-labelledby="tab-fidelidad" tabIndex={0} className="focus:outline-none">
          <div className="mx-auto max-w-2xl">
            {card ? (
              <>
                <LoyaltyCard card={card} />
                <div className="mt-6 rounded-2xl border border-line bg-surface p-5 text-sm leading-relaxed text-ink-500 shadow-soft">
                  <p className="mb-2 font-medium text-ink-800">¿Cómo se consiguen los sellos?</p>
                  Después de cada servicio completado, la maquilladora suma un sello a tu tarjeta desde su
                  panel. Al llegar a {card.stampsRequired} sellos se desbloquea tu recompensa:{' '}
                  <span className="font-medium text-ink-700">{card.rewardDescription}</span>.
                </div>
              </>
            ) : (
              <EmptyState title="Aún no tienes tarjeta" description="Se crea con tu primer servicio completado." />
            )}
          </div>
        </div>
      )}

      {/* Perfil */}
      {tab === 'perfil' && (
        <div role="tabpanel" id="panel-perfil" aria-labelledby="tab-perfil" tabIndex={0} className="focus:outline-none">
          <ProfileForm user={user} isAdmin={isAdmin} onSave={updateProfile} onChangeEmail={changeEmail} />
        </div>
      )}
    </div>
  );
}

function BookingRow({ booking, timezone, onCancel, highlight }) {
  const canCancel =
    onCancel &&
    !['CANCELLED', 'COMPLETED'].includes(booking.status) &&
    new Date(booking.startAt).getTime() - Date.now() > 24 * 60 * 60 * 1000;

  return (
    <li
      className={cx(
        'rounded-2xl border bg-surface p-5 shadow-soft transition',
        highlight ? 'border-brand-200' : 'border-line',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-xl leading-snug text-ink-800">{booking.service.name}</h3>
            <span className={cx('rounded-full border px-2.5 py-0.5 text-[11px] font-medium', STATUS_TONE[booking.status])}>
              {STATUS_LABEL[booking.status]}
            </span>
          </div>

          <p className="mt-1.5 text-sm capitalize text-ink-600">
            {longDate(booking.startAt, timezone)} · {time(booking.startAt, timezone)}
          </p>
          <p className="mt-1 text-xs text-ink-400">
            {relative(booking.startAt, timezone)} · {duration(booking.service.durationMinutes)} ·{' '}
            {PAYMENT_LABEL[booking.paymentMethod]}
          </p>

          {booking.occasion && (
            <Badge tone="outline" className="mt-3">
              {booking.occasion.name}
            </Badge>
          )}
        </div>

        <div className="text-right">
          <p className="font-display text-xl text-brand-700">
            {money(booking.priceCents, booking.currency)}
          </p>
          <p className="mt-1 font-mono text-[11px] tracking-wider text-ink-400">{booking.code}</p>
        </div>
      </div>

      {booking.notes && (
        <p className="mt-4 rounded-xl bg-blush px-3.5 py-2.5 text-xs leading-relaxed text-ink-600">
          <span className="font-medium">Tus notas:</span> {booking.notes}
        </p>
      )}

      {canCancel && (
        <div className="mt-4 flex justify-end border-t border-line pt-4">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancelar cita
          </Button>
        </div>
      )}
    </li>
  );
}

function ProfileForm({ user, isAdmin, onSave, onChangeEmail }) {
  const toast = useToast();
  const [form, setForm] = useState({
    fullName: user.fullName,
    phone: user.phone ?? '',
    marketingOptIn: user.marketingOptIn,
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [pwErrors, setPwErrors] = useState({});
  const [changingPw, setChangingPw] = useState(false);

  async function saveProfile(event) {
    event.preventDefault();
    setSaving(true);
    setFieldErrors({});
    try {
      await onSave(form);
      toast.success('Datos actualizados.');
    } catch (error) {
      if (error instanceof ApiError && error.details?.length) setFieldErrors(error.fieldErrors);
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(event) {
    event.preventDefault();
    setChangingPw(true);
    setPwErrors({});
    try {
      const result = await api.post('/auth/change-password', pw);
      toast.success(result.message);
      setPw({ currentPassword: '', newPassword: '' });
      setTimeout(() => window.location.assign('/ingresar'), 1500);
    } catch (error) {
      if (error instanceof ApiError && error.details?.length) setPwErrors(error.fieldErrors);
      toast.error(error.message);
    } finally {
      setChangingPw(false);
    }
  }

  return (
    <div className="grid max-w-3xl gap-6 md:grid-cols-2">
      <form onSubmit={saveProfile} noValidate className="card-surface space-y-5 p-6">
        <h2 className="text-xl">Datos personales</h2>

        <Input
          label="Nombre completo"
          required
          value={form.fullName}
          onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
          error={fieldErrors.fullName}
          maxLength={120}
        />

        <Input
          label="WhatsApp"
          type="tel"
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          error={fieldErrors.phone}
          placeholder="+57 300 123 4567"
        />

        <Input
          label="Correo electrónico"
          value={user.email}
          disabled
          readOnly
          hint="Para cambiarlo usa el recuadro «Cambiar correo»."
        />

        <Checkbox
          label="Recibir promociones y dinámicas"
          checked={form.marketingOptIn}
          onChange={(e) => setForm((f) => ({ ...f, marketingOptIn: e.target.checked }))}
        />

        <Button type="submit" loading={saving} className="w-full">
          Guardar cambios
        </Button>
      </form>

      <EmailForm user={user} isAdmin={isAdmin} onSubmit={onChangeEmail} />

      <form onSubmit={changePassword} noValidate className="card-surface space-y-5 p-6">
        <h2 className="text-xl">Cambiar contraseña</h2>
        <p className="text-xs leading-relaxed text-ink-500">
          Al cambiarla se cierran todas las sesiones abiertas, incluida esta.
        </p>

        <Input
          label="Contraseña actual"
          type="password"
          required
          autoComplete="current-password"
          value={pw.currentPassword}
          onChange={(e) => setPw((p) => ({ ...p, currentPassword: e.target.value }))}
          error={pwErrors.currentPassword}
        />

        <Input
          label="Contraseña nueva"
          type="password"
          required
          autoComplete="new-password"
          value={pw.newPassword}
          onChange={(e) => setPw((p) => ({ ...p, newPassword: e.target.value }))}
          error={pwErrors.newPassword}
          hint="Mínimo 10 caracteres, con mayúscula, minúscula y número."
        />

        <Button type="submit" variant="secondary" loading={changingPw} className="w-full">
          Actualizar contraseña
        </Button>
      </form>
    </div>
  );
}

/**
 * Cambio del correo con el que se inicia sesión.
 *
 * No hay verificación por correo ni recuperación de contraseña, así que
 * un error de tipeo dejaría a la persona fuera de su cuenta: por eso se
 * pide escribirlo dos veces. La comparación es solo una comodidad; el
 * servidor vuelve a validar el formato y exige la contraseña actual.
 */
function EmailForm({ user, isAdmin, onSubmit }) {
  const toast = useToast();
  const [form, setForm] = useState({ newEmail: '', confirmEmail: '', currentPassword: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (key) => (event) => {
    setForm((f) => ({ ...f, [key]: event.target.value }));
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
  };

  async function submit(event) {
    event.preventDefault();

    const normalized = (v) => v.trim().toLowerCase();
    if (!form.newEmail.trim()) {
      setErrors({ newEmail: 'Escribe el correo nuevo' });
      return;
    }
    if (normalized(form.newEmail) !== normalized(form.confirmEmail)) {
      setErrors({ confirmEmail: 'Los dos correos no coinciden' });
      return;
    }

    setSaving(true);
    setErrors({});
    try {
      const result = await onSubmit({ newEmail: form.newEmail, currentPassword: form.currentPassword });
      toast.success(result.message);
      setForm({ newEmail: '', confirmEmail: '', currentPassword: '' });
    } catch (error) {
      if (error instanceof ApiError && error.details?.length) setErrors(error.fieldErrors);
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="card-surface space-y-5 p-6">
      <h2 className="text-xl">Cambiar correo</h2>
      <p className="text-xs leading-relaxed text-ink-500">
        Es el correo con el que inicias sesión. Ahora es{' '}
        <span className="break-all font-medium text-ink-700">{user.email}</span>. Usa uno que revises de
        verdad. Al cambiarlo se cierran tus sesiones en otros equipos; en este sigues dentro.
      </p>

      {isAdmin && (
        <Alert tone="info">
          Este cambio es solo para entrar al panel. Las reservas nuevas se avisan al{' '}
          <Link to="/admin/ajustes" className="font-medium underline underline-offset-2">
            correo para avisos de Ajustes
          </Link>
          , que va aparte.
        </Alert>
      )}

      <Input
        label="Correo nuevo"
        type="email"
        required
        autoComplete="email"
        inputMode="email"
        value={form.newEmail}
        onChange={set('newEmail')}
        error={errors.newEmail}
        maxLength={254}
      />

      <Input
        label="Repite el correo nuevo"
        type="email"
        required
        autoComplete="off"
        inputMode="email"
        value={form.confirmEmail}
        onChange={set('confirmEmail')}
        error={errors.confirmEmail}
        maxLength={254}
        hint="Escríbelo otra vez para evitar errores de tipeo."
      />

      <Input
        label="Contraseña actual"
        type="password"
        required
        autoComplete="current-password"
        value={form.currentPassword}
        onChange={set('currentPassword')}
        error={errors.currentPassword}
      />

      <Button type="submit" variant="secondary" loading={saving} className="w-full">
        Actualizar correo
      </Button>
    </form>
  );
}

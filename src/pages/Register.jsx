import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Button, Input, Checkbox, Alert, cx } from '../components/ui/index.jsx';
import { LogoMark } from '../components/layout/Logo.jsx';

/**
 * Registro.
 *
 * Las reglas de la contraseña se muestran como lista de comprobación en
 * vivo en lugar de aparecer como error después de enviar: se ve qué
 * falta mientras se escribe. Las mismas reglas están implementadas en el
 * servidor, que es quien decide de verdad.
 */

const RULES = [
  { key: 'length', label: 'Al menos 10 caracteres', test: (v) => v.length >= 10 },
  { key: 'lower', label: 'Una letra minúscula', test: (v) => /[a-záéíóúñ]/.test(v) },
  { key: 'upper', label: 'Una letra mayúscula', test: (v) => /[A-ZÁÉÍÓÚÑ]/.test(v) },
  { key: 'digit', label: 'Un número', test: (v) => /\d/.test(v) },
];

const BENEFITS = [
  'Historial de todas tus citas en un solo lugar',
  'Tarjeta de fidelidad con sellos y recompensa',
  'Promociones y dinámicas solo para registradas',
  'Formularios prellenados en tus próximas reservas',
];

export default function Register() {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  // La pantalla final de la reserva manda aquí los datos que la clienta
  // ya escribió, para que crear la cuenta no sea volver a teclearlos.
  const prefill = useLocation().state?.prefill ?? {};

  const [form, setForm] = useState({
    fullName: prefill.fullName ?? '',
    email: prefill.email ?? '',
    phone: prefill.phone ?? '',
    password: '',
    marketingOptIn: true,
    website: '',
  });
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const checks = useMemo(() => RULES.map((r) => ({ ...r, ok: r.test(form.password) })), [form.password]);
  const passwordReady = checks.every((c) => c.ok);

  const setField = (name) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((f) => ({ ...f, [name]: value }));
    setFieldErrors((e) => (e[name] ? { ...e, [name]: undefined } : e));
  };

  async function onSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});

    try {
      const user = await register({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim() || undefined,
        marketingOptIn: form.marketingOptIn,
        website: form.website,
      });
      toast.success(`¡Bienvenida, ${user.fullName.split(' ')[0]}!`);
      navigate('/mi-cuenta', { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.details?.length) setFieldErrors(err.fieldErrors);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container-page py-14 sm:py-20">
      <div className="mx-auto grid max-w-4xl gap-10 lg:grid-cols-[1fr_20rem] lg:gap-14">
        <div>
          <div className="mb-8">
            <LogoMark className="h-12 w-12 text-brand-500" />
            <h1 className="mt-5 text-3xl">Crear cuenta</h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-500">
              Es opcional y gratis. Reservar sigue funcionando sin cuenta.
            </p>
          </div>

          <form onSubmit={onSubmit} noValidate className="card-surface space-y-5 p-6 sm:p-8">
            <Input
              label="Nombre completo"
              required
              autoComplete="name"
              value={form.fullName}
              onChange={setField('fullName')}
              error={fieldErrors.fullName}
              placeholder="María Fernanda Gómez"
              maxLength={120}
            />

            <Input
              label="Correo electrónico"
              type="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={setField('email')}
              error={fieldErrors.email}
              placeholder="tucorreo@ejemplo.com"
            />

            <Input
              label="WhatsApp"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={form.phone}
              onChange={setField('phone')}
              error={fieldErrors.phone}
              placeholder="+57 300 123 4567"
              hint="Para avisarte de cambios en tus citas."
            />

            <div>
              <Input
                label="Contraseña"
                type="password"
                required
                autoComplete="new-password"
                value={form.password}
                onChange={setField('password')}
                error={fieldErrors.password}
                placeholder="••••••••••"
              />

              <ul className="mt-3 grid gap-1.5 sm:grid-cols-2" aria-label="Requisitos de la contraseña">
                {checks.map((check) => (
                  <li
                    key={check.key}
                    className={cx(
                      'flex items-center gap-2 text-xs transition-colors',
                      check.ok ? 'text-emerald-700' : 'text-ink-400',
                    )}
                  >
                    <span
                      className={cx(
                        'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors',
                        check.ok ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-line',
                      )}
                      aria-hidden="true"
                    >
                      {check.ok && (
                        <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none">
                          <path d="m2.5 6.2 2.2 2.2 4.8-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    {check.label}
                    <span className="sr-only">{check.ok ? '(cumplido)' : '(pendiente)'}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Checkbox
              label="Quiero recibir promociones y dinámicas"
              description="Sin spam. Puedes desactivarlo cuando quieras desde tu cuenta."
              checked={form.marketingOptIn}
              onChange={setField('marketingOptIn')}
            />

            {/* Trampa para bots */}
            <div aria-hidden="true" className="absolute left-[-9999px] h-px w-px overflow-hidden">
              <label htmlFor="website-reg">No rellenar</label>
              <input
                id="website-reg"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={form.website}
                onChange={setField('website')}
              />
            </div>

            {error && <Alert tone="error">{error}</Alert>}

            <Button type="submit" loading={loading} disabled={!passwordReady} className="w-full" size="lg">
              {loading ? 'Creando cuenta…' : 'Crear mi cuenta'}
            </Button>

            <p className="text-center text-xs leading-relaxed text-ink-400">
              Guardamos tu contraseña cifrada con argon2. Nunca la vemos ni podemos recuperarla.
            </p>
          </form>

          <p className="mt-6 text-center text-sm text-ink-600">
            ¿Ya tienes cuenta?{' '}
            <Link to="/ingresar" className="font-medium text-brand-700 underline underline-offset-4">
              Ingresa aquí
            </Link>
          </p>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-[2rem] border border-line bg-brand-gradient p-6 text-white shadow-lift sm:p-7">
            <h2 className="font-display text-2xl">Qué ganas al registrarte</h2>
            <ul className="mt-5 space-y-3.5">
              {BENEFITS.map((benefit) => (
                <li key={benefit} className="flex gap-3 text-sm leading-relaxed text-white/90">
                  <svg viewBox="0 0 16 16" className="mt-0.5 h-4 w-4 shrink-0" fill="none" aria-hidden="true">
                    <path d="m3.5 8.4 2.8 2.8 6.2-6.4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {benefit}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4 rounded-2xl border border-line bg-surface p-5 text-sm leading-relaxed text-ink-500 shadow-soft">
            Si ya reservaste antes con este mismo correo, al crear la cuenta enlazamos esas citas
            automáticamente a tu historial.
          </div>
        </aside>
      </div>
    </div>
  );
}

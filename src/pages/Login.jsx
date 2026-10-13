import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Button, Input, Alert } from '../components/ui/index.jsx';
import { LogoMark } from '../components/layout/Logo.jsx';
import { useSettings } from '../context/SettingsContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const settings = useSettings();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const from = location.state?.from ?? null;

  async function onSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});

    try {
      const user = await login({ email: form.email.trim(), password: form.password });
      toast.success(`¡Hola de nuevo, ${user.fullName.split(' ')[0]}!`);
      navigate(from ?? (user.role === 'ADMIN' ? '/admin' : '/mi-cuenta'), { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.details?.length) setFieldErrors(err.fieldErrors);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container-page flex min-h-[calc(100vh-72px)] items-center justify-center py-14">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <LogoMark className="mx-auto h-12 w-12 text-brand-500" />
          <h1 className="mt-5 text-3xl">Ingresar</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-500">
            Entra para ver tu historial de citas y tu tarjeta de fidelidad.
          </p>
        </div>

        <form onSubmit={onSubmit} noValidate className="card-surface space-y-5 p-6 sm:p-8">
          <Input
            label="Correo electrónico"
            type="email"
            required
            autoComplete="email"
            autoFocus
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            error={fieldErrors.email}
            placeholder="tucorreo@ejemplo.com"
          />

          <Input
            label="Contraseña"
            type="password"
            required
            autoComplete="current-password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            error={fieldErrors.password}
            placeholder="••••••••••"
          />

          {error && <Alert tone="error">{error}</Alert>}

          <Button type="submit" loading={loading} className="w-full" size="lg">
            {loading ? 'Entrando…' : 'Ingresar'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-600">
          ¿Aún no tienes cuenta?{' '}
          <Link to="/registro" className="font-medium text-brand-700 underline underline-offset-4">
            Créala aquí
          </Link>
        </p>

        <div className="mt-8 rounded-2xl border border-line bg-blush px-5 py-4 text-center">
          <p className="text-sm leading-relaxed text-ink-600">
            Recuerda: <span className="font-medium text-ink-800">no necesitas cuenta para reservar</span>.
          </p>
          <Link
            to="/reservar"
            className="mt-2 inline-block text-sm font-medium text-brand-700 underline underline-offset-4"
          >
            Reservar como invitada
          </Link>
        </div>

        <p className="mt-6 text-center text-xs leading-relaxed text-ink-400">
          ¿Solo quieres ver una reserva puntual?{' '}
          <Link to="/mi-reserva" className="underline underline-offset-2">
            Consúltala con tu código
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

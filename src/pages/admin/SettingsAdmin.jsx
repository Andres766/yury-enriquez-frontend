import { useEffect, useRef, useState } from 'react';
import { api, ApiError } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Button, Input, Textarea, LoadingBlock, Alert } from '../../components/ui/index.jsx';
import ThemePicker from '../../components/admin/ThemePicker.jsx';
import { applyTheme } from '../../context/SettingsContext.jsx';

/**
 * Ajustes del negocio.
 *
 * Aquí vive todo lo que la maquilladora puede cambiar sin tocar código:
 * marca, contacto, redes, reglas de la agenda y de la tarjeta de
 * fidelidad. Lo que NO está aquí, a propósito, son los secretos
 * (credenciales SMTP, claves de firma): esos solo viven en variables de
 * entorno del servidor y nunca se exponen a una interfaz web.
 */

const GROUPS = [
  {
    title: 'Marca',
    hint: 'Cómo se presenta el estudio en la web y en los correos.',
    fields: [
      { key: 'brandName', label: 'Nombre del estudio', required: true },
      { key: 'tagline', label: 'Frase corta', hint: 'Aparece bajo el nombre en la cabecera.' },
      { key: 'aboutText', label: 'Sobre el estudio', type: 'textarea', rows: 6 },
    ],
  },
  {
    title: 'Contacto',
    hint: 'Datos visibles en la web y usados en los correos.',
    fields: [
      { key: 'contactPhone', label: 'Teléfono público', type: 'tel' },
      { key: 'whatsappNumber', label: 'Número de WhatsApp', type: 'tel', hint: 'Solo dígitos con indicativo: 573001234567' },
      { key: 'contactEmail', label: 'Correo público', type: 'email' },
      { key: 'ownerNotificationEmail', label: 'Correo para avisos de reservas', type: 'email', hint: 'Aquí llegan las notificaciones de cada reserva nueva.' },
      { key: 'addressLine', label: 'Dirección' },
      { key: 'mapUrl', label: 'Enlace a Google Maps', type: 'url' },
      { key: 'businessHoursNote', label: 'Resumen del horario', hint: 'Texto libre, además del horario real de la agenda.' },
    ],
  },
  {
    title: 'Redes sociales',
    hint: 'Deja vacío lo que no uses: no aparecerá en el pie de página.',
    fields: [
      { key: 'instagramUrl', label: 'Instagram', type: 'url' },
      { key: 'tiktokUrl', label: 'TikTok', type: 'url' },
      { key: 'facebookUrl', label: 'Facebook', type: 'url' },
    ],
  },
  {
    title: 'Pagos',
    hint: 'No se cobra nada en línea: solo se registra la intención de pago.',
    fields: [
      {
        key: 'transferInstructions',
        label: 'Datos para transferencia',
        type: 'textarea',
        rows: 5,
        hint: 'Se incluyen en el correo de quien elige pagar por transferencia.',
      },
    ],
  },
  {
    title: 'Reglas de la agenda',
    hint: 'Cómo se generan los horarios que ve la clienta.',
    fields: [
      { key: 'timezone', label: 'Zona horaria', hint: 'Formato IANA: America/Bogota' },
      { key: 'slotIntervalMinutes', label: 'Intervalo entre turnos (min)', type: 'number', min: 5, max: 240 },
      { key: 'bufferMinutes', label: 'Margen entre citas (min)', type: 'number', min: 0, max: 240, hint: 'Tiempo para limpiar y preparar.' },
      { key: 'minNoticeHours', label: 'Antelación mínima (horas)', type: 'number', min: 0, max: 720 },
      { key: 'maxAdvanceDays', label: 'Reservar con hasta (días)', type: 'number', min: 1, max: 365 },
    ],
  },
  {
    title: 'Tarjeta de fidelidad',
    hint: 'Cuántos sellos hacen falta y qué se gana.',
    fields: [
      { key: 'stampsRequired', label: 'Sellos para la recompensa', type: 'number', min: 2, max: 50 },
      { key: 'rewardDescription', label: 'Descripción de la recompensa' },
    ],
  },
];

export default function SettingsAdmin() {
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  /*
   * Vista previa del tema.
   *
   * Al elegir una opción el panel cambia de aspecto al instante, para
   * poder decidir viéndolo de verdad. Si se abandona la página sin
   * guardar, se restaura el tema que sigue vigente en el servidor: la
   * vista previa nunca debe quedar "pegada".
   */
  const savedTheme = useRef(null);

  useEffect(
    () => () => {
      if (savedTheme.current) applyTheme(savedTheme.current);
    },
    [],
  );

  useEffect(() => {
    api
      .get('/settings/admin')
      .then((d) => {
        setForm({ ...d.settings });
        savedTheme.current = d.settings.theme;
      })
      .catch((error) => toast.error(error.message));
  }, [toast]);

  const set = (key) => (event) => {
    setForm((f) => ({ ...f, [key]: event.target.value }));
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
  };

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setErrors({});

    // Solo se envían los campos editables: id y updatedAt los gestiona
    // la base de datos.
    const { id, updatedAt, ...payload } = form;
    for (const key of ['slotIntervalMinutes', 'bufferMinutes', 'minNoticeHours', 'maxAdvanceDays', 'stampsRequired']) {
      payload[key] = Number(payload[key]);
    }
    for (const key of ['instagramUrl', 'tiktokUrl', 'facebookUrl', 'mapUrl']) {
      payload[key] = payload[key] ?? '';
    }

    try {
      const { settings } = await api.patch('/settings/admin', payload);
      setForm(settings);
      savedTheme.current = settings.theme;
      applyTheme(settings.theme);
      toast.success('Ajustes guardados. La web se actualiza en unos segundos.');
    } catch (error) {
      if (error instanceof ApiError && error.details?.length) {
        setErrors(error.fieldErrors);
        toast.error('Revisa los campos marcados.');
      } else {
        toast.error(error.message);
      }
    } finally {
      setSaving(false);
    }
  }

  if (!form) return <LoadingBlock />;

  return (
    <div className="max-w-3xl">
      <header className="mb-8">
        <h1 className="text-3xl">Ajustes</h1>
        <p className="mt-1.5 text-sm text-ink-500">
          Todo lo que puedes cambiar sin tocar código.
        </p>
      </header>

      <Alert tone="info" className="mb-6">
        Las credenciales de correo y las claves de seguridad no se editan aquí: viven en el archivo{' '}
        <code className="rounded bg-surface/60 px-1 py-0.5 font-mono text-xs">.env</code> del servidor,
        fuera del alcance de la web.
      </Alert>

      <form onSubmit={submit} className="space-y-6">
        <fieldset className="rounded-2xl border border-line bg-surface p-5 shadow-soft sm:p-6">
          <legend className="px-1 font-display text-xl text-ink-800">Tema del sitio</legend>
          <p className="mb-5 text-xs leading-relaxed text-ink-500">
            Cambia el aspecto de toda la web pública. Solo tú puedes cambiarlo: las clientas no
            tienen ningún selector, ven el que dejes activo. Al elegir uno lo ves aplicado al
            instante; se queda fijo cuando guardas.
          </p>

          <ThemePicker
            value={form.theme}
            onChange={(theme) => {
              setForm((f) => ({ ...f, theme }));
              applyTheme(theme);
            }}
          />
        </fieldset>

        {GROUPS.map((group) => (
          <fieldset key={group.title} className="rounded-2xl border border-line bg-surface p-5 shadow-soft sm:p-6">
            <legend className="px-1 font-display text-xl text-ink-800">{group.title}</legend>
            <p className="mb-5 text-xs leading-relaxed text-ink-500">{group.hint}</p>

            <div className="grid gap-4 sm:grid-cols-2">
              {group.fields.map((field) => {
                const Component = field.type === 'textarea' ? Textarea : Input;
                const isWide = field.type === 'textarea' || ['addressLine', 'businessHoursNote', 'rewardDescription'].includes(field.key);

                return (
                  <Component
                    key={field.key}
                    label={field.label}
                    required={field.required}
                    type={field.type === 'textarea' ? undefined : (field.type ?? 'text')}
                    rows={field.rows}
                    min={field.min}
                    max={field.max}
                    hint={field.hint}
                    error={errors[field.key]}
                    value={form[field.key] ?? ''}
                    onChange={set(field.key)}
                    className={isWide ? 'sm:col-span-2' : undefined}
                  />
                );
              })}
            </div>
          </fieldset>
        ))}

        <div className="sticky bottom-4 flex justify-end">
          <Button type="submit" loading={saving} size="lg" className="shadow-lift">
            Guardar ajustes
          </Button>
        </div>
      </form>
    </div>
  );
}

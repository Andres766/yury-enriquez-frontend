import { useEffect, useRef, useState } from 'react';
import { api, ApiError } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Button, Input, Textarea, Select, LoadingBlock, Alert } from '../../components/ui/index.jsx';
import ThemePicker from '../../components/admin/ThemePicker.jsx';
import { applyTheme, useSettings } from '../../context/SettingsContext.jsx';
import { depositText, money } from '../../lib/format.js';

/**
 * Ajustes del negocio.
 *
 * Aquí vive todo lo que la maquilladora puede cambiar sin tocar código:
 * marca, contacto, redes, reglas de la agenda y de la tarjeta de
 * fidelidad. Lo que NO está aquí, a propósito, son los secretos
 * (credenciales SMTP, claves de firma): esos solo viven en variables de
 * entorno del servidor y nunca se exponen a una interfaz web.
 *
 * Yury atiende solo a domicilio: la dirección del negocio queda como
 * opcional y el adicional del domicilio se escribe aquí en PESOS (como
 * lo piensa ella), aunque la API lo guarde en centavos.
 */

const GROUPS = [
  {
    title: 'Marca',
    hint: 'Cómo te presentas en la web y en los correos.',
    fields: [
      { key: 'brandName', label: 'Nombre de la marca', required: true },
      { key: 'tagline', label: 'Frase corta', hint: 'Aparece bajo el nombre en la cabecera.' },
      { key: 'aboutText', label: 'Sobre mí', type: 'textarea', rows: 6 },
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
      {
        key: 'addressLine',
        label: 'Dirección del negocio (opcional — déjala vacía si atiendes solo a domicilio)',
        hint: 'No se usa como lugar de las citas: cada clienta escribe dónde la maquillas.',
      },
      { key: 'mapUrl', label: 'Enlace a Google Maps del negocio (opcional)', type: 'url' },
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
      {
        key: 'depositPercent',
        label: 'Abono para separar la fecha (%)',
        type: 'number',
        min: 0,
        max: 100,
        inputMode: 'numeric',
        placeholder: 'Sin abono',
        // La pista muestra la frase tal como la verá la clienta en la
        // ficha de cada servicio y en los correos de reserva.
        hint: (form) => {
          const example = depositText(form.depositPercent, { priceMode: 'FROM' });
          return example
            ? `En cada servicio se verá «${example}» (con el valor exacto si el precio es fijo). También va en los correos de reserva.`
            : 'Vacío = no se menciona ningún abono en la web ni en los correos. Escribe 50 para pedir la mitad.';
        },
      },
    ],
  },
  {
    title: 'Domicilio',
    hint: 'Todas las citas son en el lugar que indica la clienta al reservar.',
    fields: [
      {
        // Campo del formulario en pesos; al guardar viaja como homeVisitFeeCents.
        key: 'homeVisitFee',
        errorKey: 'homeVisitFeeCents',
        label: 'Adicional del domicilio dentro de Pasto ($)',
        inputMode: 'numeric',
        placeholder: 'Sin adicional',
        // Solo dígitos: "21.000" o "$21000" quedan como 21000.
        sanitize: (value) => value.replace(/\D/g, '').slice(0, 9),
        hint: (form) => {
          const pesos = form.homeVisitFee;
          return pesos
            ? `En la reserva se verá «Dentro de Pasto el domicilio tiene un adicional de ${money(Number(pesos) * 100)}». No se suma al precio del servicio. Fuera de la ciudad se dice que se calcula según el transporte.`
            : 'Vacío = no se menciona ningún valor; solo que fuera de la ciudad se calcula según el transporte. Escribe el valor en pesos, por ejemplo 21000.';
        },
      },
    ],
  },
  {
    title: 'Reglas de la agenda',
    hint: 'Cómo se generan los horarios que ve la clienta.',
    fields: [
      { key: 'timezone', label: 'Zona horaria', hint: 'Formato IANA: America/Bogota' },
      { key: 'slotIntervalMinutes', label: 'Intervalo entre turnos (min)', type: 'number', min: 5, max: 240 },
      { key: 'bufferMinutes', label: 'Margen entre citas (min)', type: 'number', min: 0, max: 240, hint: 'Tiempo para recoger, desplazarte a la siguiente clienta y preparar.' },
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

const THEME_NAMES = { LIGHT: 'Claro', DARK: 'Oscuro', HALLOWEEN: 'Halloween' };

/** Hoy como YYYY-MM-DD en la zona horaria del negocio. */
function todayIn(timeZone) {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

/** "2026-10-24" → "sábado 24 de octubre". Se lee a mediodía para no cruzar de día. */
function longDate(iso) {
  return new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(
    new Date(`${iso}T12:00:00Z`),
  );
}

/**
 * Estado de la programación con lo que hay escrito en el formulario,
 * para avisar en vivo antes de guardar. El servidor aplica la misma
 * regla (fechas inclusive, zona del negocio) al servir la web.
 */
function seasonalSummary(form) {
  const { seasonalTheme: theme, seasonalStartDate: start, seasonalEndDate: end } = form;
  if (!theme && !start && !end) return null;
  if (!theme || !start || !end) return { tone: 'warning', text: 'Completa el tema y las dos fechas para que quede programado.' };
  if (start > end) return { tone: 'warning', text: 'La fecha de fin es anterior a la de inicio.' };

  const name = THEME_NAMES[theme];
  const today = todayIn(form.timezone || 'America/Bogota');
  if (today < start) {
    return {
      tone: 'info',
      text: `${name} se activará solo el ${longDate(start)} y se quitará al terminar el ${longDate(end)}. Hasta entonces la web usa el tema ${THEME_NAMES[form.theme].toLowerCase()}.`,
    };
  }
  if (today <= end) {
    return {
      tone: 'success',
      text: `${name} está activo ahora en la web. Vuelve solo al tema ${THEME_NAMES[form.theme].toLowerCase()} al terminar el ${longDate(end)}.`,
    };
  }
  return { tone: 'warning', text: `La temporada terminó el ${longDate(end)}. Cambia las fechas para programar la siguiente.` };
}

/**
 * Lo que llega de la API, listo para el formulario: fechas de temporada
 * vacías en vez de null y el adicional del domicilio pasado a pesos.
 */
function toForm(settings) {
  const { homeVisitFeeCents, ...rest } = settings;
  return {
    ...rest,
    seasonalTheme: settings.seasonalTheme ?? '',
    seasonalStartDate: settings.seasonalStartDate ?? '',
    seasonalEndDate: settings.seasonalEndDate ?? '',
    homeVisitFee: Number.isInteger(homeVisitFeeCents) ? String(Math.round(homeVisitFeeCents / 100)) : '',
  };
}

export default function SettingsAdmin() {
  const toast = useToast();
  const { reload: reloadSiteSettings } = useSettings();
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
        setForm(toForm(d.settings));
        // Lo que ve la web hoy (puede ser el de temporada), no el base
        savedTheme.current = d.settings.effectiveTheme ?? d.settings.theme;
      })
      .catch((error) => toast.error(error.message));
  }, [toast]);

  const set = (key, sanitize, errorKey = key) => (event) => {
    const value = sanitize ? sanitize(event.target.value) : event.target.value;
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => (e[errorKey] ? { ...e, [errorKey]: undefined } : e));
  };

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setErrors({});

    // Solo se envían los campos editables: id y updatedAt los gestiona
    // la base de datos.
    const { id, updatedAt, effectiveTheme, seasonalActive, seasonalUpcoming, homeVisitFee, ...payload } = form;
    for (const key of ['slotIntervalMinutes', 'bufferMinutes', 'minNoticeHours', 'maxAdvanceDays', 'stampsRequired']) {
      payload[key] = Number(payload[key]);
    }
    // El abono es opcional: vacío viaja como null (sin política de abono),
    // no como 0, que Number('') daría y se leería como "abono del 0 %".
    payload.depositPercent =
      payload.depositPercent === '' || payload.depositPercent == null ? null : Number(payload.depositPercent);
    // Pesos → centavos. Vacío = null (no se muestra ningún valor), igual
    // que el abono: un 0 escrito sí se respeta.
    payload.homeVisitFeeCents = homeVisitFee === '' || homeVisitFee == null ? null : Number(homeVisitFee) * 100;
    for (const key of ['instagramUrl', 'tiktokUrl', 'facebookUrl', 'mapUrl']) {
      payload[key] = payload[key] ?? '';
    }

    try {
      const { settings } = await api.patch('/settings/admin', payload);
      setForm(toForm(settings));
      savedTheme.current = settings.effectiveTheme ?? settings.theme;
      applyTheme(savedTheme.current);
      // La web pública de esta misma pestaña (decoración de temporada,
      // WhatsApp, redes…) se entera ya, sin tener que recargar.
      reloadSiteSettings();
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

          {/* ── Programación de temporada ── */}
          <div className="mt-6 border-t border-line pt-5">
            <h3 className="font-medium text-ink-800">Programar un tema de temporada</h3>
            <p className="mt-1 text-xs leading-relaxed text-ink-500">
              Entre estas dos fechas (ambas incluidas) la web muestra el tema de temporada en lugar del
              de arriba. Empieza a medianoche del primer día y se quita sola al terminar el último: no
              tienes que acordarte de cambiarlo.
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Select
                label="Tema de temporada"
                value={form.seasonalTheme}
                onChange={set('seasonalTheme')}
                error={errors.seasonalTheme}
              >
                <option value="">Sin programar</option>
                <option value="HALLOWEEN">Halloween</option>
                <option value="DARK">Oscuro</option>
              </Select>
              <Input
                label="Desde"
                type="date"
                value={form.seasonalStartDate}
                onChange={set('seasonalStartDate')}
                error={errors.seasonalStartDate}
              />
              <Input
                label="Hasta"
                type="date"
                min={form.seasonalStartDate || undefined}
                value={form.seasonalEndDate}
                onChange={set('seasonalEndDate')}
                error={errors.seasonalEndDate}
              />
            </div>

            {(() => {
              const summary = seasonalSummary(form);
              if (!summary) return null;
              return (
                <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
                  <Alert tone={summary.tone} className="flex-1">
                    {summary.text}
                  </Alert>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setForm((f) => ({ ...f, seasonalTheme: '', seasonalStartDate: '', seasonalEndDate: '' }))
                    }
                  >
                    Quitar programación
                  </Button>
                </div>
              );
            })()}
          </div>
        </fieldset>

        {GROUPS.map((group) => (
          <fieldset key={group.title} className="rounded-2xl border border-line bg-surface p-5 shadow-soft sm:p-6">
            <legend className="px-1 font-display text-xl text-ink-800">{group.title}</legend>
            <p className="mb-5 text-xs leading-relaxed text-ink-500">{group.hint}</p>

            <div className="grid gap-4 sm:grid-cols-2">
              {group.fields.map((field) => {
                const Component = field.type === 'textarea' ? Textarea : Input;
                const isWide = field.type === 'textarea' || ['addressLine', 'businessHoursNote', 'rewardDescription', 'homeVisitFee'].includes(field.key);

                return (
                  <Component
                    key={field.key}
                    label={field.label}
                    required={field.required}
                    type={field.type === 'textarea' ? undefined : (field.type ?? 'text')}
                    rows={field.rows}
                    min={field.min}
                    max={field.max}
                    inputMode={field.inputMode}
                    placeholder={field.placeholder}
                    hint={typeof field.hint === 'function' ? field.hint(form) : field.hint}
                    error={errors[field.errorKey ?? field.key]}
                    value={form[field.key] ?? ''}
                    onChange={set(field.key, field.sanitize, field.errorKey)}
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

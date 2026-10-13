import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { api, qs, ApiError } from '../../lib/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { money, duration, longDate, time, CATEGORY_LABEL } from '../../lib/format.js';
import { Button, Input, Textarea, Badge, Alert, Spinner, LoadingBlock, cx } from '../ui/index.jsx';
import Calendar from './Calendar.jsx';
import Stepper from './Stepper.jsx';

/**
 * Asistente de reserva.
 *
 * Decisión de producto que atraviesa todo el componente: NUNCA se pide
 * cuenta. Si hay sesión, los datos se rellenan solos y la reserva queda
 * ligada al historial; si no, se reserva como invitada y punto.
 *
 * Los horarios se recargan cada 30 segundos mientras se está en el paso
 * de fecha y hora, y al volver a la pestaña. Aun así, la palabra final
 * la tiene el servidor: si alguien se adelanta, la API responde 409 y
 * aquí se refresca la lista y se avisa, en vez de fallar en silencio.
 */

const STEPS = [
  { key: 'servicio', label: 'Servicio' },
  { key: 'ocasion', label: 'Ocasión' },
  { key: 'fecha', label: 'Fecha y hora' },
  { key: 'datos', label: 'Tus datos' },
  { key: 'confirmar', label: 'Confirmar' },
];

const EMPTY_FORM = {
  customerName: '',
  customerEmail: '',
  customerPhone: '',
  notes: '',
  paymentMethod: 'TRANSFERENCIA',
  website: '', // trampa para bots, oculta visualmente
};

export default function BookingWizard() {
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  const settings = useSettings();
  const toast = useToast();
  const reduced = useReducedMotion();

  const [step, setStep] = useState(0);
  const [catalog, setCatalog] = useState({ services: [], occasions: [], loading: true });

  const [service, setService] = useState(null);
  const [occasion, setOccasion] = useState(null);
  const [date, setDate] = useState(null);
  const [slot, setSlot] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState(null);

  const headingRef = useRef(null);

  // ── Carga del catálogo ─────────────────────────────────────────────

  useEffect(() => {
    Promise.all([api.get('/services'), api.get('/occasions')])
      .then(([s, o]) => {
        setCatalog({ services: s.services ?? [], occasions: o.occasions ?? [], loading: false });

        // Permite llegar desde la ficha de un servicio: /reservar?servicio=slug
        const slug = searchParams.get('servicio');
        if (slug) {
          const found = (s.services ?? []).find((item) => item.slug === slug);
          if (found) {
            setService(found);
            setStep(1);
          }
        }
      })
      .catch(() => setCatalog((c) => ({ ...c, loading: false })));
    // Solo al montar: el parámetro de la URL se lee una vez.

  }, []);

  // Autocompletado para clientas con sesión iniciada.
  useEffect(() => {
    if (!user) return;
    setForm((f) => ({
      ...f,
      customerName: f.customerName || user.fullName || '',
      customerEmail: f.customerEmail || user.email || '',
      customerPhone: f.customerPhone || user.phone || '',
    }));
  }, [user]);

  // Al avanzar de paso se lleva el foco al título: quien navegue con
  // lector de pantalla oye dónde está en vez de quedarse en el botón.
  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  // ── Horarios disponibles ───────────────────────────────────────────

  const loadSlots = useCallback(
    async ({ silent = false } = {}) => {
      if (!service || !date) return;
      if (!silent) setSlotsLoading(true);
      try {
        const data = await api.get(`/availability/slots${qs({ serviceId: service.id, date })}`);
        setSlots(data.slots ?? []);

        // Si el hueco elegido desapareció mientras se decidía, se avisa.
        setSlot((current) => {
          if (current && !(data.slots ?? []).some((s) => s.start === current.start)) {
            if (silent) toast.info('El horario que tenías elegido acaba de ocuparse. Elige otro.');
            return null;
          }
          return current;
        });
      } catch {
        if (!silent) toast.error('No pudimos cargar los horarios. Inténtalo de nuevo.');
      } finally {
        if (!silent) setSlotsLoading(false);
      }
    },
    [service, date, toast],
  );

  useEffect(() => {
    setSlot(null);
    setSlots([]);
    loadSlots();
  }, [service?.id, date]); // eslint-disable-line react-hooks/exhaustive-deps

  // Refresco periódico mientras se elige la hora: bloqueo "en vivo".
  useEffect(() => {
    if (step !== 2 || !date) return undefined;

    const interval = setInterval(() => loadSlots({ silent: true }), 30_000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') loadSlots({ silent: true });
    };

    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [step, date, loadSlots]);

  // ── Navegación entre pasos ─────────────────────────────────────────

  const canContinue = useMemo(
    () =>
      [
        Boolean(service),
        true, // la ocasión es opcional
        Boolean(slot),
        Boolean(form.customerName && form.customerEmail && form.customerPhone),
        true,
      ][step],
    [step, service, slot, form],
  );

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const setField = (name) => (event) => {
    const value = event.target.value;
    setForm((f) => ({ ...f, [name]: value }));
    setFieldErrors((e) => (e[name] ? { ...e, [name]: undefined } : e));
  };

  // ── Envío ──────────────────────────────────────────────────────────

  async function submit() {
    if (!service || !slot) return;

    setSubmitting(true);
    setFieldErrors({});

    try {
      const { booking } = await api.post('/bookings', {
        serviceId: service.id,
        occasionId: occasion?.id ?? null,
        startAt: slot.start,
        customerName: form.customerName.trim(),
        customerEmail: form.customerEmail.trim(),
        customerPhone: form.customerPhone.trim(),
        paymentMethod: form.paymentMethod,
        notes: form.notes.trim() || undefined,
        website: form.website,
      });

      setConfirmation(booking);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === 'SLOT_TAKEN' || error.status === 409) {
          toast.error(error.message);
          setStep(2);
          await loadSlots();
        } else if (error.details?.length) {
          setFieldErrors(error.fieldErrors);
          setStep(3);
          toast.error('Revisa los datos marcados en rojo.');
        } else {
          toast.error(error.message);
        }
      } else {
        toast.error('No pudimos completar la reserva. Inténtalo de nuevo.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  // ── Estados especiales ─────────────────────────────────────────────

  if (catalog.loading) return <LoadingBlock label="Cargando servicios…" />;

  if (confirmation) {
    return <Confirmation booking={confirmation} settings={settings} isAuthenticated={isAuthenticated} />;
  }

  if (catalog.services.length === 0) {
    return (
      <Alert tone="warning" title="Agenda no disponible">
        Aún no hay servicios publicados. Escríbenos por WhatsApp y te agendamos manualmente.
      </Alert>
    );
  }

  const transition = { duration: 0.28, ease: [0.22, 0.61, 0.36, 1] };
  const variants = reduced
    ? {}
    : {
        enter: { opacity: 0, x: 24 },
        center: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -24 },
      };

  return (
    <div>
      <div className="mb-8 sm:mb-10">
        <Stepper steps={STEPS} current={step} onStepClick={setStep} />
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem] lg:items-start lg:gap-10">
        <div className="min-w-0">
          <AnimatePresence mode="wait" initial={false}>
            <motion.section
              key={STEPS[step].key}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={transition}
              aria-labelledby="titulo-paso"
            >
              {step === 0 && (
                <StepService
                  headingRef={headingRef}
                  services={catalog.services}
                  selected={service}
                  onSelect={(s) => {
                    setService(s);
                    setDate(null);
                    setTimeout(next, 180);
                  }}
                />
              )}

              {step === 1 && (
                <StepOccasion
                  headingRef={headingRef}
                  occasions={catalog.occasions}
                  selected={occasion}
                  onSelect={setOccasion}
                />
              )}

              {step === 2 && (
                <StepDateTime
                  headingRef={headingRef}
                  service={service}
                  timezone={settings.timezone}
                  date={date}
                  onDateChange={setDate}
                  slots={slots}
                  slotsLoading={slotsLoading}
                  slot={slot}
                  onSlotChange={setSlot}
                  onRefresh={() => loadSlots()}
                  minNoticeHours={settings.minNoticeHours}
                />
              )}

              {step === 3 && (
                <StepDetails
                  headingRef={headingRef}
                  form={form}
                  errors={fieldErrors}
                  onChange={setField}
                  isAuthenticated={isAuthenticated}
                />
              )}

              {step === 4 && (
                <StepConfirm
                  headingRef={headingRef}
                  form={form}
                  setForm={setForm}
                  service={service}
                  occasion={occasion}
                  slot={slot}
                  settings={settings}
                />
              )}
            </motion.section>
          </AnimatePresence>

          {/* Controles */}
          <div className="mt-10 flex flex-col-reverse gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
            <Button
              variant="ghost"
              onClick={back}
              disabled={step === 0}
              className={cx(step === 0 && 'invisible')}
            >
              <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden="true">
                <path d="M13 8H4m0 0 3.5-3.5M4 8l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Atrás
            </Button>

            {step < STEPS.length - 1 ? (
              <Button onClick={next} disabled={!canContinue} size="lg" className="w-full sm:w-auto">
                Continuar
                <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden="true">
                  <path d="M3 8h9m0 0L8.5 4.5M12 8l-3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Button>
            ) : (
              <Button onClick={submit} loading={submitting} size="lg" className="w-full sm:w-auto">
                {submitting ? 'Enviando…' : 'Confirmar reserva'}
              </Button>
            )}
          </div>
        </div>

        {/* Resumen lateral */}
        <Summary
          service={service}
          occasion={occasion}
          slot={slot}
          timezone={settings.timezone}
          paymentMethod={step >= 4 ? form.paymentMethod : null}
        />
      </div>
    </div>
  );
}

// ── Paso 1 · Servicio ────────────────────────────────────────────────

function StepService({ services, selected, onSelect, headingRef }) {
  const groups = [
    { key: 'PAQUETE', title: 'Paquetes', hint: 'Maquillaje y peinado juntos, con mejor precio' },
    { key: 'MAQUILLAJE', title: 'Maquillaje', hint: null },
    { key: 'PEINADO', title: 'Peinado', hint: null },
  ];

  return (
    <div>
      <h2 id="titulo-paso" ref={headingRef} tabIndex={-1} className="text-2xl focus:outline-none sm:text-3xl">
        ¿Qué servicio quieres?
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-500">
        Cada uno muestra su duración real, para que sepas cuánto tiempo apartar.
      </p>

      <div className="mt-8 space-y-9">
        {groups.map((group) => {
          const items = services.filter((s) => s.category === group.key);
          if (items.length === 0) return null;

          return (
            <fieldset key={group.key}>
              <legend className="mb-1 font-display text-xl text-ink-800">{group.title}</legend>
              {group.hint && <p className="mb-4 text-xs text-ink-500">{group.hint}</p>}

              <div className="grid gap-3 sm:grid-cols-2">
                {items.map((item) => {
                  const active = selected?.id === item.id;
                  return (
                    <label
                      key={item.id}
                      className={cx(
                        'group relative flex cursor-pointer gap-4 rounded-2xl border p-4 transition-all duration-200',
                        active
                          ? 'border-brand-500 bg-brand-50 shadow-soft ring-1 ring-brand-300'
                          : 'border-line bg-surface hover:border-brand-200 hover:bg-blush/60',
                      )}
                    >
                      <input
                        type="radio"
                        name="servicio"
                        value={item.id}
                        checked={active}
                        onChange={() => onSelect(item)}
                        className="sr-only-focusable absolute left-4 top-4 h-4 w-4"
                      />

                      {item.images?.[0] && (
                        <img
                          src={item.images[0].url}
                          alt=""
                          loading="lazy"
                          className="hidden h-20 w-20 shrink-0 rounded-xl object-cover sm:block"
                        />
                      )}

                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-2">
                          <span className="font-medium leading-snug text-ink-800">{item.name}</span>
                          <span
                            className={cx(
                              'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition',
                              active ? 'border-brand-600 bg-brand-600' : 'border-line bg-surface',
                            )}
                            aria-hidden="true"
                          >
                            {active && <span className="h-2 w-2 rounded-full bg-surface" />}
                          </span>
                        </span>

                        <span className="mt-1.5 block text-xs leading-relaxed text-ink-500 line-clamp-2">
                          {item.shortDescription}
                        </span>

                        <span className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                          <span className="font-display text-lg text-ink-800">
                            {money(item.priceCents, item.currency)}
                          </span>
                          <span className="text-xs text-ink-500">· {duration(item.durationMinutes)}</span>
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          );
        })}
      </div>
    </div>
  );
}

// ── Paso 2 · Ocasión ─────────────────────────────────────────────────

function StepOccasion({ occasions, selected, onSelect, headingRef }) {
  return (
    <div>
      <h2 id="titulo-paso" ref={headingRef} tabIndex={-1} className="text-2xl focus:outline-none sm:text-3xl">
        ¿Para qué ocasión?
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-500">
        Nos ayuda a preparar el look y los productos adecuados. Puedes saltarte este paso.
      </p>

      <fieldset className="mt-8">
        <legend className="sr-only">Ocasión del servicio</legend>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {occasions.map((item) => {
            const active = selected?.id === item.id;
            return (
              <label
                key={item.id}
                className={cx(
                  'relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border transition-all duration-200',
                  active
                    ? 'border-brand-500 shadow-soft ring-1 ring-brand-300'
                    : 'border-line hover:border-brand-200',
                )}
              >
                <input
                  type="radio"
                  name="ocasion"
                  checked={active}
                  onChange={() => onSelect(active ? null : item)}
                  className="sr-only-focusable absolute left-3 top-3 h-4 w-4"
                />

                <span className="relative block aspect-[16/9] overflow-hidden bg-blush">
                  {item.heroImage && (
                    <img src={item.heroImage} alt="" loading="lazy" className="h-full w-full object-cover" />
                  )}
                  <span
                    className={cx(
                      'absolute inset-0 transition-opacity',
                      active ? 'bg-scrim-brand/60' : 'bg-scrim/25',
                    )}
                    aria-hidden="true"
                  />
                  {active && (
                    <span className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-surface text-brand-700" aria-hidden="true">
                      <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none">
                        <path d="m3.5 8.4 2.8 2.8 6.2-6.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  )}
                  <span className="absolute inset-x-0 bottom-0 p-3">
                    <span className="block font-display text-lg leading-tight text-white">{item.name}</span>
                  </span>
                </span>

                <span className="block bg-surface p-3 text-xs leading-relaxed text-ink-500">
                  {item.tagline}
                </span>
              </label>
            );
          })}
        </div>

        {selected && (
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="mt-4 text-sm font-medium text-brand-700 underline underline-offset-4 hover:text-brand-800"
          >
            Quitar selección
          </button>
        )}
      </fieldset>
    </div>
  );
}

// ── Paso 3 · Fecha y hora ────────────────────────────────────────────

function StepDateTime({
  service,
  timezone,
  date,
  onDateChange,
  slots,
  slotsLoading,
  slot,
  onSlotChange,
  onRefresh,
  minNoticeHours,
  headingRef,
}) {
  return (
    <div>
      <h2 id="titulo-paso" ref={headingRef} tabIndex={-1} className="text-2xl focus:outline-none sm:text-3xl">
        Elige el día y la hora
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-500">
        Solo aparecen los horarios realmente libres para{' '}
        <span className="font-medium text-ink-700">{service?.name}</span> ({duration(service?.durationMinutes ?? 0)}).
        Necesitamos {minNoticeHours} h de antelación.
      </p>

      <div className="mt-7 grid gap-5 lg:grid-cols-[minmax(0,22rem)_1fr] lg:gap-6">
        <Calendar serviceId={service?.id} value={date} onChange={onDateChange} timezone={timezone} />

        <div className="min-w-0">
          {!date ? (
            <div className="flex h-full min-h-[14rem] flex-col items-center justify-center rounded-3xl border border-dashed border-line bg-surface/60 px-6 py-10 text-center">
              <svg viewBox="0 0 24 24" className="mb-3 h-8 w-8 text-brand-300" fill="none" aria-hidden="true">
                <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" stroke="currentColor" strokeWidth="1.3" />
                <path d="M3.5 9.5h17M8 3v3.5M16 3v3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              <p className="text-sm text-ink-500">Selecciona un día en el calendario</p>
            </div>
          ) : (
            <div className="rounded-3xl border border-line bg-surface p-5 shadow-soft sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-display text-lg capitalize text-ink-800">{longDate(`${date}T12:00:00`, timezone)}</h3>
                <button
                  type="button"
                  onClick={onRefresh}
                  className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-brand-700 transition hover:bg-blush"
                >
                  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
                    <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2v3h-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Actualizar
                </button>
              </div>

              <p className="mt-1 text-xs text-ink-400">
                La lista se actualiza sola cada 30 segundos.
              </p>

              <div className="mt-5" aria-live="polite">
                {slotsLoading ? (
                  <div className="flex items-center justify-center gap-3 py-10 text-sm text-ink-500">
                    <Spinner className="h-5 w-5 text-brand-500" />
                    Buscando horarios…
                  </div>
                ) : slots.length === 0 ? (
                  <Alert tone="warning">
                    No quedan horarios libres ese día. Prueba con otra fecha o escríbenos por WhatsApp
                    para revisar alternativas.
                  </Alert>
                ) : (
                  <fieldset>
                    <legend className="sr-only">Horarios disponibles</legend>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {slots.map((item) => {
                        const active = slot?.start === item.start;
                        return (
                          <label
                            key={item.start}
                            className={cx(
                              'relative flex min-h-[46px] cursor-pointer items-center justify-center rounded-xl border text-sm font-medium transition-all duration-200',
                              active
                                ? 'border-brand-600 bg-brand-600 text-on-brand shadow-soft'
                                : 'border-line bg-surface text-ink-700 hover:border-brand-300 hover:bg-blush',
                            )}
                          >
                            <input
                              type="radio"
                              name="horario"
                              checked={active}
                              onChange={() => onSlotChange(item)}
                              className="sr-only-focusable absolute inset-0 h-full w-full opacity-0"
                            />
                            {item.label}
                          </label>
                        );
                      })}
                    </div>
                    <p className="mt-4 text-xs text-ink-400">
                      {slots.length} {slots.length === 1 ? 'horario disponible' : 'horarios disponibles'} ·
                      Hora de {timezone.split('/')[1]?.replace('_', ' ') ?? timezone}
                    </p>
                  </fieldset>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Paso 4 · Datos ───────────────────────────────────────────────────

function StepDetails({ form, errors, onChange, isAuthenticated, headingRef }) {
  return (
    <div>
      <h2 id="titulo-paso" ref={headingRef} tabIndex={-1} className="text-2xl focus:outline-none sm:text-3xl">
        Tus datos de contacto
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-500">
        Los usamos solo para confirmar la cita y avisarte de cualquier cambio.
      </p>

      {!isAuthenticated && (
        <Alert tone="info" className="mt-6">
          Estás reservando como invitada, que es perfectamente válido.{' '}
          <Link to="/registro" className="font-medium underline underline-offset-2">
            Crear una cuenta
          </Link>{' '}
          es opcional y sirve para ver tu historial y acumular sellos de fidelidad.
        </Alert>
      )}

      <div className="mt-7 grid gap-5 sm:grid-cols-2">
        <Input
          label="Nombre completo"
          required
          autoComplete="name"
          value={form.customerName}
          onChange={onChange('customerName')}
          error={errors.customerName}
          placeholder="María Fernanda Gómez"
          maxLength={120}
        />

        <Input
          label="WhatsApp"
          type="tel"
          required
          inputMode="tel"
          autoComplete="tel"
          value={form.customerPhone}
          onChange={onChange('customerPhone')}
          error={errors.customerPhone}
          placeholder="+57 300 123 4567"
          hint="Por aquí te confirmamos la cita."
        />

        <Input
          label="Correo electrónico"
          type="email"
          required
          autoComplete="email"
          value={form.customerEmail}
          onChange={onChange('customerEmail')}
          error={errors.customerEmail}
          placeholder="tucorreo@ejemplo.com"
          hint="Te enviamos la confirmación por escrito."
          className="sm:col-span-2"
        />

        <Textarea
          label="Notas para la maquilladora"
          value={form.notes}
          onChange={onChange('notes')}
          error={errors.notes}
          maxLength={1000}
          rows={4}
          className="sm:col-span-2"
          placeholder="Color del vestido, alergias, referencias que te gustan, si el evento es al aire libre…"
          hint="Todo lo que nos cuentes ayuda a preparar mejor tu look."
        />
      </div>

      {/* Trampa para bots: invisible para personas, tentadora para scripts. */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-px w-px overflow-hidden">
        <label htmlFor="website">No rellenar este campo</label>
        <input
          id="website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={form.website}
          onChange={onChange('website')}
        />
      </div>
    </div>
  );
}

// ── Paso 5 · Confirmación ────────────────────────────────────────────

const PAYMENT_OPTIONS = [
  {
    value: 'TRANSFERENCIA',
    title: 'Transferencia bancaria',
    description: 'Te enviamos los datos por correo. Confirmas enviando el comprobante.',
  },
  {
    value: 'EFECTIVO',
    title: 'Efectivo el día de la cita',
    description: 'No adelantas nada. Pagas al terminar el servicio.',
  },
];

function StepConfirm({ form, setForm, service, occasion, slot, settings, headingRef }) {
  return (
    <div>
      <h2 id="titulo-paso" ref={headingRef} tabIndex={-1} className="text-2xl focus:outline-none sm:text-3xl">
        Revisa y confirma
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-500">
        Comprueba que todo esté correcto. Al confirmar recibirás un correo con los detalles.
      </p>

      <fieldset className="mt-7">
        <legend className="mb-3 font-display text-xl text-ink-800">¿Cómo prefieres pagar?</legend>
        <p className="mb-4 text-xs leading-relaxed text-ink-500">
          No cobramos nada en línea: solo registramos tu preferencia.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          {PAYMENT_OPTIONS.map((option) => {
            const active = form.paymentMethod === option.value;
            return (
              <label
                key={option.value}
                className={cx(
                  'flex cursor-pointer gap-3 rounded-2xl border p-4 transition-all duration-200',
                  active
                    ? 'border-brand-500 bg-brand-50 shadow-soft ring-1 ring-brand-300'
                    : 'border-line bg-surface hover:border-brand-200 hover:bg-blush/60',
                )}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value={option.value}
                  checked={active}
                  onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value }))}
                  className="mt-0.5 h-5 w-5 shrink-0 border-line text-brand-600 focus:ring-brand-400"
                />
                <span>
                  <span className="block font-medium text-ink-800">{option.title}</span>
                  <span className="mt-1 block text-xs leading-relaxed text-ink-500">{option.description}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {form.paymentMethod === 'TRANSFERENCIA' && settings.transferInstructions && (
        <div className="mt-5 rounded-2xl border border-line bg-blush p-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-brand-700">
            Datos para la transferencia
          </p>
          <p className="whitespace-pre-line text-sm leading-relaxed text-ink-600">
            {settings.transferInstructions}
          </p>
        </div>
      )}

      <div className="mt-8 rounded-3xl border border-line bg-surface p-5 shadow-soft sm:p-6">
        <h3 className="font-display text-xl text-ink-800">Resumen de tu cita</h3>
        <dl className="mt-4 divide-y divide-line text-sm">
          {[
            ['Servicio', service?.name],
            ['Duración', service ? duration(service.durationMinutes) : null],
            ['Ocasión', occasion?.name ?? 'Sin especificar'],
            ['Fecha', slot ? longDate(slot.start, settings.timezone) : null],
            ['Hora', slot ? time(slot.start, settings.timezone) : null],
            ['A nombre de', form.customerName],
            ['WhatsApp', form.customerPhone],
            ['Correo', form.customerEmail],
            ['Notas', form.notes || null],
          ]
            .filter(([, value]) => value)
            .map(([label, value]) => (
              <div key={label} className="flex flex-wrap justify-between gap-x-6 gap-y-1 py-2.5">
                <dt className="text-ink-500">{label}</dt>
                <dd className="max-w-[60%] text-right font-medium text-ink-800">{value}</dd>
              </div>
            ))}
          <div className="flex items-baseline justify-between gap-6 pt-3">
            <dt className="text-ink-500">Total</dt>
            <dd className="font-display text-2xl text-brand-700">
              {service ? money(service.priceCents, service.currency) : '—'}
            </dd>
          </div>
        </dl>
      </div>

      <p className="mt-5 text-xs leading-relaxed text-ink-500">
        Al confirmar aceptas que te contactemos por WhatsApp y correo para gestionar esta cita. Puedes
        cancelar o reprogramar hasta 24 horas antes.
      </p>
    </div>
  );
}

// ── Resumen lateral ──────────────────────────────────────────────────

function Summary({ service, occasion, slot, timezone, paymentMethod }) {
  if (!service) {
    return (
      <aside className="hidden rounded-3xl border border-dashed border-line bg-surface/60 p-6 text-sm text-ink-400 lg:block lg:sticky lg:top-24">
        Tu selección aparecerá aquí.
      </aside>
    );
  }

  return (
    <aside className="rounded-3xl border border-line bg-surface p-5 shadow-soft lg:sticky lg:top-24">
      <p className="text-xs font-semibold uppercase tracking-widest text-ink-400">Tu reserva</p>

      {service.images?.[0] && (
        <img
          src={service.images[0].url}
          alt=""
          loading="lazy"
          className="mt-4 aspect-[16/10] w-full rounded-2xl object-cover"
        />
      )}

      <h3 className="mt-4 font-display text-xl leading-snug text-ink-800">{service.name}</h3>
      <Badge className="mt-2">{CATEGORY_LABEL[service.category]}</Badge>

      <dl className="mt-5 space-y-2.5 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-ink-500">Duración</dt>
          <dd className="font-medium text-ink-800">{duration(service.durationMinutes)}</dd>
        </div>
        {occasion && (
          <div className="flex justify-between gap-3">
            <dt className="text-ink-500">Ocasión</dt>
            <dd className="text-right font-medium text-ink-800">{occasion.name}</dd>
          </div>
        )}
        {slot && (
          <>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-500">Fecha</dt>
              <dd className="text-right font-medium capitalize text-ink-800">
                {longDate(slot.start, timezone)}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-500">Hora</dt>
              <dd className="font-medium text-ink-800">{time(slot.start, timezone)}</dd>
            </div>
          </>
        )}
        {paymentMethod && (
          <div className="flex justify-between gap-3">
            <dt className="text-ink-500">Pago</dt>
            <dd className="font-medium text-ink-800">
              {paymentMethod === 'TRANSFERENCIA' ? 'Transferencia' : 'Efectivo'}
            </dd>
          </div>
        )}
      </dl>

      <div className="mt-5 flex items-baseline justify-between border-t border-line pt-4">
        <span className="text-sm text-ink-500">Total</span>
        <span className="font-display text-2xl text-brand-700">
          {money(service.priceCents, service.currency)}
        </span>
      </div>
    </aside>
  );
}

// ── Pantalla final ───────────────────────────────────────────────────

function Confirmation({ booking, settings, isAuthenticated }) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mx-auto max-w-2xl text-center"
    >
      <motion.div
        initial={reduced ? false : { scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 16, delay: 0.1 }}
        className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand-gradient text-white shadow-lift"
      >
        <svg viewBox="0 0 32 32" className="h-10 w-10" fill="none" aria-hidden="true">
          <motion.path
            d="m9 16.5 4.8 4.8L23 11.5"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={reduced ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay: 0.35 }}
          />
        </svg>
      </motion.div>

      <h2 className="mt-7 text-3xl sm:text-4xl">¡Reserva recibida!</h2>
      <p className="text-pretty mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-ink-600">
        Te enviamos un correo a <span className="font-medium text-ink-800">{booking.customerEmail}</span>{' '}
        con los detalles. Te escribimos por WhatsApp para confirmarla.
      </p>

      <div className="mt-8 rounded-3xl border border-line bg-surface p-6 text-left shadow-soft sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-5">
          <div>
            <p className="text-xs uppercase tracking-widest text-ink-400">Código de reserva</p>
            <p className="mt-1 font-mono text-2xl font-semibold tracking-wider text-brand-700">
              {booking.code}
            </p>
          </div>
          <Badge tone="gold">Pendiente de confirmación</Badge>
        </div>

        <dl className="mt-5 space-y-3 text-sm">
          {[
            ['Servicio', booking.service.name],
            ['Fecha', longDate(booking.startAt, settings.timezone)],
            ['Hora', time(booking.startAt, settings.timezone)],
            ['Medio de pago', booking.paymentMethod === 'TRANSFERENCIA' ? 'Transferencia' : 'Efectivo'],
            ['Valor', money(booking.priceCents, booking.currency)],
          ].map(([label, value]) => (
            <div key={label} className="flex flex-wrap justify-between gap-x-6 gap-y-1">
              <dt className="text-ink-500">{label}</dt>
              <dd className="text-right font-medium capitalize text-ink-800">{value}</dd>
            </div>
          ))}
        </dl>

        {booking.paymentMethod === 'TRANSFERENCIA' && settings.transferInstructions && (
          <div className="mt-6 rounded-2xl bg-blush p-4">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-brand-700">
              Datos para la transferencia
            </p>
            <p className="whitespace-pre-line text-sm leading-relaxed text-ink-600">
              {settings.transferInstructions}
            </p>
          </div>
        )}
      </div>

      <p className="mt-6 text-sm text-ink-500">
        Guarda tu código: con él y tu correo puedes{' '}
        <Link to="/mi-reserva" className="font-medium text-brand-700 underline underline-offset-4">
          consultar tu reserva
        </Link>{' '}
        cuando quieras.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button to="/" variant="secondary">
          Volver al inicio
        </Button>
        {!isAuthenticated && <Button to="/registro">Crear cuenta y sumar sellos</Button>}
      </div>
    </motion.div>
  );
}

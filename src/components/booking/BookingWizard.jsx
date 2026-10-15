import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { api, qs, ApiError } from '../../lib/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { duration, longDate, time, CATEGORY_LABEL, PAYMENT_LABEL, priceLabel } from '../../lib/format.js';
import { Button, Input, Textarea, Badge, Alert, Spinner, LoadingBlock, cx } from '../ui/index.jsx';
import Calendar from './Calendar.jsx';
import Stepper from './Stepper.jsx';
import { WhatsAppButtonLink, WhatsAppTextLink } from './WhatsAppAction.jsx';
import {
  capFirst,
  timezoneLabel,
  ownerFirstName,
  needsConversation,
  isBridalService,
  displayPhone,
  phoneForSubmit,
  phoneError,
  captureSource,
  readSource,
  saveDraft,
  loadDraft,
  clearDraft,
  googleCalendarUrl,
  icsDataUrl,
} from './bookingHelpers.js';

/**
 * Asistente de reserva.
 *
 * Decisión de producto que atraviesa todo el componente: NUNCA se pide
 * cuenta. Si hay sesión, los datos se rellenan solos y la reserva queda
 * ligada al historial; si no, se reserva como invitada y punto. La
 * cuenta se ofrece solo al final, con los datos ya puestos.
 *
 * La reserva es híbrida: lo sencillo se agenda en el calendario y lo
 * que necesita conversación (novias, servicios "a cotizar", grupos,
 * domicilio) se lleva a WhatsApp con el mensaje ya escrito. En cada
 * punto donde la clienta podría quedarse sin salida (servidor dormido,
 * día lleno, fecha fuera de la agenda abierta) hay un botón de WhatsApp.
 *
 * Los horarios se recargan en silencio cada 30 segundos mientras se está
 * en el paso de fecha y hora, y al volver a la pestaña. Aun así, la
 * palabra final la tiene el servidor: si alguien se adelanta, la API
 * responde 409 y aquí se refresca la lista y se avisa.
 */

const STEPS = [
  { key: 'servicio', label: 'Servicio' },
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

/**
 * Render Free apaga el servidor cuando nadie entra, y despertarlo puede
 * tardar cerca de un minuto. A los pocos segundos se explica la espera
 * y se ofrece WhatsApp; pasado el minuto se deja de esperar.
 */
const SLOW_AFTER_MS = 5_000;
const GIVE_UP_AFTER_MS = 60_000;

const isDesktop = () => window.matchMedia?.('(min-width: 1024px)').matches;

/** "Sáb 24 oct" para la barra del celular. */
function shortDay(value, timezone) {
  const text = new Intl.DateTimeFormat('es-CO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: timezone,
  }).format(new Date(value));
  return capFirst(text.replace(/\./g, '').replace(',', ''));
}

export default function BookingWizard() {
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  const settings = useSettings();
  const toast = useToast();
  const reduced = useReducedMotion();

  const [step, setStep] = useState(0);
  const [catalog, setCatalog] = useState({ services: [], occasions: [], status: 'loading' });
  const [catalogAttempt, setCatalogAttempt] = useState(0);
  const [missingSlug, setMissingSlug] = useState(false);
  const [advice, setAdvice] = useState(false);

  const [service, setService] = useState(null);
  const [occasion, setOccasion] = useState(null);
  const [date, setDate] = useState(null);
  const [slot, setSlot] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState(false);
  const [nextFree, setNextFree] = useState({ loading: false, date: null, slot: null });
  const [findingNext, setFindingNext] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState(null);

  const headingRef = useRef(null);
  const slotsRef = useRef(null);
  const initialized = useRef(false);
  // Inicio del horario que hay que volver a marcar cuando llegue la
  // lista (al retomar un borrador o con "Próximo horario libre").
  const restoreSlot = useRef(null);
  // Servicio y día cuyos horarios se están mostrando ("id|fecha").
  const slotsFor = useRef(null);

  const first = ownerFirstName(settings);

  // De dónde llegó la clienta (utm_source / ref), si entró directo aquí.
  useEffect(() => {
    captureSource();
  }, []);

  // ── Carga del catálogo ─────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setCatalog((c) => ({ ...c, status: 'loading' }));

    const slow = setTimeout(() => {
      if (!cancelled) setCatalog((c) => (c.status === 'loading' ? { ...c, status: 'slow' } : c));
    }, SLOW_AFTER_MS);
    const giveUp = setTimeout(() => controller.abort(), GIVE_UP_AFTER_MS);

    // allSettled y no all: si falla /occasions, los servicios se siguen
    // mostrando (la ocasión es opcional).
    Promise.allSettled([
      api.get('/services', { signal: controller.signal }),
      api.get('/occasions', { signal: controller.signal }),
    ]).then(([s, o]) => {
      clearTimeout(slow);
      clearTimeout(giveUp);
      if (cancelled) return;
      if (s.status === 'rejected') {
        setCatalog((c) => ({ ...c, status: 'error' }));
        return;
      }
      setCatalog({
        services: s.value.services ?? [],
        occasions: o.status === 'fulfilled' ? o.value.occasions ?? [] : [],
        status: 'ready',
      });
    });

    return () => {
      cancelled = true;
      clearTimeout(slow);
      clearTimeout(giveUp);
      controller.abort();
    };
  }, [catalogAttempt]);

  // Una sola vez, con el catálogo ya cargado: parámetros de la URL
  // (/reservar?servicio=slug&ocasion=slug) y borrador de la pestaña.
  useEffect(() => {
    if (catalog.status !== 'ready' || initialized.current) return;
    initialized.current = true;

    const { services, occasions } = catalog;
    const slug = searchParams.get('servicio');
    const occasionSlug = searchParams.get('ocasion');
    const fromUrl = slug ? services.find((item) => item.slug === slug) : null;
    const urlOccasion = occasionSlug ? occasions.find((item) => item.slug === occasionSlug) : null;
    if (slug && !fromUrl) setMissingSlug(true);

    const draft = loadDraft();
    if (draft?.form) {
      const { customerName, customerEmail, customerPhone, notes, paymentMethod } = draft.form;
      setForm((f) => ({
        ...f,
        customerName: customerName || f.customerName,
        customerEmail: customerEmail || f.customerEmail,
        customerPhone: customerPhone || f.customerPhone,
        notes: notes || f.notes,
        paymentMethod: paymentMethod || f.paymentMethod,
      }));
    }

    // La URL manda, porque es lo último que la clienta pidió: el
    // borrador solo se retoma si no la contradice.
    const draftService = draft?.serviceId ? services.find((item) => item.id === draft.serviceId) : null;
    if (draftService && (!slug || draftService.slug === slug)) {
      setService(draftService);
      setOccasion(urlOccasion ?? occasions.find((item) => item.id === draft.occasionId) ?? null);
      if (draft.date) setDate(draft.date);
      if (draft.date && draft.slotStart) {
        restoreSlot.current = draft.slotStart;
        setStep(Math.min(Math.max(draft.step ?? 1, 1), STEPS.length - 1));
      } else {
        setStep(Math.min(draft.step ?? 0, 1));
      }
      return;
    }

    if (urlOccasion) setOccasion(urlOccasion);
    if (fromUrl) {
      setService(fromUrl);
      // Novias y "a cotizar": primero la conversación, no el calendario.
      if (needsConversation(fromUrl)) setAdvice(true);
      else setStep(1);
    }
  }, [catalog]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Borrador: el avance sobrevive a una recarga mientras la pestaña viva.
  useEffect(() => {
    if (!initialized.current || confirmation) return;
    saveDraft({
      step,
      serviceId: service?.id ?? null,
      occasionId: occasion?.id ?? null,
      date,
      slotStart: slot?.start ?? null,
      form: {
        customerName: form.customerName,
        customerEmail: form.customerEmail,
        customerPhone: form.customerPhone,
        notes: form.notes,
        paymentMethod: form.paymentMethod,
      },
    });
  }, [step, service, occasion, date, slot, form, confirmation]);

  // Al avanzar de paso se lleva el foco al título: quien navegue con
  // lector de pantalla oye dónde está en vez de quedarse en el botón.
  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  // ── Horarios disponibles ───────────────────────────────────────────

  const loadSlots = useCallback(
    async ({ silent = false } = {}) => {
      if (!service || !date) return;
      const key = `${service.id}|${date}`;
      if (!silent) setSlotsLoading(true);
      try {
        const data = await api.get(`/availability/slots${qs({ serviceId: service.id, date })}`);
        // Si la clienta ya tocó otro día, la respuesta lenta del anterior
        // no puede pintar sus horas bajo la fecha nueva: reservaría otro día.
        if (slotsFor.current !== key) return;
        const list = data.slots ?? [];
        setSlots(list);
        setSlotsError(false);

        if (restoreSlot.current) {
          const wanted = restoreSlot.current;
          restoreSlot.current = null;
          const found = list.find((s) => s.start === wanted);
          if (found) {
            setSlot(found);
          } else {
            toast.info('El horario que tenías elegido ya no está libre. Elige otro.');
            setStep((s) => Math.min(s, 1));
          }
          return;
        }

        // Si el hueco elegido desapareció mientras se decidía, se avisa.
        setSlot((current) => {
          if (current && !list.some((s) => s.start === current.start)) {
            if (silent) toast.info('El horario que tenías elegido acaba de ocuparse. Elige otro.');
            return null;
          }
          return current;
        });
      } catch {
        if (slotsFor.current !== key) return;
        // Retomando un borrador sin poder confirmar su horario: de vuelta
        // al paso de la hora, donde está "Reintentar". Si no, se quedaría
        // en "Confirmar" sin horario y el botón no haría nada.
        if (restoreSlot.current) {
          restoreSlot.current = null;
          setStep((s) => Math.min(s, 1));
        }
        if (!silent) setSlotsError(true);
      } finally {
        if (!silent && slotsFor.current === key) setSlotsLoading(false);
      }
    },
    [service, date, toast],
  );

  useEffect(() => {
    slotsFor.current = service && date ? `${service.id}|${date}` : null;
    setSlot(null);
    setSlots([]);
    setSlotsError(false);
    loadSlots();
  }, [service?.id, date]); // eslint-disable-line react-hooks/exhaustive-deps

  // Refresco periódico y silencioso mientras se elige la hora.
  useEffect(() => {
    if (step !== 1 || !date) return undefined;

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

  // Primer horario libre del servicio, para ofrecerlo de un toque.
  useEffect(() => {
    if (step !== 1 || !service) return undefined;
    let cancelled = false;
    setNextFree({ loading: true, date: null, slot: null });
    api
      .get(`/availability/next${qs({ serviceId: service.id })}`)
      .then((data) => !cancelled && setNextFree({ loading: false, date: data.date, slot: data.slot }))
      .catch(() => !cancelled && setNextFree({ loading: false, date: null, slot: null }));
    return () => {
      cancelled = true;
    };
  }, [step, service?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const chooseDate = (value) => {
    setDate(value);
    // En el celular los horarios quedan debajo del calendario, fuera de
    // la vista: se baja hasta ellos para que se note que pasó algo.
    if (!isDesktop()) {
      requestAnimationFrame(() =>
        slotsRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }),
      );
    }
  };

  const takeNextFree = () => {
    if (!nextFree.date || !nextFree.slot) return;
    if (nextFree.date === date) {
      setSlot(slots.find((s) => s.start === nextFree.slot.start) ?? nextFree.slot);
      return;
    }
    restoreSlot.current = nextFree.slot.start;
    chooseDate(nextFree.date);
  };

  async function findNextDay() {
    setFindingNext(true);
    try {
      const data = await api.get(`/availability/next${qs({ serviceId: service.id, after: date })}`);
      if (data.date) chooseDate(data.date);
      else toast.info('No vemos más días con cupo en la agenda abierta. Escríbenos por WhatsApp.');
    } catch {
      toast.error('No pudimos buscar otro día. Inténtalo de nuevo.');
    } finally {
      setFindingNext(false);
    }
  }

  // ── Navegación entre pasos ─────────────────────────────────────────

  const phoneProblem = phoneError(form.customerPhone);

  const canContinue = useMemo(
    () =>
      [
        Boolean(service),
        Boolean(slot),
        Boolean(form.customerName && form.customerEmail && form.customerPhone) && !phoneProblem,
        true,
      ][step],
    [step, service, slot, form, phoneProblem],
  );

  // Qué falta para seguir, dicho en la misma barra del botón.
  const missing = [
    'Elige un servicio para seguir',
    date ? 'Elige una hora para seguir' : 'Elige un día para seguir',
    phoneProblem ? 'Revisa tu número de WhatsApp' : 'Completa tu nombre, WhatsApp y correo',
    null,
  ][step];

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
        customerPhone: phoneForSubmit(form.customerPhone),
        paymentMethod: form.paymentMethod,
        notes: form.notes.trim() || undefined,
        source: readSource(),
        website: form.website,
      });

      clearDraft();
      setConfirmation(booking);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === 'SLOT_TAKEN' || error.status === 409) {
          toast.error(error.message);
          setStep(1);
          await loadSlots();
        } else if (error.details?.length) {
          setFieldErrors(error.fieldErrors);
          setStep(2);
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

  const genericMessage = `Hola ${first}, quiero reservar una cita.`;

  if (catalog.status === 'loading') return <LoadingBlock label="Cargando servicios…" />;

  if (catalog.status === 'slow' || catalog.status === 'error') {
    const failed = catalog.status === 'error';
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-line bg-surface p-6 text-center shadow-soft sm:p-8" aria-live="polite">
        {failed ? (
          <>
            <h2 className="text-2xl">No pudimos abrir la agenda</h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-600">
              Puede ser la conexión o que el servidor esté tardando. Vuelve a intentarlo, o reserva
              directamente por WhatsApp.
            </p>
          </>
        ) : (
          <>
            <Spinner className="mx-auto h-7 w-7 text-brand-500" />
            <h2 className="mt-4 text-2xl">Estamos abriendo la agenda, un momento…</h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-600">
              La primera visita del día puede tardar hasta un minuto. Si prefieres no esperar,
              escríbenos por WhatsApp.
            </p>
          </>
        )}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          {failed && (
            <Button onClick={() => setCatalogAttempt((n) => n + 1)}>Reintentar</Button>
          )}
          <WhatsAppButtonLink message={genericMessage} variant={failed ? 'secondary' : 'primary'}>
            Reservar por WhatsApp
          </WhatsAppButtonLink>
        </div>
      </div>
    );
  }

  if (confirmation) {
    return (
      <Confirmation
        booking={confirmation}
        service={service}
        form={form}
        settings={settings}
        isAuthenticated={isAuthenticated}
      />
    );
  }

  if (catalog.services.length === 0) {
    return (
      <Alert tone="warning" title="Agenda no disponible">
        <p>Aún no hay servicios publicados para reservar en línea. Escríbenos y te agendamos.</p>
        <WhatsAppTextLink message={genericMessage} className="mt-1">
          Reservar por WhatsApp
        </WhatsAppTextLink>
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

  const price = service ? priceLabel(service) : null;
  const summaryLine = [
    service?.name,
    slot ? shortDay(slot.start, settings.timezone) : date ? shortDay(`${date}T12:00:00`, settings.timezone) : null,
    slot ? time(slot.start, settings.timezone) : null,
    price?.short,
  ]
    .filter(Boolean)
    .join(' · ');

  const helpMessage = service
    ? `Hola ${first}, estoy reservando ${service.name} en la web y tengo una duda.`
    : `Hola ${first}, estoy reservando en la web y tengo una duda.`;

  return (
    // En el celular se deja sitio abajo para la barra fija.
    <div className="pb-32 lg:pb-0">
      <div className="mb-6 sm:mb-10">
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
                  occasion={occasion}
                  selected={service}
                  advice={advice}
                  missingSlug={missingSlug}
                  first={first}
                  onSelect={(s) => {
                    setService(s);
                    setDate(null);
                    setMissingSlug(false);
                    if (needsConversation(s)) {
                      setAdvice(true);
                    } else {
                      setAdvice(false);
                      setTimeout(next, 180);
                    }
                  }}
                  onContinue={() => {
                    setAdvice(false);
                    next();
                  }}
                />
              )}

              {step === 1 && (
                <StepDateTime
                  headingRef={headingRef}
                  slotsRef={slotsRef}
                  service={service}
                  timezone={settings.timezone}
                  date={date}
                  onDateChange={chooseDate}
                  slots={slots}
                  slotsLoading={slotsLoading}
                  slotsError={slotsError}
                  slot={slot}
                  onSlotChange={setSlot}
                  onRetry={() => loadSlots()}
                  nextFree={nextFree}
                  onTakeNextFree={takeNextFree}
                  onFindNextDay={findNextDay}
                  findingNext={findingNext}
                  minNoticeHours={settings.minNoticeHours}
                  first={first}
                />
              )}

              {step === 2 && (
                <StepDetails
                  headingRef={headingRef}
                  form={form}
                  errors={fieldErrors}
                  onChange={setField}
                  isAuthenticated={isAuthenticated}
                  occasions={catalog.occasions}
                  occasion={occasion}
                  onOccasionChange={setOccasion}
                  service={service}
                  first={first}
                />
              )}

              {step === 3 && (
                <StepConfirm
                  headingRef={headingRef}
                  form={form}
                  setForm={setForm}
                  service={service}
                  occasion={occasion}
                  slot={slot}
                  settings={settings}
                  first={first}
                />
              )}
            </motion.section>
          </AnimatePresence>

          <div className="mt-8 lg:hidden">
            <WhatsAppTextLink message={helpMessage}>¿Dudas? Escríbenos por WhatsApp</WhatsAppTextLink>
          </div>

          {/*
           * Controles. En el celular, barra fija abajo con lo elegido y el
           * motivo cuando aún no se puede seguir; desde `lg`, en su sitio
           * de siempre bajo el paso.
           */}
          <div
            className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 px-4 pt-2.5 shadow-lift backdrop-blur-md lg:static lg:z-auto lg:mt-10 lg:bg-transparent lg:px-0 lg:pt-6 lg:shadow-none lg:backdrop-blur-none"
            style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
          >
            <p
              className={cx('mb-2 truncate text-xs lg:hidden', canContinue ? 'text-ink-600' : 'text-ink-500')}
              aria-live="polite"
            >
              {canContinue ? summaryLine || STEPS[step].label : missing}
            </p>

            <div className="flex items-center gap-3 lg:justify-between">
              <Button
                variant="ghost"
                onClick={back}
                disabled={step === 0}
                aria-label="Atrás"
                className={cx('shrink-0 px-4 lg:px-6', step === 0 && 'hidden lg:invisible lg:inline-flex')}
              >
                <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden="true">
                  <path d="M13 8H4m0 0 3.5-3.5M4 8l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="hidden sm:inline">Atrás</span>
              </Button>

              <div className="flex flex-1 items-center justify-end gap-4 lg:flex-none">
                {!canContinue && missing && (
                  <p className="hidden text-xs text-ink-500 lg:block">{missing}</p>
                )}
                {step < STEPS.length - 1 ? (
                  <Button onClick={next} disabled={!canContinue} size="lg" className="w-full lg:w-auto">
                    Continuar
                    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden="true">
                      <path d="M3 8h9m0 0L8.5 4.5M12 8l-3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </Button>
                ) : (
                  <Button onClick={submit} loading={submitting} size="lg" className="w-full lg:w-auto">
                    {submitting ? 'Enviando…' : 'Confirmar reserva'}
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 hidden lg:block">
            <WhatsAppTextLink message={helpMessage}>¿Dudas? Escríbenos por WhatsApp</WhatsAppTextLink>
          </div>
        </div>

        {/* Resumen lateral (en el celular lo hace la barra fija). */}
        <Summary
          service={service}
          occasion={occasion}
          slot={slot}
          timezone={settings.timezone}
          paymentMethod={step >= 3 ? form.paymentMethod : null}
        />
      </div>
    </div>
  );
}

// ── Paso 1 · Servicio ────────────────────────────────────────────────

const GROUPS = [
  { key: 'PAQUETE', title: 'Paquetes', hint: 'Maquillaje y peinado juntos, con mejor precio' },
  { key: 'MAQUILLAJE', title: 'Maquillaje', hint: null },
  { key: 'PEINADO', title: 'Peinado', hint: null },
];

function StepService({ services, occasion, selected, advice, missingSlug, first, onSelect, onContinue, headingRef }) {
  // Si llegó desde una ocasión (/reservar?ocasion=bodas), sus servicios
  // van primero y no se repiten abajo.
  const occasionIds = new Set((occasion?.services ?? []).map((s) => s.id));
  const recommended = services.filter((s) => occasionIds.has(s.id));
  const groups = [
    ...(recommended.length > 0
      ? [{ key: 'OCASION', title: `Para ${occasion.name.toLowerCase()}`, hint: 'Los que mejor funcionan para tu ocasión', items: recommended }]
      : []),
    ...GROUPS.map((group) => ({
      ...group,
      title: recommended.length > 0 ? `Otros · ${group.title.toLowerCase()}` : group.title,
      items: services.filter((s) => s.category === group.key && !occasionIds.has(s.id)),
    })),
  ];

  const wedding = occasion?.slug === 'bodas';
  const adviceMessage = [
    `Hola ${first}, quiero asesoría.`,
    `Evento: ${occasion ? occasion.name : ''}`,
    'Fecha aproximada: ',
    'Somos __ personas.',
    'Lugar: estudio / domicilio',
  ].join('\n');

  return (
    <div>
      <h2 id="titulo-paso" ref={headingRef} tabIndex={-1} className="text-2xl focus:outline-none sm:text-3xl">
        ¿Qué servicio quieres?
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-500">
        Cada uno muestra su duración real, para que sepas cuánto tiempo apartar.
      </p>

      {missingSlug && (
        <Alert tone="warning" className="mt-6">
          <p>Ese servicio no está disponible para reservar en línea ahora mismo. Escríbenos y lo cuadramos.</p>
          <WhatsAppTextLink message={`Hola ${first}, vi un servicio en tu web y no pude reservarlo en línea.`}>
            Preguntar por WhatsApp
          </WhatsAppTextLink>
        </Alert>
      )}

      {/* Lo que necesita conversación no se mete en el calendario. */}
      <div
        className={cx(
          'mt-6 flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between',
          wedding ? 'border-brand-300 bg-brand-50' : 'border-line bg-surface',
        )}
      >
        <p className="text-sm leading-relaxed text-ink-700">
          <span className="font-medium text-ink-800">¿Es para tu boda, para varias personas o a domicilio?</span>{' '}
          Habla con {first} y lo cuadran juntas.
        </p>
        <WhatsAppButtonLink
          message={adviceMessage}
          variant={wedding ? 'primary' : 'secondary'}
          size="sm"
          className="shrink-0"
        >
          Hablar con {first}
        </WhatsAppButtonLink>
      </div>

      <div className="mt-8 space-y-9">
        {groups.map((group) => {
          if (group.items.length === 0) return null;
          const showAdvice = advice && selected && group.items.some((item) => item.id === selected.id);

          return (
            <fieldset key={group.key}>
              <legend className="mb-1 font-display text-xl text-ink-800">{group.title}</legend>
              {group.hint && <p className="mb-4 text-xs text-ink-500">{group.hint}</p>}

              <div className="grid gap-3 sm:grid-cols-2">
                {group.items.map((item) => (
                  <ServiceOption key={item.id} item={item} active={selected?.id === item.id} onSelect={onSelect} />
                ))}
              </div>

              {showAdvice && <AdvicePanel service={selected} first={first} onContinue={onContinue} />}
            </fieldset>
          );
        })}
      </div>
    </div>
  );
}

function ServiceOption({ item, active, onSelect }) {
  const price = priceLabel(item);
  return (
    <label
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
          <span className={cx('font-display text-ink-800', price.isQuote ? 'text-base' : 'text-lg')}>
            {price.text}
          </span>
          <span className="text-xs text-ink-500">· {duration(item.durationMinutes)}</span>
        </span>
      </span>
    </label>
  );
}

/**
 * Panel de "primero hablemos" para novias y servicios a cotizar.
 * WhatsApp es la acción principal, pero quien ya habló con Yury puede
 * seguir al calendario y separar la fecha.
 */
function AdvicePanel({ service, first, onContinue }) {
  const ref = useRef(null);
  const reduced = useReducedMotion();
  const bridal = isBridalService(service);

  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest' });
  }, [service.id, reduced]);

  const message = bridal
    ? `Hola ${first}, me interesa el ${service.name}. Mi boda es el día __ y quiero asesoría.`
    : `Hola ${first}, quiero cotizar el ${service.name}. Mi evento es el día __.`;

  return (
    <div ref={ref} role="region" aria-label="Antes de agendar" className="mt-4 rounded-2xl border border-brand-300 bg-brand-50 p-5">
      <p className="font-display text-xl text-ink-800">
        {bridal ? 'Con las novias primero hablamos' : 'Este servicio se cotiza por WhatsApp'}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-ink-600">
        {bridal
          ? 'Antes de separar la fecha conviene conversar: cuadramos la hora de inicio, el lugar y si te acompaña alguien más.'
          : `El valor depende de lo que necesites. Cuéntale a ${first} y te responde con el precio.`}
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <WhatsAppButtonLink message={message} variant="primary">
          Hablar con {first} por WhatsApp
        </WhatsAppButtonLink>
        <Button variant="secondary" onClick={onContinue}>
          Ya hablamos, quiero separar la fecha
        </Button>
      </div>
    </div>
  );
}

// ── Paso 2 · Fecha y hora ────────────────────────────────────────────

function StepDateTime({
  service,
  timezone,
  date,
  onDateChange,
  slots,
  slotsLoading,
  slotsError,
  slot,
  onSlotChange,
  onRetry,
  nextFree,
  onTakeNextFree,
  onFindNextDay,
  findingNext,
  minNoticeHours,
  first,
  headingRef,
  slotsRef,
}) {
  const dayLabel = date ? capFirst(longDate(`${date}T12:00:00`, timezone)) : '';

  const horizonNote = (lastDateISO) => {
    const last = longDate(`${lastDateISO}T12:00:00`, timezone).replace(/^\S+,\s*/, '').replace(/ de \d{4}$/, '');
    return (
      <div className="rounded-2xl border border-dashed border-line bg-surface-2 p-4 text-sm leading-relaxed text-ink-600">
        <p>
          La agenda en línea para este servicio llega hasta el {last}. ¿Tu evento es después? Escríbenos y
          te separamos la fecha.
        </p>
        <WhatsAppTextLink message={`Hola ${first}, quiero separar una fecha para ${service.name}. Mi evento es el día __.`}>
          Separar una fecha más adelante
        </WhatsAppTextLink>
      </div>
    );
  };

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
        <Calendar
          key={service?.id}
          serviceId={service?.id}
          value={date}
          onChange={onDateChange}
          timezone={timezone}
          renderHorizonNote={horizonNote}
        />

        <div ref={slotsRef} className="min-w-0 scroll-mt-24">
          {!date ? (
            <div className="flex h-full min-h-[12rem] flex-col items-center justify-center rounded-3xl border border-dashed border-line bg-surface/60 px-6 py-8 text-center">
              {nextFree.loading ? (
                <p className="flex items-center gap-2 text-sm text-ink-500">
                  <Spinner className="h-4 w-4 text-brand-500" />
                  Buscando el próximo horario libre…
                </p>
              ) : nextFree.slot ? (
                <>
                  <p className="text-sm text-ink-500">Elige un día en el calendario, o toma el más cercano:</p>
                  <Button variant="secondary" className="mt-4" onClick={onTakeNextFree}>
                    Próximo horario libre: {shortDay(nextFree.slot.start, timezone)} · {time(nextFree.slot.start, timezone)}
                  </Button>
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" className="mb-3 h-8 w-8 text-brand-300" fill="none" aria-hidden="true">
                    <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" stroke="currentColor" strokeWidth="1.3" />
                    <path d="M3.5 9.5h17M8 3v3.5M16 3v3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                  <p className="text-sm text-ink-500">Selecciona un día en el calendario</p>
                </>
              )}
            </div>
          ) : (
            <div className="rounded-3xl border border-line bg-surface p-5 shadow-soft sm:p-6">
              <h3 className="font-display text-lg text-ink-800">{dayLabel}</h3>

              <div className="mt-4" aria-live="polite">
                {slotsLoading ? (
                  <div className="flex items-center justify-center gap-3 py-10 text-sm text-ink-500">
                    <Spinner className="h-5 w-5 text-brand-500" />
                    Buscando horarios…
                  </div>
                ) : slotsError ? (
                  <Alert tone="error">
                    <p>No pudimos cargar los horarios de ese día.</p>
                    <Button variant="secondary" size="sm" className="mt-3" onClick={onRetry}>
                      Reintentar
                    </Button>
                  </Alert>
                ) : slots.length === 0 ? (
                  <div className="space-y-3">
                    <Alert tone="warning">No quedan horarios libres ese día.</Alert>
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      <Button variant="secondary" size="sm" onClick={onFindNextDay} loading={findingNext}>
                        Ver el siguiente día con cupo
                      </Button>
                      <WhatsAppButtonLink
                        size="sm"
                        message={`Hola ${first}, quería ${service.name} el ${dayLabel.toLowerCase()} y no veo horarios. ¿Tienes alguna alternativa?`}
                      >
                        Preguntar por otro horario
                      </WhatsAppButtonLink>
                    </div>
                  </div>
                ) : (
                  <fieldset>
                    <legend className="sr-only">Horarios disponibles</legend>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {slots.map((item) => {
                        const active = slot?.start === item.start;
                        return (
                          <label key={item.start} className="relative">
                            <input
                              type="radio"
                              name="horario"
                              checked={active}
                              onChange={() => onSlotChange(item)}
                              className="peer sr-only"
                            />
                            <span
                              className={cx(
                                'flex min-h-[46px] cursor-pointer items-center justify-center rounded-xl border text-sm font-medium transition-all duration-200',
                                'peer-focus-visible:ring-2 peer-focus-visible:ring-brand-600 peer-focus-visible:ring-offset-1',
                                active
                                  ? 'border-brand-600 bg-brand-600 text-on-brand shadow-soft'
                                  : 'border-line bg-surface text-ink-700 hover:border-brand-300 hover:bg-blush',
                              )}
                            >
                              {item.label}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    <p className="mt-4 text-xs text-ink-400">
                      {slots.length} {slots.length === 1 ? 'horario disponible' : 'horarios disponibles'} ·{' '}
                      {timezoneLabel(timezone)}
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

// ── Paso 3 · Datos ───────────────────────────────────────────────────

function StepDetails({
  form,
  errors,
  onChange,
  isAuthenticated,
  occasions,
  occasion,
  onOccasionChange,
  service,
  first,
  headingRef,
}) {
  const [phoneTouched, setPhoneTouched] = useState(false);
  const phoneProblem = phoneError(form.customerPhone);
  const phoneHint = form.customerPhone && !phoneProblem
    ? `Te escribiremos al ${displayPhone(form.customerPhone)}.`
    : 'Por aquí te confirmamos la cita. Basta con los 10 dígitos.';

  return (
    <div>
      <h2 id="titulo-paso" ref={headingRef} tabIndex={-1} className="text-2xl focus:outline-none sm:text-3xl">
        Tus datos de contacto
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-500">
        Los usamos solo para confirmar la cita y avisarte de cualquier cambio.
        {!isAuthenticated && ' No necesitas cuenta para reservar.'}
      </p>

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
          onBlur={() => setPhoneTouched(true)}
          error={errors.customerPhone || (phoneTouched ? phoneProblem : null)}
          placeholder="300 123 4567"
          hint={phoneHint}
          maxLength={24}
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

        {occasions.length > 0 && (
          <fieldset className="sm:col-span-2">
            <legend className="label-base">
              ¿Para qué ocasión?
              <span className="ml-1.5 text-xs font-normal text-ink-400">(opcional)</span>
            </legend>
            <div className="mt-1 flex flex-wrap gap-2">
              {[...occasions, null].map((item) => {
                const active = (occasion?.id ?? null) === (item?.id ?? null);
                return (
                  <label key={item?.id ?? 'otra'} className="relative">
                    <input
                      type="radio"
                      name="ocasion"
                      checked={active}
                      onChange={() => onOccasionChange(item)}
                      className="peer sr-only"
                    />
                    <span
                      className={cx(
                        'inline-flex min-h-[44px] cursor-pointer items-center rounded-full border px-4 text-sm transition',
                        'peer-focus-visible:ring-2 peer-focus-visible:ring-brand-600 peer-focus-visible:ring-offset-1',
                        active
                          ? 'border-brand-600 bg-brand-600 font-medium text-on-brand'
                          : 'border-line bg-surface text-ink-700 hover:border-brand-300 hover:bg-blush',
                      )}
                    >
                      {item?.name ?? 'Otra / prefiero no decir'}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}

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

      <p className="mt-5 text-sm text-ink-600">
        ¿Son varias personas o es a domicilio?{' '}
        <WhatsAppTextLink
          message={`Hola ${first}, quiero reservar ${service?.name ?? 'una cita'}. Somos __ personas / es a domicilio en __.`}
        >
          Escríbenos
        </WhatsAppTextLink>
      </p>

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

// ── Paso 4 · Confirmación ────────────────────────────────────────────

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
    // Novias, "desde" y "a cotizar": puede que Yury pida algo para
    // separar la fecha, así que aquí no se promete "no adelantas nada".
    openDescription: 'Pagas al terminar el servicio.',
  },
];

/** Etiqueta y nota del precio según el modo del servicio. */
function priceRow(service, first) {
  const price = priceLabel(service);
  if (price.mode === 'QUOTE') {
    return { label: 'Valor', value: price.text, note: `${first} te confirma el valor por WhatsApp.` };
  }
  if (price.mode === 'FROM') {
    return {
      label: 'Valor estimado',
      value: price.text,
      note: `${first} te confirma el valor final por WhatsApp según el look que elijas.`,
    };
  }
  return { label: 'Total', value: price.text, note: null };
}

function StepConfirm({ form, setForm, service, occasion, slot, settings, first, headingRef }) {
  const price = service ? priceRow(service, first) : null;
  const end = slot && service ? new Date(new Date(slot.start).getTime() + service.durationMinutes * 60_000) : null;
  const openTerms = Boolean(service) && (needsConversation(service) || priceLabel(service).mode === 'FROM');

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
                  <span className="mt-1 block text-xs leading-relaxed text-ink-500">
                    {(openTerms && option.openDescription) || option.description}
                  </span>
                </span>
              </label>
            );
          })}
        </div>

        {/*
         * Novias, "desde" y "a cotizar": no se promete aquí cómo se separa
         * la fecha, porque esa regla la define Yury. Se dice quién la confirma.
         */}
        {openTerms && (
          <p className="mt-4 text-xs leading-relaxed text-ink-500">
            El valor final y la forma de separar la fecha te los confirma {first} por WhatsApp.
          </p>
        )}
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
            ['Fecha', slot ? capFirst(longDate(slot.start, settings.timezone)) : null],
            ['Hora', slot ? `${time(slot.start, settings.timezone)} – ${time(end, settings.timezone)}` : null],
            ['A nombre de', form.customerName],
            ['WhatsApp', displayPhone(form.customerPhone)],
            ['Correo', form.customerEmail],
            ['Notas', form.notes || null],
          ]
            .filter(([, value]) => value)
            .map(([label, value]) => (
              <div key={label} className="flex flex-wrap justify-between gap-x-6 gap-y-1 py-2.5">
                <dt className="text-ink-500">{label}</dt>
                <dd className="max-w-[60%] break-words text-right font-medium text-ink-800">{value}</dd>
              </div>
            ))}
          {price && (
            <div className="pt-3">
              <div className="flex items-baseline justify-between gap-6">
                <dt className="text-ink-500">{price.label}</dt>
                <dd className="font-display text-2xl text-brand-700">{price.value}</dd>
              </div>
              {price.note && <p className="mt-1 text-right text-xs text-ink-500">{price.note}</p>}
            </div>
          )}
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
      <aside className="hidden rounded-3xl border border-dashed border-line bg-surface/60 p-6 text-sm text-ink-400 lg:sticky lg:top-24 lg:block">
        Tu selección aparecerá aquí.
      </aside>
    );
  }

  const price = priceLabel(service);

  return (
    <aside className="hidden rounded-3xl border border-line bg-surface p-5 shadow-soft lg:sticky lg:top-24 lg:block">
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
              <dd className="text-right font-medium text-ink-800">{capFirst(longDate(slot.start, timezone))}</dd>
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
            <dd className="font-medium text-ink-800">{PAYMENT_LABEL[paymentMethod]}</dd>
          </div>
        )}
      </dl>

      <div className="mt-5 flex items-baseline justify-between gap-3 border-t border-line pt-4">
        <span className="text-sm text-ink-500">{price.mode === 'FIXED' ? 'Total' : 'Valor'}</span>
        <span className={cx('text-right font-display text-brand-700', price.isQuote ? 'text-lg' : 'text-2xl')}>
          {price.text}
        </span>
      </div>
    </aside>
  );
}

// ── Pantalla final ───────────────────────────────────────────────────

function Confirmation({ booking, service, form, settings, isAuthenticated }) {
  const reduced = useReducedMotion();
  const first = ownerFirstName(settings);
  const tz = settings.timezone;

  const serviceInfo = { ...service, ...booking.service };
  const price = priceLabel({ ...serviceInfo, priceCents: booking.priceCents, currency: booking.currency });
  // El fin para la clienta es el del servicio, sin el margen de limpieza
  // que la agenda deja después (booking.endAt lo incluye).
  const end = new Date(new Date(booking.startAt).getTime() + serviceInfo.durationMinutes * 60_000);
  const dayLabel = longDate(booking.startAt, tz);
  const hourLabel = time(booking.startAt, tz);
  const transfer = booking.paymentMethod === 'TRANSFERENCIA';

  const waMessage = transfer
    ? `Hola ${first}, reservé ${serviceInfo.name} para el ${dayLabel} a las ${hourLabel}. Mi código es ${booking.code}. Te envío el comprobante.`
    : `Hola ${first}, reservé ${serviceInfo.name} para el ${dayLabel} a las ${hourLabel}. Mi código es ${booking.code}. Quedo atenta a tu confirmación.`;

  const event = {
    uid: `${booking.code}@reservas`,
    title: `${serviceInfo.name} · ${settings.brandName}`,
    start: booking.startAt,
    end,
    location: settings.addressLine || undefined,
    details: `Código de reserva: ${booking.code}`,
  };

  const prefill = {
    fullName: form.customerName.trim(),
    email: booking.customerEmail,
    phone: booking.customerPhone,
  };

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
        {transfer
          ? `Para confirmarla, envía el comprobante de la transferencia por WhatsApp con tu código.`
          : `Para confirmarla, escríbele a ${first} por WhatsApp con tu código.`}{' '}
        También te enviamos los detalles a <span className="font-medium text-ink-800">{booking.customerEmail}</span>.
      </p>

      <div className="mx-auto mt-6 flex max-w-md flex-col gap-3">
        <WhatsAppButtonLink message={waMessage} variant="primary" size="lg" className="w-full">
          {transfer ? 'Enviar comprobante por WhatsApp' : `Confirmar por WhatsApp`}
        </WhatsAppButtonLink>
        <Button
          href={googleCalendarUrl(event)}
          target="_blank"
          rel="noopener noreferrer"
          variant="secondary"
          className="w-full"
        >
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" aria-hidden="true">
            <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M3.5 9.5h17M8 3v3.5M16 3v3.5M12 12.5v5M9.5 15h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Agregar a Google Calendar
        </Button>
        <a
          href={icsDataUrl(event)}
          download={`cita-${booking.code}.ics`}
          className="inline-flex min-h-[44px] items-center justify-center text-sm font-medium text-brand-700 underline underline-offset-4 hover:text-brand-800"
        >
          Otro calendario (iPhone, Outlook): descargar la cita
        </a>
      </div>

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
            ['Servicio', serviceInfo.name],
            ['Fecha', capFirst(dayLabel)],
            ['Hora', `${hourLabel} – ${time(end, tz)}`],
            ['Medio de pago', PAYMENT_LABEL[booking.paymentMethod]],
            // "Valor estimado" solo con "desde": junto a "A cotizar" no dice nada.
            [price.mode === 'FROM' ? 'Valor estimado' : 'Valor', price.text],
          ].map(([label, value]) => (
            <div key={label} className="flex flex-wrap justify-between gap-x-6 gap-y-1">
              <dt className="text-ink-500">{label}</dt>
              <dd className="text-right font-medium text-ink-800">{value}</dd>
            </div>
          ))}
        </dl>

        {transfer && settings.transferInstructions && (
          <div className="mt-6 rounded-2xl bg-blush p-4">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-brand-700">
              Datos para la transferencia
            </p>
            <p className="whitespace-pre-line text-sm leading-relaxed text-ink-600">
              {settings.transferInstructions}
            </p>
          </div>
        )}

        <div className="mt-6 border-t border-line pt-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-400">Qué sigue</p>
          <ol className="mt-3 space-y-3 text-sm leading-relaxed text-ink-600">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blush text-xs font-semibold text-brand-700">1</span>
              {transfer
                ? 'Envía el comprobante por WhatsApp con tu código.'
                : 'Escríbenos por WhatsApp con tu código.'}
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blush text-xs font-semibold text-brand-700">2</span>
              {first} te confirma la cita por WhatsApp.
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blush text-xs font-semibold text-brand-700">3</span>
              <span>
                {settings.addressLine ? (
                  <>
                    El día de tu cita te esperamos en {settings.addressLine}
                    {settings.mapUrl && (
                      <>
                        {' · '}
                        <a
                          href={settings.mapUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-brand-700 underline underline-offset-4"
                        >
                          ver en el mapa
                        </a>
                      </>
                    )}
                    .
                  </>
                ) : (
                  'El día de tu cita te esperamos a la hora reservada.'
                )}
              </span>
            </li>
          </ol>
        </div>
      </div>

      <p className="mt-6 text-sm text-ink-500">
        Guarda tu código: con él y tu correo puedes{' '}
        <Link
          to={`/mi-reserva?codigo=${encodeURIComponent(booking.code)}`}
          className="font-medium text-brand-700 underline underline-offset-4"
        >
          consultar tu reserva
        </Link>{' '}
        cuando quieras.
      </p>

      {/*
       * La cuenta va al final y con los datos ya puestos. La reserva ya
       * quedó guardada: el backend la enlaza a la cuenta por el correo.
       */}
      {!isAuthenticated && (
        <p className="mt-3 text-sm text-ink-500">
          ¿Quieres sumar sellos de fidelidad?{' '}
          <Link
            to="/registro"
            state={{ prefill }}
            className="font-medium text-brand-700 underline underline-offset-4"
          >
            Crea tu cuenta con estos datos
          </Link>
          . Esta reserva queda en tu historial.
        </p>
      )}
    </motion.div>
  );
}

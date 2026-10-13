import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import { WEEKDAYS, longDate, time, toDateISO } from '../../lib/format.js';
import { Button, Input, Checkbox, Alert, LoadingBlock, Badge, cx } from '../../components/ui/index.jsx';

/**
 * Horarios y bloqueos.
 *
 * Dos conceptos distintos que conviene no mezclar:
 *  · REGLAS   → el horario semanal que se repite (martes de 9 a 13, …).
 *  · BLOQUEOS → excepciones puntuales (el 24 de diciembre no trabajo).
 *
 * El motor de disponibilidad cruza ambos: un hueco existe si cae dentro
 * de una regla Y no choca con un bloqueo ni con otra reserva.
 */
export default function ScheduleAdmin() {
  const toast = useToast();
  const settings = useSettings();

  const [rules, setRules] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [newBlock, setNewBlock] = useState({
    date: '',
    allDay: true,
    startTime: '09:00',
    endTime: '13:00',
    reason: '',
  });

  useEffect(() => {
    Promise.allSettled([api.get('/availability/rules'), api.get('/availability/admin/blocks')])
      .then(([r, b]) => {
        setRules(r.value?.rules ?? []);
        setBlocks(b.value?.blocks ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  const addRule = (weekday) =>
    setRules((list) => [
      ...list,
      { id: `nuevo-${Date.now()}`, weekday, startTime: '09:00', endTime: '13:00', active: true },
    ]);

  const updateRule = (id, patch) =>
    setRules((list) => list.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const removeRule = (id) => setRules((list) => list.filter((r) => r.id !== id));

  async function saveRules() {
    const invalid = rules.find((r) => r.endTime <= r.startTime);
    if (invalid) {
      toast.error('Hay una franja con la hora de cierre antes de la de apertura.');
      return;
    }

    setSaving(true);
    try {
      const { rules: saved } = await api.put('/availability/admin/rules', {
        rules: rules.map(({ weekday, startTime, endTime, active }) => ({
          weekday,
          startTime,
          endTime,
          active,
        })),
      });
      setRules(saved);
      toast.success('Horario actualizado. El calendario público ya lo refleja.');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function createBlock(event) {
    event.preventDefault();
    try {
      const { block } = await api.post('/availability/admin/blocks', {
        date: newBlock.date,
        allDay: newBlock.allDay,
        startTime: newBlock.allDay ? undefined : newBlock.startTime,
        endTime: newBlock.allDay ? undefined : newBlock.endTime,
        reason: newBlock.reason || undefined,
      });
      setBlocks((list) => [...list, block].sort((a, b) => new Date(a.startAt) - new Date(b.startAt)));
      setNewBlock((b) => ({ ...b, date: '', reason: '' }));
      toast.success('Bloqueo creado. Esas horas dejan de ofrecerse.');
    } catch (error) {
      toast.error(error.message);
    }
  }

  async function removeBlock(id) {
    try {
      await api.delete(`/availability/admin/blocks/${id}`);
      setBlocks((list) => list.filter((b) => b.id !== id));
      toast.success('Bloqueo eliminado.');
    } catch (error) {
      toast.error(error.message);
    }
  }

  if (loading) return <LoadingBlock />;

  const upcomingBlocks = blocks.filter((b) => new Date(b.endAt) >= new Date());

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl">Agenda y horarios</h1>
        <p className="mt-1.5 text-sm text-ink-500">
          Define cuándo atiendes y bloquea los días o las franjas que no estarán disponibles.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr] lg:items-start">
        {/* Horario semanal */}
        <section className="rounded-2xl border border-line bg-surface p-5 shadow-soft sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl">Horario semanal</h2>
              <p className="mt-1 text-xs text-ink-500">Se repite todas las semanas.</p>
            </div>
            <Button size="sm" loading={saving} onClick={saveRules}>
              Guardar horario
            </Button>
          </div>

          <div className="space-y-5">
            {WEEKDAYS.map((day) => {
              const dayRules = rules.filter((r) => r.weekday === day.value);

              return (
                <div key={day.value} className="border-b border-line pb-5 last:border-0 last:pb-0">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="font-medium text-ink-800">{day.label}</h3>
                    <button
                      type="button"
                      onClick={() => addRule(day.value)}
                      className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-brand-700 transition hover:bg-blush"
                    >
                      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
                        <path d="M8 3.5v9M3.5 8h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                      </svg>
                      Añadir franja
                    </button>
                  </div>

                  {dayRules.length === 0 ? (
                    <p className="text-sm text-ink-400">Cerrado</p>
                  ) : (
                    <ul className="space-y-2">
                      {dayRules.map((rule) => (
                        <li key={rule.id} className="flex flex-wrap items-center gap-2">
                          <input
                            type="time"
                            value={rule.startTime}
                            onChange={(e) => updateRule(rule.id, { startTime: e.target.value })}
                            aria-label={`Hora de apertura del ${day.label.toLowerCase()}`}
                            className="input-base w-auto px-3 py-2 text-sm"
                          />
                          <span className="text-ink-400" aria-hidden="true">
                            –
                          </span>
                          <input
                            type="time"
                            value={rule.endTime}
                            onChange={(e) => updateRule(rule.id, { endTime: e.target.value })}
                            aria-label={`Hora de cierre del ${day.label.toLowerCase()}`}
                            className={cx(
                              'input-base w-auto px-3 py-2 text-sm',
                              rule.endTime <= rule.startTime && 'border-red-400',
                            )}
                          />

                          <label className="flex items-center gap-1.5 text-xs text-ink-500">
                            <input
                              type="checkbox"
                              checked={rule.active}
                              onChange={(e) => updateRule(rule.id, { active: e.target.checked })}
                              className="h-4 w-4 rounded border-line text-brand-600 focus:ring-brand-400"
                            />
                            Activa
                          </label>

                          <button
                            type="button"
                            onClick={() => removeRule(rule.id)}
                            className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition hover:bg-red-50 hover:text-red-700"
                            aria-label={`Eliminar franja de ${rule.startTime} a ${rule.endTime} del ${day.label.toLowerCase()}`}
                          >
                            <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden="true">
                              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                            </svg>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>

          <Alert tone="info" className="mt-6">
            Entre cita y cita se reservan {settings.bufferMinutes ?? 15} minutos de margen, y los turnos se
            ofrecen cada {settings.slotIntervalMinutes ?? 30} minutos. Eso se ajusta en{' '}
            <strong>Ajustes</strong>.
          </Alert>
        </section>

        {/* Bloqueos */}
        <section className="space-y-6">
          <div className="rounded-2xl border border-line bg-surface p-5 shadow-soft sm:p-6">
            <h2 className="text-xl">Bloquear fechas</h2>
            <p className="mt-1 text-xs leading-relaxed text-ink-500">
              Vacaciones, festivos o compromisos personales. Esas horas dejan de aparecer en el calendario
              público de inmediato.
            </p>

            <form onSubmit={createBlock} className="mt-5 space-y-4">
              <Input
                label="Fecha"
                type="date"
                required
                value={newBlock.date}
                min={toDateISO(new Date(), settings.timezone)}
                onChange={(e) => setNewBlock((b) => ({ ...b, date: e.target.value }))}
              />

              <Checkbox
                label="Día completo"
                checked={newBlock.allDay}
                onChange={(e) => setNewBlock((b) => ({ ...b, allDay: e.target.checked }))}
              />

              {!newBlock.allDay && (
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Desde"
                    type="time"
                    required
                    value={newBlock.startTime}
                    onChange={(e) => setNewBlock((b) => ({ ...b, startTime: e.target.value }))}
                  />
                  <Input
                    label="Hasta"
                    type="time"
                    required
                    value={newBlock.endTime}
                    onChange={(e) => setNewBlock((b) => ({ ...b, endTime: e.target.value }))}
                  />
                </div>
              )}

              <Input
                label="Motivo"
                value={newBlock.reason}
                onChange={(e) => setNewBlock((b) => ({ ...b, reason: e.target.value }))}
                placeholder="Vacaciones, evento fuera del estudio…"
                maxLength={200}
              />

              <Button type="submit" className="w-full" disabled={!newBlock.date}>
                Crear bloqueo
              </Button>
            </form>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-5 shadow-soft sm:p-6">
            <h2 className="text-xl">Bloqueos activos</h2>

            {upcomingBlocks.length === 0 ? (
              <p className="mt-3 text-sm text-ink-400">No hay bloqueos próximos.</p>
            ) : (
              <ul className="mt-4 space-y-2.5">
                {upcomingBlocks.map((block) => (
                  <li
                    key={block.id}
                    className="flex items-start justify-between gap-3 rounded-xl border border-line p-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium capitalize text-ink-800">
                        {longDate(block.startAt, settings.timezone)}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-500">
                        {block.allDay
                          ? 'Día completo'
                          : `${time(block.startAt, settings.timezone)} – ${time(block.endAt, settings.timezone)}`}
                      </p>
                      {block.reason && <Badge tone="outline" className="mt-2">{block.reason}</Badge>}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeBlock(block.id)}
                      className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium text-red-700 transition hover:bg-red-50"
                    >
                      Quitar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

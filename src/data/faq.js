/**
 * Preguntas frecuentes del inicio.
 *
 * Regla: aquí solo se publica lo que el sistema de verdad hace. Cada
 * respuesta publicada sale del código o de los ajustes del panel:
 *   · reservar sin cuenta, el código de reserva y «Mi reserva»
 *   · pago por transferencia o en efectivo, sin cobro en línea
 *     (paso 5 del asistente)
 *   · la antelación mínima (`minNoticeHours` en Panel → Ajustes)
 *   · cancelar con cuenta hasta 24 h antes (bookings.service.js,
 *     cancelOwnBooking) y cambiar la fecha solo por WhatsApp (la
 *     reprogramación es del panel)
 *   · una persona por turno (el asistente reserva una clienta por horario)
 *
 * Las que dependen de una decisión de Yury (abono, prueba de novia,
 * domicilio, marcas…) están con `draft: true`: NO se muestran. Cuando
 * Yury dé la respuesta, se escribe en `answer` y se borra `draft`.
 *
 * `answer` puede ser un texto o una función que recibe los ajustes del
 * negocio, para que las cifras salgan siempre del panel y no se queden
 * desactualizadas aquí.
 */

export const FAQ = [
  {
    id: 'como-reservar',
    question: '¿Cómo reservo mi cita?',
    answer:
      'Elige el servicio, escoge el día y la hora en el calendario (solo aparecen los horarios que tengo libres) y deja tu nombre, tu WhatsApp y tu correo. Al terminar ves el código de tu reserva: con él y tu correo la puedes consultar cuando quieras en «Mi reserva».',
  },
  {
    id: 'cuenta',
    question: '¿Tengo que crear una cuenta?',
    answer:
      'No. Puedes reservar sin registrarte. La cuenta es opcional: sirve para ver tus citas en un solo lugar y llevar tu tarjeta de fidelidad.',
  },
  {
    id: 'pago',
    question: '¿Cómo se paga?',
    answer:
      'Por transferencia o en efectivo el día de la cita. En la web no se cobra nada: al reservar solo eliges cómo prefieres pagar y, si es por transferencia, ahí mismo ves los datos.',
  },
  {
    id: 'antelacion',
    question: '¿Con cuánta anticipación tengo que reservar?',
    answer: (settings) =>
      `En línea puedes reservar con al menos ${hours(settings.minNoticeHours)} de anticipación. Si la fecha que buscas todavía no aparece en el calendario (pasa mucho con las bodas, que se separan con meses), escríbeme por WhatsApp y lo hablamos.`,
  },
  {
    id: 'cancelar',
    question: '¿Puedo cancelar o cambiar la fecha?',
    answer:
      'Para cambiar la fecha, escríbeme por WhatsApp y buscamos otro horario. Si reservaste con tu cuenta, puedes cancelar tú misma desde «Mi cuenta» hasta 24 horas antes; con menos tiempo, avísame por WhatsApp.',
  },
  {
    id: 'varias-personas',
    question: '¿Puedo reservar para varias personas el mismo día?',
    answer:
      'Cada horario del calendario es para una persona, porque atiendo a una sola clienta a la vez. Si son varias (la mamá, las damas, amigas), escríbeme por WhatsApp y organizamos los turnos.',
  },

  // ── Pendientes de Yury: no se muestran ─────────────────────────────
  {
    id: 'abono',
    question: '¿Hay que dar un abono para separar la fecha?',
    answer: '',
    draft: true,
  },
  {
    id: 'prueba-novia',
    question: '¿La prueba de maquillaje de novia tiene costo? ¿Cuándo se hace?',
    answer: '',
    draft: true,
  },
  {
    id: 'domicilio',
    question: '¿Atiendes a domicilio, en la iglesia, en el hotel o fuera de Pasto? ¿Cuánto cuesta el desplazamiento?',
    answer: '',
    draft: true,
  },
  {
    id: 'marcas-piel',
    question: '¿Qué productos usas? ¿Y si tengo la piel sensible?',
    answer: '',
    draft: true,
  },
  {
    id: 'pestanas',
    question: '¿El maquillaje incluye pestañas?',
    answer: '',
    draft: true,
  },
  {
    id: 'llegada',
    question: '¿Cómo debo llegar a la cita (cara lavada, cabello limpio o seco)?',
    answer: '',
    draft: true,
  },
];

function hours(n) {
  const value = Number(n) || 0;
  return value === 1 ? '1 hora' : `${value} horas`;
}

/** Las preguntas que se pueden mostrar, con la respuesta ya resuelta. */
export function publishedFaq(settings) {
  return FAQ.filter((item) => !item.draft)
    .map((item) => ({
      ...item,
      answer: typeof item.answer === 'function' ? item.answer(settings) : item.answer,
    }))
    .filter((item) => item.answer);
}

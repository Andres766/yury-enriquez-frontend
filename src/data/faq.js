import { money } from '../lib/format.js';

/**
 * Preguntas frecuentes del inicio (y, filtradas, de bodas y quinceañeros:
 * ver DATE_OCCASION_FAQ en lib/catalog.js, que las pide por `id`; por eso
 * los `id` no se cambian aunque cambie la pregunta).
 *
 * Regla: aquí solo se publica lo que el sistema de verdad hace. Cada
 * respuesta publicada sale del código o de los ajustes del panel:
 *   · reservar sin cuenta, el código de reserva y «Mi reserva»
 *   · la dirección del servicio, que el asistente pide al reservar
 *   · sin cobro en línea: abono y saldo se pagan por fuera de la web
 *   · la antelación mínima (`minNoticeHours` en Panel → Ajustes)
 *   · cancelar con cuenta hasta 24 h antes (bookings.service.js,
 *     cancelOwnBooking) y cambiar la fecha solo por WhatsApp (la
 *     reprogramación es del panel)
 *   · una persona por turno (el asistente reserva una clienta por horario)
 *
 * El resto sale de la propuesta final de contenido de Yury (15 de
 * octubre de 2026): servicio 100 % a domicilio, abono del 50 % por
 * Nequi o Daviplata, saldo en efectivo o transferencia, preparación,
 * horario, pintucaritas, talleres y el acompañamiento psicológico para
 * novios. El porcentaje del abono sale de Ajustes (`depositPercent`) y
 * el adicional del domicilio urbano también (`homeVisitFeeCents`): si
 * se dejan vacíos, esa parte de la respuesta no se muestra, para no
 * prometer una cifra distinta a la que cobra el asistente.
 *
 * Las que aún esperan una decisión de Yury (prueba de novia, marcas para
 * piel sensible) están con `draft: true`: NO se muestran. Cuando Yury dé
 * la respuesta, se escribe en `answer` y se borra `draft`.
 *
 * `answer` puede ser un texto o una función que recibe los ajustes del
 * negocio, para que las cifras salgan siempre del panel y no se queden
 * desactualizadas aquí. Si la función devuelve '', la pregunta no sale.
 */

export const FAQ = [
  {
    id: 'domicilio',
    question: '¿Dónde me maquillas? ¿Cuánto cuesta el domicilio?',
    answer: (settings) =>
      [
        'Mi servicio es 100 % a domicilio: voy hasta donde estés, para que te prepares con calma en tu propio espacio.',
        urbanFeeText(settings) ?? '',
        OUT_OF_TOWN_TEXT,
        'Al reservar me escribes la dirección donde te vas a arreglar.',
      ]
        .filter(Boolean)
        .join(' '),
  },
  {
    id: 'como-reservar',
    question: '¿Cómo reservo mi cita?',
    answer:
      'Elige el servicio, escoge el día y la hora en el calendario (solo aparecen los horarios que tengo libres) y deja tu nombre, tu WhatsApp, tu correo y la dirección donde te voy a atender. Al terminar ves el código de tu reserva: con él y tu correo la puedes consultar cuando quieras en «Mi reserva».',
  },
  {
    id: 'cuenta',
    question: '¿Tengo que crear una cuenta?',
    answer:
      'No. Puedes reservar sin registrarte. La cuenta es opcional: sirve para ver tus citas en un solo lugar y llevar tu tarjeta de fidelidad.',
  },
  {
    id: 'abono',
    question: '¿Hay que dar un abono para separar la fecha?',
    answer: (settings) =>
      deposit(settings)
        ? `Sí. La reserva queda oficialmente confirmada cuando recibo el comprobante del abono del ${deposit(settings)} % del valor total del servicio, que me envías por Nequi o Daviplata al ${PAY_NUMBER}. El resto lo pagas en efectivo o por transferencia el día del servicio.`
        : '',
  },
  {
    id: 'pago',
    question: '¿Cómo se paga? ¿Recibes efectivo?',
    answer: (settings) =>
      deposit(settings)
        ? `Sí, recibo efectivo. El abono del ${deposit(settings)} % me lo envías por Nequi o Daviplata al ${PAY_NUMBER}, y el resto lo pagas en efectivo o por transferencia el día del servicio. En la web no se cobra nada: al reservar eliges cómo prefieres pagar y ahí mismo ves los datos.`
        : 'En efectivo o por transferencia el día del servicio. En la web no se cobra nada: al reservar solo eliges cómo prefieres pagar y, si es por transferencia, ahí mismo ves los datos.',
  },
  {
    id: 'horario',
    question: '¿Qué días atiendes? ¿Puedo maquillarme de madrugada?',
    answer:
      'Atiendo de lunes a domingo, incluidos los festivos, de 4:00 a. m. a 6:00 p. m. Las citas de madrugada (desde las 4:00 a. m.) para grados, bodas y quinceañeras se reservan solo por WhatsApp, con mínimo 20 días de anticipación.',
  },
  {
    id: 'antelacion',
    question: '¿Con cuánta anticipación tengo que reservar?',
    answer: (settings) =>
      `En línea puedes reservar con al menos ${hours(settings.minNoticeHours)} de anticipación. Si la fecha que buscas todavía no aparece en el calendario (pasa mucho con las bodas, que se separan con meses), escríbeme por WhatsApp y lo hablamos.`,
  },
  {
    // El id viene de cuando la clienta iba a la cita; se deja igual
    // porque otras páginas piden la pregunta por id.
    id: 'llegada',
    question: '¿Cómo me preparo para la cita?',
    answer:
      'Antes de tu cita te envío instrucciones personalizadas. Ten el cabello limpio y completamente seco, y el rostro limpio y preparado según las pautas que te doy en la asesoría previa.',
  },
  {
    id: 'pestanas',
    question: '¿El maquillaje incluye pestañas?',
    answer:
      'Las pestañas son opcionales. El diseño e instalación tiene un adicional de $20.000, con pestañas de tira o de banda fina, como tú prefieras.',
  },
  {
    id: 'sesion-fotos',
    question: '¿Me acompañas en una sesión de fotos?',
    answer:
      'Sí. El acompañamiento a sesión fotográfica tiene un adicional de $40.000 por hora: estoy contigo en el set, hago retoques continuos y controlo los brillos y las texturas bajo la luz de las fotos.',
  },
  {
    id: 'pintucaritas',
    question: '¿Haces pintucaritas solo en Halloween?',
    answer:
      'No, los hago todo el año: cumpleaños infantiles, eventos familiares y fiestas temáticas. Cada diseño toma de 15 a 30 minutos por niño.',
  },
  {
    id: 'talleres',
    question: '¿Dictas talleres de maquillaje?',
    answer:
      'Sí. Los talleres están abiertos de manera permanente y se programan bajo demanda: Automaquillaje y «Verse y Sentirse Bellas» (Belleza Consciente & Amor Propio). Cada sesión dura de 2 a 3 horas. El de automaquillaje se cotiza según la modalidad (individual o grupal) y el número de participantes. Escríbeme por WhatsApp y lo programamos.',
  },
  {
    id: 'novios-psicologia',
    question: '¿Qué es la preparación psicológica para novios?',
    answer:
      'Es un acompañamiento opcional para la pareja que se va a casar, a mi cargo como psicóloga (con tarjeta profesional). Es 100 % en pareja y personalizado, en programas de 5 a 10 sesiones, con una inversión desde $400.000 según el número de sesiones. Trabajamos la regulación del estrés y la ansiedad, la comunicación y la resolución de conflictos en pareja, y la preparación para la ceremonia, incluidos los votos.',
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
    id: 'prueba-novia',
    question: '¿La prueba de maquillaje de novia tiene costo? ¿Cuándo se hace?',
    answer: '',
    draft: true,
  },
  {
    id: 'marcas-piel',
    question: '¿Qué productos usas? ¿Y si tengo la piel sensible?',
    answer: '',
    draft: true,
  },
];

/** Nequi y Daviplata de Yury (los dos en el mismo número). */
const PAY_NUMBER = '321 854 9608';

/** Porcentaje de abono de Ajustes, o null si no hay política de abono. */
function deposit(settings) {
  const pct = Number(settings?.depositPercent);
  return pct > 0 ? pct : null;
}

/**
 * Frase del adicional del domicilio dentro de Pasto, con la cifra de
 * Ajustes (`homeVisitFeeCents`), o null si está vacío: sin valor
 * confirmado no se publica ninguno. La usa también el bloque «A
 * domicilio» del inicio, para que la cifra sea la misma en toda la web.
 * Con 0 no se escribe "un adicional de $ 0", que se lee como un error.
 */
export function urbanFeeText(settings) {
  const raw = settings?.homeVisitFeeCents;
  if (raw === null || raw === undefined || raw === '') return null;
  const cents = Number(raw);
  if (!Number.isFinite(cents) || cents < 0) return null;
  return cents === 0
    ? 'Dentro del perímetro urbano de Pasto el domicilio no tiene costo adicional.'
    : `Dentro del perímetro urbano de Pasto el domicilio tiene un adicional de ${money(cents)}.`;
}

/** Fuera de Pasto no hay tarifa fija: depende del transporte del día. */
export const OUT_OF_TOWN_TEXT =
  'Fuera de la ciudad o en municipios, el desplazamiento se calcula según las tarifas de transporte vigentes (taxi o InDrive) y te lo cotizo aparte.';

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

import { Link } from 'react-router-dom';
import { Button, Reveal } from '../ui/index.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import { whatsappLink } from '../../lib/format.js';
import WhatsAppIcon from './WhatsAppIcon.jsx';
import { firstName } from './contactInfo.js';

/**
 * Cierre corto con los dos caminos: reservar o escribir.
 *
 * Reemplaza en el inicio al bloque completo de contacto y horario, que
 * repetía el pie y la página de contacto. El horario y los datos de
 * contacto quedan en /contacto, a un enlace. No se habla de dirección:
 * Yury atiende a domicilio, es la clienta la que dice dónde.
 *
 * `primary` decide qué botón va sólido: en el inicio el objetivo es la
 * reserva; en /contacto, donde la gente llega a escribir, es WhatsApp.
 */
export default function ClosingCTA({
  primary = 'booking',
  title = '¿Lista para tu cita?',
  text = 'Reserva en línea en un par de minutos, o escríbeme y lo resolvemos por WhatsApp.',
  showContactLink = true,
}) {
  const settings = useSettings();
  const number = settings.whatsappNumber || settings.contactPhone;
  const whatsappFirst = primary === 'whatsapp' && Boolean(number);

  const booking = (
    <Button key="reservar" to="/reservar" size="lg" variant={whatsappFirst ? 'secondary' : 'primary'}>
      Reservar mi cita
    </Button>
  );

  const whatsapp = number ? (
    <Button
      key="whatsapp"
      href={whatsappLink(number, `Hola ${firstName(settings.brandName)}, quisiera consultar por una cita.`)}
      target="_blank"
      rel="noopener noreferrer"
      size="lg"
      variant={whatsappFirst ? 'primary' : 'secondary'}
    >
      <WhatsAppIcon className={whatsappFirst ? 'h-5 w-5' : 'h-5 w-5 text-wa'} />
      Escribir por WhatsApp
      <span className="sr-only">(se abre en una pestaña nueva)</span>
    </Button>
  ) : null;

  return (
    <Reveal className="container-page py-10 sm:py-14">
      <div className="veil flex flex-col items-center gap-5 rounded-[2rem] border border-line px-6 py-10 text-center sm:px-12 sm:py-12">
        <h2 className="text-balance text-2xl sm:text-3xl">{title}</h2>
        <p className="text-pretty max-w-lg text-[15px] leading-relaxed text-ink-600">{text}</p>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          {whatsappFirst ? [whatsapp, booking] : [booking, whatsapp]}
        </div>

        {showContactLink && (
          <Link
            to="/contacto"
            className="inline-block py-2 text-sm font-medium text-brand-700 underline decoration-brand-300 underline-offset-4 transition hover:decoration-brand-600"
          >
            Ver horario y contacto
          </Link>
        )}
      </div>
    </Reveal>
  );
}

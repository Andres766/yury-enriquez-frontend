import BookingWizard from '../components/booking/BookingWizard.jsx';
import { SectionTitle } from '../components/ui/index.jsx';

/*
 * La cabecera es corta en el celular a propósito: con el relleno de
 * escritorio, el primer servicio quedaba casi fuera de la pantalla.
 */
export default function Booking() {
  return (
    <div className="pb-20">
      <div className="veil border-b border-line py-7 sm:py-16">
        <div className="container-page">
          <SectionTitle
            eyebrow="Agenda en línea"
            title="Reserva tu cita"
            subtitle="Cuatro pasos y sin necesidad de crear cuenta."
            as="h1"
          />
        </div>
      </div>

      <div className="container-page pt-7 sm:pt-16">
        <BookingWizard />
      </div>
    </div>
  );
}

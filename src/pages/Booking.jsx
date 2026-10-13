import BookingWizard from '../components/booking/BookingWizard.jsx';
import { SectionTitle } from '../components/ui/index.jsx';

export default function Booking() {
  return (
    <div className="pb-20">
      <div className="veil border-b border-line py-12 sm:py-16">
        <div className="container-page">
          <SectionTitle
            eyebrow="Agenda en línea"
            title="Reserva tu cita"
            subtitle="Cinco pasos, menos de dos minutos y sin necesidad de crear cuenta."
            as="h1"
          />
        </div>
      </div>

      <div className="container-page pt-12 sm:pt-16">
        <BookingWizard />
      </div>
    </div>
  );
}

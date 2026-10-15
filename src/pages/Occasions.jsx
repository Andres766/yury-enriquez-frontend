import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { waHref } from '../lib/catalog.js';
import { useSettings } from '../context/SettingsContext.jsx';
import OccasionsGrid from '../components/home/OccasionsGrid.jsx';
import { WhatsAppIcon } from '../components/catalog/icons.jsx';
import { SectionTitle, LoadingBlock, Reveal, Button } from '../components/ui/index.jsx';

export default function Occasions() {
  const settings = useSettings();
  const [occasions, setOccasions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/occasions')
      .then((d) => setOccasions(d.occasions ?? []))
      .catch(() => setOccasions([]))
      .finally(() => setLoading(false));
  }, []);

  const waAsk = waHref(settings, 'pregunta', {});

  return (
    <div className="pb-10">
      <div className="veil border-b border-line py-14 sm:py-20">
        <div className="container-page">
          <SectionTitle
            eyebrow="Para cada ocasión"
            title="Cada evento pide algo distinto"
            subtitle="Un maquillaje de novia no se parece a uno de sesión de fotos, y ninguno de los dos se parece al de un grado. Aquí explicamos qué incluye cada tipo de servicio para que sepas cuál pedir."
            as="h1"
          />
        </div>
      </div>

      {/* El h1 de arriba ya dice lo mismo que el título de la grilla. */}
      {loading ? <LoadingBlock /> : <OccasionsGrid occasions={occasions} showTitle={false} />}

      <Reveal className="container-page">
        <div className="veil flex flex-col items-center gap-5 rounded-[2rem] border border-line px-6 py-12 text-center sm:px-12">
          <h2 className="text-balance text-2xl sm:text-3xl">¿Tu evento no encaja en ninguna?</h2>
          <p className="text-pretty max-w-lg text-[15px] leading-relaxed text-ink-600">
            Escríbenos contándonos de qué se trata, para cuándo es y cuántas personas son, y vemos cómo
            ayudarte.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button to="/reservar" size="lg">
              Reservar una cita
            </Button>
            {waAsk ? (
              <Button href={waAsk} target="_blank" rel="noopener noreferrer" variant="secondary" size="lg">
                <WhatsAppIcon className="h-5 w-5 text-wa" />
                Escribirnos por WhatsApp
              </Button>
            ) : (
              <Button to="/contacto" variant="secondary" size="lg">
                Escribirnos
              </Button>
            )}
          </div>
        </div>
      </Reveal>
    </div>
  );
}

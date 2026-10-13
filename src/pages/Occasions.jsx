import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import OccasionsGrid from '../components/home/OccasionsGrid.jsx';
import { SectionTitle, LoadingBlock, Reveal, Button } from '../components/ui/index.jsx';

export default function Occasions() {
  const [occasions, setOccasions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/occasions')
      .then((d) => setOccasions(d.occasions ?? []))
      .catch(() => setOccasions([]))
      .finally(() => setLoading(false));
  }, []);

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

      {loading ? <LoadingBlock /> : <OccasionsGrid occasions={occasions} />}

      <Reveal className="container-page">
        <div className="veil flex flex-col items-center gap-5 rounded-[2rem] border border-line px-6 py-12 text-center sm:px-12">
          <h2 className="text-balance text-2xl sm:text-3xl">¿Tu evento no encaja en ninguna?</h2>
          <p className="text-pretty max-w-lg text-[15px] leading-relaxed text-ink-600">
            Escríbenos contándonos de qué se trata y armamos algo a la medida. Trabajamos también
            desplazamientos, grupos y eventos corporativos.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button to="/reservar" size="lg">
              Reservar una cita
            </Button>
            <Button to="/contacto" variant="secondary" size="lg">
              Escribirnos
            </Button>
          </div>
        </div>
      </Reveal>
    </div>
  );
}

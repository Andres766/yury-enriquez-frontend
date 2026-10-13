import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import Hero from '../components/home/Hero.jsx';
import HowItWorks from '../components/home/HowItWorks.jsx';
import OccasionsGrid from '../components/home/OccasionsGrid.jsx';
import PromoStrip from '../components/home/PromoStrip.jsx';
import AboutStrip from '../components/home/AboutStrip.jsx';
import ContactSection from '../components/home/ContactSection.jsx';
import ServiceCard from '../components/ServiceCard.jsx';
import { SectionTitle, Button, Reveal, LoadingBlock } from '../components/ui/index.jsx';

export default function Home() {
  const [data, setData] = useState({ services: [], occasions: [], promotions: [], rules: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      api.get('/services'),
      api.get('/occasions'),
      api.get('/promotions'),
      api.get('/availability/rules'),
    ])
      .then(([services, occasions, promotions, rules]) => {
        setData({
          services: services.value?.services ?? [],
          occasions: occasions.value?.occasions ?? [],
          promotions: promotions.value?.promotions ?? [],
          rules: rules.value?.rules ?? [],
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const featured = data.services.filter((s) => s.featured).slice(0, 6);
  const toShow = featured.length > 0 ? featured : data.services.slice(0, 6);

  return (
    <>
      <Hero />

      {loading ? (
        <LoadingBlock label="Cargando el catálogo…" />
      ) : (
        <>
          <section className="container-page py-20 sm:py-24" aria-labelledby="titulo-servicios">
            <SectionTitle
              eyebrow="Servicios"
              title="Lo que hacemos"
              subtitle="Precios claros, duración real y fotos del trabajo. Si tienes dudas sobre cuál elegir, escríbenos y lo resolvemos en dos mensajes."
              className="mb-14"
              as="h2"
            />
            <span id="titulo-servicios" className="sr-only">
              Servicios destacados
            </span>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {toShow.map((service, i) => (
                <ServiceCard key={service.id} service={service} index={i} />
              ))}
            </div>

            <Reveal delay={0.15} className="mt-12 text-center">
              <Button to="/servicios" variant="secondary" size="lg">
                Ver todos los servicios y precios
              </Button>
            </Reveal>
          </section>

          <OccasionsGrid occasions={data.occasions} limit={6} />
          <HowItWorks />
          <PromoStrip promotions={data.promotions} />
          <AboutStrip />
          <ContactSection rules={data.rules} />
        </>
      )}
    </>
  );
}

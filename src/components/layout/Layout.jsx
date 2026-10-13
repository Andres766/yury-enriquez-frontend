import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar.jsx';
import Footer from './Footer.jsx';
import WhatsAppButton from './WhatsAppButton.jsx';
import SeasonalDecor from './SeasonalDecor.jsx';
import SeasonalBanner from './SeasonalBanner.jsx';

/**
 * Estructura pública del sitio.
 *
 * Incluye el enlace "saltar al contenido" (primer tabulador de la
 * página) y devuelve el foco al principal en cada cambio de ruta, para
 * que quien navegue con lector de pantalla no se quede en el menú.
 */
export default function Layout() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);

  return (
    <div className="relative flex min-h-screen flex-col">
      <SeasonalDecor />

      <a href="#contenido" className="skip-link">
        Saltar al contenido
      </a>

      <SeasonalBanner />
      <Navbar />

      <main id="contenido" tabIndex={-1} className="relative z-10 flex-1 focus:outline-none">
        <Outlet />
      </main>

      <Footer />
      <WhatsAppButton />
    </div>
  );
}

import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';

import Layout from './components/layout/Layout.jsx';
import ProtectedRoute from './routes/ProtectedRoute.jsx';
import { LoadingBlock } from './components/ui/index.jsx';

import Home from './pages/Home.jsx';
import Services from './pages/Services.jsx';
import ServiceDetail from './pages/ServiceDetail.jsx';
import Occasions from './pages/Occasions.jsx';
import OccasionDetail from './pages/OccasionDetail.jsx';
import Booking from './pages/Booking.jsx';
import BookingLookup from './pages/BookingLookup.jsx';
import Contact from './pages/Contact.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Account from './pages/Account.jsx';
import NotFound from './pages/NotFound.jsx';

/*
 * El panel de administración se carga bajo demanda: la mayoría de quien
 * entra a la web nunca lo abre, así que no tiene sentido hacerle
 * descargar ese código.
 */
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout.jsx'));
const Dashboard = lazy(() => import('./pages/admin/Dashboard.jsx'));
const BookingsAdmin = lazy(() => import('./pages/admin/BookingsAdmin.jsx'));
const ScheduleAdmin = lazy(() => import('./pages/admin/ScheduleAdmin.jsx'));
const ServicesAdmin = lazy(() => import('./pages/admin/ServicesAdmin.jsx'));
const PromotionsAdmin = lazy(() => import('./pages/admin/PromotionsAdmin.jsx'));
const LoyaltyAdmin = lazy(() => import('./pages/admin/LoyaltyAdmin.jsx'));
const SettingsAdmin = lazy(() => import('./pages/admin/SettingsAdmin.jsx'));

export default function App() {
  return (
    <Suspense fallback={<LoadingBlock label="Cargando…" />}>
      <Routes>
        {/* Sitio público */}
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="servicios" element={<Services />} />
          <Route path="servicios/:slug" element={<ServiceDetail />} />
          <Route path="ocasiones" element={<Occasions />} />
          <Route path="ocasiones/:slug" element={<OccasionDetail />} />
          <Route path="reservar" element={<Booking />} />
          <Route path="mi-reserva" element={<BookingLookup />} />
          <Route path="contacto" element={<Contact />} />
          <Route path="ingresar" element={<Login />} />
          <Route path="registro" element={<Register />} />

          <Route
            path="mi-cuenta"
            element={
              <ProtectedRoute>
                <Account />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Route>

        {/* Panel de administración */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute requireAdmin>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="reservas" element={<BookingsAdmin />} />
          <Route path="agenda" element={<ScheduleAdmin />} />
          <Route path="servicios" element={<ServicesAdmin />} />
          <Route path="promociones" element={<PromotionsAdmin />} />
          <Route path="fidelidad" element={<LoyaltyAdmin />} />
          <Route path="ajustes" element={<SettingsAdmin />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

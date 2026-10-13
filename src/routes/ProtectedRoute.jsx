import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { LoadingBlock } from '../components/ui/index.jsx';

/**
 * Guardia de rutas del cliente.
 *
 * Es una comodidad de navegación, NO una medida de seguridad: quien
 * quiera puede saltársela editando el JavaScript del navegador. La
 * protección real está en el backend, donde cada endpoint de
 * administración vuelve a comprobar el rol contra la base de datos.
 */
export default function ProtectedRoute({ children, requireAdmin = false }) {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingBlock label="Verificando tu sesión…" />;

  if (!isAuthenticated) {
    return <Navigate to="/ingresar" state={{ from: location.pathname }} replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/mi-cuenta" replace />;
  }

  return children;
}

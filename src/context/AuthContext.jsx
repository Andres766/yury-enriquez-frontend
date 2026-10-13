import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { api, setAccessToken, onSessionLost } from '../lib/api.js';

/**
 * Sesión de la clienta.
 *
 * Al montar la app se intenta una renovación silenciosa: si existe la
 * cookie httpOnly de refresco, recuperamos la sesión sin pedir nada. Si
 * no, se sigue como invitada, que es un estado perfectamente válido en
 * esta web: reservar nunca exige cuenta.
 */

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await api.refresh();
        if (!cancelled && data?.user) {
          setAccessToken(data.accessToken);
          setUser(data.user);
        }
      } catch {
        // Sin sesión previa: se continúa como invitada.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Si el refresco falla a mitad de la sesión, se limpia el estado.
  useEffect(() => onSessionLost(() => setUser(null)), []);

  /**
   * Renovación proactiva: el access token dura 15 minutos, así que se
   * renueva cada 12 para que no caduque mientras alguien rellena el
   * formulario de reserva.
   */
  useEffect(() => {
    if (!user) return undefined;
    const id = setInterval(
      () => {
        api.refresh().then((data) => {
          if (data?.user) setUser(data.user);
        });
      },
      12 * 60 * 1000,
    );
    return () => clearInterval(id);
  }, [user]);

  const login = useCallback(async (credentials) => {
    const data = await api.post('/auth/login', credentials);
    setAccessToken(data.accessToken);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (payload) => {
    const data = await api.post('/auth/register', payload);
    setAccessToken(data.accessToken);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  const updateProfile = useCallback(async (payload) => {
    const data = await api.patch('/auth/me', payload);
    setUser(data.user);
    return data.user;
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === 'ADMIN',
      login,
      register,
      logout,
      updateProfile,
    }),
    [user, loading, login, register, logout, updateProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}

import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

const STORAGE_KEY  = 'srms_user';
const TOKEN_KEY    = 'srms_token';

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore user and token from localStorage on page load
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const token  = localStorage.getItem(TOKEN_KEY);
      if (stored && token) {
        const parsed = JSON.parse(stored);
        setUser(parsed);
        // Set token on axios instance immediately
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(TOKEN_KEY);
    }
    setLoading(false);
  }, []);

  const login = async (employeeId) => {
    const res      = await api.post('/auth/login', { employee_id: employeeId });
    const userData = res.data.user;
    const token    = res.data.token;

    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
    localStorage.setItem(TOKEN_KEY, token);

    // Set Authorization header for all future requests
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    setUser(userData);
    return userData;
  };

  const logout = async () => {
    try { await api.post('/auth/logout'); } catch {}
    // Clear everything
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TOKEN_KEY);
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
  };

  const isAdmin   = () => user?.role === 'admin';
  const isCashier = () => user?.role === 'cashier';
  const isStaff   = () => user?.role === 'staff';

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin, isCashier, isStaff, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../api/client';

interface AuthState {
  token: string | null;
  user: any;
  tenant: any;
  login: (email: string, password: string) => Promise<void>;
  signup: (companyName: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState>({} as AuthState);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<any>(null);
  const [tenant, setTenant] = useState<any>(null);

  useEffect(() => {
    if (token) {
      api.get('/auth/me').then(res => {
        setUser(res.data.user);
        setTenant(res.data.tenant);
      }).catch(() => {
        setToken(null);
        localStorage.removeItem('token');
      });
    }
  }, [token]);

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);
    setTenant(data.tenant);
  };

  const signup = async (companyName: string, email: string, password: string) => {
    const { data } = await api.post('/auth/signup', { companyName, email, password });
    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);
    setTenant(data.tenant);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setTenant(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, tenant, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

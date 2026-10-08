import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (u: string, p: string) => Promise<void>;
  register: (e: string, u: string, p: string, name?: string) => Promise<void>;
  demoLogin: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('insight_ai_token'));
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadUser() {
      const savedToken = localStorage.getItem('insight_ai_token');
      if (savedToken) {
        try {
          const me = await api.getMe();
          setUser(me);
          setToken(savedToken);
        } catch {
          // Token expired or invalid, auto-login demo
          await autoDemo();
        }
      } else {
        await autoDemo();
      }
      setLoading(false);
    }

    async function autoDemo() {
      try {
        const res = await api.demoLogin();
        localStorage.setItem('insight_ai_token', res.access_token);
        setUser(res.user);
        setToken(res.access_token);
      } catch (err) {
        console.warn('Auto demo login warning:', err);
      }
    }

    loadUser();
  }, []);

  const login = async (u: string, p: string) => {
    const res = await api.login(u, p);
    localStorage.setItem('insight_ai_token', res.access_token);
    setUser(res.user);
    setToken(res.access_token);
  };

  const register = async (e: string, u: string, p: string, name?: string) => {
    const res = await api.register(e, u, p, name);
    localStorage.setItem('insight_ai_token', res.access_token);
    setUser(res.user);
    setToken(res.access_token);
  };

  const demoLogin = async () => {
    const res = await api.demoLogin();
    localStorage.setItem('insight_ai_token', res.access_token);
    setUser(res.user);
    setToken(res.access_token);
  };

  const logout = () => {
    localStorage.removeItem('insight_ai_token');
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, demoLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

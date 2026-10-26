import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Tenant } from '../types';
import { api, getStoredToken, setStoredToken } from '../api/client';

interface AuthContextType {
  user: User | null;
  tenant: Tenant | null;
  loading: boolean;
  error: string | null;
  login: (identifier: string, pass: string) => Promise<{ success: boolean; message?: string }>;
  register: (data: any) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  quickSwitchPersona: (username: string) => Promise<{ success: boolean; message?: string }>;
  refreshProfile: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  // Initialize session on mount
  useEffect(() => {
    async function initAuth() {
      const token = getStoredToken();
      if (!token) {
        setUser(null);
        setTenant(null);
        setLoading(false);
        return;
      }

      try {
        const res = await api.getMe();
        setUser(res.user);
        setTenant(res.tenant);
      } catch (err: any) {
        console.warn('Stored token invalid or expired, resetting session');
        setStoredToken(null);
        setUser(null);
        setTenant(null);
      } finally {
        setLoading(false);
      }
    }

    initAuth();
  }, []);

  // Listen for session expiry / invalidation to cleanly reset session
  useEffect(() => {
    const handleUnauthorized = () => {
      console.warn('Session expired or invalidated. Clearing user session.');
      setStoredToken(null);
      setUser(null);
      setTenant(null);
    };

    window.addEventListener('trizen:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('trizen:unauthorized', handleUnauthorized);
  }, []);

  const login = async (identifier: string, pass: string) => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.login(identifier, pass);
      setUser(res.user);
      setTenant(res.tenant);
      return { success: true };
    } catch (err: any) {
      const msg = err.data?.message || err.message || 'Login failed';
      setError(msg);
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  };

  const register = async (data: any) => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.register(data);
      return { success: true, message: res.message };
    } catch (err: any) {
      const msg = err.data?.message || err.message || 'Registration failed';
      setError(msg);
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await api.logout();
    } catch (e) {
      console.error('Logout error', e);
    } finally {
      setUser(null);
      setTenant(null);
      setLoading(false);
    }
  };

  const quickSwitchPersona = async (username: string) => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.quickSwitch(username);
      setUser(res.user);
      setTenant(res.tenant);
      return { success: true };
    } catch (err: any) {
      const msg = err.data?.message || err.message || 'Persona switch failed';
      setError(msg);
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    try {
      const res = await api.getMe();
      setUser(res.user);
      setTenant(res.tenant);
    } catch (e) {
      console.error('Failed to refresh profile', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        tenant,
        loading,
        error,
        login,
        register,
        logout,
        quickSwitchPersona,
        refreshProfile,
        clearError
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

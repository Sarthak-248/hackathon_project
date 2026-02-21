import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [caregiverVerified, setCaregiverVerified] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.getMe()
        .then(data => setUser(data.user))
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // Auto-expire caregiver verification after 5 min
  useEffect(() => {
    if (caregiverVerified) {
      const timer = setTimeout(() => {
        setCaregiverVerified(false);
        localStorage.removeItem('caregiverToken');
      }, 5 * 60 * 1000);
      return () => clearTimeout(timer);
    }
  }, [caregiverVerified]);

  const login = async (email, password) => {
    const data = await api.login({ email, password });
    localStorage.setItem('token', data.token);
    setUser(data.user);
    return data;
  };

  const register = async (formData) => {
    const data = await api.register(formData);
    localStorage.setItem('token', data.token);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('caregiverToken');
    setUser(null);
    setCaregiverVerified(false);
  };

  const verifyPIN = async (pin) => {
    const data = await api.verifyPIN(pin);
    if (data.verified) {
      localStorage.setItem('caregiverToken', data.caregiverToken);
      setCaregiverVerified(true);
    }
    return data;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, verifyPIN, caregiverVerified }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

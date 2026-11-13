import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { authService } from '../services/authService';
import { getApiErrorMessage } from '../services/apiClient';
import { mapBackendUserToFrontend } from '../utils/mappers';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  updateCurrentUserProfile: (updates: Partial<User>) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('issueflow_auth_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Restore authenticated session on mount from FastAPI backend
  const refreshUser = async () => {
    const token = localStorage.getItem('issueflow_token');
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const backendUser = await authService.getCurrentUser();
      const mappedUser = mapBackendUserToFrontend(backendUser);
      setUser(mappedUser);
      localStorage.setItem('issueflow_auth_user', JSON.stringify(mappedUser));
    } catch {
      // Token is expired or invalid
      localStorage.removeItem('issueflow_token');
      localStorage.removeItem('issueflow_auth_user');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();

    // Listen to 401 events dispatched from apiClient
    const handleLogoutEvent = () => {
      setUser(null);
    };

    window.addEventListener('issueflow_auth_logout', handleLogoutEvent);
    return () => {
      window.removeEventListener('issueflow_auth_logout', handleLogoutEvent);
    };
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await authService.login(email.trim(), password);
      localStorage.setItem('issueflow_token', res.access_token);
      const mappedUser = mapBackendUserToFrontend(res.user);
      setUser(mappedUser);
      localStorage.setItem('issueflow_auth_user', JSON.stringify(mappedUser));
      return { success: true };
    } catch (err) {
      return {
        success: false,
        message: getApiErrorMessage(err, 'Invalid email or password. Please try again.'),
      };
    }
  };

  const register = async (name: string, email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await authService.register(name.trim(), email.trim(), password);
      localStorage.setItem('issueflow_token', res.access_token);
      const mappedUser = mapBackendUserToFrontend(res.user);
      setUser(mappedUser);
      localStorage.setItem('issueflow_auth_user', JSON.stringify(mappedUser));
      return { success: true };
    } catch (err) {
      return {
        success: false,
        message: getApiErrorMessage(err, 'Registration failed. An account with this email may already exist.'),
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('issueflow_token');
    localStorage.removeItem('issueflow_auth_user');
    setUser(null);
  };

  const updateCurrentUserProfile = (updates: Partial<User>) => {
    if (!user) return;
    const updated = { ...user, ...updates };
    setUser(updated);
    localStorage.setItem('issueflow_auth_user', JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        updateCurrentUserProfile,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

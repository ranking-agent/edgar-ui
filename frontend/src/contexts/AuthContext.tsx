import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI } from '../utils/api';

// interface AuthContextType {
//   isAuthenticated: boolean;
//   login: (username: string, password: string) => Promise<void>;
//   logout: () => Promise<void>;
//   loading: boolean;
// }
interface AuthContextType {
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  continueAsGuest: () => void;  // Add this
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user has token on mount
    const token = localStorage.getItem('auth_token');
    if (token) {
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const continueAsGuest = () => {
    localStorage.setItem('auth_token', 'guest');
    setIsAuthenticated(true);
  };

  const login = async (username: string, password: string) => {
    try {
      const data = await authAPI.login(username, password);
      localStorage.setItem('auth_token', data.access_token);
      setIsAuthenticated(true);
    } catch (error) {
      throw new Error('Invalid credentials');
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('auth_token');
      setIsAuthenticated(false);
    }
  };
  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, continueAsGuest, loading }}>
      {children}
    </AuthContext.Provider>
  );
  // return (
  //   <AuthContext.Provider value={{ isAuthenticated, login, logout, loading }}>
  //     {children}
  //   </AuthContext.Provider>
  // );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

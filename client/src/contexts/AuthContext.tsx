import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { apiClient } from '@/lib/api';
import { isWebAuthnSupported } from '@/lib/utils';
import toast from 'react-hot-toast';

export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  hasAuthenticators: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export interface Device {
  id: string;
  counter: number;
  transports?: string[];
  createdAt: string;
}

export interface Session {
  id: string;
  ipAddress?: string;
  userAgent?: string;
  lastActivity: string;
  createdAt: string;
  isCurrent: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  webAuthnSupported: boolean;
  login: (email: string) => Promise<boolean>;
  register: (email: string, username: string, displayName: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  devices: Device[];
  sessions: Session[];
  loadDevices: () => Promise<void>;
  loadSessions: () => Promise<void>;
  removeDevice: (credentialId: string) => Promise<void>;
  revokeSession: (sessionId: string) => Promise<void>;
  revokeAllOtherSessions: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [devices, setDevices] = useState<Device[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [webAuthnSupported] = useState(isWebAuthnSupported());

  const isAuthenticated = !!user;

  // Define memoized functions first to avoid hoisting issues
  const loadDevices = useCallback(async (): Promise<void> => {
    try {
      const response = await apiClient.getUserDevices();
      if (response.success) {
        setDevices(response.data);
      }
    } catch (error) {
      console.error('Failed to load devices:', error);
    }
  }, []);

  const loadSessions = useCallback(async (): Promise<void> => {
    try {
      const response = await apiClient.getUserSessions();
      if (response.success) {
        setSessions(response.data);
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  }, []);

  // Check if user is already authenticated on app load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (token) {
          const response = await apiClient.getCurrentUser();
          if (response.success) {
            setUser(response.data);
            await loadDevices();
            await loadSessions();
          } else {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user');
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [loadDevices, loadSessions]);

  const login = async (email: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      // Start WebAuthn authentication
      const startResponse = await apiClient.startLogin(email);
      if (!startResponse.success) {
        throw new Error(startResponse.message || 'Failed to start login');
      }

      // Get WebAuthn credentials
      const { startAuthentication } = await import('@simplewebauthn/browser');
      const authenticationResponse = await startAuthentication(startResponse.data);

      // Complete authentication
      const finishResponse = await apiClient.finishLogin(authenticationResponse);
      if (!finishResponse.success) {
        throw new Error(finishResponse.message || 'Authentication failed');
      }

      // Store token and user data
      localStorage.setItem('auth_token', finishResponse.data.token);
      localStorage.setItem('user', JSON.stringify(finishResponse.data.user));
      setUser(finishResponse.data.user);

      toast.success('Login successful!');
      return true;
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.message || 'Login failed');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, username: string, displayName: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      // Start WebAuthn registration
      const startResponse = await apiClient.startRegistration(email, username, displayName);
      if (!startResponse.success) {
        throw new Error(startResponse.message || 'Failed to start registration');
      }

      // Get WebAuthn credentials
      const { startRegistration } = await import('@simplewebauthn/browser');
      const registrationResponse = await startRegistration(startResponse.data);

      // Complete registration
      const finishResponse = await apiClient.finishRegistration(registrationResponse);
      if (!finishResponse.success) {
        throw new Error(finishResponse.message || 'Registration failed');
      }

      // Store token and user data
      localStorage.setItem('auth_token', finishResponse.data.token);
      localStorage.setItem('user', JSON.stringify(finishResponse.data.user));
      setUser(finishResponse.data.user);

      toast.success('Registration successful!');
      return true;
    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error(error.message || 'Registration failed');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await apiClient.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      setUser(null);
      setDevices([]);
      setSessions([]);
      toast.success('Logged out successfully');
    }
  };

  const refreshUser = async (): Promise<void> => {
    try {
      const response = await apiClient.getCurrentUser();
      if (response.success) {
        setUser(response.data);
        localStorage.setItem('user', JSON.stringify(response.data));
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  const removeDevice = async (credentialId: string): Promise<void> => {
    try {
      const response = await apiClient.removeDevice(credentialId);
      if (response.success) {
        setDevices(devices.filter(device => device.id !== credentialId));
        toast.success('Device removed successfully');
      } else {
        throw new Error(response.message || 'Failed to remove device');
      }
    } catch (error: any) {
      console.error('Failed to remove device:', error);
      toast.error(error.message || 'Failed to remove device');
    }
  };

  const revokeSession = async (sessionId: string): Promise<void> => {
    try {
      const response = await apiClient.revokeSession(sessionId);
      if (response.success) {
        setSessions(sessions.filter(session => session.id !== sessionId));
        toast.success('Session revoked successfully');
      } else {
        throw new Error(response.message || 'Failed to revoke session');
      }
    } catch (error: any) {
      console.error('Failed to revoke session:', error);
      toast.error(error.message || 'Failed to revoke session');
    }
  };

  const revokeAllOtherSessions = async (): Promise<void> => {
    try {
      const response = await apiClient.revokeAllOtherSessions();
      if (response.success) {
        setSessions(sessions.filter(session => session.isCurrent));
        toast.success(response.message || 'All other sessions revoked');
      } else {
        throw new Error(response.message || 'Failed to revoke sessions');
      }
    } catch (error: any) {
      console.error('Failed to revoke sessions:', error);
      toast.error(error.message || 'Failed to revoke sessions');
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    webAuthnSupported,
    login,
    register,
    logout,
    refreshUser,
    devices,
    sessions,
    loadDevices,
    loadSessions,
    removeDevice,
    revokeSession,
    revokeAllOtherSessions,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

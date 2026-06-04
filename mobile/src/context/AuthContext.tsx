import React, { createContext, useContext, useState, useEffect } from 'react';
import { DeviceEventEmitter } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Sentry from '@sentry/react-native';
import client from '@/src/api/client';
import { logger } from '@/src/utils/logger';

interface User {
  id: number;
  email: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: (idToken: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();

    // Listen for unauthorized API requests globally
    const subscription = DeviceEventEmitter.addListener('auth.unauthorized', () => {
      logger.warn('auth.unauthorized event received, signing out...');
      signOut();
    });

    return () => {
      subscription.remove();
    };
  }, []);

  async function loadStoredAuth() {
    try {
      const storedToken = await SecureStore.getItemAsync('user_token');
      const storedUser = await SecureStore.getItemAsync('user_data');
      
      if (storedToken && storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(parsedUser);
        Sentry.setUser({ id: String(parsedUser.id), email: parsedUser.email });
      }
    } catch (e) {
      logger.error('Error loading stored auth', { error: e });
      Sentry.captureException(e, { extra: { context: 'loadStoredAuth' } });
    } finally {
      setIsLoading(false);
    }
  }

  async function signIn(email: string, password: string) {
    const response = await client.post('/api/auth/login', { email, password });
    const { user, token } = response.data;
    
    await SecureStore.setItemAsync('user_token', token);
    await SecureStore.setItemAsync('user_data', JSON.stringify(user));
    
    setToken(token);
    setUser(user);
    Sentry.setUser({ id: String(user.id), email: user.email });
  }

  async function signUp(email: string, password: string) {
    const response = await client.post('/api/auth/register', { email, password });
    const { user, token } = response.data;
    
    await SecureStore.setItemAsync('user_token', token);
    await SecureStore.setItemAsync('user_data', JSON.stringify(user));
    
    setToken(token);
    setUser(user);
    Sentry.setUser({ id: String(user.id), email: user.email });
  }

  async function signInWithGoogle(idToken: string) {
    const response = await client.post('/api/auth/google', { idToken });
    const { user, token } = response.data;
    
    await SecureStore.setItemAsync('user_token', token);
    await SecureStore.setItemAsync('user_data', JSON.stringify(user));
    
    setToken(token);
    setUser(user);
    Sentry.setUser({ id: String(user.id), email: user.email });
  }

  async function signOut() {
    await SecureStore.deleteItemAsync('user_token');
    await SecureStore.deleteItemAsync('user_data');
    setToken(null);
    setUser(null);
    Sentry.setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, signIn, signUp, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

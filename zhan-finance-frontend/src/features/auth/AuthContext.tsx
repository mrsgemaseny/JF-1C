import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { configureAuth, setAccessToken } from '@/shared/api/http';
import * as authApi from './authApi';
import type { AuthResponse, UserRole } from './authApi';

import { AUTH_STORAGE_KEY } from '@/shared/constants/storageKeys';
import { queryClient } from '@/shared/lib/queryClient';

const STORAGE_KEY = AUTH_STORAGE_KEY;

export interface StoredAuth {
  userId: number;
  email: string;
  fullName: string;
  role: UserRole;
  isNewUser?: boolean;
  avatarUrl?: string;
  authProvider?: 'LOCAL' | 'GOOGLE';
  twoFactorEnabled?: boolean;
}

export interface AuthContextValue {
  user: StoredAuth | null;
  setUser: (user: StoredAuth | null) => void;
  updateUser: (fields: Partial<StoredAuth>) => void;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ requires2FA?: boolean; requires2FASetup?: boolean; requiresEmailOtp?: boolean; preAuthToken?: string; devOtpCode?: string } | void>;
  completeAuth: (response: authApi.AuthResponse) => void;
  loginWithGoogle: (credential: string, role?: 'CLIENT' | 'EMPLOYEE') => Promise<{ requires2FA?: boolean; requires2FASetup?: boolean; preAuthToken?: string; isPendingApproval?: boolean; isNewUser?: boolean }>;
  register: (req: authApi.RegisterRequest) => Promise<{ isPendingApproval: boolean; requiresEmailOtp?: boolean; preAuthToken?: string; devOtpCode?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function toStoredAuth(response: AuthResponse): StoredAuth {
  if (response.accessToken) {
    setAccessToken(response.accessToken);
  }
  return {
    userId: response.id || 0,
    email: response.email || '',
    fullName: response.fullName || '',
    role: response.role || 'CLIENT',
    isNewUser: response.isNewUser || false,
    avatarUrl: response.avatarUrl,
    authProvider: response.authProvider,
    twoFactorEnabled: response.twoFactorEnabled ?? false,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StoredAuth | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const refresh = async () => {
      try {
        const response = await authApi.refresh();
        const next = toStoredAuth(response);
        setUser(next);
        return true;
      } catch {
        setUser(null);
        queryClient.clear();
        localStorage.removeItem(AUTH_STORAGE_KEY);
        return false;
      }
    };
    configureAuth(refresh);
  }, []);

  useEffect(() => {
    authApi.getMe()
        .then(response => {
          setUser(toStoredAuth(response));
        })
        .catch(() => {
          setUser(null);
        })
        .finally(() => {
          setIsLoading(false);
        });
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    setUser,
    updateUser(fields) {
      setUser(prev => prev ? { ...prev, ...fields } : null);
    },
    isLoading,
    async login(email, password) {
      try {
        const response = await authApi.login({ email, password });
        if (response.requiresEmailOtp && response.preAuthToken) {
          return { requiresEmailOtp: true, preAuthToken: response.preAuthToken, devOtpCode: response.devOtpCode };
        }
        if (response.requires2FA && response.preAuthToken) {
          return {
            requires2FA: true,
            requires2FASetup: response.twoFactorEnabled === false,
            preAuthToken: response.preAuthToken
          };
        }
        setUser(toStoredAuth(response));
      } finally {
        // removed setIsLoading
      }
    },
    completeAuth(response) {
      setUser(toStoredAuth(response));
    },
    async register(req) {
      try {
        const response = await authApi.register(req);
        if (response && response.requiresEmailOtp && response.preAuthToken) {
          return { isPendingApproval: false, requiresEmailOtp: true, preAuthToken: response.preAuthToken, devOtpCode: response.devOtpCode };
        }
        if (response && response.isPendingApproval) {
          return { isPendingApproval: true };
        } else if (response) {
          setUser(toStoredAuth(response));
          return { isPendingApproval: false };
        } else {
          return { isPendingApproval: true };
        }
      } finally {
        // removed setIsLoading
      }
    },
    async loginWithGoogle(credential, role) {
      try {
        const response = await authApi.loginWithGoogle(credential, role);
        if (response) {
          if (response.requires2FA && response.preAuthToken) {
            return {
              requires2FA: true,
              requires2FASetup: response.twoFactorEnabled === false,
              preAuthToken: response.preAuthToken
            };
          }
          if (response.isPendingApproval) {
            return { isPendingApproval: true, isNewUser: !!response.isNewUser };
          }
          setUser(toStoredAuth(response));
          return { isPendingApproval: false, isNewUser: !!response.isNewUser };
        } else {
          return { isPendingApproval: true, isNewUser: false };
        }
      } finally {
        // removed setIsLoading
      }
    },
    async logout() {
      try {
        await authApi.logoutUser();
      } catch {
        // ignore
      } finally {
        setAccessToken(null);
        setUser(null);
        queryClient.clear();
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    }
  }), [user, isLoading]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useOptionalAuth(): AuthContextValue | null {
  return useContext(AuthContext);
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
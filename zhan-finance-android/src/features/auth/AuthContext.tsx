import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import {
  executeTokenRefreshSingleFlight,
  onSessionTerminated,
  setAccessToken,
} from '@/shared/api/http';
import { secureAuthStorage } from '@/shared/storage/secureStore';
import { queryClient } from '@/shared/api/queryClient';
import { stompManager } from '@/shared/api/stompClient';
import { authMobileApi, type AuthResponse, type UserRole } from './authApi';

export interface MobileUser {
  userId: number;
  email: string;
  fullName: string;
  role: UserRole;
  avatarUrl?: string;
  twoFactorEnabled: boolean;
}

export interface PendingVerificationState {
  type: '2FA' | 'EMAIL_OTP';
  preAuthToken: string;
  email: string;
}

interface AuthContextValue {
  user: MobileUser | null;
  isHydrating: boolean;
  isBiometricLocked: boolean;
  pendingVerification: PendingVerificationState | null;
  signIn: (email: string, password: string) => Promise<void>;
  verifySecondFactor: (code: string) => Promise<void>;
  unlockBiometrics: () => Promise<boolean>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function mapResponseToUser(res: AuthResponse): MobileUser {
  return {
    userId: res.id ?? 0,
    email: res.email ?? '',
    fullName: res.fullName ?? '',
    role: res.role ?? 'CLIENT',
    avatarUrl: res.avatarUrl,
    twoFactorEnabled: Boolean(res.twoFactorEnabled),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MobileUser | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);
  const [isBiometricLocked, setIsBiometricLocked] = useState(false);
  const [pendingVerification, setPendingVerification] =
    useState<PendingVerificationState | null>(null);

  useEffect(() => {
    onSessionTerminated(() => {
      stompManager.stop();
      setUser(null);
      queryClient.clear();
    });

    const bootstrapSession = async () => {
      try {
        // 1. Instant offline hydration from hardware keystore
        const [cachedJson, refreshToken, bioEnabled] = await Promise.all([
          secureAuthStorage.getCachedUserJson(),
          secureAuthStorage.getRefreshToken(),
          secureAuthStorage.isBiometricEnabled(),
        ]);

        if (cachedJson && refreshToken) {
          const restored = JSON.parse(cachedJson) as MobileUser;
          setUser(restored);
          if (bioEnabled) {
            setIsBiometricLocked(true);
          }
        }

        if (!refreshToken) {
          setIsHydrating(false);
          return;
        }

        // 2. Silent background token rotation & profile verification
        const refreshStatus = await executeTokenRefreshSingleFlight();
        if (refreshStatus === 'REFRESHED') {
          const freshProfile = await authMobileApi.getMe();
          const mapped = mapResponseToUser(freshProfile);
          setUser(mapped);
          await secureAuthStorage.setCachedUserJson(JSON.stringify(mapped));
          stompManager.start(mapped.userId);
        }
      } catch {
        // Offline or transient error: keep cached user active!
      } finally {
        setIsHydrating(false);
      }
    };

    void bootstrapSession();

    return () => {
      stompManager.stop();
    };
  }, []);

  const persistAuthenticatedSession = async (res: AuthResponse) => {
    if (res.accessToken) {
      setAccessToken(res.accessToken);
    }
    if (res.refreshToken) {
      await secureAuthStorage.setRefreshToken(res.refreshToken);
    }
    const mapped = mapResponseToUser(res);
    await secureAuthStorage.setCachedUserJson(JSON.stringify(mapped));
    setPendingVerification(null);
    setUser(mapped);
    stompManager.start(mapped.userId);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isHydrating,
      isBiometricLocked,
      pendingVerification,

      async signIn(email: string, password: string) {
        const res = await authMobileApi.login(email.trim(), password);
        if (res.requiresEmailOtp && res.preAuthToken) {
          setPendingVerification({
            type: 'EMAIL_OTP',
            preAuthToken: res.preAuthToken,
            email: email.trim(),
          });
          return;
        }
        if (res.requires2FA && res.preAuthToken) {
          setPendingVerification({
            type: '2FA',
            preAuthToken: res.preAuthToken,
            email: email.trim(),
          });
          return;
        }
        await persistAuthenticatedSession(res);
      },

      async verifySecondFactor(code: string) {
        if (!pendingVerification) return;
        const cleanCode = code.trim();
        const res =
          pendingVerification.type === '2FA'
            ? await authMobileApi.verify2FA(
                pendingVerification.preAuthToken,
                cleanCode
              )
            : await authMobileApi.confirmEmailOtp(
                pendingVerification.preAuthToken,
                cleanCode
              );
        await persistAuthenticatedSession(res);
      },

      async unlockBiometrics(): Promise<boolean> {
        try {
          const hasHardware = await LocalAuthentication.hasHardwareAsync();
          const isEnrolled = await LocalAuthentication.isEnrolledAsync();
          if (!hasHardware || !isEnrolled) {
            setIsBiometricLocked(false);
            return true;
          }
          const result = await LocalAuthentication.authenticateAsync({
            promptMessage: 'ZHAN FINANCE',
            disableDeviceFallback: false,
          });
          if (result.success) {
            setIsBiometricLocked(false);
            return true;
          }
          return false;
        } catch {
          setIsBiometricLocked(false);
          return true;
        }
      },

      async signOut() {
        stompManager.stop();
        const [refreshToken, deviceId] = await Promise.all([
          secureAuthStorage.getRefreshToken(),
          secureAuthStorage.getOrCreateDeviceId(),
        ]);

        try {
          await authMobileApi.unregisterPushDevice(deviceId);
        } catch {
          // Ignore network error on logout
        }

        try {
          await authMobileApi.logout(refreshToken);
        } catch {
          // Ignore network error on logout
        }

        setAccessToken(null);
        await secureAuthStorage.clearSession();
        queryClient.clear();
        setUser(null);
        setPendingVerification(null);
      },
    }),
    [user, isHydrating, isBiometricLocked, pendingVerification]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useMobileAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useMobileAuth must be used inside AuthProvider');
  }
  return ctx;
}

import { apiRequest } from '@/shared/api/http';

export type UserRole =
  | 'ADMIN'
  | 'EMPLOYEE'
  | 'CLIENT'
  | 'LEARNER'
  | 'CURATOR'
  | 'ADVISOR';

export interface AuthResponse {
  accessToken?: string;
  refreshToken?: string;
  id?: number;
  email?: string;
  fullName?: string;
  role?: UserRole;
  avatarUrl?: string;
  locale?: string;
  requires2FA?: boolean;
  preAuthToken?: string;
  twoFactorEnabled?: boolean;
  requiresEmailOtp?: boolean;
  isPendingApproval?: boolean;
}

export const authMobileApi = {
  login(email: string, password: string): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  verify2FA(preAuthToken: string, code: string): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/api/v1/auth/2fa/verify', {
      method: 'POST',
      body: JSON.stringify({ preAuthToken, code }),
    });
  },

  confirmEmailOtp(preAuthToken: string, otpCode: string): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/api/v1/auth/confirm-email-otp', {
      method: 'POST',
      body: JSON.stringify({ preAuthToken, otpCode }),
    });
  },

  getMe(): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/api/v1/auth/me', {
      method: 'GET',
    });
  },

  logout(refreshToken: string | null): Promise<void> {
    return apiRequest<void>('/api/v1/auth/logout', {
      method: 'POST',
      body: refreshToken ? JSON.stringify({ refreshToken }) : undefined,
      skipAuthRefresh: true,
    });
  },

  registerPushDevice(payload: {
    deviceId: string;
    pushToken: string;
    platform: string;
    deviceName?: string;
  }): Promise<void> {
    return apiRequest<void>('/api/v1/notifications/devices', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  unregisterPushDevice(deviceId: string): Promise<void> {
    return apiRequest<void>(
      `/api/v1/notifications/devices/${encodeURIComponent(deviceId)}`,
      {
        method: 'DELETE',
        skipAuthRefresh: true,
      }
    );
  },
};

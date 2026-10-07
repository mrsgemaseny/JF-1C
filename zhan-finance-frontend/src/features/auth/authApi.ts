import { apiRequest, API_BASE_URL } from '@/shared/api/http';

export type UserRole = 'ADMIN' | 'EMPLOYEE' | 'CLIENT' | 'LEARNER' | 'CURATOR' | 'ADVISOR';

export interface AuthResponse {
  accessToken?: string;
  refreshToken?: string;
  tokenType?: string;
  id?: number;
  email?: string;
  fullName?: string;
  role?: UserRole;
  isNewUser?: boolean;
  avatarUrl?: string;
  authProvider?: 'LOCAL' | 'GOOGLE';
  requires2FA?: boolean;
  preAuthToken?: string;
  twoFactorEnabled?: boolean;
  isPendingApproval?: boolean;
  requiresEmailOtp?: boolean;
  googleLinked?: boolean;
  googleEmail?: string;
  devOtpCode?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
  role: 'CLIENT' | 'EMPLOYEE';
  phone?: string;
  companyName?: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface GoogleLoginRequest {
  credential: string;
}

export interface CheckEmailResponse {
  exists: boolean;
  provider: 'LOCAL' | 'GOOGLE' | null;
}

export function login(request: LoginRequest): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify(request)
  });
}

export function register(request: RegisterRequest): Promise<AuthResponse | null> {
  return apiRequest<AuthResponse | null>('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify(request)
  });
}

export async function refresh(request?: RefreshRequest): Promise<AuthResponse> {
  const url = `${API_BASE_URL}/api/v1/auth/refresh`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: request ? JSON.stringify(request) : undefined,
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error('Refresh failed');
  }
  
  const json = await response.json();
  if (json.success === false) {
    throw new Error(json.message || 'Refresh failed');
  }
  
  return json.data as AuthResponse;
}

export function getMe(): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/api/v1/auth/me', {
    method: 'GET'
  });
}

export function logoutUser(): Promise<void> {
  return apiRequest<void>('/api/v1/auth/logout', {
    method: 'POST'
  });
}

export async function loginWithGoogle(credential: string, role?: 'CLIENT' | 'EMPLOYEE'): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/api/v1/auth/google', {
    method: 'POST',
    body: JSON.stringify({ credential, role })
  });
}

export function checkEmail(email: string): Promise<CheckEmailResponse> {
  return apiRequest<CheckEmailResponse>('/api/v1/auth/check-email', {
    method: 'POST',
    body: JSON.stringify({ email })
  });
}

export interface TwoFactorVerifyRequest {
  preAuthToken: string;
  code: string;
}

export interface TwoFactorSetupResponse {
  secret: string;
  qrCodeImage: string;
  uri: string;
}

export function verify2FA(request: TwoFactorVerifyRequest): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/api/v1/auth/2fa/verify', {
    method: 'POST',
    body: JSON.stringify(request)
  });
}

export function get2FASetup(): Promise<TwoFactorSetupResponse> {
  return apiRequest<TwoFactorSetupResponse>('/api/v1/auth/2fa/setup', {
    method: 'GET'
  });
}

export function confirm2FASetup(secret: string, code: string): Promise<void> {
  return apiRequest<void>('/api/v1/auth/2fa/setup/confirm', {
    method: 'POST',
    body: JSON.stringify({ secret, code })
  });
}

export function get2FASetupPreAuth(preAuthToken: string): Promise<TwoFactorSetupResponse> {
  return apiRequest<TwoFactorSetupResponse>(
    `/api/v1/auth/2fa/setup-preauth?preAuthToken=${encodeURIComponent(preAuthToken)}`,
    { method: 'GET' }
  );
}

export function confirm2FASetupPreAuth(preAuthToken: string, secret: string, code: string): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/api/v1/auth/2fa/setup-preauth/confirm', {
    method: 'POST',
    body: JSON.stringify({ preAuthToken, secret, code })
  });
}

export function disable2FA(code: string): Promise<void> {
  return apiRequest<void>('/api/v1/auth/2fa/disable', {
    method: 'POST',
    body: JSON.stringify({ code })
  });
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export function forgotPassword(email: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>('/api/v1/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email })
  });
}

export function resetPassword(request: ResetPasswordRequest): Promise<{ message: string }> {
  return apiRequest<{ message: string }>('/api/v1/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(request)
  });
}

export function confirmEmailOtp(preAuthToken: string, otpCode: string): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/api/v1/auth/confirm-email-otp', {
    method: 'POST',
    body: JSON.stringify({ preAuthToken, otpCode })
  });
}

export function resendEmailOtp(preAuthToken: string): Promise<void> {
  return apiRequest<void>('/api/v1/auth/resend-email-otp', {
    method: 'POST',
    body: JSON.stringify({ preAuthToken })
  });
}

export function linkGoogle(credential: string): Promise<void> {
  return apiRequest<void>('/api/v1/auth/google/link', {
    method: 'POST',
    body: JSON.stringify({ credential })
  });
}

export function unlinkGoogle(): Promise<void> {
  return apiRequest<void>('/api/v1/auth/google/unlink', {
    method: 'POST'
  });
}


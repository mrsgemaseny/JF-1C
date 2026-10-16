import i18n from '@/shared/i18n/i18n';
import { AUTH_STORAGE_KEY } from '@/shared/constants/storageKeys';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://zhanfinance.fly.dev';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message: string | null;
  timestamp: string;
}

export interface ApiErrorDetail {
  field: string;
  error: string;
}

import { toast } from '@/shared/ui/Toast/ToastContext';

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: ApiErrorDetail[];
  requestId?: string;

  constructor(message: string, status: number, code?: string, details?: ApiErrorDetail[], requestId?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }
}

let memoryAccessToken: string | null = null;

export function setAccessToken(token: string | null) {
  memoryAccessToken = token;
}

export function getAccessToken(): string | null {
  return memoryAccessToken;
}

type RefreshHandler = () => Promise<boolean>;

let onUnauthorized: RefreshHandler = async () => false;

export function configureAuth(refreshHandler: RefreshHandler) {
  onUnauthorized = refreshHandler;
}

async function rawRequest<T>(path: string, init: RequestInit | undefined): Promise<T> {
  const isFormData = init?.body instanceof FormData;
  const headers: Record<string, string> = {
    'X-Requested-With': 'XMLHttpRequest',
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    'Accept-Language': i18n.language ?? 'ru',
    ...(init?.headers as Record<string, string> | undefined)
  };

  if (memoryAccessToken) {
    headers['Authorization'] = `Bearer ${memoryAccessToken}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
      credentials: 'include'
    });
  } catch (err) {
    toast.error(i18n.t('common.connectionFailed', { defaultValue: 'Ошибка соединения. Проверьте подключение к интернету.' }), { duration: 5000 });
    throw new ApiError('Connection failed', 0);
  }

  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;
    let code: string | undefined;
    let details: ApiErrorDetail[] | undefined;
    let requestId: string | undefined;

    try {
      const body = await response.json();
      if (body && body.message) errorMessage = body.message;
      if (body && body.code) code = body.code;
      if (body && Array.isArray(body.details)) details = body.details;
      if (body && body.requestId) requestId = body.requestId;
    } catch (_) {}

    if (response.status === 403) {
      toast.error(i18n.t('common.accessDenied', { defaultValue: 'У вас нет доступа к этому ресурсу.' }), { duration: 5000 });
    } else if (response.status === 422) {
      toast.warning(errorMessage, { duration: 5000 });
    } else if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const msg = retryAfter
          ? i18n.t('common.rateLimitRetryAfter', { seconds: retryAfter, defaultValue: `Превышен лимит запросов. Повторите попытку через ${retryAfter} сек.` })
          : i18n.t('common.rateLimitExceeded', { defaultValue: 'Превышен лимит запросов. Пожалуйста, подождите.' });
      toast.error(msg, { duration: 5000 });
    } else if (response.status !== 401) {
      toast.error(errorMessage, { duration: 6000 });
    }

    throw new ApiError(errorMessage, response.status, code, details, requestId);
  }

  const body = (await response.json()) as ApiEnvelope<T>;

  if (!body.success) {
    throw new ApiError(body.message ?? 'Request failed', response.status);
  }

  return body.data;
}

let refreshPromise: Promise<boolean> | null = null;

const AUTH_ROUTES = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/google', '/auth/me'];

function isAuthRoute(path: string): boolean {
  return AUTH_ROUTES.some(r => path.includes(r));
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    return await rawRequest<T>(path, init);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401 && !isAuthRoute(path)) {
      if (!refreshPromise) {
        refreshPromise = onUnauthorized().finally(() => {
          refreshPromise = null;
        });
      }
      const refreshResult = await refreshPromise;
      if (refreshResult) {
        return await rawRequest<T>(path, init);
      } else {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        setAccessToken(null);
        throw error;
      }
    }
    throw error;
  }
}

async function rawDownload(path: string, init: RequestInit | undefined): Promise<Blob> {
  const headers: Record<string, string> = {
    'X-Requested-With': 'XMLHttpRequest',
    'Accept-Language': i18n.language ?? 'ru',
    ...(init?.headers as Record<string, string> | undefined)
  };

  if (memoryAccessToken) {
    headers['Authorization'] = `Bearer ${memoryAccessToken}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
      credentials: 'include'
    });
  } catch (err) {
    toast.error(i18n.t('common.connectionFailed', { defaultValue: 'Ошибка соединения. Проверьте подключение к интернету.' }), { duration: 5000 });
    throw new ApiError('Connection failed', 0);
  }

  if (!response.ok) {
    let errorMessage = `Download failed with status ${response.status}`;
    let code: string | undefined;
    let details: ApiErrorDetail[] | undefined;
    let requestId: string | undefined;

    try {
      const text = await response.text();
      const body = JSON.parse(text);
      if (body && body.message) errorMessage = body.message;
      if (body && body.code) code = body.code;
      if (body && Array.isArray(body.details)) details = body.details;
      if (body && body.requestId) requestId = body.requestId;
    } catch (_) {}

    if (response.status === 403) {
      toast.error(i18n.t('common.accessDenied', { defaultValue: 'У вас нет доступа к этому ресурсу.' }), { duration: 5000 });
    } else if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const msg = retryAfter
          ? i18n.t('common.rateLimitRetryAfter', { seconds: retryAfter, defaultValue: `Превышен лимит запросов. Повторите попытку через ${retryAfter} сек.` })
          : i18n.t('common.rateLimitExceeded', { defaultValue: 'Превышен лимит запросов. Пожалуйста, подождите.' });
      toast.error(msg, { duration: 5000 });
    } else if (response.status !== 401) {
      toast.error(errorMessage, { duration: 6000 });
    }

    throw new ApiError(errorMessage, response.status, code, details, requestId);
  }

  return response.blob();
}

export async function apiDownload(path: string, init?: RequestInit): Promise<Blob> {
  try {
    return await rawDownload(path, init);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401 && !isAuthRoute(path)) {
      if (!refreshPromise) {
        refreshPromise = onUnauthorized().finally(() => {
          refreshPromise = null;
        });
      }
      const refreshResult = await refreshPromise;
      if (refreshResult) {
        return await rawDownload(path, init);
      } else {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        setAccessToken(null);
        throw error;
      }
    }
    throw error;
  }
}

export function extractValidationErrors(error: unknown): Record<string, string> {
  if (error instanceof ApiError && error.code === 'VALIDATION_ERROR' && error.details) {
    return error.details.reduce((acc, detail) => {
      if (acc[detail.field]) {
        acc[detail.field] += `, ${detail.error}`;
      } else {
        acc[detail.field] = detail.error;
      }
      return acc;
    }, {} as Record<string, string>);
  }
  return {};
}

export function getSecureImageUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http')) return url;
  const cleanUrl = url.startsWith('/') ? url : `/${url}`;
  if (cleanUrl.startsWith('/uploads/') && !cleanUrl.startsWith('/api/')) {
    return `${API_BASE_URL}/api${cleanUrl}`;
  }
  return `${API_BASE_URL}${cleanUrl}`;
}

export function getWsEndpointUrl(): string {
  const baseUrl = API_BASE_URL.replace(/\/+$/, '');
  const wsPath = baseUrl.endsWith('/api') ? '/ws' : '/api/ws';
  return `${baseUrl}${wsPath}`;
}

export { API_BASE_URL };
import { secureAuthStorage } from '@/shared/storage/secureStore';
import { mmkvSyncStorage } from '@/shared/storage/mmkvStorage';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'https://zhanfinance.fly.dev';

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message: string | null;
  timestamp: string;
}

export interface ApiErrorDetail {
  field: string;
  error: string;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: ApiErrorDetail[];
  requestId?: string;
  isNetworkError: boolean;

  constructor(
    message: string,
    status: number,
    code?: string,
    details?: ApiErrorDetail[],
    requestId?: string
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
    this.isNetworkError = status === 0;
  }
}

let memoryAccessToken: string | null = null;
let currentLanguage = 'ru';
let onSessionTerminatedCallback: (() => void) | null = null;

export function setAccessToken(token: string | null): void {
  memoryAccessToken = token;
}

export function getAccessToken(): string | null {
  return memoryAccessToken;
}

export function setApiLanguage(lang: string): void {
  currentLanguage = lang;
}

export function onSessionTerminated(cb: () => void): void {
  onSessionTerminatedCallback = cb;
}

export function generateIdempotencyKey(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const AUTH_BYPASS_ROUTES = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/google',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/confirm-email-otp',
  '/auth/resend-email-otp',
  '/auth/2fa/verify',
  '/auth/2fa/setup-preauth',
];

function isAuthBypassRoute(path: string): boolean {
  return AUTH_BYPASS_ROUTES.some((route) => path.includes(route));
}

export type RefreshResult = 'REFRESHED' | 'NETWORK_ERROR' | 'UNAUTHORIZED';

let activeRefreshPromise: Promise<RefreshResult> | null = null;

/**
 * Single-Flight Token Refresh Mutex.
 * Protects against concurrent 401 refresh storms on wake from Android Doze Mode.
 * NEVER clears the stored refresh token on network failure (status === 0 or 5xx).
 */
export async function executeTokenRefreshSingleFlight(): Promise<RefreshResult> {
  if (activeRefreshPromise) {
    return activeRefreshPromise;
  }

  activeRefreshPromise = (async (): Promise<RefreshResult> => {
    const storedRefreshToken = await secureAuthStorage.getRefreshToken();
    if (!storedRefreshToken) {
      return 'UNAUTHORIZED';
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Platform': 'android',
          'X-Requested-With': 'XMLHttpRequest',
          'Accept-Language': currentLanguage,
        },
        body: JSON.stringify({ refreshToken: storedRefreshToken }),
      });

      if (response.status === 401 || response.status === 403) {
        await secureAuthStorage.clearSession();
        memoryAccessToken = null;
        onSessionTerminatedCallback?.();
        return 'UNAUTHORIZED';
      }

      if (!response.ok) {
        // Server 5xx or 429 rate-limit: keep session alive for retry
        return 'NETWORK_ERROR';
      }

      const rotatedHeaderToken = response.headers.get('X-Refresh-Token');
      const envelope = (await response.json()) as ApiEnvelope<{
        accessToken?: string;
        refreshToken?: string;
      }>;

      if (!envelope.success || !envelope.data?.accessToken) {
        return 'NETWORK_ERROR';
      }

      memoryAccessToken = envelope.data.accessToken;
      const nextRefreshToken = rotatedHeaderToken || envelope.data.refreshToken;
      if (nextRefreshToken) {
        await secureAuthStorage.setRefreshToken(nextRefreshToken);
      }

      return 'REFRESHED';
    } catch {
      // Pure network drop (airplane mode, elevator, tunnel) — preserve refreshToken!
      return 'NETWORK_ERROR';
    }
  })().finally(() => {
    activeRefreshPromise = null;
  });

  return activeRefreshPromise;
}

export interface RequestOptions extends RequestInit {
  idempotencyKey?: string;
  skipAuthRefresh?: boolean;
}

async function performRawFetch<T>(
  path: string,
  options?: RequestOptions
): Promise<{ data: T; responseHeaders: Headers }> {
  const method = (options?.method || 'GET').toUpperCase();
  const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
  const isFormData =
    typeof FormData !== 'undefined' && options?.body instanceof FormData;

  const headers: Record<string, string> = {
    'X-Client-Platform': 'android',
    'X-Requested-With': 'XMLHttpRequest',
    'Accept-Language': currentLanguage,
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options?.headers as Record<string, string> | undefined),
  };

  if (isMutating && !headers['Idempotency-Key']) {
    headers['Idempotency-Key'] = options?.idempotencyKey || generateIdempotencyKey();
  }

  if (memoryAccessToken) {
    headers['Authorization'] = `Bearer ${memoryAccessToken}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      method,
      headers,
    });
  } catch {
    throw new ApiError('Нет соединения с сервером. Проверьте подключение к сети.', 0, 'NETWORK_OFFLINE');
  }

  const rotatedRefresh = response.headers.get('X-Refresh-Token');
  if (rotatedRefresh) {
    await secureAuthStorage.setRefreshToken(rotatedRefresh);
  }

  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;
    let code: string | undefined;
    let details: ApiErrorDetail[] | undefined;
    let requestId: string | undefined;

    try {
      const errBody = await response.json();
      if (errBody?.message) errorMessage = errBody.message;
      if (errBody?.code) code = errBody.code;
      if (Array.isArray(errBody?.details)) details = errBody.details;
      if (errBody?.requestId) requestId = errBody.requestId;
    } catch {
      // Non-JSON error response
    }

    throw new ApiError(errorMessage, response.status, code, details, requestId);
  }

  const envelope = (await response.json()) as ApiEnvelope<T>;
  if (!envelope.success) {
    throw new ApiError(envelope.message || 'Operation failed', response.status);
  }

  return { data: envelope.data, responseHeaders: response.headers };
}

export async function apiRequest<T>(
  path: string,
  options?: RequestOptions
): Promise<T> {
  const method = (options?.method || 'GET').toUpperCase();
  const idempotencyKey =
    options?.idempotencyKey ||
    (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)
      ? generateIdempotencyKey()
      : undefined);

  const mergedOptions: RequestOptions = {
    ...options,
    idempotencyKey,
  };

  try {
    const { data } = await performRawFetch<T>(path, mergedOptions);
    return data;
  } catch (error) {
    if (
      error instanceof ApiError &&
      error.status === 401 &&
      !options?.skipAuthRefresh &&
      !isAuthBypassRoute(path)
    ) {
      const refreshStatus = await executeTokenRefreshSingleFlight();
      if (refreshStatus === 'REFRESHED') {
        const { data } = await performRawFetch<T>(path, {
          ...mergedOptions,
          skipAuthRefresh: true,
        });
        return data;
      }
    }
    throw error;
  }
}

export interface QueuedOfflineMutation {
  id: string;
  path: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body: string;
  createdAt: number;
}

const OFFLINE_QUEUE_KEY = 'ZF_OFFLINE_MUTATION_QUEUE_V1';

export function getOfflineMutationQueue(): QueuedOfflineMutation[] {
  const raw = mmkvSyncStorage.getItem(OFFLINE_QUEUE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as QueuedOfflineMutation[];
  } catch {
    return [];
  }
}

export function enqueueOfflineMutation(
  path: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  payload: unknown
): QueuedOfflineMutation {
  const queue = getOfflineMutationQueue();
  const item: QueuedOfflineMutation = {
    id: generateIdempotencyKey(),
    path,
    method,
    body: JSON.stringify(payload),
    createdAt: Date.now(),
  };
  queue.push(item);
  mmkvSyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  return item;
}

let isFlushingQueue = false;

export async function flushOfflineMutationQueue(): Promise<number> {
  if (isFlushingQueue) return 0;
  const queue = getOfflineMutationQueue();
  if (queue.length === 0) return 0;

  isFlushingQueue = true;
  let flushedCount = 0;
  const remaining: QueuedOfflineMutation[] = [];

  try {
    for (const item of queue) {
      try {
        await apiRequest(item.path, {
          method: item.method,
          body: item.body,
          idempotencyKey: item.id,
        });
        flushedCount++;
      } catch (err) {
        if (err instanceof ApiError && err.isNetworkError) {
          // Still offline: keep this and subsequent mutations in queue
          remaining.push(item);
        } else if (err instanceof ApiError && err.status >= 500) {
          remaining.push(item);
        }
        // 4xx client errors are dropped so they don't block the queue forever
      }
    }
    mmkvSyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
  } finally {
    isFlushingQueue = false;
  }

  return flushedCount;
}

export function getWsEndpointUrl(): string {
  const baseUrl = API_BASE_URL.replace(/\/+$/, '');
  const wsBase = baseUrl.replace(/^http/, 'ws');
  const wsPath = baseUrl.endsWith('/api') ? '/ws/websocket' : '/api/ws/websocket';
  return `${wsBase}${wsPath}`;
}

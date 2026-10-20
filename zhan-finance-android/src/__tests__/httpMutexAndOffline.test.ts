import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  apiRequest,
  executeTokenRefreshSingleFlight,
  enqueueOfflineMutation,
  flushOfflineMutationQueue,
  getOfflineMutationQueue,
  setAccessToken,
} from '@/shared/api/http';
import { secureAuthStorage } from '@/shared/storage/secureStore';
import { mmkv } from '@/shared/storage/mmkvStorage';

describe('Android HTTP Single-Flight Refresh Mutex & Offline Queue', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    mmkv.clearAll();
    await secureAuthStorage.clearSession();
    setAccessToken(null);
  });

  it('preserves refreshToken in Keystore when network drops during token refresh', async () => {
    await secureAuthStorage.setRefreshToken('rt-initial-device-token');

    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network unreachable'));

    const status = await executeTokenRefreshSingleFlight();

    expect(status).toBe('NETWORK_ERROR');
    expect(await secureAuthStorage.getRefreshToken()).toBe('rt-initial-device-token');
  });

  it('deduplicates concurrent refresh calls via single-flight mutex and rotates X-Refresh-Token', async () => {
    await secureAuthStorage.setRefreshToken('rt-v1');

    let refreshCallCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(async () => {
      refreshCallCount++;
      await new Promise((r) => setTimeout(r, 25));
      return new Response(
        JSON.stringify({
          success: true,
          data: { accessToken: 'new-access-jwt' },
          message: null,
          timestamp: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: { 'X-Refresh-Token': 'rt-v2-rotated' },
        }
      );
    });

    const [r1, r2, r3] = await Promise.all([
      executeTokenRefreshSingleFlight(),
      executeTokenRefreshSingleFlight(),
      executeTokenRefreshSingleFlight(),
    ]);

    expect(r1).toBe('REFRESHED');
    expect(r2).toBe('REFRESHED');
    expect(r3).toBe('REFRESHED');
    expect(refreshCallCount).toBe(1);
    expect(await secureAuthStorage.getRefreshToken()).toBe('rt-v2-rotated');
  });

  it('clears session only when server explicitly returns 401 on /auth/refresh', async () => {
    await secureAuthStorage.setRefreshToken('rt-revoked');

    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: 'Revoked' }), { status: 401 })
    );

    const status = await executeTokenRefreshSingleFlight();
    expect(status).toBe('UNAUTHORIZED');
    expect(await secureAuthStorage.getRefreshToken()).toBeNull();
  });

  it('queues mutations while offline and flushes them with Idempotency-Key when back online', async () => {
    const queued = enqueueOfflineMutation('/api/v1/chat/send', 'POST', {
      receiverId: 42,
      content: 'Offline message',
    });

    expect(getOfflineMutationQueue()).toHaveLength(1);

    let capturedIdempotencyKey: string | undefined;
    globalThis.fetch = vi.fn().mockImplementation(async (_url, init) => {
      const headers = init?.headers as Record<string, string>;
      capturedIdempotencyKey = headers['Idempotency-Key'];
      return new Response(
        JSON.stringify({
          success: true,
          data: { id: 1 },
          message: null,
          timestamp: new Date().toISOString(),
        }),
        { status: 200 }
      );
    });

    const flushed = await flushOfflineMutationQueue();
    expect(flushed).toBe(1);
    expect(capturedIdempotencyKey).toBe(queued.id);
    expect(getOfflineMutationQueue()).toHaveLength(0);
  });

  it('automatically refreshes token on 401 and retries original request', async () => {
    setAccessToken('expired-jwt');
    await secureAuthStorage.setRefreshToken('valid-rt');

    let attempt = 0;
    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/auth/refresh')) {
        return new Response(
          JSON.stringify({
            success: true,
            data: { accessToken: 'fresh-jwt' },
            message: null,
            timestamp: new Date().toISOString(),
          }),
          { status: 200, headers: { 'X-Refresh-Token': 'rotated-rt' } }
        );
      }

      attempt++;
      if (attempt === 1) {
        return new Response(JSON.stringify({ message: 'Unauthorized' }), {
          status: 401,
        });
      }
      return new Response(
        JSON.stringify({
          success: true,
          data: [{ id: 77, title: 'Tax Report' }],
          message: null,
          timestamp: new Date().toISOString(),
        }),
        { status: 200 }
      );
    });

    const result = await apiRequest<Array<{ id: number; title: string }>>(
      '/api/v1/tasks'
    );
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(77);
    expect(await secureAuthStorage.getRefreshToken()).toBe('rotated-rt');
  });
});

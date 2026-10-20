import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isChunkLoadError,
  triggerChunkReload,
  markChunkLoadSuccess,
  initVitePreloadErrorRecovery,
  CHUNK_RELOAD_STORAGE_KEY,
} from '../chunkRecovery';
import { lazyWithRetry } from '../lazyWithRetry';
import * as React from 'react';

describe('chunkRecovery infrastructure', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();

    // Mock window.location.reload
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...originalLocation,
        reload: vi.fn(),
      },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
    sessionStorage.clear();
  });

  describe('isChunkLoadError', () => {
    it('detects Chromium/Vite dynamically imported module error', () => {
      const error = new TypeError('Failed to fetch dynamically imported module: https://domain.kz/assets/Page-123.js');
      expect(isChunkLoadError(error)).toBe(true);
    });

    it('detects WebKit/Safari module script failure', () => {
      const error = new TypeError('Importing a module script failed.');
      expect(isChunkLoadError(error)).toBe(true);
    });

    it('detects Firefox/Gecko error loading dynamically imported module', () => {
      const error = new Error('error loading dynamically imported module');
      expect(isChunkLoadError(error)).toBe(true);
    });

    it('detects Webpack ChunkLoadError', () => {
      const error = new Error('Loading chunk 42 failed.');
      error.name = 'ChunkLoadError';
      expect(isChunkLoadError(error)).toBe(true);
    });

    it('detects CSS chunk load error', () => {
      const error = new Error('Loading CSS chunk style-123 failed.');
      expect(isChunkLoadError(error)).toBe(true);
    });

    it('returns false for generic or unrelated errors', () => {
      expect(isChunkLoadError(new Error('Cannot read properties of undefined'))).toBe(false);
      expect(isChunkLoadError(new SyntaxError('Unexpected token <'))).toBe(false);
      expect(isChunkLoadError(null)).toBe(false);
      expect(isChunkLoadError(undefined)).toBe(false);
      expect(isChunkLoadError('NetworkError: 500 Internal Server Error')).toBe(false);
    });
  });

  describe('triggerChunkReload & storm protection', () => {
    it('triggers reload and sets lock on first encounter', () => {
      const result = triggerChunkReload('lazy-import', new Error('Failed to fetch dynamically imported module'));

      expect(result).toBe(true);
      expect(window.location.reload).toHaveBeenCalledTimes(1);
      expect(sessionStorage.getItem(CHUNK_RELOAD_STORAGE_KEY)).toBe('1');
    });

    it('blocks subsequent reload if lock is already active (reload loop prevention)', () => {
      sessionStorage.setItem(CHUNK_RELOAD_STORAGE_KEY, '1');

      const result = triggerChunkReload('lazy-import', new Error('Failed to fetch dynamically imported module'));

      expect(result).toBe(false);
      expect(window.location.reload).not.toHaveBeenCalled();
    });

    it('clears lock on markChunkLoadSuccess', () => {
      sessionStorage.setItem(CHUNK_RELOAD_STORAGE_KEY, '1');
      markChunkLoadSuccess();

      expect(sessionStorage.getItem(CHUNK_RELOAD_STORAGE_KEY)).toBeNull();
    });

    it('handles sessionStorage throwing gracefully', () => {
      const originalGetItem = sessionStorage.getItem;
      sessionStorage.getItem = () => {
        throw new DOMException('SecurityError');
      };

      // Should not throw
      expect(() => triggerChunkReload('lazy-import')).not.toThrow();

      sessionStorage.getItem = originalGetItem;
    });
  });

  describe('initVitePreloadErrorRecovery (Level 1)', () => {
    it('intercepts vite:preloadError and triggers reload on first failure', () => {
      const cleanup = initVitePreloadErrorRecovery();

      const event = new CustomEvent('vite:preloadError', {
        cancelable: true,
        detail: { message: 'Chunk failed' },
      });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      window.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(window.location.reload).toHaveBeenCalledTimes(1);
      expect(sessionStorage.getItem(CHUNK_RELOAD_STORAGE_KEY)).toBe('1');

      cleanup();
    });

    it('does not preventDefault if reload loop is detected so ErrorBoundary can catch', () => {
      sessionStorage.setItem(CHUNK_RELOAD_STORAGE_KEY, '1');
      const cleanup = initVitePreloadErrorRecovery();

      const event = new CustomEvent('vite:preloadError', {
        cancelable: true,
      });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      window.dispatchEvent(event);

      expect(preventDefaultSpy).not.toHaveBeenCalled();
      expect(window.location.reload).not.toHaveBeenCalled();

      cleanup();
    });

    it('removes listener on cleanup call', () => {
      const cleanup = initVitePreloadErrorRecovery();
      cleanup();

      const event = new CustomEvent('vite:preloadError', { cancelable: true });
      window.dispatchEvent(event);

      expect(window.location.reload).not.toHaveBeenCalled();
    });
  });

  describe('lazyWithRetry (Level 2 integration)', () => {
    it('resolves component and clears lock when import succeeds', async () => {
      sessionStorage.setItem(CHUNK_RELOAD_STORAGE_KEY, '1');
      const DummyComponent: React.FC = () => null;
      const importer = vi.fn().mockResolvedValue({ default: DummyComponent });

      const LazyComp = lazyWithRetry(importer);
      // Force lazy factory execution
      const imported = await (LazyComp as any)._payload._result();

      expect(imported.default).toBe(DummyComponent);
      expect(sessionStorage.getItem(CHUNK_RELOAD_STORAGE_KEY)).toBeNull();
    });

    it('triggers reload on chunk error and hangs promise to avoid crash before reload', async () => {
      const chunkError = new TypeError('Failed to fetch dynamically imported module: /assets/Page.js');
      const importer = vi.fn().mockRejectedValue(chunkError);

      const LazyComp = lazyWithRetry(importer);

      // Trigger lazy factory
      const promise = (LazyComp as any)._payload._result();

      // Give microtasks time to run
      await new Promise((r) => setTimeout(r, 10));

      expect(window.location.reload).toHaveBeenCalledTimes(1);
      expect(sessionStorage.getItem(CHUNK_RELOAD_STORAGE_KEY)).toBe('1');

      // The returned promise should remain pending (not reject) to prevent React tree crash before reload
      let rejected = false;
      promise.catch(() => {
        rejected = true;
      });
      await new Promise((r) => setTimeout(r, 10));
      expect(rejected).toBe(false);
    });

    it('throws error when reload lock is active to delegate to ErrorBoundary', async () => {
      sessionStorage.setItem(CHUNK_RELOAD_STORAGE_KEY, '1');
      const chunkError = new TypeError('Failed to fetch dynamically imported module: /assets/Page.js');
      const importer = vi.fn().mockRejectedValue(chunkError);

      const LazyComp = lazyWithRetry(importer);

      await expect((LazyComp as any)._payload._result()).rejects.toThrow(
        'Failed to fetch dynamically imported module'
      );
      expect(window.location.reload).not.toHaveBeenCalled();
    });
  });
});

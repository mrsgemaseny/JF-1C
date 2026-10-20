import * as Sentry from '@sentry/react';

export const CHUNK_RELOAD_STORAGE_KEY = 'jf_chunk_reload_lock';

/**
 * Безопасное чтение из sessionStorage (защита от SecurityError / Private Browsing / SSR).
 */
function safeGetStorage(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      return window.sessionStorage.getItem(key);
    }
  } catch {
    // В строгом приватном режиме или песочнице обращение к sessionStorage может выбрасывать исключение
  }
  return null;
}

/**
 * Безопасная запись в sessionStorage.
 */
function safeSetStorage(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(key, value);
    }
  } catch {
    // Игнорируем QuotaExceededError / SecurityError
  }
}

/**
 * Безопасное удаление из sessionStorage.
 */
function safeRemoveStorage(key: string): void {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.removeItem(key);
    }
  } catch {
    // Игнорируем исключения доступа к хранилищу
  }
}

/**
 * Определяет, является ли ошибка сбоем загрузки динамического чанка (Vite, Rollup, Webpack).
 * Покрывает сигнатуры ошибок всех основных браузеров (Chromium, WebKit, Gecko).
 */
export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false;

  const err = error as { name?: string; message?: string };
  const message = typeof err.message === 'string' ? err.message : String(error);
  const name = typeof err.name === 'string' ? err.name : '';

  return (
    name === 'ChunkLoadError' ||
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('Importing a module script failed') ||
    message.includes('error loading dynamically imported module') ||
    message.includes('dynamically imported module') ||
    message.includes('Loading chunk') ||
    message.includes('Loading CSS chunk')
  );
}

/**
 * Сбрасывает флаг перезагрузки при успешной загрузке страницы/чанка.
 */
export function markChunkLoadSuccess(): void {
  safeRemoveStorage(CHUNK_RELOAD_STORAGE_KEY);
}

/**
 * Триггерит контролируемую перезагрузку страницы при сбое загрузки чанка.
 * 
 * Предотвращает циклические бесконечные перезагрузки (Reload Storm / Flapping):
 * если перезагрузка в рамках текущей сессии уже выполнялась, повторный вызов блокируется,
 * а управление передается уровню ErrorBoundary для отображения информативного UI.
 * 
 * @returns true если перезагрузка инициирована, false если сработал анти-циклический барьер.
 */
export function triggerChunkReload(
  source: 'vite-preload' | 'lazy-import',
  details?: unknown
): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const alreadyReloaded = safeGetStorage(CHUNK_RELOAD_STORAGE_KEY) === '1';

  if (alreadyReloaded) {
    console.warn(
      `[ChunkRecovery] Reload storm detected (${source}). Chunk failed again after recovery reload. Delegating to ErrorBoundary.`,
      details
    );
    try {
      Sentry.addBreadcrumb({
        category: 'infrastructure.chunk_recovery',
        message: `Reload loop prevented for ${source}`,
        level: 'warning',
        data: { source, details: String(details) },
      });
    } catch {
      // Sentry может быть не инициализирован
    }
    return false;
  }

  console.warn(
    `[ChunkRecovery] Chunk load error detected from ${source}. Triggering single automatic recovery reload...`,
    details
  );

  safeSetStorage(CHUNK_RELOAD_STORAGE_KEY, '1');

  try {
    Sentry.addBreadcrumb({
      category: 'infrastructure.chunk_recovery',
      message: `Triggering chunk recovery reload from ${source}`,
      level: 'info',
      data: { source },
    });
  } catch {
    // Безопасный фоллбэк без телеметрии
  }

  window.location.reload();
  return true;
}

interface VitePreloadErrorEvent extends Event {
  payload?: Error;
}

/**
 * Инициализирует глобальный перехватчик события `vite:preloadError`.
 * Начиная с Vite 4.4+, событие выбрасывается на объекте window при сбое предзагрузки чанков.
 * 
 * @returns функция очистки подписки.
 */
export function initVitePreloadErrorRecovery(): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handler = (event: Event) => {
    // В Vite событие preloadError передает исходную ошибку в поле payload
    const viteEvent = event as VitePreloadErrorEvent;
    const payload = viteEvent.payload || (event as CustomEvent).detail || event;

    const reloaded = triggerChunkReload('vite-preload', payload);
    if (reloaded) {
      // Предотвращаем дефолтный Uncaught Error от Vite, так как страница уже перезагружается
      event.preventDefault();
    }
  };

  window.addEventListener('vite:preloadError', handler);

  return () => {
    window.removeEventListener('vite:preloadError', handler);
  };
}

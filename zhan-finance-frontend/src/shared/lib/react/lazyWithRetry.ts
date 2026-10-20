import { lazy, ComponentType } from 'react';
import {
  isChunkLoadError,
  triggerChunkReload,
  markChunkLoadSuccess,
} from './chunkRecovery';

/**
 * Обертка для React.lazy с автоматическим ретраем и перезагрузкой страницы
 * при расхождении хэшей чанков после деплоя новой версии приложения.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    try {
      const component = await componentImport();
      // Очищаем флаг успешной загрузкой
      markChunkLoadSuccess();
      return component;
    } catch (error: unknown) {
      console.error('[lazyWithRetry] Dynamic import failed:', error);

      if (isChunkLoadError(error)) {
        const reloaded = triggerChunkReload('lazy-import', error);
        if (reloaded) {
          // Возвращаем незавершенный Promise, предотвращая крах дерева React до завершения unload/reload страницы
          return new Promise<{ default: T }>(() => {});
        }
      }

      throw error;
    }
  });
}


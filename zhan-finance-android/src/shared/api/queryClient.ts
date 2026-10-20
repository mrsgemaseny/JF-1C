import { QueryClient, onlineManager } from '@tanstack/react-query';
import { ApiError, flushOfflineMutationQueue } from '@/shared/api/http';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days offline cache retention in MMKV
      refetchOnReconnect: true,
      retry: (failureCount, error) => {
        if (error instanceof ApiError) {
          if (error.isNetworkError) return false;
          if (error.status >= 400 && error.status < 500) return false;
        }
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false,
    },
  },
});

export function bindNetworkStatusListener(
  onStatusChange?: (isOnline: boolean) => void
): () => void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const NetInfo = require('@react-native-community/netinfo').default;
    return NetInfo.addEventListener(
      (state: { isConnected: boolean | null; isInternetReachable: boolean | null }) => {
        const isOnline =
          Boolean(state.isConnected) && state.isInternetReachable !== false;
        onlineManager.setOnline(isOnline);
        onStatusChange?.(isOnline);
        if (isOnline) {
          void flushOfflineMutationQueue().then((flushed) => {
            if (flushed > 0) {
              void queryClient.invalidateQueries();
            }
          });
        }
      }
    );
  } catch {
    return () => {};
  }
}

import { useEffect, useState, useCallback } from 'react';
import { ApiError } from '@/shared/api/http';

export { ApiError } from '@/shared/api/http';

export interface ApiDataState<T> {
  data: T | null;
  isLoading: boolean;
  error: ApiError | null;
  refetch: () => Promise<void>;
}

export function useApiData<T>(
  fetchFn: () => Promise<T>,
  options?: {
    retries?: number;
    retryDelay?: number;
  }
): ApiDataState<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchFn();
      setData(result);
      setRetryCount(0);
    } catch (err: any) {
      const statusCode = err instanceof ApiError ? err.status : (err.response?.status || err.statusCode || err.status || 500);
      const message = err instanceof ApiError ? err.message : (err.response?.data?.message || err.message || 'Unknown error');
      const isRetryable = (statusCode >= 500 || statusCode === 408 || statusCode === 429);

      const apiError = err instanceof ApiError ? err : new ApiError(message, statusCode);

      if (isRetryable && retryCount < (options?.retries || 3)) {
        setTimeout(() => {
          setRetryCount((prev) => prev + 1);
          fetchData();
        }, options?.retryDelay || 1000);
      } else {
        setError(apiError);
      }
    } finally {
      setIsLoading(false);
    }
  }, [fetchFn, retryCount, options]);

  useEffect(() => {
    fetchData();
  }, []); // Only run once on mount

  return { data, isLoading, error, refetch: fetchData };
}

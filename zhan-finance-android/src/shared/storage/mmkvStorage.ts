interface KeyValueStore {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
  delete(key: string): void;
  clearAll(): void;
}

function createStore(): KeyValueStore {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { MMKV } = require('react-native-mmkv') as {
      MMKV: new (config: { id: string }) => KeyValueStore;
    };
    const store = new MMKV({ id: 'zhan-finance-mmkv-cache' });
    // Verify native JSI binding works (fails safely in Expo Go without crashing)
    store.getString('__probe__');
    return store;
  } catch {
    const fallback = new Map<string, string>();
    return {
      getString: (key: string) => fallback.get(key),
      set: (key: string, value: string) => {
        fallback.set(key, value);
      },
      delete: (key: string) => {
        fallback.delete(key);
      },
      clearAll: () => {
        fallback.clear();
      },
    };
  }
}

export const mmkv = createStore();

export const mmkvSyncStorage = {
  getItem: (key: string): string | null => {
    try {
      const value = mmkv.getString(key);
      return value === undefined ? null : value;
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      mmkv.set(key, value);
    } catch {
      // safe fallback
    }
  },
  removeItem: (key: string): void => {
    try {
      mmkv.delete(key);
    } catch {
      // safe fallback
    }
  },
};

const CACHE_KEY = 'ZF_REACT_QUERY_OFFLINE_CACHE_V1';

export const queryCachePersister = {
  persistClient: async (client: unknown): Promise<void> => {
    try {
      mmkvSyncStorage.setItem(CACHE_KEY, JSON.stringify(client));
    } catch {
      // Ignore quota or serialization error
    }
  },
  restoreClient: async <T = unknown>(): Promise<T | undefined> => {
    try {
      const raw = mmkvSyncStorage.getItem(CACHE_KEY);
      if (!raw) return undefined;
      return JSON.parse(raw) as T;
    } catch {
      return undefined;
    }
  },
  removeClient: async (): Promise<void> => {
    try {
      mmkvSyncStorage.removeItem(CACHE_KEY);
    } catch {
      // safe fallback
    }
  },
};

const REFRESH_TOKEN_KEY = 'zf_secure_refresh_token';
const DEVICE_ID_KEY = 'zf_secure_device_id';
const BIOMETRIC_ENABLED_KEY = 'zf_biometric_enabled';
const CACHED_USER_KEY = 'zf_secure_user_profile';

const memoryFallback = new Map<string, string>();

interface NativeSecureStore {
  getItemAsync(key: string, options?: Record<string, unknown>): Promise<string | null>;
  setItemAsync(key: string, value: string, options?: Record<string, unknown>): Promise<void>;
  deleteItemAsync(key: string, options?: Record<string, unknown>): Promise<void>;
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY?: number;
}

function getNativeSecureStore(): NativeSecureStore | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-secure-store') as NativeSecureStore;
  } catch {
    return null;
  }
}

function generateUuidV4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function getItemSafe(key: string): Promise<string | null> {
  try {
    const store = getNativeSecureStore();
    if (store && typeof store.getItemAsync === 'function') {
      const val = await store.getItemAsync(key, {
        keychainAccessible: store.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
      });
      if (val !== null) return val;
    }
  } catch {
    // Fallback for test/non-native runtime
  }
  return memoryFallback.get(key) ?? null;
}

async function setItemSafe(key: string, value: string): Promise<void> {
  memoryFallback.set(key, value);
  try {
    const store = getNativeSecureStore();
    if (store && typeof store.setItemAsync === 'function') {
      await store.setItemAsync(key, value, {
        keychainAccessible: store.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
      });
    }
  } catch {
    // Fallback already stored in memoryFallback
  }
}

async function deleteItemSafe(key: string): Promise<void> {
  memoryFallback.delete(key);
  try {
    const store = getNativeSecureStore();
    if (store && typeof store.deleteItemAsync === 'function') {
      await store.deleteItemAsync(key);
    }
  } catch {
    // Ignore
  }
}

export const secureAuthStorage = {
  async getRefreshToken(): Promise<string | null> {
    return getItemSafe(REFRESH_TOKEN_KEY);
  },

  async setRefreshToken(token: string | null): Promise<void> {
    if (!token) {
      await deleteItemSafe(REFRESH_TOKEN_KEY);
      return;
    }
    await setItemSafe(REFRESH_TOKEN_KEY, token);
  },

  async getOrCreateDeviceId(): Promise<string> {
    const existing = await getItemSafe(DEVICE_ID_KEY);
    if (existing) return existing;
    const created = `android-${generateUuidV4()}`;
    await setItemSafe(DEVICE_ID_KEY, created);
    return created;
  },

  async isBiometricEnabled(): Promise<boolean> {
    const val = await getItemSafe(BIOMETRIC_ENABLED_KEY);
    return val === 'true';
  },

  async setBiometricEnabled(enabled: boolean): Promise<void> {
    await setItemSafe(BIOMETRIC_ENABLED_KEY, enabled ? 'true' : 'false');
  },

  async getCachedUserJson(): Promise<string | null> {
    return getItemSafe(CACHED_USER_KEY);
  },

  async setCachedUserJson(json: string | null): Promise<void> {
    if (!json) {
      await deleteItemSafe(CACHED_USER_KEY);
      return;
    }
    await setItemSafe(CACHED_USER_KEY, json);
  },

  async clearSession(): Promise<void> {
    await Promise.all([
      deleteItemSafe(REFRESH_TOKEN_KEY),
      deleteItemSafe(CACHED_USER_KEY),
    ]);
  },
};

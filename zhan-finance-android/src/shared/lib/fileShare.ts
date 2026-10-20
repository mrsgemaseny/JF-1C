import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { API_BASE_URL, getAccessToken } from '@/shared/api/http';

export async function downloadAndShareDocument(
  relativePath: string,
  fileName: string
): Promise<void> {
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const targetUri = `${FileSystem.cacheDirectory ?? ''}${sanitizedName}`;
  const token = getAccessToken();

  const result = await FileSystem.downloadAsync(
    `${API_BASE_URL}${relativePath}`,
    targetUri,
    {
      headers: {
        'X-Client-Platform': 'android',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }
  );

  if (result.status !== 200) {
    throw new Error(`Download failed with HTTP ${result.status}`);
  }

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(result.uri, {
      dialogTitle: fileName,
    });
  }
}

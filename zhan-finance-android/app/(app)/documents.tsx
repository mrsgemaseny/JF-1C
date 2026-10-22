import { useState } from 'react';
import { View, Text, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  documentMobileApi,
  type MobileDocumentDto,
} from '@/entities/document/documentApi';
import { downloadAndShareDocument } from '@/shared/lib/fileShare';
import { AppButton, StatusBadge, SurfaceCard } from '@/shared/ui/Primitives';
import { haptics } from '@/shared/lib/haptics';

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} КБ`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

export default function DocumentsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const docsQuery = useQuery({
    queryKey: ['documents', 'list'],
    queryFn: () => documentMobileApi.getDocuments(),
  });

  const documents: MobileDocumentDto[] = docsQuery.data ?? [];

  const handleOpenOrShare = async (doc: MobileDocumentDto) => {
    setDownloadingId(doc.id);
    try {
      const path = doc.downloadUrl || `/api/v1/documents/${doc.id}/download`;
      await downloadAndShareDocument(path, doc.fileName || `document-${doc.id}.pdf`);
      haptics.success();
    } catch {
      haptics.error();
    } finally {
      setDownloadingId(null);
    }
  };

  const topPadding = Math.max(insets.top, 16);

  return (
    <View
      className="flex-1 bg-gray-50 px-4"
      style={{ paddingTop: topPadding }}
    >
      <Text className="text-2xl font-bold text-gray-900 mb-4">
        {t('documents.title')}
      </Text>

      <FlatList
        data={documents}
        keyExtractor={(item) => String(item.id)}
        refreshing={docsQuery.isRefetching}
        onRefresh={() => {
          void docsQuery.refetch();
        }}
        ListEmptyComponent={
          <SurfaceCard>
            <Text className="text-sm font-medium text-gray-500 text-center">
              {t('documents.emptyDocuments')}
            </Text>
          </SurfaceCard>
        }
        renderItem={({ item }) => {
          const sizeStr = formatFileSize(item.fileSize);
          const dateStr = item.createdAt
            ? new Date(item.createdAt).toLocaleDateString()
            : null;

          return (
            <SurfaceCard className="mb-3">
              <View className="flex-row items-center justify-between mb-1">
                <Text
                  className="text-base font-bold text-gray-900 flex-1 mr-2"
                  numberOfLines={1}
                >
                  {item.fileName}
                </Text>
                {item.status ? (
                  <StatusBadge label={item.status} tone="zinc" />
                ) : null}
              </View>

              <View className="flex-row items-center gap-2 mt-1">
                {dateStr ? (
                  <Text className="text-xs font-medium text-gray-500">
                    {dateStr}
                  </Text>
                ) : null}
                {dateStr && sizeStr ? (
                  <Text className="text-xs font-medium text-gray-300">•</Text>
                ) : null}
                {sizeStr ? (
                  <Text className="text-xs font-medium text-gray-500">
                    {sizeStr}
                  </Text>
                ) : null}
                {item.clientName ? (
                  <>
                    <Text className="text-xs font-medium text-gray-300">•</Text>
                    <Text className="text-xs font-medium text-gray-500" numberOfLines={1}>
                      {item.clientName}
                    </Text>
                  </>
                ) : null}
              </View>

              <View className="mt-3">
                <AppButton
                  title={t('documents.shareDocument')}
                  variant="secondary"
                  loading={downloadingId === item.id}
                  onPress={() => {
                    void handleOpenOrShare(item);
                  }}
                />
              </View>
            </SurfaceCard>
          );
        }}
      />
    </View>
  );
}

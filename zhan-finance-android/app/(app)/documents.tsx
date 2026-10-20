import React, { useState } from 'react';
import { View, Text, FlatList } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  documentMobileApi,
  type MobileDocumentDto,
} from '@/entities/document/documentApi';
import { downloadAndShareDocument } from '@/shared/lib/fileShare';
import { AppButton, SurfaceCard } from '@/shared/ui/Primitives';
import { haptics } from '@/shared/lib/haptics';

export default function DocumentsScreen() {
  const { t } = useTranslation();
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
      await downloadAndShareDocument(path, doc.fileName || `${doc.title}.pdf`);
      haptics.success();
    } catch {
      haptics.error();
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <View className="flex-1 bg-canvas px-4 pt-4">
      <Text className="text-xl font-bold text-zinc-100 mb-4">
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
            <Text className="text-sm text-zinc-400 text-center">
              {t('documents.emptyDocuments')}
            </Text>
          </SurfaceCard>
        }
        renderItem={({ item }) => (
          <SurfaceCard className="mb-3">
            <Text className="text-base font-semibold text-zinc-100">
              {item.title}
            </Text>
            <Text className="text-xs text-zinc-400 mt-1">{item.fileName}</Text>
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
        )}
      />
    </View>
  );
}

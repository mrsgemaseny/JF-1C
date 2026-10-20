import { View, Text, FlatList } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  billingMobileApi,
  type InvoiceStatus,
  type MobileInvoiceDto,
} from '@/entities/billing/billingApi';
import { queryClient } from '@/shared/api/queryClient';
import { AppButton, StatusBadge, SurfaceCard } from '@/shared/ui/Primitives';
import { haptics } from '@/shared/lib/haptics';

function getToneForStatus(
  status: InvoiceStatus
): 'emerald' | 'amber' | 'red' | 'zinc' {
  switch (status) {
    case 'PAID':
      return 'emerald';
    case 'PENDING':
      return 'amber';
    case 'OVERDUE':
      return 'red';
    default:
      return 'zinc';
  }
}

export default function BillingScreen() {
  const { t } = useTranslation();

  const invoicesQuery = useQuery({
    queryKey: ['invoices', 'list'],
    queryFn: () => billingMobileApi.getInvoices(),
  });

  const uploadReceiptMutation = useMutation({
    mutationFn: async (invoiceId: number) => {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });
      if (picked.canceled || !picked.assets?.[0]) {
        return;
      }
      const asset = picked.assets[0];
      await billingMobileApi.uploadReceipt(
        invoiceId,
        asset.uri,
        asset.name,
        asset.mimeType || 'application/pdf'
      );
    },
    onSuccess: () => {
      haptics.success();
      void queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });

  const invoices: MobileInvoiceDto[] = invoicesQuery.data ?? [];

  return (
    <View className="flex-1 bg-canvas px-4 pt-4">
      <Text className="text-xl font-bold text-zinc-100 mb-4">
        {t('billing.title')}
      </Text>

      <FlatList
        data={invoices}
        keyExtractor={(item) => String(item.id)}
        refreshing={invoicesQuery.isRefetching}
        onRefresh={() => {
          void invoicesQuery.refetch();
        }}
        ListEmptyComponent={
          <SurfaceCard>
            <Text className="text-sm text-zinc-400 text-center">
              {t('billing.emptyInvoices')}
            </Text>
          </SurfaceCard>
        }
        renderItem={({ item }) => (
          <SurfaceCard className="mb-3">
            <View className="flex-row items-center justify-between mb-1.5">
              <Text className="text-xs font-medium text-zinc-400">
                {item.invoiceNumber}
              </Text>
              <StatusBadge
                label={t(`billing.status.${item.status}`)}
                tone={getToneForStatus(item.status)}
              />
            </View>
            <Text className="text-lg font-bold text-zinc-100">
              {item.amount.toLocaleString('ru-KZ')} {item.currency || 'KZT'}
            </Text>
            {item.description ? (
              <Text className="text-sm text-zinc-400 mt-1">
                {item.description}
              </Text>
            ) : null}
            {item.status === 'PENDING' || item.status === 'OVERDUE' ? (
              <View className="mt-3">
                <AppButton
                  title={t('billing.uploadReceipt')}
                  variant="secondary"
                  onPress={() => {
                    uploadReceiptMutation.mutate(item.id);
                  }}
                  loading={uploadReceiptMutation.isPending}
                />
              </View>
            ) : null}
          </SurfaceCard>
        )}
      />
    </View>
  );
}

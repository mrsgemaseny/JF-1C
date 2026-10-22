import { View, Text, FlatList, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { ApiError } from '@/shared/api/http';

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
  const insets = useSafeAreaInsets();

  const invoicesQuery = useQuery({
    queryKey: ['invoices', 'list'],
    queryFn: () => billingMobileApi.getInvoices(),
  });

  const uploadReceiptMutation = useMutation({
    mutationFn: async ({ invoiceId, amount }: { invoiceId: number; amount: number }) => {
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
        amount,
        asset.uri,
        asset.name,
        asset.mimeType || 'application/pdf'
      );
    },
    onSuccess: () => {
      haptics.success();
      void queryClient.invalidateQueries({ queryKey: ['invoices'] });
      Alert.alert(t('common.save', 'Успех'), 'Чек успешно отправлен на проверку');
    },
    onError: (err) => {
      haptics.error();
      const msg = err instanceof ApiError ? err.message : 'Ошибка при загрузке чека';
      Alert.alert('Ошибка', msg);
    },
  });

  const invoices: MobileInvoiceDto[] = invoicesQuery.data ?? [];
  const topPadding = Math.max(insets.top, 16);

  return (
    <View
      className="flex-1 bg-gray-50 px-4"
      style={{ paddingTop: topPadding }}
    >
      <Text className="text-2xl font-bold text-gray-900 mb-4">
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
            <Text className="text-sm font-medium text-gray-500 text-center">
              {t('billing.emptyInvoices')}
            </Text>
          </SurfaceCard>
        }
        renderItem={({ item }) => (
          <SurfaceCard className="mb-3">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-base font-bold text-gray-900 flex-1 mr-2" numberOfLines={1}>
                {item.title}
              </Text>
              <StatusBadge
                label={t(`billing.status.${item.status}`)}
                tone={getToneForStatus(item.status)}
              />
            </View>
            <Text className="text-2xl font-bold text-gray-900 my-1">
              {item.amount.toLocaleString('ru-RU')} ₸
            </Text>
            {item.dueDate ? (
              <Text className="text-xs font-medium text-gray-500 mt-1">
                {t('billing.dueDate')}: {new Date(item.dueDate).toLocaleDateString()}
              </Text>
            ) : null}
            {item.status === 'PENDING' || item.status === 'OVERDUE' ? (
              <View className="mt-3">
                <AppButton
                  title={t('billing.uploadReceipt')}
                  variant="secondary"
                  onPress={() => {
                    uploadReceiptMutation.mutate({ invoiceId: item.id, amount: item.amount });
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

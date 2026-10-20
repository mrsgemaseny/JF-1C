import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  getOfflineMutationQueue,
  flushOfflineMutationQueue,
} from '@/shared/api/http';

interface OfflineBannerProps {
  isOnline: boolean;
}

export function OfflineBanner({ isOnline }: OfflineBannerProps) {
  const { t } = useTranslation();
  const pendingCount = getOfflineMutationQueue().length;

  if (isOnline && pendingCount === 0) {
    return null;
  }

  return (
    <View className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 flex-row items-center justify-between">
      <View className="flex-1 pr-2">
        <Text className="text-xs font-medium text-amber-300">
          {!isOnline
            ? t('common.offlineMode')
            : t('common.queuedMutations', { count: pendingCount })}
        </Text>
      </View>
      {isOnline && pendingCount > 0 ? (
        <Pressable
          onPress={() => {
            void flushOfflineMutationQueue();
          }}
          className="px-2.5 py-1 rounded bg-amber-500/20 border border-amber-500/40"
        >
          <Text className="text-xs font-semibold text-amber-200">
            {t('common.syncNow')}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

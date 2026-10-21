import '../global.css';
import '@/shared/i18n/i18n';
import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Pressable } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useTranslation } from 'react-i18next';
import { queryClient, bindNetworkStatusListener } from '@/shared/api/queryClient';
import { queryCachePersister } from '@/shared/storage/mmkvStorage';
import { AuthProvider, useMobileAuth } from '@/features/auth/AuthContext';
import { OfflineBanner } from '@/shared/ui/OfflineBanner';
import { AppButton, SurfaceCard } from '@/shared/ui/Primitives';

function NavigationAndBiometricGuard() {
  const { user, isHydrating, isBiometricLocked, unlockBiometrics } = useMobileAuth();
  const segments = useSegments();
  const router = useRouter();
  const { t } = useTranslation();
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = bindNetworkStatusListener((online) => {
      setIsOnline(online);
      if (online) {
        import('@/shared/api/http').then(({ flushOfflineMutationQueue }) => {
          void flushOfflineMutationQueue();
        });
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (isHydrating) return;
    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      router.replace('/(app)');
    }
  }, [user, isHydrating, segments, router]);

  if (isHydrating) {
    return (
      <View className="flex-1 bg-brand-beige items-center justify-center">
        <ActivityIndicator size="large" color="#00562D" />
        <Text className="text-xs text-brand-green/70 mt-3 font-medium">{t('common.loading')}</Text>
      </View>
    );
  }

  if (user && isBiometricLocked) {
    return (
      <View className="flex-1 bg-brand-beige items-center justify-center px-6">
        <SurfaceCard className="w-full">
          <Text className="text-lg font-black uppercase text-brand-green mb-1">
            ZHAN FINANCE
          </Text>
          <Text className="text-sm text-brand-green/70 mb-5">
            {t('common.biometricPrompt')}
          </Text>
          <AppButton
            title={t('common.unlockWithBiometrics')}
            onPress={() => {
              void unlockBiometrics();
            }}
          />
        </SurfaceCard>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-brand-beige" edges={['top', 'left', 'right']}>
      <OfflineBanner isOnline={isOnline} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#F5F5DC' },
          animation: 'fade',
        }}
      />
    </SafeAreaView>
  );
}

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <View className="flex-1 bg-brand-beige items-center justify-center px-6">
      <Text className="text-lg font-black text-brand-green mb-2 uppercase">
        СБОЙ ПРИЛОЖЕНИЯ
      </Text>
      <Text className="text-xs text-brand-green/70 text-center mb-6 leading-5">
        {error?.message || 'Непредвиденная ошибка инициализации.'}
      </Text>
      <Pressable
        onPress={retry}
        className="h-12 px-6 bg-brand-green rounded-2xl items-center justify-center active:bg-[#004222]"
      >
        <Text className="text-brand-beige font-black text-sm uppercase">
          ПОВТОРИТЬ
        </Text>
      </Pressable>
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister: queryCachePersister }}
      >
        <AuthProvider>
          <StatusBar style="dark" />
          <NavigationAndBiometricGuard />
        </AuthProvider>
      </PersistQueryClientProvider>
    </SafeAreaProvider>
  );
}

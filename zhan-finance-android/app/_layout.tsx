import '../global.css';
import '@/shared/i18n/i18n';
import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
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
      <View className="flex-1 bg-canvas items-center justify-center">
        <ActivityIndicator size="large" color="#10b981" />
        <Text className="text-xs text-zinc-400 mt-3">{t('common.loading')}</Text>
      </View>
    );
  }

  if (user && isBiometricLocked) {
    return (
      <View className="flex-1 bg-canvas items-center justify-center px-6">
        <SurfaceCard className="w-full">
          <Text className="text-lg font-semibold text-zinc-100 mb-1">
            ZHAN FINANCE
          </Text>
          <Text className="text-sm text-zinc-400 mb-5">
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
    <SafeAreaView className="flex-1 bg-canvas" edges={['top', 'left', 'right']}>
      <OfflineBanner isOnline={isOnline} />
      <Slot />
    </SafeAreaView>
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
          <StatusBar style="light" backgroundColor="#0a0a0c" />
          <NavigationAndBiometricGuard />
        </AuthProvider>
      </PersistQueryClientProvider>
    </SafeAreaProvider>
  );
}

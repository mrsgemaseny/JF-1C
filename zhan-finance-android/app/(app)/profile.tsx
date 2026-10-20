import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Switch } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useMobileAuth } from '@/features/auth/AuthContext';
import {
  switchLanguage,
  type SupportedLocale,
} from '@/shared/i18n/i18n';
import { secureAuthStorage } from '@/shared/storage/secureStore';
import { AppButton, SurfaceCard } from '@/shared/ui/Primitives';
import { haptics } from '@/shared/lib/haptics';

const LOCALES: { code: SupportedLocale; label: string }[] = [
  { code: 'ru', label: 'RU' },
  { code: 'kk', label: 'KK' },
  { code: 'en', label: 'EN' },
  { code: 'zh', label: 'ZH' },
];

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const { user, signOut } = useMobileAuth();
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);

  useEffect(() => {
    void secureAuthStorage.isBiometricEnabled().then(setBiometricsEnabled);
  }, []);

  const toggleBiometrics = async (next: boolean) => {
    haptics.light();
    setBiometricsEnabled(next);
    await secureAuthStorage.setBiometricEnabled(next);
  };

  return (
    <View className="flex-1 bg-canvas px-4 pt-4">
      <Text className="text-xl font-bold text-zinc-100 mb-4">
        {t('nav.profile')}
      </Text>

      <SurfaceCard className="mb-4">
        <Text className="text-base font-semibold text-zinc-100">
          {user?.fullName}
        </Text>
        <Text className="text-sm text-zinc-400 mt-0.5">{user?.email}</Text>
        <Text className="text-xs font-medium text-emerald-400 mt-2">
          {user?.role ? t(`roles.${user.role}`) : ''}
        </Text>
      </SurfaceCard>

      <SurfaceCard className="mb-4">
        <Text className="text-sm font-medium text-zinc-200 mb-3">
          {t('common.language')}
        </Text>
        <View className="flex-row gap-2">
          {LOCALES.map((loc) => {
            const active = i18n.language === loc.code;
            return (
              <Pressable
                key={loc.code}
                onPress={() => {
                  haptics.light();
                  void switchLanguage(loc.code);
                }}
                className={`flex-1 py-2.5 rounded-md border items-center ${
                  active
                    ? 'bg-emerald-500 border-emerald-500'
                    : 'bg-surface-elevated border-white/10'
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    active ? 'text-zinc-950' : 'text-zinc-300'
                  }`}
                >
                  {loc.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </SurfaceCard>

      <SurfaceCard className="mb-6 flex-row items-center justify-between">
        <Text className="text-sm font-medium text-zinc-200 flex-1 pr-3">
          {t('common.biometrics')}
        </Text>
        <Switch
          value={biometricsEnabled}
          onValueChange={(val) => {
            void toggleBiometrics(val);
          }}
          trackColor={{ false: '#27272a', true: '#10b981' }}
          thumbColor="#f4f4f5"
        />
      </SurfaceCard>

      <AppButton
        title={t('common.logout')}
        variant="danger"
        onPress={() => {
          void signOut();
        }}
      />
    </View>
  );
}

import { useState, useEffect } from 'react';
import { View, Text, Switch, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useMobileAuth } from '@/features/auth/AuthContext';
import {
  LOCALES,
  type SupportedLocale,
} from '@/shared/i18n/i18n';
import { secureAuthStorage } from '@/shared/storage/secureStore';
import { AppButton, SurfaceCard } from '@/shared/ui/Primitives';
import { haptics } from '@/shared/lib/haptics';

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const { user, signOut } = useMobileAuth();
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    void secureAuthStorage.isBiometricEnabled().then(setBiometricsEnabled);
  }, []);

  const switchLanguage = async (code: SupportedLocale) => {
    haptics.light();
    await i18n.changeLanguage(code);
  };

  const toggleBiometrics = async (next: boolean) => {
    haptics.light();
    setBiometricsEnabled(next);
    await secureAuthStorage.setBiometricEnabled(next);
  };

  return (
    <View className="flex-1 bg-brand-beige px-4 pt-4">
      <Text className="text-2xl font-black uppercase text-[#00562D] mb-4">
        {t('nav.profile')}
      </Text>

      <SurfaceCard className="mb-4">
        <Text className="text-lg font-black text-[#00562D]">
          {user?.fullName}
        </Text>
        <Text className="text-sm font-medium text-[#00562D]/70 mt-0.5">{user?.email}</Text>
        <Text className="text-xs font-bold text-[#00562D] mt-2 uppercase tracking-wide">
          {user?.role ? t(`roles.${user.role}`) : ''}
        </Text>
      </SurfaceCard>

      <SurfaceCard className="mb-4">
        <Text className="text-xs font-bold uppercase text-[#00562D]/70 mb-3 tracking-wider">
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
                className={`flex-1 py-2.5 rounded-xl border items-center ${
                  active
                    ? 'bg-[#00562D] border-[#00562D]'
                    : 'bg-white border-[#00562D]/15'
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    active ? 'text-[#F5F5DC]' : 'text-[#00562D]/75'
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
        <Text className="text-sm font-bold text-[#00562D] flex-1 pr-3">
          {t('common.biometrics')}
        </Text>
        <Switch
          value={biometricsEnabled}
          trackColor={{ false: '#d1d5db', true: '#00562D' }}
          thumbColor="#FFFFFF"
          onValueChange={(val) => {
            void toggleBiometrics(val);
          }}
        />
      </SurfaceCard>

      <AppButton
        title={t('common.logout')}
        variant="danger"
        loading={loggingOut}
        onPress={async () => {
          setLoggingOut(true);
          try {
            await signOut();
          } finally {
            setLoggingOut(false);
          }
        }}
      />
    </View>
  );
}

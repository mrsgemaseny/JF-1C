import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  View,
  Text,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useMobileAuth } from '@/features/auth/AuthContext';
import { AppButton, AppInput, SurfaceCard } from '@/shared/ui/Primitives';
import { ApiError } from '@/shared/api/http';
import { haptics } from '@/shared/lib/haptics';

export default function LoginScreen() {
  const { t } = useTranslation();
  const { signIn, verifySecondFactor, pendingVerification } = useMobileAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      await signIn(email, password);
      haptics.success();
    } catch (err) {
      haptics.error();
      setErrorMessage(
        err instanceof ApiError ? err.message : t('auth.invalidCredentials')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.trim().length < 6) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      await verifySecondFactor(otpCode);
      haptics.success();
    } catch (err) {
      haptics.error();
      setErrorMessage(
        err instanceof ApiError ? err.message : t('auth.invalidCredentials')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-canvas justify-center px-5"
    >
      <View className="mb-6">
        <Text className="text-xs font-semibold tracking-widest text-emerald-400 uppercase mb-1">
          ZHAN FINANCE
        </Text>
        <Text className="text-xl font-bold text-zinc-100">
          {pendingVerification ? t('auth.twoFactorTitle') : t('auth.signInTitle')}
        </Text>
        <Text className="text-sm text-zinc-400 mt-1">
          {pendingVerification
            ? t('auth.twoFactorSubtitle')
            : t('auth.signInSubtitle')}
        </Text>
      </View>

      <SurfaceCard>
        {errorMessage ? (
          <View className="bg-red-500/15 border border-red-500/30 rounded-md p-3 mb-4">
            <Text className="text-xs font-medium text-red-400">
              {errorMessage}
            </Text>
          </View>
        ) : null}

        {pendingVerification ? (
          <>
            <AppInput
              label={t('auth.otpCode')}
              value={otpCode}
              onChangeText={setOtpCode}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="000000"
            />
            <AppButton
              title={t('auth.verifyButton')}
              onPress={() => {
                void handleVerifyOtp();
              }}
              loading={loading}
              disabled={otpCode.trim().length < 6}
            />
          </>
        ) : (
          <>
            <AppInput
              label={t('auth.email')}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="name@company.kz"
            />
            <AppInput
              label={t('auth.password')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••"
            />
            <View className="mt-2">
              <AppButton
                title={t('auth.signInButton')}
                onPress={() => {
                  void handleLogin();
                }}
                loading={loading}
                disabled={!email.trim() || !password}
              />
            </View>
          </>
        )}
      </SurfaceCard>
    </KeyboardAvoidingView>
  );
}

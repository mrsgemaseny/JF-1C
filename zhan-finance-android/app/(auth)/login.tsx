import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  Text,
  Image,
  Pressable,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useMobileAuth } from '@/features/auth/AuthContext';
import { AppButton, AppInput, SurfaceCard } from '@/shared/ui/Primitives';
import { ApiError } from '@/shared/api/http';
import { haptics } from '@/shared/lib/haptics';

export default function LoginScreen() {
  const { t, i18n } = useTranslation();
  const { signIn, signUp, verifySecondFactor, pendingVerification } = useMobileAuth();

  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Login & common fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');

  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const switchLanguage = (lang: string) => {
    haptics.light();
    void i18n.changeLanguage(lang);
  };

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

  const handleRegister = async () => {
    if (!email.trim() || !password || !fullName.trim()) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      await signUp({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        phone: phone.trim() || undefined,
        companyName: companyName.trim() || undefined,
      });
      haptics.success();
    } catch (err) {
      haptics.error();
      setErrorMessage(
        err instanceof ApiError ? err.message : 'Ошибка регистрации'
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
      className="flex-1 bg-brand-beige"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <SurfaceCard className="w-full max-w-md mx-auto">
          {/* Header: Brand Logo & Language Switcher */}
          <View className="flex-row items-center justify-between mb-6 pb-2 border-b border-[#00562D]/10">
            <Image
              source={require('@/../assets/logo.png')}
              style={{ width: 140, height: 42 }}
              resizeMode="contain"
            />
            <View className="flex-row bg-[#F5F5DC] rounded-xl p-1 border border-[#00562D]/15">
              {(['ru', 'kk', 'en'] as const).map((lang) => (
                <Pressable
                  key={lang}
                  onPress={() => switchLanguage(lang)}
                  className={`px-2.5 py-1 rounded-lg ${
                    i18n.language.startsWith(lang) ? 'bg-[#00562D]' : ''
                  }`}
                >
                  <Text
                    className={`text-xs font-bold uppercase ${
                      i18n.language.startsWith(lang) ? 'text-[#F5F5DC]' : 'text-[#00562D]/70'
                    }`}
                  >
                    {lang}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Titles */}
          <View className="mb-5">
            <Text className="text-2xl font-black uppercase text-[#00562D]">
              {pendingVerification
                ? t('auth.twoFactorTitle')
                : mode === 'LOGIN'
                  ? 'ВХОД В СИСТЕМУ'
                  : 'РЕГИСТРАЦИЯ'}
            </Text>
            <Text className="text-sm font-medium text-[#00562D]/70 mt-1">
              {pendingVerification
                ? t('auth.twoFactorSubtitle')
                : mode === 'LOGIN'
                  ? 'Корпоративная платформа ZHAN FINANCE'
                  : 'Создание нового аккаунта'}
            </Text>
          </View>

          {/* Error Banner */}
          {errorMessage ? (
            <View className="bg-red-500/10 border border-red-500/25 rounded-2xl p-3.5 mb-4">
              <Text className="text-xs font-semibold text-red-600">
                {errorMessage}
              </Text>
            </View>
          ) : null}

          {/* Mode Switch Tabs (Вход / Регистрация) */}
          {!pendingVerification && (
            <View className="flex-row bg-[#F5F5DC] rounded-2xl p-1.5 mb-5 border border-[#00562D]/15">
              <Pressable
                onPress={() => {
                  haptics.light();
                  setMode('LOGIN');
                  setErrorMessage(null);
                }}
                className={`flex-1 py-2.5 rounded-xl items-center ${
                  mode === 'LOGIN' ? 'bg-[#00562D] shadow-sm' : ''
                }`}
              >
                <Text
                  className={`text-xs font-bold uppercase tracking-wider ${
                    mode === 'LOGIN' ? 'text-[#F5F5DC]' : 'text-[#00562D]/70'
                  }`}
                >
                  Вход
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  haptics.light();
                  setMode('REGISTER');
                  setErrorMessage(null);
                }}
                className={`flex-1 py-2.5 rounded-xl items-center ${
                  mode === 'REGISTER' ? 'bg-[#00562D] shadow-sm' : ''
                }`}
              >
                <Text
                  className={`text-xs font-bold uppercase tracking-wider ${
                    mode === 'REGISTER' ? 'text-[#F5F5DC]' : 'text-[#00562D]/70'
                  }`}
                >
                  Регистрация
                </Text>
              </Pressable>
            </View>
          )}

          {/* 2FA / OTP Step */}
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
          ) : mode === 'LOGIN' ? (
            /* Login Form */
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
          ) : (
            /* Register Form */
            <>
              <AppInput
                label="ФИО / Имя"
                value={fullName}
                onChangeText={setFullName}
                placeholder="Иван Иванов"
              />
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
                label="Телефон (необязательно)"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="+7 (777) 000-00-00"
              />
              <AppInput
                label="Компания (необязательно)"
                value={companyName}
                onChangeText={setCompanyName}
                placeholder="ТОО Компания"
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
                  title="Зарегистрироваться"
                  onPress={() => {
                    void handleRegister();
                  }}
                  loading={loading}
                  disabled={!email.trim() || !password || !fullName.trim()}
                />
              </View>
            </>
          )}
        </SurfaceCard>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

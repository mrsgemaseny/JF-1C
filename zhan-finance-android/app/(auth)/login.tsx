import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  Text,
  TextInput,
  Image,
  Pressable,
} from 'react-native';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react-native';
import { useMobileAuth } from '@/features/auth/AuthContext';
import { ApiError } from '@/shared/api/http';
import { haptics } from '@/shared/lib/haptics';

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
});

export default function LoginScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { signIn, signInWithGoogle, verifySecondFactor, pendingVerification } = useMobileAuth();
  const insets = useSafeAreaInsets();

  const handleGoogleSignIn = async () => {
    try {
      haptics.light();
      setErrorMessage(null);
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      const idToken = response.data?.idToken ?? (response as any).idToken;
      if (!idToken) throw new Error('No idToken');

      setLoading(true);
      const result = await signInWithGoogle(idToken);
      haptics.success();
      if (result.isPendingApproval) {
        setErrorMessage('Заявка на регистрацию отправлена. Ожидайте подтверждения администратора.');
      } else if (!result.requiresVerification) {
        router.replace('/(app)');
      }
    } catch (err: any) {
      haptics.error();
      if (err?.code === statusCodes.SIGN_IN_CANCELLED) return;
      setErrorMessage(
        err instanceof ApiError ? err.message : 'Ошибка при входе через Google'
      );
    } finally {
      setLoading(false);
    }
  };

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

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
      const result = await signIn(email, password);
      haptics.success();
      if (!result.requiresVerification) {
        router.replace('/(app)');
      }
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
      router.replace('/(app)');
    } catch (err) {
      haptics.error();
      setErrorMessage(
        err instanceof ApiError ? err.message : t('auth.invalidCredentials')
      );
    } finally {
      setLoading(false);
    }
  };

  const topPadding = Math.max(insets.top, 16);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-[#F5F5DC]"
      style={{ paddingTop: topPadding }}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingBottom: Math.max(insets.bottom, 24),
          paddingTop: 16,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={{
            borderColor: 'rgba(0, 86, 45, 0.1)',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.05,
            shadowRadius: 20,
            elevation: 4,
          }}
          className="w-full max-w-[420px] bg-white rounded-[32px] p-7 sm:p-9 border"
        >
          {/* Header: Logo and Language Pill */}
          <View className="flex-row items-center justify-between mb-8">
            <Image
              source={require('@/../assets/logo.png')}
              style={{ width: 130, height: 38 }}
              resizeMode="contain"
            />
            <View
              style={{ borderColor: 'rgba(0, 86, 45, 0.1)' }}
              className="flex-row items-center bg-[#f4f4f0] rounded-full p-1 border"
            >
              {[
                { code: 'ru', label: 'RU' },
                { code: 'kk', label: 'KZ' },
                { code: 'en', label: 'EN' },
                { code: 'zh', label: '中文' },
              ].map((lang) => {
                const active = i18n.language.startsWith(lang.code);
                return (
                  <Pressable
                    key={lang.code}
                    onPress={() => switchLanguage(lang.code)}
                    className={`px-3 py-1 rounded-full ${
                      active ? 'bg-[#00562D]' : 'bg-transparent'
                    }`}
                  >
                    <Text
                      style={{
                        color: active ? '#F5F5DC' : 'rgba(0, 86, 45, 0.7)',
                      }}
                      className="text-[11px] font-bold"
                    >
                      {lang.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Titles */}
          <View className="mb-6">
            <Text className="text-2xl sm:text-3xl font-black uppercase text-[#00562D] tracking-tight">
              {pendingVerification ? t('auth.twoFactorTitle') : 'ВХОД В СИСТЕМУ'}
            </Text>
            <Text
              style={{ color: 'rgba(0, 86, 45, 0.7)' }}
              className="text-sm font-medium mt-1.5 leading-relaxed"
            >
              {pendingVerification
                ? t('auth.twoFactorSubtitle')
                : 'Введите ваши данные для доступа к личному кабинету'}
            </Text>
          </View>

          {/* Error Banner */}
          {errorMessage && (
            <View className="bg-red-50 border border-red-200 rounded-2xl p-3.5 mb-5">
              <Text className="text-xs font-semibold text-red-600">
                {errorMessage}
              </Text>
            </View>
          )}

          {/* 2FA Form */}
          {pendingVerification ? (
            <View className="space-y-4">
              <View className="mb-4">
                <Text className="text-xs font-bold text-[#00562D] mb-2 uppercase tracking-wide">
                  {t('auth.otpCode')}
                </Text>
                <TextInput
                  value={otpCode}
                  onChangeText={setOtpCode}
                  keyboardType="number-pad"
                  maxLength={6}
                  placeholder="000000"
                  placeholderTextColor="#9ca3af"
                  style={{ borderColor: 'rgba(0, 86, 45, 0.2)' }}
                  className="h-14 bg-white border rounded-2xl px-4 text-base text-[#00562D] font-medium"
                />
              </View>
              <Pressable
                onPress={() => void handleVerifyOtp()}
                disabled={loading || otpCode.trim().length < 6}
                style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
                className="w-full h-14 bg-[#00562D] rounded-2xl flex-row items-center justify-center"
              >
                <Text className="text-[#F5F5DC] font-black uppercase tracking-wider text-base">
                  {loading ? 'ПРОВЕРКА...' : t('auth.verifyButton')}
                </Text>
              </Pressable>
            </View>
          ) : (
            /* Login Form */
            <View>
              {/* Email */}
              <View className="mb-4">
                <Text className="text-xs font-bold text-[#00562D] mb-2 uppercase tracking-wide">
                  Email <Text className="text-red-500">*</Text>
                </Text>
                <View
                  style={{ borderColor: 'rgba(0, 86, 45, 0.2)' }}
                  className="h-14 bg-white border rounded-2xl flex-row items-center px-4"
                >
                  <Mail color="#00562D" opacity={0.4} size={20} />
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder="example@gmail.com"
                    placeholderTextColor="#9ca3af"
                    className="flex-1 ml-3 text-sm font-medium text-[#00562D]"
                  />
                </View>
              </View>

              {/* Password */}
              <View className="mb-2">
                <Text className="text-xs font-bold text-[#00562D] mb-2 uppercase tracking-wide">
                  Пароль <Text className="text-red-500">*</Text>
                </Text>
                <View
                  style={{ borderColor: 'rgba(0, 86, 45, 0.2)' }}
                  className="h-14 bg-white border rounded-2xl flex-row items-center px-4"
                >
                  <Lock color="#00562D" opacity={0.4} size={20} />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    placeholder="••••••••"
                    placeholderTextColor="#9ca3af"
                    className="flex-1 ml-3 text-sm font-medium text-[#00562D]"
                  />
                  <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                    {showPassword ? (
                      <EyeOff color="#00562D" opacity={0.5} size={20} />
                    ) : (
                      <Eye color="#00562D" opacity={0.5} size={20} />
                    )}
                  </Pressable>
                </View>
              </View>

              {/* Forgot password */}
              <View className="flex-row justify-end mb-5">
                <Pressable onPress={() => haptics.light()}>
                  <Text
                    style={{ color: 'rgba(0, 86, 45, 0.75)' }}
                    className="text-xs font-bold"
                  >
                    Забыли пароль?
                  </Text>
                </Pressable>
              </View>

              {/* Submit button */}
              <Pressable
                onPress={() => void handleLogin()}
                disabled={loading || !email.trim() || !password}
                style={({ pressed }) => [
                  {
                    opacity: pressed ? 0.85 : 1,
                    shadowColor: '#00562D',
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.15,
                    shadowRadius: 10,
                    elevation: 3,
                  },
                ]}
                className={`w-full h-14 bg-[#00562D] rounded-2xl flex-row items-center justify-center ${
                  !email.trim() || !password ? 'opacity-60' : ''
                }`}
              >
                <Text className="text-[#F5F5DC] font-black uppercase tracking-wider text-base mr-2">
                  {loading ? 'ВХОД...' : 'ВОЙТИ'}
                </Text>
                <ArrowRight color="#F5F5DC" size={18} />
              </Pressable>

              {/* Divider */}
              <View className="flex-row items-center my-6">
                <View
                  style={{ backgroundColor: 'rgba(0, 86, 45, 0.15)' }}
                  className="flex-1 h-[1px]"
                />
                <Text
                  style={{ color: 'rgba(0, 86, 45, 0.5)' }}
                  className="px-3 text-xs font-semibold"
                >
                  или
                </Text>
                <View
                  style={{ backgroundColor: 'rgba(0, 86, 45, 0.15)' }}
                  className="flex-1 h-[1px]"
                />
              </View>

              {/* Google Button */}
              <Pressable
                disabled={loading}
                onPress={() => void handleGoogleSignIn()}
                style={({ pressed }) => [
                  {
                    opacity: pressed || loading ? 0.8 : 1,
                    borderColor: 'rgba(0, 86, 45, 0.15)',
                  },
                ]}
                className="w-full h-12 bg-white border rounded-xl flex-row items-center justify-center"
              >
                <View className="w-5 h-5 mr-2.5 items-center justify-center">
                  <Text className="font-bold text-base text-[#4285F4]">G</Text>
                </View>
                <Text
                  style={{ color: 'rgba(0, 86, 45, 0.85)' }}
                  className="text-sm font-semibold"
                >
                  Вход через аккаунт Google
                </Text>
              </Pressable>

              {/* Switch to Register */}
              <View className="flex-row items-center justify-center mt-6">
                <Text
                  style={{ color: 'rgba(0, 86, 45, 0.7)' }}
                  className="text-xs font-medium"
                >
                  Нет учетной записи?{' '}
                </Text>
                <Pressable
                  onPress={() => {
                    haptics.light();
                    router.push('/(auth)/register');
                  }}
                >
                  <Text className="text-xs font-black text-[#00562D] underline">
                    Зарегистрироваться
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

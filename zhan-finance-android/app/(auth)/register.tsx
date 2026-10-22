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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react-native';
import { useMobileAuth } from '@/features/auth/AuthContext';
import { ApiError } from '@/shared/api/http';
import { haptics } from '@/shared/lib/haptics';

export default function RegisterScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { signUp, verifySecondFactor, pendingVerification } = useMobileAuth();
  const insets = useSafeAreaInsets();

  // Registration Form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const switchLanguage = (lang: string) => {
    haptics.light();
    void i18n.changeLanguage(lang);
  };

  const handleRegister = async () => {
    if (!email.trim() || !password || !fullName.trim()) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const result = await signUp({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        phone: phone.trim() || undefined,
        companyName: companyName.trim() || undefined,
      });
      haptics.success();
      if (!result.requiresVerification) {
        router.replace('/(app)');
      }
    } catch (err) {
      haptics.error();
      setErrorMessage(
        err instanceof ApiError ? err.message : 'Ошибка при регистрации'
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
              {pendingVerification ? t('auth.twoFactorTitle') : 'РЕГИСТРАЦИЯ'}
            </Text>
            <Text
              style={{ color: 'rgba(0, 86, 45, 0.7)' }}
              className="text-sm font-medium mt-1.5 leading-relaxed"
            >
              {pendingVerification
                ? t('auth.twoFactorSubtitle')
                : 'Заполните данные для создания личного кабинета'}
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
            /* Register Form */
            <View>
              {/* Full Name */}
              <View className="mb-4">
                <Text className="text-xs font-bold text-[#00562D] mb-2 uppercase tracking-wide">
                  ФИО / Имя <Text className="text-red-500">*</Text>
                </Text>
                <TextInput
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Иван Иванов"
                  placeholderTextColor="#9ca3af"
                  style={{ borderColor: 'rgba(0, 86, 45, 0.2)' }}
                  className="h-14 bg-white border rounded-2xl px-4 text-sm font-medium text-[#00562D]"
                />
              </View>

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

              {/* Phone */}
              <View className="mb-4">
                <Text className="text-xs font-bold text-[#00562D] mb-2 uppercase tracking-wide">
                  Телефон
                </Text>
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  placeholder="+7 (777) 000-00-00"
                  placeholderTextColor="#9ca3af"
                  style={{ borderColor: 'rgba(0, 86, 45, 0.2)' }}
                  className="h-14 bg-white border rounded-2xl px-4 text-sm font-medium text-[#00562D]"
                />
              </View>

              {/* Company */}
              <View className="mb-4">
                <Text className="text-xs font-bold text-[#00562D] mb-2 uppercase tracking-wide">
                  Компания
                </Text>
                <TextInput
                  value={companyName}
                  onChangeText={setCompanyName}
                  placeholder="ТОО Компания"
                  placeholderTextColor="#9ca3af"
                  style={{ borderColor: 'rgba(0, 86, 45, 0.2)' }}
                  className="h-14 bg-white border rounded-2xl px-4 text-sm font-medium text-[#00562D]"
                />
              </View>

              {/* Password */}
              <View className="mb-5">
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

              {/* Register button */}
              <Pressable
                onPress={() => void handleRegister()}
                disabled={loading || !email.trim() || !password || !fullName.trim()}
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
                  !email.trim() || !password || !fullName.trim() ? 'opacity-60' : ''
                }`}
              >
                <Text className="text-[#F5F5DC] font-black uppercase tracking-wider text-base mr-2">
                  {loading ? 'РЕГИСТРАЦИЯ...' : 'ЗАРЕГИСТРИРОВАТЬСЯ'}
                </Text>
                <ArrowRight color="#F5F5DC" size={18} />
              </Pressable>

              {/* Switch to Login */}
              <View className="flex-row items-center justify-center mt-6">
                <Text
                  style={{ color: 'rgba(0, 86, 45, 0.7)' }}
                  className="text-xs font-medium"
                >
                  Уже есть аккаунт?{' '}
                </Text>
                <Pressable
                  onPress={() => {
                    haptics.light();
                    router.replace('/(auth)/login');
                  }}
                >
                  <Text className="text-xs font-black text-[#00562D] underline">
                    Войти
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

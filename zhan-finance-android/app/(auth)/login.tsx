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
import { useTranslation } from 'react-i18next';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react-native';
import { useMobileAuth } from '@/features/auth/AuthContext';
import { ApiError } from '@/shared/api/http';
import { haptics } from '@/shared/lib/haptics';

export default function LoginScreen() {
  const { t, i18n } = useTranslation();
  const { signIn, signUp, verifySecondFactor, pendingVerification } = useMobileAuth();

  // Mode: LOGIN or REGISTER
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Additional fields for registration
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
      className="flex-1 bg-[#F5F5DC]"
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 32,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="w-full max-w-[420px] bg-white rounded-[32px] p-7 sm:p-9 border border-[#00562D]/10 shadow-xl shadow-black/5">
          {/* Header: Logo and Language Pill */}
          <View className="flex-row items-center justify-between mb-8">
            <Image
              source={require('@/../assets/logo.png')}
              style={{ width: 130, height: 38 }}
              resizeMode="contain"
            />
            <View className="flex-row items-center bg-[#f4f4f0] rounded-full p-1 border border-[#00562D]/10">
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
                      className={`text-[11px] font-bold ${
                        active ? 'text-[#F5F5DC]' : 'text-[#00562D]/70'
                      }`}
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
              {pendingVerification
                ? t('auth.twoFactorTitle')
                : isRegisterMode
                  ? 'РЕГИСТРАЦИЯ'
                  : 'ВХОД В СИСТЕМУ'}
            </Text>
            <Text className="text-sm font-medium text-[#00562D]/70 mt-1.5 leading-relaxed">
              {pendingVerification
                ? t('auth.twoFactorSubtitle')
                : isRegisterMode
                  ? 'Заполните данные для создания личного кабинета'
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
                  className="h-14 bg-white border border-[#00562D]/20 rounded-2xl px-4 text-base text-[#00562D] font-medium"
                />
              </View>
              <Pressable
                onPress={() => void handleVerifyOtp()}
                disabled={loading || otpCode.trim().length < 6}
                className="w-full h-14 bg-[#00562D] rounded-2xl flex-row items-center justify-center shadow-lg shadow-[#00562D]/15 active:bg-[#004222]"
              >
                <Text className="text-[#F5F5DC] font-black uppercase tracking-wider text-base">
                  {loading ? 'ПРОВЕРКА...' : t('auth.verifyButton')}
                </Text>
              </Pressable>
            </View>
          ) : !isRegisterMode ? (
            /* Login Form */
            <View>
              {/* Email */}
              <View className="mb-4">
                <Text className="text-xs font-bold text-[#00562D] mb-2 uppercase tracking-wide">
                  Email <Text className="text-red-500">*</Text>
                </Text>
                <View className="h-14 bg-white border border-[#00562D]/20 rounded-2xl flex-row items-center px-4">
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
                <View className="h-14 bg-white border border-[#00562D]/20 rounded-2xl flex-row items-center px-4">
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
                  <Text className="text-xs font-bold text-[#00562D]/75">
                    Забыли пароль?
                  </Text>
                </Pressable>
              </View>

              {/* Submit button */}
              <Pressable
                onPress={() => void handleLogin()}
                disabled={loading || !email.trim() || !password}
                className={`w-full h-14 bg-[#00562D] rounded-2xl flex-row items-center justify-center shadow-lg shadow-[#00562D]/15 active:bg-[#004222] ${
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
                <View className="flex-1 h-[1px] bg-[#00562D]/15" />
                <Text className="px-3 text-xs font-semibold text-[#00562D]/50">
                  или
                </Text>
                <View className="flex-1 h-[1px] bg-[#00562D]/15" />
              </View>

              {/* Google Button */}
              <Pressable
                onPress={() => haptics.light()}
                className="w-full h-12 bg-white border border-[#00562D]/15 rounded-xl flex-row items-center justify-center active:bg-[#f9f9f6]"
              >
                <View className="w-5 h-5 mr-2.5 items-center justify-center">
                  <Text className="font-bold text-base text-[#4285F4]">G</Text>
                </View>
                <Text className="text-sm font-semibold text-[#00562D]/85">
                  Вход через аккаунт Google
                </Text>
              </Pressable>

              {/* Switch to Register */}
              <View className="flex-row items-center justify-center mt-6">
                <Text className="text-xs font-medium text-[#00562D]/70">
                  Нет учетной записи?{' '}
                </Text>
                <Pressable
                  onPress={() => {
                    haptics.light();
                    setIsRegisterMode(true);
                    setErrorMessage(null);
                  }}
                >
                  <Text className="text-xs font-black text-[#00562D] underline">
                    Зарегистрироваться
                  </Text>
                </Pressable>
              </View>
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
                  className="h-14 bg-white border border-[#00562D]/20 rounded-2xl px-4 text-sm font-medium text-[#00562D]"
                />
              </View>

              {/* Email */}
              <View className="mb-4">
                <Text className="text-xs font-bold text-[#00562D] mb-2 uppercase tracking-wide">
                  Email <Text className="text-red-500">*</Text>
                </Text>
                <View className="h-14 bg-white border border-[#00562D]/20 rounded-2xl flex-row items-center px-4">
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
                  className="h-14 bg-white border border-[#00562D]/20 rounded-2xl px-4 text-sm font-medium text-[#00562D]"
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
                  className="h-14 bg-white border border-[#00562D]/20 rounded-2xl px-4 text-sm font-medium text-[#00562D]"
                />
              </View>

              {/* Password */}
              <View className="mb-5">
                <Text className="text-xs font-bold text-[#00562D] mb-2 uppercase tracking-wide">
                  Пароль <Text className="text-red-500">*</Text>
                </Text>
                <View className="h-14 bg-white border border-[#00562D]/20 rounded-2xl flex-row items-center px-4">
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
                className={`w-full h-14 bg-[#00562D] rounded-2xl flex-row items-center justify-center shadow-lg shadow-[#00562D]/15 active:bg-[#004222] ${
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
                <Text className="text-xs font-medium text-[#00562D]/70">
                  Уже есть аккаунт?{' '}
                </Text>
                <Pressable
                  onPress={() => {
                    haptics.light();
                    setIsRegisterMode(false);
                    setErrorMessage(null);
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

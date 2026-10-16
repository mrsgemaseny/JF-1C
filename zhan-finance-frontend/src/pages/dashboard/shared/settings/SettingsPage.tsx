import { useState, useEffect, useRef } from 'react';
import { Camera, Lock, User, Save, Shield, Building2, Phone, Globe, MessageCircle, ExternalLink, Unlink, RefreshCw } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { getMyProfile, updateMyProfile, updateMyPassword, uploadAvatar, UserProfileDto } from '@/entities/user/api/userApi';
import { Spinner } from '@/shared/ui/Spinner';
import { getSecureImageUrl, apiRequest } from '@/shared/api/http';
import { useTranslation, Trans } from 'react-i18next';
import { LanguageSwitcher } from '@/shared/ui/LanguageSwitcher';
import { QRCodeSVG } from 'qrcode.react';
import { linkGoogle } from '@/features/auth/authApi';
import { GoogleLogin } from '@react-oauth/google';
import { toast } from '@/shared/ui/Toast/ToastContext';
import { Input } from '@/shared/ui/Input/Input';

const TELEGRAM_PLANE_ICON = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%232AABEE'><path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z'/></svg>";

interface TelegramStatus {
  linked: boolean;
  chatId?: number;
  telegramUsername?: string;
  linkedAt?: string;
}

interface TelegramLinkToken {
  token: string;
  deepLink: string;
  expiresAt: string;
}

export function SettingsPage() {
  const { user, setUser } = useAuth();
  const { t } = useTranslation(['common']);

  const [profile, setProfile] = useState<UserProfileDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Profile Form
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Password Form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Avatar Upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Telegram
  const [tgStatus, setTgStatus] = useState<TelegramStatus | null>(null);
  const [tgLoading, setTgLoading] = useState(true);
  const [tgLinkData, setTgLinkData] = useState<TelegramLinkToken | null>(null);
  const [tgGenerating, setTgGenerating] = useState(false);
  const [tgUnlinking, setTgUnlinking] = useState(false);

  async function handleLinkGoogle(credential: string) {
    try {
      await linkGoogle(credential);
      toast.success(t('settings.google.linkSuccess', { defaultValue: 'Google-аккаунт успешно привязан!' }));
      loadProfile();
    } catch (err: any) {
      toast.error(err?.message || t('settings.google.linkError', { defaultValue: 'Ошибка привязки Google-аккаунта' }));
    }
  }

  useEffect(() => {
    loadProfile();
    loadTelegramStatus();
  }, []);

  useEffect(() => {
    if (!tgLinkData || tgStatus?.linked) return;
    const interval = setInterval(() => {
      loadTelegramStatus();
    }, 3500);
    return () => clearInterval(interval);
  }, [tgLinkData, tgStatus?.linked]);

  async function loadProfile() {
    try {
      const data = await getMyProfile();
      setProfile(data);
      setFullName(data.fullName || '');
      setPhone(data.phone || '');
      setCompanyName(data.companyName || '');
    } catch (e: any) {
      setProfileError(e.message || t('settings.errors.loadProfile'));
    } finally {
      setIsLoading(false);
    }
  }

  async function loadTelegramStatus() {
    try {
      const data = await apiRequest<TelegramStatus>('/api/v1/telegram/link/status');
      setTgStatus(data);
    } catch {
      setTgStatus({ linked: false });
    } finally {
      setTgLoading(false);
    }
  }

  async function handleGenerateTgLink() {
    setTgGenerating(true);
    setTgLinkData(null);
    try {
      const data = await apiRequest<TelegramLinkToken>('/api/v1/telegram/link/generate', { method: 'POST' });
      setTgLinkData(data);
    } catch (e: any) {
      alert(e.message || t('settings.telegram.generateError', { defaultValue: 'Ошибка генерации ссылки' }));
    } finally {
      setTgGenerating(false);
    }
  }

  async function handleUnlinkTelegram() {
    if (!confirm(t('settings.telegram.unlinkConfirm', { defaultValue: 'Отвязать Telegram-аккаунт?' }))) return;
    setTgUnlinking(true);
    try {
      await apiRequest('/api/v1/telegram/link', { method: 'DELETE' });
      setTgStatus({ linked: false });
      setTgLinkData(null);
    } catch (e: any) {
      alert(e.message || t('settings.telegram.unlinkError', { defaultValue: 'Ошибка отвязки' }));
    } finally {
      setTgUnlinking(false);
    }
  }

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess(false);

    if (!fullName.trim()) {
      setProfileError(t('common.required', 'Обязательное поле'));
      return;
    }

    setIsSavingProfile(true);

    try {
      const updated = await updateMyProfile({
        fullName,
        ...(profile?.role === 'CLIENT' ? { phone, companyName } : {})
      });
      setProfile(updated);
      setProfileSuccess(true);
      if (user) {
        setUser({ ...user, fullName: updated.fullName });
      }
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (e: any) {
      setProfileError(e.message || t('settings.errors.saveProfile'));
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    if (!currentPassword) {
      setPasswordError(t('common.required', 'Обязательное поле'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(t('settings.errors.passwordMismatch'));
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError(t('settings.errors.passwordLength'));
      return;
    }

    setIsSavingPassword(true);
    try {
      await updateMyPassword({ currentPassword, newPassword });
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (e: any) {
      setPasswordError(e.message || t('settings.errors.savePassword'));
    } finally {
      setIsSavingPassword(false);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert(t('settings.errors.fileTooLarge'));
      return;
    }

    setIsUploading(true);
    try {
      const updated = await uploadAvatar(file);
      setProfile(updated);
      if (user) {
        setUser({ ...user, avatarUrl: updated.avatarUrl });
      }
    } catch (err: any) {
      alert(err.message || t('settings.errors.uploadAvatar'));
    } finally {
      setIsUploading(false);
    }
  }

  if (isLoading) {
    return <div className="flex h-full items-center justify-center"><Spinner /></div>;
  }

  if (!profile) {
    return <div className="text-red-500">{t('settings.errors.loadUserData')}</div>;
  }

  const isGoogle = profile.authProvider === 'GOOGLE';

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-2 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('settings.title')}</h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1">{t('settings.subtitle')}</p>
      </div>

      <div className="space-y-6 sm:space-y-8">
        {/* Profile Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 md:p-8">
          <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-center md:items-start">
            {/* Left: Avatar */}
            <div className="flex-shrink-0 flex flex-col items-center text-center md:w-48">
              <div className="relative group mb-4">
                <div className="w-32 h-32 rounded-full overflow-hidden bg-white border-4 border-white shadow-lg relative ring-4 ring-brand-green/10">
                  {profile.avatarUrl ? (
                    <img
                      src={getSecureImageUrl(profile.avatarUrl)}
                      alt={profile.fullName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-brand-green/5 text-brand-green">
                      <User className="w-12 h-12" />
                    </div>
                  )}
                  {isUploading && (
                    <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                      <Spinner className="w-6 h-6 text-brand-green" />
                    </div>
                  )}
                </div>
                {!isGoogle && (
                  <>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="absolute bottom-1 right-1 p-2.5 bg-brand-green text-white rounded-full shadow-lg shadow-brand-green/40 hover:bg-emerald-600 transition-all hover:scale-110 active:scale-95"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg, image/png, image/webp"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </>
                )}
              </div>
              <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-green">
                <Shield className="w-4 h-4" />
                {profile.role}
              </div>
              {isGoogle && (
                <p className="mt-4 text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
                  {t('settings.googleSync')}
                </p>
              )}
            </div>

            {/* Right: Profile Form */}
            <div className="flex-grow w-full">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-900">{t('settings.basicInfo')}</h3>
                <p className="text-sm text-gray-500 mt-1">{t('settings.basicInfoDesc')}</p>
              </div>
              <form onSubmit={handleProfileSubmit} noValidate className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2">
                    <Input
                      type="text"
                      label={t('settings.fullName')}
                      icon={<User className="w-5 h-5" />}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      error={profileError && !fullName.trim() ? t('common.required', 'Обязательное поле') : undefined}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Input
                      type="email"
                      label={t('settings.emailReadonly')}
                      disabled
                      value={profile.email}
                    />
                  </div>
                  {profile.role === 'CLIENT' && (
                    <>
                      <div>
                        <Input
                          type="text"
                          label={t('settings.phone')}
                          icon={<Phone className="w-5 h-5" />}
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                        />
                      </div>
                      <div>
                        <Input
                          type="text"
                          label={t('settings.companyName')}
                          icon={<Building2 className="w-5 h-5" />}
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                        />
                      </div>
                    </>
                  )}
                </div>
                {profileError && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{profileError}</div>}
                {profileSuccess && <div className="text-sm text-green-600 bg-green-50 p-3 rounded-lg border border-green-100">{t('settings.success.profile')}</div>}
                <div className="flex justify-end pt-4 border-t border-gray-100 mt-6">
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 sm:px-8 py-3 bg-gradient-to-r from-brand-green to-emerald-600 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-brand-green/30 hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                  >
                    {isSavingProfile ? <Spinner className="w-4 h-4 text-white" /> : <Shield className="w-4 h-4" />}
                    {t('settings.saveChanges')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Security / Password Card */}
        {!isGoogle && profile.role !== 'CURATOR' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 md:p-8">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-900">{t('settings.securityTitle')}</h3>
              <p className="text-sm text-gray-500 mt-1">{t('settings.changePasswordDesc')}</p>
            </div>
            <form onSubmit={handlePasswordSubmit} noValidate className="space-y-5">
              <div className="max-w-2xl">
                <div className="mb-5">
                  <Input
                    type="password"
                    label={t('settings.currentPassword')}
                    icon={<Lock className="w-5 h-5" />}
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    error={passwordError && !currentPassword ? t('common.required', 'Обязательное поле') : undefined}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <Input
                      type="password"
                      label={t('settings.newPassword')}
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      error={passwordError && newPassword.length > 0 && newPassword.length < 8 ? t('settings.errors.passwordLength') : undefined}
                    />
                  </div>
                  <div>
                    <Input
                      type="password"
                      label={t('settings.confirmPassword')}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      error={passwordError && confirmPassword.length > 0 && newPassword !== confirmPassword ? t('settings.errors.passwordMismatch') : undefined}
                    />
                  </div>
                </div>
                {passwordError && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg mt-5">{passwordError}</div>}
                {passwordSuccess && <div className="text-sm text-green-600 bg-green-50 p-3 rounded-lg border border-green-100 mt-5">{t('settings.success.password')}</div>}
                <div className="flex justify-start pt-6 border-t border-gray-100 mt-6">
                  <button
                    type="submit"
                    disabled={isSavingPassword}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 sm:px-8 py-3 bg-white text-gray-700 border-2 border-gray-200 rounded-xl font-bold hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:hover:translate-y-0"
                  >
                    {isSavingPassword ? t('settings.saving') : t('settings.updatePasswordBtn')}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Language Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 md:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-brand-green shrink-0" />
                <h3 className="text-lg sm:text-xl font-bold text-gray-900">{t('settings.language', 'Язык интерфейса')}</h3>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">{t('settings.languageDesc', 'Выберите предпочтительный язык для отображения интерфейса')}</p>
            </div>
            <div className="pt-1 sm:pt-0 self-start sm:self-auto overflow-x-auto max-w-full">
              <LanguageSwitcher />
            </div>
          </div>
        </div>

        {/* Google Account Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 md:p-8">
          <div className="flex items-center gap-2.5 sm:gap-3 mb-2">
            <svg className="w-5 h-5 sm:w-5.5 sm:h-5.5 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900">{t('settings.google.title', { defaultValue: 'Google Аккаунт' })}</h3>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mb-4 sm:mb-6">
            {t('settings.google.description', { defaultValue: 'Привяжите ваш аккаунт Google для быстрого и безопасного входа в систему в один клик.' })}
          </p>

          {profile?.googleLinked ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-3.5 sm:p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-emerald-800">{t('settings.google.linked', { defaultValue: 'Google привязан' })}</p>
                {profile.googleEmail && (
                  <p className="text-xs sm:text-sm text-gray-600 mt-0.5 truncate">{profile.googleEmail}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-3.5 sm:p-4 bg-gray-50 border border-gray-100 rounded-xl">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800">{t('settings.google.notLinked', { defaultValue: 'Google не привязан' })}</p>
                <p className="text-xs text-gray-500 mt-0.5">{t('settings.google.notLinkedDesc', { defaultValue: 'Вход доступен по логину и паролю' })}</p>
              </div>
              <div className="w-full sm:w-auto flex justify-start sm:justify-end overflow-hidden max-w-full">
                <div className="max-w-full overflow-hidden">
                  <GoogleLogin
                    onSuccess={(r) => { if (r.credential) handleLinkGoogle(r.credential); }}
                    onError={() => toast.error(t('settings.google.gisError', { defaultValue: 'Ошибка Google Identity Services' }))}
                    text="signin_with"
                    shape="rectangular"
                    size="large"
                    useOneTap={false}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Telegram Link Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 md:p-8">
          <div className="flex items-center gap-2 mb-2">
            <MessageCircle className="w-5 h-5 text-[#2AABEE] shrink-0" />
            <h3 className="text-lg sm:text-xl font-bold text-gray-900">{t('settings.telegram.title', { defaultValue: 'Telegram' })}</h3>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mb-4 sm:mb-6">
            {t('settings.telegram.description', { defaultValue: 'Привяжите Telegram-аккаунт, чтобы получать уведомления о задачах, счетах и сообщениях прямо в бот.' })}
          </p>

          {tgLoading ? (
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <Spinner className="w-4 h-4" /> {t('settings.telegram.loading', { defaultValue: 'Загрузка...' })}
            </div>
          ) : tgStatus?.linked ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-3.5 sm:p-4 bg-green-50 border border-green-100 rounded-xl">
              <div>
                <p className="text-sm font-semibold text-green-700">{t('settings.telegram.linked', { defaultValue: 'Привязан' })}</p>
                {tgStatus.telegramUsername && (
                  <p className="text-xs sm:text-sm text-gray-600 mt-0.5">@{tgStatus.telegramUsername}</p>
                )}
              </div>
              <button
                onClick={handleUnlinkTelegram}
                disabled={tgUnlinking}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-60 shrink-0"
              >
                {tgUnlinking ? <Spinner className="w-4 h-4" /> : <Unlink className="w-4 h-4" />}
                {t('settings.telegram.unlink', { defaultValue: 'Отвязать' })}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {tgLinkData ? (
                <div className="bg-gradient-to-br from-blue-50/70 via-white to-sky-50/40 border border-blue-100/80 rounded-2xl p-4 sm:p-6 md:p-8 shadow-sm">
                  <div className="flex flex-col md:flex-row items-center md:items-stretch gap-6 md:gap-8">
                    
                    {/* Вариант 1 (С телефона): Фирменная карточка QR в оригинальном стиле Telegram */}
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div className="relative pt-5">
                        {/* Верхний бейдж с логотипом ЖАН FINANCE */}
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-10 bg-white border border-gray-200/80 px-4 py-1.5 rounded-full shadow-md flex items-center gap-1.5 whitespace-nowrap">
                          <span className="text-[11px] font-black text-brand-green tracking-wider uppercase">
                            {t('settings.telegram.brandLogo', { defaultValue: 'ЖАН FINANCE' })}
                          </span>
                        </div>

                        {/* Белая карточка с закругленными углами */}
                        <div className="bg-white p-5 pt-7 rounded-3xl border border-blue-100 shadow-md flex flex-col items-center text-center">
                          <div className="p-3 bg-white rounded-2xl shadow-inner border border-gray-100 flex items-center justify-center">
                            <QRCodeSVG
                              value={tgLinkData.deepLink}
                              size={180}
                              level="H"
                              fgColor="#2481CC"
                              imageSettings={{
                                src: TELEGRAM_PLANE_ICON,
                                height: 38,
                                width: 38,
                                excavate: true,
                              }}
                            />
                          </div>
                          <span className="mt-4 text-sm font-black text-[#2AABEE] tracking-wide uppercase">
                            @{tgLinkData.deepLink.match(/t\.me\/([^?]+)/)?.[1]?.toUpperCase() || 'ZHANFINANCEBOT'}
                          </span>
                          <span className="text-xs text-gray-400 mt-1 font-medium">
                            {t('settings.telegram.scanWithPhone', { defaultValue: 'Сканируйте камерой телефона' })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Вариант 2 (С компьютера): Прямая кнопка и пошаговая инструкция */}
                    <div className="flex flex-col justify-between flex-1 text-center md:text-left space-y-5">
                      <div>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100/80 text-[#1e96d3] rounded-full text-xs font-bold mb-3">
                          <MessageCircle className="w-3.5 h-3.5" />
                          {t('settings.telegram.twoWaysBadge', { defaultValue: 'Два способа подключения' })}
                        </div>
                        <h4 className="text-lg font-bold text-gray-900 mb-2">
                          {t('settings.telegram.connectionTitle', { defaultValue: 'Подключение Telegram-уведомлений' })}
                        </h4>
                        <ul className="text-sm text-gray-600 space-y-2.5 mb-4 text-left max-w-md mx-auto md:mx-0">
                          <li className="flex items-start gap-2.5">
                            <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                            <span>
                              <Trans
                                i18nKey="settings.telegram.step1"
                                ns="common"
                                components={{ strong: <strong /> }}
                                defaults="<strong>Со смартфона:</strong> наведите камеру телефона на QR-код и откройте ссылку в Telegram."
                              />
                            </span>
                          </li>
                          <li className="flex items-start gap-2.5">
                            <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                            <span>
                              <Trans
                                i18nKey="settings.telegram.step2"
                                ns="common"
                                components={{ strong: <strong /> }}
                                defaults="<strong>С компьютера:</strong> нажмите кнопку «Открыть в Telegram» ниже."
                              />
                            </span>
                          </li>
                          <li className="flex items-start gap-2.5">
                            <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                            <span>
                              <Trans
                                i18nKey="settings.telegram.step3"
                                ns="common"
                                components={{ strong: <strong /> }}
                                defaults="В открывшемся диалоге с ботом нажмите <strong>Запустить (Start)</strong>. Аккаунт привяжется мгновенно."
                              />
                            </span>
                          </li>
                        </ul>
                      </div>

                      <div className="space-y-3 pt-2 border-t border-blue-100/60">
                        <div className="flex flex-col sm:flex-row items-center gap-3 justify-center md:justify-start">
                          <a
                            href={tgLinkData.deepLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#2AABEE] text-white text-sm font-bold rounded-xl hover:bg-[#1e96d3] shadow-sm hover:shadow-md transition-all active:scale-95"
                          >
                            <MessageCircle className="w-4 h-4" />
                            {t('settings.telegram.openInTelegram', { defaultValue: 'Открыть в Telegram' })}
                            <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                          </a>

                          <button
                            onClick={handleGenerateTgLink}
                            disabled={tgGenerating}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-3 border border-gray-200 bg-white text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-60 cursor-pointer"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${tgGenerating ? 'animate-spin' : ''}`} />
                            {t('settings.telegram.refreshQr', { defaultValue: 'Обновить QR-код' })}
                          </button>
                        </div>
                        <p className="text-xs text-gray-400">
                          {t('settings.telegram.qrValidityHint', { defaultValue: 'QR-код и ссылка действительны 15 минут. Статус обновится автоматически сразу после нажатия Start в боте.' })}
                        </p>
                      </div>
                    </div>

                  </div>
                </div>
              ) : (
                <button
                  onClick={handleGenerateTgLink}
                  disabled={tgGenerating}
                  className="flex items-center gap-2 px-6 py-3 bg-[#2AABEE] text-white font-semibold rounded-xl hover:bg-[#1e96d3] hover:shadow-md transition-all disabled:opacity-60 cursor-pointer"
                >
                  {tgGenerating ? <Spinner className="w-4 h-4 text-white" /> : <MessageCircle className="w-4 h-4" />}
                  {t('settings.telegram.connectTelegram', { defaultValue: 'Подключить Telegram' })}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

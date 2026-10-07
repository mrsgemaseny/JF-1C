import { useEffect, useState, FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, CheckCircle2, Copy, KeyRound, Loader2, AlertCircle } from 'lucide-react';
import {
  AuthResponse,
  TwoFactorSetupResponse,
  get2FASetupPreAuth,
  confirm2FASetupPreAuth
} from '@/features/auth/authApi';
import { ApiError } from '@/shared/api/http';

interface Props {
  preAuthToken: string;
  onSuccess: (response: AuthResponse) => void;
  onBack: () => void;
}

export function TotpSetupForm({ preAuthToken, onSuccess, onBack }: Props) {
  const { t } = useTranslation(['auth', 'common']);
  const [setupData, setSetupData] = useState<TwoFactorSetupResponse | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    get2FASetupPreAuth(preAuthToken)
      .then((data) => { if (!cancelled) setSetupData(data); })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : t('totpSetup.loadError', { defaultValue: 'Не удалось получить данные для настройки 2FA. Войдите заново.' }));
      })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [preAuthToken, t]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!setupData || code.length !== 6 || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await confirm2FASetupPreAuth(preAuthToken, setupData.secret, code);
      onSuccess(response);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('totp.invalidCode'));
      setCode('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copySecret = () => {
    if (!setupData?.secret) return;
    navigator.clipboard.writeText(setupData.secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-14 h-14 bg-brand-green/10 text-brand-green rounded-2xl flex items-center justify-center mx-auto mb-4 border border-brand-green/20 shadow-sm">
          <KeyRound size={28} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
          {t('totpSetup.title', { defaultValue: 'Настройка двухфакторной аутентификации' })}
        </h2>
        <p className="text-sm text-gray-500 mt-2 max-w-sm mx-auto">
          {t('totpSetup.subtitle', { defaultValue: 'Для вашей роли 2FA обязательна. Отсканируйте QR-код в Google Authenticator и введите 6-значный код.' })}
        </p>
      </div>

      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-brand-green" />
        </div>
      )}

      {setupData && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col items-center p-4 bg-white rounded-xl border border-gray-200">
            <img src={setupData.qrCodeImage} alt="2FA QR Code" className="w-48 h-48 rounded-lg" />
          </div>

          <div className="flex items-center gap-2 bg-gray-100 p-3 rounded-xl border border-gray-200 font-mono text-xs font-bold text-gray-900 break-all">
            <span className="flex-1">{setupData.secret}</span>
            <button
              type="button"
              onClick={copySecret}
              className="p-1.5 hover:bg-white rounded-md text-gray-600 transition-colors shrink-0"
              title={t('common:copy', { defaultValue: 'Скопировать' })}
            >
              {copied ? <CheckCircle2 size={16} className="text-green-600" /> : <Copy size={16} />}
            </button>
          </div>

          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(null); }}
            disabled={isSubmitting}
            placeholder="000000"
            className="w-full text-center text-2xl tracking-[0.5em] font-bold text-gray-900 bg-gray-50 border border-gray-200 rounded-xl py-3 focus:bg-white focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all disabled:opacity-50"
          />

          <button
            type="submit"
            disabled={code.length !== 6 || isSubmitting}
            className="w-full py-3.5 bg-brand-green hover:bg-brand-green/90 text-white font-bold rounded-xl transition-all shadow-md shadow-brand-green/20 flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{t('totp.verifying')}</span>
              </>
            ) : (
              t('totpSetup.confirmBtn', { defaultValue: 'Включить 2FA и войти' })
            )}
          </button>
        </form>
      )}

      <button
        type="button"
        onClick={onBack}
        disabled={isSubmitting}
        className="w-full py-2.5 text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors flex items-center justify-center gap-1.5"
      >
        <ArrowLeft size={16} />
        {t('totp.backBtn')}
      </button>
    </div>
  );
}

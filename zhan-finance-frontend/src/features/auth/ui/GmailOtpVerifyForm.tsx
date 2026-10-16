import { useState, useRef, useEffect } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { confirmEmailOtp, resendEmailOtp, AuthResponse } from '@/features/auth/authApi';
import { Mail, ArrowLeft, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';

interface Props {
  preAuthToken: string;
  email: string;
  devOtpCode?: string;
  submitButtonText?: string;
  onSuccess: (response: AuthResponse) => void;
  onGoogleSuccess: (credentialResponse: any) => void;
  onBack: () => void;
}

export function GmailOtpVerifyForm({
  preAuthToken,
  email,
  devOtpCode,
  submitButtonText,
  onSuccess,
  onGoogleSuccess,
  onBack
}: Props) {
  const { t } = useTranslation(['auth', 'common']);
  const [code, setCode] = useState<string[]>(Array(6).fill(''));
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(60);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    setError(null);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pasted)) {
      const digits = pasted.split('');
      setCode(digits);
      inputRefs.current[5]?.focus();
      submitCode(pasted);
    }
  };

  const fullCode = code.join('');

  const submitCode = async (codeToSubmit: string) => {
    if (codeToSubmit.length !== 6 || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await confirmEmailOtp(preAuthToken, codeToSubmit);
      onSuccess(response);
    } catch (err: any) {
      setError(err?.message || t('otp.invalidCode', { defaultValue: 'Неверный проверочный код. Проверьте почту и повторите ввод.' }));
      setCode(Array(6).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || isResending) return;
    setIsResending(true);
    setError(null);
    try {
      await resendEmailOtp(preAuthToken);
      setCooldown(60);
    } catch (err: any) {
      setError(err?.message || t('otp.resendError', { defaultValue: 'Не удалось отправить код повторно.' }));
    } finally {
      setIsResending(false);
    }
  };

  useEffect(() => {
    if (fullCode.length === 6) {
      submitCode(fullCode);
    }
  }, [fullCode]);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-14 h-14 bg-amber-500/10 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-500/20 shadow-sm">
          <Mail size={28} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
          {t('otp.title', { defaultValue: 'Подтверждение Gmail' })}
        </h2>
        <p className="text-sm text-gray-600 mt-2 max-w-sm mx-auto leading-relaxed">
          <Trans
            i18nKey="otp.subtitle"
            ns="auth"
            values={{ email }}
            components={{ strong: <strong className="text-gray-900" /> }}
            defaults="На адрес <strong class='text-gray-900'>{{email}}</strong> отправлен 6-значный код подтверждения."
          />
        </p>
      </div>

      {devOtpCode && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-amber-900 text-xs shadow-sm">
          <div>
            <span className="font-bold">{t('otp.devMode', { defaultValue: 'Тестовый режим (SMTP не настроен):' })}</span> {t('otp.devCode', { defaultValue: 'Ваш проверочный код:' })}{' '}
            <code className="font-mono font-bold text-sm bg-white px-2 py-0.5 rounded border border-amber-300 text-brand-green">
              {devOtpCode}
            </code>
          </div>
          <button
            type="button"
            onClick={() => {
              const digits = devOtpCode.split('');
              setCode(digits);
              inputRefs.current[5]?.focus();
              submitCode(devOtpCode);
            }}
            className="text-brand-green hover:underline font-bold ml-2 shrink-0 cursor-pointer"
          >
            {t('otp.pasteCode', { defaultValue: 'Вставить код' })}
          </button>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex justify-center gap-2 sm:gap-3 my-4">
        {code.map((digit, index) => (
          <input
            key={index}
            ref={(el) => { inputRefs.current[index] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            disabled={isSubmitting}
            className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-bold text-gray-900 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all disabled:opacity-50"
          />
        ))}
      </div>

      <div className="space-y-3">
        <button
          type="button"
          onClick={() => submitCode(fullCode)}
          disabled={fullCode.length !== 6 || isSubmitting}
          className="w-full py-3.5 bg-brand-green hover:bg-brand-green/90 text-white font-bold rounded-xl transition-all shadow-md shadow-brand-green/20 flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>{t('otp.verifying', { defaultValue: 'Проверка кода...' })}</span>
            </>
          ) : (
            submitButtonText || t('otp.confirmAndRegister', { defaultValue: 'Подтвердить и завершить регистрацию' })
          )}
        </button>

        <div className="flex items-center justify-between text-xs text-gray-500 px-1 pt-1">
          <span>{t('otp.didNotReceive', { defaultValue: 'Не пришел код?' })}</span>
          <button
            type="button"
            onClick={handleResend}
            disabled={cooldown > 0 || isResending}
            className="text-brand-green hover:underline font-semibold flex items-center gap-1 disabled:opacity-50 disabled:no-underline"
          >
            {isResending ? <RefreshCw className="w-3 h-3 animate-spin" /> : null}
            {cooldown > 0 ? t('otp.resendCooldown', { count: cooldown, defaultValue: `Отправить повторно (${cooldown} сек)` }) : t('otp.resend', { defaultValue: 'Отправить код повторно' })}
          </button>
        </div>

        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-gray-200"></div>
          <span className="flex-shrink mx-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            {t('otp.orQuickLogin', { defaultValue: 'или быстрый вход' })}
          </span>
          <div className="flex-grow border-t border-gray-200"></div>
        </div>

        <div className="flex justify-center w-full">
          <GoogleLogin
            onSuccess={onGoogleSuccess}
            onError={() => setError(t('otp.googleAuthError', { defaultValue: 'Ошибка входа через Google' }))}
            text="continue_with"
            useOneTap={false}
          />
        </div>

        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="w-full py-2.5 text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors flex items-center justify-center gap-1.5"
        >
          <ArrowLeft size={16} />
          {t('otp.backToForm', { defaultValue: 'Назад к форме ввода' })}
        </button>
      </div>
    </div>
  );
}

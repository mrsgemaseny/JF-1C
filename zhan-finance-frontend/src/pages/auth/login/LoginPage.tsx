import { useState, useRef, FormEvent, useEffect } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { ArrowRight, Mail, Lock, Clock } from 'lucide-react';
import { ROUTES } from '@/shared/config/routes';
import { ApiError, extractValidationErrors } from '@/shared/api/http';
import { useAuth } from '@/features/auth/AuthContext';
import { AuthResponse } from '@/features/auth/authApi';
import { TotpVerifyForm } from '@/features/auth/ui/TotpVerifyForm';
import { TotpSetupForm } from '@/features/auth/ui/TotpSetupForm';
import { GoogleLogin } from '@react-oauth/google';
import { Input } from '@/shared/ui/Input/Input';
import { toast } from '@/shared/ui/Toast/ToastContext';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { BrandLogo } from '@/shared/ui/BrandLogo';
import { LanguageSwitcher } from '@/shared/ui/LanguageSwitcher/LanguageSwitcher';

const emailSchema = z.string().email();

export function LoginPage() {
  const { t } = useTranslation('auth');
  const { login, completeAuth, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const state = location.state as { preAuthToken?: string } | null;

  const [step, setStep] = useState<'CREDENTIALS' | 'TOTP' | 'TOTP_SETUP'>('CREDENTIALS');
  const [preAuthToken, setPreAuthToken] = useState<string>('');

  useEffect(() => {
    if (state?.preAuthToken) {
      setPreAuthToken(state.preAuthToken);
      setStep('TOTP');
    }
  }, [state]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('CLIENT');
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const [pendingMessage, setPendingMessage] = useState<string | null>(null);

  const handleGoogleSuccess = async (credentialResponse: any) => {
    if (!credentialResponse.credential || isSubmitting || submittingRef.current) return;
    
    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      const result = await loginWithGoogle(credentialResponse.credential);
      if (result?.requires2FA && result.preAuthToken) {
        setPreAuthToken(result.preAuthToken);
        setStep('TOTP');
        return;
      }
      if (result.isPendingApproval) {
        setPendingMessage(t('login.pendingApproval'));
      } else if (result.isNewUser) {
        toast.success(t('login.registerSuccess'));
        navigate(ROUTES.COMPLETE_PROFILE);
      } else {
        toast.success(t('login.loginSuccess'));
        const returnUrl = searchParams.get('from') || ROUTES.PROFILE;
        navigate(returnUrl, { replace: true });
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'UNKNOWN';
      const isPending = msg.includes('модерации') || msg.includes('отклонена');
      if (isPending) {
        setPendingMessage(msg);
      } else {
        toast.error(t(`errors.${msg}`, { defaultValue: t('login.googleAuthError') }));
      }
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleTotpSuccess = (response: AuthResponse) => {
    completeAuth(response);
    toast.success(t('login.loginSuccess'));
    const returnUrl = searchParams.get('from') || ROUTES.PROFILE;
    navigate(returnUrl, { replace: true });
  };

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (isSubmitting || submittingRef.current) return;
    setGlobalError(null);
    setValidationErrors({});
    
    const emailResult = emailSchema.safeParse(email.trim());
    if (!emailResult.success) {
      setValidationErrors({ email: t('errors.BAD_REQUEST', { defaultValue: 'Email error' }) });
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      const res = await login(email.trim(), password);
      if (res && res.requires2FA && res.preAuthToken) {
        setPreAuthToken(res.preAuthToken);
        setStep(res.requires2FASetup ? 'TOTP_SETUP' : 'TOTP');
        return;
      }
      toast.success(t('login.loginSuccess'));
      const returnUrl = searchParams.get('from') || ROUTES.PROFILE;
      navigate(returnUrl, { replace: true });
    } catch (err) {
      const fieldErrors = extractValidationErrors(err);
      if (Object.keys(fieldErrors).length > 0) {
        setValidationErrors(fieldErrors);
      } else {
        const msg = err instanceof ApiError ? err.message : 'UNKNOWN';
        const isPending = msg.includes('модерации') || msg.includes('отклонена');
        if (isPending) {
          setPendingMessage(msg);
        } else {
          setGlobalError(t(`errors.${msg}`, { defaultValue: t('errors.UNKNOWN') }));
        }
      }
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  if (pendingMessage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-beige px-6 py-24">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-brand-green/10 p-8 sm:p-10 text-center">
          <div className="mx-auto w-16 h-16 bg-brand-green/10 rounded-full flex items-center justify-center mb-6">
            <Clock className="w-8 h-8 text-brand-green" />
          </div>
          <h2 className="text-2xl font-black uppercase text-brand-green mb-4">{t('login.statusTitle')}</h2>
          <p className="text-brand-green/70 mb-8 leading-relaxed font-medium">
            {pendingMessage.includes('отклонена') ? t('login.statusRejected') : t('login.statusPending')}
          </p>
          <Link
            to={ROUTES.HOME}
            className="inline-flex items-center justify-center w-full py-4 bg-brand-green text-brand-beige rounded-2xl font-bold uppercase tracking-wider hover:bg-brand-green/90 transition-all shadow-lg shadow-brand-green/15"
          >
            {t('login.toHome')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-brand-beige px-4 sm:px-6 py-6 sm:py-12 md:py-14">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-brand-green/10 p-6 sm:p-9 md:p-10 my-auto">
        <div className="flex items-center justify-between gap-2 sm:gap-4 mb-6 sm:mb-8">
          <Link to={ROUTES.HOME} className="flex items-center group focus:outline-none shrink-0" aria-label={t('login.toHome')}>
            <BrandLogo className="h-7 sm:h-9 md:h-10 w-auto group-hover:opacity-85 transition-opacity" />
          </Link>
          <LanguageSwitcher />
        </div>

        {step === 'TOTP_SETUP' ? (
          <TotpSetupForm
            preAuthToken={preAuthToken}
            onSuccess={handleTotpSuccess}
            onBack={() => {
              setStep('CREDENTIALS');
              setPreAuthToken('');
            }}
          />
        ) : step === 'TOTP' ? (
          <TotpVerifyForm
            preAuthToken={preAuthToken}
            onSuccess={handleTotpSuccess}
            onBack={() => {
              setStep('CREDENTIALS');
              setPreAuthToken('');
            }}
          />
        ) : (
          <>
            <h1 className="text-2xl sm:text-3xl font-black uppercase text-brand-green mb-2">{t('login.title')}</h1>
            <p className="text-brand-green/70 text-sm mb-5 leading-relaxed">{t('login.subtitle')}</p>

            {/* Role Selector */}
            <div className="mb-6">
              <label className="block text-xs font-bold uppercase tracking-wider text-brand-green/70 mb-2">
                {t('login.selectRole', { defaultValue: 'Выберите роль для входа' })}
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-brand-green/5 rounded-2xl border border-brand-green/10">
                {[
                  { id: 'CLIENT', label: t('login.roles.client', { defaultValue: 'Клиент' }) },
                  { id: 'EMPLOYEE', label: t('login.roles.employee', { defaultValue: 'Бухгалтер' }) },
                  { id: 'LEARNER', label: t('login.roles.learner', { defaultValue: 'Обучение' }) },
                ].map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedRole(r.id)}
                    className={`py-2 px-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all text-center ${
                      selectedRole === r.id
                        ? 'bg-brand-green text-brand-beige shadow-sm'
                        : 'text-brand-green/70 hover:text-brand-green hover:bg-brand-green/5'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <Input
                id="email"
                type="email"
                label={t('login.emailLabel')}
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                error={validationErrors.email}
                icon={<Mail className="w-5 h-5" />}
                placeholder={t('login.emailPlaceholder')}
              />

              <Input
                id="password"
                type="password"
                label={t('login.passwordLabel')}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                error={validationErrors.password}
                icon={<Lock className="w-5 h-5" />}
                placeholder={t('login.passwordPlaceholder')}
              />

              <div className="flex justify-end -mt-1.5 mb-1.5">
                <Link
                  to={ROUTES.FORGOT_PASSWORD}
                  className="text-xs font-semibold text-brand-green/75 hover:text-brand-green hover:underline transition-colors"
                >
                  {t('login.forgotPassword')}
                </Link>
              </div>

              {globalError && (
                <p className="text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  {globalError}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-4 bg-brand-green text-brand-beige rounded-2xl font-bold uppercase tracking-wider hover:bg-brand-green/90 transition-colors shadow-lg shadow-brand-green/15 disabled:opacity-60 disabled:cursor-not-allowed text-sm sm:text-base"
              >
                {isSubmitting ? t('login.loggingIn') : t('login.loginBtn')}
                {!isSubmitting && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-brand-green/20"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-brand-green/50 font-medium">{t('login.or')}</span>
                </div>
              </div>
              <div className="mt-6 flex justify-center">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => toast.error(t('login.googleAuthError'))}
                  use_fedcm_for_prompt={false}
                  itp_support={true}
                />
              </div>
            </div>

            <p className="text-center text-sm text-brand-green/70 mt-6 font-medium">
              {t('login.noAccount')}{' '}
              <Link to={`${ROUTES.REGISTER}${searchParams.get('from') ? `?from=${encodeURIComponent(searchParams.get('from')!)}` : ''}`} className="font-bold text-brand-green hover:underline">
                {t('login.registerLink')}
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
import { useState, useRef, FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, User, Mail, Lock, Phone, Building2 } from 'lucide-react';
import { ROUTES } from '@/shared/config/routes';
import { ApiError, extractValidationErrors } from '@/shared/api/http';
import { useAuth } from '@/features/auth/AuthContext';
import { AuthResponse } from '@/features/auth/authApi';
import { GmailOtpVerifyForm } from '@/features/auth/ui/GmailOtpVerifyForm';
import { GoogleLogin } from '@react-oauth/google';
import { Input } from '@/shared/ui/Input/Input';
import { toast } from '@/shared/ui/Toast/ToastContext';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { BrandLogo } from '@/shared/ui/BrandLogo';
import { LanguageSwitcher } from '@/shared/ui/LanguageSwitcher/LanguageSwitcher';

const emailSchema = z.string().email();

interface RegisterPageProps {
  isEmployeeRoute?: boolean;
}

export function RegisterPage({ isEmployeeRoute = false }: RegisterPageProps) {
  const { t } = useTranslation('auth');
  const { register, loginWithGoogle, completeAuth } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const role = isEmployeeRoute ? 'EMPLOYEE' : 'CLIENT';
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [emailOtpToken, setEmailOtpToken] = useState<string | null>(null);
  const [devOtpCode, setDevOtpCode] = useState<string | null>(null);

  const getSafeReturnUrl = () => {
    const from = searchParams.get('from');
    return from && from.startsWith('/') && !from.startsWith('//') ? from : ROUTES.PROFILE;
  };

  const handleOtpSuccess = (res: AuthResponse) => {
    completeAuth(res);
    if (res.isPendingApproval) {
      setSuccessMessage(t('register.pendingApproval'));
    } else if (res.isNewUser && role === 'CLIENT') {
      toast.success(t('register.loginSuccess'));
      navigate(ROUTES.COMPLETE_PROFILE);
    } else {
      toast.success(t('register.loginSuccess'));
      navigate(getSafeReturnUrl(), { replace: true });
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    if (!credentialResponse.credential || isSubmitting || submittingRef.current) return;
    
    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      if (credentialResponse.credential) {
        const result = await loginWithGoogle(credentialResponse.credential, role);
        if (result.requires2FA && result.preAuthToken) {
          toast.info(t('login.totpRequired'));
          navigate(ROUTES.LOGIN, { state: { preAuthToken: result.preAuthToken, requires2FASetup: result.requires2FASetup } });
          return;
        }
        if (result.isPendingApproval) {
          setSuccessMessage(t('register.pendingApproval'));
        } else if (result.isNewUser && role === 'CLIENT') {
          toast.success(t('register.loginSuccess'));
          navigate(ROUTES.COMPLETE_PROFILE);
        } else {
          toast.success(t('register.loginSuccess'));
          navigate(getSafeReturnUrl(), { replace: true });
        }
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'UNKNOWN';
      toast.error(t(`errors.${msg}`, { defaultValue: msg === 'UNKNOWN' ? t('register.googleError') : msg }));
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (isSubmitting || submittingRef.current) return;
    setGlobalError(null);
    setValidationErrors({});
    
    const errors: Record<string, string> = {};

    if (!fullName.trim()) {
      errors.fullName = t('errors.BAD_REQUEST', { defaultValue: 'Заполните это поле' });
    }

    const emailResult = emailSchema.safeParse(email.trim());
    if (!emailResult.success) {
      errors.email = t('errors.BAD_REQUEST', { defaultValue: 'Некорректный email' });
    }

    if (password.length < 8) {
      errors.password = t('register.passwordLengthError');
    } else if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(password)) {
      errors.password = t('register.passwordFormatError');
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      const result = await register({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        role,
        phone: role === 'CLIENT' ? phone.trim() : undefined,
        companyName: role === 'CLIENT' ? companyName.trim() : undefined,
      });

      if (result && result.requiresEmailOtp && result.preAuthToken) {
        setEmailOtpToken(result.preAuthToken);
        setDevOtpCode(result.devOtpCode || null);
        return;
      }

      if (result && result.isPendingApproval) {
        setSuccessMessage(t('register.pendingApproval'));
      } else {
        toast.success(t('register.loginSuccess'));
        const returnUrl = searchParams.get('from') || ROUTES.PROFILE;
        navigate(returnUrl, { replace: true });
      }
    } catch (err) {
      const fieldErrors = extractValidationErrors(err);
      if (Object.keys(fieldErrors).length > 0) {
        setValidationErrors(fieldErrors);
      } else {
        const msg = err instanceof ApiError ? err.message : 'UNKNOWN';
        setGlobalError(t(`errors.${msg}`, { defaultValue: msg === 'UNKNOWN' ? t('register.googleError') : msg }));
      }
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  if (successMessage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-beige px-6 py-24">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-brand-green/10 p-8 sm:p-10 text-center">
          <div className="mx-auto w-16 h-16 bg-brand-green/10 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 className="w-8 h-8 text-brand-green" />
          </div>
          <h2 className="text-2xl font-black uppercase text-brand-green mb-4">{t('register.submittedTitle')}</h2>
          <p className="text-brand-green/70 mb-8 leading-relaxed font-medium">
            {successMessage}
          </p>
          <Link
            to={ROUTES.HOME}
            className="inline-flex items-center justify-center w-full py-4 bg-brand-green text-brand-beige rounded-2xl font-bold uppercase tracking-wider hover:bg-brand-green/90 transition-all shadow-lg shadow-brand-green/15"
          >
            {t('register.homeLink')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-brand-beige px-4 sm:px-6 py-6 sm:py-12 md:py-14">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-brand-green/10 p-6 sm:p-9 md:p-10 my-auto">
        <div className="flex items-center justify-between gap-2 sm:gap-4 mb-6 sm:mb-8">
          <Link to={ROUTES.HOME} className="flex items-center group focus:outline-none shrink-0" aria-label={t('register.homeLink')}>
            <BrandLogo className="h-7 sm:h-9 md:h-10 w-auto group-hover:opacity-85 transition-opacity" />
          </Link>
          <LanguageSwitcher />
        </div>

        {emailOtpToken ? (
          <GmailOtpVerifyForm
            preAuthToken={emailOtpToken}
            email={email.trim()}
            devOtpCode={devOtpCode || undefined}
            submitButtonText={t('register.confirmAndFinish', { defaultValue: 'Подтвердить и завершить регистрацию' })}
            onSuccess={handleOtpSuccess}
            onGoogleSuccess={handleGoogleSuccess}
            onBack={() => {
              setEmailOtpToken(null);
              setDevOtpCode(null);
            }}
          />
        ) : (
          <div className="animate-in fade-in duration-300">
            {/* Role Selector */}
            <div className="grid grid-cols-2 p-1 bg-brand-green/5 border border-brand-green/10 rounded-2xl mb-6">
              <button
                type="button"
                onClick={() => {
                  if (isEmployeeRoute) navigate(ROUTES.REGISTER);
                }}
                className={`py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${
                  !isEmployeeRoute
                    ? 'bg-brand-green text-brand-beige shadow-sm'
                    : 'text-brand-green/60 hover:text-brand-green'
                }`}
              >
                {t('register.roleClient', { defaultValue: 'Клиент' })}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!isEmployeeRoute) navigate(ROUTES.REGISTER_EMPLOYEE);
                }}
                className={`py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${
                  isEmployeeRoute
                    ? 'bg-brand-green text-brand-beige shadow-sm'
                    : 'text-brand-green/60 hover:text-brand-green'
                }`}
              >
                {t('register.roleEmployee', { defaultValue: 'Сотрудник' })}
              </button>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black uppercase text-brand-green mb-2">{t('register.title')}</h1>
            <p className="text-brand-green/70 text-sm mb-6 leading-relaxed">
              {isEmployeeRoute ? t('register.employeeSubtitle') : t('register.subtitle')}
            </p>

            {email.trim().toLowerCase().endsWith('@gmail.com') && (
              <div className="mb-4 p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-900 text-xs sm:text-sm leading-relaxed">
                <strong className="block font-bold text-amber-950 mb-0.5">{t('register.gmailNoticeTitle', { defaultValue: 'Похоже, вы используете Google-аккаунт' })}</strong>
                {t('register.gmailNoticeText', { defaultValue: 'Для безопасности потребуется подтвердить владение почтой (код на Gmail), либо завершить регистрацию в 1 клик через Google.' })}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-4" autoComplete="off">
            <Input
              id="fullName"
              type="text"
              label={t('register.nameLabel')}
              required
              autoFocus
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={isSubmitting}
              error={validationErrors.fullName}
              icon={<User className="w-5 h-5" />}
              placeholder={t('register.namePlaceholder')}
            />

            {role === 'CLIENT' && (
              <Input
                id="phone"
                type="tel"
                label={t('register.phoneLabel')}
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={isSubmitting}
                error={validationErrors.phone}
                icon={<Phone className="w-5 h-5" />}
                placeholder={t('register.phonePlaceholder')}
              />
            )}

            <Input
              id="email"
              type="email"
              label={t('register.emailLabel')}
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
              error={validationErrors.email}
              icon={<Mail className="w-5 h-5" />}
              placeholder={t('register.emailPlaceholder')}
            />

            <Input
              id="password"
              type="password"
              label={t('register.passwordLabel')}
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
              error={validationErrors.password}
              icon={<Lock className="w-5 h-5" />}
              placeholder={t('register.passwordPlaceholder')}
              hint={t('register.passwordHint')}
            />

            {role === 'CLIENT' && (
              <Input
                id="companyName"
                type="text"
                label={t('register.companyLabel')}
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                disabled={isSubmitting}
                error={validationErrors.companyName}
                icon={<Building2 className="w-5 h-5" />}
                placeholder={t('register.companyPlaceholder')}
              />
            )}

            {globalError && (
              <p className="text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                {globalError}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-4 bg-brand-green text-brand-beige rounded-2xl font-bold uppercase tracking-wider hover:bg-brand-green/90 transition-all shadow-lg shadow-brand-green/15 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {isSubmitting
                ? t('register.registering')
                : email.trim().toLowerCase().endsWith('@gmail.com')
                ? t('register.registerWithEmailConfirm', { defaultValue: 'Зарегистрироваться (подтвердить почту)' })
                : t('register.registerBtn')}
              {!isSubmitting && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-brand-green/20"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-brand-green/50">{t('register.or')}</span>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => toast.error(t('login.googleAuthError'))}
                use_fedcm_for_prompt={false}
                itp_support={true}
              />
            </div>
          </div>

          <p className="text-[11px] text-center text-brand-green/60 mt-5 leading-relaxed">
            {t('register.termsPrompt')}{' '}
            <Link to={ROUTES.PRIVACY_POLICY} target="_blank" className="underline font-semibold hover:text-brand-green">
              {t('register.privacyLink')}
            </Link>{' '}
            {t('register.and')}{' '}
            <Link to={ROUTES.TERMS} target="_blank" className="underline font-semibold hover:text-brand-green">
              {t('register.termsLink')}
            </Link>
          </p>

          <p className="text-center text-sm text-brand-green/70 mt-6">
            {t('register.hasAccount')}{' '}
            <Link to={`${ROUTES.LOGIN}${searchParams.get('from') ? `?from=${encodeURIComponent(searchParams.get('from')!)}` : ''}`} className="font-bold text-brand-green hover:underline">
              {t('register.loginLink')}
            </Link>
          </p>
        </div>
      )}
      </div>
    </div>
  );
}
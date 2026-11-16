import { useTranslation } from 'react-i18next';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/shared/config/routes';
import { useContactForm } from './useContactForm';

import { QRCodeSVG } from 'qrcode.react';

interface ContactFormProps {
  title?: string;
  className?: string;
  showMessage?: boolean;
}

export function ContactForm({ title, className = '', showMessage = false }: ContactFormProps) {
  const { t } = useTranslation('common');
  const { name, setName, nameError, phone, setPhone, phoneError, email, setEmail, validateEmail, emailError, message, setMessage, submitted, waUrl, loading, error, handleSubmit } = useContactForm();

  const displayTitle = title || t('contactForm.title', { defaultValue: 'Связаться с нами' });

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let input = e.target.value.replace(/\D/g, '');
    if (!input) {
      setPhone('');
      return;
    }
    if (input[0] === '7' || input[0] === '8') {
      input = input.substring(1);
    }
    
    let formatted = '+7';
    if (input.length > 0) formatted += ` (${input.substring(0, 3)}`;
    if (input.length >= 4) formatted += `) ${input.substring(3, 6)}`;
    if (input.length >= 7) formatted += `-${input.substring(6, 8)}`;
    if (input.length >= 9) formatted += `-${input.substring(8, 10)}`;
    
    setPhone(formatted);
  };

  return (
    <div className={className}>
      {title !== '' && <h3 className="text-3xl font-black uppercase mb-8">{displayTitle}</h3>}
      {submitted && waUrl ? (
        <div className="flex flex-col items-center justify-center p-8 bg-brand-green/5 rounded-2xl border border-brand-green/20 text-center">
          <CheckCircle2 className="w-12 h-12 text-brand-green mb-3" />
          <h4 className="text-2xl font-black text-brand-green mb-2">
            {t('contactForm.whatsapp.readyTitle', { defaultValue: 'Заявка сформирована!' })}
          </h4>
          <p className="text-brand-green/80 text-sm max-w-md mb-6 leading-relaxed">
            {t('contactForm.whatsapp.readyText', { defaultValue: 'Для завершения отправки перейдите в WhatsApp или отсканируйте QR-код с мобильного устройства.' })}
          </p>
          
          <div className="bg-white p-4 rounded-xl border border-brand-green/15 shadow-sm mb-6 flex flex-col items-center">
            <QRCodeSVG value={waUrl} size={180} level="M" />
            <span className="text-xs font-semibold text-brand-green/60 mt-2 uppercase tracking-wider">
              {t('contactForm.whatsapp.scanQr', { defaultValue: 'Сканируйте камерой телефона' })}
            </span>
          </div>

          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-8 py-4 bg-brand-green text-brand-beige rounded-xl text-base font-bold uppercase tracking-wider hover:bg-brand-green/90 hover:text-white transition-all text-center flex items-center justify-center gap-2 shadow-md"
          >
            {t('contactForm.whatsapp.openBtn', { defaultValue: 'Открыть WhatsApp' })}
          </a>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          <div>
            <label className="block text-sm font-bold mb-2 uppercase tracking-wider opacity-70">
              {t('contactForm.fields.name.label', { defaultValue: 'Ваше имя' })}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full bg-brand-green/5 border-b-2 ${
                nameError ? 'border-red-500' : 'border-brand-green/20'
              } px-4 py-3 focus:outline-none focus:border-brand-green transition-colors rounded-t-xl font-medium`}
              placeholder={t('contactForm.fields.name.placeholder', { defaultValue: 'Имя Фамилия' })}
            />
            {nameError && (
              <p className="text-xs font-semibold text-red-600 mt-1.5">{nameError}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-bold mb-2 uppercase tracking-wider opacity-70">
              {t('contactForm.fields.phone.label', { defaultValue: 'Телефон' })}
            </label>
            <input
              type="tel"
              value={phone}
              onChange={handlePhoneChange}
              className={`w-full bg-brand-green/5 border-b-2 ${
                phoneError ? 'border-red-500' : 'border-brand-green/20'
              } px-4 py-3 focus:outline-none focus:border-brand-green transition-colors rounded-t-xl font-medium`}
              placeholder="+7 (___) ___-__-__"
            />
            {phoneError && (
              <p className="text-xs font-semibold text-red-600 mt-1.5">{phoneError}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-bold mb-2 uppercase tracking-wider opacity-70">
              {t('contactForm.fields.email.label', { defaultValue: 'Email (необязательно)' })}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => validateEmail(email)}
              className={`w-full bg-brand-green/5 border-b-2 ${
                emailError ? 'border-red-500' : 'border-brand-green/20'
              } px-4 py-3 focus:outline-none focus:border-brand-green transition-colors rounded-t-xl font-medium`}
              placeholder={t('contactForm.fields.email.placeholder', { defaultValue: 'name@example.com' })}
            />
            {emailError && (
              <p className="text-xs font-semibold text-red-600 mt-1.5">{emailError}</p>
            )}
          </div>
          {showMessage && (
            <div>
              <label className="block text-sm font-bold mb-2 uppercase tracking-wider opacity-70">
                {t('contactForm.fields.message.label', { defaultValue: 'Описание' })}
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full bg-brand-green/5 border-b-2 border-brand-green/20 px-4 py-3 focus:outline-none focus:border-brand-green transition-colors rounded-t-xl font-medium"
                placeholder={t('contactForm.fields.message.placeholder', { defaultValue: 'Расскажите, чем мы можем вам помочь...' })}
                rows={3}
              />
            </div>
          )}
          {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 bg-brand-green text-brand-beige py-5 rounded-xl text-lg font-bold uppercase tracking-wider hover:bg-brand-green/90 hover:text-white transition-all disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-3"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {t('contactForm.buttons.submitting', { defaultValue: 'Отправляем...' })}
              </>
            ) : (
              t('contactForm.buttons.submit', { defaultValue: 'Отправить заявку' })
            )}
          </button>
          <p className="text-xs text-brand-green/70 text-center mt-3 leading-relaxed">
            {t('contactForm.agreement.prefix', { defaultValue: 'Нажимая кнопку, вы соглашаетесь с' })}{' '}
            <Link to={ROUTES.PRIVACY_POLICY} className="underline font-semibold hover:text-brand-green">
              {t('contactForm.agreement.privacy', { defaultValue: 'Политикой конфиденциальности' })}
            </Link>{' '}
            {t('contactForm.agreement.and', { defaultValue: 'и' })}{' '}
            <Link to={ROUTES.TERMS} className="underline font-semibold hover:text-brand-green">
              {t('contactForm.agreement.terms', { defaultValue: 'Пользовательским соглашением' })}
            </Link>
          </p>
        </form>
      )}
    </div>
  );
}

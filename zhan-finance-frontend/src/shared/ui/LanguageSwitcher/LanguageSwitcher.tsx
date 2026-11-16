import { useTranslation } from 'react-i18next';
import { apiRequest, getAccessToken } from '@/shared/api/http';
import { AUTH_STORAGE_KEY } from '@/shared/constants/storageKeys';

const LANGUAGES = [
  { code: 'ru', label: 'RU' },
  { code: 'kk', label: 'KZ' },
  { code: 'en', label: 'EN' },
  { code: 'zh', label: '中文' },
] as const;

export const LanguageSwitcher = ({ className = '' }: { className?: string }) => {
  const { i18n } = useTranslation();

  const handleLanguageChange = async (code: string) => {
    localStorage.setItem('jf1c_lang', code);
    await i18n.changeLanguage(code);
    
    const hasAuth = !!getAccessToken() || !!localStorage.getItem(AUTH_STORAGE_KEY);
    if (hasAuth) {
      try {
        await apiRequest('/api/v1/users/me/locale', {
          method: 'PATCH',
          body: JSON.stringify({ locale: code })
        });
      } catch (e) {
        console.error('Failed to update locale', e);
      }
    }
  };

  const currentLang = i18n.language || 'ru';

  return (
    <div className={`flex items-center bg-brand-green/5 border border-brand-green/10 rounded-full p-0.5 sm:p-1 shadow-sm shrink-0 ${className}`}>
      {LANGUAGES.map(({ code, label }) => {
        const isActive = currentLang === code || currentLang.startsWith(`${code}-`);
        return (
          <button
            key={code}
            type="button"
            onClick={() => handleLanguageChange(code)}
            className={`text-[10px] sm:text-xs font-bold px-1.5 sm:px-3 py-0.5 sm:py-1.5 rounded-full transition-all ${
              isActive 
                ? 'bg-brand-green text-brand-beige shadow-md' 
                : 'text-brand-green/70 hover:text-brand-green hover:bg-brand-green/10'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
};

import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { ROUTES } from '@/shared/config/routes';
import { useAuth } from '@/features/auth/AuthContext';
import { useTranslation } from 'react-i18next';

export function ProfilePage() {
  const { t } = useTranslation(['common']);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate(ROUTES.HOME);
  }

  return (
    <div className="min-h-screen bg-brand-beige px-6 py-24">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-black uppercase text-brand-green">{t('profile.title')}</h1>
            <p className="text-brand-green/70 mt-1">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold text-brand-green border border-brand-green/15 hover:bg-brand-green/5 transition-all"
          >
            <LogOut className="w-4 h-4" />
            {t('profile.logout')}
          </button>
        </div>

        <div className="bg-white rounded-3xl border border-brand-green/10 shadow-sm p-10 text-center">
          <p className="text-brand-green/70">
            {t('profile.soon')}
          </p>
        </div>
      </div>
    </div>
  );
}
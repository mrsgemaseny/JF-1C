import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ArrowRight, User } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ROUTES } from '@/shared/config/routes';
import { useAuth } from '@/features/auth/AuthContext';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@/shared/ui/LanguageSwitcher';
import { BrandLogo } from '@/shared/ui/BrandLogo';

export function Header() {
  const { t } = useTranslation('common');

  const navItems = [
    { label: t('publicNav.home'), path: ROUTES.HOME },
    { label: t('publicNav.services'), path: ROUTES.SERVICES },
    { label: t('publicNav.about'), path: ROUTES.ABOUT },
  ];
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobileMenuOpen]);

  const isHome = location.pathname === ROUTES.HOME;

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled || !isHome
            ? 'bg-brand-beige/90 backdrop-blur-md border-b border-brand-green/10 py-1.5 shadow-sm'
            : 'bg-transparent py-2.5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <Link to={ROUTES.HOME} className="flex items-center group relative z-50 focus:outline-none" aria-label={t('publicNav.home', { defaultValue: 'На главную' })}>
            <BrandLogo className="h-11 sm:h-12 md:h-14 w-auto group-hover:opacity-85 transition-opacity" />
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all relative ${
                    isScrolled || !isHome
                      ? isActive ? 'text-brand-green bg-brand-green/5' : 'text-brand-green/70 hover:text-brand-green hover:bg-brand-green/5'
                      : isActive ? 'text-brand-green' : 'text-brand-green hover:bg-white/50'
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <motion.div layoutId="nav-pill" className="absolute inset-0 border border-brand-green/20 rounded-full" transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }} />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3 relative z-50">
            <Link
              to={user ? ROUTES.PROFILE : ROUTES.LOGIN}
              className={`hidden md:flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all border ${
                isScrolled || !isHome
                  ? 'text-brand-green border-brand-green/15 hover:bg-brand-green/5'
                  : 'text-brand-green border-brand-green/15 hover:bg-white/50'
              }`}
            >
              <User className="w-4 h-4" />
              {user ? t('publicNav.profile') : t('publicNav.login')}
            </Link>

            <button
              onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
              className={`hidden md:flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold transition-all ${
                isScrolled || !isHome
                  ? 'bg-brand-green text-brand-beige hover:bg-brand-green/90 shadow-lg shadow-brand-green/20'
                  : 'bg-brand-green text-brand-beige lg:bg-white lg:text-brand-green hover:scale-105 shadow-xl'
              }`}
            >
              {t('publicNav.contact')}
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="hidden md:block">
              <LanguageSwitcher />
            </div>

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`md:hidden p-2 rounded-lg transition-colors ${
                isScrolled || !isHome || isMobileMenuOpen ? 'text-brand-green bg-brand-green/5' : 'text-brand-green bg-white/50'
              }`}
            >
              {isMobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 bg-brand-beige pt-24 px-6 md:hidden overflow-y-auto"
          >
            <nav className="flex flex-col gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`p-4 rounded-2xl text-xl font-black uppercase tracking-wider ${
                    location.pathname === item.path ? 'bg-brand-green text-brand-beige' : 'bg-white text-brand-green border border-brand-green/10'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <Link
                to={user ? ROUTES.PROFILE : ROUTES.LOGIN}
                className="p-4 rounded-2xl text-xl font-black uppercase tracking-wider bg-white text-brand-green border border-brand-green/10 flex items-center gap-2"
              >
                <User className="w-5 h-5" />
                {user ? t('publicNav.profile') : t('publicNav.login')}
              </Link>
              <div className="pt-4 border-t border-brand-green/10 flex justify-center">
                <LanguageSwitcher />
              </div>
            </nav>
            <div className="mt-6 p-6 bg-brand-green text-brand-beige rounded-3xl">
              <p className="text-xs font-bold uppercase tracking-widest opacity-70 mb-3">{t('publicNav.getStarted')}</p>
              <a href="https://wa.me/77750584021" target="_blank" rel="noopener noreferrer" className="block text-xl sm:text-2xl font-black mb-5 hover:opacity-80">
                +7 (775) 058-40-21
              </a>
              <button 
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setTimeout(() => (document.getElementById('contact') || document.getElementById('footer'))?.scrollIntoView({ behavior: 'smooth' }), 100);
                }}
                className="flex items-center justify-center gap-2 w-full py-3.5 bg-brand-beige text-brand-green rounded-xl font-bold uppercase text-sm tracking-wider shadow-md hover:bg-white transition-colors"
              >
                {t('publicNav.contact')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
import { motion } from 'framer-motion';
import { Container } from '@/shared/ui/Container';
import { useTranslation } from 'react-i18next';

export function ServicesHero() {
  const { t } = useTranslation('common');
  return (
    <div className="w-full bg-brand-green text-brand-beige pt-28 pb-20">
      <Container>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="grid lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7">
              <h1 className="text-6xl font-black text-brand-beige leading-tight mb-4">{t('services.hero.title', { defaultValue: 'Наши услуги' })}</h1>
              <p className="text-2xl text-brand-beige/90 max-w-3xl mb-6">
                {t('services.hero.description', { defaultValue: 'Полный учёт операций, составление отчетности, контроль финансов — всё в одном месте.' })}
              </p>
              <a href="#services-list" className="inline-block mt-4 px-6 py-3 bg-brand-beige text-brand-green rounded-full font-bold hover:opacity-90 transition-opacity">
                {t('services.hero.action', { defaultValue: 'Смотреть услуги' })}
              </a>
            </div>
          </div>
        </motion.div>
      </Container>
    </div>
  );
}

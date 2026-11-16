import { motion } from 'framer-motion';
import { Section } from '@/shared/ui/Section';
import { Container } from '@/shared/ui/Container';

// Import images
import shymkentImg from '@/shared/assets/images/Shymkent_off.jpg';
import almatyImg from '@/shared/assets/images/Almaty_off.jpg';
import { useTranslation } from 'react-i18next';

export function Offices() {
  const { t } = useTranslation('common');
  return (
    <Section className="bg-brand-beige py-12 sm:py-20 lg:py-24 overflow-hidden">
      <Container>
        <div className="text-center mb-6 sm:mb-16">
          <h2 className="text-2xl sm:text-5xl lg:text-6xl font-black uppercase leading-[1.1] tracking-tight text-brand-green break-words">
            {t('offices.title1', { defaultValue: 'Наши' })} <br />
            <span className="text-brand-green/40">{t('offices.title2', { defaultValue: 'Офисы' })}</span>
          </h2>
        </div>

        <div className="flex flex-row justify-center items-start gap-3 sm:gap-8 md:gap-24">
          {/* Shymkent */}
          <motion.a 
            href="https://2gis.kz/shymkent/firm/70000001060962340" 
            target="_blank" 
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="group flex flex-col items-center cursor-pointer flex-1 max-w-[200px] sm:max-w-none"
          >
            <div className="relative overflow-hidden rounded-2xl sm:rounded-[2rem] bg-brand-green/10 mb-2 sm:mb-6 transition-transform duration-500 group-hover:scale-105 w-full aspect-square sm:w-80 sm:h-80 md:w-96 md:h-96 shadow-md sm:shadow-lg group-hover:shadow-2xl">
              <img src={shymkentImg} alt={t('offices.shymkent_title', { defaultValue: 'Офис в г. Шымкент' })} className="w-full h-full object-cover transition-all duration-500 group-hover:brightness-110" />
            </div>
            <h3 className="font-black uppercase tracking-wider text-brand-green text-xs sm:text-xl md:text-2xl transition-colors duration-300 group-hover:text-brand-green/70 underline-offset-8 group-hover:underline text-center">
              {t('offices.shymkent_title', { defaultValue: 'Офис в г. Шымкент' })}
            </h3>
          </motion.a>

          {/* Almaty */}
          <motion.a 
            href="https://2gis.kz/almaty/geo/70000001109602063" 
            target="_blank" 
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            viewport={{ once: true }}
            className="group flex flex-col items-center cursor-pointer flex-1 max-w-[200px] sm:max-w-none"
          >
            <div className="relative overflow-hidden rounded-2xl sm:rounded-[2rem] bg-brand-green/10 mb-2 sm:mb-6 transition-transform duration-500 group-hover:scale-105 w-full aspect-square sm:w-80 sm:h-80 md:w-96 md:h-96 shadow-md sm:shadow-lg group-hover:shadow-2xl">
              <img src={almatyImg} alt={t('offices.almaty_title', { defaultValue: 'Офис в г. Алматы' })} className="w-full h-full object-cover transition-all duration-500 group-hover:brightness-110" />
            </div>
            <h3 className="font-black uppercase tracking-wider text-brand-green text-xs sm:text-xl md:text-2xl transition-colors duration-300 group-hover:text-brand-green/70 underline-offset-8 group-hover:underline text-center">
              {t('offices.almaty_title', { defaultValue: 'Офис в г. Алматы' })}
            </h3>
          </motion.a>
        </div>
      </Container>
    </Section>
  );
}

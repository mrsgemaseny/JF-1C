import { Section } from '@/shared/ui/Section';
import { Container } from '@/shared/ui/Container';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { useTranslation, Trans } from 'react-i18next';

interface AdvantageCard {
  title: string;
  text: string;
}

export function HomeAdvantages() {
  const { t } = useTranslation('common');
  const cards = t('homeAdvantages.cards', { returnObjects: true }) as AdvantageCard[];

  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });

  const rotate = useTransform(scrollYProgress, [0, 1], [-5, 5]);

  return (
    <Section className="bg-brand-beige py-12 sm:py-24 lg:py-32 overflow-hidden relative" ref={containerRef}>
      <motion.div
        style={{ rotate }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-[radial-gradient(ellipse_at_center,rgba(67,133,86,0.05)_0%,transparent_70%)] pointer-events-none"
      />
      
      <Container>
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-8 items-center">
          <div className="lg:col-span-5 space-y-4 sm:space-y-8">
            <motion.h2 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-2xl sm:text-4xl lg:text-6xl font-black uppercase leading-[1.1] tracking-tight text-brand-green"
            >
              <Trans i18nKey="homeAdvantages.title" ns="common" components={{ br: <br />, 1: <span className="text-brand-green/40" /> }} />
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              className="text-sm sm:text-xl text-brand-green/80 font-medium"
            >
              {t('homeAdvantages.subtitle')}
            </motion.p>
          </div>

          <div className="lg:col-span-7 grid grid-cols-2 gap-2.5 sm:gap-4 lg:gap-6">
            {cards.map((card, i) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.05, type: 'spring' }}
                viewport={{ once: true }}
                className="bg-white p-3.5 sm:p-6 lg:p-8 rounded-2xl sm:rounded-[32px] border border-brand-green/5 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="text-2xl sm:text-4xl lg:text-5xl font-black text-brand-green/10 mb-2 sm:mb-6 group-hover:text-brand-green/20 transition-colors">
                    0{i + 1}
                  </div>
                  <h3 className="text-sm sm:text-lg lg:text-2xl font-black text-brand-green uppercase tracking-wide mb-1 sm:mb-3 line-clamp-2">
                    {card.title}
                  </h3>
                  <p className="text-[11px] sm:text-xs lg:text-sm text-brand-green/70 leading-relaxed line-clamp-3 sm:line-clamp-none">
                    {card.text}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Container>
    </Section>
  );
}

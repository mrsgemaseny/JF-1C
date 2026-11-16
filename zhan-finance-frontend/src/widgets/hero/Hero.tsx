import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { Container } from '@/shared/ui/Container';
import { Section } from '@/shared/ui/Section';
import { HandwrittenText as Handwritten } from '@/shared/ui/Handwritten';
import { useTranslation } from 'react-i18next';

export function Hero() {
  const { t } = useTranslation('common');
  return (
    <Section className="min-h-[100svh] flex items-center pt-24 sm:pt-32 pb-14 sm:pb-20 relative bg-brand-beige overflow-hidden">
      {/* Background Graphic */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-brand-green/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      
      <Container className="relative z-10 w-full">
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-8 items-center">
          
          {/* Left Column (Text) */}
          <div className="lg:col-span-7 space-y-6 sm:space-y-10 relative">
            <div className="absolute -top-16 -left-10 opacity-20 pointer-events-none hidden md:block">
              <svg width="200" height="200" viewBox="0 0 200 200" className="animate-[spin_40s_linear_infinite]">
                <path id="curve" fill="transparent" d="M 100, 100 m -75, 0 a 75,75 0 1,1 150,0 a 75,75 0 1,1 -150,0" />
                <text className="text-[12px] font-black uppercase tracking-[0.3em] fill-brand-green"><textPath href="#curve">{t('hero.circleText')}</textPath></text>
              </svg>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.21, 0.47, 0.32, 0.98] }}
            >
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl 2xl:text-[68px] font-black uppercase leading-[1.05] tracking-tight text-brand-green break-normal">
                {t('hero.title1')} <br />
                {t('hero.title2')} <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-green to-brand-green/60">{t('hero.titleHighlight')}</span>
              </h1>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.4 }}
              className="max-w-xl relative"
            >
              <p className="text-base sm:text-xl md:text-2xl text-brand-green/80 leading-relaxed font-medium">
                {t('hero.subtitle')}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 pt-2 sm:pt-4"
            >
              <a href="#contact" className="group flex items-center justify-center gap-3 px-6 sm:px-8 py-4 sm:py-5 bg-brand-green text-brand-beige rounded-2xl font-bold uppercase tracking-wider hover:bg-brand-green/90 transition-all hover:-translate-y-1 shadow-xl shadow-brand-green/20 text-sm sm:text-base">
                {t('hero.cta')}
                <ArrowUpRight className="w-5 h-5 group-hover:rotate-45 transition-transform" />
              </a>
            </motion.div>
          </div>

          {/* Right Column (Visual) */}
          <div className="lg:col-span-5 relative h-[280px] sm:h-[420px] lg:h-[600px] w-full mt-6 lg:mt-0">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, rotate: -5 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 1, delay: 0.2, type: 'spring' }}
              className="absolute inset-0 bg-white rounded-[28px] sm:rounded-[40px] shadow-2xl overflow-hidden border border-brand-green/10"
            >
              <img 
                src="https://images.unsplash.com/photo-1554200876-56c2f25224fa?q=80&w=800&auto=format&fit=crop" 
                alt="Accounting" 
                className="w-full h-full object-cover opacity-90"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-brand-green/40 to-transparent" />
            </motion.div>
          </div>
          
        </div>
      </Container>
    </Section>
  );
}

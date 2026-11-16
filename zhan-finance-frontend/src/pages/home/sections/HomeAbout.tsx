import { Section } from '@/shared/ui/Section';
import { motion } from 'framer-motion';
import { ROUTES } from '@/shared/config/routes';
import { Link } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';

const polaroids = [
  {
    id: 1,
    src: 'https://images.unsplash.com/photo-1568992687947-868a62a9f521?q=80&w=1332&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    alt: 'Office 1',
    rotation: -15,
    x: -60,
    y: -10,
    hoverX: -80,
    hoverY: -15,
    zIndex: 10,
  },
  {
    id: 2,
    src: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=600&auto=format&fit=crop',
    alt: 'Office 2',
    rotation: 12,
    x: 80,
    y: -60,
    hoverX: 100,
    hoverY: -70,
    zIndex: 20,
  },
  {
    id: 3,
    src: 'https://images.unsplash.com/photo-1730544512990-f9188f203793?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    alt: 'Office 3',
    rotation: -5,
    x: 20,
    y: 100,
    hoverX: 10,
    hoverY: 80,
    zIndex: 30,
  },
];

export function HomeAbout() {
  const { t } = useTranslation('common');
  return (
    <Section className="overflow-hidden min-h-screen flex items-center bg-white relative py-16 lg:py-0">
      <div className="grid lg:grid-cols-2 gap-8 lg:gap-24 items-center relative z-10 w-full">

        <div className="space-y-6 sm:space-y-8 order-2 lg:order-1">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black uppercase leading-[1.1] tracking-tight text-brand-green break-words">
              <Trans i18nKey="homeAbout.title" ns="common" components={{ br: <br />, 1: <span className="italic font-light" /> }} />
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
            className="space-y-6 sm:space-y-8 max-w-xl"
          >
            <p className="text-base sm:text-xl text-brand-green/80 leading-relaxed font-medium">
              {t('homeAbout.description')}
            </p>

            <Link
              to={ROUTES.ABOUT}
              className="inline-block px-6 sm:px-8 py-3.5 sm:py-4 bg-brand-green text-brand-beige rounded-2xl font-bold uppercase tracking-wider hover:bg-brand-green/90 transition-all hover:-translate-y-1 shadow-lg shadow-brand-green/20 text-sm sm:text-base"
            >
              {t('homeAbout.link')}
            </Link>
          </motion.div>
        </div>

        <div className="relative h-[320px] sm:h-[480px] lg:h-[700px] w-full flex items-center justify-center order-1 lg:order-2 scale-[0.58] sm:scale-80 md:scale-95 lg:scale-100 origin-center">
          {polaroids.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 100, rotate: 0 }}
              whileInView={{ opacity: 1, y: p.y, x: p.x, rotate: p.rotation }}
              transition={{ duration: 0.8, delay: i * 0.2, type: 'spring', bounce: 0.4 }}
              viewport={{ once: true, margin: '-100px' }}
              className="absolute bg-brand-beige p-3 pb-12 shadow-2xl rounded-sm border border-brand-green/5"
              style={{ zIndex: p.zIndex, width: '280px' }}
              whileHover={{
                scale: 1.15,
                rotate: 0,
                x: p.hoverX,
                y: p.hoverY,
                zIndex: 50,
                boxShadow: '0px 30px 60px -15px rgba(0,86,45,0.4)',
                transition: { duration: 0.4, ease: 'easeOut' },
              }}
            >
              <div className="w-full h-[280px] bg-brand-green/10 overflow-hidden relative group">
                <img
                  src={p.src}
                  alt={p.alt}
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-700 ease-out"
                />
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </Section>
  );
}

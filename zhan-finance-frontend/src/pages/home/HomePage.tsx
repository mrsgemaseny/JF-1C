import { Header } from '@/widgets/header/Header';
import { Hero } from '@/widgets/hero/Hero';
import { HomeAbout } from './sections/HomeAbout';
import { HomeServices } from './sections/HomeServices';
import { OutsourceIncluded } from './sections/OutsourceIncluded';
import { HomeAdvantages } from './sections/HomeAdvantages';
import { Trust } from '@/widgets/trust/Trust';
import { PricingTable } from '@/widgets/pricing-table/PricingTable';
import { KaspiQrPaymentCard } from '@/features/billing/ui/KaspiQrPaymentCard';
import { Section } from '@/shared/ui/Section';
import { Container } from '@/shared/ui/Container';
import { Reviews } from '@/widgets/reviews/Reviews';
import { Team } from '@/widgets/team/Team';
import { Offices } from '@/widgets/offices/Offices';
import { FaqContact } from '@/widgets/faq-contact';
import { Footer } from '@/widgets/footer/Footer';
import { ScrollToBottomButton } from '@/shared/ui/ScrollToBottomButton';
import { useTranslation } from 'react-i18next';

export function HomePage() {
  const { t } = useTranslation('landing');
  return (
    <>
      <Header />
      <main>
        <Hero />
        <HomeAbout />
        <HomeServices />
        <OutsourceIncluded />
        <HomeAdvantages />
        <Trust />
        <Section className="bg-brand-beige py-12 sm:py-24 lg:py-32 text-brand-green">
          <Container>
            <div className="max-w-3xl mb-8 sm:mb-16">
              <h2 className="text-2xl sm:text-5xl lg:text-6xl font-black uppercase leading-[1.1] tracking-tight text-brand-green mb-3 sm:mb-6">
                {t('pricing_section_title1', { defaultValue: 'Прозрачная стоимость' })} <br />
                <span className="text-brand-green/40">{t('pricing_section_title2', { defaultValue: 'без скрытых платежей' })}</span>
              </h2>
              <p className="text-sm sm:text-xl text-brand-green/80 font-medium leading-relaxed">
                {t('pricing_section_desc', { defaultValue: 'Выберите подходящий тариф под масштаб вашего бизнеса или получите индивидуальный расчет.' })}
              </p>
            </div>
            <PricingTable />
            <div id="kaspi-qr" className="mt-10 sm:mt-14 max-w-2xl mx-auto">
              <KaspiQrPaymentCard />
            </div>
          </Container>
        </Section>
        <Reviews />
        <Team />
        <Offices />
        <FaqContact />
      </main>
      <Footer />
      <ScrollToBottomButton />
    </>
  );
}


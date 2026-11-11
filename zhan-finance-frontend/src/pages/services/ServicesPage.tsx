import { Header } from '@/widgets/header/Header';
import { Footer } from '@/widgets/footer/Footer';
import { Section } from '@/shared/ui/Section';
import { PricingTable } from '@/widgets/pricing-table/PricingTable';
import { KaspiQrPaymentCard } from '@/features/billing/ui/KaspiQrPaymentCard';
import { ServicesHero } from './sections/ServicesHero';
import { ServicesCatalog } from './sections/ServicesCatalog';
import { ServicesFaqContact } from './sections/ServicesFaqContact';
import { useTranslation } from 'react-i18next';

export function ServicesPage() {
  const { t } = useTranslation('common');
  return (
    <>
      <Header />
      <main>
        <ServicesHero />

        {/* How we work */}
        <Section className="bg-brand-beige pt-28 pb-12">
          <h3 className="text-3xl font-black text-brand-green mb-6">{t('services.howWeWork.title', { defaultValue: 'Как мы работаем' })}</h3>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { title: 'Срочные отчёты за 15 минут',   text: 'Экстренные данные готовы мгновенно, чтобы вы могли оперативно принять решение.' },
              { title: 'Средний срок 1–3 рабочих дня', text: 'Большинство задач закрываем в течение трёх рабочих дней без потери качества.' },
              { title: 'Заказы принимаем 09:00–16:00', text: 'Работаем по удобному графику, чтобы вы точно знали, когда ждать подтверждение.' },
              { title: 'Контроль качества до сдачи',   text: 'Каждый отчёт проверяется внутри команды перед подачей в контролирующие органы.' },
              { title: 'Менеджер на связи',             text: 'Персональный менеджер ведёт задачу и отвечает на все вопросы во время работы.' },
              { title: 'Консультация после результата', text: 'Обсуждаем итоговую отчётность и рекомендации без дополнительной платы.' },
            ].map((item, index) => (
              <div key={index} className="bg-white rounded-2xl p-6 shadow-sm border border-brand-green/10">
                <h4 className="font-black text-lg mb-2">{t(`services.howWeWork.items.${index}.title`, { defaultValue: item.title })}</h4>
                <p className="text-brand-green/70">{t(`services.howWeWork.items.${index}.text`, { defaultValue: item.text })}</p>
              </div>
            ))}
          </div>
        </Section>

        <ServicesCatalog />

        {/* Why accounting matters */}
        <Section className="bg-brand-beige pt-28 pb-12">
          <div className="rounded-[32px] bg-brand-beige p-8 border border-brand-green/10 shadow-sm">
            <h3 className="text-3xl font-black text-brand-green mb-4">{t('services.why.title', { defaultValue: 'Зачем нужны бухгалтерские услуги и подписка?' })}</h3>
            <p className="text-lg text-brand-green/80 leading-relaxed mb-6">
              {t('services.why.description', { defaultValue: 'Профессиональное ведение бухгалтерии освобождает вас от рутинных задач, снижает риски штрафов и позволяет сосредоточиться на росте бизнеса.' })}
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { title: 'Контроль без стресса',    text: 'Все цифры в одном месте, без рисков потерять документы или сделать ошибку.' },
                { title: 'Экономия времени',         text: 'Мы ведём отчётность, вы принимаете решения на основе готовых данных.' },
                { title: 'Гарантия регулярности',   text: 'Подписка гарантирует, что отчёты, декларации и консультации идут по плану.' },
              ].map((c, index) => (
                <div key={index} className="rounded-3xl bg-white p-5 border border-brand-green/10">
                  <h4 className="text-xl font-bold text-brand-green mb-2">{t(`services.why.items.${index}.title`, { defaultValue: c.title })}</h4>
                  <p className="text-brand-green/70 text-sm">{t(`services.why.items.${index}.text`, { defaultValue: c.text })}</p>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* Pricing */}
        <Section className="bg-brand-beige py-24 sm:py-32 text-brand-green">
          <div className="max-w-3xl mb-16">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black uppercase leading-[1.1] tracking-tight text-brand-green mb-6">
              {t('landing:pricing_section_title1', { defaultValue: 'Прозрачная стоимость' })} <br />
              <span className="text-brand-green/40">{t('landing:pricing_section_title2', { defaultValue: 'без скрытых платежей' })}</span>
            </h2>
            <p className="text-xl text-brand-green/80 font-medium leading-relaxed">
              {t('landing:pricing_section_desc', { defaultValue: 'Выберите подходящий тариф под масштаб вашего бизнеса или получите индивидуальный расчет.' })}
            </p>
          </div>
          <PricingTable />
          <div id="kaspi-qr" className="mt-10 sm:mt-14 max-w-2xl mx-auto">
            <KaspiQrPaymentCard />
          </div>
        </Section>

        <ServicesFaqContact />
      </main>
      <Footer />
    </>
  );
}

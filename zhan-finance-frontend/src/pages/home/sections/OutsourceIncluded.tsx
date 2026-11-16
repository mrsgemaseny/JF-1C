import { CheckCircle2 } from 'lucide-react';
import { Section } from '@/shared/ui/Section';
import { Container } from '@/shared/ui/Container';
import { useTranslation } from 'react-i18next';

export function OutsourceIncluded() {
  const { t } = useTranslation('landing');
  const items = (t('outsource_included.items', { returnObjects: true }) as string[]) || [];

  return (
    <Section className="bg-brand-green text-brand-beige py-12 sm:py-24 lg:py-32 relative overflow-hidden">
      <Container className="relative z-10">
        <div className="max-w-3xl mb-8 sm:mb-16">
          <h2 className="text-2xl sm:text-4xl lg:text-6xl font-black uppercase leading-[1.1] tracking-tight text-white mb-3 sm:mb-6">
            {t('outsource_included.title1', { defaultValue: 'Что входит' })} <br />
            <span className="text-brand-beige/50">{t('outsource_included.title2', { defaultValue: 'в аутсорс-бухгалтерию' })}</span>
          </h2>
          <p className="text-sm sm:text-xl text-brand-beige/80 font-medium leading-relaxed">
            {t('outsource_included.subtitle', { defaultValue: 'Полный спектр регулярных работ для ведения финансового и налогового учета вашего бизнеса без скрытых доплат:' })}
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-6">
          {items.map((item, index) => (
            <div
              key={index}
              className="bg-white/10 backdrop-blur-sm rounded-xl sm:rounded-2xl p-3.5 sm:p-6 border border-brand-beige/15 shadow-sm flex items-start gap-2.5 sm:gap-4 hover:bg-white/15 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4 sm:w-6 sm:h-6 text-brand-beige shrink-0 mt-0.5" />
              <p className="text-xs sm:text-sm font-bold text-white leading-snug sm:leading-relaxed">
                {item}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-brand-beige/20 flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
          <p className="text-xs sm:text-sm font-bold uppercase tracking-wider text-brand-beige/80 text-center sm:text-left">
            {t('outsource_included.cta_text', { defaultValue: 'Нужен расчет под ваш оборот и количество операций?' })}
          </p>
          <button
            onClick={() => (document.getElementById('contact') || document.getElementById('footer'))?.scrollIntoView({ behavior: 'smooth' })}
            className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 bg-brand-beige text-brand-green rounded-xl sm:rounded-2xl font-bold uppercase tracking-wider hover:bg-white transition-all text-xs sm:text-sm whitespace-nowrap shadow-lg shadow-black/20 hover:-translate-y-0.5"
          >
            {t('outsource_included.cta_btn', { defaultValue: 'Получить консультацию' })}
          </button>
        </div>
      </Container>
    </Section>
  );
}

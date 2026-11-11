import { motion } from 'framer-motion';
import { pricingPlans } from '@/shared/config/content/pricing-plans';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';

export function PricingTable() {
  const { t } = useTranslation('landing');
  return (
    <div className="w-full">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-5 items-stretch">
        {pricingPlans.map((plan) => (
          <motion.div
            key={plan.titleKey}
            className={`p-3.5 sm:p-6 rounded-xl sm:rounded-2xl flex flex-col justify-between transition-all ${
              plan.highlighted
                ? 'bg-white text-brand-green border-2 border-brand-green shadow-lg'
                : 'bg-white text-brand-green border border-brand-green/10 hover:border-brand-green/30 shadow-sm'
            }`}
            whileHover={{ y: -4 }}
            transition={{ duration: 0.2 }}
          >
            <div>
              <div className="flex items-center justify-between gap-1 mb-1">
                <h4 className="text-sm sm:text-xl font-black uppercase tracking-tight line-clamp-1">{t(plan.titleKey)}</h4>
                {plan.highlighted && (
                  <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-wider bg-brand-green text-brand-beige px-1.5 sm:px-2.5 py-0.5 rounded-full shrink-0">
                    {t('pricing_hit', { defaultValue: 'Хит' })}
                  </span>
                )}
              </div>
              <p className="text-[10px] sm:text-xs text-brand-green/70 mb-2 sm:mb-3 min-h-0 sm:min-h-[28px] leading-snug line-clamp-2">{t(plan.subtitleKey)}</p>
              <div className="text-sm sm:text-2xl font-black text-brand-green mb-2 sm:mb-4 pb-2 sm:pb-3 border-b border-brand-green/10">
                {t(plan.priceKey)}
              </div>
              <ul className="text-[10px] sm:text-xs space-y-1.5 sm:space-y-2 mb-3 sm:mb-6 text-brand-green/80">
                {plan.featuresKeys.map((fKey) => (
                  <li key={fKey} className="flex items-start gap-1.5 leading-tight sm:leading-snug">
                    <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-brand-green shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{t(fKey)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <button
              onClick={() => (document.getElementById('kaspi-qr') || document.getElementById('contact') || document.getElementById('footer'))?.scrollIntoView({ behavior: 'smooth' })}
              className={`w-full py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-bold uppercase tracking-wider text-[10px] sm:text-xs transition-all cursor-pointer ${
                plan.highlighted
                  ? 'bg-brand-green text-brand-beige hover:bg-brand-green/90 shadow-md'
                  : 'bg-brand-green/5 text-brand-green hover:bg-brand-green hover:text-brand-beige border border-brand-green/15'
              }`}
            >
              {t('pricing_choose_plan', { defaultValue: 'Выбрать тариф' })}
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

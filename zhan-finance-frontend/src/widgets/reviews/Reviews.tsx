import { Section } from '@/shared/ui/Section';
import { Container } from '@/shared/ui/Container';
import { Star, ExternalLink, Quote } from 'lucide-react';
import { reviewsRow1, reviewsRow2, Review } from '@/shared/config/content/reviews';
import { useTranslation } from 'react-i18next';

interface ReviewCardProps {
  review: Review;
}

function ReviewCard({ review }: ReviewCardProps) {
  const { t } = useTranslation('landing');
  const rating = review.rating || 5;

  return (
    <article className="w-[300px] sm:w-[380px] shrink-0 p-5 sm:p-6 bg-brand-beige/35 hover:bg-brand-beige/70 border border-brand-green/10 rounded-2xl sm:rounded-3xl transition-all duration-300 shadow-sm flex flex-col justify-between select-none">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1 text-amber-500">
            {Array.from({ length: rating }).map((_, idx) => (
              <Star key={idx} className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-amber-500 text-amber-500" />
            ))}
          </div>
          <Quote className="w-4 h-4 sm:w-5 sm:h-5 text-brand-green/20" />
        </div>
        <p className="text-xs sm:text-sm text-brand-green/85 leading-relaxed font-normal">
          &quot;{t(review.textKey)}&quot;
        </p>
      </div>
      <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-brand-green/10 flex items-center justify-between">
        <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-brand-green">
          {t(review.nameKey)}
        </span>
        <span className="text-[10px] sm:text-xs font-semibold text-brand-green/60">
          {t(review.companyKey)}
        </span>
      </div>
    </article>
  );
}

export function Reviews() {
  const { t } = useTranslation('landing');

  // Double sets ensure seamless -50% CSS translation wrap on all screen widths
  const row1 = [...reviewsRow1, ...reviewsRow1];
  const row2 = [...reviewsRow2, ...reviewsRow2];

  return (
    <Section className="bg-white py-14 sm:py-20 lg:py-24 overflow-hidden relative">
      <Container>
        <div className="flex flex-col md:flex-row gap-4 sm:gap-12 items-start md:items-end justify-between mb-8 sm:mb-14">
          <div className="max-w-2xl">
            <h2 className="text-2xl sm:text-5xl lg:text-6xl font-black uppercase leading-[1.08] tracking-tight text-brand-green break-words">
              {t('reviews_title1', { defaultValue: 'Что говорят' })} <br />
              <span className="text-brand-green/40">{t('reviews_title2', { defaultValue: 'клиенты' })}</span>
            </h2>
            <p className="mt-3 text-xs sm:text-base text-brand-green/75 max-w-xl font-normal leading-relaxed">
              {t('reviews_desc', { defaultValue: 'Реальные истории компаний, которые доверили нам свою бухгалтерию.' })}
            </p>
          </div>

          <a
            href="https://2gis.kz/shymkent/firm/70000001060962340"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-green/10 hover:bg-brand-green text-brand-green hover:text-brand-beige transition-all text-xs sm:text-sm font-bold tracking-tight shadow-sm self-start md:self-auto"
          >
            <Star className="w-4 h-4 fill-amber-500 text-amber-500 shrink-0" />
            <span>{t('reviews_rating_badge', { defaultValue: '4,8 · 29 отзывов в 2GIS' })}</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-70 shrink-0" />
          </a>
        </div>
      </Container>

      {/* Marquee dual-track container with pause-on-hover and edge fading mask */}
      <div className="w-full overflow-hidden marquee-mask marquee-pause space-y-3 sm:space-y-4">
        {/* Row 1: Leftward continuous scroll */}
        <div className="overflow-hidden">
          <div className="flex w-max gap-3 sm:gap-5 animate-marquee-left">
            {row1.map((review, idx) => (
              <ReviewCard key={`r1-${review.id}-${idx}`} review={review} />
            ))}
          </div>
        </div>

        {/* Row 2: Rightward continuous scroll */}
        <div className="overflow-hidden">
          <div className="flex w-max gap-3 sm:gap-5 animate-marquee-right">
            {row2.map((review, idx) => (
              <ReviewCard key={`r2-${review.id}-${idx}`} review={review} />
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}

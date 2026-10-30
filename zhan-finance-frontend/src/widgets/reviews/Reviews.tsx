import { Section } from '@/shared/ui/Section';
import { Container } from '@/shared/ui/Container';
import { Star } from 'lucide-react';
import { reviewsRow1, reviewsRow2, Review } from '@/shared/config/content/reviews';
import { useTranslation } from 'react-i18next';

interface ReviewCardProps {
  review: Review;
}

function ReviewCard({ review }: ReviewCardProps) {
  const { t } = useTranslation('landing');
  const rating = review.rating || 5;

  return (
    <article className="w-[300px] sm:w-[340px] shrink-0 p-5 sm:p-6 bg-white border border-brand-green/10 rounded-[22px] sm:rounded-[24px] shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] hover:shadow-md transition-shadow duration-300 flex flex-col justify-between select-none">
      <div>
        <div className="flex items-center gap-1 mb-3 text-brand-green">
          {Array.from({ length: rating }).map((_, idx) => (
            <Star key={idx} className="w-3.5 h-3.5 fill-brand-green text-brand-green" />
          ))}
        </div>
        <p className="text-[13.5px] sm:text-[14.5px] text-brand-green/90 leading-[1.55] font-normal">
          {t(review.textKey)}
        </p>
      </div>
      <div className="mt-4 flex items-center justify-between text-xs text-brand-green/60 font-medium">
        <span className="font-bold text-brand-green/80">{t(review.nameKey)}</span>
        <span className="text-[11px] opacity-75">{t(review.companyKey)}</span>
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
    <Section className="bg-[#edf2ee] py-14 sm:py-20 lg:py-24 overflow-hidden relative">
      <Container className="text-center mb-8 sm:mb-12">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-brand-green tracking-tight">
          {t('reviews_title1', { defaultValue: 'Отзывы' })}
        </h2>
        <div className="mt-2.5">
          <a
            href="https://2gis.kz/shymkent/firm/70000001060962340"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm sm:text-base font-bold text-brand-green/90 hover:text-brand-green hover:underline transition-all"
          >
            <Star className="w-4 h-4 fill-brand-green text-brand-green shrink-0" />
            <span>{t('reviews_rating_badge', { defaultValue: '4,8 · 29 отзывов в 2GIS' })}</span>
          </a>
        </div>
      </Container>

      {/* Marquee dual-track container with pause-on-hover and tight edge fades */}
      <div className="relative w-full overflow-hidden marquee-pause">
        {/* Left & Right Tight Edge Fading Overlays (hugged close to screen borders) */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-6 sm:w-12 bg-gradient-to-r from-[#edf2ee] to-transparent z-10" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-6 sm:w-12 bg-gradient-to-l from-[#edf2ee] to-transparent z-10" />

        <div className="space-y-3.5 sm:space-y-4">
          {/* Row 1: Leftward continuous scroll */}
          <div className="overflow-hidden">
            <div className="flex w-max gap-3.5 sm:gap-4 animate-marquee-left">
              {row1.map((review, idx) => (
                <ReviewCard key={`r1-${review.id}-${idx}`} review={review} />
              ))}
            </div>
          </div>

          {/* Row 2: Rightward continuous scroll */}
          <div className="overflow-hidden">
            <div className="flex w-max gap-3.5 sm:gap-4 animate-marquee-right">
              {row2.map((review, idx) => (
                <ReviewCard key={`r2-${review.id}-${idx}`} review={review} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

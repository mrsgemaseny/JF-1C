import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Section } from '@/shared/ui/Section';
import { Container } from '@/shared/ui/Container';
import { teamLeader, teamSpecialists, TeamMember } from '@/shared/config/content/team';
import { useTranslation } from 'react-i18next';
import { LayoutGrid, Sliders, ChevronLeft, ChevronRight, X, PhoneCall, CheckCircle, Shield, ArrowRight } from 'lucide-react';

export function Team() {
  const { t } = useTranslation('landing');
  const [viewMode, setViewMode] = useState<'grid' | 'carousel'>('grid');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const touchStartRef = useRef<{ startX: number } | null>(null);

  const allMembers = [teamLeader, ...teamSpecialists];

  return (
    <Section className="bg-brand-beige py-12 sm:py-20 lg:py-24 overflow-hidden relative">
      <Container className="max-w-[1200px]">
        {/* Heading & View Switcher */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6 mb-6 sm:mb-14">
          <div>
            <h2 className="text-2xl sm:text-5xl lg:text-6xl font-black uppercase leading-[1.05] tracking-tight text-brand-green break-words">
              {t('team_title', { defaultValue: 'Команда' })} <br />
              <span className="text-brand-green/40">{t('team_subtitle', { defaultValue: 'экспертов' })}</span>
            </h2>
            <p className="mt-2 text-xs sm:text-base text-brand-green/75 max-w-xl">
              {t('team_desc', { defaultValue: 'За каждым проектом стоят квалифицированные специалисты с многолетним опытом в бухгалтерии и налогах РК.' })}
            </p>
          </div>

          {/* Mode switch */}
          <div className="flex items-center gap-1 p-1 bg-brand-green/10 rounded-2xl self-start md:self-auto">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all ${
                viewMode === 'grid'
                  ? 'bg-brand-green text-brand-beige shadow-sm'
                  : 'text-brand-green/70 hover:text-brand-green'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              {t('team_mode_grid', { defaultValue: 'Сетка' })}
            </button>
            <button
              onClick={() => setViewMode('carousel')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all ${
                viewMode === 'carousel'
                  ? 'bg-brand-green text-brand-beige shadow-sm'
                  : 'text-brand-green/70 hover:text-brand-green'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              {t('team_mode_carousel', { defaultValue: 'Карусель' })}
            </button>
          </div>
        </div>

        {/* --- VIEW MODE 1: STRICT GRID (1 LEADER + 8 SPECIALISTS) --- */}
        {viewMode === 'grid' && (
          <div>
            {/* РУКОВОДИТЕЛЬ (ВЫДЕЛЕН) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              onClick={() => setSelectedMember(teamLeader)}
              className="group cursor-pointer flex flex-col sm:flex-row items-center sm:items-start md:items-center gap-4 sm:gap-8 md:gap-12 p-4 sm:p-8 md:p-11 rounded-2xl sm:rounded-[28px] bg-brand-green/[0.08] border border-brand-green/20 mb-6 sm:mb-14 shadow-sm hover:shadow-xl hover:border-brand-green/40 transition-all"
            >
              <div className="shrink-0 w-28 h-36 sm:w-52 sm:h-64 md:w-56 md:h-72 rounded-xl sm:rounded-[20px] overflow-hidden bg-brand-green/10 border border-brand-green/20 relative shadow-inner">
                {teamLeader.photo ? (
                  <img src={teamLeader.photo} alt={t(teamLeader.nameKey)} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-brand-green/40">
                    <svg className="w-1/2 h-1/2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="text-center sm:text-left flex-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-brand-green text-brand-beige text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mb-2 sm:mb-3">
                  <Shield className="w-3 h-3" />
                  {t(teamLeader.roleKey)}
                </div>
                <h3 className="text-base sm:text-2xl md:text-4xl font-black uppercase tracking-tight text-brand-green leading-[1.15] mb-2 sm:mb-4">
                  {t(teamLeader.nameKey)}
                </h3>
                {teamLeader.bioKey && (
                  <p className="text-xs sm:text-sm md:text-base text-brand-green/85 leading-relaxed max-w-2xl mb-2 sm:mb-4 line-clamp-3 sm:line-clamp-none">
                    {t(teamLeader.bioKey)}
                  </p>
                )}
                <div className="pt-2">
                  <span className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-brand-green text-brand-beige text-xs sm:text-sm font-bold uppercase tracking-wider shadow-sm group-hover:bg-brand-green/90 group-hover:shadow-md transition-all">
                    <span>{t('team_view_details', { defaultValue: 'Подробнее о специалисте' })}</span>
                    <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                </div>
              </div>
            </motion.div>

            {/* СЕТКА СПЕЦИАЛИСТОВ (2x4 на мобилке, 4x2 на десктопе) */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-6">
              {teamSpecialists.map((member, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  viewport={{ once: true }}
                  onClick={() => setSelectedMember(member)}
                  className="group cursor-pointer"
                >
                  <div className="relative aspect-[3/4] rounded-2xl sm:rounded-[24px] overflow-hidden bg-brand-green/[0.08] border border-brand-green/20 shadow-sm group-hover:shadow-xl group-hover:border-brand-green/40 transition-all duration-300">
                    {member.photo ? (
                      <img
                        src={member.photo}
                        alt={t(member.nameKey)}
                        className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-brand-green/40 pb-10 sm:pb-16 transition-all duration-300 group-hover:scale-105">
                        <svg className="w-1/3 h-1/3 sm:w-1/2 sm:h-1/2" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                      </div>
                    )}

                    <div className="absolute inset-x-1.5 bottom-1.5 sm:inset-x-3 sm:bottom-3 p-2 sm:p-3.5 rounded-xl sm:rounded-2xl bg-brand-green/85 backdrop-blur-md border border-white/15 transition-opacity duration-300 group-hover:opacity-0 pointer-events-none text-left shadow-lg">
                      <p className="font-bold text-xs sm:text-base text-brand-beige leading-snug mb-0.5 line-clamp-1">
                        {t(member.nameKey)}
                      </p>
                      <p className="text-[9px] sm:text-[11px] font-medium uppercase tracking-wider text-brand-beige/80 line-clamp-1">
                        {t(member.roleKey)}
                      </p>
                    </div>

                    <div className="absolute inset-0 bg-brand-green/90 backdrop-blur-md p-3 sm:p-6 flex flex-col justify-center items-center text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 text-brand-beige">
                      <p className="font-bold text-xs sm:text-lg text-brand-beige mb-1 leading-snug line-clamp-2">
                        {t(member.nameKey)}
                      </p>
                      <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-brand-beige/80 mb-2 sm:mb-3 pb-1 sm:pb-2 border-b border-brand-beige/20 w-3/4 line-clamp-1">
                        {t(member.roleKey)}
                      </p>
                      {member.bioKey && (
                        <p className="text-[10px] sm:text-xs leading-relaxed text-brand-beige/90 font-normal line-clamp-3 sm:line-clamp-4 mb-2 sm:mb-4 hidden xs:block">
                          {t(member.bioKey)}
                        </p>
                      )}
                      <span className="text-[9px] sm:text-[11px] font-bold uppercase tracking-wider bg-brand-beige text-brand-green px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full">
                        {t('team_more_btn', { defaultValue: 'Открыть профиль' })}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* --- VIEW MODE 2: INFINITE CAROUSEL --- */}
        {viewMode === 'carousel' && (() => {
          const total = allMembers.length;
          const next = () => setCurrentIndex((prev) => (prev + 1) % total);
          const prev = () => setCurrentIndex((prev) => (prev - 1 + total) % total);

          // Get 4 consecutive members for desktop, 2 for tablet, 1 for mobile with circular indexing
          const getCard = (offset: number) => allMembers[(currentIndex + offset + total) % total];

          return (
            <div className="relative">
              {/* Carousel Controls */}
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-brand-green/60">
                    {String(currentIndex + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
                  </span>
                  <div className="flex gap-1 ml-2">
                    {allMembers.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentIndex(i)}
                        className={`h-1.5 rounded-full transition-all ${
                          i === currentIndex
                            ? 'w-6 bg-brand-green'
                            : 'w-1.5 bg-brand-green/20 hover:bg-brand-green/40'
                        }`}
                        aria-label={`Go to slide ${i + 1}`}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={prev}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-brand-green text-brand-beige flex items-center justify-center hover:bg-brand-green/90 active:scale-95 transition-all shadow-sm"
                    aria-label="Previous specialist"
                  >
                    <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  <button
                    onClick={next}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-brand-green text-brand-beige flex items-center justify-center hover:bg-brand-green/90 active:scale-95 transition-all shadow-sm"
                    aria-label="Next specialist"
                  >
                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>
              </div>

              {/* Infinite Sliding Cards Track */}
              <div
                className="overflow-hidden touch-pan-y select-none"
                onTouchStart={(e) => {
                  const touch = e.touches[0];
                  touchStartRef.current = { startX: touch.clientX };
                }}
                onTouchEnd={(e) => {
                  const touch = e.changedTouches[0];
                  const startX = touchStartRef.current?.startX ?? 0;
                  const diff = touch.clientX - startX;
                  if (diff > 40) prev();
                  else if (diff < -40) next();
                }}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {[0, 1, 2].map((offset) => {
                    const member = getCard(offset);
                    const isExtraCardOnMobile = offset > 0;
                    const isExtraCardOnTablet = offset > 1;

                    return (
                      <motion.div
                        key={`${member.nameKey}-${(currentIndex + offset) % total}`}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                        onClick={() => setSelectedMember(member)}
                        className={`group cursor-pointer ${
                          isExtraCardOnMobile ? 'hidden sm:block' : ''
                        } ${isExtraCardOnTablet ? 'hidden lg:block' : ''}`}
                      >
                        <div className="relative aspect-[3/4] rounded-2xl sm:rounded-[24px] overflow-hidden bg-brand-green/[0.08] border border-brand-green/20 shadow-sm group-hover:shadow-xl group-hover:border-brand-green/40 transition-all duration-300">
                          {member.photo ? (
                            <img
                              src={member.photo}
                              alt={t(member.nameKey)}
                              className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-brand-green/40 pb-10 sm:pb-16">
                              <svg className="w-1/3 h-1/3 sm:w-1/2 sm:h-1/2" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                              </svg>
                            </div>
                          )}

                          <div className="absolute inset-x-2 bottom-2 sm:inset-x-3 sm:bottom-3 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-brand-green/85 backdrop-blur-md border border-white/15 text-left shadow-lg">
                            <p className="font-bold text-sm sm:text-base text-brand-beige leading-snug mb-0.5 line-clamp-1">
                              {t(member.nameKey)}
                            </p>
                            <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-brand-beige/80 line-clamp-1">
                              {t(member.roleKey)}
                            </p>
                          </div>

                          <div className="absolute inset-0 bg-brand-green/90 backdrop-blur-md p-4 sm:p-6 flex flex-col justify-center items-center text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 text-brand-beige">
                            <p className="font-bold text-sm sm:text-lg text-brand-beige mb-1 leading-snug line-clamp-2">
                              {t(member.nameKey)}
                            </p>
                            <p className="text-xs font-medium uppercase tracking-wider text-brand-beige/80 mb-2 sm:mb-3 pb-1 sm:pb-2 border-b border-brand-beige/20 w-3/4 line-clamp-1">
                              {t(member.roleKey)}
                            </p>
                            {member.bioKey && (
                              <p className="text-xs leading-relaxed text-brand-beige/90 font-normal line-clamp-3 sm:line-clamp-4 mb-3 sm:mb-4">
                                {t(member.bioKey)}
                              </p>
                            )}
                            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider bg-brand-beige text-brand-green px-3 py-1.5 rounded-full">
                              {t('team_more_btn', { defaultValue: 'Открыть профиль' })}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}

        {/* --- DETAIL MODAL ON CARD SELECTION --- */}
        <AnimatePresence>
          {selectedMember && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-brand-beige rounded-[32px] p-6 sm:p-8 max-w-xl w-full border border-brand-green/20 shadow-2xl relative text-brand-green max-h-[90vh] overflow-y-auto"
              >
                <button
                  onClick={() => setSelectedMember(null)}
                  className="absolute top-5 right-5 p-2 rounded-full bg-brand-green/10 text-brand-green hover:bg-brand-green hover:text-brand-beige transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-6">
                  <div className="w-28 h-36 rounded-2xl overflow-hidden bg-brand-green/10 border border-brand-green/20 shrink-0">
                    {selectedMember.photo ? (
                      <img src={selectedMember.photo} alt={t(selectedMember.nameKey)} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-brand-green/40">
                        <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div>
                    <span className="inline-block text-xs font-bold uppercase tracking-wider text-brand-green/70 bg-brand-green/10 px-3 py-1 rounded-full mb-2">
                      {t(selectedMember.roleKey)}
                    </span>
                    <h3 className="text-2xl font-black uppercase tracking-tight text-brand-green mb-2">
                      {t(selectedMember.nameKey)}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-brand-green/80">
                      <CheckCircle className="w-4 h-4 text-brand-green" />
                      <span>{t('team_certified_specialist', { defaultValue: 'Сертифицированный специалист ЖАН FINANCE' })}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-brand-green/10 pt-4 mb-6 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-brand-green/60">
                    {t('team_about_specialist', { defaultValue: 'Опыт и специализация' })}
                  </h4>
                  {selectedMember.bioKey && (
                    <p className="text-sm text-brand-green/90 leading-relaxed">
                      {t(selectedMember.bioKey)}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 mb-6">
                  {['1С:Предприятие 8.3', 'ИС ЭСФ и СНТ', 'Налоговый кодекс РК', 'Кабинет НП', 'Кадровый учет'].map((tag) => (
                    <span key={tag} className="text-[11px] font-bold bg-white px-3 py-1 rounded-lg border border-brand-green/10 text-brand-green/80">
                      {tag}
                    </span>
                  ))}
                </div>

                <button
                  onClick={() => {
                    setSelectedMember(null);
                    setTimeout(() => (document.getElementById('contact') || document.getElementById('footer'))?.scrollIntoView({ behavior: 'smooth' }), 100);
                  }}
                  className="w-full py-4 bg-brand-green text-brand-beige rounded-2xl font-bold uppercase tracking-wider text-xs hover:bg-brand-green/90 transition-all flex items-center justify-center gap-2 shadow-lg"
                >
                  <PhoneCall className="w-4 h-4" />
                  {t('team_consult_btn', { defaultValue: 'Получить консультацию с этим специалистом' })}
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </Container>
    </Section>
  );
}

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ScrollToBottomButtonProps {
  targetId?: string;
  className?: string;
}

export function ScrollToBottomButton({ targetId = 'contact', className = '' }: ScrollToBottomButtonProps) {
  const { t } = useTranslation('common');
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      const windowHeight = window.innerHeight;
      const scrollY = window.scrollY || window.pageYOffset;
      const totalHeight = document.documentElement.scrollHeight;
      
      // Hide button when reaching near the footer
      const isNearBottom = scrollY + windowHeight >= totalHeight - 450;
      setIsVisible(!isNearBottom);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToFooter = () => {
    const targetElement = document.getElementById(targetId) || document.getElementById('footer') || document.querySelector('footer');
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          type="button"
          onClick={scrollToFooter}
          initial={{ opacity: 0, scale: 0.7, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.7, y: 15 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className={`fixed bottom-5 right-5 sm:bottom-7 sm:right-7 z-40 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-brand-green text-brand-beige border border-brand-green/20 shadow-lg shadow-black/20 flex items-center justify-center cursor-pointer hover:bg-brand-green/90 transition-colors group focus:outline-none focus:ring-2 focus:ring-brand-green/40 ${className}`}
          aria-label={t('scrollToFooter', { defaultValue: 'Прокрутить вниз к контактам' })}
          title={t('scrollToFooter', { defaultValue: 'Прокрутить вниз к контактам' })}
        >
          <ArrowDown className="w-5 h-5 group-hover:translate-y-0.5 transition-transform duration-200" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}

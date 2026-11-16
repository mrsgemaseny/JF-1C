import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useEscapeKey } from '@/shared/lib/hooks/useEscapeKey';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string | React.ReactNode;
}

export function SuccessModal({ isOpen, onClose, title, message }: SuccessModalProps) {

  const { t } = useTranslation(['modals', 'common']);
  const displayTitle = title || t('ui.successModal.title', { defaultValue: 'Успешно!' });

  useEscapeKey(() => onClose(), isOpen);


  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg rounded-3xl bg-white p-8 text-center shadow-2xl"
          >
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-brand-green/10">
              <CheckCircle2 className="h-8 w-8 text-brand-green" />
            </div>
            <h3 className="mb-4 text-2xl font-black uppercase text-brand-green">{displayTitle}</h3>
            <p className="mb-8 text-brand-green/70">{message}</p>
            <button
              onClick={onClose}
              className="w-full rounded-xl bg-brand-green py-3.5 font-bold uppercase tracking-wider text-brand-beige transition hover:bg-brand-green/90"
            >
              {t('ui.successModal.button', { defaultValue: 'Отлично' })}
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

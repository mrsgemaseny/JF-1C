import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CreditCard, Loader2, AlertCircle, QrCode } from 'lucide-react';
import {
  onlinePaymentApi,
  isTrustedPaymentRedirect,
  OnlinePaymentOptionsDto,
} from '@/entities/billing/api/onlinePaymentApi';

interface OnlinePaymentPanelProps {
  invoiceId: number;
  amount: number;
}

/** Card payment (Freedom Pay) and the Kaspi account hint for one issued invoice. */
export const OnlinePaymentPanel: React.FC<OnlinePaymentPanelProps> = ({ invoiceId, amount }) => {
  const { t } = useTranslation(['common']);
  const [options, setOptions] = useState<OnlinePaymentOptionsDto | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    onlinePaymentApi
      .getOptions()
      .then((o) => {
        if (!cancelled) setOptions(o);
      })
      .catch(() => {
        // No online options means the manual methods below remain the only ones.
        if (!cancelled) setOptions(null);
      });
    return () => {
      cancelled = true;
    };
  }, [invoiceId]);

  if (!options || (!options.freedomPayEnabled && !options.kaspiPayEnabled)) return null;

  const handlePayByCard = async () => {
    setError(null);
    setIsStarting(true);
    try {
      const intent = await onlinePaymentApi.startFreedomPayment(invoiceId);
      if (!isTrustedPaymentRedirect(intent.redirectUrl)) {
        throw new Error('untrusted redirect');
      }
      window.location.assign(intent.redirectUrl);
    } catch {
      setError(t('billing.onlinePay.startError', { defaultValue: 'Не удалось начать оплату.' }));
      setIsStarting(false);
    }
  };

  const formattedAmount = new Intl.NumberFormat('ru-RU').format(amount) + ' ₸';

  return (
    <div className="space-y-3" data-testid="online-payment-panel">
      {options.freedomPayEnabled && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <CreditCard className="w-4 h-4 text-emerald-700" />
            {t('billing.onlinePay.cardTitle', { defaultValue: 'Оплата картой онлайн' })}
          </div>
          <p className="text-xs text-gray-600">
            {t('billing.onlinePay.cardDesc', {
              defaultValue: 'Безопасная оплата через Freedom Pay. После оплаты подписка активируется автоматически.',
            })}
          </p>
          {error && (
            <div role="alert" className="flex items-center gap-2 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <button
            type="button"
            onClick={handlePayByCard}
            disabled={isStarting}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold text-sm rounded-lg transition cursor-pointer flex items-center justify-center gap-2"
          >
            {isStarting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('billing.onlinePay.redirecting', { defaultValue: 'Переход к оплате...' })}
              </>
            ) : (
              t('billing.onlinePay.cardBtn', { amount: formattedAmount, defaultValue: `Оплатить ${formattedAmount} картой` })
            )}
          </button>
        </div>
      )}

      {options.kaspiPayEnabled && (
        <div className="rounded-xl border border-red-100 bg-red-50/50 p-4 space-y-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <QrCode className="w-4 h-4 text-[#f14635]" />
            {t('billing.onlinePay.kaspiHintTitle', { defaultValue: 'Оплата в Kaspi.kz по номеру счёта' })}
          </div>
          <p className="text-xs text-gray-600">
            {t('billing.onlinePay.kaspiHint', {
              invoiceId,
              defaultValue: `В приложении Kaspi.kz откройте Платежи, найдите ЖАН FINANCE и укажите номер счёта ${invoiceId}.`,
            })}
          </p>
        </div>
      )}
    </div>
  );
};

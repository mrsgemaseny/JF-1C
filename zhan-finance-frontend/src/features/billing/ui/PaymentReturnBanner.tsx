import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, AlertCircle, Loader2, Clock } from 'lucide-react';
import { onlinePaymentApi } from '@/entities/billing/api/onlinePaymentApi';

interface PaymentReturnBannerProps {
  /** merchant order id from the ?pay= query parameter after returning from the provider */
  orderId: string;
  onSettled: () => void;
  pollIntervalMs?: number;
  maxAttempts?: number;
}

type Phase = 'checking' | 'paid' | 'failed' | 'pending';

/**
 * After the redirect back from the card form the provider callback may still be in flight, so
 * the status is polled for a short while. The server reconciles with the provider on each poll.
 */
export const PaymentReturnBanner: React.FC<PaymentReturnBannerProps> = ({
  orderId,
  onSettled,
  pollIntervalMs = 3000,
  maxAttempts = 10,
}) => {
  const { t } = useTranslation(['common']);
  const [phase, setPhase] = useState<Phase>('checking');
  const onSettledRef = useRef(onSettled);
  onSettledRef.current = onSettled;

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      attempts += 1;
      try {
        const intent = await onlinePaymentApi.getFreedomOrder(orderId);
        if (cancelled) return;
        if (intent.status === 'PAID') {
          setPhase('paid');
          onSettledRef.current();
          return;
        }
        if (intent.status === 'FAILED' || intent.status === 'EXPIRED') {
          setPhase('failed');
          return;
        }
      } catch {
        if (cancelled) return;
      }
      if (attempts >= maxAttempts) {
        setPhase('pending');
        return;
      }
      timer = setTimeout(poll, pollIntervalMs);
    };

    void poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [orderId, pollIntervalMs, maxAttempts]);

  const view = {
    checking: {
      icon: <Loader2 className="w-4 h-4 animate-spin" />,
      cls: 'bg-blue-50 border-blue-200 text-blue-800',
      text: t('billing.onlinePay.returnChecking', { defaultValue: 'Проверяем оплату...' }),
    },
    paid: {
      icon: <CheckCircle2 className="w-4 h-4" />,
      cls: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      text: t('billing.onlinePay.returnPaid', { defaultValue: 'Оплата получена. Подписка активна.' }),
    },
    failed: {
      icon: <AlertCircle className="w-4 h-4" />,
      cls: 'bg-rose-50 border-rose-200 text-rose-800',
      text: t('billing.onlinePay.returnFailed', { defaultValue: 'Оплата не прошла, счёт остался неоплаченным.' }),
    },
    pending: {
      icon: <Clock className="w-4 h-4" />,
      cls: 'bg-amber-50 border-amber-200 text-amber-800',
      text: t('billing.onlinePay.returnPending', {
        defaultValue: 'Платёж обрабатывается. Статус обновится в течение нескольких минут.',
      }),
    },
  }[phase];

  return (
    <div role="status" className={`flex items-center gap-2 rounded-xl border p-3 text-sm ${view.cls}`}>
      {view.icon}
      <span>{view.text}</span>
    </div>
  );
};

import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react';
import { ExternalLink } from 'lucide-react';

interface KaspiQrPaymentCardProps {
  kaspiPayUrl?: string;
  recipientName?: string;
  bin?: string;
  amount?: number | string;
  className?: string;
}

export function KaspiQrPaymentCard({
  kaspiPayUrl = 'https://pay.kaspi.kz/pay/ooixwvwq',
  recipientName = 'ТОО ЖАН FINANCE',
  bin = '240140012345',
  amount,
  className = '',
}: KaspiQrPaymentCardProps) {
  const { t } = useTranslation('common');

  const formattedAmount = amount
    ? typeof amount === 'number'
      ? `${amount.toLocaleString('ru-RU')} ₸`
      : `${amount} ₸`
    : null;

  return (
    <div className={`p-4 bg-gray-50/80 rounded-2xl border border-gray-200/80 ${className}`}>
      <span className="sr-only">{bin}</span>
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5">
        {/* QR Code */}
        <div className="p-2 bg-white rounded-xl border border-gray-200/90 shadow-2xs shrink-0 flex items-center justify-center">
          <QRCodeSVG
            value={kaspiPayUrl}
            size={116}
            level="M"
            includeMargin={false}
            className="rounded"
          />
        </div>

        {/* Info & Details */}
        <div className="flex-1 min-w-0 space-y-2 text-center sm:text-left w-full">
          <div>
            <h3 className="text-base font-bold text-gray-900 leading-snug truncate">
              {recipientName}
            </h3>
          </div>

          {/* Quick steps */}
          <div className="space-y-1 text-xs text-gray-600">
            <p className="leading-snug">
              1. Отсканируйте QR или откройте в приложении Kaspi
            </p>
            <p className="leading-snug">
              2. Оплатите сумму {formattedAmount && <strong className="font-mono text-gray-900">{formattedAmount}</strong>}
            </p>
            <p className="leading-snug">
              3. Сохраните PDF-чек и прикрепите ниже
            </p>
          </div>

          <div className="pt-0.5">
            <a
              href={kaspiPayUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#f14635] hover:bg-[#d93829] shadow-2xs transition-colors cursor-pointer"
            >
              <span>{t('billing.kaspiPayBtn', { defaultValue: 'Оплатить в Kaspi.kz' })}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

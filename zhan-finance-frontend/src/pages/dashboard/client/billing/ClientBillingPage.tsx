import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  CreditCard, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  ShieldCheck, 
  RefreshCw,
  Copy,
  Check,
  Building2,
  FileCheck,
  Layers
} from 'lucide-react';
import { billingApi, InvoiceDto, SubscriptionDto } from '@/entities/billing/api/billingApi';
import { paymentReceiptApi, PaymentReceiptDto, PaymentRequisitesDto } from '@/entities/billing/api/paymentReceiptApi';
import { PaymentModal } from '@/features/billing/ui/PaymentModal';
import { KaspiQrPaymentCard } from '@/features/billing/ui/KaspiQrPaymentCard';
import { PaymentHistoryTable } from '@/features/billing/ui/PaymentHistoryTable';
import { BILLING_PLANS, getLocalizedPlanName, getPlanIdBySubscription } from '@/entities/billing/model/billingPlans';

export const ClientBillingPage: React.FC = () => {
  const { t, i18n } = useTranslation(['common', 'landing']);
  const [subscriptions, setSubscriptions] = useState<SubscriptionDto[]>([]);
  const [invoices, setInvoices] = useState<InvoiceDto[]>([]);
  const [invoicesError, setInvoicesError] = useState(false);
  const [receipts, setReceipts] = useState<PaymentReceiptDto[]>([]);
  const [requisites, setRequisites] = useState<PaymentRequisitesDto | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPlanForModal, setSelectedPlanForModal] = useState<'start' | 'standard' | 'pro' | 'corporate' | undefined>(undefined);
  const [modalAmount, setModalAmount] = useState<number | undefined>(undefined);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDto | null>(null);

  const loadData = async (refreshOnly = false) => {
    if (refreshOnly) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const [subsRes, receiptsRes, reqRes, invoicesRes] = await Promise.allSettled([
        billingApi.getSubscriptions(),
        paymentReceiptApi.getMyReceipts(),
        paymentReceiptApi.getRequisites(),
        billingApi.getInvoices(),
      ]);

      if (subsRes.status === 'fulfilled') {
        setSubscriptions(subsRes.value || []);
      }
      if (receiptsRes.status === 'fulfilled') {
        setReceipts(receiptsRes.value || []);
      }
      if (reqRes.status === 'fulfilled') {
        setRequisites(reqRes.value);
      }
      if (invoicesRes.status === 'fulfilled') {
        setInvoices(invoicesRes.value || []);
        setInvoicesError(false);
      } else {
        setInvoicesError(true);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const currentSubscription = subscriptions.length > 0 ? subscriptions[0] : null;
  const activePlanId = getPlanIdBySubscription(currentSubscription?.planName, currentSubscription?.monthlyPrice);
  const activePlanItem = BILLING_PLANS.find((p) => p.id === activePlanId);

  const isStandard = !activePlanId || activePlanId === 'standard' || currentSubscription?.monthlyPrice === 45000 || currentSubscription?.monthlyPrice === 90000 || currentSubscription?.monthlyPrice === 100000;
  const originalPriceNumber = isStandard ? 100000 : (activePlanItem?.discountPrice ? activePlanItem.price : null);
  const currentPriceNumber = isStandard ? 90000 : (activePlanItem?.discountPrice || activePlanItem?.price || 100000);

  const calculateDaysLeft = (endsAt: string | null): number | null => {
    if (!endsAt) return null;
    const now = new Date();
    const end = new Date(endsAt);
    const diffTime = end.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const daysLeft = currentSubscription ? calculateDaysLeft(currentSubscription.endsAt) : null;
  const isExpiringSoon = daysLeft !== null && daysLeft <= 7 && daysLeft > 0;
  const isExpired = daysLeft !== null && daysLeft <= 0;
  const isPendingReview = receipts.some((r) => r.status === 'AWAITING_REVIEW') || currentSubscription?.status === 'PENDING';

  // Progress percentage (out of 30 days)
  const progressPercent = daysLeft !== null && daysLeft > 0
    ? Math.min(100, Math.max(0, Math.round((daysLeft / 30) * 100)))
    : 0;

  const formatDate = (isoString: string | null) => {
    if (!isoString) return '—';
    try {
      const locale = i18n.language === 'en' ? 'en-US' : (i18n.language === 'zh' ? 'zh-CN' : (i18n.language === 'kk' ? 'kk-KZ' : 'ru-RU'));
      return new Intl.DateTimeFormat(locale, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(new Date(isoString));
    } catch {
      return isoString;
    }
  };

  const openPaymentForPlan = (planId?: 'start' | 'standard' | 'pro' | 'corporate', amount?: number) => {
    setSelectedInvoice(null);
    setSelectedPlanForModal(planId);
    setModalAmount(amount);
    setIsPaymentModalOpen(true);
  };

  const openPaymentForInvoice = (invoice: InvoiceDto) => {
    setSelectedInvoice(invoice);
    setSelectedPlanForModal(undefined);
    setModalAmount(invoice.amount);
    setIsPaymentModalOpen(true);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
              <CreditCard className="w-5 h-5" />
            </div>
            {t('billing.title', 'Тариф и оплата')}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {t('billing.subtitle', 'Управление подпиской на бухгалтерское сопровождение и история платежей')}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={isLoading || isRefreshing}
            className="p-2.5 text-gray-500 hover:text-gray-700 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 shadow-xs cursor-pointer"
            title={t('common.refresh', 'Обновить')}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => openPaymentForPlan(activePlanId || undefined, currentSubscription?.monthlyPrice || undefined)}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs transition-colors cursor-pointer"
          >
            <CreditCard className="w-4 h-4" />
            {currentSubscription?.status === 'ACTIVE'
              ? t('billing.renewSubscription', 'Продлить подписку')
              : t('billing.paySubscription', 'Оплатить подписку')}
          </button>
        </div>
      </div>

      {/* Expiring Soon Banner */}
      {isExpiringSoon && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold">
              {t('billing.expiringWarningTitle', 'Ваша подписка скоро истекает')}
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              {t('billing.expiringWarningDesc', 'Осталось дней: {{days}}. Рекомендуем заблаговременно отправить платеж, чтобы бухгалтерское сопровождение не прерывалось.', { days: daysLeft })}
            </p>
          </div>
        </div>
      )}

      {/* Pending Review Banner */}
      {isPendingReview && (
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 flex items-start gap-3 shadow-xs">
          <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold">
              {t('billing.pendingReviewTitle', 'Чек находится на проверке')}
            </p>
            <p className="text-xs text-blue-700 mt-0.5">
              {t('billing.pendingReviewDesc', 'Мы получили вашу квитанцию. Администратор сверит поступление средств и активирует подписку в ближайшее время.')}
            </p>
          </div>
        </div>
      )}

      {/* Active Subscription Card & Plan Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Status Card */}
        <div className="lg:col-span-2 p-6 rounded-xl border border-gray-200 bg-white shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-gray-400" />
                {t('billing.currentPlan', 'Текущий тариф')}
              </span>
              {currentSubscription?.status === 'ACTIVE' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  {t('billing.status.active', 'Активна')}
                </span>
              )}
              {currentSubscription?.status === 'PENDING' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  {t('billing.status.pending', 'На модерации')}
                </span>
              )}
              {(!currentSubscription || currentSubscription.status === 'CANCELLED' || isExpired) && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                  {t('billing.status.inactive', 'Неактивна')}
                </span>
              )}
            </div>

            <div className="mt-4 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                {getLocalizedPlanName(currentSubscription?.planName, t)}
              </h2>
              <div className="flex flex-col sm:items-end">
                <div className="flex items-baseline gap-2">
                  {originalPriceNumber && (
                    <span className="text-sm font-semibold font-mono text-gray-400 line-through">
                      {originalPriceNumber.toLocaleString(i18n.language === 'en' ? 'en-US' : 'ru-RU')} ₸
                    </span>
                  )}
                  <span className="text-2xl font-bold font-mono text-gray-900">
                    {currentPriceNumber.toLocaleString(i18n.language === 'en' ? 'en-US' : 'ru-RU')} ₸
                  </span>
                  <span className="text-xs font-normal text-gray-500 font-sans">{t('billing.perMonth', '/ месяц')}</span>
                </div>
                {originalPriceNumber && (
                  <span className="inline-flex items-center text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded mt-0.5">
                    {t('billing.discountBadge', 'Спеццена со скидкой 10%')}
                  </span>
                )}
              </div>
            </div>

            <p className="text-sm text-gray-500 mt-1">
              {activePlanItem ? t(activePlanItem.descKey, activePlanItem.defaultDesc) : t('billing.planDescription', 'Комплексный учет, расчет налогов, сдача статотчетов и интеграция с 1С')}
            </p>

            {/* Days Remaining Progress Bar */}
            {currentSubscription?.status === 'ACTIVE' && (
              <div className="mt-6 p-4 rounded-xl bg-gray-50 border border-gray-100">
                <div className="flex items-center justify-between text-xs font-medium mb-2">
                  <span className="text-gray-700">
                    {t('billing.daysRemaining', 'Осталось дней')}: <span className="font-bold text-gray-900">{daysLeft ?? 0}</span> {t('billing.outOfDays', 'из {{total}}', { total: 30 })}
                  </span>
                  <span className="text-gray-500">
                    {t('billing.activeUntil', 'Действует до')} {formatDate(currentSubscription.endsAt)}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isExpiringSoon ? 'bg-amber-500' : 'bg-emerald-600'
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 flex flex-wrap items-center gap-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => openPaymentForPlan(activePlanId || 'standard', currentPriceNumber)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer"
            >
              <CreditCard className="w-4 h-4" />
              {t('billing.payViaKaspi', 'Оплатить через Kaspi / Банк')}
            </button>
            <span className="text-xs text-gray-400">
              {t('billing.supportNotice', 'Нужен индивидуальный расчет тарифа? Напишите куратору в чат.')}
            </span>
          </div>
        </div>

        {/* Feature List Card */}
        <div className="p-6 rounded-xl border border-gray-200 bg-gray-50 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              {t('billing.whatsIncluded', 'Что входит в тариф')}
            </h3>
            <ul className="mt-4 space-y-3 text-xs text-gray-600">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>{t('billing.feature1', 'Полное ведение бухгалтерии ТОО / ИП')}</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>{t('billing.feature2', 'Выписка и обработка ЭСФ, СНТ и актов')}</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>{t('billing.feature3', 'Расчет зарплаты, налогов и отчислений')}</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>{t('billing.feature4', 'Своевременная сдача 910, 200, 300 форм')}</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>{t('billing.feature5', 'Личный куратор и онлайн-чат с бухгалтером')}</span>
              </li>
            </ul>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200">
            <span className="text-xs text-gray-500 block">
              {t('billing.companyCountry', 'ТОО «ЖАН FINANCE» • Казахстан')}
            </span>
          </div>
        </div>
      </div>

      {/* Client invoices */}
      <section className="space-y-4" aria-label={t('billing.invoicesTitle', 'Счета на оплату')}>
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
              <FileCheck className="h-5 w-5 text-emerald-700" />
              {t('billing.invoicesTitle', 'Счета на оплату')}
            </h2>
            <p className="mt-1 text-xs text-gray-500">{t('billing.invoicesDesc', 'Выставленные счета и их текущий статус')}</p>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-600 ring-1 ring-gray-200">{invoices.length}</span>
        </div>
        {invoicesError ? (
          <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-6 text-sm text-amber-900">
            {t('billing.invoicesUnavailable', 'Не удалось загрузить счета. Повторите попытку позже.')}
            <button type="button" onClick={() => loadData(true)} className="ml-3 font-bold underline underline-offset-2">{t('common.refresh', 'Обновить')}</button>
          </div>
        ) : invoices.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-8 text-center">
            <FileCheck className="mx-auto h-8 w-8 text-gray-300" />
            <p className="mt-3 text-sm font-semibold text-gray-700">{t('billing.noInvoices', 'Счетов пока нет')}</p>
            <p className="mt-1 text-xs text-gray-500">{t('billing.noInvoicesDesc', 'Когда счёт будет выставлен, он появится здесь.')}</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {[...invoices].sort((a, b) => b.id - a.id).map((invoice) => {
              const payable = invoice.status === 'ISSUED' || invoice.status === 'OVERDUE';
              const statusText = invoice.status === 'PAID' ? t('billing.invoicePaid', 'Оплачен')
                : invoice.status === 'OVERDUE' ? t('billing.invoiceOverdue', 'Просрочен')
                : invoice.status === 'ISSUED' ? t('billing.invoiceIssued', 'Ожидает оплаты')
                : invoice.status === 'DRAFT' ? t('billing.invoiceDraft', 'Черновик') : t('billing.invoiceCanceled', 'Отменён');
              return (
                <article key={invoice.id} className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between sm:p-5">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                      <FileCheck className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-500">{t('billing.invoiceNumber', { defaultValue: 'Счёт №{{id}}', id: invoice.id })} · {t('billing.dueBy', 'до')} {formatDate(invoice.dueDate)}</p>
                      <h3 className="mt-0.5 truncate text-sm font-bold text-gray-900">{invoice.title}</h3>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <div className="text-right">
                      <p className="font-mono text-base font-bold text-gray-900">{invoice.amount.toLocaleString('ru-RU')} ₸</p>
                      <span className={`text-xs font-semibold ${invoice.status === 'PAID' ? 'text-emerald-700' : invoice.status === 'OVERDUE' ? 'text-rose-600' : 'text-gray-500'}`}>{statusText}</span>
                    </div>
                    {payable && (
                      <button type="button" onClick={() => openPaymentForInvoice(invoice)} className="shrink-0 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600">
                        {t('billing.payInvoice', 'Оплатить')}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Available Plans (4 Tariffs) */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            {t('billing.availablePlans', 'Доступные тарифы')}
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            {t('billing.availablePlansDesc', 'Выберите подходящий тариф под масштаб вашего бизнеса или обновите подписку')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
          {BILLING_PLANS.map((plan) => {
            const isCurrent = activePlanId === plan.id;
            return (
              <div
                key={plan.id}
                className={`p-5 rounded-xl border flex flex-col justify-between transition-all bg-white shadow-xs ${
                  isCurrent
                    ? 'border-emerald-600 ring-2 ring-emerald-600/20'
                    : plan.highlighted
                    ? 'border-emerald-600/40 hover:border-emerald-600'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <h3 className="text-base font-bold text-gray-900 uppercase tracking-tight truncate">
                      {t(plan.nameKey, plan.defaultName)}
                    </h3>
                    {isCurrent ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0 flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-600" />
                        {t('billing.currentActivePlanBadge', 'Текущий')}
                      </span>
                    ) : plan.highlighted ? (
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-600 text-white shrink-0">
                        {t('landing:pricing_hit', 'Хит')}
                      </span>
                    ) : null}
                  </div>

                  <p className="text-xs text-gray-500 min-h-[32px] leading-snug line-clamp-2 mb-3">
                    {t(plan.descKey, plan.defaultDesc)}
                  </p>

                  <div className="text-xl font-bold font-mono text-gray-900 pb-3 mb-4 border-b border-gray-100 flex items-baseline gap-2">
                    {plan.discountPrice ? (
                      <>
                        <span className="text-sm font-semibold text-gray-400 line-through font-mono">
                          {plan.price.toLocaleString(i18n.language === 'en' ? 'en-US' : 'ru-RU')} ₸
                        </span>
                        <span className="text-xl font-bold text-gray-900 font-mono">
                          {plan.discountPrice.toLocaleString(i18n.language === 'en' ? 'en-US' : 'ru-RU')} ₸
                        </span>
                      </>
                    ) : (
                      <span>{plan.price.toLocaleString(i18n.language === 'en' ? 'en-US' : 'ru-RU')} ₸</span>
                    )}
                    <span className="text-xs font-normal text-gray-500 ml-1 font-sans">
                      {t('billing.perMonth', '/ месяц')}
                    </span>
                  </div>

                  <ul className="space-y-2 mb-6 text-xs text-gray-600">
                    {plan.featuresKeys.map((fKey) => (
                      <li key={fKey} className="flex items-start gap-2 leading-snug">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{t(fKey)}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => openPaymentForPlan(plan.id, plan.discountPrice ?? plan.price)}
                  className={`w-full py-2.5 px-4 rounded-lg font-semibold text-xs transition-colors shadow-xs cursor-pointer ${
                    isCurrent
                      ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                      : plan.highlighted
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {isCurrent
                    ? t('billing.renewSubscription', 'Продлить подписку')
                    : t('billing.choosePlan', 'Выбрать тариф')}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Requisites Widget */}
      {requisites && (
        <div className="p-5 rounded-xl border border-gray-200 bg-white shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-gray-500" />
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                {t('billing.requisitesTitle', 'Реквизиты для оплаты')}
              </h3>
            </div>
            <span className="text-xs text-gray-500">{t('billing.paymentMethods', 'Kaspi / Банковский перевод')}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            {/* Recipient */}
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
              <span className="text-[11px] text-gray-500 block">{t('billing.recipient', 'Получатель')}</span>
              <span className="text-xs font-semibold text-gray-900 mt-0.5 block truncate" title={requisites.recipientName}>
                {requisites.recipientName}
              </span>
            </div>

            {/* BIN */}
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-gray-500 block">{t('billing.bin', 'БИН')}</span>
                <span className="text-xs font-mono font-semibold text-gray-900 mt-0.5 block">
                  {requisites.bin}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(requisites.bin, 'bin')}
                className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-200 transition-colors cursor-pointer"
                title={t('billing.copyBin', 'Копировать БИН')}
              >
                {copiedKey === 'bin' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* IBAN */}
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-between">
              <div className="min-w-0 pr-2">
                <span className="text-[11px] text-gray-500 block">{t('billing.iban', 'IBAN (счет)')}</span>
                <span className="text-xs font-mono font-semibold text-gray-900 mt-0.5 block truncate" title={requisites.iban}>
                  {requisites.iban}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(requisites.iban, 'iban')}
                className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-200 transition-colors shrink-0 cursor-pointer"
                title={t('billing.copyIban', 'Копировать IBAN')}
              >
                {copiedKey === 'iban' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Bank */}
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
              <span className="text-[11px] text-gray-500 block">{t('billing.bank', 'Банк')} (КБе {requisites.kbe})</span>
              <span className="text-xs font-semibold text-gray-900 mt-0.5 block truncate" title={requisites.bankName}>
                {requisites.bankName}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Payment History Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-gray-500" />
            {t('billing.historyTitle', 'История платежей и чеков')}
          </h2>
        </div>

        <PaymentHistoryTable
          receipts={receipts}
          isLoading={isLoading}
          onRefresh={() => loadData(true)}
        />
      </div>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        subscriptionId={currentSubscription?.id}
        invoiceId={selectedInvoice?.id}
        invoiceTitle={selectedInvoice?.title}
        planName={selectedPlanForModal ? BILLING_PLANS.find(p => p.id === selectedPlanForModal)?.defaultName : currentSubscription?.planName}
        initialPlanId={selectedPlanForModal}
        defaultAmount={modalAmount || currentSubscription?.monthlyPrice || 100000}
        onSuccess={() => {
          loadData(true);
        }}
      />
    </div>
  );
};

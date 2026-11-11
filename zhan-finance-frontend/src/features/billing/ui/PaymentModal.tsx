import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Check, UploadCloud, FileText, X, AlertCircle, Building, QrCode, CheckCircle2, Loader2, ArrowRightLeft } from 'lucide-react';
import { paymentReceiptApi, PaymentRequisitesDto } from '@/entities/billing/api/paymentReceiptApi';
import { BILLING_PLANS, getLocalizedPlanName, getPlanIdBySubscription, BillingPlanItem } from '@/entities/billing/model/billingPlans';
import { KaspiQrPaymentCard } from './KaspiQrPaymentCard';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscriptionId?: number;
  planName?: string;
  defaultAmount?: number;
  initialPlanId?: 'start' | 'standard' | 'pro' | 'corporate';
  onSuccess: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  subscriptionId,
  planName,
  defaultAmount,
  initialPlanId,
  onSuccess,
}) => {
  const { t } = useTranslation(['common', 'landing']);
  const [requisites, setRequisites] = useState<PaymentRequisitesDto | null>(null);
  const [activePaymentMethod, setActivePaymentMethod] = useState<'kaspi' | 'bank'>('kaspi');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [isChangingPlan, setIsChangingPlan] = useState(false);
  const [amount, setAmount] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      paymentReceiptApi.getRequisites()
        .then(setRequisites)
        .catch(() => {
          setRequisites({
            recipientName: 'ТОО ЖАН FINANCE',
            bin: '240140012345',
            iban: 'KZ123456789012345678',
            kbe: '17',
            bankName: 'АО Каспий Банк',
            kaspiPayUrl: 'https://pay.kaspi.kz/pay/ooixwvwq',
          });
        });

      // Priority: 1. initialPlanId, 2. planId detected from planName or defaultAmount, 3. standard plan
      const detectedPlanId = initialPlanId || getPlanIdBySubscription(planName, defaultAmount);
      if (detectedPlanId) {
        setSelectedPlanId(detectedPlanId);
        const plan = BILLING_PLANS.find((p) => p.id === detectedPlanId);
        const planPrice = plan ? (plan.discountPrice ?? plan.price) : defaultAmount;
        setAmount(planPrice ? String(planPrice) : '90000');
      } else if (defaultAmount) {
        setSelectedPlanId('custom');
        setAmount(String(defaultAmount));
      } else {
        setSelectedPlanId('standard');
        setAmount('90000');
      }

      setFile(null);
      setError(null);
      setIsSuccess(false);
      setIsChangingPlan(false);
    }
  }, [isOpen, defaultAmount, initialPlanId, planName]);

  if (!isOpen) return null;

  const handleSelectPlan = (plan: BillingPlanItem) => {
    setSelectedPlanId(plan.id);
    const effectivePrice = plan.discountPrice ?? plan.price;
    setAmount(String(effectivePrice));
  };

  const handleSelectCustom = () => {
    setSelectedPlanId('custom');
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const validateAndSetFile = (selected: File) => {
    if (!selected.name.toLowerCase().endsWith('.pdf') && selected.type !== 'application/pdf') {
      setError(t('billing.errors.pdfOnly', { defaultValue: 'Разрешены только файлы формата PDF' }));
      return;
    }

    if (selected.size > 10 * 1024 * 1024) {
      setError(t('billing.errors.fileTooLarge', { defaultValue: 'Размер файла не должен превышать 10 МБ' }));
      return;
    }

    setError(null);
    setFile(selected);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      validateAndSetFile(selected);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      validateAndSetFile(droppedFile);
    }
  };

  const handleRemoveFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFile(null);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError(t('billing.errors.invalidAmount', { defaultValue: 'Укажите корректную сумму оплаты' }));
      return;
    }

    if (!file) {
      setError(t('billing.errors.receiptRequired', { defaultValue: 'Прикрепите PDF-файл квитанции' }));
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const formData = new FormData();
      formData.append('amount', String(numAmount));
      formData.append('currency', 'KZT');
      if (subscriptionId) {
        formData.append('subscriptionId', String(subscriptionId));
      }
      formData.append('file', file);

      await paymentReceiptApi.submitReceipt(formData);
      setIsSuccess(true);
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('billing.errors.submitFailed', { defaultValue: 'Ошибка при отправке чека' });
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedPlanItem = BILLING_PLANS.find((p) => p.id === selectedPlanId);
  const planSubtitle = planName
    ? getLocalizedPlanName(planName, t)
    : (selectedPlanItem ? t(selectedPlanItem.nameKey, { defaultValue: selectedPlanItem.defaultName }) : null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div 
        className="relative w-full max-w-xl md:max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col max-h-[94vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-white">
          <div className="min-w-0 pr-3">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 truncate">
              {t('billing.modalTitle', { defaultValue: 'Оплата тарифа' })}
            </h3>
            {planSubtitle && (
              <p className="text-xs text-gray-500 font-medium truncate">
                {planSubtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSuccess ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-14 h-14 mx-auto bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-xl font-bold text-gray-900">
                {t('billing.successTitle', { defaultValue: 'Чек успешно отправлен' })}
              </h4>
              <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
                {t('billing.successDesc', {
                  defaultValue: 'Чек передан администратору на проверку. После подтверждения подписка будет активирована автоматически.',
                })}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-lg transition shadow-xs cursor-pointer"
            >
              {t('common.close', { defaultValue: 'Закрыть' })}
            </button>
          </div>
        ) : (
          <>
            <form id="payment-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Payment Method Selector */}
              <div className="flex rounded-xl bg-gray-100 p-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActivePaymentMethod('kaspi')}
                  className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    activePaymentMethod === 'kaspi'
                      ? 'bg-white text-gray-900 shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5 text-[#f14635]" />
                  <span>{t('billing.kaspiTransfer', { defaultValue: 'Kaspi Перевод / QR' })}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActivePaymentMethod('bank')}
                  className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    activePaymentMethod === 'bank'
                      ? 'bg-white text-gray-900 shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Building className="w-3.5 h-3.5 text-blue-500" />
                  <span>{t('billing.bankTransfer', { defaultValue: 'Банковский перевод' })}</span>
                </button>
              </div>

              {/* Plan Display / Selection */}
              {selectedPlanItem && !isChangingPlan ? (
                <div className="flex items-center justify-between p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider shrink-0">
                      {t('billing.selectedPlanLabel', { defaultValue: 'Выбранный тариф' })}
                    </span>
                    <span className="font-bold text-gray-900 truncate">
                      {t(selectedPlanItem.nameKey, selectedPlanItem.defaultName)}
                    </span>
                    {selectedPlanItem.discountPrice && (
                      <span className="hidden sm:inline-block text-[9px] font-semibold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded-full">
                        {t('billing.discountBadge', { defaultValue: 'Спеццена со скидкой 10%' })}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-bold font-mono text-gray-900">
                      {(selectedPlanItem.discountPrice ?? selectedPlanItem.price).toLocaleString('ru-RU')} ₸
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsChangingPlan(true)}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                    >
                      <ArrowRightLeft className="w-3 h-3 text-emerald-600" />
                      <span>{t('billing.changePlan', { defaultValue: 'Сменить' })}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {t('billing.selectPlanLabel', { defaultValue: 'Выберите тариф' })}
                    </label>
                    {selectedPlanItem && (
                      <button
                        type="button"
                        onClick={() => setIsChangingPlan(false)}
                        className="text-xs text-gray-500 hover:text-gray-700 hover:underline cursor-pointer"
                      >
                        {t('billing.cancelChange', { defaultValue: 'Свернуть' })}
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {BILLING_PLANS.map((plan) => {
                      const isSelected = selectedPlanId === plan.id;
                      return (
                        <button
                          key={plan.id}
                          type="button"
                          onClick={() => {
                            handleSelectPlan(plan);
                            setIsChangingPlan(false);
                          }}
                          className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'border-emerald-600 bg-emerald-50/70 ring-1 ring-emerald-600'
                              : 'border-gray-200 bg-white hover:bg-gray-100 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-900 truncate">
                              {t(plan.nameKey, plan.defaultName)}
                            </span>
                          </div>
                          <div className="text-[11px] font-mono font-bold text-emerald-700 mt-0.5">
                            {(plan.discountPrice ?? plan.price).toLocaleString('ru-RU')} ₸
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Payment Details (Kaspi QR vs Bank Requisites) */}
              {activePaymentMethod === 'kaspi' ? (
                <KaspiQrPaymentCard
                  kaspiPayUrl={requisites?.kaspiPayUrl || 'https://pay.kaspi.kz/pay/ooixwvwq'}
                  recipientName={requisites?.recipientName || 'ТОО ЖАН FINANCE'}
                  bin={requisites?.bin || '240140012345'}
                  amount={amount}
                />
              ) : requisites && (
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-gray-600">
                    <span>{t('billing.recipient', { defaultValue: 'Получатель' })}:</span>
                    <span className="font-semibold text-gray-900">{requisites.recipientName}</span>
                  </div>
                  <div className="flex items-center justify-between text-gray-600">
                    <span>{t('billing.bin', { defaultValue: 'БИН' })}:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-semibold text-gray-900">{requisites.bin}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(requisites.bin, 'bin')}
                        className="p-1 text-gray-400 hover:text-gray-700 transition cursor-pointer"
                        title={t('billing.copyBin', { defaultValue: 'Копировать БИН' })}
                      >
                        {copiedField === 'bin' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-gray-600">
                    <span>{t('billing.iban', { defaultValue: 'IBAN (счет)' })}:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-semibold text-gray-900">{requisites.iban}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(requisites.iban, 'iban')}
                        className="p-1 text-gray-400 hover:text-gray-700 transition cursor-pointer"
                        title={t('billing.copyIban', { defaultValue: 'Копировать IBAN' })}
                      >
                        {copiedField === 'iban' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-gray-600">
                    <span>{t('billing.bank', { defaultValue: 'Банк' })}:</span>
                    <span className="font-semibold text-gray-900">{requisites.bankName} (КБе {requisites.kbe})</span>
                  </div>
                </div>
              )}

              {/* File dropzone */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  {t('billing.uploadReceipt', { defaultValue: 'Чек об оплате (PDF)' })}
                </label>
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  className={`relative border-2 border-dashed rounded-xl p-3 text-center transition-all ${
                    isDragOver
                      ? 'border-emerald-500 bg-emerald-50/50'
                      : file
                      ? 'border-emerald-300 bg-emerald-50/20'
                      : 'border-gray-300 hover:border-gray-400 bg-gray-50'
                  }`}
                >
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    required={!file}
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  {file ? (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-gray-200">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="text-left min-w-0">
                          <p className="text-xs font-semibold text-gray-900 truncate max-w-[240px]">
                            {file.name}
                          </p>
                          <p className="text-[10px] text-gray-500 font-mono">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        className="p-1 text-gray-400 hover:text-rose-600 rounded-md hover:bg-gray-100 transition cursor-pointer"
                        title="Удалить файл"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2 py-1.5">
                      <UploadCloud className="w-5 h-5 text-gray-400 shrink-0" />
                      <span className="text-xs font-medium text-gray-700">
                        {t('billing.dragFile', { defaultValue: 'Прикрепите PDF-файл чека или перетащите сюда' })}
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono">
                        (до 10 МБ)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </form>

            {/* Fixed Footer Actions (Always visible, never cut off) */}
            <div className="shrink-0 flex items-center justify-end gap-2.5 px-5 py-3 border-t border-gray-100 bg-gray-50/80">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition cursor-pointer"
              >
                {t('common.cancel', { defaultValue: 'Отмена' })}
              </button>
              <button
                type="submit"
                form="payment-form"
                disabled={isSubmitting || !file}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl transition shadow-xs cursor-pointer"
              >
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {isSubmitting
                  ? t('billing.submitting', { defaultValue: 'Отправка...' })
                  : t('billing.submitReceiptBtn', { defaultValue: 'Отправить чек на проверку' })}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

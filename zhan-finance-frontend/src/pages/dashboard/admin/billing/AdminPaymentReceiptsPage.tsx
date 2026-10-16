import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  FileCheck, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ExternalLink, 
  RefreshCw, 
  Search,
  Loader2,
  TrendingUp,
  Inbox
} from 'lucide-react';
import { 
  paymentReceiptApi, 
  PaymentReceiptDto, 
  PaymentReceiptStatus 
} from '@/entities/billing/api/paymentReceiptApi';
import { RejectReceiptModal } from '@/features/billing/ui/RejectReceiptModal';
import { toast } from '@/shared/ui/Toast/ToastContext';

type FilterTab = 'ALL' | PaymentReceiptStatus;

export function AdminPaymentReceiptsPage() {
  const { t } = useTranslation(['common']);
  const [receipts, setReceipts] = useState<PaymentReceiptDto[]>([]);
  const [allReceiptsForStats, setAllReceiptsForStats] = useState<PaymentReceiptDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionInProgressId, setActionInProgressId] = useState<number | null>(null);

  // Reject modal state
  const [rejectModalReceiptId, setRejectModalReceiptId] = useState<number | null>(null);

  const loadReceipts = useCallback(async (statusFilter?: FilterTab, refreshOnly = false) => {
    if (refreshOnly) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const statusParam = (!statusFilter || statusFilter === 'ALL') ? undefined : statusFilter;
      if (!statusParam) {
        const allData = await paymentReceiptApi.getAllReceipts();
        setReceipts(allData || []);
        setAllReceiptsForStats(allData || []);
      } else {
        const [filteredData, allData] = await Promise.all([
          paymentReceiptApi.getAllReceipts(statusParam),
          paymentReceiptApi.getAllReceipts(),
        ]);
        setReceipts(filteredData || []);
        setAllReceiptsForStats(allData || []);
      }
    } catch (err) {
      console.error(err);
      toast.error(t('billing.admin.loadError', { defaultValue: 'Не удалось загрузить чеки оплат' }));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    loadReceipts(activeTab);
  }, [activeTab, loadReceipts]);

  const handleTabChange = (tab: FilterTab) => {
    setActiveTab(tab);
  };

  const handleConfirm = async (receiptId: number) => {
    try {
      setActionInProgressId(receiptId);
      await paymentReceiptApi.confirmReceipt(receiptId);
      toast.success(t('billing.admin.confirmSuccess', { defaultValue: 'Чек подтвержден, подписка активирована на 30 дней' }));
      loadReceipts(activeTab, true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('billing.admin.confirmError', { defaultValue: 'Ошибка при подтверждении чека' });
      toast.error(message);
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleViewReceipt = async (receiptId: number) => {
    try {
      const res = await paymentReceiptApi.getReceiptFileUrl(receiptId);
      if (res && res.url && (res.url.startsWith('http://') || res.url.startsWith('https://'))) {
        window.open(res.url, '_blank', 'noopener,noreferrer');
      } else {
        const downloadPath = res?.url || `/api/v1/billing/receipts/${receiptId}/download`;
        const blob = await paymentReceiptApi.downloadReceiptFile(downloadPath);
        const objectUrl = URL.createObjectURL(blob);
        window.open(objectUrl, '_blank', 'noopener,noreferrer');
      }
    } catch {
      try {
        const blob = await paymentReceiptApi.downloadReceiptFile(`/api/v1/billing/receipts/${receiptId}/download`);
        const objectUrl = URL.createObjectURL(blob);
        window.open(objectUrl, '_blank', 'noopener,noreferrer');
      } catch (err) {
        console.error('Failed to open receipt:', err);
      }
    }
  };

  const stats = useMemo(() => {
    const total = allReceiptsForStats.length;
    const awaiting = allReceiptsForStats.filter(r => r.status === 'AWAITING_REVIEW').length;
    const confirmed = allReceiptsForStats.filter(r => r.status === 'CONFIRMED').length;
    const rejected = allReceiptsForStats.filter(r => r.status === 'REJECTED').length;
    const totalConfirmedAmount = allReceiptsForStats
      .filter(r => r.status === 'CONFIRMED')
      .reduce((sum, r) => sum + Number(r.amount || 0), 0);

    return { total, awaiting, confirmed, rejected, totalConfirmedAmount };
  }, [allReceiptsForStats]);

  const filteredReceipts = useMemo(() => {
    if (!searchQuery.trim()) return receipts;
    const q = searchQuery.toLowerCase();
    return receipts.filter((r) => {
      const matchClient = r.clientName?.toLowerCase().includes(q) || r.clientEmail?.toLowerCase().includes(q);
      const matchAmount = String(r.amount).includes(q);
      const matchId = String(r.id).includes(q);
      return matchClient || matchAmount || matchId;
    });
  }, [receipts, searchQuery]);

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch {
      return isoString;
    }
  };

  const renderStatusBadge = (status: PaymentReceiptStatus, rejectNote?: string | null) => {
    switch (status) {
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            {t('billing.status.confirmed', 'Подтвержден')}
          </span>
        );
      case 'REJECTED':
        return (
          <div className="flex flex-col gap-0.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
              <XCircle className="w-3.5 h-3.5 text-rose-600" />
              {t('billing.status.rejected', 'Отклонен')}
            </span>
            {rejectNote && (
              <span className="text-[11px] text-rose-600 max-w-xs truncate" title={rejectNote}>
                {rejectNote}
              </span>
            )}
          </div>
        );
      case 'AWAITING_REVIEW':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            {t('billing.status.awaitingReview', 'На проверке')}
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
              <FileCheck className="w-5 h-5" />
            </div>
            {t('billing.admin.title', 'Модерация платежей')}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {t('billing.admin.subtitle', 'Проверка чеков об оплате через Kaspi / банковский перевод и активация подписок')}
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadReceipts(activeTab, true)}
          disabled={isLoading || isRefreshing}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 shadow-xs cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 text-gray-500 ${isRefreshing ? 'animate-spin' : ''}`} />
          {t('common.refresh', 'Обновить')}
        </button>
      </div>

      {/* Stats Cards: Все -> Ожидают проверки -> Отклонено -> Подтверждено */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* 1. All */}
        <div 
          onClick={() => handleTabChange('ALL')}
          className={`p-5 rounded-xl border transition-all cursor-pointer bg-white shadow-xs ${
            activeTab === 'ALL'
              ? 'border-emerald-600 ring-2 ring-emerald-600/20 bg-emerald-50/20'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              {t('billing.admin.stats.total', { defaultValue: 'Всего чеков' })}
            </span>
            <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-700 flex items-center justify-center border border-gray-200">
              <FileCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold font-mono text-gray-900 mt-3">
            {stats.total}
          </p>
        </div>

        {/* 2. Awaiting Review */}
        <div 
          onClick={() => handleTabChange('AWAITING_REVIEW')}
          className={`p-5 rounded-xl border transition-all cursor-pointer bg-white shadow-xs ${
            activeTab === 'AWAITING_REVIEW'
              ? 'border-amber-400 ring-2 ring-amber-400/20 bg-amber-50/20'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              {t('billing.admin.stats.awaiting', { defaultValue: 'Ожидают проверки' })}
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold font-mono text-gray-900 mt-3">
            {stats.awaiting}
          </p>
        </div>

        {/* 3. Rejected */}
        <div 
          onClick={() => handleTabChange('REJECTED')}
          className={`p-5 rounded-xl border transition-all cursor-pointer bg-white shadow-xs ${
            activeTab === 'REJECTED'
              ? 'border-rose-400 ring-2 ring-rose-400/20 bg-rose-50/20'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              {t('billing.admin.stats.rejected', { defaultValue: 'Отклонено' })}
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold font-mono text-gray-900 mt-3">
            {stats.rejected}
          </p>
        </div>

        {/* 4. Confirmed */}
        <div 
          onClick={() => handleTabChange('CONFIRMED')}
          className={`p-5 rounded-xl border transition-all cursor-pointer bg-white shadow-xs ${
            activeTab === 'CONFIRMED'
              ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              {t('billing.admin.stats.confirmed', { defaultValue: 'Подтверждено' })}
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-3">
            <p className="text-3xl font-bold font-mono text-gray-900">
              {stats.confirmed}
            </p>
            <p className="text-sm font-bold font-mono text-emerald-700">
              {stats.totalConfirmedAmount.toLocaleString('ru-RU')} ₸
            </p>
          </div>
        </div>
      </div>

      {/* Tabs and Search Bar: Сначала ВСЕ -> затем фильтры (На проверке -> Отклоненные -> Подтвержденные) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-3 rounded-xl border border-gray-200 shadow-xs">
        {/* Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => handleTabChange('ALL')}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'ALL'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            {t('billing.admin.tabAll', 'Все')} ({stats.total})
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('AWAITING_REVIEW')}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'AWAITING_REVIEW'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <Clock className="w-4 h-4" />
            {t('billing.admin.tabPending', 'На проверке')}
            {stats.awaiting > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                activeTab === 'AWAITING_REVIEW'
                  ? 'bg-white/20 text-white'
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {stats.awaiting}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('REJECTED')}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'REJECTED'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            {t('billing.admin.tabRejected', 'Отклоненные')} ({stats.rejected})
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('CONFIRMED')}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'CONFIRMED'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            {t('billing.admin.tabConfirmed', 'Подтвержденные')} ({stats.confirmed})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('billing.admin.searchPlaceholder', 'Поиск по клиенту, сумме...')}
            className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition"
          />
        </div>
      </div>

      {/* Receipts Table */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-16 text-gray-500 bg-white rounded-xl border border-gray-200 shadow-xs">
          <Loader2 className="w-8 h-8 animate-spin mb-2 text-emerald-600" />
          <span className="text-sm font-medium">{t('billing.loading', 'Загрузка чеков...')}</span>
        </div>
      ) : filteredReceipts.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 text-center border border-dashed border-gray-300 rounded-xl bg-white shadow-xs">
          <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mb-3">
            <Inbox className="w-6 h-6" />
          </div>
          <p className="text-base font-semibold text-gray-800">
            {t('billing.admin.emptyList', 'Чеки не найдены')}
          </p>
          <p className="text-sm text-gray-500 mt-1 max-w-sm">
            {activeTab === 'AWAITING_REVIEW'
              ? t('billing.admin.emptyAwaiting', 'Нет чеков, ожидающих рассмотрения.')
              : t('billing.admin.emptyFiltered', 'По выбранным фильтрам записей нет.')}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden border border-gray-200 rounded-xl bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">#</th>
                  <th className="py-3.5 px-4">{t('billing.table.client', 'Клиент')}</th>
                  <th className="py-3.5 px-4">{t('billing.table.amount', 'Сумма')}</th>
                  <th className="py-3.5 px-4">{t('billing.table.date', 'Дата')}</th>
                  <th className="py-3.5 px-4">{t('billing.table.status', 'Статус')}</th>
                  <th className="py-3.5 px-4">{t('billing.table.receipt', 'Чек')}</th>
                  <th className="py-3.5 px-4 text-right">{t('common.actions', 'Действия')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredReceipts.map((receipt) => {
                  const isActing = actionInProgressId === receipt.id;
                  return (
                    <tr
                      key={receipt.id}
                      className="hover:bg-gray-50/80 transition-colors"
                    >
                      <td className="py-3.5 px-4 text-xs font-mono text-gray-400">
                        {receipt.id}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-900">
                            {receipt.clientName || `ID ${receipt.clientId}`}
                          </span>
                          {receipt.clientEmail && (
                            <span className="text-xs text-gray-500 font-mono">
                              {receipt.clientEmail}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-bold font-mono text-gray-900 text-base whitespace-nowrap">
                        {Number(receipt.amount).toLocaleString('ru-RU')} {receipt.currency === 'KZT' ? '₸' : receipt.currency}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-gray-600 whitespace-nowrap">
                        {formatDate(receipt.createdAt)}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {renderStatusBadge(receipt.status, receipt.rejectNote)}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleViewReceipt(receipt.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 border border-gray-200 transition-colors cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-gray-500" />
                          {t('billing.viewReceipt', 'Открыть чек')}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {receipt.status === 'AWAITING_REVIEW' ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleConfirm(receipt.id)}
                              disabled={isActing}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 shadow-xs cursor-pointer"
                            >
                              {isActing ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              )}
                              {t('billing.admin.confirmBtn', 'Подтвердить')}
                            </button>
                            <button
                              type="button"
                              onClick={() => setRejectModalReceiptId(receipt.id)}
                              disabled={isActing}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors disabled:opacity-50 cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              {t('billing.admin.rejectBtn', 'Отклонить')}
                            </button>
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400">
                            {(receipt.reviewedByName || receipt.reviewedById) && (
                              <span>
                                {t('billing.admin.reviewedBy', 'Проверил')}: <strong className="text-gray-600 font-medium">{receipt.reviewedByName || receipt.reviewedById}</strong>
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      <RejectReceiptModal
        isOpen={rejectModalReceiptId !== null}
        receiptId={rejectModalReceiptId}
        onClose={() => setRejectModalReceiptId(null)}
        onSuccess={() => {
          toast.info(t('billing.admin.rejectedSuccess', { defaultValue: 'Чек отклонен' }));
          loadReceipts(activeTab, true);
        }}
      />
    </div>
  );
}

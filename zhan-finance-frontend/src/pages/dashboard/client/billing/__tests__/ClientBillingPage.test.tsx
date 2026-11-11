/**
 * @vitest-environment jsdom
 */
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClientBillingPage } from '../ClientBillingPage';
import { billingApi } from '@/entities/billing/api/billingApi';
import { paymentReceiptApi } from '@/entities/billing/api/paymentReceiptApi';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValOrOptions?: any) => {
      if (typeof defaultValOrOptions === 'string') return defaultValOrOptions;
      if (defaultValOrOptions && typeof defaultValOrOptions === 'object' && defaultValOrOptions.defaultValue) {
        return String(defaultValOrOptions.defaultValue).replace('{{id}}', String(defaultValOrOptions.id ?? ''));
      }
      return key;
    },
    i18n: { language: 'ru' },
  }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}));

vi.mock('@/entities/billing/api/billingApi', () => ({
  billingApi: {
    getSubscriptions: vi.fn(),
    getInvoices: vi.fn(),
  },
}));

vi.mock('@/entities/billing/api/paymentReceiptApi', () => ({
  paymentReceiptApi: {
    getMyReceipts: vi.fn(),
    getRequisites: vi.fn(),
    getReceiptFileUrl: vi.fn(),
    submitReceipt: vi.fn(),
    downloadReceiptFile: vi.fn().mockResolvedValue(new Blob(['pdf'])),
  },
}));

describe('ClientBillingPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(billingApi.getInvoices).mockResolvedValue([]);
    vi.mocked(paymentReceiptApi.getRequisites).mockResolvedValue({
      recipientName: 'ТОО ЖАН FINANCE',
      bin: '240140012345',
      iban: 'KZ123456789012345678',
      kbe: '17',
      bankName: 'АО Каспий Банк',
    });
  });

  it('renders loading state and then subscription data', async () => {
    vi.mocked(billingApi.getSubscriptions).mockResolvedValueOnce([
      {
        id: 1,
        planName: 'Бухгалтерское обслуживание (Стандарт)',
        monthlyPrice: 45000,
        status: 'ACTIVE',
        startsAt: '2026-09-01T00:00:00Z',
        endsAt: '2026-10-01T00:00:00Z',
      },
    ]);
    vi.mocked(paymentReceiptApi.getMyReceipts).mockResolvedValueOnce([]);

    render(<ClientBillingPage />);

    expect(screen.getByText('Тариф и оплата')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Бухгалтерское обслуживание (Стандарт)')).toBeInTheDocument();
      expect(screen.getAllByText(/90.*000/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/100.*000/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Активна')).toBeInTheDocument();
      expect(screen.getByText('ТОО ЖАН FINANCE')).toBeInTheDocument();
    });
  });

  it('shows expiring warning banner if endsAt is within 7 days', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 3);

    vi.mocked(billingApi.getSubscriptions).mockResolvedValueOnce([
      {
        id: 1,
        planName: 'Бухгалтерский аутсорсинг',
        monthlyPrice: 45000,
        status: 'ACTIVE',
        startsAt: '2026-08-01T00:00:00Z',
        endsAt: futureDate.toISOString(),
      },
    ]);
    vi.mocked(paymentReceiptApi.getMyReceipts).mockResolvedValueOnce([]);

    render(<ClientBillingPage />);

    await waitFor(() => {
      expect(screen.getByText('Ваша подписка скоро истекает')).toBeInTheDocument();
    });
  });

  it('opens PaymentModal when click on renew button', async () => {
    vi.mocked(billingApi.getSubscriptions).mockResolvedValueOnce([
      {
        id: 1,
        planName: 'Бухгалтерский аутсорсинг',
        monthlyPrice: 45000,
        status: 'ACTIVE',
        startsAt: '2026-08-01T00:00:00Z',
        endsAt: '2026-10-01T00:00:00Z',
      },
    ]);
    vi.mocked(paymentReceiptApi.getMyReceipts).mockResolvedValueOnce([]);

    render(<ClientBillingPage />);

    await waitFor(() => {
      expect(screen.getAllByText('Продлить подписку').length).toBeGreaterThanOrEqual(1);
    });

    fireEvent.click(screen.getAllByText('Продлить подписку')[0]);

    await waitFor(() => {
      expect(screen.getByText('Оплата тарифа')).toBeInTheDocument();
    });
  });

  it('renders all 4 available tariffs (Start, Standard, Pro, Corporate)', async () => {
    vi.mocked(billingApi.getSubscriptions).mockResolvedValueOnce([]);
    vi.mocked(paymentReceiptApi.getMyReceipts).mockResolvedValueOnce([]);

    render(<ClientBillingPage />);

    expect(screen.getByText('Доступные тарифы')).toBeInTheDocument();
    expect(screen.getByText('Старт')).toBeInTheDocument();
    expect(screen.getByText('Стандарт')).toBeInTheDocument();
    expect(screen.getByText('Про')).toBeInTheDocument();
    expect(screen.getByText('Корпоративный')).toBeInTheDocument();
  });

  it('shows an issued invoice and opens payment for that invoice', async () => {
    vi.mocked(billingApi.getSubscriptions).mockResolvedValueOnce([]);
    vi.mocked(paymentReceiptApi.getMyReceipts).mockResolvedValueOnce([]);
    vi.mocked(billingApi.getInvoices).mockResolvedValueOnce([
      { id: 42, clientId: 1, title: 'Бухгалтерское сопровождение', amount: 90000, status: 'ISSUED', dueDate: '2026-11-30' },
    ]);

    render(<ClientBillingPage />);
    await waitFor(() => expect(screen.getByText('Бухгалтерское сопровождение')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Оплатить'));
    expect(screen.getByText('Оплата счёта №42')).toBeInTheDocument();
    expect(screen.getByText('Сумма по счёту №42')).toBeInTheDocument();
  });
});

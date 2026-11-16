/**
 * @vitest-environment jsdom
 */
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaymentReturnBanner } from '../PaymentReturnBanner';
import { onlinePaymentApi } from '@/entities/billing/api/onlinePaymentApi';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: any) => (opts && opts.defaultValue ? String(opts.defaultValue) : key),
    i18n: { language: 'ru' },
  }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}));

vi.mock('@/entities/billing/api/onlinePaymentApi', () => ({
  onlinePaymentApi: {
    getOptions: vi.fn(),
    startFreedomPayment: vi.fn(),
    getFreedomOrder: vi.fn(),
  },
}));

const intent = (status: string) => ({
  orderId: 'ZF7-abc',
  invoiceId: 7,
  amount: 30000,
  currency: 'KZT',
  status: status as any,
  redirectUrl: null,
  failureReason: null,
});

describe('PaymentReturnBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows success and notifies the page once the payment is PAID', async () => {
    vi.mocked(onlinePaymentApi.getFreedomOrder).mockResolvedValue(intent('PAID'));
    const onSettled = vi.fn();

    render(<PaymentReturnBanner orderId="ZF7-abc" onSettled={onSettled} pollIntervalMs={5} />);

    expect(await screen.findByText('Оплата получена. Подписка активна.')).toBeInTheDocument();
    expect(onSettled).toHaveBeenCalledTimes(1);
  });

  it('keeps polling while the payment is still redirected, then succeeds', async () => {
    vi.mocked(onlinePaymentApi.getFreedomOrder)
      .mockResolvedValueOnce(intent('REDIRECTED'))
      .mockResolvedValueOnce(intent('PAID'));
    const onSettled = vi.fn();

    render(<PaymentReturnBanner orderId="ZF7-abc" onSettled={onSettled} pollIntervalMs={5} />);

    await waitFor(() => expect(onSettled).toHaveBeenCalledTimes(1));
    expect(onlinePaymentApi.getFreedomOrder).toHaveBeenCalledTimes(2);
  });

  it('shows failure for a FAILED payment and does not notify', async () => {
    vi.mocked(onlinePaymentApi.getFreedomOrder).mockResolvedValue(intent('FAILED'));
    const onSettled = vi.fn();

    render(<PaymentReturnBanner orderId="ZF7-abc" onSettled={onSettled} pollIntervalMs={5} />);

    expect(await screen.findByText('Оплата не прошла, счёт остался неоплаченным.')).toBeInTheDocument();
    expect(onSettled).not.toHaveBeenCalled();
  });

  it('falls back to the processing message after the attempts run out', async () => {
    vi.mocked(onlinePaymentApi.getFreedomOrder).mockResolvedValue(intent('REDIRECTED'));

    render(<PaymentReturnBanner orderId="ZF7-abc" onSettled={vi.fn()} pollIntervalMs={5} maxAttempts={3} />);

    expect(
      await screen.findByText('Платёж обрабатывается. Статус обновится в течение нескольких минут.'),
    ).toBeInTheDocument();
    expect(onlinePaymentApi.getFreedomOrder).toHaveBeenCalledTimes(3);
  });
});

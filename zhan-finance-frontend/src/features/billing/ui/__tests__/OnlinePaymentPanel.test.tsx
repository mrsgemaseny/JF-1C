/**
 * @vitest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OnlinePaymentPanel } from '../OnlinePaymentPanel';
import { onlinePaymentApi } from '@/entities/billing/api/onlinePaymentApi';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: any) => (opts && opts.defaultValue ? String(opts.defaultValue) : key),
    i18n: { language: 'ru' },
  }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}));

vi.mock('@/entities/billing/api/onlinePaymentApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/entities/billing/api/onlinePaymentApi')>();
  return {
    ...actual,
    onlinePaymentApi: {
      getOptions: vi.fn(),
      startFreedomPayment: vi.fn(),
      getFreedomOrder: vi.fn(),
    },
  };
});

describe('OnlinePaymentPanel', () => {
  const assign = vi.fn();
  const originalLocation = window.location;

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, assign },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
  });

  it('renders nothing when no online method is enabled', async () => {
    vi.mocked(onlinePaymentApi.getOptions).mockResolvedValue({ freedomPayEnabled: false, kaspiPayEnabled: false });
    const { container } = render(<OnlinePaymentPanel invoiceId={7} amount={30000} />);
    await waitFor(() => expect(onlinePaymentApi.getOptions).toHaveBeenCalled());
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when options cannot be loaded', async () => {
    vi.mocked(onlinePaymentApi.getOptions).mockRejectedValue(new Error('offline'));
    const { container } = render(<OnlinePaymentPanel invoiceId={7} amount={30000} />);
    await waitFor(() => expect(onlinePaymentApi.getOptions).toHaveBeenCalled());
    expect(container.firstChild).toBeNull();
  });

  it('redirects to the provider after starting a card payment', async () => {
    vi.mocked(onlinePaymentApi.getOptions).mockResolvedValue({ freedomPayEnabled: true, kaspiPayEnabled: false });
    vi.mocked(onlinePaymentApi.startFreedomPayment).mockResolvedValue({
      orderId: 'ZF7-abc',
      invoiceId: 7,
      amount: 30000,
      currency: 'KZT',
      status: 'REDIRECTED',
      redirectUrl: 'https://customer.freedompay.kz/pay.html?customer=x',
      failureReason: null,
    });

    render(<OnlinePaymentPanel invoiceId={7} amount={30000} />);
    const button = await screen.findByRole('button');
    fireEvent.click(button);

    await waitFor(() => expect(assign).toHaveBeenCalledWith('https://customer.freedompay.kz/pay.html?customer=x'));
    expect(onlinePaymentApi.startFreedomPayment).toHaveBeenCalledWith(7);
  });

  it('refuses to follow a redirect to a foreign host and shows an error', async () => {
    vi.mocked(onlinePaymentApi.getOptions).mockResolvedValue({ freedomPayEnabled: true, kaspiPayEnabled: false });
    vi.mocked(onlinePaymentApi.startFreedomPayment).mockResolvedValue({
      orderId: 'ZF7-abc',
      invoiceId: 7,
      amount: 30000,
      currency: 'KZT',
      status: 'REDIRECTED',
      redirectUrl: 'https://evil.example/pay',
      failureReason: null,
    });

    render(<OnlinePaymentPanel invoiceId={7} amount={30000} />);
    fireEvent.click(await screen.findByRole('button'));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(assign).not.toHaveBeenCalled();
  });

  it('shows the invoice number hint when Kaspi is enabled', async () => {
    vi.mocked(onlinePaymentApi.getOptions).mockResolvedValue({ freedomPayEnabled: false, kaspiPayEnabled: true });
    render(<OnlinePaymentPanel invoiceId={42} amount={30000} />);
    expect(await screen.findByText(/42/)).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });
});

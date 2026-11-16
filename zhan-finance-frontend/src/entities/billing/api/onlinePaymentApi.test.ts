import { describe, it, expect, vi, beforeEach } from 'vitest';
import { onlinePaymentApi, isTrustedPaymentRedirect } from './onlinePaymentApi';
import * as http from '@/shared/api/http';

vi.mock('@/shared/api/http', () => ({
  apiRequest: vi.fn(),
  API_BASE_URL: 'http://localhost:8080',
}));

describe('onlinePaymentApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getOptions calls GET options', async () => {
    vi.mocked(http.apiRequest).mockResolvedValueOnce({ freedomPayEnabled: true, kaspiPayEnabled: false });
    const result = await onlinePaymentApi.getOptions();
    expect(http.apiRequest).toHaveBeenCalledWith('/api/v1/billing/online-payments/options');
    expect(result.freedomPayEnabled).toBe(true);
  });

  it('startFreedomPayment POSTs for the invoice id', async () => {
    vi.mocked(http.apiRequest).mockResolvedValueOnce({ orderId: 'ZF7-abc' });
    await onlinePaymentApi.startFreedomPayment(7);
    expect(http.apiRequest).toHaveBeenCalledWith('/api/v1/billing/online-payments/freedom/invoices/7', {
      method: 'POST',
    });
  });

  it('getFreedomOrder encodes the order id', async () => {
    vi.mocked(http.apiRequest).mockResolvedValueOnce({ status: 'PAID' });
    await onlinePaymentApi.getFreedomOrder('a/b');
    expect(http.apiRequest).toHaveBeenCalledWith('/api/v1/billing/online-payments/freedom/orders/a%2Fb');
  });
});

describe('isTrustedPaymentRedirect', () => {
  it('accepts https Freedom Pay hosts', () => {
    expect(isTrustedPaymentRedirect('https://customer.freedompay.kz/pay.html?customer=x')).toBe(true);
    expect(isTrustedPaymentRedirect('https://freedompay.kz/pay')).toBe(true);
  });

  it('rejects look-alike hosts, plain http, scripts and empty values', () => {
    expect(isTrustedPaymentRedirect('http://customer.freedompay.kz/pay')).toBe(false);
    expect(isTrustedPaymentRedirect('https://freedompay.kz.evil.example/pay')).toBe(false);
    expect(isTrustedPaymentRedirect('https://evilfreedompay.kz/pay')).toBe(false);
    expect(isTrustedPaymentRedirect('javascript:alert(1)')).toBe(false);
    expect(isTrustedPaymentRedirect('')).toBe(false);
    expect(isTrustedPaymentRedirect(null)).toBe(false);
  });
});

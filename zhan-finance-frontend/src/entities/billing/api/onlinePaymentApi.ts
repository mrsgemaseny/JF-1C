import { apiRequest } from '@/shared/api/http';

export type OnlinePaymentStatus = 'CREATED' | 'REDIRECTED' | 'PAID' | 'FAILED' | 'EXPIRED';

export interface OnlinePaymentIntentDto {
  orderId: string;
  invoiceId: number;
  amount: number;
  currency: string;
  status: OnlinePaymentStatus;
  redirectUrl: string | null;
  failureReason: string | null;
}

export interface OnlinePaymentOptionsDto {
  freedomPayEnabled: boolean;
  kaspiPayEnabled: boolean;
}

const BASE = '/api/v1/billing/online-payments';

export const onlinePaymentApi = {
  getOptions: () => apiRequest<OnlinePaymentOptionsDto>(`${BASE}/options`),

  startFreedomPayment: (invoiceId: number) =>
    apiRequest<OnlinePaymentIntentDto>(`${BASE}/freedom/invoices/${invoiceId}`, { method: 'POST' }),

  getFreedomOrder: (orderId: string) =>
    apiRequest<OnlinePaymentIntentDto>(`${BASE}/freedom/orders/${encodeURIComponent(orderId)}`),
};

/**
 * The redirect target comes from the backend, which only accepts Freedom Pay hosts. The client
 * checks it again so a compromised response can never send the user to an arbitrary site.
 */
export function isTrustedPaymentRedirect(url: string | null | undefined): url is string {
  if (!url) return false;
  try {
    const u = new URL(url);
    return (
      u.protocol === 'https:' &&
      (u.hostname === 'freedompay.kz' || u.hostname.endsWith('.freedompay.kz') ||
        u.hostname === 'freedompay.kg' || u.hostname.endsWith('.freedompay.kg') ||
        u.hostname === 'freedompay.money' || u.hostname.endsWith('.freedompay.money'))
    );
  } catch {
    return false;
  }
}

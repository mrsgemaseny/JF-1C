import { apiRequest } from '@/shared/api/http';

export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PAID' | 'OVERDUE' | 'CANCELED' | 'PENDING' | 'CANCELLED';

export interface InvoiceDto {
  id: number;
  clientId: number;
  title: string;
  amount: number;
  status: InvoiceStatus;
  dueDate: string;
}

export type SubscriptionStatus = 'PENDING' | 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'CANCELED' | 'EXPIRED';

export interface SubscriptionDto {
  id: number;
  planName: string;
  monthlyPrice: number;
  status: SubscriptionStatus;
  startsAt: string;
  endsAt: string | null;
}

export const billingApi = {
  getInvoices: () => apiRequest<InvoiceDto[]>('/api/v1/billing/invoices'),
  getInvoice: (id: number) => apiRequest<InvoiceDto>(`/api/v1/billing/invoices/${id}`),
  createInvoice: (data: Omit<InvoiceDto, 'id'>) => apiRequest<InvoiceDto>('/api/v1/billing/invoices', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateInvoice: (id: number, data: Partial<InvoiceDto>) => apiRequest<InvoiceDto>(`/api/v1/billing/invoices/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteInvoice: (id: number) => apiRequest<void>(`/api/v1/billing/invoices/${id}`, {
    method: 'DELETE',
  }),

  getSubscriptions: () => apiRequest<SubscriptionDto[]>('/api/v1/billing/subscriptions'),
  getSubscription: (id: number) => apiRequest<SubscriptionDto>(`/api/v1/billing/subscriptions/${id}`),
  createSubscription: (data: Omit<SubscriptionDto, 'id'>) => apiRequest<SubscriptionDto>('/api/v1/billing/subscriptions', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateSubscription: (id: number, data: Partial<SubscriptionDto>) => apiRequest<SubscriptionDto>(`/api/v1/billing/subscriptions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteSubscription: (id: number) => apiRequest<void>(`/api/v1/billing/subscriptions/${id}`, {
    method: 'DELETE',
  }),
};

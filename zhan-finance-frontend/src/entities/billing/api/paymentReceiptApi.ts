import { apiRequest, apiDownload } from '@/shared/api/http';

export type PaymentReceiptStatus = 'AWAITING_REVIEW' | 'CONFIRMED' | 'REJECTED';

export interface PaymentReceiptDto {
  id: number;
  clientId: number;
  clientName: string | null;
  clientEmail: string | null;
  subscriptionId: number | null;
  planName: string | null;
  invoiceId: number | null;
  invoiceTitle: string | null;
  amount: number;
  currency: string;
  receiptFileKey: string;
  status: PaymentReceiptStatus;
  reviewedById: number | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
  rejectNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentRequisitesDto {
  recipientName: string;
  bin: string;
  iban: string;
  kbe: string;
  bankName: string;
  kaspiPayUrl?: string;
}

export interface PaymentReceiptUrlResponse {
  url: string;
  expiresInSeconds: number;
}

export const paymentReceiptApi = {
  submitReceipt: (formData: FormData) =>
    apiRequest<PaymentReceiptDto>('/api/v1/billing/receipts', {
      method: 'POST',
      body: formData,
    }),

  getMyReceipts: () =>
    apiRequest<PaymentReceiptDto[]>('/api/v1/billing/receipts'),

  getReceiptFileUrl: (id: number) =>
    apiRequest<PaymentReceiptUrlResponse>(`/api/v1/billing/receipts/${id}/file`),

  getRequisites: () =>
    apiRequest<PaymentRequisitesDto>('/api/v1/billing/receipts/requisites'),

  getAllReceipts: (status?: PaymentReceiptStatus) =>
    apiRequest<PaymentReceiptDto[]>(
      status ? `/api/v1/admin/billing/receipts?status=${status}` : '/api/v1/admin/billing/receipts'
    ),

  confirmReceipt: (id: number) =>
    apiRequest<PaymentReceiptDto>(`/api/v1/admin/billing/receipts/${id}/confirm`, {
      method: 'POST',
    }),

  rejectReceipt: (id: number, note: string) =>
    apiRequest<PaymentReceiptDto>(`/api/v1/admin/billing/receipts/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    }),

  downloadReceiptFile: (urlOrPath: string) =>
    apiDownload(urlOrPath),
};

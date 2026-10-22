import { apiRequest } from '@/shared/api/http';

export type InvoiceStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELED';

export interface MobileInvoiceDto {
  id: number;
  clientId?: number;
  title: string;
  amount: number;
  status: InvoiceStatus;
  dueDate: string;
}

export const billingMobileApi = {
  getInvoices(): Promise<MobileInvoiceDto[]> {
    return apiRequest<MobileInvoiceDto[]>('/api/v1/billing/invoices');
  },

  uploadReceipt(
    invoiceId: number,
    amount: number,
    fileUri: string,
    fileName: string,
    mimeType: string
  ): Promise<void> {
    const formData = new FormData();
    formData.append('invoiceId', String(invoiceId));
    formData.append('amount', String(amount));
    formData.append('currency', 'KZT');
    formData.append('file', {
      uri: fileUri,
      name: fileName,
      type: mimeType,
    } as unknown as Blob);

    return apiRequest<void>('/api/v1/billing/receipts', {
      method: 'POST',
      body: formData,
    });
  },
};

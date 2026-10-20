import { apiRequest } from '@/shared/api/http';

export type InvoiceStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELED';

export interface MobileInvoiceDto {
  id: number;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  dueDate: string;
  description?: string;
  clientName?: string;
}

export const billingMobileApi = {
  getInvoices(): Promise<MobileInvoiceDto[]> {
    return apiRequest<MobileInvoiceDto[]>('/api/v1/invoices');
  },

  uploadReceipt(
    invoiceId: number,
    fileUri: string,
    fileName: string,
    mimeType: string
  ): Promise<void> {
    const formData = new FormData();
    formData.append('invoiceId', String(invoiceId));
    formData.append('file', {
      uri: fileUri,
      name: fileName,
      type: mimeType,
    } as unknown as Blob);

    return apiRequest<void>('/api/v1/payment-receipts', {
      method: 'POST',
      body: formData,
    });
  },
};

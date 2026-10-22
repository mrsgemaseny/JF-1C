import { apiRequest } from '@/shared/api/http';

export interface MobileDocumentDto {
  id: number;
  userId?: number;
  clientName?: string;
  fileName: string;
  contentType?: string;
  fileSize?: number;
  status: string;
  createdAt?: string;
  folder?: string;
  downloadUrl?: string;
}

export const documentMobileApi = {
  getDocuments(): Promise<MobileDocumentDto[]> {
    return apiRequest<MobileDocumentDto[]>('/api/v1/documents');
  },
};

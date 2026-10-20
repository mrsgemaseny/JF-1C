import { apiRequest } from '@/shared/api/http';

export interface MobileDocumentDto {
  id: number;
  title: string;
  fileName: string;
  fileSize?: number;
  category?: string;
  createdAt: string;
  downloadUrl?: string;
}

export const documentMobileApi = {
  getDocuments(): Promise<MobileDocumentDto[]> {
    return apiRequest<MobileDocumentDto[]>('/api/v1/documents');
  },
};

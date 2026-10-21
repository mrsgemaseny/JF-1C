import {
  apiRequest,
  ApiError,
  enqueueOfflineMutation,
} from '@/shared/api/http';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TaskStageKey = 'ALL' | 'NEW' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';

export interface MobileTaskDto {
  id: number;
  title: string;
  description?: string;
  stageName: string;
  stageCode?: string;
  priority: TaskPriority;
  clientName?: string;
  assigneeName?: string;
  dueDate?: string;
  createdAt: string;
}

export const taskMobileApi = {
  getTasks(): Promise<MobileTaskDto[]> {
    return apiRequest<MobileTaskDto[]>('/api/v1/crm/tasks');
  },

  getTaskPool(): Promise<MobileTaskDto[]> {
    return apiRequest<MobileTaskDto[]>('/api/v1/crm/tasks?unassigned=true');
  },

  claimFromPool(taskId: number): Promise<MobileTaskDto> {
    return apiRequest<MobileTaskDto>(`/api/v1/crm/tasks/${taskId}/claim`, {
      method: 'POST',
    });
  },

  async addTaskComment(taskId: number, content: string): Promise<{ queuedOffline: boolean }> {
    const path = `/api/v1/crm/tasks/${taskId}/comments`;
    try {
      await apiRequest(path, {
        method: 'POST',
        body: JSON.stringify({ content }),
      });
      return { queuedOffline: false };
    } catch (err) {
      if (err instanceof ApiError && err.isNetworkError) {
        enqueueOfflineMutation(path, 'POST', { content });
        return { queuedOffline: true };
      }
      throw err;
    }
  },
};

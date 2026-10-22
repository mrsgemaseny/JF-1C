import {
  apiRequest,
  ApiError,
  enqueueOfflineMutation,
} from '@/shared/api/http';

export interface TaskStageDto {
  id: number;
  name: string;
  color?: string;
  type?: string;
}

export interface TaskClientDto {
  id: number;
  fullName: string;
  phone?: string;
  email?: string;
}

export interface MobileTaskDto {
  id: number;
  title: string;
  description?: string;
  stage?: TaskStageDto;
  client?: TaskClientDto;
  amount?: number;
  currency?: string;
  dueDate?: string;
  createdAt?: string;
  reassignmentRequested?: boolean;
}

export interface TaskCommentDto {
  id: number;
  text?: string;
  content?: string;
  authorName?: string;
  createdAt: string;
}

export interface TaskPipelineDto {
  id: number;
  name: string;
  stages: TaskStageDto[];
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

  createTaskRequest(request: { title: string; description?: string }): Promise<MobileTaskDto> {
    return apiRequest<MobileTaskDto>('/api/v1/crm/tasks/request', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  createTask(request: {
    title: string;
    description?: string;
    amount?: number;
    dueDate?: string;
    stageId?: number;
  }): Promise<MobileTaskDto> {
    return apiRequest<MobileTaskDto>('/api/v1/crm/tasks', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  updateStage(taskId: number, stageId: number, lostReason?: string): Promise<MobileTaskDto> {
    return apiRequest<MobileTaskDto>(`/api/v1/crm/tasks/${taskId}/stage`, {
      method: 'PATCH',
      body: JSON.stringify({ stageId, lostReason }),
    });
  },

  getPipelines(): Promise<{ id: number; name: string; stages: TaskStageDto[] }[]> {
    return apiRequest<{ id: number; name: string; stages: TaskStageDto[] }[]>('/api/v1/crm/pipelines');
  },

  getTask(taskId: number): Promise<MobileTaskDto> {
    return apiRequest<MobileTaskDto>(`/api/v1/crm/tasks/${taskId}`);
  },

  getTaskComments(
    taskId: number
  ): Promise<{ id: number; text?: string; content?: string; authorName?: string; createdAt: string }[]> {
    return apiRequest<
      { id: number; text?: string; content?: string; authorName?: string; createdAt: string }[]
    >(`/api/v1/crm/tasks/${taskId}/comments`);
  },

  async addTaskComment(taskId: number, text: string): Promise<any> {
    const path = `/api/v1/crm/tasks/${taskId}/comments`;
    const payload = { text, content: text };
    try {
      return await apiRequest(path, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch (err) {
      if (err instanceof ApiError && err.isNetworkError) {
        enqueueOfflineMutation(path, 'POST', payload);
        return { queuedOffline: true };
      }
      throw err;
    }
  },
};

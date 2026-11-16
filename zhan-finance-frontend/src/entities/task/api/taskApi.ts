import { apiRequest, apiDownload } from '@/shared/api/http';
import type { TaskDto, TaskCreateRequest, TaskRequestCreateRequest, TaskFilter } from '../model/types';

export async function getTasks(filter?: TaskFilter): Promise<TaskDto[]> {
  const query = new URLSearchParams();
  if (filter?.stageId) query.append('stageId', filter.stageId.toString());
  if (filter?.clientId) query.append('clientId', filter.clientId.toString());
  if (filter?.assignedToId) query.append('assignedToId', filter.assignedToId.toString());
  if (filter?.unassigned) query.append('unassigned', 'true');
  
  const queryString = query.toString() ? `?${query.toString()}` : '';
  return apiRequest<TaskDto[]>(`/api/v1/crm/tasks${queryString}`);
}

export async function getArchivedTasks(stageType: 'WON' | 'LOST'): Promise<TaskDto[]> {
  return apiRequest<TaskDto[]>(`/api/v1/crm/tasks/archived?stageType=${stageType}`);
}

export async function exportTasksCsv(filter?: TaskFilter): Promise<Blob> {
  const query = new URLSearchParams();
  if (filter?.stageId) query.append('stageId', filter.stageId.toString());
  if (filter?.clientId) query.append('clientId', filter.clientId.toString());
  if (filter?.assignedToId) query.append('assignedToId', filter.assignedToId.toString());
  
  const queryString = query.toString() ? `?${query.toString()}` : '';
  return apiDownload(`/api/v1/crm/export/tasks${queryString}`);
}

export async function getTask(id: number): Promise<TaskDto> {
  return apiRequest<TaskDto>(`/api/v1/crm/tasks/${id}`);
}

export async function createTask(request: TaskCreateRequest): Promise<TaskDto> {
  return apiRequest<TaskDto>('/api/v1/crm/tasks', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

export async function requestTask(request: TaskRequestCreateRequest): Promise<TaskDto> {
  return apiRequest<TaskDto>('/api/v1/crm/tasks/request', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

export async function updateTaskDetails(id: number, data: Partial<TaskDto>): Promise<TaskDto> {
  return apiRequest<TaskDto>(`/api/v1/crm/tasks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function updateTaskStage(id: number, stageId: number, lostReason?: string): Promise<TaskDto> {
  return apiRequest<TaskDto>(`/api/v1/crm/tasks/${id}/stage`, {
    method: 'PATCH',
    body: JSON.stringify({ stageId, lostReason }),
  });
}

export async function archiveTask(id: number): Promise<TaskDto> {
  return apiRequest<TaskDto>(`/api/v1/crm/tasks/${id}/archive`, {
    method: 'POST'
  });
}

export async function assignTask(id: number, assigneeId?: number): Promise<TaskDto> {
  const query = assigneeId ? `?assigneeId=${assigneeId}` : '';
  return apiRequest<TaskDto>(`/api/v1/crm/tasks/${id}/assign${query}`, {
    method: 'PATCH',
  });
}

export async function claimTask(id: number): Promise<TaskDto> {
  return apiRequest<TaskDto>(`/api/v1/crm/tasks/${id}/claim`, {
    method: 'POST',
  });
}

export async function deleteTask(id: number): Promise<void> {
  return apiRequest<void>(`/api/v1/crm/tasks/${id}`, {
    method: 'DELETE',
  });
}

export async function requestReassignment(id: number): Promise<TaskDto> {
  return apiRequest<TaskDto>(`/api/v1/crm/tasks/${id}/reassign/request`, {
    method: 'POST',
  });
}

export async function approveReassignment(id: number): Promise<TaskDto> {
  return apiRequest<TaskDto>(`/api/v1/crm/tasks/${id}/reassign/approve`, {
    method: 'POST',
  });
}

export async function rejectReassignment(id: number): Promise<TaskDto> {
  return apiRequest<TaskDto>(`/api/v1/crm/tasks/${id}/reassign/reject`, {
    method: 'POST',
  });
}

export async function batchUpdateTasks(updatedTasks: TaskDto[]): Promise<void> {
  await apiRequest<TaskDto[]>('/api/v1/crm/tasks/batch', {
    method: 'PUT',
    body: JSON.stringify({ updates: updatedTasks }),
  });
}

import type { TaskCommentDto, TaskActivityDto } from '../model/types';

export async function getTaskComments(taskId: number): Promise<TaskCommentDto[]> {
  return apiRequest<TaskCommentDto[]>(`/api/v1/crm/tasks/${taskId}/comments`);
}

export async function addTaskComment(taskId: number, text: string): Promise<TaskCommentDto> {
  return apiRequest<TaskCommentDto>(`/api/v1/crm/tasks/${taskId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}

export async function getTaskHistory(taskId: number): Promise<TaskActivityDto[]> {
  return apiRequest<TaskActivityDto[]>(`/api/v1/crm/tasks/${taskId}/history`);
}
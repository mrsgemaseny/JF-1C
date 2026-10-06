import type { ServiceDto } from '@/entities/service/api/servicesApi';

export type StageType = 'OPEN' | 'WON' | 'LOST';

export interface UserLabelDto {
  id: number;
  userId: number;
  name: string;
  color: string;
}

export interface StageDto {
  id: number;
  pipelineId: number;
  name: string;
  nameEn?: string;
  orderIndex: number;
  color?: string;
  type: StageType;
  isDefault: boolean;
  slaHours?: number;
  isPreFinal?: boolean;
}

export interface PipelineDto {
  id: number;
  name: string;
  isDefault: boolean;
  stages: StageDto[];
}



import type { UserRole } from '@/features/auth/authApi';

export interface UserDto {
  id: number;
  fullName: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
}

export interface ClientInfoDto {
  id: number;
  fullName: string;
  email: string;
  phone?: string;
  companyName?: string;
  avatarUrl?: string;
}

export interface EmployeeInfoDto {
  id: number;
  fullName: string;
  email: string;
  avatarUrl?: string;
}

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type SubtaskStatus = 'NEW' | 'IN_PROGRESS' | 'DONE';

export interface SubtaskDto {
  id: number;
  taskId: number;
  title: string;
  status: SubtaskStatus;
  createdAt: string;
}

export interface TaskCommentDto {
  id: number;
  taskId: number;
  author: UserDto;
  text: string;
  createdAt: string;
}

export interface TaskActivityDto {
  id: number;
  taskId: number;
  actor: UserDto;
  actionText: string;
  createdAt: string;
}

export interface TaskDto {
  id: number;
  title: string;
  description?: string;
  clientId?: number;
  client?: ClientInfoDto;
  assignedToId?: number;
  assignedTo?: EmployeeInfoDto;
  stageId?: number;
  stage?: StageDto;
  amount?: number;
  currency?: string;
  source?: string;
  closedAt?: string;
  lostReason?: string;
  dueDate: string | null;
  createdBy: UserDto | null;
  createdAt: string;
  updatedAt: string;
  stagePosition: number;
  reassignmentRequested: boolean;
  subtasks: SubtaskDto[];
  tags: string[];
  serviceIds: number[];
  services: ServiceDto[];
  comments?: TaskCommentDto[];
  history?: TaskActivityDto[];
  archived: boolean;
  editedAt?: string;
  userLabels?: UserLabelDto[];
  isSlaBreached?: boolean;
}

export interface TaskCreateRequest {
  title: string;
  description?: string;
  clientId: number;
  assignedToId?: number;
  priority?: TaskPriority;
  dueDate?: string;
  subtasks?: { title: string; status?: string }[];
  serviceIds?: number[];
  pipelineId?: number;
}

export interface TaskRequestCreateRequest {
  title: string;
  description?: string;
  clientId: number;
  dueDate?: string;
  subtasks?: { title: string; status?: string }[];
  serviceIds?: number[];
}

export interface TaskFilter {
  stageId?: number;
  clientId?: number;
  assignedToId?: number;
  unassigned?: boolean;
}

export interface TaskBatchUpdateRequest {
  updates: {
    id: number;
    stageId?: number;
    tags?: string[];
    priority?: TaskPriority;
    title?: string;
    description?: string;
    dueDate?: string;
    assignedToId?: number;
  }[];
}

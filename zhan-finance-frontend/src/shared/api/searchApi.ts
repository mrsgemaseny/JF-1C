import { apiRequest } from '@/shared/api/http';

export interface TaskSearchDto {
  id: number;
  title: string;
  client?: { fullName?: string } | null;
  stage?: { name?: string } | null;
}

export interface UserSearchDto {
  id: number;
  fullName: string;
  email: string;
  role: string;
}

export interface CourseSearchDto {
  id: number;
  title: string;
  description: string;
  isPublished: boolean;
}

export interface LessonSearchDto {
  id: number;
  chapterId?: number;
  courseId?: number;
  sectionId?: number;
  title: string;
  description: string;
  type: string;
}

export interface GlobalSearchResponse {
  tasks: TaskSearchDto[];
  users: UserSearchDto[];
  courses: CourseSearchDto[];
  lessons: LessonSearchDto[];
}

export async function searchGlobal(query: string): Promise<GlobalSearchResponse> {
  return apiRequest<GlobalSearchResponse>(`/api/v1/search?q=${encodeURIComponent(query)}`);
}

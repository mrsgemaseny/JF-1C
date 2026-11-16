import { apiRequest } from '@/shared/api/http';

export interface LessonDto {
  id: number;
  chapterId: number;
  title: string;
  description: string;
  type: 'VIDEO' | 'PRESENTATION' | 'DOCUMENT';
  orderIndex: number;
  durationMinutes: number;
  isPreview: boolean;
  content?: string;
  mediaUrl?: string;
  fileUrl?: string;
}

export interface ChapterDto {
  id: number;
  courseId: number;
  title: string;
  orderIndex: number;
  lessons: LessonDto[];
}

export interface CourseDto {
  id: number;
  title: string;
  description: string;
  thumbnail?: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  createdById: number;
  createdAt: string;
  chapters: ChapterDto[];
}

export interface CourseProgressDto {
  courseId: number;
  completionPercentage: number;
  isCompleted: boolean;
  completedLessonIds: number[];
  unlockedLessonIds?: number[];
  canCompleteToday?: boolean;
  certificateCode?: string;
}

export interface CertificateDto {
  id: number;
  certificateCode: string;
  userId: number;
  userName: string;
  courseId: number;
  courseTitle: string;
  issuedAt: string;
}

// Learner API
export async function getPublishedCourses(): Promise<CourseDto[]> {
  return await apiRequest<CourseDto[]>('/api/v1/courses');
}

export async function getCourseById(id: number): Promise<CourseDto> {
  return await apiRequest<CourseDto>(`/api/v1/courses/${id}`);
}

export async function getCourseProgress(courseId: number): Promise<CourseProgressDto> {
  return await apiRequest<CourseProgressDto>(`/api/v1/courses/${courseId}/progress`);
}

export async function completeLesson(courseId: number, lessonId: number): Promise<void> {
  await apiRequest(`/api/v1/courses/${courseId}/lessons/${lessonId}/complete`, {
    method: 'POST'
  });
}

export async function getCertificate(courseId: number): Promise<CertificateDto> {
  return await apiRequest<CertificateDto>(`/api/v1/courses/${courseId}/certificate`);
}

export async function downloadCertificatePdf(courseId: number): Promise<void> {
  const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/v1/courses/${courseId}/certificate/download`, {
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error('Failed to download certificate');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `certificate-${courseId}.pdf`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

export async function verifyCertificate(code: string): Promise<CertificateDto> {
  return await apiRequest<CertificateDto>(`/api/v1/courses/certificates/verify/${code}`);
}

// Admin API
export async function getAdminCourses(): Promise<CourseDto[]> {
  return await apiRequest<CourseDto[]>('/api/v1/admin/courses');
}

export async function getAdminCourseById(id: number): Promise<CourseDto> {
  return await apiRequest<CourseDto>(`/api/v1/admin/courses/${id}`);
}

export async function createCourse(title: string, description: string, isPublished: boolean): Promise<CourseDto> {
  const formData = new URLSearchParams();
  formData.append('title', title);
  formData.append('description', description);
  formData.append('isPublished', String(isPublished));

  return await apiRequest<CourseDto>('/api/v1/admin/courses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString()
  });
}

export async function updateCourse(id: number, title: string, description: string, isPublished: boolean): Promise<CourseDto> {
  const formData = new URLSearchParams();
  formData.append('title', title);
  formData.append('description', description);
  formData.append('isPublished', String(isPublished));

  return await apiRequest<CourseDto>(`/api/v1/admin/courses/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString()
  });
}

export async function deleteCourse(id: number): Promise<void> {
  await apiRequest(`/api/v1/admin/courses/${id}`, {
    method: 'DELETE'
  });
}

export async function createLesson(
  courseId: number, 
  title: string, 
  description: string, 
  type: string, 
  file?: File
): Promise<LessonDto> {
  const formData = new FormData();
  formData.append('title', title);
  formData.append('description', description);
  formData.append('type', type);
  if (file) {
    formData.append('file', file);
  }

  return await apiRequest<LessonDto>(`/api/v1/admin/courses/${courseId}/lessons`, {
    method: 'POST',
    body: formData // Note: Content-Type is intentionally omitted for FormData
  });
}

export async function deleteLesson(lessonId: number): Promise<void> {
  await apiRequest(`/api/v1/admin/courses/lessons/${lessonId}`, {
    method: 'DELETE',
  });
}

export async function updateLesson(
  lessonId: number,
  title?: string,
  description?: string,
  content?: string,
  orderIndex?: number,
  videoFile?: File | null,
  documentFile?: File | null,
  durationMinutes?: number,
  isPreview?: boolean,
  mediaUrl?: string
): Promise<LessonDto> {
  const formData = new FormData();
  if (title !== undefined) formData.append('title', title);
  if (description !== undefined) formData.append('description', description);
  if (content !== undefined) formData.append('content', content);
  if (orderIndex !== undefined) formData.append('orderIndex', String(orderIndex));
  if (durationMinutes !== undefined) formData.append('durationMinutes', String(durationMinutes));
  if (isPreview !== undefined) formData.append('isPreview', String(isPreview));
  if (mediaUrl !== undefined) formData.append('mediaUrl', mediaUrl);
  if (videoFile) formData.append('videoFile', videoFile);
  if (documentFile) formData.append('documentFile', documentFile);

  return await apiRequest<LessonDto>(`/api/v1/admin/courses/lessons/${lessonId}`, {
    method: 'PUT',
    body: formData
  });
}

export async function createChapter(
  courseId: number,
  title: string,
  orderIndex: number = 0
): Promise<ChapterDto> {
  const formData = new URLSearchParams();
  formData.append('title', title);
  formData.append('orderIndex', String(orderIndex));

  return await apiRequest<ChapterDto>(`/api/v1/admin/courses/${courseId}/chapters`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString()
  });
}

export async function deleteChapter(chapterId: number): Promise<void> {
  await apiRequest(`/api/v1/admin/courses/chapters/${chapterId}`, {
    method: 'DELETE'
  });
}

export async function createLessonForChapter(
  chapterId: number,
  title: string,
  description: string,
  type: string,
  orderIndex: number = 0
): Promise<LessonDto> {
  const formData = new URLSearchParams();
  formData.append('title', title);
  if (description) formData.append('description', description);
  formData.append('type', type);
  formData.append('orderIndex', String(orderIndex));

  return await apiRequest<LessonDto>(`/api/v1/admin/courses/chapters/${chapterId}/lessons`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString()
  });
}

export async function uploadMedia(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('file', file);
  return await apiRequest<{ url: string }>('/api/v1/admin/media/upload', {
    method: 'POST',
    body: formData
  });
}

import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { TaskDetailsModal } from '@/widgets/task-details-modal/ui/TaskDetailsModal';
import { useTaskQuery } from '@/entities/task/api/taskQueries';
import { useAuth } from '@/features/auth/AuthContext';
import type { TaskDto } from '@/entities/task/model/types';
import { useTranslation } from 'react-i18next';

export function TaskDetailsPage() {
  const { t } = useTranslation('crm');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: task, isLoading, error, refetch } = useTaskQuery(Number(id), !!id);

  if (!id) return null;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-brand-green" size={32} />
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="text-center text-red-500 py-10">
        {t('taskDetailsPage.loadError', { defaultValue: 'Ошибка при загрузке задачи.' })}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto pb-20 h-full flex flex-col">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-500 hover:text-brand-green mb-6 transition-colors"
      >
        <ArrowLeft size={18} />
        <span>{t('taskDetailsPage.back', { defaultValue: 'Назад' })}</span>
      </button>

      <div className="flex-1 min-h-[600px]">
        <TaskDetailsModal 
          task={task} 
          isModal={false} 
          userRole={user?.role as any} 
          onUpdateTask={() => refetch()} 
        />
      </div>
    </div>
  );
}

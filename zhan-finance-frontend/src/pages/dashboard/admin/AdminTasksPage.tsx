import { useEffect, useRef, useState } from 'react';
import { useTasksQuery, useBatchUpdateTasksMutation } from '@/entities/task/api/taskQueries';
import { Spinner } from '@/shared/ui/Spinner';
import { Empty } from '@/shared/ui/Empty';
import type { TaskDto } from '@/entities/task/model/types';
import { TaskKanbanBoard } from '@/widgets/task-board/TaskKanbanBoard';
import type { TaskKanbanBoardRef } from '@/widgets/task-board/TaskKanbanBoard';
import { Plus, Download } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { exportTasksCsv } from '@/entities/task/api/taskApi';
import { useTranslation } from 'react-i18next';
import { TaskCreateModal } from '@/widgets/task-create/TaskCreateModal';

export function AdminTasksPage() {
  const { t } = useTranslation(['common']);
  const { data: tasks, isLoading, error, refetch } = useTasksQuery();
  const { mutateAsync: batchUpdate } = useBatchUpdateTasksMutation();
  const boardRef = useRef<TaskKanbanBoardRef>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const taskIdParam = searchParams.get('taskId');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    if (taskIdParam && tasks && boardRef.current) {
      boardRef.current.openTaskModal(Number(taskIdParam));
      // Remove taskId from URL to avoid re-opening on refresh, or leave it. 
      // We will remove it for a cleaner URL state after modal opens.
      setSearchParams(new URLSearchParams());
    }
  }, [taskIdParam, tasks, setSearchParams]);

  const handleBatchSave = async (allTasks: TaskDto[]) => {
    try {
      await batchUpdate(allTasks);
    } catch (err) {
      alert(err instanceof Error ? err.message : t('adminTasks.updateError', { defaultValue: 'Ошибка обновления задач' }));
    }
  };

  const handleExport = async () => {
    try {
      const blob = await exportTasksCsv();
      const csvBlob = new Blob([blob], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(csvBlob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `tasks_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 100);
    } catch (err) {
      alert(t('adminTasks.exportError', { defaultValue: 'Ошибка экспорта' }));
    }
  };

  if (isLoading) return <Spinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('adminTasks.title', { defaultValue: 'Задачи' })}</h1>
        <div className="flex gap-3">
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Download size={18} />
            <span>{t('adminTasks.exportCSV', { defaultValue: 'Экспорт CSV' })}</span>
          </button>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 bg-brand-green text-white px-4 py-2 rounded-lg font-medium hover:bg-brand-accent transition-colors shadow-sm"
          >
            <Plus size={18} />
            <span>{t('adminTasks.newTaskBtn', { defaultValue: '+ Новая задача' })}</span>
          </button>
        </div>
      </div>

      <TaskKanbanBoard 
        initialTasks={tasks || []}
        userRole="ADMIN"
        ref={boardRef}
      />

      {isCreateModalOpen && (
        <TaskCreateModal
          onClose={() => setIsCreateModalOpen(false)}
          onCreated={() => {
            setIsCreateModalOpen(false);
            refetch();
          }}
        />
      )}
    </div>
  );
}
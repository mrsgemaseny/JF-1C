import { useRef } from 'react';
import { getArchivedTasks, batchUpdateTasks } from '@/entities/task/api/taskApi';
import { useApiData } from '@/shared/hooks/useApiData';
import { Spinner } from '@/shared/ui/Spinner';
import { Empty } from '@/shared/ui/Empty';
import type { TaskDto } from '@/entities/task/model/types';
import { TaskGridBoard, type TaskGridBoardRef } from '@/widgets/task-board/TaskGridBoard';
import { useTranslation } from 'react-i18next';

import { TaskPoolTabs } from '../shared/task-pool/TaskPoolTabs';

export function AdminArchiveDonePage() {
  const { t } = useTranslation(['common']);
  const { data: tasks, isLoading, refetch: fetchTasks } = useApiData(() => getArchivedTasks('WON'));
  const boardRef = useRef<TaskGridBoardRef>(null);

  const handleBatchSave = async (allTasks: TaskDto[]) => {
    try {
      await batchUpdateTasks(allTasks);
      fetchTasks();
    } catch (err) {
      alert(err instanceof Error ? err.message : t('adminArchive.updateError'));
    }
  };

  if (isLoading) return <Spinner />;

  const doneTasks = tasks || [];

  return (
    <div className="h-full flex flex-col w-full">
      <TaskPoolTabs />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('adminArchive.doneTitle')}</h1>
      </div>

      {!doneTasks.length ? (
        <Empty label={t('adminArchive.noDone')} />
      ) : (
        <TaskGridBoard 
          ref={boardRef}
          initialTasks={doneTasks} 
          onBatchSave={handleBatchSave}
          userRole="ADMIN"
        />
      )}
    </div>
  );
}

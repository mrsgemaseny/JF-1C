import React, { useState } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { useTasksQuery } from '@/entities/task/api/taskQueries';
import { useQueryClient } from '@tanstack/react-query';
import { Users, Loader2, Inbox } from 'lucide-react';
import { TaskDetailsModal } from '@/widgets/task-details-modal/ui/TaskDetailsModal';
import { StatusBadge } from '@/shared/ui/Badge';
import { getEmployees } from '@/entities/employee/api/employeeApi';
import type { EmployeeDto } from '@/entities/employee/model/types';
import type { TaskDto } from '@/entities/task/model/types';
import { assignTask } from '@/entities/task/api/taskApi';
import { TASK_QUERY_KEYS } from '@/entities/task/api/taskQueries';
import { ChevronDown, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from '@/shared/ui/Toast/ToastContext';

function CustomAssignDropdown({ employees, disabled, onAssign, assigningTaskId, taskId }: any) {
  const { t } = useTranslation(['common']);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        className="inline-flex items-center justify-between w-40 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-green/20 disabled:opacity-50 transition-all shadow-sm"
      >
        {assigningTaskId === taskId ? t('taskPool.actions.assigning', 'Назначение...') : t('taskPool.actions.assign', 'Назначить')}
        <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && !disabled && (
        <div className="absolute right-0 z-50 mt-2 w-56 origin-top-right rounded-xl bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none overflow-hidden">
          <div className="py-1 max-h-64 overflow-y-auto custom-scrollbar">
            {employees.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500">{t('taskPool.noEmployees', 'Нет доступных сотрудников')}</div>
            ) : (
              employees.map((emp: EmployeeDto) => (
                <button
                  key={emp.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                    onAssign(e, taskId, emp.id);
                  }}
                  className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-brand-green/5 hover:text-brand-green transition-colors text-left font-medium"
                >
                  <span className="w-6 flex-shrink-0"></span>
                  {emp.fullName}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

import { TaskPoolTabs } from './TaskPoolTabs';

export function TaskPoolPage() {
  const { t } = useTranslation(['common']);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: tasksData, isLoading, error, refetch } = useTasksQuery(
    user?.role === 'ADMIN' ? undefined : { unassigned: true },
    !!user // Only run the query when user object is loaded
  );
  const tasks = React.useMemo(() => {
    if (!tasksData) return [];
    return tasksData.filter(t => t.stage?.type !== 'WON' && t.stage?.type !== 'LOST');
  }, [tasksData]);
  const [selectedTask, setSelectedTask] = useState<TaskDto | null>(null);
  const [employees, setEmployees] = React.useState<EmployeeDto[]>([]);
  const [assigningTaskId, setAssigningTaskId] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (user?.role === 'ADMIN') {
      getEmployees().then(setEmployees).catch(console.error);
    }
  }, [user?.role]);

  const handleAssign = async (e: React.MouseEvent | React.ChangeEvent<HTMLSelectElement>, taskId: number, assigneeId?: number) => {
    e.stopPropagation();
    setAssigningTaskId(taskId);
    try {
      await assignTask(taskId, assigneeId);
      queryClient.invalidateQueries({ queryKey: TASK_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: ['adminDashboard'] });
      queryClient.invalidateQueries({ queryKey: ['employeeStats'] });
      refetch();
    } catch (err) {
      console.error('Failed to assign task:', err);
      toast.error(t('taskPool.error.assign', { defaultValue: 'Не удалось назначить задачу' }));
    } finally {
      setAssigningTaskId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={32} className="animate-spin text-brand-green" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-red-500 gap-4">
        <p>{t('taskPool.error.load', { defaultValue: 'Ошибка загрузки пула задач' })}</p>
        <button onClick={() => refetch()} className="px-4 py-2 bg-red-50 hover:bg-red-100 rounded-lg text-sm font-medium transition-colors">
          {t('taskPool.actions.retry', { defaultValue: 'Повторить' })}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full gap-6 pb-20">
      <TaskPoolTabs />
      <div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2 flex items-center gap-3">
          <div className="p-2 bg-brand-green/10 text-brand-green rounded-xl">
            <Users size={24} />
          </div>
          {t('taskPool.title')}
        </h1>
        <p className="text-gray-500">
          {user?.role === 'EMPLOYEE' ? t('taskPool.description.employee', 'Свободные задачи, ожидающие назначения. Вы можете взять любую задачу в работу.') : t('taskPool.description.admin', 'Список всех активных задач. Здесь вы видите всё, можете назначить или переназначить исполнителя.')}
        </p>
      </div>

      {!tasks || tasks.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-12 flex flex-col items-center justify-center text-center shadow-sm">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 mb-4">
            <Inbox size={32} />
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">{t('taskPool.empty')}</h3>
          <p className="text-gray-500 max-w-sm">
            {t('taskPool.emptyDescription', 'Сейчас нет неназначенных задач. Все задачи находятся в работе.')}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-5 text-xs font-semibold text-gray-400 uppercase tracking-wider w-[40%]">{t('taskPool.columns.title')}</th>
                <th className="px-6 py-5 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('taskPool.columns.client')}</th>
                {user?.role === 'ADMIN' && (
                  <th className="px-6 py-5 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('taskPool.columns.assignee', { defaultValue: 'Исполнитель' })}</th>
                )}
                <th className="px-6 py-5 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('taskPool.columns.status')}</th>
                <th className="px-6 py-5 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('taskPool.columns.created')}</th>
                <th className="px-6 py-5 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">{t('taskPool.columns.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tasks.map((task: TaskDto) => (
                <tr 
                  key={task.id} 
                  onClick={() => setSelectedTask(task)}
                  className="hover:bg-brand-green/5 cursor-pointer transition-colors group"
                >
                  <td className="px-6 py-5">
                    <div className="font-semibold text-gray-800 text-base group-hover:text-brand-green transition-colors">{task.title}</div>
                    {task.description && (
                      <div className="text-sm text-gray-500 line-clamp-2 mt-1.5">{task.description}</div>
                    )}
                  </td>
                  <td className="px-6 py-5">
                    {task.client ? (
                      <div className="text-sm font-medium text-gray-700">{task.client.fullName}</div>
                    ) : (
                      <span className="text-xs text-gray-400 italic bg-gray-50 px-2 py-1 rounded">{t('taskPool.noClient', { defaultValue: 'Не указан' })}</span>
                    )}
                  </td>
                  {user?.role === 'ADMIN' && (
                    <td className="px-6 py-5">
                      {task.assignedTo ? (
                        <div className="text-sm font-medium text-gray-700">{task.assignedTo.fullName}</div>
                      ) : (
                        <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-200">{t('taskPool.unassigned', { defaultValue: 'Не назначен' })}</span>
                      )}
                    </td>
                  )}
                  <td className="px-6 py-5">
                    {task.stage && <StatusBadge stage={task.stage} />}
                  </td>
                  <td className="px-6 py-5 text-sm text-gray-500 font-medium">
                    {new Date(task.createdAt).toLocaleDateString(t('common:locale', { defaultValue: 'ru-RU' }))}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-3" onClick={e => e.stopPropagation()}>
                      {user?.role === 'EMPLOYEE' && task.stage?.type !== 'WON' && task.stage?.type !== 'LOST' && (
                        <button
                          title={t('taskPool.actions.take', 'Взять в работу')}
                          disabled={assigningTaskId === task.id}
                          onClick={(e) => handleAssign(e, task.id, user.userId)}
                          className="bg-brand-green text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-brand-green/90 hover:shadow-md transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap"
                        >
                          {assigningTaskId === task.id ? t('taskPool.actions.assigning', 'Назначение...') : t('taskPool.actions.take', 'Взять себе')}
                        </button>
                      )}

                      {user?.role === 'ADMIN' && task.stage?.type !== 'WON' && task.stage?.type !== 'LOST' && (
                        <CustomAssignDropdown
                          taskId={task.id}
                          assigningTaskId={assigningTaskId}
                          employees={employees}
                          disabled={assigningTaskId === task.id}
                          onAssign={handleAssign}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-gray-100">
            {tasks.map((task: TaskDto) => (
              <div 
                key={task.id} 
                onClick={() => setSelectedTask(task)}
                className="p-4 hover:bg-brand-green/5 cursor-pointer transition-colors active:bg-brand-green/10"
              >
                <div className="flex justify-between items-start mb-2 gap-2">
                  <div className="font-bold text-gray-900 line-clamp-2 leading-tight">
                    {task.title}
                  </div>
                  {task.stage && <StatusBadge stage={task.stage} />}
                </div>
                
                {task.description && (
                  <div className="text-sm text-gray-500 line-clamp-2 mb-3 leading-snug">
                    {task.description}
                  </div>
                )}
                
                <div className="flex items-center justify-between text-sm text-gray-500 mb-4 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                  <div className="flex flex-col">
                    <span className="text-xs uppercase font-bold text-gray-400 mb-0.5">{t('taskPool.columns.client')}</span>
                    <span className="font-medium text-gray-700 truncate max-w-[140px]">
                      {task.client ? task.client.fullName : <span className="italic text-gray-400">{t('taskPool.noClient', { defaultValue: 'Не указан' })}</span>}
                    </span>
                  </div>
                  {user?.role === 'ADMIN' && (
                    <div className="flex flex-col text-center">
                      <span className="text-xs uppercase font-bold text-gray-400 mb-0.5">{t('taskPool.columns.assignee', { defaultValue: 'Исполнитель' })}</span>
                      <span className="font-medium text-gray-700 truncate max-w-[100px]">
                        {task.assignedTo ? task.assignedTo.fullName : <span className="text-amber-600 font-bold">{t('taskPool.no', { defaultValue: 'Нет' })}</span>}
                      </span>
                    </div>
                  )}
                  <div className="flex flex-col text-right">
                    <span className="text-xs uppercase font-bold text-gray-400 mb-0.5">{t('taskPool.columns.created')}</span>
                    <span className="font-medium">{new Date(task.createdAt).toLocaleDateString(t('common:locale', { defaultValue: 'ru-RU' }))}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full" onClick={e => e.stopPropagation()}>
                  {user?.role === 'EMPLOYEE' && (
                    <button
                      disabled={assigningTaskId === task.id}
                      onClick={(e) => handleAssign(e, task.id, user.userId)}
                      className="w-full bg-brand-green text-white px-4 py-3 rounded-xl text-sm font-bold hover:bg-brand-green/90 transition-colors active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                    >
                      {assigningTaskId === task.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                      {assigningTaskId === task.id ? t('taskPool.actions.assigning', 'Назначение...') : t('taskPool.actions.take', 'Взять себе')}
                    </button>
                  )}

                  {user?.role === 'ADMIN' && (
                    <div className="w-full">
                      <CustomAssignDropdown
                        taskId={task.id}
                        assigningTaskId={assigningTaskId}
                        employees={employees}
                        disabled={assigningTaskId === task.id}
                        onAssign={handleAssign}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          userRole={user!.role as any}
          onClose={() => setSelectedTask(null)}
          onUpdateTask={(updatedTask) => {
            // Always refetch to ensure the list reflects any stage/detail changes
            refetch();
            if (updatedTask.assignedToId) {
              setSelectedTask(null); // Close modal if it's no longer in the pool (assigned to me or someone else)
            } else {
              setSelectedTask(updatedTask);
            }
          }}
        />
      )}
    </div>
  );
}

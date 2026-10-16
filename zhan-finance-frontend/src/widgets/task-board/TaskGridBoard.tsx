import React, { useState, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';
import { TaskCard } from '@/entities/task/ui/TaskCard';
import type { TaskDto } from '@/entities/task/model/types';
import { TaskSaveButton } from '@/features/task/ui/TaskSaveButton';
import { Filter, ArrowUpDown, X } from 'lucide-react';
import { getEmployees } from '@/entities/employee/api/employeeApi';
import { deleteTask, getTask } from '@/entities/task/api/taskApi';
import { TaskDetailsModal } from '@/widgets/task-details-modal/ui/TaskDetailsModal';
import type { EmployeeDto } from '@/entities/employee/model/types';
import { useApiData } from '@/shared/hooks/useApiData';
import { useTranslation } from 'react-i18next';
import type { UserRole } from '@/features/auth/authApi';

import { labelsApi } from '@/features/labels/api/labelsApi';
import { usePipelinesQuery } from '@/entities/pipeline/api/pipelineQueries';
import { CheckSquare, Square, UserCheck, Layers, Tag } from 'lucide-react';
import type { UserLabelDto } from '@/entities/task/model/types';

interface TaskGridBoardProps {
  initialTasks: TaskDto[];
  onBatchSave: (tasks: TaskDto[]) => Promise<void>;
  userRole: UserRole;
  compact?: boolean;
  maxRows?: number;
  gridColsClass?: string;
}

export interface TaskGridBoardRef {
  createNewTask: (task: TaskDto) => void;
  openTaskModal: (taskId: number) => void;
}

type SortOption = 'newest' | 'oldest' | 'deadline_asc' | 'deadline_desc';

export const TaskGridBoard = forwardRef<TaskGridBoardRef, TaskGridBoardProps>(({ initialTasks, onBatchSave, userRole, compact, maxRows, gridColsClass }, ref) => {
  const { t } = useTranslation(['crm', 'common']);
  
  const STATUS_OPTIONS: { value: string; label: string }[] = [
    { value: 'ALL', label: t('kanban.allStages', { defaultValue: 'Все стадии' }) },
  ];

  const SORT_OPTIONS: { value: SortOption; label: string }[] = [
    { value: 'newest', label: t('kanban.sort.newest', { defaultValue: 'Новые первыми' }) },
    { value: 'oldest', label: t('kanban.sort.oldest', { defaultValue: 'Старые первыми' }) },
    { value: 'deadline_asc', label: t('kanban.sort.deadline_asc', { defaultValue: 'Дедлайн ↑' }) },
    { value: 'deadline_desc', label: t('kanban.sort.deadline_desc', { defaultValue: 'Дедлайн ↓' }) },
  ];

  const [tasks, setTasks] = useState<TaskDto[]>(initialTasks);
  const [isSaving, setIsSaving] = useState(false);
  const [createdTaskIds, setCreatedTaskIds] = useState<Set<number>>(new Set());
  const [selectedTaskForModal, setSelectedTaskForModal] = useState<TaskDto | null>(null);

  // Batch selection state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [batchStageId, setBatchStageId] = useState<number | null>(null);
  const [batchAssigneeId, setBatchAssigneeId] = useState<number | null>(null);
  const [batchLabelId, setBatchLabelId] = useState<number | null>(null);
  const [myLabels, setMyLabels] = useState<UserLabelDto[]>([]);
  const [isApplyingBatch, setIsApplyingBatch] = useState(false);

  const { data: pipelines } = usePipelinesQuery();
  const stages = pipelines?.[0]?.stages || [];

  useEffect(() => {
    labelsApi.getMyLabels().then(setMyLabels).catch(() => {});
  }, []);

  const { data: employees } = useApiData(userRole === 'ADMIN' ? getEmployees : async () => []);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  useImperativeHandle(ref, () => ({
    createNewTask: (task: TaskDto) => {
      setTasks(prev => [task, ...prev]);
      setCreatedTaskIds(prev => new Set(prev).add(task.id));
      setSelectedTaskForModal(task);
    },
    openTaskModal: async (taskId: number) => {
      const existing = tasks.find(t => t.id === taskId);
      if (existing) {
        setSelectedTaskForModal(existing);
      } else {
        try {
          // static getTask import is used instead
          const fetched = await getTask(taskId);
          setSelectedTaskForModal(fetched);
        } catch (e) {
          console.error('Task not found:', e);
          alert('Task not found');
        }
      }
    }
  }));

  useEffect(() => {
    setTasks(initialTasks);
    setCreatedTaskIds(new Set());
  }, [initialTasks]);

  const changedTasks = useMemo(() => {
    return tasks.filter(t => {
      if (createdTaskIds.has(t.id)) return true;
      const initial = initialTasks.find(it => it.id === t.id);
      return initial && JSON.stringify(initial) !== JSON.stringify(t);
    });
  }, [tasks, initialTasks, createdTaskIds]);

  const hasChanges = changedTasks.length > 0;

  // Filter + Sort
  const filteredAndSorted = useMemo(() => {
    let result = [...tasks];

    // Filter by status
    if (statusFilter !== 'ALL') {
      // result = result.filter(t => t.stageId?.toString() === statusFilter);
    }

    // Filter by priority
    

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'deadline_asc': {
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        case 'deadline_desc': {
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
        }
        
        default:
          return 0;
      }
    });

    if (compact && maxRows) {
      result = result.slice(0, maxRows);
    }

    return result;
  }, [tasks, statusFilter, sortBy, compact, maxRows]);

  const hasActiveFilters = statusFilter !== 'ALL';

  // 1. Prevent closing tab
  useEffect(() => {
    if (!hasChanges) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);

  // 2. Prevent React Router navigation
  useEffect(() => {
    if (!hasChanges) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');
      if (link && link.href) {
        if (!window.confirm(t('kanban.unsavedChanges', { defaultValue: 'У вас есть несохраненные изменения! Вы уверены, что хотите уйти?' }))) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };
    document.addEventListener('click', handleClick, { capture: true });
    return () => document.removeEventListener('click', handleClick, { capture: true });
  }, [hasChanges]);

  const handleUpdateTask = (updatedTask: TaskDto) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
  };

  const handleDeleteTask = async (taskId: number) => {
    if (!window.confirm(t('kanban.deleteConfirm', { defaultValue: 'Удалить эту задачу навсегда?' }))) return;
    
    if (taskId > 1000000000000) {
      // Это локальная несохраненная задача, просто удаляем из стейта
      setTasks(prev => prev.filter(t => t.id !== taskId));
      setCreatedTaskIds(prev => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
      return;
    }
    
    try {
      await deleteTask(taskId);
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (e) {
      alert(t('kanban.deleteError', { defaultValue: 'Ошибка при удалении задачи' }));
    }
  };

  const handleSave = async () => {
    if (!hasChanges) return;
    setIsSaving(true);
    try {
      await onBatchSave(tasks);
      setCreatedTaskIds(new Set());
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setTasks(initialTasks);
    setCreatedTaskIds(new Set());
  };

  const handleTaskClick = (id: number) => {
    const task = tasks.find(t => t.id === id);
    if (task) {
      setSelectedTaskForModal(task);
    }
  };

  const clearFilters = () => {
    setStatusFilter('ALL');
    
    setSortBy('newest');
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredAndSorted.length && filteredAndSorted.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAndSorted.map(t => t.id)));
    }
  };

  const toggleSelectOne = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleApplyBatch = async () => {
    if (selectedIds.size === 0) return;
    if (!batchStageId && !batchAssigneeId && !batchLabelId) {
      alert('Выберите хотя бы одно действие (стадию, исполнителя или метку)');
      return;
    }

    setIsApplyingBatch(true);
    try {
      await labelsApi.batchUpdateTasks({
        taskIds: Array.from(selectedIds),
        stageId: batchStageId || undefined,
        assignedToId: batchAssigneeId || undefined,
        labelId: batchLabelId || undefined,
      });

      setTasks(prev => prev.map(t => {
        if (!selectedIds.has(t.id)) return t;
        const copy = { ...t };
        if (batchStageId) copy.stageId = batchStageId;
        if (batchAssigneeId && employees) {
          const emp = employees.find(e => e.id === batchAssigneeId);
          if (emp) copy.assignedTo = { id: emp.id, fullName: emp.fullName, email: emp.email };
        }
        if (batchLabelId) {
          const lbl = myLabels.find(l => l.id === batchLabelId);
          if (lbl && !copy.userLabels?.some(l => l.id === lbl.id)) {
            copy.userLabels = [...(copy.userLabels || []), lbl];
          }
        }
        return copy;
      }));

      setSelectedIds(new Set());
      setBatchStageId(null);
      setBatchAssigneeId(null);
      setBatchLabelId(null);
    } catch (e) {
      console.error(e);
      alert('Ошибка пакетного обновления');
    } finally {
      setIsApplyingBatch(false);
    }
  };

  return (
    <div className="pb-20 relative">
      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
        {!compact && (
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 hover:text-gray-900 bg-white px-3 py-1.5 border rounded-lg shadow-2xs cursor-pointer"
          >
            {selectedIds.size > 0 && selectedIds.size === filteredAndSorted.length ? (
              <CheckSquare size={16} className="text-blue-600" />
            ) : (
              <Square size={16} className="text-gray-400" />
            )}
            <span>{t('taskBoard.selectAll', { defaultValue: 'Выбрать все' })} ({filteredAndSorted.length})</span>
          </button>
        )}

        <Filter size={16} className={compact ? "text-gray-400" : "text-gray-400 ml-2"} />
        
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-sm bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:border-gray-900 focus:outline-none cursor-pointer"
        >
          {STATUS_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        

        <div className="flex items-center gap-1.5">
          <ArrowUpDown size={14} className="text-gray-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="text-sm bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:border-gray-900 focus:outline-none cursor-pointer"
          >
            {SORT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-500 transition-colors ml-auto"
          >
            <X size={14} />
            <span>{t('kanban.reset', { defaultValue: 'Сбросить' })}</span>
          </button>
        )}

        <span className="text-xs text-gray-400 ml-auto">
          {filteredAndSorted.length} {t('kanban.of', { defaultValue: 'из' })} {tasks.length} {t('kanban.tasks', { defaultValue: 'задач' })}
        </span>
      </div>

      {/* Grid */}
      <div className={`grid gap-6 ${gridColsClass || 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
        {filteredAndSorted.map((task) => {
          const isSelected = selectedIds.has(task.id);
          return (
            <div key={task.id} className="relative group">
              {!compact && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelectOne(task.id);
                  }}
                  className="absolute top-3 right-3 z-20 p-1 bg-white/90 rounded-md shadow-xs hover:bg-white transition-colors cursor-pointer"
                  title={t('taskBoard.selectTask', { defaultValue: 'Выбрать задачу' })}
                >
                  {isSelected ? (
                    <CheckSquare size={18} className="text-blue-600" />
                  ) : (
                    <Square size={18} className="text-gray-400 opacity-60 group-hover:opacity-100" />
                  )}
                </button>
              )}

              <div className={isSelected ? 'ring-2 ring-blue-500 rounded-xl' : ''}>
                <TaskCard 
                  task={task} 
                  onClick={() => handleTaskClick(task.id)}
                  onUpdateTask={handleUpdateTask}
                  onDeleteTask={handleDeleteTask}
                  userRole={userRole}
                  employees={employees}
                />
              </div>
            </div>
          );
        })}
      </div>

      {filteredAndSorted.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg font-medium">{t('kanban.noFilteredTasks', { defaultValue: 'Нет задач по выбранным фильтрам' })}</p>
          <button onClick={clearFilters} className="text-sm text-gray-900 hover:underline mt-2">
            {t('kanban.resetFilters', { defaultValue: 'Сбросить фильтры' })}
          </button>
        </div>
      )}

      {/* Floating Bulk Operations Toolbar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-4 border border-gray-800 animate-in fade-in slide-in-from-bottom-5">
          <div className="flex items-center gap-2 pr-3 border-r border-gray-700">
            <CheckSquare size={18} className="text-blue-400" />
            <span className="text-xs font-bold text-gray-100 whitespace-nowrap">
              {selectedIds.size} {t('taskBoard.tasksSelected', { defaultValue: 'задач выбрано' })}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Change Stage */}
            {stages.length > 0 && (
              <div className="flex items-center gap-1">
                <Layers size={14} className="text-gray-400" />
                <select
                  value={batchStageId || ''}
                  onChange={(e) => setBatchStageId(e.target.value ? Number(e.target.value) : null)}
                  className="bg-gray-800 text-xs text-gray-200 border border-gray-700 rounded-lg px-2.5 py-1.5 outline-none cursor-pointer"
                >
                  <option value="">{t('taskBoard.changeStage', { defaultValue: 'Сменить стадию...' })}</option>
                  {stages.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Change Assignee */}
            {employees && employees.length > 0 && (
              <div className="flex items-center gap-1">
                <UserCheck size={14} className="text-gray-400" />
                <select
                  value={batchAssigneeId || ''}
                  onChange={(e) => setBatchAssigneeId(e.target.value ? Number(e.target.value) : null)}
                  className="bg-gray-800 text-xs text-gray-200 border border-gray-700 rounded-lg px-2.5 py-1.5 outline-none cursor-pointer"
                >
                  <option value="">{t('taskBoard.assignEmployee', { defaultValue: 'Назначить сотрудника...' })}</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.fullName}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Apply Label */}
            {myLabels.length > 0 && (
              <div className="flex items-center gap-1">
                <Tag size={14} className="text-gray-400" />
                <select
                  value={batchLabelId || ''}
                  onChange={(e) => setBatchLabelId(e.target.value ? Number(e.target.value) : null)}
                  className="bg-gray-800 text-xs text-gray-200 border border-gray-700 rounded-lg px-2.5 py-1.5 outline-none cursor-pointer"
                >
                  <option value="">{t('taskBoard.addLabel', { defaultValue: 'Добавить метку...' })}</option>
                  {myLabels.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={handleApplyBatch}
              disabled={isApplyingBatch}
              className="ml-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isApplyingBatch ? t('taskBoard.applying', { defaultValue: 'Применяем...' }) : t('taskBoard.apply', { defaultValue: 'Применить' })}
            </button>

            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-gray-400 hover:text-white p-1 ml-1 cursor-pointer"
              title={t('common:actions.deselect', { defaultValue: 'Снять выбор' })}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <TaskSaveButton 
        changesCount={changedTasks.length}
        isSaving={isSaving}
        onSave={handleSave}
        onCancel={handleCancel}
      />

      {selectedTaskForModal && (
        <TaskDetailsModal
          task={selectedTaskForModal}
          onClose={() => setSelectedTaskForModal(null)}
          onUpdateTask={(updated) => {
            handleUpdateTask(updated);
            setSelectedTaskForModal(updated);
          }}
          userRole={userRole}
        />
      )}
    </div>
  );
}
)
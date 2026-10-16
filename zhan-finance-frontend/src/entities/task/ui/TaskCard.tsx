import React, { useState, useRef, useEffect } from 'react';
import type { TaskDto, SubtaskDto } from '../model/types';
import { StatusBadge } from '@/shared/ui/Badge';
import { Square, CheckSquare, Clock, ArrowUpRight, Calendar, CalendarClock, Plus, ChevronDown, MessageSquare, Trash2, X, Paperclip, Loader2 } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { uploadDocument } from '@/entities/document/api/documentApi';

import type { EmployeeDto } from '@/entities/employee/model/types';
import type { UserRole } from '@/features/auth/authApi';
import { useTranslation } from 'react-i18next';
import { DatePicker } from '@/shared/ui/DatePicker';
import { toast } from '@/shared/ui/Toast/ToastContext';

interface TaskCardProps {
  task: TaskDto;
  onClick?: () => void;
  className?: string;
  onUpdateTask: (updatedTask: TaskDto) => void;
  onDeleteTask?: (taskId: number) => void;
  userRole: UserRole;
  employees?: EmployeeDto[] | null;
}

function formatDueDate(dateStr: string): string {
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}.${month}`;
}

function getDueDateInfo(dueDate?: string | null): { color: string; icon: 'overdue' | 'soon' | 'normal' } | null {
  if (!dueDate) return null;

  const now = new Date();
  const due = new Date(dueDate);

  if (due.getTime() < now.getTime()) {
    return { color: 'red', icon: 'overdue' };
  }

  const msIn24h = 24 * 60 * 60 * 1000;
  if (due.getTime() - now.getTime() < msIn24h) {
    return { color: 'orange', icon: 'soon' };
  }

  return { color: 'gray', icon: 'normal' };
}

export function TaskCard({ task, onClick, className, onUpdateTask, onDeleteTask, userRole, employees }: TaskCardProps) {
  const { t } = useTranslation('crm');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingSubtaskId, setEditingSubtaskId] = useState<number | null>(null);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isEditingDueDate, setIsEditingDueDate] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const hasSubtasks = task.subtasks && task.subtasks.length > 0;
  const allSubtasksDone = hasSubtasks 
    ? task.subtasks!.every(st => st.status === 'DONE')
    : true;

  const titleInputRef = useRef<HTMLInputElement>(null);
  const subtaskInputRef = useRef<HTMLInputElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const dueDateInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, [isEditingTitle]);

  useEffect(() => {
    if (editingSubtaskId !== null && subtaskInputRef.current) {
      subtaskInputRef.current.focus();
    }
  }, [editingSubtaskId]);

  // Close status dropdown on outside click
  useEffect(() => {
    if (!isStatusDropdownOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node)) {
        setIsStatusDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isStatusDropdownOpen]);

  const applyAutoStatus = (updatedTask: TaskDto): TaskDto => {
    // Stage logic disabled for now
    return updatedTask;
  };

  const handleTitleSave = (e: React.FocusEvent<HTMLInputElement> | React.KeyboardEvent<HTMLInputElement>) => {
    if ('key' in e && e.key !== 'Enter') return;
    setIsEditingTitle(false);
    const newTitle = (e.target as HTMLInputElement).value.trim();
    if (newTitle && newTitle !== task.title) {
      onUpdateTask({ ...task, title: newTitle });
    }
  };

  const handleSubtaskSave = (e: React.FocusEvent<HTMLInputElement> | React.KeyboardEvent<HTMLInputElement>, subtaskId: number) => {
    if ('key' in e && e.key !== 'Enter') return;
    setEditingSubtaskId(null);
    const newTitle = (e.target as HTMLInputElement).value.trim();

    // If the title is empty, remove the subtask (it was likely a newly added one that user cancelled)
    if (!newTitle) {
      const updatedSubtasks = task.subtasks?.filter(st => st.id !== subtaskId);
      const updatedTask = { ...task, subtasks: updatedSubtasks };
      onUpdateTask(applyAutoStatus(updatedTask));
      return;
    }

    const updatedSubtasks = task.subtasks?.map(st =>
      st.id === subtaskId ? { ...st, title: newTitle } : st
    );
    onUpdateTask({ ...task, subtasks: updatedSubtasks });
  };

  const handleSubtaskClick = (e: React.MouseEvent, subtask: SubtaskDto) => {
    e.stopPropagation();
    let newStatus: SubtaskDto['status'] = 'NEW';
    if (subtask.status === 'NEW') newStatus = 'IN_PROGRESS';
    else if (subtask.status === 'IN_PROGRESS') newStatus = 'DONE';
    else if (subtask.status === 'DONE') newStatus = 'NEW';

    const updatedSubtasks = task.subtasks?.map(st =>
      st.id === subtask.id ? { ...st, status: newStatus } : st
    );
    const updatedTask = { ...task, subtasks: updatedSubtasks };
    onUpdateTask(applyAutoStatus(updatedTask));
  };

  const handleAddSubtask = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newSubtask: SubtaskDto = {
      id: Date.now(),
      taskId: task.id,
      title: '',
      status: 'NEW',
      createdAt: new Date().toISOString(),
    };
    const updatedSubtasks = [...(task.subtasks || []), newSubtask];
    const updatedTask = { ...task, subtasks: updatedSubtasks };
    onUpdateTask(applyAutoStatus(updatedTask));
    setEditingSubtaskId(newSubtask.id);
  };

  const handleStatusSelect = (e: React.MouseEvent, newStatus: string) => {
    e.stopPropagation();
    setIsStatusDropdownOpen(false);
  };

  const handleDueDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    setIsEditingDueDate(false);
    const newDate = e.target.value;
    onUpdateTask({ ...task, dueDate: newDate ? new Date(newDate).toISOString() : null });
  };

  const handleAssigneeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation();
    const employeeId = Number(e.target.value);
    if (!employeeId) {
      onUpdateTask({ ...task, assignedTo: undefined, assignedToId: undefined });
      return;
    }
    const emp = employees?.find(emp => emp.id === employeeId);
    if (emp) {
      onUpdateTask({ ...task, assignedToId: emp.id, assignedTo: { id: emp.id, fullName: emp.fullName, email: emp.email } });
    }
  };

  const completedCount = task.subtasks?.filter(st => st.status === 'DONE').length || 0;
  const inProgressCount = task.subtasks?.filter(st => st.status === 'IN_PROGRESS').length || 0;
  const totalSubtasks = task.subtasks?.length || 0;
  const dueDateInfo = getDueDateInfo(task.dueDate);

  const handleInlineUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      await uploadDocument(file, task.client?.id, task.id);
    } catch (err) {
      console.error('Failed to upload inline', err);
      toast.error(t('taskCard.uploadError', { defaultValue: 'Не удалось загрузить документ' }));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div
      className={twMerge(
        'flex flex-col bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all h-full min-h-[200px]',
        isStatusDropdownOpen ? 'relative z-50' : 'relative z-0',
        className
      )}
    >
      {/* Header: Title + Open button */}
      <div className="flex items-start justify-between mb-3 gap-2">
        {isEditingTitle ? (
          <input
            ref={titleInputRef}
            defaultValue={task.title}
            onBlur={handleTitleSave}
            onKeyDown={handleTitleSave}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 font-semibold text-gray-800 text-base bg-gray-50 border border-gray-300 rounded px-2 py-1 outline-none focus:border-brand-green"
          />
        ) : (
          <h3
            onDoubleClick={(e) => {
              e.stopPropagation(); 
              setIsEditingTitle(true);
            }}
            className="flex-1 font-semibold text-gray-800 text-base leading-tight cursor-text hover:bg-gray-50 rounded px-1 -ml-1 transition-colors"
            title="Double-click to edit"
          >
            {task.title || t('taskCard.untitledTask', { defaultValue: 'Untitled Task' })}
          </h3>
        )}

        {task.reassignmentRequested && (
          <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full" title={t('taskModal.reassignmentRequested')}>
            {t('taskModal.reassignmentRequested')}
          </span>
        )}

        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Hidden file input */}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleInlineUpload} 
            className="hidden" 
          />
          <button
            onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
            disabled={isUploading}
            className="text-gray-400 hover:text-brand-green hover:bg-gray-50 p-1.5 rounded transition-colors flex-shrink-0 disabled:opacity-50"
            title="Attach a document"
          >
            {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Paperclip size={16} />}
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); onClick?.(); }}
            className="text-gray-400 hover:text-brand-green hover:bg-gray-50 p-1.5 rounded transition-colors flex-shrink-0"
            title="Open details"
          >
            <ArrowUpRight size={18} />
          </button>
        </div>
      </div>

      {/* Client info */}
      {task.client && (
        <p className="text-xs text-gray-500 mb-2 truncate bg-gray-50 self-start px-2 py-1 rounded-md">
          {t('taskCard.client', { defaultValue: 'Client:' })} {task.client.fullName}
        </p>
      )}

      {/* Assignee info */}
      {userRole === 'ADMIN' ? (
        <div className="mb-4 text-xs">
          <select 
            value={task.assignedTo?.id || ''}
            onChange={handleAssigneeChange}
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-gray-50 border border-gray-200 text-gray-600 rounded px-2 py-1 outline-none focus:border-brand-green"
          >
            <option value="">{t('taskCard.unassigned', { defaultValue: 'Не назначен' })}</option>
            {employees?.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.fullName}</option>
            ))}
          </select>
        </div>
      ) : task.assignedTo && (
        <p className="text-xs text-gray-500 mb-4 truncate bg-gray-50 self-start px-2 py-1 rounded-md">
          {t('taskCard.assignee', { defaultValue: 'Исполнитель:' })} {task.assignedTo.fullName}
        </p>
      )}

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {task.tags.map(tag => (
            <span key={tag} className="text-[10px] font-medium bg-brand-green/10 text-brand-green px-2 py-0.5 rounded">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Subtasks list */}
      <div className="flex-1 flex flex-col gap-2 mb-4">
        {task.subtasks?.map(st => (
          <div key={st.id} className="flex items-start gap-2 group">
            <div
              onClick={(e) => handleSubtaskClick(e, st)}
              className="mt-0.5 cursor-pointer shrink-0"
              title="Click to change status"
            >
              {st.status === 'DONE' && <CheckSquare size={16} className="text-brand-green" />}
              {st.status === 'IN_PROGRESS' && <Clock size={16} className="text-orange-500" />}
              {st.status === 'NEW' && <Square size={16} className="text-gray-300 group-hover:text-gray-400" />}
            </div>

            {editingSubtaskId === st.id ? (
              <input
                ref={subtaskInputRef}
                defaultValue={st.title}
                onBlur={(e) => handleSubtaskSave(e, st.id)}
                onKeyDown={(e) => handleSubtaskSave(e, st.id)}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 text-sm bg-gray-50 border border-gray-300 rounded px-1 py-0 outline-none focus:border-brand-green"
              />
            ) : (
              <span
                onDoubleClick={(e) => { e.stopPropagation(); setEditingSubtaskId(st.id); }}
                className={twMerge(
                  "text-sm cursor-text px-1 -ml-1 rounded hover:bg-gray-50 transition-colors flex-1",
                  st.status === 'DONE' && "line-through text-gray-400",
                  st.status === 'IN_PROGRESS' && "text-gray-800 font-medium",
                  st.status === 'NEW' && "text-gray-600"
                )}
                title="Double-click to edit"
              >
                {st.title}
              </span>
            )}
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                const updatedSubtasks = task.subtasks?.filter(sub => sub.id !== st.id);
                onUpdateTask({ ...task, subtasks: updatedSubtasks });
              }}
              className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1"
              title={t('taskCard.deleteSubtask', { defaultValue: 'Удалить подзадачу' })}
            >
              <X size={16} />
            </button>
          </div>
        ))}

        {/* Add subtask button */}
        <button
          onClick={handleAddSubtask}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors mt-1 self-start"
        >
          <Plus size={14} />
          <span>{t('taskCard.addSubtask', { defaultValue: 'Добавить подзадачу' })}</span>
        </button>
      </div>

      {/* Progress bar */}
      {totalSubtasks > 0 && (
        <div className="mb-4">
          <div className="w-full bg-gray-100 rounded-full h-1 overflow-hidden flex">
            <div
              className="bg-brand-green h-1 transition-all duration-300"
              style={{ width: `${(completedCount / totalSubtasks) * 100}%` }}
            />
            <div
              className="bg-orange-400 h-1 transition-all duration-300"
              style={{ width: `${(inProgressCount / totalSubtasks) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Status badge */}
      <div className="mb-3">
        <div
          className={twMerge(
            'inline-flex items-center gap-1 rounded-full pr-1',
          )}
        >
          <StatusBadge stage={task.stage} />
        </div>
      </div>

      {/* Action buttons disabled during stage migration */}


      {/* Footer: Priority + dates */}
      <div className="mt-4 flex items-center justify-between pt-3 border-t border-gray-100">
        

        <div className="flex items-center gap-3">
          {/* Comments count */}
          {task.comments && task.comments.length > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-gray-400 font-medium">
              <MessageSquare size={12} />
              {task.comments.length}
            </span>
          )}

          {/* Due date badge (clickable for admin and client) */}
          {task.dueDate && !isEditingDueDate && dueDateInfo && (
            <span
              className={twMerge(
                'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-all shadow-sm border',
                dueDateInfo.color === 'red' ? 'bg-red-50 text-red-600 border-red-200' :
                dueDateInfo.color === 'orange' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                'bg-gray-50 text-gray-600 border-gray-200',
                userRole !== 'EMPLOYEE' ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
              )}
              title={userRole !== 'EMPLOYEE' ? "Click to change due date" : "Due date"}
              onClick={(e) => {
                if (userRole === 'EMPLOYEE') return;
                e.stopPropagation();
                setIsEditingDueDate(true);
              }}
            >
              {dueDateInfo.icon === 'normal'
                ? <Calendar size={14} />
                : <CalendarClock size={14} />
              }
              {formatDueDate(task.dueDate)}
            </span>
          )}

          {/* Due date - no date yet */}
          {!task.dueDate && !isEditingDueDate && userRole !== 'EMPLOYEE' && (
            <button
              className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-50/80 text-gray-400 hover:bg-brand-green/10 hover:text-brand-green transition-all text-xs font-medium border border-dashed border-gray-300 hover:border-brand-green/50"
              title="Set due date"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditingDueDate(true);
              }}
            >
              <Calendar size={14} />
              <span>{t('taskCard.deadline', { defaultValue: 'Дедлайн' })}</span>
            </button>
          )}

          {/* Custom DatePicker for editing */}
          {isEditingDueDate && (
            <div onClick={(e) => e.stopPropagation()}>
              <DatePicker
                value={task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''}
                onChange={(newDate) => {
                  setIsEditingDueDate(false);
                  onUpdateTask({ ...task, dueDate: newDate ? new Date(newDate).toISOString() : null });
                }}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          )}

          {/* Created date */}
          <span className="text-[10px] text-gray-400 font-medium">
            {new Date(task.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );
}

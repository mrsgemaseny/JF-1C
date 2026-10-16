import React, { useState, useEffect, useRef } from 'react';
import {
  X, MessageSquare, Activity, Clock, Tag, User as UserIcon,
  Check, Loader2,
  Paperclip, FileText, Download, Archive, Trash2, Plus, Edit2,
  Hash, PlayCircle, XCircle, Info, ShieldCheck,
} from 'lucide-react';
import type { TaskDto, TaskCommentDto, TaskActivityDto, SubtaskStatus, UserDto } from '@/entities/task/model/types';
import { getTaskComments, addTaskComment, getTaskHistory, assignTask, updateTaskStage, archiveTask, deleteTask, updateTaskDetails, requestReassignment, approveReassignment, rejectReassignment } from '@/entities/task/api/taskApi';
import { getEmployees } from '@/entities/employee/api/employeeApi';
import type { EmployeeDto } from '@/entities/employee/model/types';
import { useAuth } from '@/features/auth/AuthContext';
import type { UserRole } from '@/features/auth/authApi';
import { useTaskActions } from '@/entities/task/lib/useTaskActions';
import { getTaskDocuments, downloadDocument, uploadDocument } from '@/entities/document/api/documentApi';
import { GenerateDocumentButton } from '@/entities/document-template/ui/GenerateDocumentButton';
import type { DocumentDto } from '@/entities/document/model/types';
import { twMerge } from 'tailwind-merge';
import { translateTaskTitle, translateServiceName, translateStageName } from '@/shared/i18n/taskTranslator';
import { useTranslation } from 'react-i18next';
import { useEscapeKey } from '@/shared/lib/hooks/useEscapeKey';
import { usePipelinesQuery } from '@/entities/pipeline/api/pipelineQueries';
import { toast } from '@/shared/ui/Toast/ToastContext';
import { useQueryClient } from '@tanstack/react-query';
import { TASK_QUERY_KEYS } from '@/entities/task/api/taskQueries';

export interface TaskDetailsModalProps {
  task: TaskDto;
  onClose?: () => void;
  onUpdateTask: (updatedTask: TaskDto) => void;
  userRole: UserRole;
  isModal?: boolean;
}

type RightTab = 'comments' | 'history' | 'tags';

// ─── Small reusable atoms ────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3">
      {children}
    </p>
  );
}

function IconBtn({
  onClick, title, className = '', children,
}: { onClick?: () => void; title?: string; className?: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={twMerge(
        'w-9 h-9 flex items-center justify-center rounded-xl text-gray-400',
        'hover:bg-gray-100 hover:text-gray-600 transition-colors',
        className,
      )}
    >
      {children}
    </button>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function TaskDetailsModal({
  task, onClose, onUpdateTask, userRole, isModal = true,
}: TaskDetailsModalProps) {
  const { t, i18n } = useTranslation(['modals', 'crm', 'common']);
  const { user } = useAuth();
  const currentUser = user
    ? { id: user.userId, fullName: user.fullName, email: user.email, role: user.role }
    : null;
  const fallbackUser: UserDto = { id: 0, fullName: '', email: '', role: 'CLIENT' };
  const rawTaskActions = useTaskActions(task, currentUser ?? fallbackUser);
  const taskActions = currentUser ? rawTaskActions : null;
  const { data: pipelines } = usePipelinesQuery();

  // ── Data state ──────────────────────────────────────────────────────────
  const [comments,  setComments]  = useState<TaskCommentDto[]>([]);
  const [history,   setHistory]   = useState<TaskActivityDto[]>([]);
  const [documents, setDocuments] = useState<DocumentDto[]>([]);
  const [employees, setEmployees] = useState<EmployeeDto[]>([]);

  // ── UI state ────────────────────────────────────────────────────────────
  const [rightTab,      setRightTab]      = useState<RightTab>('comments');
  const [newComment,    setNewComment]    = useState('');
  const [isLoading,     setIsLoading]     = useState(false);
  const [isAssigning,   setIsAssigning]   = useState(false);
  const [isUploading,   setIsUploading]   = useState(false);
  const [newSubtask,    setNewSubtask]    = useState('');
  const [showMoreMenu,  setShowMoreMenu]  = useState(false);

  // ── Inline edit state ───────────────────────────────────────────────────
  const [editingTitle, setEditingTitle] = useState(false);
  const [editedTitle,  setEditedTitle]  = useState(task.title);
  const [editingDesc,  setEditingDesc]  = useState(false);
  const [editedDesc,   setEditedDesc]   = useState(task.description || '');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const moreMenuRef  = useRef<HTMLDivElement>(null);

  useEscapeKey(() => { if (onClose) onClose(); }, isModal);

  // ── Fetch helpers ────────────────────────────────────────────────────────
  const fetchComments  = React.useCallback(() => getTaskComments(task.id).then(setComments).catch(console.error), [task.id]);
  const fetchHistory   = React.useCallback(() => getTaskHistory(task.id).then(setHistory).catch(console.error), [task.id]);
  const fetchDocuments = React.useCallback(() => getTaskDocuments(task.id).then(setDocuments).catch(console.error), [task.id]);

  // ── Effects ─────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchComments();
    fetchHistory();
    fetchDocuments();
    if (taskActions?.canAssign) {
      getEmployees().then(setEmployees).catch(console.error);
    }
  }, [task.id, taskActions?.canAssign, fetchComments, fetchHistory, fetchDocuments]);

  useEffect(() => {
    if (!isModal) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && onClose) onClose(); };
    window.addEventListener('keydown', handler);

    return () => window.removeEventListener('keydown', handler);
  }, [isModal, onClose]);

  useEffect(() => {
    if (!showMoreMenu) return;
    const handler = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMoreMenu]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setIsLoading(true);
    try {
      const comment = await addTaskComment(task.id, newComment.trim());
      setComments(p => [...p, comment]);
      setNewComment('');
      onUpdateTask({ ...task, comments: [...(task.comments || []), comment] });
    } catch { console.error('comment failed'); }
    finally { setIsLoading(false); }
  };

  const handleAssign = async (assigneeId: number | null) => {
    if (!currentUser) return;
    setIsAssigning(true);
    try {
      const updated = await assignTask(task.id, assigneeId ?? undefined);
      onUpdateTask(updated);
      fetchHistory();
    } catch { alert(t('taskModal.assignError', { defaultValue: 'Не удалось назначить задачу' })); }
    finally { setIsAssigning(false); }
  };

  const handleSaveTitle = async () => {
    if (editedTitle.trim() && editedTitle !== task.title) {
      try {
        const updated = await updateTaskDetails(task.id, { title: editedTitle.trim() });
        onUpdateTask(updated);
      } catch (err) {
        console.error('Failed to update title', err);
        setEditedTitle(task.title);
      }
    } else {
      setEditedTitle(task.title);
    }
    setEditingTitle(false);
  };

  const handleSaveDesc = async () => {
    if (editedDesc.trim() !== (task.description || '').trim()) {
      try {
        const updated = await updateTaskDetails(task.id, { description: editedDesc.trim() });
        onUpdateTask(updated);
      } catch (err) {
        console.error('Failed to update description', err);
        setEditedDesc(task.description || '');
      }
    }
    setEditingDesc(false);
  };

  const handleAddSubtask = async () => {
    if (!newSubtask.trim()) return;
    const newSubtasks = [
      ...(task.subtasks || []),
      { id: -Date.now(), taskId: task.id, title: newSubtask.trim(), status: 'NEW' as SubtaskStatus, createdAt: new Date().toISOString() },
    ];
    try {
      const updated = await updateTaskDetails(task.id, { subtasks: newSubtasks });
      onUpdateTask(updated);
      setNewSubtask('');
    } catch (err) {
      console.error('Failed to add subtask', err);
    }
  };

  const handleToggleSubtask = async (id: number) => {
    const newSubtasks = task.subtasks?.map(s =>
      s.id === id ? { ...s, status: (s.status === 'DONE' ? 'NEW' : 'DONE') as SubtaskStatus } : s
    ) ?? [];
    try {
      const updated = await updateTaskDetails(task.id, { subtasks: newSubtasks });
      onUpdateTask(updated);
    } catch (err) {
      console.error('Failed to toggle subtask', err);
    }
  };

  async function handleRequestReassignment() {
    setIsAssigning(true);
    try {
      const updated = await requestReassignment(task.id);
      onUpdateTask(updated);
    } catch (error) {
      console.error(error);
    } finally {
      setIsAssigning(false);
    }
  }

  async function handleApproveReassignment() {
    setIsAssigning(true);
    try {
      const updated = await approveReassignment(task.id);
      onUpdateTask(updated);
    } catch (error) {
      console.error(error);
    } finally {
      setIsAssigning(false);
    }
  }

  async function handleRejectReassignment() {
    setIsAssigning(true);
    try {
      const updated = await rejectReassignment(task.id);
      onUpdateTask(updated);
    } catch (error) {
      console.error(error);
    } finally {
      setIsAssigning(false);
    }
  }

  const handleDeleteSubtask = async (id: number) => {
    const newSubtasks = task.subtasks?.filter(s => s.id !== id) ?? [];
    try {
      const updated = await updateTaskDetails(task.id, { subtasks: newSubtasks });
      onUpdateTask(updated);
    } catch (err) {
      console.error('Failed to delete subtask', err);
    }
  };

  const handleAddTag = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    const val = (e.target as HTMLInputElement).value.trim();
    if (val && !task.tags?.includes(val)) {
      try {
        const newTags = [...(task.tags || []), val];
        const updated = await updateTaskDetails(task.id, { tags: newTags });
        onUpdateTask(updated);
      } catch (err) {
        console.error('Failed to add tag', err);
      }
    }
    (e.target as HTMLInputElement).value = '';
  };

  const handleRemoveTag = async (tag: string) => {
    const newTags = task.tags?.filter(t => t !== tag) ?? [];
    try {
      const updated = await updateTaskDetails(task.id, { tags: newTags });
      onUpdateTask(updated);
    } catch (err) {
      console.error('Failed to remove tag', err);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      await uploadDocument(file, task.client?.id, task.id);
      await fetchDocuments();
    } catch { alert(t('taskModal.uploadError', { defaultValue: 'Не удалось загрузить файл' })); }
    finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);

  const handleArchive = async () => {
    if (!window.confirm(t('taskModal.confirmArchive', { defaultValue: 'Архивировать задачу?' }))) return;
    try {
      const updated = await archiveTask(task.id);
      onUpdateTask(updated);
      onClose?.();
    } catch { toast.error(t('taskModal.archiveError', { defaultValue: 'Ошибка архивирования' })); }
    finally { setShowMoreMenu(false); }
  };

  const handleOpenClientReject = () => {
    setShowMoreMenu(false);
    setShowRejectModal(true);
  };

  const handleConfirmClientReject = async () => {
    const pipeline = pipelines?.[0];
    const lostStage = pipeline?.stages.find(s => s.type === 'LOST');
    
    if (!lostStage) {
      toast.error(t('taskModal.cancelStageError', { defaultValue: 'Ошибка: Стадия отмены не найдена в процессе' }));
      return;
    }

    try {
      setIsSubmittingReject(true);
      const updated = await updateTaskStage(task.id, lostStage.id, rejectReason.trim() || undefined);
      onUpdateTask(updated);
      setShowRejectModal(false);
      onClose?.();
    } catch { toast.error(t('taskModal.cancelError', { defaultValue: 'Ошибка при отмене задачи' })); }
    finally { setIsSubmittingReject(false); }
  };

  const queryClient = useQueryClient();

  const handleDelete = async () => {
    if (!window.confirm(t('taskModal.confirmDelete', { defaultValue: 'Удалить задачу? Это действие необратимо.' }))) return;
    try {
      await deleteTask(task.id);
      queryClient.invalidateQueries({ queryKey: TASK_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: ['adminDashboard'] });
      onClose?.();
    } catch { toast.error(t('taskModal.deleteError', { defaultValue: 'Ошибка удаления' })); }
    finally { setShowMoreMenu(false); }
  };

  // ── Derived values ────────────────────────────────────────────────────────
  const getHexColor = (colorStr?: string) => {
    switch (colorStr) {
      case 'var(--color-stage-new)': return '#0EA5E9';
      case 'var(--color-stage-docs)': return '#8B5CF6';
      case 'var(--color-stage-prepay)': return '#F59E0B';
      case 'var(--color-stage-active)': return '#10B981';
      case 'var(--color-stage-invoice)': return '#F97316';
      case 'var(--color-stage-rework)': return '#EAB308';
      case 'var(--color-stage-review)': return '#6366F1';
      case 'var(--color-stage-lost)': return '#EF4444';
      default: return colorStr || '#9ca3af';
    }
  };

  const stage = task.stage;
  const statusBarColor = stage ? getHexColor(stage.color) : '#9ca3af';
  const statusLabel = stage ? translateStageName(stage, t, i18n) : t('taskPool.noStage', { defaultValue: 'Нет стадии' });

  const doneCount  = task.subtasks?.filter(s => s.status === 'DONE').length ?? 0;
  const totalCount = task.subtasks?.length ?? 0;
  const subtaskPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const isUnassigned = !task.assignedTo;
  const isMyTask     = task.assignedTo?.id === currentUser?.id;

  // ── Content ───────────────────────────────────────────────────────────────
  const content = (
    <div
      className={twMerge(
        'bg-white flex flex-col overflow-hidden rounded-2xl',
        isModal ? 'w-[98vw] max-w-[1500px] h-[90vh] shadow-2xl' : 'h-full border border-gray-100',
      )}
      onClick={e => e.stopPropagation()}
    >
      {/* ── Status stripe ─────────────────────────────────────────────── */}
      <div className="h-2 w-full flex-shrink-0 transition-colors" style={{ background: statusBarColor }} />

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-6 pt-5 pb-5 border-b border-gray-100">

        {/* Row 1: title + close */}
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-1">
            {editingTitle ? (
              <input
                autoFocus
                value={editedTitle}
                onChange={e => setEditedTitle(e.target.value)}
                onBlur={handleSaveTitle}
                onKeyDown={e => e.key === 'Enter' && handleSaveTitle()}
                className="text-2xl font-bold text-gray-800 w-full border-b-2 border-brand-green outline-none bg-transparent"
              />
            ) : (
              <h2
                className={twMerge(
                  "text-2xl font-bold text-gray-800 rounded px-1 -ml-1 transition-colors",
                  userRole !== 'EMPLOYEE' ? "cursor-pointer hover:bg-gray-50" : ""
                )}
                onClick={() => userRole !== 'EMPLOYEE' && setEditingTitle(true)}
                title={userRole !== 'EMPLOYEE' ? t('taskModal.clickToEdit', { defaultValue: 'Нажмите чтобы изменить' }) : undefined}
              >
                {translateTaskTitle(task.title, t)}
              </h2>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* ... more menu */}
            <div className="relative" ref={moreMenuRef}>
              <IconBtn onClick={() => setShowMoreMenu(p => !p)} title={t('taskModal.more', { defaultValue: 'Ещё' })}>
                <span className="text-xl leading-none font-bold pb-2">...</span>
              </IconBtn>
              {showMoreMenu && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-10 py-1 overflow-hidden">
                  {userRole === 'ADMIN' && !task.archived && (
                    <button
                      onClick={handleArchive}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm font-medium text-amber-600 hover:bg-amber-50 transition-colors"
                    >
                      <Archive size={15} /> {t('taskModal.archive', { defaultValue: 'Архивировать' })}
                    </button>
                  )}
                  {userRole === 'CLIENT' && stage?.type !== 'WON' && stage?.type !== 'LOST' && (
                    <button
                      onClick={handleOpenClientReject}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
                    >
                      {t('taskModal.rejectTask', { defaultValue: 'Отказаться от задачи' })}
                    </button>
                  )}
                  {userRole === 'ADMIN' && (
                    <button
                      onClick={handleDelete}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={15} /> {t('taskModal.delete', { defaultValue: 'Удалить задачу' })}
                    </button>
                  )}
                  {taskActions?.canDrop && (
                    <button
                      onClick={handleRequestReassignment}
                      disabled={isAssigning || task.reassignmentRequested}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      <XCircle size={15} /> {task.reassignmentRequested ? t('crm:taskModal.reassignmentRequested', { defaultValue: 'Ожидается отказ' }) : t('taskModal.drop', { defaultValue: 'Отказаться' })}
                    </button>
                  )}
                </div>
              )}
            </div>
            <IconBtn onClick={onClose} title={t('taskModal.close', { defaultValue: 'Закрыть' })}>
              <X size={20} />
            </IconBtn>
          </div>
        </div>

        {/* Row 2: primary action buttons */}
        {taskActions && (
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            {taskActions.canTake && (
              <button
                onClick={() => handleAssign(currentUser!.id)}
                disabled={isAssigning}
                className="inline-flex items-center gap-2 bg-brand-green text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-brand-green/90 transition-colors shadow-sm disabled:opacity-50"
              >
                <PlayCircle size={18} />
                {t('taskModal.take', { defaultValue: 'Взять в работу' })}
              </button>
            )}
            {taskActions.canAssign && (
              <div className="flex items-center gap-2">
                <UserIcon size={16} className="text-gray-400" />
                <select
                  disabled={isAssigning}
                  value={task.assignedTo?.id ?? ''}
                  onChange={e => handleAssign(e.target.value ? Number(e.target.value) : null)}
                  className="text-sm font-medium text-gray-700 border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-brand-green bg-white shadow-sm disabled:opacity-50"
                >
                  <option value="">{t('taskModal.unassigned', { defaultValue: 'Не назначен (Пул)' })}</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.fullName}</option>
                  ))}
                </select>
              </div>
            )}

            {userRole === 'ADMIN' && task.reassignmentRequested && (
              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={handleApproveReassignment}
                  disabled={isAssigning}
                  className="inline-flex items-center gap-2 text-green-600 bg-white border border-green-200 shadow-sm px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-green-50 transition-colors disabled:opacity-50"
                >
                  <Check size={16} />
                  {t('taskModal.approveReassignment', { defaultValue: 'Одобрить отказ' })}
                </button>
                <button
                  onClick={handleRejectReassignment}
                  disabled={isAssigning}
                  className="inline-flex items-center gap-2 text-red-600 bg-white border border-red-200 shadow-sm px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  <X size={16} />
                  {t('taskModal.rejectReassignment', { defaultValue: 'Отклонить отказ' })}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Row 3: meta chips */}
        <div className="flex items-center flex-wrap gap-x-4 gap-y-2">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border border-gray-200 bg-white shadow-sm text-gray-700">
            <span className="w-2.5 h-2.5 rounded-full shadow-inner" style={{ background: statusBarColor }} />
            {statusLabel}
          </span>
          {task.client && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
              <UserIcon size={14} className="text-gray-400" />
              {task.client.fullName}
            </span>
          )}
          <span className="flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
            <Clock size={14} className="text-gray-400" />
            {t('taskModal.created', { defaultValue: 'Создано' })} {new Date(task.createdAt).toLocaleDateString()}
          </span>
          {task.editedAt && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
              <Edit2 size={12} className="text-gray-400" />
              {t('taskModal.edited', { defaultValue: 'Отредактировано:' })} {new Date(task.editedAt).toLocaleString()}
            </span>
          )}
          {task.assignedTo ? (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 px-3 py-1 rounded-full border border-green-100">
              <UserIcon size={14} className="text-green-600" />
              {task.assignedTo.fullName}
            </span>
          ) : (
            <span className="text-xs text-gray-400 italic bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
              {t('taskModal.unassigned', { defaultValue: 'Не назначен' })}
            </span>
          )}
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden overflow-y-auto md:overflow-y-hidden flex-col md:flex-row">

        {/* Left column */}
        <div className="w-full md:w-[60%] flex-shrink-0 md:overflow-y-auto p-6 md:p-8 border-b md:border-b-0 md:border-r border-gray-100 space-y-8 bg-white">

          {/* Context notices */}
          {isUnassigned && taskActions?.canTake && (
            <div className="flex gap-4 bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 shadow-sm">
              <Info size={24} className="flex-shrink-0 mt-0.5 text-blue-500" />
              <div>
                <p className="font-semibold text-base mb-1">{t('taskModal.unassignedNotice', { defaultValue: 'Задача в пуле — никто не назначен' })}</p>
                <p className="text-blue-700 text-sm">{t('taskModal.unassignedHint', { defaultValue: 'Нажмите «Взять в работу», чтобы начать работу.' })}</p>
              </div>
            </div>
          )}
          {isMyTask && stage?.type !== 'WON' && stage?.type !== 'LOST' && (
            <div className="flex gap-4 bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800 shadow-sm">
              <Check size={24} className="flex-shrink-0 mt-0.5 text-green-600" />
              <div>
                <p className="font-semibold text-base mb-1">{t('taskModal.myTaskNotice', { defaultValue: 'Вы взяли эту задачу в работу' })}</p>
                <p className="text-green-700 text-sm">{t('taskModal.myTaskHint', { defaultValue: 'Выполните подзадачи и прикрепите результат.' })}</p>
              </div>
            </div>
          )}

          {/* Description */}
          <div className="group">
            <div className="flex items-center justify-between mb-3">
              <SectionLabel>{t('taskModal.description', { defaultValue: 'Описание' })}</SectionLabel>
              {!editingDesc && (
                <button
                  onClick={() => setEditingDesc(true)}
                  className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-brand-green transition-all"
                >
                  <Edit2 size={13} /> {t('taskModal.edit', { defaultValue: 'Изменить' })}
                </button>
              )}
            </div>
            {editingDesc ? (
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 shadow-sm">
                <textarea
                  autoFocus
                  value={editedDesc}
                  onChange={e => setEditedDesc(e.target.value)}
                  className="w-full min-h-[120px] bg-white border border-gray-200 rounded-lg p-3 text-sm text-gray-800 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 resize-y"
                  placeholder={t('taskModal.addDescription', { defaultValue: 'Добавьте описание...' })}
                />
                <div className="flex gap-3 mt-3">
                  <button
                    onClick={handleSaveDesc}
                    className="bg-brand-green text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-brand-green/90 transition-colors"
                  >
                    {t('taskModal.save', { defaultValue: 'Сохранить' })}
                  </button>
                  <button
                    onClick={() => { setEditedDesc(task.description || ''); setEditingDesc(false); }}
                    className="text-gray-600 bg-white border border-gray-200 px-5 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                  >
                    {t('taskModal.cancel', { defaultValue: 'Отмена' })}
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => setEditingDesc(true)}
                className="text-[15px] leading-relaxed text-gray-700 bg-gray-50 border border-gray-100 rounded-xl p-5 min-h-[80px] whitespace-pre-wrap cursor-pointer hover:bg-gray-100 hover:border-gray-200 transition-colors"
              >
                {task.description || (
                  <div className="flex flex-col items-center justify-center py-6 text-gray-400 border border-dashed border-gray-200/50 dark:border-white/5 rounded-xl">
                    <FileText className="w-8 h-8 mb-2 opacity-20" />
                    <span className="text-sm italic">{t('taskModal.noDescription', { defaultValue: 'Описание отсутствует. Нажмите, чтобы добавить.' })}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Subtasks */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <SectionLabel>{t('taskModal.subtasks', { defaultValue: 'Подзадачи' })}</SectionLabel>
              <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{doneCount} / {totalCount}</span>
            </div>
            {totalCount > 0 && (
              <div className="h-2 bg-gray-100 rounded-full mb-4 overflow-hidden shadow-inner">
                <div
                  className="h-full bg-brand-green rounded-full transition-all duration-500 ease-out shadow-sm"
                  style={{ width: `${subtaskPct}%` }}
                />
              </div>
            )}
            <div className="space-y-1 mb-3">
              {task.subtasks?.map(st => (
                <div
                  key={st.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 group/st border border-transparent hover:border-gray-100 transition-colors"
                >
                  <button
                    onClick={() => handleToggleSubtask(st.id)}
                    className={twMerge(
                      'w-5 h-5 rounded-md flex-shrink-0 border-2 flex items-center justify-center transition-colors',
                      st.status === 'DONE'
                        ? 'bg-brand-green border-brand-green text-white'
                        : 'border-gray-300 hover:border-brand-green bg-white',
                    )}
                  >
                    {st.status === 'DONE' && <Check size={14} strokeWidth={3} />}
                  </button>
                  <span className={twMerge(
                    'flex-1 text-[15px] font-medium transition-colors',
                    st.status === 'DONE' ? 'line-through text-gray-400' : 'text-gray-700',
                  )}>
                    {st.title}
                  </span>
                  <button
                    onClick={() => handleDeleteSubtask(st.id)}
                    className="opacity-0 group-hover/st:opacity-100 text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-all"
                    title={t('taskModal.deleteSubtask', { defaultValue: 'Удалить подзадачу' })}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {totalCount === 0 && (
                <p className="text-sm text-gray-400 italic px-3 py-2 bg-gray-50 rounded-xl border border-dashed border-gray-200">{t('taskModal.noSubtasks', { defaultValue: 'Нет подзадач' })}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                value={newSubtask}
                onChange={e => setNewSubtask(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddSubtask()}
                placeholder={t('taskModal.addSubtask', { defaultValue: 'Добавить подзадачу...' })}
                className="flex-1 text-sm bg-white border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 transition-all shadow-sm"
              />
              <button
                onClick={handleAddSubtask}
                disabled={!newSubtask.trim()}
                className="p-2.5 text-white bg-brand-green rounded-xl hover:bg-brand-green/90 transition-colors disabled:opacity-40 disabled:bg-gray-400 shadow-sm"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>

          {/* Attachments */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <SectionLabel>{t('taskModal.attachments', { defaultValue: 'Вложения' })} ({documents.length})</SectionLabel>
              <div className="flex items-center gap-3">
                {user?.role !== 'CLIENT' && (
                  <GenerateDocumentButton taskId={task.id} onSuccess={fetchDocuments} />
                )}
                <input type="file" ref={fileInputRef} onChange={handleUpload} className="hidden" />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 bg-white border border-gray-200 shadow-sm rounded-lg px-3 py-1.5 hover:border-brand-green hover:text-brand-green transition-colors disabled:opacity-50"
                >
                  {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Paperclip size={16} />}
                  {t('taskModal.attach', { defaultValue: 'Прикрепить' })}
                </button>
              </div>
            </div>
            {documents.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {documents.map(doc => {
                  const isConfirmed = doc.status === 'CONFIRMED';
                  return (
                    <div
                      key={doc.id}
                      className="group/doc flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl hover:border-brand-green hover:shadow-md transition-all cursor-default"
                    >
                      <div className="w-10 h-10 rounded-lg bg-green-50 text-green-700 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <FileText size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 truncate">
                          <p className="text-sm font-bold text-gray-800 truncate" title={doc.fileName}>{doc.fileName}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-[11px] font-medium text-gray-500">
                            {(doc.fileSize / 1024).toFixed(1)} KB · {new Date(doc.createdAt).toLocaleDateString()}
                          </p>
                          {isConfirmed ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded border border-green-200">
                              <ShieldCheck size={11} /> {t('crm:taskModal.docSigned', { defaultValue: 'Подписано' })}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                              <Clock size={11} /> {t('crm:taskModal.docPendingSignature', { defaultValue: 'Ожидает подписи' })}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => downloadDocument(doc.id, doc.fileName)}
                        className="opacity-0 group-hover/doc:opacity-100 p-2 text-gray-400 hover:text-brand-green rounded-lg hover:bg-brand-green/10 transition-all focus:opacity-100"
                        title={t('taskModal.download', { defaultValue: 'Скачать' })}
                      >
                        <Download size={18} />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-gray-400 italic text-center bg-gray-50 border border-dashed border-gray-200 rounded-xl p-6">
                {t('taskModal.noAttachments', { defaultValue: 'Нет прикрепленных файлов' })}
              </div>
            )}
          </div>

          {/* Linked services */}
          {task.services && task.services.length > 0 && (
            <div>
              <SectionLabel>{t('taskModal.linkedServices', { defaultValue: 'Услуги' })}</SectionLabel>
              <div className="flex flex-wrap gap-2">
                {task.services.map(service => (
                  <span
                    key={service.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold bg-brand-green/10 text-brand-green border border-brand-green/20 shadow-sm"
                  >
                    <Hash size={14} /> {translateServiceName(service, t, i18n)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="w-full md:w-[40%] flex-shrink-0 flex flex-col bg-gray-50/50 min-h-[400px] border-l border-gray-100">

          {/* Tab bar */}
          <div className="flex border-b border-gray-200 px-6 pt-4 gap-6 flex-shrink-0 bg-white">
            {([
              { id: 'comments', icon: <MessageSquare size={16} />, label: t('taskModal.comments', { defaultValue: 'Комментарии' }) },
              { id: 'history',  icon: <Activity size={16} />,      label: t('taskModal.history', { defaultValue: 'История' })      },
              { id: 'tags',     icon: <Tag size={16} />,            label: t('taskModal.tags', { defaultValue: 'Метки' })        },
            ] as const).map(tab => (
              <button
                key={tab.id}
                onClick={() => setRightTab(tab.id as RightTab)}
                className={twMerge(
                  'flex items-center gap-2 pb-3 text-sm font-bold border-b-2 transition-colors',
                  rightTab === tab.id
                    ? 'border-brand-green text-brand-green'
                    : 'border-transparent text-gray-500 hover:text-gray-800',
                )}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Tab body */}
          <div className="flex-1 overflow-y-auto p-6">

            {/* Comments */}
            {rightTab === 'comments' && (
              <div className="space-y-4">
                {comments.map(c => (
                  <div key={c.id} className="bg-white border border-gray-100 shadow-sm rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-gray-800">{c.author.fullName}</span>
                      <span className="text-[11px] font-semibold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md">{new Date(c.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-[14px] text-gray-700 whitespace-pre-wrap leading-relaxed">{c.text}</p>
                  </div>
                ))}
                {comments.length === 0 && (
                  <p className="text-center text-gray-400 text-sm py-12 italic">{t('taskModal.noComments', { defaultValue: 'Нет комментариев. Будьте первым!' })}</p>
                )}
              </div>
            )}

            {/* History */}
            {rightTab === 'history' && (
              <div className="space-y-0 relative before:absolute before:inset-0 before:ml-[19px] before:w-px before:bg-gray-200">
                {history.map(h => (
                  <div key={h.id} className="flex gap-4 relative py-3 group">
                    <div className="w-10 h-10 rounded-full bg-white border-2 border-gray-100 flex items-center justify-center flex-shrink-0 z-10 shadow-sm group-hover:border-brand-green transition-colors">
                      <Activity size={16} className="text-gray-400 group-hover:text-brand-green transition-colors" />
                    </div>
                    <div className="flex-1 bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-bold text-gray-800">{h.actor.fullName}</span>
                        <span className="text-[11px] font-semibold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md">
                          {new Date(h.createdAt).toLocaleDateString()} {new Date(h.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[13px] text-gray-600 leading-relaxed font-medium">{h.actionText}</p>
                    </div>
                  </div>
                ))}
                {history.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <Clock className="w-12 h-12 mb-3 opacity-20" />
                    <p className="text-sm italic">{t('taskModal.emptyHistory', { defaultValue: 'История пуста' })}</p>
                  </div>
                )}
              </div>
            )}

            {/* Tags */}
            {rightTab === 'tags' && (
              <div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {task.tags?.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1.5 bg-brand-green/10 text-brand-green border border-brand-green/20 px-3 py-1.5 rounded-xl text-sm font-bold shadow-sm"
                    >
                      <Tag size={12} strokeWidth={2.5} /> {tag}
                      <button onClick={() => handleRemoveTag(tag)} className="hover:bg-red-100 hover:text-red-600 rounded-full w-5 h-5 flex items-center justify-center transition-colors ml-1">
                        <X size={12} strokeWidth={2.5} />
                      </button>
                    </span>
                  ))}
                  {(!task.tags || task.tags.length === 0) && (
                    <p className="text-sm text-gray-400 italic bg-gray-100/50 rounded-xl p-4 border border-dashed border-gray-200">{t('taskModal.noTags', { defaultValue: 'Нет меток' })}</p>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    placeholder={t('taskModal.addTag', { defaultValue: 'Добавить метку (Enter)' })}
                    onKeyDown={handleAddTag}
                    className="w-full text-sm font-medium bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 shadow-sm transition-all"
                  />
                  <Tag size={16} className="absolute left-3.5 top-3 text-gray-400" />
                </div>
              </div>
            )}
          </div>

          {/* Comment input (only on comments tab) */}
          {rightTab === 'comments' && (
            <div className="p-4 bg-white border-t border-gray-100 flex gap-3 items-end flex-shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)]">
              <textarea
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAddComment(); }}
                placeholder={t('taskModal.writeCommentHint', { defaultValue: 'Написать комментарий... (Ctrl+Enter)' })}
                rows={2}
                className="flex-1 max-h-32 min-h-[44px] bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:bg-white focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 transition-all resize-y"
              />
              <button
                onClick={handleAddComment}
                disabled={isLoading || !newComment.trim()}
                className="bg-brand-green text-white px-5 py-3 rounded-xl text-sm font-bold hover:bg-brand-green/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm flex items-center justify-center"
              >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : t('taskModal.send', { defaultValue: 'Отправить' })}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {isModal ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 md:p-6"
          onClick={onClose}
        >
          {content}
        </div>
      ) : content}

      {showRejectModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowRejectModal(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-2">{t('taskModal.rejectReasonTitle', { defaultValue: 'Отказ от задачи' })}</h3>
            <p className="text-xs text-gray-500 mb-4">{t('taskModal.rejectReasonSubtitle', { defaultValue: 'Укажите причину отказа. Задача будет переведена в архив отменённых.' })}</p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder={t('taskModal.rejectReasonPrompt', { defaultValue: 'Причина отказа...' })}
              rows={3}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm outline-none focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-500/20 mb-4"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                {t('common.cancel', { defaultValue: 'Отмена' })}
              </button>
              <button
                onClick={handleConfirmClientReject}
                disabled={isSubmittingReject}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmittingReject && <Loader2 size={16} className="animate-spin" />}
                {t('taskModal.rejectConfirm', { defaultValue: 'Подтвердить отказ' })}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

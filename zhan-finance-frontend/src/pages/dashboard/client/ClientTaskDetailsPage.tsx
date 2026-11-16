import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ROUTES } from '@/shared/config/routes';
import { useAuth } from '@/features/auth/AuthContext';
import { useTaskQuery, useUpdateTaskStage } from '@/entities/task/api/taskQueries';
import { usePipelinesQuery } from '@/entities/pipeline/api/pipelineQueries';
import type { StageDto } from '@/entities/task/model/types';
import { TaskRejectModal } from '@/widgets/task-reject/TaskRejectModal';
import { Spinner } from '@/shared/ui/Spinner';
import { ArrowLeft, Clock, MessageSquare, AlertCircle, CheckCircle2, XCircle, FileText, Download, Activity, Archive, X, Paperclip, MoreVertical, ShieldCheck, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { twMerge } from 'tailwind-merge';
import { translateTaskTitle, translateServiceName, translateStageName } from '@/shared/i18n/taskTranslator';
import { downloadDocument, getTaskDocuments, confirmDocument } from '@/entities/document/api/documentApi';
import type { DocumentDto } from '@/entities/document/model/types';
import { TaskEditModal } from '@/entities/task/ui/TaskEditModal';

// Reusing colors from Kanban config for the stepper
export function ClientTaskDetailsPage() {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(['tasks', 'crm']);

  const taskId = parseInt(id || '0', 10);
  const { data: task, isLoading: isTaskLoading, refetch: refetchTask } = useTaskQuery(taskId, !!taskId);
  const { data: pipelines, isLoading: isPipelinesLoading } = usePipelinesQuery();
  
  const { mutateAsync: updateStage, isPending: isUpdatingStage } = useUpdateTaskStage();

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRef = React.useRef<HTMLDivElement>(null);
  const [documents, setDocuments] = useState<DocumentDto[]>([]);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [confirmingDocId, setConfirmingDocId] = useState<number | null>(null);

  const fetchTaskDocs = React.useCallback(() => {
    if (taskId) {
      getTaskDocuments(taskId).then(setDocuments).catch(console.error);
    }
  }, [taskId]);

  React.useEffect(() => {
    fetchTaskDocs();
  }, [fetchTaskDocs]);

  const handleConfirmDoc = async (docId: number) => {
    setConfirmingDocId(docId);
    try {
      await confirmDocument(docId);
      fetchTaskDocs();
    } catch (err) {
      console.error('Failed to confirm document', err);
    } finally {
      setConfirmingDocId(null);
    }
  };

  if (isTaskLoading || isPipelinesLoading) {
    return <div className="flex h-screen items-center justify-center"><Spinner /></div>;
  }

  if (!task) {
    return (
      <div className="p-8 text-center text-gray-500">
        <h2 className="text-2xl font-bold mb-2">{t('details.taskNotFound', { defaultValue: 'Задача не найдена' })}</h2>
        <button onClick={() => navigate(ROUTES.CLIENT)} className="text-brand-green hover:underline">
          {t('details.goBack', { defaultValue: 'Вернуться назад' })}
        </button>
      </div>
    );
  }

  const stages: StageDto[] = pipelines?.[0]?.stages || [];
  const currentStageIndex = stages.findIndex((s: StageDto) => s.id === task.stage?.id);

  const isWon = task.stage?.type === 'WON';
  const isLost = task.stage?.type === 'LOST';
  const isArchived = task.archived;
  const isFinished = isWon || isLost;

  const isPreFinalStage = task.stage?.isPreFinal || 
    task.stage?.name === 'На проверке' || 
    task.stage?.name === 'Согласование';

  const handleRejectSubmit = async (reason: string) => {
    // Find a LOST stage
    const lostStage = stages.find((s: StageDto) => s.type === 'LOST');
    if (!lostStage) return;
    
    try {
      await updateStage({ id: task.id, stageId: lostStage.id, lostReason: reason });
      setShowRejectModal(false);
    } catch (err) {
      console.error('Failed to reject task', err);
    }
  };

  const handleConfirm = async () => {
    const wonStage = stages.find((s: StageDto) => s.type === 'WON');
    if (!wonStage) return;
    try {
      await updateStage({ id: task.id, stageId: wonStage.id });
    } catch (err) {
      console.error('Failed to confirm task', err);
    }
  };

  const handleRework = async () => {
    const reworkStage = stages.find((s: StageDto) => s.name === 'Доработка') ||
                        stages.find((s: StageDto) => s.name === 'В работе') ||
                        stages.find((s: StageDto) => s.type === 'OPEN' && (s.orderIndex ?? 0) > 0) ||
                        stages.find((s: StageDto) => s.type === 'OPEN');
    if (!reworkStage) return;
    try {
      await updateStage({ id: task.id, stageId: reworkStage.id });
    } catch (err) {
      console.error('Failed to send to rework', err);
    }
  };

  return (
    <div className="max-w-[1440px] w-full px-4 md:px-8 mx-auto pb-20 animate-in fade-in duration-300">
      <button 
        onClick={() => navigate(ROUTES.CLIENT)}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-6 transition-colors"
      >
        <ArrowLeft size={16} />
        {t('tasks:details.backToList', { defaultValue: 'Назад к списку' })}
      </button>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        {/* Header */}
        <div className="relative p-6 md:p-8 border-b border-gray-100">

          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2 pr-8">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{translateTaskTitle(task.title, t)}</h1>
                {isArchived && (
                  <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-semibold uppercase flex items-center gap-1">
                    <Archive size={14} /> {t('tasks:details.archive', { defaultValue: 'Архив' })}
                  </span>
                )}
              </div>
              <p className="text-gray-500 flex items-center gap-2 text-sm">
                <Clock size={16} /> {t('tasks:details.created', { defaultValue: 'Создано' })} {new Date(task.createdAt).toLocaleDateString()}
                {task.updatedAt && task.updatedAt !== task.createdAt && (
                  <> • {t('tasks:details.edited', { defaultValue: 'Изменено' })} {new Date(task.updatedAt).toLocaleDateString()}</>
                )}
              </p>
            </div>
            
            {!isArchived && (
              <div className="flex flex-wrap items-center gap-3">
                {isPreFinalStage && (
                  <>
                    <button
                      onClick={handleConfirm}
                      disabled={isUpdatingStage}
                      className="px-4 py-2 bg-brand-green text-white hover:bg-brand-green/90 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                      <CheckCircle2 size={16} /> {t('tasks:details.confirm', { defaultValue: 'Подтвердить' })}
                    </button>
                    <button
                      onClick={handleRework}
                      disabled={isUpdatingStage}
                      className="px-4 py-2 bg-yellow-50 text-yellow-600 hover:bg-yellow-100 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                      <Activity size={16} /> {t('tasks:details.toRework', { defaultValue: 'На доработку' })}
                    </button>
                  </>
                )}
                {!isFinished && !isPreFinalStage && (
                  <div className="flex items-center gap-2">
                    <button
                      className="px-4 py-2 bg-gray-50 text-gray-600 hover:bg-gray-100 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2"
                      onClick={() => setShowEditModal(true)}
                    >
                      {t('tasks:details.editTask', { defaultValue: 'Изменить' })}
                    </button>
                    <div className="relative" ref={moreMenuRef}>
                      <button
                        onClick={() => setShowMoreMenu(prev => !prev)}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors flex items-center justify-center"
                        title={t('common:more', { defaultValue: 'Ещё' })}
                      >
                        <MoreVertical size={18} />
                      </button>
                      {showMoreMenu && (
                        <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1 overflow-hidden">
                          <button
                            onClick={() => {
                              setShowMoreMenu(false);
                              setShowRejectModal(true);
                            }}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors text-left"
                          >
                            <XCircle size={16} /> {t('tasks:details.rejectTask', { defaultValue: 'Отказаться от задачи' })}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Status Stepper */}
        <div className="p-6 md:p-8 bg-gray-50/50 border-b border-gray-100 overflow-x-auto">
          <div className="min-w-[600px]">
            <div className="flex items-center justify-between relative">
              {/* Connecting Line background */}
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-200 rounded-full z-0"></div>
              
              {stages.filter((s: StageDto) => s.type !== 'LOST').map((stage: StageDto, index: number) => {
                const isActive = task.stage?.id === stage.id;
                const isPassed = currentStageIndex > index || isWon;
                const isCancelledHere = isLost && currentStageIndex === index;
                
                let stepBgStyle: React.CSSProperties = { backgroundColor: '#e5e7eb' }; // gray-200
                let stepBorderStyle: React.CSSProperties = {};
                let textStyle: React.CSSProperties = { color: '#9ca3af' }; // gray-400
                let icon = <div className="w-2.5 h-2.5 rounded-full bg-white" />;
                let stepClasses = 'w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500';
                let textClasses = 'text-xs text-center max-w-[80px] leading-tight';

                if (isPassed && !isLost) {
                  stepBgStyle = { backgroundColor: stage.color || '#9ca3af' };
                  textStyle = { color: stage.color || '#111827' };
                  stepClasses += ' border-4 border-gray-50 shadow-sm';
                  icon = <CheckCircle2 size={16} className="text-white" />;
                } else if (isActive) {
                  stepBgStyle = { backgroundColor: stage.color || '#9ca3af' };
                  textStyle = { color: stage.color || '#111827' };
                  stepClasses += ' border-4 border-gray-50 shadow-sm';
                  textClasses += ' font-bold';
                  icon = <Activity size={16} className="text-white animate-pulse" />;
                } else {
                  // Для будущих этапов
                  stepBgStyle = { backgroundColor: 'white' };
                  stepBorderStyle = { borderColor: stage.color || '#9ca3af' };
                  textStyle = { color: stage.color || '#9ca3af', opacity: 0.6 };
                  stepClasses += ' border-2 border-dashed';
                  icon = <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color || '#9ca3af' }} />;
                }

                // If task is lost, maybe show the lost stage
                if (isLost && task.stage?.id === stage.id) {
                   stepBgStyle = { backgroundColor: '#ef4444' };
                   textStyle = { color: '#dc2626' };
                   textClasses += ' font-bold';
                   stepClasses += ' border-4 border-gray-50 shadow-sm';
                   icon = <XCircle size={16} className="text-white" />;
                }

                return (
                  <div key={stage.id} className="relative z-10 flex flex-col items-center gap-2 flex-1">
                    <div className={stepClasses} style={{ ...stepBgStyle, ...stepBorderStyle }}>
                      {icon}
                    </div>
                    <span className={textClasses} style={textStyle}>
                      {translateStageName(stage, t, i18n)}
                    </span>
                  </div>
                );
              })}
            </div>
            {isLost && (
              <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm flex gap-2">
                <AlertCircle size={18} className="shrink-0" />
                <div>
                  <p className="font-semibold mb-1">{t('tasks:details.cancelled', { defaultValue: 'Задача отменена' })}</p>
                  {task.lostReason && <p>{t('tasks:details.reason', { defaultValue: 'Причина:' })} {task.lostReason}</p>}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 md:p-8 flex flex-col gap-8">
          
          {/* Left Column */}
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">{t('tasks:details.description', { defaultValue: 'Описание' })}</h3>
              <div className="bg-gray-50 p-4 rounded-xl text-gray-700 text-sm whitespace-pre-wrap min-h-[100px] border border-gray-100">
                {task.description || (
                  <div className="flex flex-col items-center justify-center py-6 text-gray-400 border border-dashed border-gray-200/50 dark:border-white/5 rounded-xl">
                    <FileText className="w-8 h-8 mb-2 opacity-20" />
                    <span className="text-sm italic">{t('tasks:details.noDescription', { defaultValue: 'Описание отсутствует...' })}</span>
                  </div>
                )}
              </div>
            </div>

            {task.services && task.services.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">{t('tasks:details.relatedServices', { defaultValue: 'Связанные услуги' })}</h3>
                <div className="flex flex-wrap gap-2">
                  {task.services.map(service => (
                    <span key={service.id} className="px-3 py-1.5 bg-brand-green/10 text-brand-green rounded-lg text-sm font-medium border border-brand-green/20">
                      {translateServiceName(service, t, i18n)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            
            {/* Документы */}
            {documents && documents.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Paperclip size={16} /> {t('tasks:details.documents', { defaultValue: 'Документы' })}
                </h3>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-2">
                  {documents.map((doc) => {
                    const isConfirmed = doc.status === 'CONFIRMED';
                    const clientUploaded = doc.uploadedByRole === 'CLIENT' || (doc.uploadedById && user?.userId && doc.uploadedById === user.userId) || doc.fileName.endsWith('.md');
                    const canConfirmDoc = !isFinished && !isArchived && !clientUploaded;

                    return (
                      <div key={doc.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg shadow-sm hover:border-brand-green/30 transition-all">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <FileText size={20} className="text-brand-green flex-shrink-0" />
                          <div className="truncate">
                            <p className="text-sm font-semibold text-gray-800 truncate" title={doc.fileName}>{doc.fileName}</p>
                            <p className="text-xs text-gray-400">{(doc.fileSize / 1024).toFixed(1)} KB • {new Date(doc.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          {clientUploaded ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200/80 rounded-full font-semibold text-xs">
                              <Upload size={13} />
                              {t('documents.status.clientUploaded', { defaultValue: 'Загружено вами' })}
                            </span>
                          ) : isConfirmed ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full font-semibold text-xs">
                              <ShieldCheck size={13} />
                              {t('documents.signed', { defaultValue: 'Подписано' })}
                            </span>
                          ) : canConfirmDoc ? (
                            <button
                              type="button"
                              onClick={() => handleConfirmDoc(doc.id)}
                              disabled={confirmingDocId === doc.id}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-brand-green hover:bg-brand-green/90 text-white rounded-full font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <CheckCircle2 size={13} />
                              {confirmingDocId === doc.id ? t('documents.confirming', { defaultValue: '...' }) : t('documents.confirm', { defaultValue: 'Подтвердить' })}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => downloadDocument(doc.id, doc.fileName)}
                            className="p-1.5 text-gray-400 hover:text-brand-green hover:bg-brand-green/10 rounded-lg transition-colors cursor-pointer"
                            title={t('tasks:details.download', { defaultValue: 'Скачать' })}
                          >
                            <Download size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Дополнительная информация */}
            {(task.amount || task.dueDate || task.source) && (
              <div>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Activity size={16} /> {t('tasks:details.additionalInfo', { defaultValue: 'Дополнительная информация' })}
                </h3>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3 text-sm">
                  {task.amount && (
                    <div className="flex justify-between border-b border-gray-200 pb-2">
                      <span className="text-gray-500">{t('tasks:details.amount', { defaultValue: 'Сумма:' })}</span>
                      <span className="font-semibold">{task.amount} {task.currency || 'KZT'}</span>
                    </div>
                  )}
                  {task.dueDate && (
                    <div className="flex justify-between border-b border-gray-200 pb-2">
                      <span className="text-gray-500">{t('tasks:details.deadline', { defaultValue: 'Дедлайн:' })}</span>
                      <span className="font-semibold">{new Date(task.dueDate).toLocaleDateString()}</span>
                    </div>
                  )}
                  {task.source && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t('tasks:details.source', { defaultValue: 'Источник:' })}</span>
                      <span className="font-semibold">{task.source}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Документы из истории */}
            <div>
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Clock size={16} /> {t('tasks:details.recentEvents', { defaultValue: 'Последние события' })}
              </h3>
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-4 max-h-[300px] overflow-y-auto">
                {task.history && task.history.length > 0 ? (
                  task.history.slice(0, 10).map(h => (
                    <div key={h.id} className="flex gap-3 text-sm">
                      <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center shrink-0 text-gray-400">
                        <Activity size={14} />
                      </div>
                      <div>
                        <p className="text-gray-800 font-medium">{h.actionText}</p>
                        <p className="text-xs text-gray-400">{new Date(h.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <Clock className="w-12 h-12 mb-3 opacity-20" />
                    <p className="text-sm italic">{t('tasks:details.historyEmpty', { defaultValue: 'История пуста' })}</p>
                  </div>
                )}
              </div>
            </div>
            
          </div>
        </div>
      </div>

      {showRejectModal && (
        <TaskRejectModal 
          taskTitle={task.title}
          onClose={() => setShowRejectModal(false)}
          onSubmit={handleRejectSubmit}
          isLoading={isUpdatingStage}
        />
      )}

      {showEditModal && task && (
        <TaskEditModal
          task={task}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSaved={() => refetchTask()}
        />
      )}
    </div>
  );
}

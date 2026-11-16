import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Phone, Mail, MessageCircle, ArrowRight } from 'lucide-react';
import type { TaskDto } from '@/entities/task/model/types';
import type { EmployeeDto } from '@/entities/employee/model/types';
import { getSecureImageUrl } from '@/shared/api/http';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth/AuthContext';
import { formatDate } from '@/shared/lib/dateFormat';

interface TaskKanbanCardProps {
  task: TaskDto;
  onClick: () => void;
  userRole: string;
  onOpenChat?: (clientId: number, clientName: string, clientAvatar?: string | null) => void;
  onMoveRight?: (task: TaskDto) => void;
  disableMoveRight?: boolean;
}

export function TaskKanbanCard({ task, onClick, userRole, onOpenChat, onMoveRight, disableMoveRight }: TaskKanbanCardProps) {
  const { t, i18n } = useTranslation('crm');
  const { user } = useAuth();
  const isMyTask = task.assignedTo?.id === user?.userId;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: 'Task',
      task,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const amountStr = task.amount ? new Intl.NumberFormat('ru-RU').format(task.amount) : '0';
  const currencyStr = task.currency || t('kanban.currency', { defaultValue: 'тенге' });
  
  const dateStr = task.createdAt 
    ? formatDate(task.createdAt, i18n.language, { day: 'numeric', month: 'short' })
    : '';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`
        task-kanban-card
        rounded-md p-3 mb-2 cursor-pointer
        shadow-[0_1px_3px_rgba(0,0,0,0.1)] hover:shadow-[0_2px_5px_rgba(0,0,0,0.15)]
        transition-shadow border flex flex-col gap-2 relative
        ${isDragging ? 'opacity-50 scale-[1.02] rotate-1 z-50' : 'opacity-100'}
        ${isMyTask ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-100'}
      `}
    >
      {/* Top row: Name and red badge if any */}
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium text-gray-800 leading-tight">
          {task.title}
        </span>
        {task.reassignmentRequested && (
          <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full" title={t('kanban.rejectedTooltip', { defaultValue: 'Сотрудник отказался от задачи' })}>{t('kanban.rejected', { defaultValue: 'Отказ' })}</span>
        )}
      </div>

      {/* Amount and Icons */}
      <div className="flex justify-between items-center text-xs text-gray-500 mb-2">
        <span className="font-medium text-gray-700"></span>
        <div className="flex gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (task.client?.phone) {
                window.open(`tel:${task.client.phone}`);
              }
            }}
            className={`p-0.5 rounded transition-colors ${
              task.client?.phone
                ? 'text-blue-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer'
                : 'text-gray-300 cursor-default'
            }`}
            title={task.client?.phone ? `${t('kanban.call', { defaultValue: 'Позвонить:' })} ${task.client.phone}` : t('kanban.phoneNotSpecified', { defaultValue: 'Телефон не указан' })}
          >
            <Phone size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (task.client?.email) {
                window.open(`https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(task.client.email)}`, '_blank');
              }
            }}
            className={`p-0.5 rounded transition-colors ${
              task.client?.email
                ? 'text-blue-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer'
                : 'text-gray-300 cursor-default'
            }`}
            title={task.client?.email ? `${t('kanban.emailAction', { defaultValue: 'Написать:' })} ${task.client.email}` : t('kanban.emailNotSpecified', { defaultValue: 'Email не указан' })}
          >
            <Mail size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (task.client && onOpenChat) {
                onOpenChat(task.client.id, task.client.fullName, task.client.avatarUrl);
              }
            }}
            className={`p-0.5 rounded transition-colors ${
              task.client && onOpenChat
                ? 'text-blue-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer'
                : 'text-gray-300 cursor-default'
            }`}
            title={task.client ? `${t('kanban.chatWith', { defaultValue: 'Чат с' })} ${task.client.fullName}` : t('kanban.clientNotSpecified', { defaultValue: 'Клиент не указан' })}
          >
            <MessageCircle size={14} />
          </button>
        </div>
      </div>

      {/* Client Name */}
      {task.client && (
        <span
          className="text-[13px] text-blue-600 hover:underline cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            if (onOpenChat) {
              onOpenChat(task.client!.id, task.client!.fullName, task.client!.avatarUrl);
            }
          }}
        >
          {task.client.fullName}
        </span>
      )}
      {!task.client && (
        <span className="text-[13px] text-gray-400">
          {t('kanban.noClient', { defaultValue: 'Без клиента' })}
        </span>
      )}

      {/* SLA warning badge & Personal Labels */}
      {(task.isSlaBreached || (task.userLabels && task.userLabels.length > 0)) && (
        <div className="flex flex-wrap items-center gap-1 mt-1">
          {task.isSlaBreached && (
            <span className="bg-red-100 text-red-700 text-[10px] font-semibold px-2 py-0.5 rounded border border-red-300 flex items-center gap-1" title={t('crm:kanban.slaBreachedTooltip', { defaultValue: 'Превышено время нахождения на текущем этапе (SLA)' })}>
              {t('crm:kanban.slaOverdue', { defaultValue: 'SLA просрочен' })}
            </span>
          )}
          {task.userLabels?.map((lbl) => (
            <span
              key={lbl.id}
              style={{ backgroundColor: lbl.color }}
              className="text-white text-[10px] font-semibold px-2 py-0.5 rounded shadow-xs"
            >
              {lbl.name}
            </span>
          ))}
        </div>
      )}

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {task.tags.map(tag => (
            <span key={tag} className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px] font-medium leading-none border border-gray-200 truncate max-w-full">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer: Date and Avatar */}
      <div className="flex items-center justify-between mt-1">
        <span className="text-[12px] text-gray-400 flex items-center gap-1">
          <span className="text-gray-300">{t('kanban.addDeal', { defaultValue: '+ Дело' })}</span>
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-gray-400">{dateStr}</span>
          {task.assignedTo && (
            <div 
              className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold overflow-hidden"
              title={task.assignedTo.fullName}
            >
              {task.assignedTo.avatarUrl ? (
                <img src={getSecureImageUrl(task.assignedTo.avatarUrl)} alt={task.assignedTo.fullName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-black text-white flex items-center justify-center">
                  {task.assignedTo.fullName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          )}
          {onMoveRight && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (!disableMoveRight) {
                  onMoveRight(task);
                }
              }}
              disabled={disableMoveRight}
              className={`p-1 rounded-full border transition-colors ${
                disableMoveRight 
                  ? 'text-gray-300 border-gray-200 bg-gray-50 cursor-not-allowed' 
                  : 'text-blue-500 border-blue-200 bg-blue-50 hover:bg-blue-100 hover:text-blue-600'
              }`}
              title={disableMoveRight ? t('crm:kanban.moveBlocked', { defaultValue: 'Перемещение заблокировано' }) : t('crm:kanban.moveToNext', { defaultValue: 'Переместить на следующий этап' })}
            >
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

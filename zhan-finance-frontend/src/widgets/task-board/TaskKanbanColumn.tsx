import React, { useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { TaskKanbanCard } from './TaskKanbanCard';
import type { TaskDto, StageDto } from '@/entities/task/model/types';
import { Plus } from 'lucide-react';
import { translateStageName } from '@/shared/i18n/taskTranslator';
import { useTranslation } from 'react-i18next';

interface TaskKanbanColumnProps {
  stage: StageDto;
  tasks: TaskDto[];
  onTaskClick: (taskId: number) => void;
  userRole: string;
  onOpenChat?: (clientId: number, clientName: string, clientAvatar?: string | null) => void;
  onMoveRight?: (task: TaskDto) => void;
}

export function TaskKanbanColumn({ stage, tasks, onTaskClick, userRole, onOpenChat, onMoveRight }: TaskKanbanColumnProps) {
  const { t, i18n } = useTranslation('crm');
  const { setNodeRef } = useDroppable({
    id: `stage-${stage.id}`,
    data: {
      type: 'Column',
      stage,
    },
  });

  const taskIds = useMemo(() => tasks.map((t) => t.id), [tasks]);

  const totalAmount = tasks.reduce((sum, task) => sum + (task.amount || 0), 0);
  const amountStr = totalAmount > 0 ? new Intl.NumberFormat('ru-RU').format(totalAmount) : '0';
  
  // Mapping stage to CSS variables based on orderIndex or name, assuming predefined ones
  // In a real scenario we'd use `stage.color` or map based on predefined list
  const stageColors = [
    'var(--color-stage-new)',
    'var(--color-stage-docs)',
    'var(--color-stage-prepay)',
    'var(--color-stage-active)',
    'var(--color-stage-invoice)',
    'var(--color-stage-lost)'
  ];
  
  const headerColorRaw = stage.color || stageColors[stage.orderIndex % stageColors.length] || 'var(--color-brand-green)';
  
  // Tailwind v4 might purge CSS variables that aren't statically used in classes.
  // We map them to hex codes here if they match known variables.
  const getHexColor = (colorStr: string) => {
    switch (colorStr) {
      case 'var(--color-stage-new)': return '#0EA5E9';
      case 'var(--color-stage-docs)': return '#8B5CF6';
      case 'var(--color-stage-prepay)': return '#F59E0B';
      case 'var(--color-stage-active)': return '#10B981';
      case 'var(--color-stage-invoice)': return '#F97316';
      case 'var(--color-stage-rework)': return '#EAB308';
      case 'var(--color-stage-review)': return '#6366F1';
      case 'var(--color-stage-lost)': return '#EF4444';
      default: return colorStr;
    }
  };
  
  const headerColor = getHexColor(headerColorRaw);

  return (
    <div className="flex flex-col flex-shrink-0 w-[85vw] md:w-[280px] snap-center">
      {/* Column Header */}
      <div 
        className="rounded-t-lg px-3 py-2 flex items-center justify-between text-white shadow-sm"
        style={{ backgroundColor: headerColor }}
      >
        <span className="font-semibold text-sm truncate pr-2">{translateStageName(stage, t, i18n)}</span>
        <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded-full font-medium">
          {tasks.length}
        </span>
      </div>

      {/* Column Body (Glassmorphism look) */}
      <div 
        ref={setNodeRef}
        className="flex flex-col flex-1 bg-gray-50/50 backdrop-blur-sm border-x border-b border-gray-200 rounded-b-lg p-2 min-h-[500px]"
      >

        


        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskKanbanCard 
              key={task.id} 
              task={task} 
              onClick={() => onTaskClick(task.id)} 
              userRole={userRole}
              onOpenChat={onOpenChat}
              onMoveRight={onMoveRight}
              disableMoveRight={stage.isPreFinal || stage.type === 'WON' || stage.type === 'LOST'}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

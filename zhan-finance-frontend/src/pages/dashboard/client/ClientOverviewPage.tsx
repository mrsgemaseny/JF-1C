import { useEffect, useState } from 'react';
import { getTasks, requestTask } from '@/entities/task/api/taskApi';
import type { TaskDto, StageDto } from '@/entities/task/model/types';
import { useAuth } from '@/features/auth/AuthContext';
import { Spinner } from '@/shared/ui/Spinner';
import { MiniCalendarWidget } from '../shared/calendar/MiniCalendarWidget';

import { WeeklySummaryWidget } from '@/widgets/dashboard/WeeklySummaryWidget';
import { TaskCreateModal } from '@/widgets/task-create/TaskCreateModal';
import { ClientWelcomeScreen } from './ClientWelcomeScreen';
import { Plus, MessageSquare, Clock, CheckCircle2, AlertCircle, ArrowUpRight } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { useTranslation } from 'react-i18next';
import { translateTaskTitle, translateStageName } from '@/shared/i18n/taskTranslator';
import { i18n } from 'i18next';

// Mapping internal statuses to client-friendly statuses
const CLIENT_STATUS_MAP: Record<string, { labelKey: string; color: string; icon: React.ReactNode }> = {
  NEW: { labelKey: 'clientDashboard.status.NEW', color: 'bg-gray-100 text-gray-700 border-gray-200', icon: <Clock size={14} /> },
  IN_PROGRESS: { labelKey: 'clientDashboard.status.IN_PROGRESS', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: <Clock size={14} /> },
  ON_REVIEW: { labelKey: 'clientDashboard.status.ON_REVIEW', color: 'bg-orange-50 text-orange-700 border-orange-200', icon: <AlertCircle size={14} /> },
  DONE: { labelKey: 'clientDashboard.status.DONE', color: 'bg-brand-green/10 text-brand-green border-brand-green/20', icon: <CheckCircle2 size={14} /> },
  CANCELLED: { labelKey: 'clientDashboard.status.CANCELLED', color: 'bg-red-50 text-red-700 border-red-200', icon: <AlertCircle size={14} /> },
};

function getClientStatus(stage: StageDto | undefined, t: any, i18nInstance: i18n): { labelKey: string; dynamicLabel?: string; color: string; hexColor?: string; icon: React.ReactNode } {
  if (!stage) return CLIENT_STATUS_MAP.NEW;
  
  const base = (() => {
    if (stage.type === 'WON') return CLIENT_STATUS_MAP.DONE;
    if (stage.type === 'LOST') return CLIENT_STATUS_MAP.CANCELLED;
    if (stage.name === 'Новый') return CLIENT_STATUS_MAP.NEW;
    if (stage.name === 'В работе') return CLIENT_STATUS_MAP.IN_PROGRESS;
    return { labelKey: '', dynamicLabel: translateStageName(stage, t, i18nInstance), color: '', icon: <Clock size={14} /> };
  })();

  if (stage.color) {
    return { ...base, color: '', hexColor: stage.color };
  }
  return base;
}

import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/shared/config/routes';

export function ClientOverviewPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(['common']);
  const [tasks, setTasks] = useState<TaskDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);


  // Filter state: 'ALL' | 'ACTIVE' | 'ON_REVIEW' | 'COMPLETED'
  const [filterType, setFilterType] = useState<'ALL' | 'ACTIVE' | 'ON_REVIEW' | 'COMPLETED'>('ALL');

  useEffect(() => {
    if (user?.userId) {
      fetchTasks();
    }
  }, [user?.userId]);

  const fetchTasks = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (user?.userId) {
        const data = await getTasks();
        data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setTasks(data);
      }
    } catch (err) {
      setError('Failed to load tasks');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to check if task needs client attention
  const isTaskNeedsAttention = (t: TaskDto) => {
    const name = t.stage?.name?.toLowerCase() || '';
    return t.stage?.isPreFinal || name.includes('доработк') || name.includes('проверк') || name.includes('согласов');
  };

  // Stats calculations
  const stats = {
    active: tasks.filter((t) => t.stage?.type === 'OPEN' && !isTaskNeedsAttention(t)).length,
    onReview: tasks.filter((t) => isTaskNeedsAttention(t)).length,
    completed: tasks.filter((t) => t.stage?.type === 'WON' || t.stage?.type === 'LOST' || t.archived).length,
  };

  // Filter tasks
  const displayedTasks = tasks.filter(t => {
    if (filterType === 'ACTIVE') return t.stage?.type === 'OPEN' && !isTaskNeedsAttention(t);
    if (filterType === 'ON_REVIEW') return isTaskNeedsAttention(t);
    if (filterType === 'COMPLETED') return t.stage?.type === 'WON' || t.stage?.type === 'LOST' || t.archived;
    return true;
  });

  const handleCardClick = (targetFilter: 'ACTIVE' | 'ON_REVIEW' | 'COMPLETED') => {
    if (filterType === targetFilter) {
      setFilterType('ALL');
    } else {
      setFilterType(targetFilter);
    }
  };

  if (isLoading && tasks.length === 0) {
    return <div className="flex h-64 items-center justify-center"><Spinner /></div>;
  }

  return (
    <div className="max-w-[1440px] w-full px-4 md:px-8 mx-auto space-y-6 pb-20 animate-in fade-in duration-500">
      {/* Simple Welcome Header */}
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-gray-900">
          {t('clientDashboard.welcome', { name: user?.fullName || 'Client' })}
        </h1>
        <p className="text-gray-500 mt-1">
          {t('clientDashboard.subtitle')}
        </p>
      </div>

      <WeeklySummaryWidget />

      {/* Interactive Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <button
          type="button"
          onClick={() => handleCardClick('ACTIVE')}
          className={twMerge(
            "bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between text-left transition-all cursor-pointer hover:shadow-md hover:border-blue-300",
            filterType === 'ACTIVE' && "border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20"
          )}
        >
          <div>
            <h3 className="text-gray-500 text-sm font-medium mb-1">{t('clientDashboard.inProgress', { defaultValue: 'В работе' })}</h3>
            <p className="text-3xl font-bold text-gray-900">{stats.active}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
            <Clock size={24} />
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleCardClick('ON_REVIEW')}
          className={twMerge(
            "bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between text-left transition-all cursor-pointer hover:shadow-md hover:border-orange-300",
            filterType === 'ON_REVIEW' && "border-orange-500 ring-2 ring-orange-500/20 bg-orange-50/20"
          )}
        >
          <div>
            <h3 className="text-gray-500 text-sm font-medium mb-1">{t('clientDashboard.needsAttention', { defaultValue: 'Требуют внимания' })}</h3>
            <p className="text-3xl font-bold text-gray-900">{stats.onReview}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
            <AlertCircle size={24} />
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleCardClick('COMPLETED')}
          className={twMerge(
            "bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between text-left transition-all cursor-pointer hover:shadow-md hover:border-emerald-300",
            filterType === 'COMPLETED' && "border-brand-green ring-2 ring-brand-green/20 bg-emerald-50/20"
          )}
        >
          <div>
            <h3 className="text-gray-500 text-sm font-medium mb-1">{t('clientDashboard.completed', { defaultValue: 'Завершенные' })}</h3>
            <p className="text-3xl font-bold text-gray-900">{stats.completed}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-brand-green/10 flex items-center justify-center text-brand-green">
            <CheckCircle2 size={24} />
          </div>
        </button>
      </div>

      {/* Main Content Layout */}
      <div className="flex flex-col gap-6 mt-4">
        
        {/* Requests List */}
        <div className="space-y-6">
          
          {/* Create Request Block */}
          <button
            onClick={() => setShowForm(true)}
            className="w-full py-4 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 hover:text-brand-green hover:border-brand-green hover:bg-brand-green/5 transition-all flex flex-col items-center justify-center gap-2"
          >
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
              <Plus size={20} />
            </div>
            <span className="font-medium text-sm">{t('clientDashboard.createRequest')}</span>
          </button>

          {showForm && (
            <TaskCreateModal 
              onClose={() => setShowForm(false)} 
              onCreated={() => {
                setShowForm(false);
                fetchTasks();
              }} 
            />
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Requests List Tabs */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex border-b border-gray-100 px-6 pt-4 gap-2 overflow-x-auto">
              <button
                className={twMerge("pb-4 px-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap", filterType === 'ALL' ? 'border-brand-green text-brand-green font-semibold' : 'border-transparent text-gray-500 hover:text-gray-700')}
                onClick={() => setFilterType('ALL')}
              >
                {t('clientDashboard.allRequests', { defaultValue: 'Все заявки' })} ({tasks.length})
              </button>
              <button
                className={twMerge("pb-4 px-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap", filterType === 'ACTIVE' ? 'border-brand-green text-brand-green font-semibold' : 'border-transparent text-gray-500 hover:text-gray-700')}
                onClick={() => setFilterType('ACTIVE')}
              >
                {t('clientDashboard.inProgress', { defaultValue: 'В работе' })} ({stats.active})
              </button>
              <button
                className={twMerge("pb-4 px-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap", filterType === 'ON_REVIEW' ? 'border-brand-green text-brand-green font-semibold' : 'border-transparent text-gray-500 hover:text-gray-700')}
                onClick={() => setFilterType('ON_REVIEW')}
              >
                {t('clientDashboard.needsAttention', { defaultValue: 'Требуют внимания' })} ({stats.onReview})
              </button>
              <button
                className={twMerge("pb-4 px-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap", filterType === 'COMPLETED' ? 'border-brand-green text-brand-green font-semibold' : 'border-transparent text-gray-500 hover:text-gray-700')}
                onClick={() => setFilterType('COMPLETED')}
              >
                {t('clientDashboard.completed', { defaultValue: 'Завершенные / Архив' })} ({stats.completed})
              </button>
            </div>

            <div className="p-6">
              {displayedTasks.length === 0 ? (
                tasks.length === 0 ? (
                  <ClientWelcomeScreen onCreateRequest={() => setShowForm(true)} />
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    {t('clientDashboard.noMatchingRequests', { defaultValue: 'Нет заявок в данной категории' })}
                  </div>
                )
              ) : (
                displayedTasks.map((task) => {
                  const status = getClientStatus(task.stage, t, i18n);
                  return (
                    <div 
                      key={task.id}
                      onClick={() => navigate(ROUTES.CLIENT_TASK_DETAILS.replace(':id', task.id.toString()))}
                      className="p-5 hover:bg-gray-50 transition-colors cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-50 last:border-0"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1.5">
                          <span 
                            className={twMerge("px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 w-fit", status.color, status.hexColor ? "border" : "")}
                            style={status.hexColor ? {
                               backgroundColor: status.hexColor + '1A', 
                               color: status.hexColor,
                               borderColor: status.hexColor + '33'
                            } : undefined}
                          >
                            {status.icon}
                            {status.labelKey ? t(status.labelKey) : ('dynamicLabel' in status ? status.dynamicLabel : '')}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(task.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <h4 className="text-base font-semibold text-gray-900 truncate">
                          {translateTaskTitle(task.title, t)}
                        </h4>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-400 shrink-0">
                        {task.comments && task.comments.length > 0 && (
                          <span className="flex items-center gap-1.5 bg-gray-100 px-2.5 py-1 rounded-lg text-gray-600 font-medium">
                            <MessageSquare size={14} />
                            {task.comments.length}
                          </span>
                        )}
                        <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 group-hover:text-brand-green group-hover:border-brand-green shadow-sm transition-all">
                          <ArrowUpRight size={16} />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Widgets */}
        <div className="space-y-6">
          <MiniCalendarWidget />
        </div>
      </div>
    </div>
  );
}
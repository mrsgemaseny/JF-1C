import { useEffect, useState } from 'react';
import { apiRequest } from '@/shared/api/http';
import { Spinner } from '@/shared/ui/Spinner';
import { Users, UserCheck, ClipboardList, CheckCircle2, Clock, AlertCircle, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface EmployeeStatsDto {
  employeeId: number;
  employeeName: string;
  activeTasks: number;
  doneTasks: number;
  overdueTasks: number;
  avgCompletionDays?: number;
}

interface AdminDashboardDto {
  totalClients: number;
  totalEmployees: number;
  totalTasks: number;
  wonTasks: number;
  lostTasks: number;
  avgCompletionDays: number;
  tasksByStatus: Record<string, number>;
  tasksByLostReason: Record<string, number>;
  totalUsers: number;
  newRequestsToday: number;
  totalRevenue: number;
  expectedRevenue: number;
  employeeStats: EmployeeStatsDto[];
}

async function getAdminDashboard(): Promise<AdminDashboardDto> {
  return apiRequest<AdminDashboardDto>('/api/v1/crm/dashboard/admin');
}

// We don't need STATUS_CONFIG anymore since we will use dynamic names and colors
const getDynamicColor = (index: number) => {
  const colors = [
    'bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 'bg-pink-500',
    'bg-rose-500', 'bg-orange-500', 'bg-amber-500', 'bg-emerald-500',
    'bg-teal-500', 'bg-cyan-500'
  ];
  return colors[index % colors.length];
};

import { WeeklySummaryWidget } from '@/widgets/dashboard/WeeklySummaryWidget';

export function AdminOverviewPage() {
  const { t, i18n } = useTranslation(['common']);
  const [data, setData] = useState<AdminDashboardDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getAdminDashboard()
      .then(setData)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <Spinner />;

  if (!data) return <div className="p-6 text-red-500">{t('adminDashboard.loadError')}</div>;

  const statCards = [
    {
      label: t('adminDashboard.newRequests'),
      value: data.newRequestsToday,
      icon: <Users size={22} className="text-pink-500" />,
      color: 'border-l-4 border-l-pink-500',
    },
    {
      label: t('adminDashboard.totalClients'),
      value: data.totalClients,
      icon: <Users size={22} className="text-blue-500" />,
      color: 'border-l-4 border-l-blue-500',
    },
    {
      label: t('adminDashboard.totalEmployees'),
      value: data.totalEmployees,
      icon: <UserCheck size={22} className="text-purple-500" />,
      color: 'border-l-4 border-l-purple-500',
    },
    {
      label: t('adminDashboard.totalTasks'),
      value: data.totalTasks,
      icon: <ClipboardList size={22} className="text-amber-500" />,
      color: 'border-l-4 border-l-amber-500',
    },
    {
      label: t('adminDashboard.wonTasks'),
      value: data.wonTasks,
      icon: <CheckCircle2 size={22} className="text-emerald-500" />,
      color: 'border-l-4 border-l-emerald-500',
    },
  ];

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('adminDashboard.title')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('adminDashboard.subtitle')}</p>
      </div>

      <WeeklySummaryWidget />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className={`bg-white rounded-xl shadow-sm border border-gray-200 p-4 ${card.color}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{card.label}</span>
              {card.icon}
            </div>
            <p className="text-3xl font-bold text-gray-900">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Financial Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col justify-center">
           <h2 className="text-base font-semibold text-gray-800 mb-4">{t('adminDashboard.financialAnalytics')}</h2>
           <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">{t('adminDashboard.earned')}</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {new Intl.NumberFormat(i18n.language === 'kk' ? 'kk-KZ' : i18n.language === 'en' ? 'en-US' : i18n.language === 'zh' ? 'zh-CN' : 'ru-KZ', { style: 'currency', currency: 'KZT', maximumFractionDigits: 0 }).format(data.totalRevenue || 0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">{t('adminDashboard.expectedRevenue')}</p>
                <p className="text-2xl font-bold text-amber-500 mt-1">
                  {new Intl.NumberFormat(i18n.language === 'kk' ? 'kk-KZ' : i18n.language === 'en' ? 'en-US' : i18n.language === 'zh' ? 'zh-CN' : 'ru-KZ', { style: 'currency', currency: 'KZT', maximumFractionDigits: 0 }).format(data.expectedRevenue || 0)}
                </p>
              </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Task distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-5">{t('adminDashboard.tasksByStatus')}</h2>
          <div className="space-y-3">
            {Object.entries(data.tasksByStatus).map(([statusName, count], index) => {
              const percent = data.totalTasks > 0 ? Math.round((count / data.totalTasks) * 100) : 0;
              const colorClass = getDynamicColor(index);
              return (
                <div key={statusName} className="flex items-center gap-4">
                  <div className="flex items-center gap-2 w-32 md:w-40 flex-shrink-0">
                    <span className="text-gray-400"><ClipboardList size={14} /></span>
                    <span className="text-sm font-medium text-gray-700 truncate" title={statusName}>{statusName}</span>
                  </div>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${colorClass}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-gray-700 w-8 text-right">{count}</span>
                  <span className="text-xs text-gray-400 w-8">{percent}%</span>
                </div>
              );
            })}
            {Object.keys(data.tasksByStatus).length === 0 && (
              <div className="text-sm text-gray-500 text-center py-4">{t('adminDashboard.noTasks')}</div>
            )}
          </div>
        </div>

        {/* Cancellation Analytics & Efficiency */}
        <div className="space-y-5">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col justify-center h-[140px]">
             <h2 className="text-base font-semibold text-gray-800 mb-4">{t('adminDashboard.conversion')}</h2>
             <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">{t('adminDashboard.winRate')}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {data.totalTasks > 0 ? Math.round((data.wonTasks / (data.wonTasks + data.lostTasks || 1)) * 100) : 0}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{t('adminDashboard.avgCloseTime')}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {data.avgCompletionDays.toFixed(1)} <span className="text-sm font-medium text-gray-500">{t('adminDashboard.days')}</span>
                  </p>
                </div>
             </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-5">{t('adminDashboard.lostReasons')}</h2>
            <div className="space-y-3">
              {Object.entries(data.tasksByLostReason).sort((a, b) => b[1] - a[1]).map(([reason, count], index) => {
                const percent = data.lostTasks > 0 ? Math.round((count / data.lostTasks) * 100) : 0;
                return (
                  <div key={reason} className="flex items-center gap-4">
                    <div className="flex items-center gap-2 w-32 md:w-40 flex-shrink-0">
                      <span className="text-red-400"><XCircle size={14} /></span>
                      <span className="text-sm font-medium text-gray-700 truncate" title={reason}>{reason}</span>
                    </div>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all bg-red-400"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-700 w-8 text-right">{count}</span>
                  </div>
                );
              })}
              {Object.keys(data.tasksByLostReason).length === 0 && (
                <div className="text-sm text-gray-500 text-center py-4">{t('adminDashboard.noLostTasks')}</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Employee Productivity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-5">{t('adminDashboard.productivity')}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-gray-100 text-gray-500">
                <th className="pb-3 font-medium">{t('adminDashboard.employee')}</th>
                <th className="pb-3 font-medium text-center">{t('adminDashboard.completed')}</th>
                <th className="pb-3 font-medium text-center">{t('adminDashboard.inProgress')}</th>
                <th className="pb-3 font-medium text-center">{t('adminDashboard.overdue')}</th>
                <th className="pb-3 font-medium text-center">{t('adminDashboard.avgCloseTime')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.employeeStats.map(emp => (
                <tr key={emp.employeeId} className="hover:bg-gray-50/50">
                  <td className="py-3 font-medium text-gray-900">{emp.employeeName}</td>
                  <td className="py-3 text-center">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 text-green-700 font-medium text-xs">
                      <CheckCircle2 size={12} /> {emp.doneTasks}
                    </span>
                  </td>
                  <td className="py-3 text-center">
                    {(() => {
                      let loadBg = "bg-green-50 text-green-700 border-green-200";
                      let loadLabel = t('adminDashboard.workloadLow');
                      if (emp.activeTasks >= 10) {
                        loadBg = "bg-red-50 text-red-700 border-red-200 font-bold";
                        loadLabel = t('adminDashboard.workloadHigh');
                      } else if (emp.activeTasks >= 5) {
                        loadBg = "bg-amber-50 text-amber-700 border-amber-200";
                        loadLabel = t('adminDashboard.workloadMedium');
                      }
                      return (
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border font-medium text-xs ${loadBg}`} title={loadLabel}>
                          <Clock size={12} /> {emp.activeTasks}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="py-3 text-center">
                    {emp.overdueTasks > 0 ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-700 font-medium text-xs">
                        <AlertCircle size={12} /> {emp.overdueTasks}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="py-3 text-center">
                    <span className="text-gray-700 font-medium text-sm">
                      {emp.avgCompletionDays ? `${emp.avgCompletionDays.toFixed(1)} ${t('adminDashboard.daysSuffix')}` : '-'}
                    </span>
                  </td>
                </tr>
              ))}
              {data.employeeStats.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-gray-500">
                    {t('adminDashboard.noEmployees')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

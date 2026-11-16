import { useEffect, useState } from 'react';
import { getClients, getClientStats, ClientStatsDto, assignEmployee } from '@/entities/client/api/clientApi';
import type { ClientDto } from '@/entities/client/model/types';
import { useApiData } from '@/shared/hooks/useApiData';
import { Spinner } from '@/shared/ui/Spinner';
import { getEmployees } from '@/entities/employee/api/employeeApi';
import { useTranslation } from 'react-i18next';

export function AdminClientsPage() {
  const { t } = useTranslation(['common']);
  const { data: clients, isLoading: isClientsLoading, error: clientsError, refetch: refetchClients } = useApiData(getClients);
  const { data: statsData, isLoading: isStatsLoading, error: statsError } = useApiData(getClientStats);
  const { data: employees } = useApiData(getEmployees);

  const [stats, setStats] = useState<Record<number, ClientStatsDto>>({});
  const [assigningId, setAssigningId] = useState<number | null>(null);

  useEffect(() => {
    if (statsData) {
      const statsMap = statsData.reduce((acc, stat) => {
        acc[stat.clientId] = stat;
        return acc;
      }, {} as Record<number, ClientStatsDto>);
      setStats(statsMap);
    }
  }, [statsData]);

  const handleAssign = async (clientId: number, employeeId: number) => {
    setAssigningId(clientId);
    try {
      await assignEmployee(clientId, employeeId);
      refetchClients();
    } catch (e) {
      console.error(e);
      alert(t('adminClients.assignError'));
    } finally {
      setAssigningId(null);
    }
  };

  if (isClientsLoading) return <Spinner />;
  if (clientsError) return <div className="p-4 text-red-500">{t('adminClients.loadError')}</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('adminClients.title')}</h1>
      {statsError && <div className="mb-4 p-2 bg-yellow-50 text-yellow-700 text-sm rounded">{t('adminClients.statsError')}</div>}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('adminClients.name')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('adminClients.company')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('adminClients.email')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('adminClients.assignedEmployee')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('adminClients.tasks')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {clients?.map((c) => {
                const clientStat = c.user?.id ? stats[c.user.id] : undefined;
                return (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{c.user?.fullName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{c.companyName || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{c.user?.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <select
                        className="form-select w-full rounded-md border-gray-300 text-sm focus:border-brand-green focus:ring-brand-green disabled:opacity-50"
                        value={c.assignedEmployee?.id || ''}
                        disabled={assigningId === c.id}
                        onChange={(e) => {
                          const newEmpId = parseInt(e.target.value, 10);
                          if (!isNaN(newEmpId)) {
                            handleAssign(c.id, newEmpId);
                          }
                        }}
                      >
                        <option value="" disabled>{t('adminClients.selectEmployee')}</option>
                        {employees?.map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.fullName}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {isStatsLoading ? (
                        <span className="text-gray-400 text-xs">...</span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {clientStat?.taskCount || 0}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

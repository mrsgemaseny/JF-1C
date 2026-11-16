import { useEffect, useState } from 'react';
import { getEmployees, getPendingEmployees, approveEmployee, rejectEmployee, getEmployeeWorkload, promoteToAdvisor, demoteToEmployee, toggleUserStatus, deleteEmployee, type EmployeeWorkloadDto } from '@/entities/employee/api/employeeApi';
import type { EmployeeDto } from '@/entities/employee/model/types';
import { Check, Clock, UserCheck, Briefcase, ShieldAlert, ShieldCheck, UserX, UserMinus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from '@/shared/ui/Toast/ToastContext';

export function AdminEmployeesPage() {
  const { t, i18n } = useTranslation(['common']);
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'PENDING'>('ACTIVE');
  const [employees, setEmployees] = useState<EmployeeDto[]>([]);
  const [pendingEmployees, setPendingEmployees] = useState<EmployeeDto[]>([]);
  const [workloads, setWorkloads] = useState<Map<number, number>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  async function loadData() {
    setIsLoading(true);
    try {
      const [empList, pendingList, wlList] = await Promise.all([
        getEmployees(),
        getPendingEmployees(),
        getEmployeeWorkload().catch(() => [] as EmployeeWorkloadDto[])
      ]);
      setEmployees(empList);
      setPendingEmployees(pendingList);
      
      const wlMap = new Map<number, number>();
      wlList.forEach(w => wlMap.set(w.employeeId, w.activeTasksCount));
      setWorkloads(wlMap);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleApprove(id: number) {
    if (!window.confirm(t('adminEmployees.approveConfirm', { defaultValue: 'Подтвердить регистрацию сотрудника?' }))) return;
    try {
      await approveEmployee(id);
      await loadData();
    } catch (e) {
      console.error(e);
      toast.error(t('adminEmployees.approveError', { defaultValue: 'Ошибка при одобрении сотрудника' }));
    }
  }

  async function handleReject(id: number) {
    if (!window.confirm(t('adminEmployees.rejectConfirm', { defaultValue: 'Отклонить заявку сотрудника?' }))) return;
    try {
      await rejectEmployee(id);
      await loadData();
    } catch (e) {
      console.error(e);
      toast.error(t('adminEmployees.rejectError', { defaultValue: 'Ошибка при отклонении заявки' }));
    }
  }

  async function handlePromote(id: number) {
    const confirmed = window.confirm(
      t('adminEmployees.promoteConfirm', {
        defaultValue: 'ВНИМАНИЕ: Повышение сотрудника до роли ADVISOR!\n\n- Все закрепленные за ним клиенты будут откреплены.\n- Все активные задачи этого сотрудника будут переведены в открытый пул.\n- История чатов и сообщений сохранится без изменений.\n\nВы уверены, что хотите перевести сотрудника в роль ADVISOR?'
      })
    );
    if (!confirmed) return;
    try {
      await promoteToAdvisor(id);
      await loadData();
    } catch (e) {
      console.error(e);
      toast.error(t('adminEmployees.roleChangeError', { defaultValue: 'Ошибка при изменении роли' }));
    }
  }

  async function handleDemote(id: number) {
    if (!window.confirm(t('adminEmployees.demoteConfirm', { defaultValue: 'Понизить ADVISOR до роли EMPLOYEE?' }))) return;
    try {
      await demoteToEmployee(id);
      await loadData();
    } catch (e) {
      console.error(e);
      toast.error(t('adminEmployees.roleChangeError', { defaultValue: 'Ошибка при изменении роли' }));
    }
  }

  async function handleToggleStatus(id: number) {
    if (!window.confirm(t('adminEmployees.toggleStatusConfirm', { defaultValue: 'Изменить статус активности аккаунта пользователя?' }))) return;
    try {
      await toggleUserStatus(id);
      await loadData();
    } catch (e) {
      console.error(e);
      toast.error(t('adminEmployees.statusChangeError', { defaultValue: 'Ошибка при изменении статуса' }));
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm(t('adminEmployees.deleteConfirm', { defaultValue: 'ВЫ УВЕРЕНЫ? Это действие необратимо удалит сотрудника (деактивирует его аккаунт).' }))) return;
    try {
      await deleteEmployee(id);
      await loadData();
      toast.success(t('adminEmployees.deleteSuccess', { defaultValue: 'Сотрудник успешно удален' }));
    } catch (e) {
      console.error(e);
      toast.error(t('adminEmployees.deleteError', { defaultValue: 'Ошибка при удалении сотрудника' }));
    }
  }

  return (
    <div className="max-w-6xl mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black uppercase text-brand-green tracking-tight">{t('adminEmployees.title')}</h1>
          <p className="text-gray-500 mt-1">{t('adminEmployees.subtitle')}</p>
        </div>
      </div>

      <div className="flex space-x-1 p-1 bg-gray-100/80 rounded-xl mb-6 w-max">
        <button
          onClick={() => setActiveTab('ACTIVE')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-sm transition-all ${
            activeTab === 'ACTIVE'
              ? 'bg-white text-brand-green shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          {t('adminEmployees.active')} ({employees.length})
        </button>
        <button
          onClick={() => setActiveTab('PENDING')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-sm transition-all ${
            activeTab === 'PENDING'
              ? 'bg-white text-brand-green shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Clock className="w-4 h-4" />
          {t('adminEmployees.pending')}
          {pendingEmployees.length > 0 && (
            <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full ml-1">
              {pendingEmployees.length}
            </span>
          )}
        </button>
      </div>

      <div className="bg-white shadow-sm border border-gray-200/60 rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400">{t('common.loading')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50/50 hidden sm:table-header-group">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    {t('adminEmployees.employee')}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    {t('adminEmployees.role')}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    {t('adminEmployees.email')}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    {t('adminEmployees.registrationDate')}
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                    {t('adminEmployees.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(activeTab === 'ACTIVE' ? employees : pendingEmployees).map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50/50 transition-colors block sm:table-row border-b border-gray-100 sm:border-b-0 p-4 sm:p-0">
                    <td className="px-0 sm:px-6 py-2 sm:py-4 block sm:table-cell">
                      <div className="flex sm:block justify-between items-center sm:items-start gap-4">
                        <span className="sm:hidden text-xs font-bold text-gray-500 uppercase shrink-0">{t('adminEmployees.employee')}</span>
                        <div className="text-sm font-bold text-gray-900 truncate text-right sm:text-left">{emp.fullName}</div>
                      </div>
                    </td>
                    <td className="px-0 sm:px-6 py-2 sm:py-4 block sm:table-cell">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold ${
                        emp.role === 'ADVISOR'
                          ? 'bg-purple-100 text-purple-800 border border-purple-300'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}>
                        {emp.role}
                      </span>
                    </td>
                    <td className="px-0 sm:px-6 py-2 sm:py-4 block sm:table-cell">
                      <div className="flex sm:block justify-between items-center sm:items-start gap-4">
                        <span className="sm:hidden text-xs font-bold text-gray-500 uppercase shrink-0">{t('adminEmployees.email')}</span>
                        <div className="text-sm text-gray-500 truncate text-right sm:text-left">{emp.email}</div>
                      </div>
                    </td>
                    <td className="px-0 sm:px-6 py-2 sm:py-4 block sm:table-cell">
                      <div className="flex sm:block justify-between items-center sm:items-start gap-4">
                        <span className="sm:hidden text-xs font-bold text-gray-500 uppercase shrink-0">{t('adminEmployees.registrationDate')}</span>
                        <div className="text-sm text-gray-500 text-right sm:text-left">
                          {new Date(emp.createdAt).toLocaleDateString(i18n.language === 'en' ? 'en-US' : i18n.language === 'kk' ? 'kk-KZ' : i18n.language === 'zh' ? 'zh-CN' : 'ru-RU', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </div>
                      </div>
                    </td>
                    <td className="px-0 sm:px-6 py-4 sm:py-4 sm:text-right block sm:table-cell border-t border-gray-100 mt-2 sm:border-0 sm:mt-0">
                      {activeTab === 'PENDING' ? (
                        <div className="flex items-center justify-end gap-2 flex-wrap sm:flex-nowrap">
                          <button
                            onClick={() => handleApprove(emp.id)}
                            className="w-full sm:w-auto inline-flex justify-center items-center gap-1.5 px-4 py-2 bg-brand-green/10 text-brand-green hover:bg-brand-green/20 rounded-lg text-sm font-bold transition-colors"
                          >
                            <Check className="w-4 h-4" />
                            {t('adminEmployees.approve', { defaultValue: 'Одобрить' })}
                          </button>
                          <button
                            onClick={() => handleReject(emp.id)}
                            className="w-full sm:w-auto inline-flex justify-center items-center gap-1.5 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm font-bold transition-colors"
                          >
                            <X className="w-4 h-4" />
                            {t('adminEmployees.reject', { defaultValue: 'Отказать' })}
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2 flex-wrap">
                          {(() => {
                            const count = workloads.get(emp.id) ?? 0;
                            const badgeColor =
                              count > 7
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : count > 3
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200';
                            return (
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border ${badgeColor}`}>
                                <Briefcase className="w-3 h-3" />
                                {count} {t('adminEmployees.tasksCount')}
                              </span>
                            );
                          })()}

                          {emp.role === 'ADVISOR' ? (
                            <button
                              onClick={() => handleDemote(emp.id)}
                              className="px-2.5 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 rounded-md text-xs font-bold transition-colors"
                              title={t('adminEmployees.demoteToEmployeeTitle')}
                            >
                              {t('adminEmployees.toEmployee')}
                            </button>
                          ) : (
                            <button
                              onClick={() => handlePromote(emp.id)}
                              className="px-2.5 py-1 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-md text-xs font-bold transition-colors"
                              title={t('adminEmployees.promoteToAdvisorTitle')}
                            >
                              {t('adminEmployees.toAdvisor')}
                            </button>
                          )}

                          <button
                            onClick={() => handleToggleStatus(emp.id)}
                            className="px-2.5 py-1 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-md text-xs font-bold transition-colors"
                            title={t('adminEmployees.toggleStatusTitle')}
                          >
                            <UserX className="w-3 h-3" />
                          </button>

                          <button
                            onClick={() => handleDelete(emp.id)}
                            className="px-2.5 py-1 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-md text-xs font-bold transition-colors"
                            title={t('adminEmployees.deleteEmployeeTitle')}
                          >
                            <UserMinus className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                
                {(activeTab === 'ACTIVE' && employees.length === 0) || (activeTab === 'PENDING' && pendingEmployees.length === 0) ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-400 text-sm">
                      {activeTab === 'ACTIVE' ? t('adminEmployees.noActive') : t('adminEmployees.noPending')}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

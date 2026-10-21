import { ScrollView, View, Text, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useMobileAuth } from '@/features/auth/AuthContext';
import { taskMobileApi } from '@/entities/task/taskApi';
import { billingMobileApi } from '@/entities/billing/billingApi';
import { StatusBadge, SurfaceCard } from '@/shared/ui/Primitives';

export default function DashboardOverviewScreen() {
  const { t } = useTranslation();
  const { user } = useMobileAuth();

  const tasksQuery = useQuery({
    queryKey: ['tasks', 'list'],
    queryFn: () => taskMobileApi.getTasks(),
  });

  const invoicesQuery = useQuery({
    queryKey: ['invoices', 'list'],
    queryFn: () => billingMobileApi.getInvoices(),
    enabled: user?.role === 'CLIENT' || user?.role === 'ADMIN',
  });

  const tasks = tasksQuery.data ?? [];
  const invoices = invoicesQuery.data ?? [];
  const pendingInvoices = invoices.filter((inv) => inv.status === 'PENDING' || inv.status === 'OVERDUE');

  return (
    <ScrollView
      className="flex-1 bg-brand-beige px-4 pt-4"
      refreshControl={
        <RefreshControl
          refreshing={tasksQuery.isRefetching || invoicesQuery.isRefetching}
          onRefresh={() => {
            void tasksQuery.refetch();
            void invoicesQuery.refetch();
          }}
          tintColor="#00562D"
        />
      }
    >
      <View className="mb-5">
        <Text className="text-xs font-bold text-[#00562D]/70 uppercase tracking-wider">
          {user?.role ? t(`roles.${user.role}`) : ''}
        </Text>
        <Text className="text-2xl font-black text-[#00562D] mt-0.5">
          {user?.fullName || user?.email}
        </Text>
      </View>

      <View className="flex-row gap-3 mb-5">
        <SurfaceCard className="flex-1">
          <Text className="text-xs font-bold uppercase text-[#00562D]/70">{t('nav.tasks')}</Text>
          <Text className="text-2xl font-black text-[#00562D] mt-1">
            {tasks.length}
          </Text>
        </SurfaceCard>
        <SurfaceCard className="flex-1">
          <Text className="text-xs font-bold uppercase text-[#00562D]/70">{t('nav.billing')}</Text>
          <Text className="text-2xl font-black text-[#00562D] mt-1">
            {pendingInvoices.length}
          </Text>
        </SurfaceCard>
      </View>

      <Text className="text-base font-black uppercase text-[#00562D] mb-3">
        {t('tasks.title')}
      </Text>

      {tasks.slice(0, 5).map((task) => (
        <SurfaceCard key={task.id} className="mb-3">
          <View className="flex-row items-center justify-between mb-1.5">
            <StatusBadge label={task.stageName} tone="emerald" />
            <Text className="text-xs font-bold text-[#00562D]/60">#{task.id}</Text>
          </View>
          <Text className="text-base font-bold text-[#00562D]">
            {task.title}
          </Text>
          {task.clientName ? (
            <Text className="text-xs font-medium text-[#00562D]/70 mt-1">{task.clientName}</Text>
          ) : null}
        </SurfaceCard>
      ))}
    </ScrollView>
  );
}

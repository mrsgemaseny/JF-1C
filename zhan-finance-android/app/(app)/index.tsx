import React from 'react';
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
      className="flex-1 bg-canvas px-4 pt-4"
      refreshControl={
        <RefreshControl
          refreshing={tasksQuery.isRefetching || invoicesQuery.isRefetching}
          onRefresh={() => {
            void tasksQuery.refetch();
            void invoicesQuery.refetch();
          }}
          tintColor="#10b981"
        />
      }
    >
      <View className="mb-5">
        <Text className="text-xs font-medium text-zinc-400">
          {user?.role ? t(`roles.${user.role}`) : ''}
        </Text>
        <Text className="text-xl font-bold text-zinc-100 mt-0.5">
          {user?.fullName || user?.email}
        </Text>
      </View>

      <View className="flex-row gap-3 mb-4">
        <SurfaceCard className="flex-1">
          <Text className="text-xs text-zinc-400">{t('nav.tasks')}</Text>
          <Text className="text-xl font-bold text-zinc-100 mt-1">
            {tasks.length}
          </Text>
        </SurfaceCard>
        <SurfaceCard className="flex-1">
          <Text className="text-xs text-zinc-400">{t('nav.billing')}</Text>
          <Text className="text-xl font-bold text-emerald-400 mt-1">
            {pendingInvoices.length}
          </Text>
        </SurfaceCard>
      </View>

      <Text className="text-base font-semibold text-zinc-100 mb-3">
        {t('tasks.title')}
      </Text>

      {tasks.slice(0, 5).map((task) => (
        <SurfaceCard key={task.id} className="mb-3">
          <View className="flex-row items-center justify-between mb-1.5">
            <StatusBadge label={task.stageName} tone="emerald" />
            <Text className="text-xs text-zinc-400">#{task.id}</Text>
          </View>
          <Text className="text-base font-semibold text-zinc-100">
            {task.title}
          </Text>
          {task.clientName ? (
            <Text className="text-xs text-zinc-400 mt-1">{task.clientName}</Text>
          ) : null}
        </SurfaceCard>
      ))}
    </ScrollView>
  );
}

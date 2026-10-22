import { useState } from 'react';
import { ScrollView, View, Text, RefreshControl, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react-native';
import { useMobileAuth } from '@/features/auth/AuthContext';
import { taskMobileApi, type MobileTaskDto } from '@/entities/task/taskApi';
import { billingMobileApi } from '@/entities/billing/billingApi';
import { StatusBadge, SurfaceCard } from '@/shared/ui/Primitives';
import { haptics } from '@/shared/lib/haptics';
import { CreateTaskModal } from '@/entities/task/ui/CreateTaskModal';
import { TaskDetailsModal } from '@/entities/task/ui/TaskDetailsModal';

export default function DashboardOverviewScreen() {
  const { t } = useTranslation();
  const { user } = useMobileAuth();
  const insets = useSafeAreaInsets();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<MobileTaskDto | null>(null);

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
  const pendingInvoices = invoices.filter(
    (inv) => inv.status === 'PENDING' || inv.status === 'OVERDUE'
  );

  const topPadding = Math.max(insets.top, 16);

  return (
    <View className="flex-1 bg-gray-50" style={{ paddingTop: topPadding }}>
      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: 24 }}
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
        <View className="flex-row items-center justify-between mb-5 mt-1">
          <View className="flex-1 mr-3">
            <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {user?.role ? t(`roles.${user.role}`) : ''}
            </Text>
            <Text className="text-2xl font-bold text-gray-900 mt-0.5" numberOfLines={1}>
              {user?.fullName || user?.email}
            </Text>
          </View>
          <Pressable
            onPress={() => {
              haptics.light();
              setIsCreateOpen(true);
            }}
            className="flex-row items-center bg-[#00562D] px-3.5 py-2 rounded-xl shadow-sm"
          >
            <Plus size={16} color="#FFFFFF" />
            <Text className="text-xs font-bold text-white ml-1.5">
              {user?.role === 'CLIENT' ? t('tasks.createTask') : t('tasks.createButton')}
            </Text>
          </Pressable>
        </View>

        <View className="flex-row gap-3 mb-5">
          <SurfaceCard className="flex-1">
            <Text className="text-xs font-medium text-gray-500">{t('nav.tasks')}</Text>
            <Text className="text-2xl font-bold text-gray-900 mt-1">
              {tasks.length}
            </Text>
          </SurfaceCard>
          <SurfaceCard className="flex-1">
            <Text className="text-xs font-medium text-gray-500">{t('nav.billing')}</Text>
            <Text className="text-2xl font-bold text-gray-900 mt-1">
              {pendingInvoices.length}
            </Text>
          </SurfaceCard>
        </View>

        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-base font-bold text-gray-900">
            {t('tasks.title')}
          </Text>
        </View>

        {tasks.length === 0 ? (
          <SurfaceCard className="mb-4">
            <Text className="text-sm font-medium text-gray-500 text-center">
              {t('tasks.emptyTasks')}
            </Text>
          </SurfaceCard>
        ) : (
          tasks.slice(0, 5).map((task) => (
            <Pressable
              key={task.id}
              onPress={() => {
                haptics.light();
                setSelectedTask(task);
              }}
            >
              <SurfaceCard className="mb-3">
                <View className="flex-row items-center justify-between mb-1.5">
                  <StatusBadge
                    label={task.stage?.name || 'В работе'}
                    color={task.stage?.color}
                    tone="emerald"
                  />
                  <Text className="text-xs font-medium text-gray-400">#{task.id}</Text>
                </View>
                <Text className="text-base font-bold text-gray-900">
                  {task.title}
                </Text>
                {task.client?.fullName ? (
                  <Text className="text-xs font-medium text-gray-500 mt-1">
                    {task.client.fullName}
                  </Text>
                ) : null}
                {task.amount ? (
                  <Text className="text-xs font-semibold text-gray-700 mt-1">
                    {task.amount.toLocaleString('ru-RU')} ₸
                  </Text>
                ) : null}
              </SurfaceCard>
            </Pressable>
          ))
        )}
      </ScrollView>

      {/* Modals */}
      <CreateTaskModal
        visible={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />
      <TaskDetailsModal
        visible={Boolean(selectedTask)}
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
      />
    </View>
  );
}

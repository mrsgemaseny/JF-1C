import { useState, useMemo } from 'react';
import { View, Text, Pressable, FlatList, Alert, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react-native';
import {
  taskMobileApi,
  type MobileTaskDto,
} from '@/entities/task/taskApi';
import { queryClient } from '@/shared/api/queryClient';
import { useMobileAuth } from '@/features/auth/AuthContext';
import { AppButton, StatusBadge, SurfaceCard } from '@/shared/ui/Primitives';
import { haptics } from '@/shared/lib/haptics';
import { ApiError } from '@/shared/api/http';
import { CreateTaskModal } from '@/entities/task/ui/CreateTaskModal';
import { TaskDetailsModal } from '@/entities/task/ui/TaskDetailsModal';

export default function TasksScreen() {
  const { t } = useTranslation();
  const { user } = useMobileAuth();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<'MY' | 'POOL'>('MY');
  const [selectedStageId, setSelectedStageId] = useState<number | 'ALL'>('ALL');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<MobileTaskDto | null>(null);

  const canAccessPool =
    user?.role === 'EMPLOYEE' ||
    user?.role === 'ADMIN' ||
    user?.role === 'ADVISOR';

  const myTasksQuery = useQuery({
    queryKey: ['tasks', 'list'],
    queryFn: () => taskMobileApi.getTasks(),
  });

  const poolQuery = useQuery({
    queryKey: ['tasks', 'pool'],
    queryFn: () => taskMobileApi.getTaskPool(),
    enabled: canAccessPool && activeTab === 'POOL',
  });

  const claimMutation = useMutation({
    mutationFn: (taskId: number) => taskMobileApi.claimFromPool(taskId),
    onSuccess: () => {
      haptics.success();
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (err) => {
      haptics.error();
      const msg = err instanceof ApiError ? err.message : 'Не удалось взять задачу из пула';
      Alert.alert('Ошибка', msg);
    },
  });

  const rawTasks: MobileTaskDto[] =
    activeTab === 'POOL' ? poolQuery.data ?? [] : myTasksQuery.data ?? [];

  // Extract unique stages dynamically from my tasks
  const availableStages = useMemo(() => {
    const list = myTasksQuery.data ?? [];
    const stageMap = new Map<number, { id: number; name: string; color?: string }>();
    for (const taskItem of list) {
      if (taskItem.stage?.id && !stageMap.has(taskItem.stage.id)) {
        stageMap.set(taskItem.stage.id, {
          id: taskItem.stage.id,
          name: taskItem.stage.name,
          color: taskItem.stage.color,
        });
      }
    }
    return Array.from(stageMap.values());
  }, [myTasksQuery.data]);

  const filteredTasks = useMemo(() => {
    if (selectedStageId === 'ALL' || activeTab === 'POOL') {
      return rawTasks;
    }
    return rawTasks.filter((item) => item.stage?.id === selectedStageId);
  }, [rawTasks, selectedStageId, activeTab]);

  const topPadding = Math.max(insets.top, 16);

  return (
    <View
      className="flex-1 bg-gray-50 px-4"
      style={{ paddingTop: topPadding }}
    >
      {/* Top Header */}
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-2xl font-bold text-gray-900">
          {activeTab === 'POOL' ? t('tasks.poolTitle') : t('tasks.title')}
        </Text>
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

      {/* Tabs MY / POOL */}
      {canAccessPool ? (
        <View className="flex-row bg-gray-200/70 rounded-xl p-1 mb-3 self-start">
          <Pressable
            onPress={() => {
              haptics.light();
              setActiveTab('MY');
            }}
            className={`px-3 py-1.5 rounded-lg ${
              activeTab === 'MY' ? 'bg-white shadow-sm' : ''
            }`}
          >
            <Text
              className={`text-xs font-semibold ${
                activeTab === 'MY' ? 'text-gray-900' : 'text-gray-500'
              }`}
            >
              {t('nav.tasks')}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              haptics.light();
              setActiveTab('POOL');
            }}
            className={`px-3 py-1.5 rounded-lg ${
              activeTab === 'POOL' ? 'bg-white shadow-sm' : ''
            }`}
          >
            <Text
              className={`text-xs font-semibold ${
                activeTab === 'POOL' ? 'text-gray-900' : 'text-gray-500'
              }`}
            >
              {t('nav.pool')}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {/* Stage Filter Chips */}
      {activeTab === 'MY' && availableStages.length > 0 ? (
        <View className="mb-3">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            <Pressable
              onPress={() => {
                haptics.light();
                setSelectedStageId('ALL');
              }}
              className={`px-3 py-1.5 rounded-xl border ${
                selectedStageId === 'ALL'
                  ? 'bg-[#00562D] border-[#00562D]'
                  : 'bg-white border-gray-200'
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  selectedStageId === 'ALL' ? 'text-white' : 'text-gray-700'
                }`}
              >
                {t('tasks.stages.ALL')}
              </Text>
            </Pressable>
            {availableStages.map((stage) => {
              const active = selectedStageId === stage.id;
              return (
                <Pressable
                  key={stage.id}
                  onPress={() => {
                    haptics.light();
                    setSelectedStageId(stage.id);
                  }}
                  className={`px-3 py-1.5 rounded-xl border ${
                    active
                      ? 'bg-[#00562D] border-[#00562D]'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      active ? 'text-white' : 'text-gray-700'
                    }`}
                  >
                    {stage.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {/* Task List */}
      <FlatList
        data={filteredTasks}
        keyExtractor={(item) => String(item.id)}
        refreshing={myTasksQuery.isRefetching || poolQuery.isRefetching}
        onRefresh={() => {
          if (activeTab === 'POOL') {
            void poolQuery.refetch();
          } else {
            void myTasksQuery.refetch();
          }
        }}
        ListEmptyComponent={
          <SurfaceCard>
            <Text className="text-sm font-medium text-gray-500 text-center">
              {t('tasks.emptyTasks')}
            </Text>
          </SurfaceCard>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => {
              haptics.light();
              setSelectedTask(item);
            }}
          >
            <SurfaceCard className="mb-3">
              <View className="flex-row items-center justify-between mb-2">
                <StatusBadge
                  label={item.stage?.name || 'В работе'}
                  color={item.stage?.color}
                  tone="emerald"
                />
                <Text className="text-xs font-medium text-gray-400">#{item.id}</Text>
              </View>
              <Text className="text-base font-bold text-gray-900">
                {item.title}
              </Text>
              {item.description ? (
                <Text
                  className="text-sm font-normal text-gray-600 mt-1"
                  numberOfLines={2}
                >
                  {item.description}
                </Text>
              ) : null}
              <View className="flex-row items-center justify-between mt-2 pt-2 border-t border-gray-100">
                <View className="flex-1 mr-2">
                  {item.client?.fullName ? (
                    <Text className="text-xs font-medium text-gray-500" numberOfLines={1}>
                      {item.client.fullName}
                    </Text>
                  ) : null}
                  {item.dueDate ? (
                    <Text className="text-xs font-medium text-gray-400 mt-0.5">
                      {new Date(item.dueDate).toLocaleDateString()}
                    </Text>
                  ) : null}
                </View>
                {item.amount ? (
                  <Text className="text-sm font-bold text-gray-900">
                    {item.amount.toLocaleString('ru-RU')} ₸
                  </Text>
                ) : null}
              </View>
              {activeTab === 'POOL' && user?.role !== 'ADVISOR' ? (
                <View className="mt-3">
                  <AppButton
                    title={t('tasks.claimTask')}
                    onPress={() => {
                      claimMutation.mutate(item.id);
                    }}
                    loading={claimMutation.isPending}
                  />
                </View>
              ) : null}
            </SurfaceCard>
          </Pressable>
        )}
      />

      {/* Modals */}
      <CreateTaskModal
        visible={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />
      <TaskDetailsModal
        visible={Boolean(selectedTask)}
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        availableStages={availableStages}
      />
    </View>
  );
}

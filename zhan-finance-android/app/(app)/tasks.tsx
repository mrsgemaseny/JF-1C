import { useState } from 'react';
import { View, Text, Pressable, FlatList, Alert } from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  taskMobileApi,
  type MobileTaskDto,
  type TaskStageKey,
} from '@/entities/task/taskApi';
import { queryClient } from '@/shared/api/queryClient';
import { useMobileAuth } from '@/features/auth/AuthContext';
import { AppButton, StatusBadge, SurfaceCard } from '@/shared/ui/Primitives';
import { haptics } from '@/shared/lib/haptics';
import { ApiError } from '@/shared/api/http';

const STAGE_KEYS: TaskStageKey[] = ['ALL', 'NEW', 'IN_PROGRESS', 'REVIEW', 'DONE'];

export default function TasksScreen() {
  const { t } = useTranslation();
  const { user } = useMobileAuth();
  const [activeTab, setActiveTab] = useState<'MY' | 'POOL'>('MY');
  const [selectedStage, setSelectedStage] = useState<TaskStageKey>('ALL');

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

  const filteredTasks =
    selectedStage === 'ALL' || activeTab === 'POOL'
      ? rawTasks
      : rawTasks.filter((item) => item.stageCode === selectedStage);

  return (
    <View className="flex-1 bg-brand-beige px-4 pt-4">
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-2xl font-black uppercase text-[#00562D]">
          {activeTab === 'POOL' ? t('tasks.poolTitle') : t('tasks.title')}
        </Text>
        {canAccessPool ? (
          <View className="flex-row bg-[#F5F5DC] rounded-xl border border-[#00562D]/15 p-1">
            <Pressable
              onPress={() => {
                haptics.light();
                setActiveTab('MY');
              }}
              className={`px-3 py-1.5 rounded-lg ${
                activeTab === 'MY' ? 'bg-[#00562D]' : ''
              }`}
            >
              <Text
                className={`text-xs font-bold uppercase ${
                  activeTab === 'MY' ? 'text-[#F5F5DC]' : 'text-[#00562D]/70'
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
                activeTab === 'POOL' ? 'bg-[#00562D]' : ''
              }`}
            >
              <Text
                className={`text-xs font-bold uppercase ${
                  activeTab === 'POOL' ? 'text-[#F5F5DC]' : 'text-[#00562D]/70'
                }`}
              >
                {t('nav.pool')}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      {activeTab === 'MY' ? (
        <View className="flex-row gap-2 mb-4">
          {STAGE_KEYS.map((stage) => {
            const active = selectedStage === stage;
            return (
              <Pressable
                key={stage}
                onPress={() => {
                  haptics.light();
                  setSelectedStage(stage);
                }}
                className={`px-3 py-1.5 rounded-xl border ${
                  active
                    ? 'bg-[#00562D] border-[#00562D]'
                    : 'bg-white border-[#00562D]/15'
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    active ? 'text-[#F5F5DC]' : 'text-[#00562D]/75'
                  }`}
                >
                  {t(`tasks.stages.${stage}`)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

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
            <Text className="text-sm font-medium text-[#00562D]/70 text-center">
              {t('tasks.emptyTasks')}
            </Text>
          </SurfaceCard>
        }
        renderItem={({ item }) => (
          <SurfaceCard className="mb-3">
            <View className="flex-row items-center justify-between mb-2">
              <StatusBadge label={item.stageName} tone="emerald" />
              <StatusBadge
                label={t(`tasks.priority.${item.priority}`)}
                tone={
                  item.priority === 'URGENT' || item.priority === 'HIGH'
                    ? 'red'
                    : 'zinc'
                }
              />
            </View>
            <Text className="text-base font-bold text-[#00562D]">
              {item.title}
            </Text>
            {item.description ? (
              <Text className="text-sm font-medium text-[#00562D]/70 mt-1" numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}
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
        )}
      />
    </View>
  );
}

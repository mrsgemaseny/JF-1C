import { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Linking,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from '@tanstack/react-query';
import { X, Phone, Mail, Calendar, DollarSign, Send } from 'lucide-react-native';
import {
  taskMobileApi,
  type MobileTaskDto,
  type TaskStageDto,
} from '@/entities/task/taskApi';
import { queryClient } from '@/shared/api/queryClient';
import { haptics } from '@/shared/lib/haptics';
import { StatusBadge } from '@/shared/ui/Primitives';
import { ApiError } from '@/shared/api/http';

interface TaskDetailsModalProps {
  visible: boolean;
  task: MobileTaskDto | null;
  onClose: () => void;
  availableStages?: TaskStageDto[];
}

export function TaskDetailsModal({
  visible,
  task,
  onClose,
  availableStages = [],
}: TaskDetailsModalProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [commentDraft, setCommentDraft] = useState('');
  const [activeStageId, setActiveStageId] = useState<number | undefined>(task?.stage?.id);

  // Sync active stage when task prop changes
  const taskId = task?.id;
  const currentStage = task?.stage;

  // Load fresh task comments
  const commentsQuery = useQuery({
    queryKey: ['tasks', taskId, 'comments'],
    queryFn: () => (taskId ? taskMobileApi.getTaskComments(taskId) : Promise.resolve([])),
    enabled: visible && Boolean(taskId),
  });

  // Load pipelines for stage options
  const pipelinesQuery = useQuery({
    queryKey: ['crm', 'pipelines'],
    queryFn: () => taskMobileApi.getPipelines(),
    enabled: visible && Boolean(taskId),
  });

  // Combine stages from pipelines and availableStages
  const stagesList = useMemo(() => {
    const stageMap = new Map<number, TaskStageDto>();
    if (pipelinesQuery.data) {
      for (const pipeline of pipelinesQuery.data) {
        if (pipeline.stages) {
          for (const s of pipeline.stages) {
            stageMap.set(s.id, s);
          }
        }
      }
    }
    if (availableStages.length > 0) {
      for (const s of availableStages) {
        if (!stageMap.has(s.id)) {
          stageMap.set(s.id, s);
        }
      }
    }
    if (currentStage?.id && !stageMap.has(currentStage.id)) {
      stageMap.set(currentStage.id, currentStage);
    }
    return Array.from(stageMap.values());
  }, [pipelinesQuery.data, availableStages, currentStage]);

  // Stage change mutation
  const updateStageMutation = useMutation({
    mutationFn: async (newStageId: number) => {
      if (!taskId) return;
      return taskMobileApi.updateStage(taskId, newStageId);
    },
    onSuccess: (updatedTask) => {
      haptics.success();
      if (updatedTask?.stage?.id) {
        setActiveStageId(updatedTask.stage.id);
      }
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (err) => {
      haptics.error();
      const msg = err instanceof ApiError ? err.message : 'Не удалось изменить этап';
      Alert.alert('Ошибка', msg);
    },
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async (text: string) => {
      if (!taskId || !text.trim()) return;
      return taskMobileApi.addTaskComment(taskId, text.trim());
    },
    onSuccess: () => {
      haptics.success();
      setCommentDraft('');
      void queryClient.invalidateQueries({ queryKey: ['tasks', taskId, 'comments'] });
    },
    onError: (err) => {
      haptics.error();
      const msg = err instanceof ApiError ? err.message : 'Не удалось отправить комментарий';
      Alert.alert('Ошибка', msg);
    },
  });

  if (!task) return null;

  const currentStageSelectedId = activeStageId ?? task.stage?.id;
  const currentStageObj =
    stagesList.find((s) => s.id === currentStageSelectedId) || task.stage;

  const handleCall = (phoneNumber: string) => {
    haptics.light();
    const cleaned = phoneNumber.replace(/[^0-9+]/g, '');
    void Linking.openURL(`tel:${cleaned}`);
  };

  const handleStageSelect = (stageId: number) => {
    if (stageId === currentStageSelectedId || updateStageMutation.isPending) return;
    setActiveStageId(stageId);
    updateStageMutation.mutate(stageId);
  };

  const handleSendComment = () => {
    if (!commentDraft.trim() || addCommentMutation.isPending) return;
    addCommentMutation.mutate(commentDraft);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-end bg-black/50"
      >
        <Pressable className="flex-1" onPress={onClose} />
        <View
          className="bg-white rounded-t-3xl border-t border-gray-200 max-h-[90%] flex-col"
          style={{ paddingBottom: Math.max(insets.bottom, 20) }}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-100">
            <View className="flex-row items-center gap-2">
              <Text className="text-xs font-bold text-gray-400">#{task.id}</Text>
              <StatusBadge
                label={currentStageObj?.name || 'В работе'}
                color={currentStageObj?.color}
                tone="emerald"
              />
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
            >
              <X size={18} color="#6B7280" />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 }}
          >
            {/* Title */}
            <Text className="text-xl font-bold text-gray-900 mb-3">
              {task.title}
            </Text>

            {/* Stage Selector */}
            {stagesList.length > 0 ? (
              <View className="mb-5">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    {t('tasks.changeStage')}
                  </Text>
                  {updateStageMutation.isPending ? (
                    <ActivityIndicator size="small" color="#00562D" />
                  ) : null}
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8 }}
                >
                  {stagesList.map((st) => {
                    const isActive = currentStageSelectedId === st.id;
                    return (
                      <Pressable
                        key={st.id}
                        onPress={() => handleStageSelect(st.id)}
                        disabled={updateStageMutation.isPending}
                        className={`px-3 py-1.5 rounded-xl border ${
                          isActive
                            ? 'bg-[#00562D] border-[#00562D]'
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <Text
                          className={`text-xs font-semibold ${
                            isActive ? 'text-white' : 'text-gray-700'
                          }`}
                        >
                          {st.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null}

            {/* Client Info Card */}
            {task.client ? (
              <View className="bg-gray-50 rounded-2xl p-4 border border-gray-200 mb-4">
                <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  {t('tasks.client')}
                </Text>
                <Text className="text-base font-bold text-gray-900">
                  {task.client.fullName}
                </Text>
                {task.client.phone ? (
                  <View className="flex-row items-center justify-between mt-2 pt-2 border-t border-gray-200/60">
                    <View className="flex-row items-center gap-1.5 flex-1 mr-2">
                      <Phone size={14} color="#6B7280" />
                      <Text className="text-xs font-medium text-gray-600">
                        {task.client.phone}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => handleCall(task.client!.phone!)}
                      className="px-3 py-1 bg-emerald-100 rounded-lg border border-emerald-200"
                    >
                      <Text className="text-xs font-bold text-[#00562D]">
                        {t('tasks.callClient')}
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
                {task.client.email ? (
                  <View className="flex-row items-center gap-1.5 mt-2">
                    <Mail size={14} color="#6B7280" />
                    <Text className="text-xs font-medium text-gray-600">
                      {task.client.email}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {/* Amount and Deadline */}
            <View className="flex-row gap-3 mb-4">
              {task.amount ? (
                <View className="flex-1 bg-gray-50 rounded-2xl p-3.5 border border-gray-200">
                  <View className="flex-row items-center gap-1 mb-1">
                    <DollarSign size={13} color="#6B7280" />
                    <Text className="text-xs font-semibold text-gray-500">
                      {t('tasks.amount')}
                    </Text>
                  </View>
                  <Text className="text-base font-bold text-gray-900">
                    {task.amount.toLocaleString('ru-RU')} ₸
                  </Text>
                </View>
              ) : null}
              {task.dueDate ? (
                <View className="flex-1 bg-gray-50 rounded-2xl p-3.5 border border-gray-200">
                  <View className="flex-row items-center gap-1 mb-1">
                    <Calendar size={13} color="#6B7280" />
                    <Text className="text-xs font-semibold text-gray-500">
                      {t('tasks.deadline')}
                    </Text>
                  </View>
                  <Text className="text-sm font-bold text-gray-900">
                    {new Date(task.dueDate).toLocaleDateString()}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Description */}
            {task.description ? (
              <View className="bg-gray-50 rounded-2xl p-4 border border-gray-200 mb-5">
                <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                  {t('tasks.descriptionLabel')}
                </Text>
                <Text className="text-sm font-normal text-gray-800 leading-relaxed">
                  {task.description}
                </Text>
              </View>
            ) : null}

            {/* Comments Section */}
            <View className="pt-2 border-t border-gray-100">
              <Text className="text-sm font-bold text-gray-900 mb-3">
                {t('tasks.comments')} ({commentsQuery.data?.length ?? 0})
              </Text>

              {commentsQuery.isLoading ? (
                <View className="py-4 items-center">
                  <ActivityIndicator size="small" color="#00562D" />
                </View>
              ) : (commentsQuery.data?.length ?? 0) === 0 ? (
                <View className="bg-gray-50 rounded-xl p-3 border border-gray-100 mb-3">
                  <Text className="text-xs text-gray-400 text-center font-medium">
                    {t('tasks.noComments')}
                  </Text>
                </View>
              ) : (
                <View className="gap-2 mb-3">
                  {commentsQuery.data?.map((comment) => {
                    const text = comment.text || comment.content || '';
                    const timeStr = comment.createdAt
                      ? new Date(comment.createdAt).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '';
                    return (
                      <View
                        key={comment.id}
                        className="bg-gray-50 rounded-xl p-3 border border-gray-100"
                      >
                        <View className="flex-row items-center justify-between mb-1">
                          <Text className="text-xs font-bold text-gray-800">
                            {comment.authorName || 'Пользователь'}
                          </Text>
                          {timeStr ? (
                            <Text className="text-[10px] text-gray-400 font-medium">
                              {timeStr}
                            </Text>
                          ) : null}
                        </View>
                        <Text className="text-xs font-medium text-gray-700">{text}</Text>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Add Comment Input */}
              <View className="flex-row items-center gap-2 mt-2">
                <TextInput
                  value={commentDraft}
                  onChangeText={setCommentDraft}
                  placeholder={t('tasks.commentPlaceholder')}
                  placeholderTextColor="#9CA3AF"
                  className="flex-1 min-h-[44px] bg-gray-50 border border-gray-200 rounded-xl px-3.5 text-xs text-gray-900 font-medium"
                />
                <Pressable
                  onPress={handleSendComment}
                  disabled={!commentDraft.trim() || addCommentMutation.isPending}
                  className={`w-11 h-[44px] rounded-xl items-center justify-center bg-[#00562D] ${
                    !commentDraft.trim() ? 'opacity-50' : ''
                  }`}
                >
                  {addCommentMutation.isPending ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Send size={16} color="#FFFFFF" />
                  )}
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

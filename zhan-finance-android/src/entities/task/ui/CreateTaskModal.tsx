import { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react-native';
import { useMobileAuth } from '@/features/auth/AuthContext';
import { taskMobileApi } from '@/entities/task/taskApi';
import { queryClient } from '@/shared/api/queryClient';
import { haptics } from '@/shared/lib/haptics';
import { ApiError } from '@/shared/api/http';
import { AppButton } from '@/shared/ui/Primitives';

interface CreateTaskModalProps {
  visible: boolean;
  onClose: () => void;
}

export function CreateTaskModal({ visible, onClose }: CreateTaskModalProps) {
  const { t } = useTranslation();
  const { user } = useMobileAuth();
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isClient = user?.role === 'CLIENT';

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setAmount('');
    setErrorMessage(null);
    setLoading(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setErrorMessage(t('tasks.titleLabel') + ': обязательное поле');
      haptics.error();
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      if (isClient) {
        await taskMobileApi.createTaskRequest({
          title: trimmedTitle,
          description: description.trim() || undefined,
        });
      } else {
        const parsedAmount = amount.trim()
          ? parseFloat(amount.trim().replace(/\s/g, ''))
          : undefined;
        await taskMobileApi.createTask({
          title: trimmedTitle,
          description: description.trim() || undefined,
          amount: isNaN(parsedAmount as number) ? undefined : parsedAmount,
        });
      }

      haptics.success();
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
      handleClose();
    } catch (err) {
      haptics.error();
      const msg = err instanceof ApiError ? err.message : 'Ошибка при создании задачи';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-end bg-black/50"
      >
        <Pressable className="flex-1" onPress={handleClose} />
        <View
          className="bg-white rounded-t-3xl p-5 border-t border-gray-200 max-h-[85%]"
          style={{ paddingBottom: Math.max(insets.bottom, 20) }}
        >
          <View className="flex-row items-center justify-between pb-3 border-b border-gray-100 mb-4">
            <Text className="text-lg font-bold text-gray-900">
              {isClient ? t('tasks.createTask') : t('tasks.createButton')}
            </Text>
            <Pressable
              onPress={handleClose}
              hitSlop={12}
              className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
            >
              <X size={18} color="#6B7280" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {errorMessage ? (
              <View className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                <Text className="text-xs font-semibold text-red-600">{errorMessage}</Text>
              </View>
            ) : null}

            <View className="mb-4">
              <Text className="text-xs font-semibold text-gray-700 mb-1.5">
                {t('tasks.titleLabel')} <Text className="text-red-500">*</Text>
              </Text>
              <TextInput
                value={title}
                onChangeText={(val) => {
                  setTitle(val);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder={t('tasks.titleLabel')}
                placeholderTextColor="#9CA3AF"
                className="min-h-[46px] bg-white border border-gray-200 rounded-xl px-4 text-sm text-gray-900 font-medium"
              />
            </View>

            <View className="mb-4">
              <Text className="text-xs font-semibold text-gray-700 mb-1.5">
                {t('tasks.descriptionLabel')}
              </Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                placeholder={t('tasks.descriptionLabel')}
                placeholderTextColor="#9CA3AF"
                className="min-h-[80px] bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 font-medium"
              />
            </View>

            {!isClient ? (
              <View className="mb-5">
                <Text className="text-xs font-semibold text-gray-700 mb-1.5">
                  {t('tasks.amountLabel')}
                </Text>
                <TextInput
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#9CA3AF"
                  className="min-h-[46px] bg-white border border-gray-200 rounded-xl px-4 text-sm text-gray-900 font-medium"
                />
              </View>
            ) : null}

            <AppButton
              title={loading ? t('tasks.creating') : t('tasks.createButton')}
              onPress={handleSubmit}
              loading={loading}
              disabled={loading || !title.trim()}
            />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

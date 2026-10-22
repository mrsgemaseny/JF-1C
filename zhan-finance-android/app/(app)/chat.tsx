import { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Send } from 'lucide-react-native';
import {
  chatMobileApi,
  type MobileConversationDto,
} from '@/entities/chat/chatApi';
import { queryClient } from '@/shared/api/queryClient';
import { StatusBadge, SurfaceCard } from '@/shared/ui/Primitives';
import { haptics } from '@/shared/lib/haptics';

export default function ChatScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [selectedPartner, setSelectedPartner] =
    useState<MobileConversationDto | null>(null);
  const [draft, setDraft] = useState('');

  const conversationsQuery = useQuery({
    queryKey: ['chat', 'conversations'],
    queryFn: () => chatMobileApi.getConversations(),
  });

  const messagesQuery = useQuery({
    queryKey: ['chat', 'messages', selectedPartner?.id],
    queryFn: () => chatMobileApi.getMessages(selectedPartner!.id),
    enabled: Boolean(selectedPartner),
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPartner || !draft.trim()) return;
      const text = draft.trim();
      setDraft('');
      return chatMobileApi.sendMessage(selectedPartner.id, text);
    },
    onSuccess: () => {
      haptics.light();
      void queryClient.invalidateQueries({ queryKey: ['chat'] });
    },
  });

  const handleSelectPartner = (partner: MobileConversationDto) => {
    haptics.light();
    setSelectedPartner(partner);
    if (partner.unreadCount > 0) {
      void chatMobileApi.markAsRead(partner.id);
    }
  };

  const topPadding = Math.max(insets.top, 16);

  if (!selectedPartner) {
    return (
      <View
        className="flex-1 bg-gray-50 px-4"
        style={{ paddingTop: topPadding }}
      >
        <Text className="text-2xl font-bold text-gray-900 mb-4">
          {t('chat.title')}
        </Text>
        <FlatList
          data={conversationsQuery.data ?? []}
          keyExtractor={(item) => String(item.id)}
          refreshing={conversationsQuery.isRefetching}
          onRefresh={() => {
            void conversationsQuery.refetch();
          }}
          ListEmptyComponent={
            <SurfaceCard>
              <Text className="text-sm font-medium text-gray-500 text-center">
                {t('chat.emptyChat')}
              </Text>
            </SurfaceCard>
          }
          renderItem={({ item }) => {
            const initial = item.fullName ? item.fullName.charAt(0).toUpperCase() : '?';
            const timeStr = item.lastMessage?.createdAt
              ? new Date(item.lastMessage.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : null;

            return (
              <Pressable onPress={() => handleSelectPartner(item)}>
                <SurfaceCard className="mb-3 flex-row items-center">
                  {item.avatarUrl ? (
                    <Image
                      source={{ uri: item.avatarUrl }}
                      className="w-11 h-11 rounded-full mr-3 border border-gray-200"
                    />
                  ) : (
                    <View className="w-11 h-11 rounded-full bg-emerald-100 items-center justify-center mr-3 border border-emerald-200">
                      <Text className="text-base font-bold text-[#00562D]">
                        {initial}
                      </Text>
                    </View>
                  )}
                  <View className="flex-1 mr-2">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-sm font-bold text-gray-900" numberOfLines={1}>
                        {item.fullName}
                      </Text>
                      {timeStr ? (
                        <Text className="text-xs font-medium text-gray-400">
                          {timeStr}
                        </Text>
                      ) : null}
                    </View>
                    <View className="flex-row items-center justify-between mt-0.5">
                      <Text
                        className="text-xs text-gray-500 flex-1 mr-2"
                        numberOfLines={1}
                      >
                        {item.lastMessage?.content || (item.role ? t(`roles.${item.role}`, item.role) : '')}
                      </Text>
                      {item.unreadCount > 0 ? (
                        <StatusBadge label={String(item.unreadCount)} tone="emerald" />
                      ) : null}
                    </View>
                  </View>
                </SurfaceCard>
              </Pressable>
            );
          }}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-gray-50 px-4"
      style={{ paddingTop: topPadding }}
    >
      <View className="flex-row items-center gap-3 pb-3 border-b border-gray-200 mb-3">
        <Pressable
          onPress={() => setSelectedPartner(null)}
          hitSlop={10}
          className="w-10 h-10 rounded-xl bg-white border border-gray-200 items-center justify-center"
        >
          <ArrowLeft size={20} color="#111827" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-base font-bold text-gray-900" numberOfLines={1}>
            {selectedPartner.fullName}
          </Text>
          <Text className="text-xs font-medium text-gray-500">
            {selectedPartner.role ? t(`roles.${selectedPartner.role}`, selectedPartner.role) : ''}
          </Text>
        </View>
      </View>

      <FlatList
        data={messagesQuery.data ?? []}
        keyExtractor={(item) => String(item.id)}
        className="flex-1"
        renderItem={({ item }) => {
          const isIncoming = item.senderId === selectedPartner.id;
          const timeStr = item.createdAt
            ? new Date(item.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })
            : null;

          return (
            <View
              className={`mb-2.5 max-w-[80%] p-3.5 ${
                isIncoming
                  ? 'self-start bg-gray-100 rounded-2xl rounded-tl-sm'
                  : 'self-end bg-[#00562D] rounded-2xl rounded-tr-sm'
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  isIncoming ? 'text-gray-900' : 'text-white'
                }`}
              >
                {item.content}
              </Text>
              {timeStr ? (
                <Text
                  className={`text-[10px] mt-1 ${
                    isIncoming ? 'text-gray-400' : 'text-emerald-100/70 text-right'
                  }`}
                >
                  {timeStr}
                </Text>
              ) : null}
            </View>
          );
        }}
      />

      <View className="flex-row items-center gap-2 py-3 border-t border-gray-200">
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder={t('chat.placeholder')}
          placeholderTextColor="#9CA3AF"
          className="flex-1 min-h-[46px] bg-white border border-gray-200 rounded-xl px-4 text-sm text-gray-900 font-medium"
        />
        <Pressable
          onPress={() => {
            if (draft.trim() && !sendMutation.isPending) {
              sendMutation.mutate();
            }
          }}
          disabled={!draft.trim() || sendMutation.isPending}
          className={`w-12 h-[46px] rounded-xl items-center justify-center bg-[#00562D] ${
            !draft.trim() ? 'opacity-50' : ''
          }`}
        >
          <Send size={18} color="#FFFFFF" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

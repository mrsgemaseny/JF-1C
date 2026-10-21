import { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  chatMobileApi,
  type MobileConversationDto,
} from '@/entities/chat/chatApi';
import { queryClient } from '@/shared/api/queryClient';
import { AppButton, StatusBadge, SurfaceCard } from '@/shared/ui/Primitives';
import { haptics } from '@/shared/lib/haptics';

export default function ChatScreen() {
  const { t } = useTranslation();
  const [selectedPartner, setSelectedPartner] =
    useState<MobileConversationDto | null>(null);
  const [draft, setDraft] = useState('');

  const conversationsQuery = useQuery({
    queryKey: ['chat', 'conversations'],
    queryFn: () => chatMobileApi.getConversations(),
  });

  const messagesQuery = useQuery({
    queryKey: ['chat', 'messages', selectedPartner?.partnerId],
    queryFn: () => chatMobileApi.getMessages(selectedPartner!.partnerId),
    enabled: Boolean(selectedPartner),
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPartner || !draft.trim()) return;
      const text = draft.trim();
      setDraft('');
      return chatMobileApi.sendMessage(selectedPartner.partnerId, text);
    },
    onSuccess: () => {
      haptics.light();
      void queryClient.invalidateQueries({ queryKey: ['chat'] });
    },
  });

  if (!selectedPartner) {
    return (
      <View className="flex-1 bg-brand-beige px-4 pt-4">
        <Text className="text-2xl font-black uppercase text-[#00562D] mb-4">
          {t('chat.title')}
        </Text>
        <FlatList
          data={conversationsQuery.data ?? []}
          keyExtractor={(item) => String(item.partnerId)}
          refreshing={conversationsQuery.isRefetching}
          onRefresh={() => {
            void conversationsQuery.refetch();
          }}
          ListEmptyComponent={
            <SurfaceCard>
              <Text className="text-sm font-medium text-[#00562D]/70 text-center">
                {t('chat.emptyChat')}
              </Text>
            </SurfaceCard>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                haptics.light();
                setSelectedPartner(item);
              }}
            >
              <SurfaceCard className="mb-3">
                <View className="flex-row items-center justify-between">
                  <Text className="text-base font-bold text-[#00562D]">
                    {item.partnerName}
                  </Text>
                  {item.unreadCount > 0 ? (
                    <StatusBadge label={String(item.unreadCount)} tone="emerald" />
                  ) : null}
                </View>
                {item.lastMessage ? (
                  <Text
                    className="text-sm font-medium text-[#00562D]/70 mt-1"
                    numberOfLines={1}
                  >
                    {item.lastMessage}
                  </Text>
                ) : null}
              </SurfaceCard>
            </Pressable>
          )}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-brand-beige px-4 pt-4"
    >
      <View className="flex-row items-center justify-between pb-3 border-b border-[#00562D]/15 mb-3">
        <Text className="text-lg font-bold text-[#00562D]">
          {selectedPartner.partnerName}
        </Text>
        <Pressable
          onPress={() => setSelectedPartner(null)}
          className="px-3 py-1.5 bg-white rounded-xl border border-[#00562D]/15"
        >
          <Text className="text-xs font-bold uppercase text-[#00562D]/75">
            {t('common.cancel')}
          </Text>
        </Pressable>
      </View>

      <FlatList
        data={messagesQuery.data ?? []}
        keyExtractor={(item) => String(item.id)}
        className="flex-1"
        renderItem={({ item }) => {
          const isIncoming = item.senderId === selectedPartner.partnerId;
          return (
            <View
              className={`mb-2.5 max-w-[82%] rounded-2xl p-3.5 ${
                isIncoming
                  ? 'self-start bg-white border border-[#00562D]/10'
                  : 'self-end bg-[#00562D] shadow-sm'
              }`}
            >
              <Text className={`text-sm font-medium ${isIncoming ? 'text-[#00562D]' : 'text-[#F5F5DC]'}`}>
                {item.content}
              </Text>
            </View>
          );
        }}
      />

      <View className="flex-row items-center gap-2 py-3 border-t border-[#00562D]/15">
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder={t('chat.placeholder')}
          placeholderTextColor="#00562D40"
          className="flex-1 min-h-[46px] bg-white border border-[#00562D]/20 rounded-xl px-4 text-sm text-[#00562D] font-medium"
        />
        <AppButton
          title={t('chat.send')}
          onPress={() => {
            sendMutation.mutate();
          }}
          disabled={!draft.trim()}
          loading={sendMutation.isPending}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

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
      <View className="flex-1 bg-canvas px-4 pt-4">
        <Text className="text-xl font-bold text-zinc-100 mb-4">
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
              <Text className="text-sm text-zinc-400 text-center">
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
                  <Text className="text-base font-semibold text-zinc-100">
                    {item.partnerName}
                  </Text>
                  {item.unreadCount > 0 ? (
                    <StatusBadge label={String(item.unreadCount)} tone="emerald" />
                  ) : null}
                </View>
                {item.lastMessage ? (
                  <Text
                    className="text-sm text-zinc-400 mt-1"
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
      className="flex-1 bg-canvas px-4 pt-4"
    >
      <View className="flex-row items-center justify-between pb-3 border-b border-white/10 mb-3">
        <Text className="text-lg font-bold text-zinc-100">
          {selectedPartner.partnerName}
        </Text>
        <Pressable
          onPress={() => setSelectedPartner(null)}
          className="px-3 py-1.5 bg-surface rounded border border-white/10"
        >
          <Text className="text-xs font-medium text-zinc-300">
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
              className={`mb-2.5 max-w-[82%] rounded-lg p-3 ${
                isIncoming
                  ? 'self-start bg-surface border border-white/10'
                  : 'self-end bg-emerald-500/20 border border-emerald-500/40'
              }`}
            >
              <Text className="text-sm text-zinc-100">{item.content}</Text>
            </View>
          );
        }}
      />

      <View className="flex-row items-center gap-2 py-3 border-t border-white/10">
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder={t('chat.placeholder')}
          placeholderTextColor="#71717a"
          className="flex-1 min-h-[44px] bg-surface-elevated border border-white/10 rounded-md px-3.5 text-sm text-zinc-100"
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

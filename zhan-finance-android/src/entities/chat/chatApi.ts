import {
  apiRequest,
  ApiError,
  enqueueOfflineMutation,
} from '@/shared/api/http';

export interface MobileChatMessageDto {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  createdAt: string;
  isRead: boolean;
  pendingOffline?: boolean;
}

export interface MobileConversationDto {
  partnerId: number;
  partnerName: string;
  partnerRole: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
}

export const chatMobileApi = {
  getConversations(): Promise<MobileConversationDto[]> {
    return apiRequest<MobileConversationDto[]>('/api/v1/chat/conversations');
  },

  getMessages(partnerId: number): Promise<MobileChatMessageDto[]> {
    return apiRequest<MobileChatMessageDto[]>(`/api/v1/chat/messages/${partnerId}`);
  },

  async sendMessage(
    receiverId: number,
    content: string
  ): Promise<{ queuedOffline: boolean }> {
    const path = '/api/v1/chat/send';
    const payload = { receiverId, content };
    try {
      await apiRequest(path, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return { queuedOffline: false };
    } catch (err) {
      if (err instanceof ApiError && err.isNetworkError) {
        enqueueOfflineMutation(path, 'POST', payload);
        return { queuedOffline: true };
      }
      throw err;
    }
  },
};

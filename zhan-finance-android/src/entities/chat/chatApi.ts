import {
  apiRequest,
  ApiError,
  enqueueOfflineMutation,
} from '@/shared/api/http';

export interface ChatLastMessageDto {
  id: number;
  content: string;
  createdAt: string;
  isRead: boolean;
}

export interface MobileConversationDto {
  id: number;
  fullName: string;
  email?: string;
  role: string;
  avatarUrl?: string;
  unreadCount: number;
  lastMessage?: ChatLastMessageDto;
}

export interface MobileChatMessageDto {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  createdAt: string;
  isDeleted?: boolean;
  isRead?: boolean;
  pendingOffline?: boolean;
}

export const chatMobileApi = {
  getConversations(): Promise<MobileConversationDto[]> {
    return apiRequest<MobileConversationDto[]>('/api/v1/chat/contacts');
  },

  getMessages(partnerId: number): Promise<MobileChatMessageDto[]> {
    return apiRequest<MobileChatMessageDto[]>(`/api/v1/chat/${partnerId}`);
  },

  async sendMessage(
    receiverId: number,
    content: string
  ): Promise<{ queuedOffline: boolean }> {
    const path = `/api/v1/chat/${receiverId}`;
    const payload = { content };
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

  markAsRead(partnerId: number): Promise<void> {
    return apiRequest<void>(`/api/v1/chat/${partnerId}/read`, {
      method: 'PUT',
    });
  },
};

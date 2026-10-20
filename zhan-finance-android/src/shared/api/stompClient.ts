import { AppState, type AppStateStatus } from 'react-native';
import { Client, type IMessage } from '@stomp/stompjs';
import {
  getAccessToken,
  getWsEndpointUrl,
  executeTokenRefreshSingleFlight,
} from '@/shared/api/http';
import { queryClient } from '@/shared/api/queryClient';

export type ChatMessageEvent = {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  createdAt: string;
  isRead: boolean;
};

type MessageHandler = (msg: ChatMessageEvent) => void;

class LifecycleStompManager {
  private client: Client | null = null;
  private userId: number | null = null;
  private listeners = new Set<MessageHandler>();
  private appStateSubscription: { remove: () => void } | null = null;

  start(userId: number): void {
    if (this.userId === userId && this.client?.active) {
      return;
    }
    this.stop();
    this.userId = userId;
    this.connectClient();

    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange
    );
  }

  stop(): void {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    if (this.client) {
      void this.client.deactivate().catch(() => {});
      this.client = null;
    }
    this.userId = null;
  }

  subscribeMessages(handler: MessageHandler): () => void {
    this.listeners.add(handler);
    return () => {
      this.listeners.delete(handler);
    };
  }

  private handleAppStateChange = async (nextState: AppStateStatus): Promise<void> => {
    if (!this.userId) return;

    if (nextState === 'background' || nextState === 'inactive') {
      // Cleanly close socket in background to prevent Android zombie socket & battery drain
      if (this.client?.active) {
        await this.client.deactivate().catch(() => {});
      }
    } else if (nextState === 'active') {
      // Ensure token is fresh on wake from sleep, then reconnect and delta-sync
      if (!getAccessToken()) {
        await executeTokenRefreshSingleFlight();
      }
      if (!this.client?.active) {
        this.connectClient();
      }
      void queryClient.invalidateQueries({ queryKey: ['chat'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
    }
  };

  private connectClient(): void {
    if (!this.userId) return;
    const targetUserId = this.userId;

    const stomp = new Client({
      webSocketFactory: () => new WebSocket(getWsEndpointUrl()),
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      forceBinaryWSFrames: true,
      appendMissingNULLonIncoming: true,
      beforeConnect: async () => {
        let token = getAccessToken();
        if (!token) {
          await executeTokenRefreshSingleFlight();
          token = getAccessToken();
        }
        stomp.connectHeaders = token ? { Authorization: `Bearer ${token}` } : {};
      },
      onConnect: () => {
        stomp.subscribe(`/topic/chat/${targetUserId}`, (frame: IMessage) => {
          if (!frame.body) return;
          try {
            const parsed = JSON.parse(frame.body) as ChatMessageEvent;
            this.listeners.forEach((listener) => listener(parsed));
            void queryClient.invalidateQueries({ queryKey: ['chat'] });
          } catch {
            // Ignore malformed frame
          }
        });
      },
    });

    this.client = stomp;
    stomp.activate();
  }
}

export const stompManager = new LifecycleStompManager();

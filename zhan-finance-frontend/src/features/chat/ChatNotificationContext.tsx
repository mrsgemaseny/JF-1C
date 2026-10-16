import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { getUnreadChatCount } from '@/entities/chat/api/chatApi';
import { Client } from '@stomp/stompjs';
import { getWsEndpointUrl, getAccessToken } from '@/shared/api/http';
import SockJS from 'sockjs-client';

interface ChatNotificationContextType {
  unreadChatCount: number;
  refreshUnreadChatCount: () => Promise<void>;
  decrementUnreadCount: (amount: number) => void;
}

const ChatNotificationContext = createContext<ChatNotificationContextType | undefined>(undefined);

export function ChatNotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  const fetchUnreadCount = async () => {
    if (!user) return;
    try {
      const count = await getUnreadChatCount();
      setUnreadChatCount(count);
    } catch {
      // Ignore 401 / background polling errors
    }
  };

  useEffect(() => {
    if (user) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 30000);
      
      let isMounted = true;
      let isConnecting = false;
      let pendingDisconnect = false;

      // Setup Stomp client
      const client = new Client({
        webSocketFactory: () => new SockJS(getWsEndpointUrl(), null, { withCredentials: true } as any),
        beforeConnect: () => {
          const token = getAccessToken();
          client.connectHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};
        },
        debug: () => {},
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
        onWebSocketError: (event) => {
          isConnecting = false;
          if (isMounted) {
            console.error('[STOMP NOTIF] WebSocket Error', event);
          }
        },
        onWebSocketClose: () => {
          isConnecting = false;
        },
        onStompError: (frame) => {
          isConnecting = false;
          if (isMounted) {
            console.error('[STOMP NOTIF] Broker reported error: ' + frame.headers['message']);
            console.error('[STOMP NOTIF] Additional details: ' + frame.body);
          }
        },
        onConnect: () => {
          isConnecting = false;
          if (!isMounted || pendingDisconnect) {
            void client.deactivate().catch(() => {});
            return;
          }
          client.subscribe(`/topic/chat/${user.userId}`, (message) => {
            if (message.body) {
              try {
                const chatMessage = JSON.parse(message.body);
                if (chatMessage.receiverId === user.userId && !chatMessage.isRead) {
                  fetchUnreadCount();
                }
              } catch {
                // Ignore malformed payload
              }
            }
          });
        },
      });

      isConnecting = true;
      client.activate();

      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible' && isMounted) {
          if (!client.connected && !isConnecting && !client.active) {
            isConnecting = true;
            client.activate();
          }
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        isMounted = false;
        clearInterval(interval);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        if (client.connected) {
          void client.deactivate().catch(() => {});
        } else if (isConnecting) {
          pendingDisconnect = true;
        } else if (client.active) {
          void client.deactivate().catch(() => {});
        }
      };
    } else {
      setUnreadChatCount(0);
    }
  }, [user]);

  const decrementUnreadCount = (amount: number) => {
    setUnreadChatCount(prev => Math.max(0, prev - amount));
  };

  return (
    <ChatNotificationContext.Provider value={{
      unreadChatCount,
      refreshUnreadChatCount: fetchUnreadCount,
      decrementUnreadCount
    }}>
      {children}
    </ChatNotificationContext.Provider>
  );
}

export function useChatNotifications() {
  const context = useContext(ChatNotificationContext);
  if (context === undefined) {
    throw new Error('useChatNotifications must be used within a ChatNotificationProvider');
  }
  return context;
}

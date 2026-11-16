import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { ChatNotificationProvider, useChatNotifications } from './ChatNotificationContext';
import * as chatApiModule from '@/entities/chat/api/chatApi';
import * as authContextModule from '@/features/auth/AuthContext';
import * as httpModule from '@/shared/api/http';

interface MockClientInstance {
  config: any;
  active: boolean;
  connected: boolean;
  connectHeaders: Record<string, string>;
  activate: ReturnType<typeof vi.fn>;
  deactivate: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
  _subscriberCb?: (msg: { body: string }) => void;
}

let mockClientInstances: MockClientInstance[] = [];

vi.mock('@stomp/stompjs', () => {
  return {
    Client: vi.fn().mockImplementation(function (this: MockClientInstance, config: any) {
      this.config = config || {};
      this.active = false;
      this.connected = false;
      this.connectHeaders = {};
      this.activate = vi.fn().mockImplementation(() => {
        this.active = true;
        if (this.config?.beforeConnect) {
          this.config.beforeConnect();
        }
      });
      this.deactivate = vi.fn().mockImplementation(() => {
        this.active = false;
        this.connected = false;
        return Promise.resolve();
      });
      this.subscribe = vi.fn().mockImplementation((_topic: string, cb: (msg: { body: string }) => void) => {
        this._subscriberCb = cb;
        return { unsubscribe: vi.fn() };
      });
      mockClientInstances.push(this);
    }),
  };
});

vi.mock('sockjs-client', () => {
  return {
    default: vi.fn().mockImplementation(() => ({})),
  };
});

vi.mock('@/entities/chat/api/chatApi', () => ({
  getUnreadChatCount: vi.fn(),
}));

vi.mock('@/features/auth/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/shared/api/http', () => ({
  getWsEndpointUrl: vi.fn(() => 'http://localhost/api/ws'),
  getAccessToken: vi.fn(() => 'mock-jwt-token'),
}));

function ConsumerComponent() {
  const { unreadChatCount, decrementUnreadCount, refreshUnreadChatCount } = useChatNotifications();
  return (
    <div>
      <span data-testid="unread-count">{unreadChatCount}</span>
      <button onClick={() => decrementUnreadCount(1)}>Decrement</button>
      <button onClick={() => refreshUnreadChatCount()}>Refresh</button>
    </div>
  );
}

describe('ChatNotificationContext — W2 WebSocket Teardown and Reconnect Safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClientInstances = [];
    vi.mocked(chatApiModule.getUnreadChatCount).mockResolvedValue(0);
    vi.mocked(authContextModule.useAuth).mockReturnValue({
      user: { userId: 42, email: 'client@zhanfinance.kz', fullName: 'Test User', role: 'CLIENT' } as any,
      setUser: vi.fn(),
      updateUser: vi.fn(),
      isLoading: false,
      login: vi.fn(),
      completeAuth: vi.fn(),
      loginWithGoogle: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('normal lifecycle: connects, subscribes to user topic, receives messages, and deactivates cleanly on unmount', async () => {
    vi.mocked(chatApiModule.getUnreadChatCount).mockResolvedValue(5);

    const { unmount } = render(
      <ChatNotificationProvider>
        <ConsumerComponent />
      </ChatNotificationProvider>
    );

    expect(await screen.findByTestId('unread-count')).toHaveTextContent('5');
    expect(mockClientInstances.length).toBe(1);

    const client = mockClientInstances[0];
    expect(client.activate).toHaveBeenCalledTimes(1);

    // Simulate successful handshake
    act(() => {
      client.connected = true;
      client.config.onConnect();
    });

    expect(client.subscribe).toHaveBeenCalledWith('/topic/chat/42', expect.any(Function));

    // Simulate incoming message
    vi.mocked(chatApiModule.getUnreadChatCount).mockResolvedValue(6);
    act(() => {
      client._subscriberCb?.({
        body: JSON.stringify({
          receiverId: 42,
          isRead: false,
          content: 'Hello',
        }),
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId('unread-count')).toHaveTextContent('6');
    });

    // Unmount while connected
    unmount();
    expect(client.deactivate).toHaveBeenCalledTimes(1);
  });

  it('W2 regression: rapid unmount during in-flight handshake does not trigger premature deactivation', async () => {
    const { unmount } = render(
      <ChatNotificationProvider>
        <ConsumerComponent />
      </ChatNotificationProvider>
    );

    expect(mockClientInstances.length).toBe(1);
    const client = mockClientInstances[0];
    expect(client.activate).toHaveBeenCalledTimes(1);
    expect(client.connected).toBe(false); // In-flight handshake

    // Unmount before onConnect fires
    unmount();

    // Must NOT synchronously call deactivate on connecting socket
    expect(client.deactivate).not.toHaveBeenCalled();

    // When connection completes late, pending disconnect deactivates safely
    act(() => {
      client.connected = true;
      client.config.onConnect();
    });

    expect(client.deactivate).toHaveBeenCalledTimes(1);
    expect(client.subscribe).not.toHaveBeenCalled();
  });

  it('W2 visibility change during in-flight connection does not cause duplicate activation or force disconnect', async () => {
    render(
      <ChatNotificationProvider>
        <ConsumerComponent />
      </ChatNotificationProvider>
    );

    expect(mockClientInstances.length).toBe(1);
    const client = mockClientInstances[0];
    expect(client.activate).toHaveBeenCalledTimes(1);
    expect(client.connected).toBe(false); // Connecting

    // Simulate visibility change while connecting
    act(() => {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => 'visible',
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Should NOT have triggered a second activate call while isConnecting is true
    expect(client.activate).toHaveBeenCalledTimes(1);
  });

  it('reconnects cleanly on visibility change when connection was dropped and inactive', async () => {
    render(
      <ChatNotificationProvider>
        <ConsumerComponent />
      </ChatNotificationProvider>
    );

    const client = mockClientInstances[0];

    // Complete connection
    act(() => {
      client.connected = true;
      client.config.onConnect();
    });

    // Simulate connection drop
    act(() => {
      client.connected = false;
      client.active = false;
      client.config.onWebSocketClose();
    });

    // Visibility change occurs
    act(() => {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => 'visible',
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Should have re-activated
    expect(client.activate).toHaveBeenCalledTimes(2);
  });

  it('handles WebSocket error and Stomp error gracefully during handshake', async () => {
    render(
      <ChatNotificationProvider>
        <ConsumerComponent />
      </ChatNotificationProvider>
    );

    const client = mockClientInstances[0];
    expect(client.activate).toHaveBeenCalledTimes(1);

    // Trigger websocket error
    act(() => {
      client.config.onWebSocketError(new Event('error'));
    });

    // Trigger stomp error
    act(() => {
      client.config.onStompError({
        headers: { message: 'Broker error' },
        body: 'Error details',
      });
    });

    // Should not crash and state remains responsive
    expect(screen.getByTestId('unread-count')).toBeInTheDocument();
  });

  it('populates fresh Authorization token dynamically in beforeConnect', async () => {
    vi.mocked(httpModule.getAccessToken).mockReturnValue('fresh-jwt-token-xyz');

    render(
      <ChatNotificationProvider>
        <ConsumerComponent />
      </ChatNotificationProvider>
    );

    const client = mockClientInstances[0];
    expect(client.connectHeaders['Authorization']).toBe('Bearer fresh-jwt-token-xyz');
  });

  it('decrements unread count correctly via context method', async () => {
    vi.mocked(chatApiModule.getUnreadChatCount).mockResolvedValue(5);

    render(
      <ChatNotificationProvider>
        <ConsumerComponent />
      </ChatNotificationProvider>
    );

    expect(await screen.findByTestId('unread-count')).toHaveTextContent('5');

    act(() => {
      screen.getByText('Decrement').click();
    });

    expect(screen.getByTestId('unread-count')).toHaveTextContent('4');
  });
});

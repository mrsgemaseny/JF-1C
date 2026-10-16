import { useEffect, useState, useRef } from 'react';
import { Send, User, Search, UserCheck, Shield, MessageCircle, Trash2, ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { getChatContacts, getChatHistory, sendChatMessage, markChatAsRead, deleteChatMessage, ChatContactDto, ChatMessageDto } from '@/entities/chat/api/chatApi';
import { useChatNotifications } from '@/features/chat/ChatNotificationContext';
import { useAuth } from '@/features/auth/AuthContext';
import { getWsEndpointUrl, getSecureImageUrl, getAccessToken } from '@/shared/api/http';
import { Spinner } from '@/shared/ui/Spinner';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { twMerge } from 'tailwind-merge';
import { useTranslation } from 'react-i18next';

export function ClientChatPage() {
  const { user } = useAuth();
  const { t } = useTranslation(['common']);
  const { refreshUnreadChatCount } = useChatNotifications();
  
  // Contacts state
  const [contacts, setContacts] = useState<ChatContactDto[]>([]);
  const [search, setSearch] = useState('');
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);
  
  // Chat state
  const [selectedContact, setSelectedContact] = useState<ChatContactDto | null>(null);
  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessageIdRef = useRef<number>(0);

  const fetchContacts = async () => {
    try {
      const data = await getChatContacts();
      data.sort((a, b) => {
        if (b.unreadCount !== a.unreadCount) return b.unreadCount - a.unreadCount;
        const timeA = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
        const timeB = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
        return timeB - timeA;
      });
      setContacts(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingContacts(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  useEffect(() => {
    if (selectedContact) {
      setMessages([]);
      lastMessageIdRef.current = 0;
      loadChatHistory(selectedContact.id);
      markChatAsRead(selectedContact.id)
        .then(() => refreshUnreadChatCount())
        .catch(console.error);
      setContacts(prev => prev.map(c => c.id === selectedContact.id ? { ...c, unreadCount: 0 } : c));
    }
  }, [selectedContact?.id]);

  const loadChatHistory = async (userId: number) => {
    setIsLoadingChat(true);
    try {
      const history = await getChatHistory(userId);
      if (selectedContact?.id === userId) {
        setMessages(history);
        if (history.length > 0) {
          const validIds = history.map(m => m.id).filter((id): id is number => typeof id === 'number' && !isNaN(id));
          if (validIds.length > 0) {
            lastMessageIdRef.current = Math.max(...validIds);
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingChat(false);
    }
  };

  const selectedContactIdRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    selectedContactIdRef.current = selectedContact?.id;
  }, [selectedContact?.id]);

  useEffect(() => {
    let stompClient: Client | null = null;
    let isMounted = true;
    let isConnecting = false;
    let pendingDisconnect = false;

    if (user) {
      stompClient = new Client({
        webSocketFactory: () => new SockJS(getWsEndpointUrl(), null, { withCredentials: true } as any),
        beforeConnect: () => {
          const token = getAccessToken();
          if (stompClient) {
            stompClient.connectHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};
          }
        },
        debug: () => {},
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
        onWebSocketError: (event) => {
          isConnecting = false;
          if (isMounted) {
            console.error('[STOMP] WebSocket Error', event);
          }
        },
        onWebSocketClose: () => {
          isConnecting = false;
        },
        onStompError: (frame) => {
          isConnecting = false;
          if (isMounted) {
            console.error('[STOMP] Broker reported error: ' + frame.headers['message']);
            console.error('[STOMP] Additional details: ' + frame.body);
          }
        },
        onConnect: () => {
          isConnecting = false;
          if (!isMounted || pendingDisconnect) {
            if (stompClient) {
              void stompClient.deactivate().catch(() => {});
            }
            return;
          }
          stompClient?.subscribe(`/topic/chat/${user.userId}`, (message) => {
            if (message.body) {
              try {
                const chatMessage: ChatMessageDto = JSON.parse(message.body);
                
                setContacts(prev => {
                  const isCurrentChat = selectedContactIdRef.current === chatMessage.senderId || selectedContactIdRef.current === chatMessage.receiverId;
                  const contactId = chatMessage.senderId === user.userId ? chatMessage.receiverId : chatMessage.senderId;
                  
                  const updated = prev.map(c => {
                    if (c.id === contactId) {
                      return {
                        ...c,
                        lastMessage: chatMessage,
                        unreadCount: (isCurrentChat || chatMessage.senderId === user.userId) ? 0 : c.unreadCount + 1
                      };
                    }
                    return c;
                  });
                  
                  updated.sort((a, b) => {
                    if (b.unreadCount !== a.unreadCount) return b.unreadCount - a.unreadCount;
                    const timeA = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
                    const timeB = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
                    return timeB - timeA;
                  });
                  return updated;
                });

                if (selectedContactIdRef.current && (chatMessage.senderId === selectedContactIdRef.current || chatMessage.receiverId === selectedContactIdRef.current)) {
                   setMessages(prev => {
                     if (prev.find(m => m.id === chatMessage.id)) return prev;
                     return [...prev, chatMessage];
                   });
                   if (chatMessage.id > lastMessageIdRef.current) {
                     lastMessageIdRef.current = chatMessage.id;
                   }
                   markChatAsRead(selectedContactIdRef.current)
                     .then(() => refreshUnreadChatCount())
                     .catch(console.error);
                }
              } catch {
                // Ignore parse errors
              }
            }
          });
        }
      });
      isConnecting = true;
      stompClient.activate();

      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible' && isMounted) {
          if (stompClient && !stompClient.connected && !isConnecting && !stompClient.active) {
            isConnecting = true;
            stompClient.activate();
          }
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        isMounted = false;
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        if (stompClient?.connected) {
          void stompClient.deactivate().catch(() => {});
        } else if (isConnecting) {
          pendingDisconnect = true;
        } else if (stompClient?.active) {
          void stompClient.deactivate().catch(() => {});
        }
      };
    }
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const isSendingRef = useRef(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedContact || isSendingRef.current) return;

    const content = newMessage.trim();
    setNewMessage('');
    setIsSending(true);
    isSendingRef.current = true;

    try {
      const sent = await sendChatMessage(selectedContact.id, content);
      setMessages(prev => {
        if (prev.find(m => m.id === sent.id)) return prev;
        return [...prev, sent];
      });
      lastMessageIdRef.current = Math.max(lastMessageIdRef.current, sent.id);
      
      setContacts(prev => {
        const updated = prev.map(c => 
          c.id === selectedContact.id ? { ...c, lastMessage: sent } : c
        );
        updated.sort((a, b) => {
          if (b.unreadCount !== a.unreadCount) return b.unreadCount - a.unreadCount;
          const timeA = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
          const timeB = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
          return timeB - timeA;
        });
        return updated;
      });
    } catch (error) {
      setNewMessage(content);
    } finally {
      setIsSending(false);
      isSendingRef.current = false;
    }
  };

  const handleDeleteMessage = async (msgId: number) => {
    try {
      await deleteChatMessage(msgId);
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isDeleted: true, content: t('clientChat.deletedMessage') } : m));
    } catch (error) {
      console.error(error);
    }
  };

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const filteredContacts = contacts.filter(c => 
    (c.fullName || '').toLowerCase().includes(search.toLowerCase()) || 
    (c.email || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-1 min-h-0 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative">
      
      {/* Sidebar - Contacts */}
      <div className={twMerge(
        "w-full md:w-80 border-r border-gray-100 flex flex-col bg-gray-50/50 shrink-0",
        selectedContact ? "hidden md:flex" : "flex"
      )}>
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-4">{t('clientChat.sidebarTitle')}</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder={t('search.placeholder').split(',')[0] + '...'} // Reusing search.placeholder partially or just use generic Search
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:border-brand-green focus:ring-1 focus:ring-brand-green outline-none transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoadingContacts ? (
            <div className="flex justify-center p-8"><Spinner className="w-6 h-6 text-brand-green" /></div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center text-gray-400 p-8 text-sm">{t('clientChat.noContacts')}</div>
          ) : (
            filteredContacts.map(contact => (
              <motion.button
                layout
                key={contact.id}
                onClick={() => setSelectedContact(contact)}
                className={`w-full flex items-start gap-3 p-4 text-left transition-colors border-b border-gray-100 last:border-0 ${
                  selectedContact?.id === contact.id ? 'bg-brand-green/5' : 'hover:bg-white'
                }`}
              >
                <div className="relative flex-shrink-0">
                  <div className={`relative w-10 h-10 rounded-full flex items-center justify-center text-white overflow-hidden ${
                      contact.role === 'ADMIN' ? 'bg-indigo-500' : 'bg-brand-green/80'
                  }`}>
                    {contact.avatarUrl ? (
                      <img src={getSecureImageUrl(contact.avatarUrl)} alt="" className="w-full h-full object-cover" />
                    ) : (
                      contact.role === 'ADMIN' ? <Shield size={20} /> : <UserCheck size={20} />
                    )}
                  </div>
                  {contact.unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full border-2 border-white z-20">
                      {contact.unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-sm font-semibold text-gray-900 truncate pr-2">
                      {contact.fullName || contact.email}
                    </p>
                    {contact.lastMessage && (
                      <span className="text-[10px] text-gray-400 flex-shrink-0">
                        {formatTime(contact.lastMessage.createdAt)}
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <p className={`text-xs truncate ${contact.unreadCount > 0 ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                      {contact.lastMessage ? contact.lastMessage.content : (contact.role === 'ADMIN' ? t('sidebar.roles.ADMIN') : t('sidebar.roles.EMPLOYEE'))}
                    </p>
                    <span className={`px-1.5 py-0.5 text-[9px] rounded uppercase font-bold tracking-wider ${
                      contact.role === 'ADMIN' ? 'bg-indigo-100 text-indigo-700' : 'bg-brand-green/10 text-brand-green'
                    }`}>
                      {contact.role === 'ADMIN' ? t('clientChat.roles.ADMIN') : t('clientChat.roles.EMPLOYEE')}
                    </span>
                  </div>
                </div>
              </motion.button>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={twMerge(
        "flex-1 flex flex-col bg-white min-w-0 h-full",
        !selectedContact ? "hidden md:flex" : "flex"
      )}>
        {selectedContact ? (
          <>
            {/* Header */}
            <div className="flex items-center px-4 md:px-6 py-4 border-b border-gray-100 bg-white shrink-0">
              <button 
                onClick={() => setSelectedContact(null)}
                className="md:hidden mr-3 p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                title={t('common.back')}
              >
                <ChevronLeft size={24} />
              </button>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white shadow-sm overflow-hidden ${
                    selectedContact.role === 'ADMIN' ? 'bg-indigo-500' : 'bg-brand-green/80'
                }`}>
                  {selectedContact.avatarUrl ? (
                    <img src={getSecureImageUrl(selectedContact.avatarUrl)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    selectedContact.role === 'ADMIN' ? <Shield size={20} /> : <UserCheck size={20} />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{selectedContact.fullName || selectedContact.email}</h3>
                  <p className="text-xs text-gray-500 font-medium">{selectedContact.role === 'ADMIN' ? t('sidebar.roles.ADMIN', { defaultValue: 'Admin' }) : t('sidebar.roles.EMPLOYEE', { defaultValue: 'Employee' })}</p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col">
              {isLoadingChat ? (
                <div className="flex-1 flex justify-center items-center">
                  <Spinner className="w-8 h-8 text-brand-green" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-2">
                  <p className="text-sm">{t('clientChat.noMessages')}</p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isMine = msg.senderId === user?.userId;
                  const showTail = idx === messages.length - 1 || messages[idx + 1].senderId !== msg.senderId;

                  return (
                    <div 
                      key={msg.id} 
                      className={`flex flex-col w-full ${!showTail ? 'mb-[2px]' : 'mb-3'}`}
                    >
                      <div className={`flex items-center gap-2 group w-full ${isMine ? 'flex-row-reverse' : ''}`}>
                        <div 
                          className={`px-4 py-2.5 w-fit shrink-0 max-w-[80vw] md:max-w-[60vw] relative ${
                            msg.isDeleted ? 'bg-transparent border border-gray-200 text-gray-400 italic rounded-2xl' :
                            isMine 
                              ? 'bg-brand-green text-white rounded-2xl rounded-tr-sm' 
                              : 'bg-gray-100 text-gray-900 rounded-2xl rounded-tl-sm'
                          }`}
                        >
                          <p className="text-sm break-words whitespace-pre-wrap">{msg.content}</p>
                        </div>
                        {isMine && !msg.isDeleted && (
                          <button 
                            onClick={() => {
                              if (confirm(t('clientChat.deleteConfirm'))) handleDeleteMessage(msg.id);
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            title={t('common.delete')}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                      <span className={`text-[10px] text-gray-400 mt-1 ${isMine ? 'self-end mr-1' : 'self-start ml-1'}`}>
                        {formatTime(msg.createdAt)}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 md:p-4 bg-white border-t border-gray-100 shrink-0">
              <form 
                noValidate
                onSubmit={handleSend}
                className="flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-2xl p-2 focus-within:border-brand-green focus-within:ring-1 focus-within:ring-brand-green transition-all"
              >
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend(e);
                    }
                  }}
                  placeholder={t('clientChat.inputPlaceholder')}
                  className="flex-1 max-h-32 min-h-[44px] bg-transparent border-none focus:ring-0 resize-none text-sm px-3 py-2.5"
                  rows={1}
                  spellCheck={false}
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || isSending}
                  className="p-3 bg-brand-green text-white rounded-xl hover:bg-emerald-600 disabled:opacity-50 disabled:hover:bg-brand-green transition-colors flex-shrink-0"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50/30">
            <MessageCircle className="w-16 h-16 mb-4 text-gray-300" />
            <p className="text-lg font-medium text-gray-600">{t('clientChat.placeholderTitle')}</p>
            <p className="text-sm">{t('clientChat.placeholderSubtitle')}</p>
          </div>
        )}
      </div>
    </div>
  );
}

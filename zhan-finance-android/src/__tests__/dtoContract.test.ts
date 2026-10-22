import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  taskMobileApi,
  type MobileTaskDto,
  type TaskStageDto,
  type TaskClientDto,
} from '@/entities/task/taskApi';
import {
  chatMobileApi,
  type MobileConversationDto,
  type MobileChatMessageDto,
} from '@/entities/chat/chatApi';
import {
  billingMobileApi,
  type MobileInvoiceDto,
} from '@/entities/billing/billingApi';
import {
  documentMobileApi,
  type MobileDocumentDto,
} from '@/entities/document/documentApi';
import { setAccessToken } from '@/shared/api/http';
import { mmkv } from '@/shared/storage/mmkvStorage';

describe('Mobile DTO & API Contract Verification', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mmkv.clearAll();
    setAccessToken('mock-token');
  });

  describe('Task API & DTO Contract', () => {
    it('fetches tasks with nested stage and client objects', async () => {
      const mockStage: TaskStageDto = {
        id: 1,
        name: 'В работе',
        color: '#10B981',
        type: 'IN_PROGRESS',
      };
      const mockClient: TaskClientDto = {
        id: 10,
        fullName: 'Иван Иванов',
        phone: '+77011234567',
        email: 'ivan@example.com',
      };
      const mockTask: MobileTaskDto = {
        id: 101,
        title: 'Подготовка квартального отчета',
        description: 'Сдать отчет по НДС',
        stage: mockStage,
        client: mockClient,
        amount: 150000,
        currency: 'KZT',
        dueDate: '2026-11-01T18:00:00Z',
        createdAt: '2026-10-20T10:00:00Z',
      };

      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: [mockTask],
            message: null,
            timestamp: new Date().toISOString(),
          }),
          { status: 200 }
        )
      );

      const tasks = await taskMobileApi.getTasks();
      expect(tasks).toHaveLength(1);
      expect(tasks[0].id).toBe(101);
      expect(tasks[0].stage?.name).toBe('В работе');
      expect(tasks[0].stage?.color).toBe('#10B981');
      expect(tasks[0].client?.fullName).toBe('Иван Иванов');
      expect(tasks[0].amount).toBe(150000);
      expect((tasks[0] as unknown as Record<string, unknown>).stageName).toBeUndefined();
      expect((tasks[0] as unknown as Record<string, unknown>).priority).toBeUndefined();

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/crm/tasks'),
        expect.any(Object)
      );
    });

    it('claims task from pool calling /api/v1/crm/tasks/:id/claim', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: { id: 205, title: 'Задача из пула' },
            message: null,
            timestamp: new Date().toISOString(),
          }),
          { status: 200 }
        )
      );

      const claimed = await taskMobileApi.claimFromPool(205);
      expect(claimed.id).toBe(205);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/crm/tasks/205/claim'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('creates task request via POST /api/v1/crm/tasks/request', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: { id: 301, title: 'Запрос на аудит' },
            message: null,
            timestamp: new Date().toISOString(),
          }),
          { status: 200 }
        )
      );

      const res = await taskMobileApi.createTaskRequest({
        title: 'Запрос на аудит',
        description: 'Нужна проверка за 2025',
      });
      expect(res.id).toBe(301);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/crm/tasks/request'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            title: 'Запрос на аудит',
            description: 'Нужна проверка за 2025',
          }),
        })
      );
    });

    it('creates full task via POST /api/v1/crm/tasks', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: { id: 302, title: 'Задача CRM', amount: 50000 },
            message: null,
            timestamp: new Date().toISOString(),
          }),
          { status: 200 }
        )
      );

      const res = await taskMobileApi.createTask({
        title: 'Задача CRM',
        amount: 50000,
      });
      expect(res.id).toBe(302);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/crm/tasks'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            title: 'Задача CRM',
            amount: 50000,
          }),
        })
      );
    });

    it('updates task stage via PATCH /api/v1/crm/tasks/:id/stage', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: { id: 303, stage: { id: 5, name: 'Готово' } },
            message: null,
            timestamp: new Date().toISOString(),
          }),
          { status: 200 }
        )
      );

      const res = await taskMobileApi.updateStage(303, 5);
      expect(res.stage?.name).toBe('Готово');
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/crm/tasks/303/stage'),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ stageId: 5, lostReason: undefined }),
        })
      );
    });

    it('fetches pipelines via GET /api/v1/crm/pipelines', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: [
              {
                id: 1,
                name: 'Основная воронка',
                stages: [{ id: 10, name: 'Новая' }, { id: 11, name: 'В работе' }],
              },
            ],
            message: null,
            timestamp: new Date().toISOString(),
          }),
          { status: 200 }
        )
      );

      const pipelines = await taskMobileApi.getPipelines();
      expect(pipelines).toHaveLength(1);
      expect(pipelines[0].stages).toHaveLength(2);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/crm/pipelines'),
        expect.any(Object)
      );
    });

    it('fetches single task via GET /api/v1/crm/tasks/:id', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: { id: 304, title: 'Детали задачи' },
            message: null,
            timestamp: new Date().toISOString(),
          }),
          { status: 200 }
        )
      );

      const task = await taskMobileApi.getTask(304);
      expect(task.id).toBe(304);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/crm/tasks/304'),
        expect.any(Object)
      );
    });

    it('fetches comments via GET /api/v1/crm/tasks/:id/comments', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: [
              {
                id: 1,
                content: 'Первый комментарий',
                authorName: 'Алибек',
                createdAt: '2026-10-22T10:00:00Z',
              },
            ],
            message: null,
            timestamp: new Date().toISOString(),
          }),
          { status: 200 }
        )
      );

      const comments = await taskMobileApi.getTaskComments(304);
      expect(comments).toHaveLength(1);
      expect(comments[0].content).toBe('Первый комментарий');
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/crm/tasks/304/comments'),
        expect.any(Object)
      );
    });

    it('adds comment via POST /api/v1/crm/tasks/:id/comments with both text and content', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: { id: 77 },
            message: null,
            timestamp: new Date().toISOString(),
          }),
          { status: 200 }
        )
      );

      await taskMobileApi.addTaskComment(304, 'Новый комментарий');
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/crm/tasks/304/comments'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            text: 'Новый комментарий',
            content: 'Новый комментарий',
          }),
        })
      );
    });
  });

  describe('Chat API & DTO Contract', () => {
    it('fetches conversations from /api/v1/chat/contacts with ChatController shape', async () => {
      const mockConversation: MobileConversationDto = {
        id: 42,
        fullName: 'Бухгалтер Алия',
        email: 'aliya@zhanfinance.kz',
        role: 'EMPLOYEE',
        avatarUrl: undefined,
        unreadCount: 3,
        lastMessage: {
          id: 501,
          content: 'Документы приняты',
          createdAt: '2026-10-22T08:30:00Z',
          isRead: false,
        },
      };

      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: [mockConversation],
            message: null,
            timestamp: new Date().toISOString(),
          }),
          { status: 200 }
        )
      );

      const convs = await chatMobileApi.getConversations();
      expect(convs).toHaveLength(1);
      expect(convs[0].id).toBe(42);
      expect(convs[0].fullName).toBe('Бухгалтер Алия');
      expect(convs[0].lastMessage?.content).toBe('Документы приняты');
      expect((convs[0] as unknown as Record<string, unknown>).partnerId).toBeUndefined();

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/chat/contacts'),
        expect.any(Object)
      );
    });

    it('fetches messages for partner from /api/v1/chat/:partnerId', async () => {
      const mockMessage: MobileChatMessageDto = {
        id: 99,
        senderId: 42,
        receiverId: 1,
        content: 'Здравствуйте, есть вопрос по акту сверки',
        createdAt: '2026-10-22T09:00:00Z',
        isRead: true,
      };

      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: [mockMessage],
            message: null,
            timestamp: new Date().toISOString(),
          }),
          { status: 200 }
        )
      );

      const msgs = await chatMobileApi.getMessages(42);
      expect(msgs).toHaveLength(1);
      expect(msgs[0].content).toBe('Здравствуйте, есть вопрос по акту сверки');
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/chat/42'),
        expect.any(Object)
      );
    });

    it('sends message via POST /api/v1/chat/:receiverId with { content }', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: { id: 100 },
            message: null,
            timestamp: new Date().toISOString(),
          }),
          { status: 200 }
        )
      );

      const res = await chatMobileApi.sendMessage(42, 'Спасибо!');
      expect(res.queuedOffline).toBe(false);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/chat/42'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ content: 'Спасибо!' }),
        })
      );
    });

    it('marks conversation as read via PUT /api/v1/chat/:partnerId/read', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: null,
            message: null,
            timestamp: new Date().toISOString(),
          }),
          { status: 200 }
        )
      );

      await chatMobileApi.markAsRead(42);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/chat/42/read'),
        expect.objectContaining({ method: 'PUT' })
      );
    });
  });

  describe('Billing API & DTO Contract', () => {
    it('fetches invoices matching backend InvoiceDto shape', async () => {
      const mockInvoice: MobileInvoiceDto = {
        id: 7,
        clientId: 12,
        title: 'Услуги бухгалтерского сопровождения за октябрь',
        amount: 85000,
        status: 'PENDING',
        dueDate: '2026-10-31',
      };

      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: [mockInvoice],
            message: null,
            timestamp: new Date().toISOString(),
          }),
          { status: 200 }
        )
      );

      const invoices = await billingMobileApi.getInvoices();
      expect(invoices).toHaveLength(1);
      expect(invoices[0].title).toBe('Услуги бухгалтерского сопровождения за октябрь');
      expect(invoices[0].amount).toBe(85000);
      expect((invoices[0] as unknown as Record<string, unknown>).invoiceNumber).toBeUndefined();
      expect((invoices[0] as unknown as Record<string, unknown>).description).toBeUndefined();

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/billing/invoices'),
        expect.any(Object)
      );
    });
  });

  describe('Document API & DTO Contract', () => {
    it('fetches documents matching backend DocumentDto shape', async () => {
      const mockDocument: MobileDocumentDto = {
        id: 88,
        fileName: 'Акт_выполненных_работ_октябрь.pdf',
        fileSize: 245760,
        contentType: 'application/pdf',
        status: 'SIGNED',
        createdAt: '2026-10-21T12:00:00Z',
        folder: 'Акты',
        downloadUrl: '/api/v1/documents/88/download',
      };

      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: [mockDocument],
            message: null,
            timestamp: new Date().toISOString(),
          }),
          { status: 200 }
        )
      );

      const docs = await documentMobileApi.getDocuments();
      expect(docs).toHaveLength(1);
      expect(docs[0].fileName).toBe('Акт_выполненных_работ_октябрь.pdf');
      expect(docs[0].fileSize).toBe(245760);
      expect((docs[0] as unknown as Record<string, unknown>).title).toBeUndefined();

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/documents'),
        expect.any(Object)
      );
    });
  });
});

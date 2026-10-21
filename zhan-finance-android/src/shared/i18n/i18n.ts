import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { setApiLanguage } from '@/shared/api/http';
import { mmkvSyncStorage } from '@/shared/storage/mmkvStorage';

const LANG_STORAGE_KEY = 'zf_selected_language';

export const resources = {
  ru: {
    translation: {
      common: {
        offlineMode: 'Офлайн-режим: показаны сохраненные данные',
        queuedMutations: 'В очереди на синхронизацию: {{count}}',
        syncNow: 'Синхронизировать',
        loading: 'Загрузка...',
        retry: 'Повторить',
        save: 'Сохранить',
        cancel: 'Отмена',
        logout: 'Выйти из аккаунта',
        language: 'Язык интерфейса',
        biometrics: 'Вход по биометрии (Отпечаток / Лицо)',
        biometricPrompt: 'Подтвердите личность для входа в ZHAN FINANCE',
        unlockWithBiometrics: 'Разблокировать по биометрии',
      },
      nav: {
        overview: 'Обзор',
        tasks: 'Задачи',
        pool: 'Пул',
        chat: 'Чат',
        billing: 'Счета',
        documents: 'Документы',
        profile: 'Профиль',
      },
      auth: {
        signInTitle: 'Вход в систему',
        signInSubtitle: 'Корпоративная платформа ZHAN FINANCE',
        email: 'Электронная почта',
        password: 'Пароль',
        signInButton: 'Войти',
        twoFactorTitle: 'Двухфакторная защита (2FA)',
        twoFactorSubtitle: 'Введите 6-значный код из приложения-аутентификатора или почты',
        otpCode: 'Код подтверждения',
        verifyButton: 'Подтвердить',
        invalidCredentials: 'Проверьте правильность логина и пароля',
      },
      tasks: {
        title: 'Задачи CRM',
        poolTitle: 'Свободный пул задач',
        claimTask: 'Взять в работу',
        claimedSuccess: 'Задача закреплена за вами',
        emptyTasks: 'Нет задач в выбранной стадии',
        stages: {
          ALL: 'Все',
          NEW: 'Новые',
          IN_PROGRESS: 'В работе',
          REVIEW: 'На проверке',
          DONE: 'Готово',
        },
        priority: {
          HIGH: 'Высокий',
          MEDIUM: 'Средний',
          LOW: 'Низкий',
          URGENT: 'Срочный',
        },
      },
      billing: {
        title: 'Счета и Оплата',
        uploadReceipt: 'Прикрепить чек оплаты',
        status: {
          PAID: 'Оплачен',
          PENDING: 'Ожидает оплаты',
          OVERDUE: 'Просрочен',
          CANCELED: 'Отменен',
        },
        emptyInvoices: 'Счета еще не выставлены',
      },
      documents: {
        title: 'Документы и Отчеты 1С',
        shareDocument: 'Открыть / Поделиться',
        emptyDocuments: 'Список документов пуст',
      },
      chat: {
        title: 'Сообщения',
        placeholder: 'Введите сообщение...',
        send: 'Отправить',
        emptyChat: 'Нет активных диалогов',
      },
      roles: {
        ADMIN: 'Администратор',
        EMPLOYEE: 'Бухгалтер / Сотрудник',
        CLIENT: 'Клиент',
        ADVISOR: 'Финансовый консультант',
        CURATOR: 'Куратор LMS',
        LEARNER: 'Студент',
      },
    },
  },
  kk: {
    translation: {
      common: {
        offlineMode: 'Офлайн режим: сақталған деректер көрсетілуде',
        queuedMutations: 'Синхрондау кезегінде: {{count}}',
        syncNow: 'Синхрондау',
        loading: 'Жүктелуде...',
        retry: 'Қайталау',
        save: 'Сақтау',
        cancel: 'Болдырмау',
        logout: 'Жүйеден шығу',
        language: 'Интерфейс тілі',
        biometrics: 'Биометриямен кіру (Саусақ ізі / Бет-әлпет)',
        biometricPrompt: 'ZHAN FINANCE жүйесіне кіру үшін растаңыз',
        unlockWithBiometrics: 'Биометрия арқылы ашу',
      },
      nav: {
        overview: 'Шолу',
        tasks: 'Тапсырмалар',
        pool: 'Пул',
        chat: 'Чат',
        billing: 'Шоттар',
        documents: 'Құжаттар',
        profile: 'Профиль',
      },
      auth: {
        signInTitle: 'Жүйеге кіру',
        signInSubtitle: 'ZHAN FINANCE корпоративтік платформасы',
        email: 'Электрондық пошта',
        password: 'Құпия сөз',
        signInButton: 'Кіру',
        twoFactorTitle: 'Екі факторлы қорғаныс (2FA)',
        twoFactorSubtitle: 'Аутентификатор немесе поштадағы 6 таңбалы кодты енгізіңіз',
        otpCode: 'Растау коды',
        verifyButton: 'Растау',
        invalidCredentials: 'Логин мен құпия сөзді тексеріңіз',
      },
      tasks: {
        title: 'CRM Тапсырмалары',
        poolTitle: 'Бос тапсырмалар пулы',
        claimTask: 'Жұмысқа алу',
        claimedSuccess: 'Тапсырма сізге бекітілді',
        emptyTasks: 'Таңдалған кезеңде тапсырмалар жоқ',
        stages: {
          ALL: 'Барлығы',
          NEW: 'Жаңа',
          IN_PROGRESS: 'Орындалуда',
          REVIEW: 'Тексеруде',
          DONE: 'Дайын',
        },
        priority: {
          HIGH: 'Жоғары',
          MEDIUM: 'Орташа',
          LOW: 'Төмен',
          URGENT: 'Шұғыл',
        },
      },
      billing: {
        title: 'Шоттар және Төлем',
        uploadReceipt: 'Төлем түбіртегін тіркеу',
        status: {
          PAID: 'Төленді',
          PENDING: 'Төлем күтілуде',
          OVERDUE: 'Мерзімі өткен',
          CANCELED: 'Бас тартылды',
        },
        emptyInvoices: 'Шоттар әлі қойылмаған',
      },
      documents: {
        title: 'Құжаттар және 1С есептері',
        shareDocument: 'Ашу / Бөлісу',
        emptyDocuments: 'Құжаттар тізімі бос',
      },
      chat: {
        title: 'Хабарламалар',
        placeholder: 'Хабарлама жазыңыз...',
        send: 'Жіберу',
        emptyChat: 'Белсенді диалогтар жоқ',
      },
      roles: {
        ADMIN: 'Әкімші',
        EMPLOYEE: 'Бухгалтер / Қызметкер',
        CLIENT: 'Клиент',
        ADVISOR: 'Қаржы кеңесшісі',
        CURATOR: 'LMS Кураторы',
        LEARNER: 'Студент',
      },
    },
  },
  en: {
    translation: {
      common: {
        offlineMode: 'Offline mode: displaying cached data',
        queuedMutations: 'Queued for sync: {{count}}',
        syncNow: 'Sync now',
        loading: 'Loading...',
        retry: 'Retry',
        save: 'Save',
        cancel: 'Cancel',
        logout: 'Sign out',
        language: 'Interface language',
        biometrics: 'Biometric unlock (Fingerprint / Face)',
        biometricPrompt: 'Authenticate to access ZHAN FINANCE',
        unlockWithBiometrics: 'Unlock with Biometrics',
      },
      nav: {
        overview: 'Overview',
        tasks: 'Tasks',
        pool: 'Pool',
        chat: 'Chat',
        billing: 'Billing',
        documents: 'Docs',
        profile: 'Profile',
      },
      auth: {
        signInTitle: 'Sign In',
        signInSubtitle: 'ZHAN FINANCE Enterprise Platform',
        email: 'Email address',
        password: 'Password',
        signInButton: 'Sign In',
        twoFactorTitle: 'Two-Factor Verification (2FA)',
        twoFactorSubtitle: 'Enter the 6-digit code from your authenticator app or email',
        otpCode: 'Verification code',
        verifyButton: 'Verify',
        invalidCredentials: 'Please check your email and password',
      },
      tasks: {
        title: 'CRM Tasks',
        poolTitle: 'Open Task Pool',
        claimTask: 'Claim Task',
        claimedSuccess: 'Task assigned to you',
        emptyTasks: 'No tasks in the selected stage',
        stages: {
          ALL: 'All',
          NEW: 'New',
          IN_PROGRESS: 'In Progress',
          REVIEW: 'In Review',
          DONE: 'Done',
        },
        priority: {
          HIGH: 'High',
          MEDIUM: 'Medium',
          LOW: 'Low',
          URGENT: 'Urgent',
        },
      },
      billing: {
        title: 'Invoices & Billing',
        uploadReceipt: 'Upload Payment Receipt',
        status: {
          PAID: 'Paid',
          PENDING: 'Pending',
          OVERDUE: 'Overdue',
          CANCELED: 'Canceled',
        },
        emptyInvoices: 'No invoices issued yet',
      },
      documents: {
        title: 'Documents & 1C Reports',
        shareDocument: 'Open / Share',
        emptyDocuments: 'No documents available',
      },
      chat: {
        title: 'Messages',
        placeholder: 'Write a message...',
        send: 'Send',
        emptyChat: 'No active conversations',
      },
      roles: {
        ADMIN: 'Administrator',
        EMPLOYEE: 'Accountant / Employee',
        CLIENT: 'Client',
        ADVISOR: 'Financial Advisor',
        CURATOR: 'LMS Curator',
        LEARNER: 'Student',
      },
    },
  },
  zh: {
    translation: {
      common: {
        offlineMode: '离线模式：正在显示缓存数据',
        queuedMutations: '等待同步的操作：{{count}}',
        syncNow: '立即同步',
        loading: '加载中...',
        retry: '重试',
        save: '保存',
        cancel: '取消',
        logout: '退出登录',
        language: '界面语言',
        biometrics: '生物识别解锁（指纹 / 面部）',
        biometricPrompt: '请验证身份以访问 ZHAN FINANCE',
        unlockWithBiometrics: '使用生物识别解锁',
      },
      nav: {
        overview: '概览',
        tasks: '任务',
        pool: '任务池',
        chat: '聊天',
        billing: '账单',
        documents: '文档',
        profile: '个人资料',
      },
      auth: {
        signInTitle: '系统登录',
        signInSubtitle: 'ZHAN FINANCE 企业财税平台',
        email: '电子邮箱',
        password: '密码',
        signInButton: '登录',
        twoFactorTitle: '双重身份验证 (2FA)',
        twoFactorSubtitle: '请输入来自身份验证器或邮箱的 6 位验证码',
        otpCode: '验证码',
        verifyButton: '确认验证',
        invalidCredentials: '请检查您的邮箱和密码',
      },
      tasks: {
        title: 'CRM 任务',
        poolTitle: '公共任务池',
        claimTask: '领取任务',
        claimedSuccess: '任务已分配给您',
        emptyTasks: '当前阶段没有任务',
        stages: {
          ALL: '全部',
          NEW: '新建',
          IN_PROGRESS: '进行中',
          REVIEW: '审核中',
          DONE: '已完成',
        },
        priority: {
          HIGH: '高',
          MEDIUM: '中',
          LOW: '低',
          URGENT: '紧急',
        },
      },
      billing: {
        title: '账单与付款',
        uploadReceipt: '上传付款凭证',
        status: {
          PAID: '已支付',
          PENDING: '待支付',
          OVERDUE: '已逾期',
          CANCELED: '已取消',
        },
        emptyInvoices: '暂无账单记录',
      },
      documents: {
        title: '文档与 1C 报表',
        shareDocument: '打开 / 分享',
        emptyDocuments: '暂无文档',
      },
      chat: {
        title: '消息中心',
        placeholder: '输入消息...',
        send: '发送',
        emptyChat: '暂无活跃会话',
      },
      roles: {
        ADMIN: '系统管理员',
        EMPLOYEE: '会计师 / 员工',
        CLIENT: '企业客户',
        ADVISOR: '财务顾问',
        CURATOR: '课程导师',
        LEARNER: '学员',
      },
    },
  },
} as const;

export type SupportedLocale = keyof typeof resources;

export const LOCALES: { code: SupportedLocale; label: string }[] = [
  { code: 'ru', label: 'Русский' },
  { code: 'kk', label: 'Қазақша' },
  { code: 'en', label: 'English' },
  { code: 'zh', label: '中文' },
];

const savedLanguage = (mmkvSyncStorage.getItem(LANG_STORAGE_KEY) || 'ru') as SupportedLocale;
setApiLanguage(savedLanguage);

void i18n.use(initReactI18next).init({
  resources,
  lng: savedLanguage,
  fallbackLng: 'ru',
  interpolation: {
    escapeValue: false,
  },
});

export async function switchLanguage(lang: SupportedLocale): Promise<void> {
  mmkvSyncStorage.setItem(LANG_STORAGE_KEY, lang);
  setApiLanguage(lang);
  await i18n.changeLanguage(lang);
}

export default i18n;

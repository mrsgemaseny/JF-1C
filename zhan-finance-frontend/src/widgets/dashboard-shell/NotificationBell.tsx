import { useState, useRef, useEffect } from 'react';
import { useNotifications } from '@/features/notifications/NotificationContext';
import { Bell, Check, CheckCircle2, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/shared/config/routes';
import { clsx } from 'clsx';
import { formatRelativeTime } from '@/shared/lib/dateFormat';
import { useTranslation } from 'react-i18next';
import { translateNotificationTitle, translateNotificationMessage } from '@/shared/i18n/notificationTranslator';

export function NotificationBell() {
  const { t, i18n } = useTranslation(['common']);
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Show only up to 5 latest notifications in the dropdown
  const recentNotifications = notifications.slice(0, 5);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors focus:outline-none"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-in slide-in-from-top-2 duration-200">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <h3 className="text-sm font-bold text-gray-900">{t('notifications.title')}</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs font-medium text-brand-green hover:text-green-700 flex items-center gap-1 transition-colors"
              >
                <Check size={14} />
                {t('notifications.markAllAsRead', { defaultValue: 'Прочитать все' })}
              </button>
            )}
          </div>

          <div className="max-h-[360px] overflow-y-auto overscroll-contain">
            {recentNotifications.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center">
                <Bell className="w-10 h-10 text-gray-200 mb-3" />
                <p className="text-sm text-gray-500">{t('notifications.empty')}</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {recentNotifications.map(notification => (
                  <div
                    key={notification.id}
                    className={clsx(
                      "p-4 flex gap-3 transition-colors hover:bg-gray-50",
                      !notification.read ? "bg-brand-green/5" : ""
                    )}
                  >
                    <div className="shrink-0 mt-0.5">
                      <div className={clsx(
                        "w-8 h-8 rounded-full flex items-center justify-center",
                        !notification.read ? "bg-brand-green text-white shadow-sm" : "bg-gray-100 text-gray-400"
                      )}>
                        <Bell size={14} />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <h4 className={clsx("text-sm truncate", !notification.read ? "font-bold text-gray-900" : "font-medium text-gray-700")}>
                          {translateNotificationTitle(notification.title, i18n.language)}
                        </h4>
                        <span className="text-[10px] text-gray-400 whitespace-nowrap shrink-0">
                          {formatRelativeTime(notification.createdAt, i18n.language)}
                        </span>
                      </div>
                      <p className={clsx("text-xs line-clamp-2", !notification.read ? "text-gray-700" : "text-gray-500")}>
                        {translateNotificationMessage(notification.message, i18n.language, t)}
                      </p>
                      {!notification.read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="mt-2 text-[11px] font-semibold text-brand-green hover:text-green-700 flex items-center gap-1 transition-colors"
                        >
                          <CheckCircle2 size={12} />
                          {t('notifications.confirm', { defaultValue: 'Отметить прочитанным' })}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-2 border-t border-gray-100 bg-gray-50">
              <Link
                to={ROUTES.NOTIFICATIONS}
                onClick={() => setIsOpen(false)}
                className="block text-center text-xs font-semibold text-gray-500 hover:text-brand-green transition-colors"
              >
                {t('notifications.viewAll')} <ChevronRight className="inline w-3 h-3 ml-0.5" />
              </Link>
          </div>
        </div>
      )}
    </div>
  );
}

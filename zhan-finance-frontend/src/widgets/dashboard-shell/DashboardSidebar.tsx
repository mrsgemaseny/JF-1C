import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { useTranslation } from 'react-i18next';
import { navConfig } from './nav-config';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  ClipboardList,
  Archive,
  XCircle,
  FileText,
  Briefcase,
  LogOut,
  ChevronRight,
  Bell,
  Settings,
  MessageCircle,
  CalendarDays,
  BookOpen,
  CreditCard,
  RefreshCw,
  History,
  User,
  FileSpreadsheet,
  ShieldCheck,
  BarChart2,
  FileCheck,
  Menu,
} from 'lucide-react';
import { useNotifications } from '@/features/notifications/NotificationContext';
import { useChatNotifications } from '@/features/chat/ChatNotificationContext';
import { getSecureImageUrl } from '@/shared/api/http';
import { twMerge } from 'tailwind-merge';
import { ROUTES } from '@/shared/config/routes';

const NAV_ICONS: Record<string, React.ReactNode> = {
  'Overview':            <LayoutDashboard size={16} />,
  '1C Reports':          <FileSpreadsheet size={16} />,
  'Calendar':            <CalendarDays size={16} />,
  'Chat':                <MessageCircle size={16} />,
  'Employees':           <UserCheck size={16} />,
  'Clients':             <Users size={16} />,
  'Leads':               <ClipboardList size={16} />,
  'Tasks':               <ClipboardList size={16} />,
  'Task Pool':           <Briefcase size={16} />,
  'My Tasks':            <ClipboardList size={16} />,
  'My Clients':          <Users size={16} />,
  'Archive (Done)':      <Archive size={16} />,
  'Archive (Cancelled)': <XCircle size={16} />,
  'Documents':           <FileText size={16} />,
  'My Requests':         <Briefcase size={16} />,
  'Services':            <Briefcase size={16} />,
  'Courses':             <BookOpen size={16} />,
  'My Courses':          <BookOpen size={16} />,
  'Learners':            <Users size={16} />,
  'Students':            <Users size={16} />,
  'Curators':            <UserCheck size={16} />,
  'Invoices':            <CreditCard size={16} />,
  'Subscriptions':       <RefreshCw size={16} />,
  'Payment Receipts':    <FileCheck size={16} />,
  'Billing & Plans':     <CreditCard size={16} />,
  'Audit Logs':          <History size={16} />,
  'Templates':           <FileText size={16} />,
  '2FA Security':        <ShieldCheck size={16} />,
  'Team Workload':       <BarChart2 size={16} />,
  'Settings':            <Settings size={16} />,
  'Notifications':       <Bell size={16} />,
};



// Role labels are now handled via i18n

interface DashboardSidebarProps {
  isMobileOpen: boolean;
  onMobileClose: () => void;
  isDesktopCollapsed: boolean;
  onDesktopToggle: () => void;
}

export function DashboardSidebar({ 
  isMobileOpen, 
  onMobileClose, 
  isDesktopCollapsed, 
  onDesktopToggle,
}: DashboardSidebarProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation(['common']);
  const { unreadCount } = useNotifications();
  const { unreadChatCount } = useChatNotifications();

  if (!user) return null;

  const navItems = navConfig[user.role] || [];

  const isRootRoleRoute = (href: string) => [
    ROUTES.ADMIN,
    ROUTES.CLIENT,
    ROUTES.EMPLOYEE,
    ROUTES.ADVISOR,
    ROUTES.CURATOR,
    ROUTES.HOME,
    ROUTES.SETTINGS,
    ROUTES.NOTIFICATIONS,
  ].includes(href as any);

  const matchingItems = navItems.filter((item) =>
    location.pathname === item.href ||
    (!isRootRoleRoute(item.href) && location.pathname.startsWith(item.href + '/'))
  );

  const activeItem = matchingItems.length > 0
    ? matchingItems.reduce((best, current) => current.href.length > best.href.length ? current : best)
    : null;

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={onMobileClose}
        />
      )}

      <aside className={twMerge(
        "fixed inset-y-0 left-0 z-50 flex flex-col bg-white border-r border-gray-100 transition-all duration-300 ease-in-out shadow-2xl lg:shadow-none lg:static lg:translate-x-0",
        isMobileOpen ? "translate-x-0" : "-translate-x-full",
        isDesktopCollapsed ? "w-[280px] lg:w-[76px]" : "w-[280px] lg:w-[272px]"
      )}>
        {/* Sidebar menu control */}
        <div className={twMerge(
          "flex items-center border-b border-gray-100 min-h-[72px]",
          isDesktopCollapsed ? "px-3 lg:justify-center" : "px-4 lg:px-5 lg:justify-start"
        )}>
          <button
            type="button"
            onClick={onDesktopToggle}
            aria-label={isDesktopCollapsed ? 'Развернуть меню' : 'Свернуть меню'}
            aria-expanded={!isDesktopCollapsed}
            className="hidden lg:flex h-11 items-center gap-3 rounded-xl px-3 text-gray-600 hover:bg-brand-green/10 hover:text-brand-green focus-visible:outline-2 focus-visible:outline-brand-green transition-colors"
          >
            <Menu size={22} className="shrink-0" />
            {!isDesktopCollapsed && <span className="text-sm font-semibold">Меню</span>}
          </button>
          <button type="button" onClick={onMobileClose} aria-label="Закрыть меню" className="lg:hidden flex items-center gap-3 rounded-xl p-2 text-gray-600 hover:bg-gray-100 transition-colors">
            <Menu size={20} />
            <span className="text-sm font-semibold">Меню</span>
          </button>
        </div>

        {/* Nav */}
        <nav aria-label="Основная навигация" className="flex-1 py-5 space-y-1 overflow-y-auto overflow-x-hidden px-3 relative">
          {navItems.map((item) => {
            const isActive = activeItem?.href === item.href;
            const icon = NAV_ICONS[item.label] ?? <ChevronRight size={16} />;
            
            let i18nKey = '';
            switch (item.label) {
              case 'Overview': i18nKey = 'nav.overview'; break;
              case '1C Reports': i18nKey = 'nav.oneCReports'; break;
              case 'Courses': i18nKey = 'nav.courses'; break;
              case 'My Courses': i18nKey = 'nav.myCourses'; break;
              case 'Learners': i18nKey = 'nav.learners'; break;
              case 'Students': i18nKey = 'nav.students'; break;
              case 'Curators': i18nKey = 'nav.curators'; break;
              case 'Chat': i18nKey = 'nav.chat'; break;
              case 'Employees': i18nKey = 'nav.employees'; break;
              case 'Clients': i18nKey = 'nav.clients'; break;
              case 'My Clients': i18nKey = 'nav.clients'; break;
              case 'Leads': i18nKey = 'nav.leads'; break;
              case 'Tasks': i18nKey = 'nav.tasks'; break;
              case 'My Tasks': i18nKey = 'nav.tasks'; break;
              case 'Task Pool': i18nKey = 'nav.taskPool'; break;
              case 'Archive (Done)': i18nKey = 'nav.archiveDone'; break;
              case 'Archive (Cancelled)': i18nKey = 'nav.archiveCancelled'; break;
              case 'Invoices': i18nKey = 'nav.invoices'; break;
              case 'Subscriptions': i18nKey = 'nav.subscriptions'; break;
              case 'Payment Receipts': i18nKey = 'nav.paymentReceipts'; break;
              case 'Billing & Plans': i18nKey = 'nav.billing'; break;
              case 'Audit Logs': i18nKey = 'nav.auditLogs'; break;
              case '2FA Security': i18nKey = 'nav.security'; break;
              case 'Team Workload': i18nKey = 'nav.teamWorkload'; break;
              case 'Settings': i18nKey = 'nav.settings'; break;
              case 'Notifications': i18nKey = 'nav.notifications'; break;
              case 'Calendar': i18nKey = 'nav.calendar'; break;
              case 'Documents': i18nKey = 'nav.documents'; break;
              case 'Services': i18nKey = 'nav.services'; break;
              case 'Templates': i18nKey = 'nav.templates'; break;
              default: i18nKey = item.label;
            }
            const translatedLabel = i18nKey.startsWith('nav.') ? t(i18nKey) : item.label;

            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => { if (window.innerWidth < 1024) onMobileClose(); }}
                className={twMerge(
                  "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors duration-150 group relative",
                  isActive
                    ? 'bg-brand-green/10 text-brand-green'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                  isDesktopCollapsed ? 'lg:justify-center lg:px-0' : ''
                )}
                title={isDesktopCollapsed ? translatedLabel : undefined}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className={twMerge("shrink-0", isActive ? 'text-brand-green' : 'text-gray-400 group-hover:text-brand-green')}>
                  {icon}
                </span>
                
                <span className={twMerge("flex-1 min-w-0 items-center", isDesktopCollapsed ? "flex lg:hidden" : "flex")}>
                  <>
                    <span className="flex-1 truncate">{translatedLabel}</span>
                    
                    {item.label === 'Notifications' && unreadCount > 0 && (
                      <span className="flex items-center justify-center min-w-[20px] h-5 px-1 text-[10px] font-bold text-white bg-red-500 rounded-full shadow-sm shrink-0">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}

                    {item.label === 'Chat' && unreadChatCount > 0 && (
                      <span className="flex items-center justify-center min-w-[20px] h-5 px-1 text-[10px] font-bold text-white bg-red-500 rounded-full shadow-sm shrink-0">
                        {unreadChatCount > 99 ? '99+' : unreadChatCount}
                      </span>
                    )}
                    
                  </>
                </span>

                {/* Always show dot indicator if collapsed and has notifications */}
                {isDesktopCollapsed && item.label === 'Notifications' && unreadCount > 0 && (
                  <span className="hidden lg:block absolute top-2.5 right-2 w-2 h-2 bg-red-500 rounded-full" />
                )}
                {isDesktopCollapsed && item.label === 'Chat' && unreadChatCount > 0 && (
                  <span className="hidden lg:flex absolute top-2.5 right-2 items-center justify-center min-w-[16px] h-4 px-1 text-[9px] font-bold text-white bg-blue-500 rounded-full shadow-sm">
                    {unreadChatCount > 9 ? '9+' : unreadChatCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User block */}
        <div className="p-4 border-t border-gray-100">
          <div className={twMerge("flex items-center gap-3 mb-4", isDesktopCollapsed && "lg:justify-center")}>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-green to-green-600 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
              {user.avatarUrl ? (
                <img 
                  src={getSecureImageUrl(user.avatarUrl)}
                  alt="Avatar" 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <User size={20} className="text-white" />
              )}
            </div>
            <div className={twMerge("flex-1 min-w-0", isDesktopCollapsed && "lg:hidden")}>
                <p className="text-xs font-semibold text-gray-800 truncate">{user.email}</p>
                <p className={`text-[11px] mt-0.5 truncate ${user.role === 'ADMIN' ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>{t(`sidebar.roles.${user.role}`, { defaultValue: user.role })}</p>
            </div>
          </div>
          <button
            onClick={logout}
            title={isDesktopCollapsed ? t('sidebar.logout') : undefined}
            className={twMerge(
              "flex items-center w-full rounded-xl text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors",
              isDesktopCollapsed ? "lg:justify-center lg:p-2 gap-2 px-3 py-2.5" : "gap-2 px-3 py-2.5"
            )}
          >
            <LogOut size={16} />
            <span className={isDesktopCollapsed ? 'lg:hidden' : ''}>{t('sidebar.logout')}</span>
          </button>
        </div>
      </aside>
    </>
  );
}


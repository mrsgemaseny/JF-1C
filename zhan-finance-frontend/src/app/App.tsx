import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, useEffect } from 'react';
import { lazyWithRetry as lazy } from '@/shared/lib/react/lazyWithRetry';
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary';
import { Spinner } from '@/shared/ui/Spinner';
import { ROUTES } from '@/shared/config/routes';
import { MainLayout } from './layouts/MainLayout';
const HomePage = lazy(() => import('@/pages/home/HomePage').then(m => ({ default: m.HomePage })));
const AboutPage = lazy(() => import('@/pages/about/AboutPage').then(m => ({ default: m.AboutPage })));
const ServicesPage = lazy(() => import('@/pages/services/ServicesPage').then(m => ({ default: m.ServicesPage })));
const LoginPage = lazy(() => import('@/pages/auth/login/LoginPage').then(m => ({ default: m.LoginPage })));
const ForgotPasswordPage = lazy(() => import('@/pages/auth/forgot-password/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('@/pages/auth/reset-password/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));
const RegisterPage = lazy(() => import('@/pages/auth/register/RegisterPage').then(m => ({ default: m.RegisterPage })));
const PrivacyPolicyPage = lazy(() => import('@/pages/legal/PrivacyPolicyPage').then(m => ({ default: m.PrivacyPolicyPage })));
const TermsPage = lazy(() => import('@/pages/legal/TermsPage').then(m => ({ default: m.TermsPage })));
const RefundPolicyPage = lazy(() => import('@/pages/legal/RefundPolicyPage').then(m => ({ default: m.RefundPolicyPage })));
const CookiePolicyPage = lazy(() => import('@/pages/legal/CookiePolicyPage').then(m => ({ default: m.CookiePolicyPage })));
import { CookieConsent } from '@/widgets/cookie-consent/CookieConsent';
import { AuthProvider } from '@/features/auth/AuthContext';
import { NotificationProvider } from '@/features/notifications/NotificationContext';
import { ChatNotificationProvider } from '@/features/chat/ChatNotificationContext';
import { ProtectedRoute } from '@/features/auth/ProtectedRoute';
import { RoleProtectedRoute } from '@/features/auth/RoleProtectedRoute';
import { DashboardLayout } from '@/widgets/dashboard-shell/DashboardLayout';
import { DashboardRedirect } from '@/pages/dashboard/DashboardRedirect';
const NotificationsPage = lazy(() => import('@/pages/dashboard/shared/NotificationsPage').then(m => ({ default: m.NotificationsPage })));
const SettingsPage = lazy(() => import('@/pages/dashboard/shared/settings/SettingsPage').then(m => ({ default: m.SettingsPage })));
import { ScrollToTop } from '@/shared/ui/ScrollToTop';

// Admin
const AdminOverviewPage = lazy(() => import('@/pages/dashboard/admin/AdminOverviewPage').then(m => ({ default: m.AdminOverviewPage })));
const AdminEmployeesPage = lazy(() => import('@/pages/dashboard/admin/AdminEmployeesPage').then(m => ({ default: m.AdminEmployeesPage })));
const AdminClientsPage = lazy(() => import('@/pages/dashboard/admin/AdminClientsPage').then(m => ({ default: m.AdminClientsPage })));
const AdminTasksPage = lazy(() => import('@/pages/dashboard/admin/AdminTasksPage').then(m => ({ default: m.AdminTasksPage })));
const AdminLeadsPage = lazy(() => import('@/pages/admin/leads/LeadsPage').then(m => ({ default: m.LeadsPage })));
const AdminArchiveDonePage = lazy(() => import('@/pages/dashboard/admin/AdminArchiveDonePage').then(m => ({ default: m.AdminArchiveDonePage })));
const AdminArchiveCancelledPage = lazy(() => import('@/pages/dashboard/admin/AdminArchiveCancelledPage').then(m => ({ default: m.AdminArchiveCancelledPage })));
const EmployeeChatPage = lazy(() => import('@/pages/dashboard/employee/EmployeeChatPage').then(m => ({ default: m.EmployeeChatPage })));
const AdminCoursesPage = lazy(() => import('@/pages/dashboard/admin/AdminCoursesPage').then(m => ({ default: m.AdminCoursesPage })));
const AdminCourseEditPage = lazy(() => import('@/pages/dashboard/admin/AdminCourseEditPage').then(m => ({ default: m.AdminCourseEditPage })));
const AdminLessonEditPage = lazy(() => import('@/pages/dashboard/admin/AdminLessonEditPage').then(m => ({ default: m.AdminLessonEditPage })));
const AdminLearnersPage = lazy(() => import('@/pages/dashboard/admin/AdminLearnersPage').then(m => ({ default: m.AdminLearnersPage })));
const AdminInvoicesPage = lazy(() => import('@/pages/dashboard/admin/billing/AdminInvoicesPage').then(m => ({ default: m.AdminInvoicesPage })));
const AdminSubscriptionsPage = lazy(() => import('@/pages/dashboard/admin/billing/AdminSubscriptionsPage').then(m => ({ default: m.AdminSubscriptionsPage })));
const AdminPaymentReceiptsPage = lazy(() => import('@/pages/dashboard/admin/billing/AdminPaymentReceiptsPage').then(m => ({ default: m.AdminPaymentReceiptsPage })));
const AdminAuditLogPage = lazy(() => import('@/pages/dashboard/admin/AdminAuditLogPage').then(m => ({ default: m.AdminAuditLogPage })));
const AdminTemplatesPage = lazy(() => import('@/pages/dashboard/admin/AdminTemplatesPage').then(m => ({ default: m.AdminTemplatesPage })));
const AdminCuratorsPage = lazy(() => import('@/pages/dashboard/admin/AdminCuratorsPage').then(m => ({ default: m.AdminCuratorsPage })));
const AdminSecurityPage = lazy(() => import('@/pages/admin-security/ui/AdminSecurityPage').then(m => ({ default: m.AdminSecurityPage })));

// Curator
const CuratorOverviewPage = lazy(() => import('@/pages/dashboard/curator/CuratorOverviewPage').then(m => ({ default: m.CuratorOverviewPage })));
const CuratorCoursesPage = lazy(() => import('@/pages/dashboard/curator/CuratorCoursesPage').then(m => ({ default: m.CuratorCoursesPage })));
const CuratorStudentsPage = lazy(() => import('@/pages/dashboard/curator/CuratorStudentsPage').then(m => ({ default: m.CuratorStudentsPage })));

// Advisor
const AdvisorOverviewPage = lazy(() => import('@/pages/dashboard/advisor/AdvisorOverviewPage').then(m => ({ default: m.AdvisorOverviewPage })));
const AdvisorWorkloadPage = lazy(() => import('@/pages/dashboard/advisor/AdvisorWorkloadPage').then(m => ({ default: m.AdvisorWorkloadPage })));

// Learner
const LearnerCoursesPage = lazy(() => import('@/pages/dashboard/learner/LearnerCoursesPage').then(m => ({ default: m.LearnerCoursesPage })));
const LearnerCourseDetailPage = lazy(() => import('@/pages/dashboard/learner/LearnerCourseDetailPage').then(m => ({ default: m.LearnerCourseDetailPage })));
const LearnerLessonPage = lazy(() => import('@/pages/dashboard/learner/LearnerLessonPage').then(m => ({ default: m.LearnerLessonPage })));

// Employee
const EmployeeOverviewPage = lazy(() => import('@/pages/dashboard/employee/EmployeeOverviewPage').then(m => ({ default: m.EmployeeOverviewPage })));
const EmployeeClientsPage = lazy(() => import('@/pages/dashboard/employee/EmployeeClientsPage').then(m => ({ default: m.EmployeeClientsPage })));
const EmployeeTasksPage = lazy(() => import('@/pages/dashboard/employee/EmployeeTasksPage').then(m => ({ default: m.EmployeeTasksPage })));
const EmployeeDocumentsPage = lazy(() => import('@/pages/dashboard/employee/EmployeeDocumentsPage').then(m => ({ default: m.EmployeeDocumentsPage })));

// Shared Task Details & Pool
const TaskDetailsPage = lazy(() => import('@/pages/task-details/TaskDetailsPage').then(m => ({ default: m.TaskDetailsPage })));
const TaskPoolPage = lazy(() => import('@/pages/dashboard/shared/task-pool/TaskPoolPage').then(m => ({ default: m.TaskPoolPage })));

// Client
const ClientOverviewPage = lazy(() => import('@/pages/dashboard/client/ClientOverviewPage').then(m => ({ default: m.ClientOverviewPage })));
const ClientTaskDetailsPage = lazy(() => import('@/pages/dashboard/client/ClientTaskDetailsPage').then(m => ({ default: m.ClientTaskDetailsPage })));
const ClientDocumentsPage = lazy(() => import('@/pages/dashboard/client/ClientDocumentsPage').then(m => ({ default: m.ClientDocumentsPage })));
const ClientChatPage = lazy(() => import('@/pages/dashboard/client/ClientChatPage').then(m => ({ default: m.ClientChatPage })));
const ClientServicesPage = lazy(() => import('@/pages/dashboard/client/ClientServicesPage').then(m => ({ default: m.ClientServicesPage })));
const ClientBillingPage = lazy(() => import('@/pages/dashboard/client/billing/ClientBillingPage').then(m => ({ default: m.ClientBillingPage })));
const ClientOneCReportsPage = lazy(() => import('@/pages/dashboard/client/ClientOneCReportsPage').then(m => ({ default: m.ClientOneCReportsPage })));
const CompleteProfilePage = lazy(() => import('@/pages/auth/complete-profile/CompleteProfilePage').then(m => ({ default: m.CompleteProfilePage })));
const CalendarPage = lazy(() => import('@/pages/dashboard/shared/calendar/CalendarPage').then(m => ({ default: m.CalendarPage })));
import { GoogleOAuthProvider } from '@react-oauth/google';

import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/shared/lib/queryClient';

export function App() {
  const routerBasename = typeof window !== 'undefined' && window.location.pathname.startsWith('/JF-1C') ? '/JF-1C' : '';

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      // Basic protection: only block right-click on images
      if (e.target && (e.target as HTMLElement).tagName === 'IMG') {
        e.preventDefault();
      }
    };

    const handleDragStart = (e: DragEvent) => {
      // Prevent dragging images to save them
      if (e.target && (e.target as HTMLElement).tagName === 'IMG') {
        e.preventDefault();
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('dragstart', handleDragStart);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('dragstart', handleDragStart);
    };
  }, []);

  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ""}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <NotificationProvider>
          <ChatNotificationProvider>
          <BrowserRouter basename={routerBasename}>
          <ScrollToTop />
          <CookieConsent />
          <ErrorBoundary>
          <Suspense fallback={<div className="flex h-screen items-center justify-center"><Spinner className="w-8 h-8 text-brand-green" /></div>}>
          <Routes>
            <Route element={<MainLayout />}>
              <Route path={ROUTES.HOME} element={<HomePage />} />
              <Route path={ROUTES.ABOUT} element={<AboutPage />} />
              <Route path={ROUTES.SERVICES} element={<ServicesPage />} />
              <Route path={ROUTES.PRIVACY_POLICY} element={<PrivacyPolicyPage />} />
              <Route path={ROUTES.TERMS} element={<TermsPage />} />
              <Route path={ROUTES.REFUND_POLICY} element={<RefundPolicyPage />} />
              <Route path={ROUTES.COOKIE_POLICY} element={<CookiePolicyPage />} />
            </Route>

            <Route path={ROUTES.LOGIN} element={<LoginPage />} />
            <Route path={ROUTES.LOGIN_EMPLOYEE} element={<Navigate to={ROUTES.REGISTER_EMPLOYEE} replace />} />
            <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPasswordPage />} />
            <Route path={ROUTES.RESET_PASSWORD} element={<ResetPasswordPage />} />
            <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
            <Route path={ROUTES.REGISTER_EMPLOYEE} element={<RegisterPage isEmployeeRoute={true} />} />
            <Route path={ROUTES.COMPLETE_PROFILE} element={<CompleteProfilePage />} />

            {/* Dashboard Entry Point */}
            <Route path={ROUTES.PROFILE} element={<DashboardRedirect />} />

            {/* Legacy Dashboard Route Fallback */}
            <Route path="/dashboard/*" element={<Navigate to={ROUTES.PROFILE} replace />} />

            {/* Dashboard Shell Layout */}
            <Route element={<ProtectedRoute />}>
              <Route element={<DashboardLayout />}>
              
                {/* Shared Admin & Employee Routes */}
              <Route element={<RoleProtectedRoute allow={['ADMIN', 'EMPLOYEE', 'ADVISOR']} />}>
                <Route path={ROUTES.ADMIN_LEADS} element={<AdminLeadsPage />} />
              </Route>

                {/* Admin Only Routes */}
              <Route element={<RoleProtectedRoute allow={['ADMIN']} />}>
                <Route path={ROUTES.ADMIN} element={<AdminOverviewPage />} />
                <Route path={ROUTES.ADMIN_CHAT} element={<EmployeeChatPage />} />
                <Route path={ROUTES.ADMIN_EMPLOYEES} element={<AdminEmployeesPage />} />
                <Route path={ROUTES.ADMIN_CLIENTS} element={<AdminClientsPage />} />
                <Route path={ROUTES.ADMIN_TASKS} element={<AdminTasksPage />} />
                <Route path={ROUTES.ADMIN_TASK_POOL} element={<TaskPoolPage />} />
                <Route path={ROUTES.ADMIN_ARCHIVE_DONE} element={<AdminArchiveDonePage />} />
                <Route path={ROUTES.ADMIN_ARCHIVE_CANCELLED} element={<AdminArchiveCancelledPage />} />
                <Route path={ROUTES.ADMIN_TASK_DETAILS} element={<TaskDetailsPage />} />
                <Route path={ROUTES.ADMIN_COURSES} element={<AdminCoursesPage />} />
                <Route path={ROUTES.ADMIN_COURSES_NEW} element={<AdminCourseEditPage />} />
                <Route path={ROUTES.ADMIN_COURSES_EDIT} element={<AdminCourseEditPage />} />
                <Route path={ROUTES.ADMIN_LESSON_EDIT} element={<AdminLessonEditPage />} />
                <Route path={ROUTES.ADMIN_LEARNERS} element={<AdminLearnersPage />} />
                <Route path={ROUTES.ADMIN_INVOICES} element={<AdminInvoicesPage />} />
                <Route path={ROUTES.ADMIN_SUBSCRIPTIONS} element={<AdminSubscriptionsPage />} />
                <Route path={ROUTES.ADMIN_PAYMENT_RECEIPTS} element={<AdminPaymentReceiptsPage />} />
                <Route path={ROUTES.ADMIN_AUDIT_LOGS} element={<AdminAuditLogPage />} />
                <Route path={ROUTES.ADMIN_TEMPLATES} element={<AdminTemplatesPage />} />
                <Route path={ROUTES.ADMIN_CURATORS} element={<AdminCuratorsPage />} />
                <Route path={ROUTES.ADMIN_SECURITY} element={<AdminSecurityPage />} />
              </Route>

              {/* Curator Routes */}
              <Route element={<RoleProtectedRoute allow={['CURATOR']} />}>
                <Route path={ROUTES.CURATOR} element={<CuratorOverviewPage />} />
                <Route path={ROUTES.CURATOR_COURSES} element={<CuratorCoursesPage />} />
                <Route path={ROUTES.CURATOR_STUDENTS} element={<CuratorStudentsPage />} />
              </Route>

              {/* Advisor Portal Routes */}
              <Route element={<RoleProtectedRoute allow={['ADVISOR']} />}>
                <Route path={ROUTES.ADVISOR} element={<AdvisorOverviewPage />} />
                <Route path={ROUTES.ADVISOR_WORKLOAD} element={<AdvisorWorkloadPage />} />
                <Route path={ROUTES.ADVISOR_CLIENTS} element={<EmployeeClientsPage />} />
                <Route path={ROUTES.ADVISOR_TASKS} element={<EmployeeTasksPage />} />
                <Route path={ROUTES.ADVISOR_TASK_POOL} element={<TaskPoolPage />} />
                <Route path={ROUTES.ADVISOR_TASK_DETAILS} element={<TaskDetailsPage />} />
                <Route path={ROUTES.ADVISOR_DOCUMENTS} element={<EmployeeDocumentsPage />} />
                <Route path={ROUTES.ADVISOR_CHAT} element={<EmployeeChatPage />} />
              </Route>

              {/* Employee Routes */}
              <Route element={<RoleProtectedRoute allow={['EMPLOYEE']} />}>
                <Route path={ROUTES.EMPLOYEE} element={<EmployeeOverviewPage />} />
                <Route path={ROUTES.EMPLOYEE_CHAT} element={<EmployeeChatPage />} />
                <Route path={ROUTES.EMPLOYEE_CLIENTS} element={<EmployeeClientsPage />} />
                <Route path={ROUTES.EMPLOYEE_TASKS} element={<EmployeeTasksPage />} />
                <Route path="/employee/tasks/pool" element={<TaskPoolPage />} />
                <Route path={ROUTES.EMPLOYEE_TASK_DETAILS} element={<TaskDetailsPage />} />
                <Route path={ROUTES.EMPLOYEE_DOCUMENTS} element={<EmployeeDocumentsPage />} />
                <Route path={ROUTES.EMPLOYEE_CALENDAR} element={<CalendarPage />} />
              </Route>

              {/* Client Routes */}
              <Route element={<RoleProtectedRoute allow={['CLIENT']} />}>
                <Route path={ROUTES.CLIENT} element={<ClientOverviewPage />} />
                <Route path={ROUTES.CLIENT_BILLING} element={<ClientBillingPage />} />
                <Route path={ROUTES.CLIENT_TASK_DETAILS} element={<ClientTaskDetailsPage />} />
                <Route path={ROUTES.CLIENT_CHAT} element={<ClientChatPage />} />
                <Route path={ROUTES.CLIENT_DOCUMENTS} element={<ClientDocumentsPage />} />
                <Route path={ROUTES.CLIENT_CALENDAR} element={<CalendarPage />} />
                <Route path={ROUTES.CLIENT_SERVICES} element={<ClientServicesPage />} />
                <Route path={ROUTES.CLIENT_1C} element={<ClientOneCReportsPage />} />
                <Route path={ROUTES.CLIENT_1C_REPORT} element={<ClientOneCReportsPage />} />
                <Route path={ROUTES.CLIENT_1C_REPORTS} element={<Navigate to={ROUTES.CLIENT_1C} replace />} />
                <Route path={ROUTES.CLIENT_REPORTS} element={<Navigate to={ROUTES.CLIENT_1C} replace />} />
              </Route>

              {/* Learner Routes */}
              <Route element={<RoleProtectedRoute allow={['LEARNER']} />}>
                <Route path={ROUTES.LEARNER_COURSES} element={<LearnerCoursesPage />} />
                <Route path={ROUTES.LEARNER_COURSE_DETAILS} element={<LearnerCourseDetailPage />} />
                <Route path={ROUTES.LEARNER_LESSON} element={<LearnerLessonPage />} />
              </Route>
              
              {/* Shared Routes for non-learner authenticated users */}
              <Route element={<RoleProtectedRoute allow={['ADMIN', 'EMPLOYEE', 'CLIENT', 'CURATOR', 'ADVISOR']} />}>
                <Route path={ROUTES.NOTIFICATIONS} element={<NotificationsPage />} />
                <Route path={ROUTES.SETTINGS} element={<SettingsPage />} />
              </Route>
                
              </Route>
            </Route>
            {/* Fallback Route */}
            <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
          </Routes>
          </Suspense>
          </ErrorBoundary>
        </BrowserRouter>
        </ChatNotificationProvider>
      </NotificationProvider>
    </AuthProvider>
    </QueryClientProvider>
    </GoogleOAuthProvider>
  );
}
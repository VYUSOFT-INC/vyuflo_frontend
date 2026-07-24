import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuthStore }      from './store/authStore';
import { getUiSession }      from './utils/uiSession';
import { getDashboardRoute } from './utils/navigation';
// ── theme ────────────────────────────────────────────────────────────────────
import { ThemeProvider } from './theme/ThemeProvider';
// ── layouts ──────────────────────────────────────────────────────────────────
import { DashboardLayout } from './components/layout/DashboardLayout';
// ── public pages ─────────────────────────────────────────────────────────────
import Login            from './pages/public/Login';
import ForgotPassword   from './pages/public/ForgotPassword';
import Signup           from './pages/public/Signup';
import ResetPasswordOTP from './pages/public/Resetpasswordotp';
import ResetPasswordNew from './pages/public/ResetPasswordNew';
import LinkedInCallback from './pages/public/LinkedInCallback';
import VisaChecklist    from './pages/public/VisaChecklist';
// ── onboarding ───────────────────────────────────────────────────────────────
import VerifyEmailPage  from './pages/signup/VerifyEmailPage';
import ProfileSetupPage from './pages/signup/ProfileSetupPage';
// ── employee pages ───────────────────────────────────────────────────────────
import Dashboard             from './pages/employee/Dashboard';
import ApplicationsList      from './pages/employee/ApplicationsList';
import NewApplication        from './pages/employee/NewApplication';
import ApplicationDetail     from './pages/employee/ApplicationDetail';
import DocumentHub           from './pages/employee/DocumentHub';
import DocumentUploadV2      from './pages/employee/DocumentUpload';
import DocumentViewer        from './pages/employee/DocumentViewer';
import SecureMessaging       from './pages/employee/SecureMessaging';
import NotificationsCenterV2 from './pages/employee/NotificationsCenterV2';
import ProfileSecurity       from './pages/employee/ProfileSecurity';
import PaymentsScreen        from './pages/employee/PaymentsScreen';
import SelectAttorney        from './pages/employee/SelectAttorney';
import BookConsultation      from './pages/employee/BookConsultation';
// ── hr pages ──────────────────────────────────────────────────────────────────
import HRDashboard      from './pages/hr/HRDashboard';
import HREmployees      from './pages/hr/HREmployees';
import HRInviteEmployee from './pages/hr/HRInviteEmployees';
import HREmployeeDetail from './pages/hr/HREmployeeDetail';
import HRCreateCase from './pages/hr/HRCreateCase';
import HRCasesList from './pages/hr/HRCasesList';
import HRCaseDetail from './pages/hr/HRCaseDetail';
import HRMessages from './pages/hr/HRMessages';
import HRDeadlines from './pages/hr/HRDeadlines';
import HRApprovalQueue from './pages/hr/HRApprovalQueue';
import HRDocumentManagement from './pages/hr/HRDocumentManagement';
import HRNotificationsCenter from './pages/hr/HRNotificationsCenter';
// ── admin pages ──────────────────────────────────────────────────────────────
import AdminDashboard         from './pages/admin/AdminDashboard';
import UserManagement         from './pages/admin/UserManagement';
import RevenueDashboard       from './pages/admin/RevenueDashboard';
import AllTransactions        from './pages/admin/AllTransactions';
import RolesPermissions       from './pages/admin/Roles&permissions';
import SystemSettings         from './pages/admin/SystemSettings';
import NotificationTemplates  from './pages/admin/NotificationTemplates';
import VisaTypesManager       from './pages/admin/VisaTypesManager';
import SystemAuditLogs        from './pages/admin/SystemAuditLogs';
import SubscriptionPricing    from './pages/admin/SubscriptionPricing';
import AdminHelpSupport       from './pages/admin/HelpSupport';
// ── lawyer (attorney) pages ──────────────────────────────────────────────────
import IntakeLanding      from './pages/lawyer/intake/IntakeLanding';
import IntakeWizard       from './pages/lawyer/intake/IntakeWizard';
import ClientIntakePortal from './pages/lawyer/intake/ClientIntakePortal';
import DocumentQueue      from './pages/lawyer/documents/DocumentQueue';
import DocumentReviewPage from './pages/lawyer/documents/DocumentReviewPage';
import CalendarPage       from './pages/lawyer/calendar/CalendarPage';
import ClientProfilePage  from './pages/lawyer/clients/ClientProfilePage';
import AnalyticsPage      from './pages/lawyer/analytics/AnalyticsPage';
import BillingDashboard    from './pages/lawyer/billing/BillingDashboard';
import InvoicesList        from './pages/lawyer/billing/InvoicesList';
import InvoiceDetail       from './pages/lawyer/billing/InvoiceDetail';
import BillingClientsList  from './pages/lawyer/billing/BillingClientsList';
import HelpHome           from './pages/lawyer/help/HelpHome';
import ArticleDetail      from './pages/lawyer/help/ArticleDetail';
import MyTickets          from './pages/lawyer/help/MyTickets';
import TicketDetail       from './pages/lawyer/help/TicketDetail';
import HelpNotifications  from './pages/lawyer/help/HelpNotifications';
import LawyerMessagesPage from './pages/employee/SecureMessaging';
import TemplateLibraryPage from './pages/lawyer/templates/TemplateLibraryPage';
import NotificationsRemindersPage from './pages/lawyer/notifications/NotificationsRemindersPage';
import LawyerSettingsPage from './pages/lawyer/settings/LawyerSettingsPage';
import CaseListPage       from './pages/lawyer/cases/CaseListPage';
import CaseDetailPage     from './pages/lawyer/cases/CaseDetailPage';
import LawyerDashboardPage from './pages/lawyer/dashboard/LawyerDashboardPage';

// ─────────────────────────────────────────────────────────────────────────────
// Guards
// ─────────────────────────────────────────────────────────────────────────────

function PublicRoute() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  if (isAuthenticated) {
    const session = getUiSession();
    return <Navigate to={getDashboardRoute(session?.roles?.[0] ?? '')} replace />;
  }
  return <Outlet />;
}

function OnboardingRoute() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
}

function RoleRoute({ allowedRoles }: { allowedRoles: string[] }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  const session  = getUiSession();
  const userRole = session?.roles?.[0] ?? '';
  if (!allowedRoles.includes(userRole)) {
    return <Navigate to={getDashboardRoute(userRole)} replace />;
  }
  return <Outlet />;
}

// ─────────────────────────────────────────────────────────────────────────────
// App
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const session    = getUiSession();
  const themeColor = (session as { theme_color?: string | null } | null)?.theme_color ?? null;
  alert("This is a test");

  return (
    <ThemeProvider color={themeColor}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* ── Public (unauthenticated only) ──────────────────────────────── */}
          <Route element={<PublicRoute />}>
            <Route path="/login"           element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
          </Route>

          {/* ── Signup ─────────────────────────────────────────────────────── */}
          <Route path="/signup" element={<Signup />} />

          {/* ── Onboarding (token required, no role check) ──────────────────── */}
          <Route element={<OnboardingRoute />}>
            <Route path="/signup/verify-email"  element={<VerifyEmailPage />} />
            <Route path="/signup/profile-setup" element={<ProfileSetupPage />} />
          </Route>

          {/* ── Password reset & OAuth callbacks ────────────────────────────── */}
          <Route path="/forgot-password/verify-otp"   element={<ResetPasswordOTP />} />
          <Route path="/forgot-password/new-password" element={<ResetPasswordNew />} />
          <Route path="/auth/linkedin/callback"       element={<LinkedInCallback />} />

          {/* ── Client Intake Portal (PUBLIC — token-based) ─────────────────── */}
          <Route path="/intake/:token" element={<ClientIntakePortal />} />

          {/* ── SHARED — Visa Checklist ──────────────────────────────────────── */}
          <Route element={<RoleRoute allowedRoles={['employee', 'hr', 'attorney']} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/visa-checklist" element={<VisaChecklist />} />
            </Route>
          </Route>

          {/* ── EMPLOYEE routes ─────────────────────────────────────────────── */}
          <Route element={<RoleRoute allowedRoles={['employee']} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard"                        element={<Dashboard />} />
              <Route path="/applications/list"                element={<ApplicationsList />} />
              <Route path="/applications/new"                 element={<NewApplication />} />
              <Route path="/applications/:id"                 element={<ApplicationDetail />} />
              <Route path="/documents"                        element={<DocumentHub />} />
              <Route path="/documents/upload"                 element={<DocumentUploadV2 />} />
              <Route path="/documents/viewer"                 element={<DocumentViewer />} />
              <Route path="/messages"                         element={<SecureMessaging />} />
              <Route path="/notifications"                    element={<NotificationsCenterV2 />} />
              <Route path="/payments"                         element={<PaymentsScreen />} />
              <Route path="/consultations"                    element={<SelectAttorney />} />
              <Route path="/consultations/book/:attorneyId"   element={<BookConsultation />} />
              <Route path="/profile"                          element={<ProfileSecurity />} />
              <Route path="/profile/authentication"           element={<ProfileSecurity />} />
              <Route path="/profile/mfa"                      element={<ProfileSecurity />} />
              <Route path="/profile/login-history"            element={<ProfileSecurity />} />
              <Route path="/profile/privacy"                  element={<ProfileSecurity />} />
              <Route path="/profile/devices"                  element={<ProfileSecurity />} />
              <Route path="/profile/session"                  element={<ProfileSecurity />} />
              <Route path="/profile/security-alerts"          element={<ProfileSecurity />} />
              <Route path="/profile/notifications"            element={<ProfileSecurity />} />
            </Route>
          </Route>

          {/* ── HR / EMPLOYER routes ────────────────────────────────────────── */}
          <Route element={<RoleRoute allowedRoles={['hr']} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/employer/dashboard"                    element={<HRDashboard />} />
              <Route path="/employer/employees"                    element={<HREmployees />} />
              <Route path="/employer/invite"                       element={<HRInviteEmployee />} />
              <Route path="/employer/employees/:employeeLinkId"    element={<HREmployeeDetail />} />
              <Route path="/employer/cases"                        element={<HRCasesList />} />
              <Route path="/employer/cases/new"                    element={<HRCreateCase />} />
              <Route path="/employer/cases/:applicationId"         element={<HRCaseDetail />} />
              <Route path="/employer/messages"                     element={<HRMessages />} />
              <Route path="/employer/deadlines"                    element={<HRDeadlines />} />
              <Route path="/employer/approvals"                    element={<HRApprovalQueue />} />
              <Route path="/employer/documents/:applicationId"     element={<HRDocumentManagement />} />
              <Route path="/employer/notifications"                element={<HRNotificationsCenter />} />
              <Route path="/employer/profile"                      element={<ProfileSecurity />} />
              <Route path="/employer/profile/authentication"       element={<ProfileSecurity />} />
              <Route path="/employer/profile/mfa"                  element={<ProfileSecurity />} />
              <Route path="/employer/profile/login-history"        element={<ProfileSecurity />} />
              <Route path="/employer/profile/privacy"              element={<ProfileSecurity />} />
              <Route path="/employer/profile/devices"              element={<ProfileSecurity />} />
              <Route path="/employer/profile/session"              element={<ProfileSecurity />} />
              <Route path="/employer/profile/security-alerts"      element={<ProfileSecurity />} />
              <Route path="/employer/profile/notifications"        element={<ProfileSecurity />} />
              <Route path="/profile"                               element={<ProfileSecurity />} />
            </Route>
          </Route>

          {/* ── ADMIN routes ────────────────────────────────────────────────── */}
          <Route element={<RoleRoute allowedRoles={['app_admin']} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/admin/dashboard"                      element={<AdminDashboard />} />
              <Route path="/admin/users"                          element={<UserManagement />} />
              <Route path="/admin/revenue-dashboard"              element={<RevenueDashboard />} />
              <Route path="/admin/revenue-dashboard/transactions" element={<AllTransactions />} />
              <Route path="/admin/roles-permissions"              element={<RolesPermissions />} />
              <Route path="/admin/settings"                       element={<SystemSettings />} />
              <Route path="/admin/notification-templates"         element={<NotificationTemplates />} />
              <Route path="/admin/visa-types"                     element={<VisaTypesManager />} />
              <Route path="/admin/system-audit-logs"              element={<SystemAuditLogs />} />
              <Route path="/admin/subscription-pricing"           element={<SubscriptionPricing />} />
              <Route path="/admin/help-support"                   element={<AdminHelpSupport />} />
            </Route>
          </Route>

          {/* ── ATTORNEY (LAWYER) routes ────────────────────────────────────── */}
          <Route element={<RoleRoute allowedRoles={['attorney']} />}>
            <Route path="/lawyer" element={<Navigate to="/lawyer/dashboard" replace />} />
            <Route element={<DashboardLayout />}>
              <Route path="/lawyer/dashboard"                    element={<LawyerDashboardPage />} />
              <Route path="/lawyer/intake"                       element={<IntakeLanding />} />
              <Route path="/lawyer/cases"                        element={<CaseListPage />} />
              <Route path="/lawyer/cases/:caseId"                element={<CaseDetailPage />} />
              <Route path="/lawyer/documents"                    element={<Navigate to="/lawyer/documents/queue" replace />} />
              <Route path="/lawyer/documents/queue"              element={<DocumentQueue />} />
              <Route path="/lawyer/documents/:documentId/review" element={<DocumentReviewPage />} />
              <Route path="/lawyer/calendar"                     element={<CalendarPage />} />
              <Route path="/lawyer/clients/:clientId"            element={<ClientProfilePage />} />
              <Route path="/lawyer/analytics"                    element={<AnalyticsPage />} />
              <Route path="/lawyer/billing"                      element={<BillingDashboard />} />
              <Route path="/lawyer/billing/invoices"             element={<InvoicesList />} />
              <Route path="/lawyer/billing/invoices/:id"         element={<InvoiceDetail />} />
              <Route path="/lawyer/billing/clients"              element={<BillingClientsList />} />
              <Route path="/lawyer/help"                         element={<HelpHome />} />
              <Route path="/lawyer/help/articles/:id"            element={<ArticleDetail />} />
              <Route path="/lawyer/help/tickets"                 element={<MyTickets />} />
              <Route path="/lawyer/help/tickets/:id"             element={<TicketDetail />} />
              <Route path="/lawyer/help/notifications"           element={<HelpNotifications />} />
              <Route path="/lawyer/messages"                     element={<LawyerMessagesPage />} />
              <Route path="/lawyer/templates"                    element={<TemplateLibraryPage />} />
              <Route path="/lawyer/notifications"                element={<NotificationsRemindersPage />} />
              <Route path="/lawyer/settings"                     element={<LawyerSettingsPage />} />
            </Route>
            <Route path="/lawyer/intake/:sessionId" element={<IntakeWizard />} />
          </Route>

          {/* ── Catch-all ────────────────────────────────────────────────────── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
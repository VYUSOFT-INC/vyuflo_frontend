import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuthStore }      from './store/authStore';
import { getUiSession }      from './utils/uiSession';
import { getDashboardRoute } from './utils/navigation';
// ── theme ────────────────────────────────────────────────────────────────────
import { ThemeProvider } from './theme/ThemeProvider';
// ── layouts ──────────────────────────────────────────────────────────────────
import { DashboardLayout } from './components/layout/DashboardLayout';
// ── ui ───────────────────────────────────────────────────────────────────────
import { Spinner } from './components/ui/Spinner';
// ── public pages (lazy) ──────────────────────────────────────────────────────
const Login            = lazy(() => import('./pages/public/Login'));
const ForgotPassword   = lazy(() => import('./pages/public/ForgotPassword'));
const Signup           = lazy(() => import('./pages/public/Signup'));
const ResetPasswordOTP = lazy(() => import('./pages/public/Resetpasswordotp'));
const ResetPasswordNew = lazy(() => import('./pages/public/ResetPasswordNew'));
const LinkedInCallback = lazy(() => import('./pages/public/LinkedInCallback'));
const VisaChecklist    = lazy(() => import('./pages/public/VisaChecklist'));
// ── onboarding (lazy) ────────────────────────────────────────────────────────
const VerifyEmailPage  = lazy(() => import('./pages/signup/VerifyEmailPage'));
const ProfileSetupPage = lazy(() => import('./pages/signup/ProfileSetupPage'));
// ── employee pages (lazy) ────────────────────────────────────────────────────
const Dashboard             = lazy(() => import('./pages/employee/Dashboard'));
const ApplicationsList      = lazy(() => import('./pages/employee/ApplicationsList'));
const NewApplication        = lazy(() => import('./pages/employee/NewApplication'));
const ApplicationDetail     = lazy(() => import('./pages/employee/ApplicationDetail'));
const DocumentHub           = lazy(() => import('./pages/employee/DocumentHub'));
const DocumentUploadV2      = lazy(() => import('./pages/employee/DocumentUpload'));
const DocumentViewer        = lazy(() => import('./pages/employee/DocumentViewer'));
const SecureMessaging       = lazy(() => import('./pages/employee/SecureMessaging'));
const NotificationsCenterV2 = lazy(() => import('./pages/employee/NotificationsCenterV2'));
const ProfileSecurity       = lazy(() => import('./pages/employee/ProfileSecurity'));
const PaymentsScreen        = lazy(() => import('./pages/employee/PaymentsScreen'));
const SelectAttorney        = lazy(() => import('./pages/employee/SelectAttorney'));
const BookConsultation      = lazy(() => import('./pages/employee/BookConsultation'));
// ── hr pages (lazy) ──────────────────────────────────────────────────────────
const HRDashboard      = lazy(() => import('./pages/hr/HRDashboard'));
const HREmployees      = lazy(() => import('./pages/hr/HREmployees'));
const HRInviteEmployee = lazy(() => import('./pages/hr/HRInviteEmployees'));
const HREmployeeDetail = lazy(() => import('./pages/hr/HREmployeeDetail'));
const HRCreateCase = lazy(() => import('./pages/hr/HRCreateCase'));
const HRCasesList = lazy(() => import('./pages/hr/HRCasesList'));
const HRCaseDetail = lazy(() => import('./pages/hr/HRCaseDetail'));
const HRMessages = lazy(() => import('./pages/hr/HRMessages'));
const HRDeadlines = lazy(() => import('./pages/hr/HRDeadlines'));
const HRApprovalQueue = lazy(() => import('./pages/hr/HRApprovalQueue'));
const HRDocumentManagement = lazy(() => import('./pages/hr/HRDocumentManagement'));
const HRNotificationsCenter = lazy(() => import('./pages/hr/HRNotificationsCenter'));
// ── admin pages (lazy) ───────────────────────────────────────────────────────
const AdminDashboard         = lazy(() => import('./pages/admin/AdminDashboard'));
const UserManagement         = lazy(() => import('./pages/admin/UserManagement'));
const RevenueDashboard       = lazy(() => import('./pages/admin/RevenueDashboard'));
const AllTransactions        = lazy(() => import('./pages/admin/AllTransactions'));
const RolesPermissions       = lazy(() => import('./pages/admin/Roles&permissions'));
const SystemSettings         = lazy(() => import('./pages/admin/SystemSettings'));
const NotificationTemplates  = lazy(() => import('./pages/admin/NotificationTemplates'));
const VisaTypesManager       = lazy(() => import('./pages/admin/VisaTypesManager'));
const SystemAuditLogs        = lazy(() => import('./pages/admin/SystemAuditLogs'));
const SubscriptionPricing    = lazy(() => import('./pages/admin/SubscriptionPricing'));
const AdminHelpSupport       = lazy(() => import('./pages/admin/HelpSupport'));
// ── lawyer (attorney) pages (lazy) ───────────────────────────────────────────
const IntakeLanding      = lazy(() => import('./pages/lawyer/intake/IntakeLanding'));
const IntakeWizard       = lazy(() => import('./pages/lawyer/intake/IntakeWizard'));
const ClientIntakePortal = lazy(() => import('./pages/lawyer/intake/ClientIntakePortal'));
const DocumentQueue      = lazy(() => import('./pages/lawyer/documents/DocumentQueue'));
const DocumentReviewPage = lazy(() => import('./pages/lawyer/documents/DocumentReviewPage'));
const CalendarPage       = lazy(() => import('./pages/lawyer/calendar/CalendarPage'));
const ClientProfilePage  = lazy(() => import('./pages/lawyer/clients/ClientProfilePage'));
const AnalyticsPage      = lazy(() => import('./pages/lawyer/analytics/AnalyticsPage'));
const BillingDashboard    = lazy(() => import('./pages/lawyer/billing/BillingDashboard'));
const InvoicesList        = lazy(() => import('./pages/lawyer/billing/InvoicesList'));
const InvoiceDetail       = lazy(() => import('./pages/lawyer/billing/InvoiceDetail'));
const BillingClientsList  = lazy(() => import('./pages/lawyer/billing/BillingClientsList'));
const HelpHome           = lazy(() => import('./pages/lawyer/help/HelpHome'));
const ArticleDetail      = lazy(() => import('./pages/lawyer/help/ArticleDetail'));
const MyTickets          = lazy(() => import('./pages/lawyer/help/MyTickets'));
const TicketDetail       = lazy(() => import('./pages/lawyer/help/TicketDetail'));
const HelpNotifications  = lazy(() => import('./pages/lawyer/help/HelpNotifications'));
const LawyerMessagesPage = lazy(() => import('./pages/employee/SecureMessaging'));
const TemplateLibraryPage = lazy(() => import('./pages/lawyer/templates/TemplateLibraryPage'));
const NotificationsRemindersPage = lazy(() => import('./pages/lawyer/notifications/NotificationsRemindersPage'));
const LawyerSettingsPage = lazy(() => import('./pages/lawyer/settings/LawyerSettingsPage'));
const CaseListPage       = lazy(() => import('./pages/lawyer/cases/CaseListPage'));
const CaseDetailPage     = lazy(() => import('./pages/lawyer/cases/CaseDetailPage'));
const LawyerDashboardPage = lazy(() => import('./pages/lawyer/dashboard/LawyerDashboardPage'));

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

/**
 * PageFallback — full-screen spinner shown while a lazy route chunk loads.
 */
function PageFallback() {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// App
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const session    = getUiSession();
  const themeColor = (session as { theme_color?: string | null } | null)?.theme_color ?? null;

  return (
    <ThemeProvider color={themeColor}>
      <BrowserRouter>
        <Suspense fallback={<PageFallback />}>
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
        </Suspense>
      </BrowserRouter>
    </ThemeProvider>
  );
}

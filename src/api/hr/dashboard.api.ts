// // src/api/hr/dashboard.api.ts
// // import axiosInstance from '../axios';
// import type { HRDashboardData } from '../../types/hr/dashboard.types';

// // export const dashboardApi = {
//   /**
//    * GET /employer/dashboard
//    * Single-payload dashboard for the logged-in HR user's company.
//    * Server scopes by employer_id; no query params.
//    */
// //   get: async (): Promise<HRDashboardData> => {
// //     const res = await axiosInstance.get('/employer/dashboard');
// //     return res.data;
// //   },
// // };

// // ─────────────────────────────────────────────────────────────────────────────
// // MOCK — replace `employeesApi` block with the commented version above when the
// // backend is ready. The mock matches the screenshot 1:1 so the screen demos
// // fully against fixture data.
// // ─────────────────────────────────────────────────────────────────────────────

// export const dashboardApi = {
//   get: async (): Promise<HRDashboardData> => ({
//     stats: {
//       total_employees:        1248, total_employees_delta:  4.2,
//       active_visas:            983, active_visas_delta:     2.8,
//       expiring_soon:            47, expiring_soon_delta:   11.9,
//       pending_renewals:         31, pending_renewals_delta: 0.0,
//     },

//     compliance: {
//       score: 87, label: 'Good Standing', period: 'JUN 2025',
//       needs_action_count: 47, active_compliant: 983,
//       expiring_under_30: 18, expiring_30_90: 29,
//     },

//     expiring: [
//       { id: '1', employee_id: 'EMP0041', employee_name: 'Marcus Rivera',  employee_code: 'EMP-0041', avatar_url: null,
//         department: 'Engineering', visa_code: 'H-1B', visa_label: 'Work',
//         expiry_date: '2025-07-08', days_left: 12, urgency: 'critical', status: 'renewal_pending', action: 'renew' },
//       { id: '2', employee_id: 'EMP0087', employee_name: 'Priya Nair',     employee_code: 'EMP-0087', avatar_url: null,
//         department: 'Product', visa_code: 'O-1', visa_label: 'Talent',
//         expiry_date: '2025-07-15', days_left: 19, urgency: 'critical', status: 'docs_needed', action: 'renew' },
//       { id: '3', employee_id: 'EMP0033', employee_name: 'James Okafor',   employee_code: 'EMP-0033', avatar_url: null,
//         department: 'Finance', visa_code: 'L-1', visa_label: 'Transfer',
//         expiry_date: '2025-08-02', days_left: 37, urgency: 'warning', status: 'in_progress', action: 'review' },
//       { id: '4', employee_id: 'EMP0259', employee_name: 'Aisha Mensah',   employee_code: 'EMP-0259', avatar_url: null,
//         department: 'Marketing', visa_code: 'TN', visa_label: 'Status',
//         expiry_date: '2025-08-18', days_left: 54, urgency: 'warning', status: 'active', action: 'review' },
//       { id: '5', employee_id: 'EMP0012', employee_name: 'Tom Harrington', employee_code: 'EMP-0012', avatar_url: null,
//         department: 'Design', visa_code: 'E-3', visa_label: 'Specialty',
//         expiry_date: '2025-09-05', days_left: 71, urgency: 'upcoming', status: 'active', action: 'monitor' },
//       { id: '6', employee_id: 'EMP0078', employee_name: 'Daniel Kim',     employee_code: 'EMP-0078', avatar_url: null,
//         department: 'Operations', visa_code: 'H-1B', visa_label: 'Work',
//         expiry_date: '2025-09-22', days_left: 88, urgency: 'upcoming', status: 'active', action: 'monitor' },
//     ],

//     activity: [
//       { id: '1', type: 'visa_approved',     title: 'Visa Approved',
//         description: "Emma Clarke's H-1B petition approved by USCIS.",
//         created_at: new Date(Date.now() -    2 * 3_600_000).toISOString() },
//       { id: '2', type: 'expiry_alert',      title: 'Expiry Alert Sent',
//         description: 'Auto-reminder sent to Marcus Rivera (12 days).',
//         created_at: new Date(Date.now() -    5 * 3_600_000).toISOString() },
//       { id: '3', type: 'documents_uploaded',title: 'Documents Uploaded',
//         description: 'Priya Nair uploaded 3 renewal documents.',
//         created_at: new Date(Date.now() -   18 * 3_600_000).toISOString() },
//       { id: '4', type: 'renewal_initiated', title: 'Renewal Initiated',
//         description: 'L-1 Transfer renewal started for James Okafor.',
//         created_at: new Date(Date.now() -   24 * 3_600_000).toISOString() },
//       { id: '5', type: 'employee_added',    title: 'New Employee Added',
//         description: 'Sofia Reyes onboarded — E-3 visa profile created.',
//         created_at: new Date(Date.now() -   72 * 3_600_000).toISOString() },
//       { id: '6', type: 'interview_scheduled', title: 'Interview Scheduled',
//         description: 'H-1B interview booked for Daniel Kim — Jul 2.',
//         created_at: new Date(Date.now() -   96 * 3_600_000).toISOString() },
//       { id: '7', type: 'application_rejected', title: 'Application Rejected',
//         description: "Carlos Vega's O-1 extension denied; appeal filed.",
//         created_at: new Date(Date.now() -  120 * 3_600_000).toISOString() },
//     ],

//     timeline: [
//       { month: 'Jul 2025', critical:  8, warning:  5, upcoming:  3 },
//       { month: 'Aug 2025', critical:  6, warning: 12, upcoming:  9 },
//       { month: 'Sep 2025', critical:  3, warning:  7, upcoming: 11 },
//       { month: 'Oct 2025', critical:  4, warning:  9, upcoming: 13 },
//       { month: 'Nov 2025', critical:  2, warning:  6, upcoming: 15 },
//       { month: 'Dec 2025', critical:  1, warning:  4, upcoming: 17 },
//     ],
//   }),
// };

// // ── Named export (matches the import the hook already uses) ───────────────────
// export const getHRDashboard = (): Promise<HRDashboardData> => dashboardApi.get();


// src/api/hr/dashboard.api.ts
// import axiosInstance from '../axios';
import type { HRDashboardData } from '../../types/hr/dashboard.types';

// export const dashboardApi = {
//   get: async (): Promise<HRDashboardData> => {
//     const res = await axiosInstance.get('/employer/dashboard');
//     return res.data;
//   },
// };

// ─────────────────────────────────────────────────────────────────────────────
// MOCK — swap with the commented block above when the backend is ready.
// ─────────────────────────────────────────────────────────────────────────────

export const dashboardApi = {
  get: async (): Promise<HRDashboardData> => ({

    // ── KPI Stats ───────────────────────────────────────────────────────
    stats: {
      total_employees: 1248, total_employees_delta: 4.2,
      active_visas:     983, active_visas_delta:    2.8,
      expiring_soon:     47, expiring_soon_delta:  11.9,
      pending_renewals:  31, pending_renewals_delta: 0.0,
    },

    // ── Compliance Score (Donut — Chart 1) ──────────────────────────────
    compliance: {
      score: 87, label: 'Good Standing', period: 'JUN 2025',
      needs_action_count: 47, active_compliant: 983,
      expiring_under_30: 18, expiring_30_90: 29,
    },

    // ── Expiring Visas Table ────────────────────────────────────────────
    expiring: [
      { id: '1', employee_id: 'EMP0041', employee_name: 'Marcus Rivera',  employee_code: 'EMP-0041', avatar_url: null,
        department: 'Engineering', visa_code: 'H-1B', visa_label: 'Work',
        expiry_date: '2025-07-08', days_left: 12, urgency: 'critical', status: 'renewal_pending', action: 'renew' },
      { id: '2', employee_id: 'EMP0087', employee_name: 'Priya Nair',     employee_code: 'EMP-0087', avatar_url: null,
        department: 'Product', visa_code: 'O-1', visa_label: 'Talent',
        expiry_date: '2025-07-15', days_left: 19, urgency: 'critical', status: 'docs_needed', action: 'renew' },
      { id: '3', employee_id: 'EMP0033', employee_name: 'James Okafor',   employee_code: 'EMP-0033', avatar_url: null,
        department: 'Finance', visa_code: 'L-1', visa_label: 'Transfer',
        expiry_date: '2025-08-02', days_left: 37, urgency: 'warning', status: 'in_progress', action: 'review' },
      { id: '4', employee_id: 'EMP0259', employee_name: 'Aisha Mensah',   employee_code: 'EMP-0259', avatar_url: null,
        department: 'Marketing', visa_code: 'TN', visa_label: 'Status',
        expiry_date: '2025-08-18', days_left: 54, urgency: 'warning', status: 'active', action: 'review' },
      { id: '5', employee_id: 'EMP0012', employee_name: 'Tom Harrington', employee_code: 'EMP-0012', avatar_url: null,
        department: 'Design', visa_code: 'E-3', visa_label: 'Specialty',
        expiry_date: '2025-09-05', days_left: 71, urgency: 'upcoming', status: 'active', action: 'monitor' },
      { id: '6', employee_id: 'EMP0078', employee_name: 'Daniel Kim',     employee_code: 'EMP-0078', avatar_url: null,
        department: 'Operations', visa_code: 'H-1B', visa_label: 'Work',
        expiry_date: '2025-09-22', days_left: 88, urgency: 'upcoming', status: 'active', action: 'monitor' },
    ],

    // ── Activity Feed ───────────────────────────────────────────────────
    activity: [
      { id: '1', type: 'visa_approved',     title: 'Visa Approved',
        description: "Emma Clarke's H-1B petition approved by USCIS.",
        created_at: new Date(Date.now() -    2 * 3_600_000).toISOString() },
      { id: '2', type: 'expiry_alert',      title: 'Expiry Alert Sent',
        description: 'Auto-reminder sent to Marcus Rivera (12 days).',
        created_at: new Date(Date.now() -    5 * 3_600_000).toISOString() },
      { id: '3', type: 'documents_uploaded', title: 'Documents Uploaded',
        description: 'Priya Nair uploaded 3 renewal documents.',
        created_at: new Date(Date.now() -   18 * 3_600_000).toISOString() },
      { id: '4', type: 'renewal_initiated', title: 'Renewal Initiated',
        description: 'L-1 Transfer renewal started for James Okafor.',
        created_at: new Date(Date.now() -   24 * 3_600_000).toISOString() },
      { id: '5', type: 'employee_added',    title: 'New Employee Added',
        description: 'Sofia Reyes onboarded — E-3 visa profile created.',
        created_at: new Date(Date.now() -   72 * 3_600_000).toISOString() },
      { id: '6', type: 'interview_scheduled', title: 'Interview Scheduled',
        description: 'H-1B interview booked for Daniel Kim — Jul 2.',
        created_at: new Date(Date.now() -   96 * 3_600_000).toISOString() },
      { id: '7', type: 'application_rejected', title: 'Application Rejected',
        description: "Carlos Vega's O-1 extension denied; appeal filed.",
        created_at: new Date(Date.now() -  120 * 3_600_000).toISOString() },
    ],

    // ── Expiration Timeline — Stacked Bar (Chart 2) ─────────────────────
    timeline: [
      { month: 'Jul 2025', critical:  8, warning:  5, upcoming:  3 },
      { month: 'Aug 2025', critical:  6, warning: 12, upcoming:  9 },
      { month: 'Sep 2025', critical:  3, warning:  7, upcoming: 11 },
      { month: 'Oct 2025', critical:  4, warning:  9, upcoming: 13 },
      { month: 'Nov 2025', critical:  2, warning:  6, upcoming: 15 },
      { month: 'Dec 2025', critical:  1, warning:  4, upcoming: 17 },
    ],

    // ── Visa Distribution — Donut (Chart 3) ─────────────────────────────
    visa_distribution: [
      { visa_code: 'H-1B', count: 612, percentage: 62.3 },
      { visa_code: 'L-1',  count: 148, percentage: 15.1 },
      { visa_code: 'O-1',  count:  87, percentage:  8.9 },
      { visa_code: 'TN',   count:  64, percentage:  6.5 },
      { visa_code: 'E-3',  count:  41, percentage:  4.2 },
      { visa_code: 'Other',count:  31, percentage:  3.2 },
    ],

    // ── Cases by Stage — Horizontal Bar (Chart 4) ───────────────────────
    cases_by_stage: [
      { stage: 'Document Collection', count: 42 },
      { stage: 'Attorney Review',     count: 28 },
      { stage: 'Employer Review',     count: 19 },
      { stage: 'USCIS Filing',        count: 15 },
      { stage: 'USCIS Processing',    count: 34 },
      { stage: 'Approved / Complete', count: 156 },
    ],

    // ── Monthly Case Trend — Line (Chart 5) ─────────────────────────────
    monthly_trend: [
      { month: 'Jan', filed: 18, approved: 12, rejected: 2 },
      { month: 'Feb', filed: 22, approved: 15, rejected: 1 },
      { month: 'Mar', filed: 31, approved: 19, rejected: 3 },
      { month: 'Apr', filed: 27, approved: 24, rejected: 2 },
      { month: 'May', filed: 35, approved: 22, rejected: 4 },
      { month: 'Jun', filed: 29, approved: 28, rejected: 1 },
    ],

    // ── Compliance by Department — Horizontal Bar (Chart 6) ─────────────
    department_compliance: [
      { department: 'Engineering', compliance_rate: 94, total_employees: 412 },
      { department: 'Product',     compliance_rate: 89, total_employees: 186 },
      { department: 'Design',      compliance_rate: 85, total_employees:  98 },
      { department: 'Marketing',   compliance_rate: 82, total_employees: 147 },
      { department: 'Finance',     compliance_rate: 78, total_employees: 124 },
      { department: 'Operations',  compliance_rate: 71, total_employees: 201 },
      { department: 'Legal',       compliance_rate: 96, total_employees:  80 },
    ],

    // ── Processing Time by Visa — Grouped Bar (Chart 7) ─────────────────
    processing_time: [
      { visa_code: 'H-1B', avg_days: 142, benchmark_days: 180 },
      { visa_code: 'L-1',  avg_days: 98,  benchmark_days: 120 },
      { visa_code: 'O-1',  avg_days: 165, benchmark_days: 150 },
      { visa_code: 'TN',   avg_days: 34,  benchmark_days: 45 },
      { visa_code: 'E-3',  avg_days: 78,  benchmark_days: 90 },
    ],

    // ── Document Completion — Progress (Chart 8) ────────────────────────
    document_completion: [
      { category: 'Passport & Identity',    completed: 1180, total: 1248, percentage: 95 },
      { category: 'Employment Records',     completed: 1062, total: 1248, percentage: 85 },
      { category: 'Education & Credentials',completed:  974, total: 1248, percentage: 78 },
      { category: 'Tax & Financial',        completed:  898, total: 1248, percentage: 72 },
      { category: 'Immigration History',    completed:  836, total: 1248, percentage: 67 },
      { category: 'Medical & Insurance',    completed:  749, total: 1248, percentage: 60 },
    ],
  }),
};

export const getHRDashboard = (): Promise<HRDashboardData> => dashboardApi.get();
// src/components/tour/tourSteps.ts
//
// Central place for all tour step definitions.
// Each role has its own step list.
// Step `id` must match a  data-tour="<id>"  attribute on a DOM element.

import type { TourRole } from '../../hooks/useDashboardTour';

export interface TourStep {
  id:          string;
  title:       string;
  description: string;
  position?:   'top' | 'bottom' | 'left' | 'right';
}

// ─────────────────────────────────────────────────────────────────────────────
// EMPLOYEE  (data-tour IDs already added to Dashboard.tsx)
// ─────────────────────────────────────────────────────────────────────────────

const employeeSteps: TourStep[] = [
  {
    id: 'kpi',
    title: 'Your case at a glance',
    description:
      'These cards show your overall case progress, document status, estimated processing time, and your nearest deadline — updated in real time.',
    position: 'bottom',
  },
  {
    id: 'pipeline',
    title: 'Case pipeline',
    description:
      'Track exactly where your visa application is in the process. Green means completed, the highlighted circle is your current stage.',
    position: 'bottom',
  },
  {
    id: 'actions',
    title: 'Action items',
    description:
      'Tasks that need your attention — uploading a document, signing a form, or making a payment. Urgent items appear at the top.',
    position: 'bottom',
  },
  {
    id: 'documents',
    title: 'Your documents',
    description:
      'See the status of every document in your case. Use the filters to find missing or rejected files, and upload directly from here.',
    position: 'top',
  },
  {
    id: 'quick-actions',
    title: 'Quick actions',
    description:
      'Shortcuts to the most common tasks — upload documents, message your team, view your applications, or book a consultation.',
    position: 'left',
  },
  {
    id: 'team',
    title: "You're all set!",
    description:
      'Your case team is right here — you can email or call them directly. Tap the ? button any time to replay this tour.',
    position: 'left',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// HR  (add data-tour IDs to HRDashboard.tsx — see comments below)
// ─────────────────────────────────────────────────────────────────────────────
// Add these to HRDashboard.tsx:
//   <div data-tour="hr-kpi"      className="grid ...">        KPI stat row
//   <div data-tour="hr-actions"  className="bg-white ...">    Quick actions bar
//   <div data-tour="hr-widgets"  ref={gridRef}>               Widget grid wrapper
//   <div data-tour="hr-expiring" className="bg-white ...">    Expiring visas table
//   <div data-tour="hr-activity" className="bg-white ...">    Activity feed

const hrSteps: TourStep[] = [
  {
    id: 'hr-kpi',
    title: 'Compliance overview',
    description:
      'Track total employees, active visas, how many are expiring soon, and pending renewals — all updated in real time.',
    position: 'bottom',
  },
  {
    id: 'hr-actions',
    title: 'Quick actions',
    description:
      'Create new cases, invite employees, upload documents, and more — all from this bar.',
    position: 'bottom',
  },
  {
    id: 'hr-widgets',
    title: 'Chart widgets',
    description:
      'Add, remove, and rearrange charts using the grid icon at the top right. Drag the handle on each widget to reorder.',
    position: 'bottom',
  },
  {
    id: 'hr-expiring',
    title: 'Expiring visas',
    description:
      'Employees who need renewal action are listed here sorted by urgency. Use the filters to focus on critical cases first.',
    position: 'top',
  },
  {
    id: 'hr-activity',
    title: "You're all set!",
    description:
      'Recent compliance activity is logged here in real time. Tap the ? button any time to replay this tour.',
    position: 'top',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// ATTORNEY  (add data-tour IDs to AttorneyDashboard.tsx)
// ─────────────────────────────────────────────────────────────────────────────
// Add these to AttorneyDashboard.tsx:
//   data-tour="attorney-kpi"       KPI stat row
//   data-tour="attorney-cases"     Active cases list / table
//   data-tour="attorney-deadlines" Upcoming deadlines card
//   data-tour="attorney-billing"   Billing / time tracking card
//   data-tour="attorney-messages"  Messages / team card

const attorneySteps: TourStep[] = [
  {
    id: 'attorney-kpi',
    title: 'Your caseload at a glance',
    description:
      'See your active cases, total billable hours this month, upcoming deadlines, and unread messages — all in one row.',
    position: 'bottom',
  },
  {
    id: 'attorney-cases',
    title: 'Active cases',
    description:
      'All the cases currently assigned to you. Click any row to open the full case detail and manage documents, notes, and tasks.',
    position: 'bottom',
  },
  {
    id: 'attorney-deadlines',
    title: 'Upcoming deadlines',
    description:
      'USCIS filing deadlines, RFE responses, and client appointments are listed here sorted by urgency.',
    position: 'left',
  },
  {
    id: 'attorney-billing',
    title: 'Billing & time tracking',
    description:
      'Log billable hours and track your monthly revenue against your target. All time entries link back to individual cases.',
    position: 'left',
  },
  {
    id: 'attorney-messages',
    title: "You're all set!",
    description:
      'Message your clients and HR contacts directly from here. Tap the ? button any time to replay this tour.',
    position: 'left',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN  (add data-tour IDs to AdminDashboard.tsx)
// ─────────────────────────────────────────────────────────────────────────────
// Add these to AdminDashboard.tsx:
//   data-tour="admin-kpi"       on the KPI stats <section>
//   data-tour="admin-tabs"      on the tab nav <section>
//   data-tour="admin-health"    on the system health charts <section>
//   data-tour="admin-resources" on the ResourceAllocationWidget <section>

const adminSteps: TourStep[] = [
  {
    id: 'admin-kpi',
    title: 'Platform overview',
    description:
      'Total users, active cases, AI accuracy, and pending issues — the six tiles give you a real-time health snapshot of the entire platform.',
    position: 'bottom',
  },
  {
    id: 'admin-tabs',
    title: 'Configuration tabs',
    description:
      'Switch between Document Rules, Letter Templates, AI Extraction Rules, and Emergency Controls. Each section scrolls into view.',
    position: 'bottom',
  },
  {
    id: 'admin-health',
    title: 'System health',
    description:
      'Monitor uptime over the last 30 days and daily case processing volume. Export the case chart for reporting.',
    position: 'bottom',
  },
  {
    id: 'admin-resources',
    title: "You're all set!",
    description:
      "Track every attorney and HR staff member's live workload and case capacity. Tap the ? button any time to replay this tour.",
    position: 'top',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT
// ─────────────────────────────────────────────────────────────────────────────

export const STEPS_BY_ROLE: Record<TourRole, TourStep[]> = {
  employee: employeeSteps,
  hr:       hrSteps,
  attorney: attorneySteps,
  admin:    adminSteps,
};
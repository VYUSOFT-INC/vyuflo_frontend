// src/components/forms/FormStatusBadge.tsx
//
// Shared review-status pill used on lawyer / HR / employee form editors.
// One source of truth for label + color so the four states look identical
// across every editor toolbar.

/** Backend `status` enum — one field, six values.
 *  (Mirrors BACKEND_FORMS_STATUS_ENUM.md v2.) */
export type FormReviewStatus =
  | 'draft'
  | 'submitted'              // employee submitted; HR to fill
  | 'hr_approved'            // HR submitted; attorney to review
  | 'needs_corrections'
  | 'approved'
  | 'completed';

export type ViewerRole = 'employee' | 'hr' | 'attorney';

interface Props {
  status:    FormReviewStatus;
  /** Per-role label mapping. Same backend status renders differently
   *  depending on who's looking (e.g. `submitted` = "In Review" for HR
   *  but "Waiting on HR" for the attorney). Defaults to 'employee'. */
  role?:     ViewerRole;
  compact?:  boolean;        // smaller variant for editor toolbars
  className?: string;
}

type BadgeStyle = { bg: string; fg: string; border: string; icon: string };

// Color/icon per status is the same regardless of role — only the label changes.
const STYLE: Record<FormReviewStatus, BadgeStyle> = {
  draft:             { bg: '#f3f4f6', fg: '#374151', border: '#d1d5db', icon: '✎' },
  submitted:         { bg: '#eff6ff', fg: '#1d4ed8', border: '#bfdbfe', icon: '⏳' },
  hr_approved:       { bg: '#eff6ff', fg: '#1d4ed8', border: '#bfdbfe', icon: '⏳' },
  needs_corrections: { bg: '#fef3c7', fg: '#b45309', border: '#fcd34d', icon: '⚠' },
  approved:          { bg: '#dcfce7', fg: '#15803d', border: '#86efac', icon: '✓' },
  completed:         { bg: '#dcfce7', fg: '#15803d', border: '#86efac', icon: '✓' },
};

// Per-role label lookup — the "display" column from the backend spec table.
const LABEL: Record<ViewerRole, Record<FormReviewStatus, string>> = {
  employee: {
    draft:             'Draft',
    submitted:         'Submitted',
    hr_approved:       'Under attorney review',
    needs_corrections: 'Needs your corrections',
    approved:          'Approved',
    completed:         'Completed',
  },
  hr: {
    draft:             'Not yet submitted',
    submitted:         'In Review',
    hr_approved:       'Forwarded to attorney',
    needs_corrections: 'Needs corrections',
    approved:          'Approved',
    completed:         'Completed',
  },
  attorney: {
    draft:             'Not yet submitted',
    submitted:         'Waiting on HR',
    hr_approved:       'In Review',
    needs_corrections: 'Corrections requested',
    approved:          'Approved',
    completed:         'Completed',
  },
};

export default function FormStatusBadge({ status, role = 'employee', compact = false, className = '' }: Props) {
  const s = STYLE[status];
  const label = LABEL[role][status];
  const size = compact ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border font-semibold ${size} ${className}`}
      style={{ backgroundColor: s.bg, color: s.fg, borderColor: s.border }}
    >
      <span aria-hidden>{s.icon}</span>
      <span>{label}</span>
    </span>
  );
}

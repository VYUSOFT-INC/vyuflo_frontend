// src/pages/hr/HRCreateCase.tsx
//
// HR — Create New Immigration Case
// Route: /employer/cases/new
// Figma: 04b - Case Creation Flow (generic) — pBNHGu41ShCCU8Bh1YhFqK
//
// HR-specific changes vs Figma:
//   ✓ Step 1: "Select Employee" replaces "Who is initiating?" (HR always initiates)
//   ✓ Step 2: Visa type — Work visas only (H-1B, L-1A, L-1B, O-1, TN, E-3)
//   ✓ Step 3: Case Details (name, description, target date, priority)
//   ✓ Step 4: Assign Attorney (optional)
//   ✓ Step 5: Review & Submit
//   ✗ Removed: "Who is initiating?" section (always HR/Employer)
//   ✗ Removed: Student/Dependent visa tabs
//   ✗ Removed: Footer
//   ✗ Removed: "Watch Tutorial" / "Chat with Support" (placeholder links)

import { useState, useMemo, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight, ChevronLeft, Save, X, Search, Check,
  Clock, FileText, Lightbulb, HelpCircle, AlertCircle,
  User, Briefcase, Calendar, Tag, ArrowRight, CheckCircle2,
  Users, Scale,
} from 'lucide-react';
import { PageHeader, PageContent } from '../../components/layout/Pageheader';
import { useCreateCase } from '../../hooks/hr/useCreateCase';
import type { CaseStep, VisaTypeOption } from '../../types/hr/createCase.types';
import { getFileUrl } from '../../utils/fileUrl';

// const PRIMARY = '#4f46e5';
const PRIMARY_GRADIENT = 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)';

// ─────────────────────────────────────────────────────────────────────────────
// VISA TYPE DATA
// ─────────────────────────────────────────────────────────────────────────────

const VISA_TYPES: VisaTypeOption[] = [
  {
    code: 'H-1B',
    name: 'H-1B Specialty Occupation',
    description: "Most common work visa for professionals with bachelor's degree or higher",
    timeline: '6-12 months',
    doc_count: 8,
    category: 'work',
    icon_bg: '#dbeafe',
    icon_color: '#2563eb',
    lca_required: true,
    total_estimate: '6-12 months',
    requirements: [
      { name: 'Valid Passport',       description: 'Must be valid for at least 6 months' },
      { name: 'Form I-129',           description: 'Petition for Nonimmigrant Worker' },
      { name: 'LCA Approval Notice',  description: 'From Department of Labor' },
      { name: 'Degree Certificates',  description: "Bachelor's or higher required" },
      { name: 'Employment Letter',    description: 'From sponsoring employer' },
    ],
  },
  {
    code: 'L-1A',
    name: 'L-1A Intracompany Transfer',
    description: 'For managers and executives transferring within company',
    timeline: '4-8 months',
    doc_count: 10,
    category: 'work',
    icon_bg: '#f3e8ff',
    icon_color: '#7e22ce',
    lca_required: false,
    total_estimate: '4-8 months',
    requirements: [
      { name: 'Valid Passport',        description: 'Must be valid for at least 6 months' },
      { name: 'Form I-129',            description: 'Petition for Nonimmigrant Worker' },
      { name: 'Evidence of Employment', description: 'Abroad for 1 of last 3 years' },
      { name: 'Org Charts',            description: 'Showing managerial position' },
      { name: 'Support Letter',        description: 'From US employer' },
    ],
  },
  {
    code: 'L-1B',
    name: 'L-1B Specialized Knowledge',
    description: 'For employees with specialized knowledge transferring within company',
    timeline: '4-8 months',
    doc_count: 9,
    category: 'work',
    icon_bg: '#fce7f3',
    icon_color: '#be185d',
    lca_required: false,
    total_estimate: '4-8 months',
    requirements: [
      { name: 'Valid Passport',          description: 'Must be valid for at least 6 months' },
      { name: 'Form I-129',              description: 'Petition for Nonimmigrant Worker' },
      { name: 'Evidence of Employment',  description: 'Abroad for 1 of last 3 years' },
      { name: 'Specialized Knowledge',   description: 'Evidence of unique knowledge' },
      { name: 'Support Letter',          description: 'From US employer' },
    ],
  },
  {
    code: 'O-1',
    name: 'O-1 Extraordinary Ability',
    description: 'For individuals with extraordinary ability in sciences, arts, etc.',
    timeline: '3-6 months',
    doc_count: 12,
    category: 'work',
    icon_bg: '#dcfce7',
    icon_color: '#15803d',
    lca_required: false,
    total_estimate: '3-6 months',
    requirements: [
      { name: 'Valid Passport',     description: 'Must be valid for at least 6 months' },
      { name: 'Form I-129',         description: 'Petition for Nonimmigrant Worker' },
      { name: 'Advisory Opinion',   description: 'From peer group or union' },
      { name: 'Awards & Recognition', description: 'Evidence of extraordinary ability' },
      { name: 'Employment Contract', description: 'With US employer' },
    ],
  },
  {
    code: 'TN',
    name: 'TN NAFTA Professional',
    description: 'For Canadian and Mexican citizens in professional occupations',
    timeline: '1-3 months',
    doc_count: 6,
    category: 'work',
    icon_bg: '#ffedd5',
    icon_color: '#c2410c',
    lca_required: false,
    total_estimate: '1-3 months',
    requirements: [
      { name: 'Canadian/Mexican Passport', description: 'Valid citizen document' },
      { name: 'Degree Certificates',       description: 'Professional qualification' },
      { name: 'Employment Letter',          description: 'From US employer' },
      { name: 'License (if applicable)',   description: 'Professional license' },
    ],
  },
  {
    code: 'E-3',
    name: 'E-3 Australian Specialty',
    description: 'For Australian citizens in specialty occupation roles',
    timeline: '2-4 months',
    doc_count: 7,
    category: 'work',
    icon_bg: '#e0e7ff',
    icon_color: '#4338ca',
    lca_required: true,
    total_estimate: '2-4 months',
    requirements: [
      { name: 'Australian Passport',  description: 'Valid Australian citizenship' },
      { name: 'LCA Certification',    description: 'From Department of Labor' },
      { name: 'Degree Certificates',  description: "Bachelor's or equivalent" },
      { name: 'DS-160 Form',          description: 'Nonimmigrant visa application' },
      { name: 'Employment Letter',    description: 'From sponsoring employer' },
    ],
  },
];

const TIMELINE_STEPS: Record<string, Array<{ label: string; time: string; color: string }>> = {
  'H-1B': [
    { label: 'Case Preparation', time: '2-4 weeks',           color: '#dbeafe' },
    { label: 'LCA Processing',   time: '7-10 days',           color: '#f3e8ff' },
    { label: 'USCIS Filing',     time: '1 day',               color: '#dcfce7' },
    { label: 'USCIS Processing', time: '3-6 months (regular)', color: '#ffedd5' },
  ],
  'L-1A': [
    { label: 'Case Preparation', time: '2-4 weeks',   color: '#dbeafe' },
    { label: 'USCIS Filing',     time: '1 day',       color: '#dcfce7' },
    { label: 'USCIS Processing', time: '3-5 months',  color: '#ffedd5' },
  ],
  'L-1B': [
    { label: 'Case Preparation', time: '2-4 weeks',   color: '#dbeafe' },
    { label: 'USCIS Filing',     time: '1 day',       color: '#dcfce7' },
    { label: 'USCIS Processing', time: '3-5 months',  color: '#ffedd5' },
  ],
  'O-1': [
    { label: 'Case Preparation', time: '2-4 weeks',   color: '#dbeafe' },
    { label: 'USCIS Filing',     time: '1 day',       color: '#dcfce7' },
    { label: 'USCIS Processing', time: '2-4 months',  color: '#ffedd5' },
  ],
  'TN': [
    { label: 'Case Preparation',  time: '1-2 weeks',  color: '#dbeafe' },
    { label: 'Border Processing', time: 'Same day',   color: '#dcfce7' },
  ],
  'E-3': [
    { label: 'Case Preparation',     time: '1-2 weeks',  color: '#dbeafe' },
    { label: 'LCA Processing',       time: '7-10 days',  color: '#f3e8ff' },
    { label: 'Consular Processing',  time: '2-4 weeks',  color: '#dcfce7' },
  ],
};

const PRO_TIPS: Record<string, string[]> = {
  default: [
    'Start gathering documents early to avoid delays',
    'Your employer must file the LCA before petition submission',
    'Consider premium processing for faster results',
    'The employee will receive a task checklist once the case is created',
  ],
  'H-1B': [
    'H-1B cap applies — file during the April lottery window',
    'LCA must be certified before filing I-129',
    'Premium processing guarantees 15-business-day response',
    'Ensure job duty description matches specialty occupation requirements',
  ],
  'TN': [
    'TN is renewable indefinitely — no cap limit',
    'Canadian citizens can present at the border directly',
    'Mexican citizens need consular processing',
    'Professional category must match USMCA approved list',
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function initials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

const AVATAR_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];
function avatarColor(seed: string): string {
  const i = seed.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[i];
}

function fmtDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP HEADER
// ─────────────────────────────────────────────────────────────────────────────

const STEPS = [
  { n: 1, label: 'Select Employee' },
  { n: 2, label: 'Visa Type' },
  { n: 3, label: 'Case Details' },
  { n: 4, label: 'Assign Attorney' },
  { n: 5, label: 'Review' },
];

function StepBar({ current, onGoTo }: { current: CaseStep; onGoTo: (s: CaseStep) => void }) {
  return (
    <div className="flex items-center gap-0 w-full">
      {STEPS.map((s, idx) => {
        const done    = s.n < current;
        const active  = s.n === current;
        // const future  = s.n > current;
        return (
          <div key={s.n} className="flex items-center flex-1 last:flex-none">
            <button
              onClick={() => done ? onGoTo(s.n as CaseStep) : undefined}
              disabled={!done}
              className="flex flex-col items-center gap-[6px] min-w-[80px]"
            >
              <div className={`size-[44px] rounded-full flex items-center justify-center text-[15px] font-bold border-2 transition ${
                done   ? 'bg-indigo-600 border-indigo-600 text-white cursor-pointer hover:bg-indigo-700'
                : active ? 'bg-white border-indigo-600 text-indigo-600'
                : 'bg-white border-[#d1d5db] text-[#9ca3af]'
              }`}>
                {done ? <Check size={18} /> : s.n}
              </div>
              <span className={`text-[12px] font-medium text-center leading-tight ${
                active ? 'text-indigo-600'
                : done ? 'text-[#374151]'
                : 'text-[#9ca3af]'
              }`}>{s.label}</span>
            </button>
            {idx < STEPS.length - 1 && (
              <div className="flex-1 mx-[4px] mb-[18px]">
                <div className={`h-[3px] rounded-full transition-all ${
                  s.n < current ? 'bg-indigo-600' : 'bg-[#e5e7eb]'
                }`} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SIDEBAR CARDS
// ─────────────────────────────────────────────────────────────────────────────

function HelpCard() {
  return (
    <div className="rounded-[12px] border border-[#dbeafe] p-[20px] flex flex-col gap-[12px]"
         style={{ background: 'linear-gradient(153deg, #eff6ff 0%, #faf5ff 100%)' }}>
      <div className="flex items-start gap-[10px]">
        <div className="size-[36px] rounded-[8px] bg-indigo-600 flex items-center justify-center shrink-0">
          <HelpCircle size={16} className="text-white" />
        </div>
        <div>
          <p className="text-[14px] font-bold text-[#111827] tracking-[-0.3px]">Need Help?</p>
          <p className="text-[12px] text-[#374151] mt-[2px]">We're here to guide you through every step</p>
        </div>
      </div>
      <a href="#" className="text-[13px] font-medium text-indigo-600 hover:underline flex items-center gap-[6px]">
        <FileText size={13} /> View Requirements Guide
      </a>
    </div>
  );
}

function RequirementsCard({ visa }: { visa: VisaTypeOption | null }) {
  if (!visa) return (
    <div className="bg-white border border-[#e5e7eb] rounded-[12px] p-[20px]">
      <p className="text-[13px] text-[#9ca3af]">Select a visa type to see requirements</p>
    </div>
  );
  return (
    <div className="bg-white border border-[#e5e7eb] rounded-[12px] p-[20px] shadow-[0px_1px_1px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-between mb-[14px]">
        <p className="text-[14px] font-bold text-[#111827]">{visa.code} Requirements</p>
        <span className="px-[8px] py-[2px] rounded-full bg-[#dbeafe] text-[#2563eb] text-[11px] font-semibold">
          {visa.doc_count} items
        </span>
      </div>
      <div className="flex flex-col gap-[10px]">
        {visa.requirements.map(r => (
          <div key={r.name} className="flex items-start gap-[10px]">
            <div className="size-[18px] rounded-[4px] bg-[#fee2e2] flex items-center justify-center shrink-0 mt-[1px]">
              <span className="text-[10px] font-bold text-[#dc2626]">*</span>
            </div>
            <div>
              <p className="text-[13px] font-medium text-[#111827]">{r.name}</p>
              <p className="text-[11px] text-[#6b7280]">{r.description}</p>
            </div>
          </div>
        ))}
      </div>
      <button className="mt-[14px] w-full text-[13px] font-semibold text-indigo-600 hover:underline flex items-center justify-center gap-[5px]">
        View Full Checklist <ArrowRight size={12} />
      </button>
    </div>
  );
}

function TimelineCard({ visa }: { visa: VisaTypeOption | null }) {
  const steps = visa ? (TIMELINE_STEPS[visa.code] ?? TIMELINE_STEPS['H-1B']) : [];
  return (
    <div className="bg-white border border-[#e5e7eb] rounded-[12px] p-[20px] shadow-[0px_1px_1px_rgba(0,0,0,0.05)]">
      <p className="text-[14px] font-bold text-[#111827] mb-[14px]">Estimated Timeline</p>
      <div className="flex flex-col gap-[12px]">
        {(visa ? steps : TIMELINE_STEPS['H-1B']).map(s => (
          <div key={s.label} className="flex items-center gap-[10px]">
            <div className="size-[28px] rounded-full flex items-center justify-center shrink-0"
                 style={{ backgroundColor: s.color }}>
              <Clock size={12} className="text-[#374151]" />
            </div>
            <div>
              <p className="text-[13px] font-medium text-[#111827]">{s.label}</p>
              <p className="text-[11px] text-[#6b7280]">{s.time}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-[14px] pt-[12px] border-t border-[#f3f4f6] flex items-center justify-between">
        <span className="text-[13px] font-semibold text-[#374151]">Total Estimate:</span>
        <span className="text-[13px] font-bold text-indigo-600">{visa?.total_estimate ?? '6-12 months'}</span>
      </div>
    </div>
  );
}

function TipsCard({ visaCode }: { visaCode: string | null }) {
  const tips = visaCode && PRO_TIPS[visaCode] ? PRO_TIPS[visaCode] : PRO_TIPS['default'];
  return (
    <div className="bg-white border border-[#e5e7eb] rounded-[12px] p-[20px] shadow-[0px_1px_1px_rgba(0,0,0,0.05)]">
      <div className="flex items-center gap-[8px] mb-[14px]">
        <Lightbulb size={15} className="text-[#f59e0b]" />
        <p className="text-[14px] font-bold text-[#111827]">Pro Tips</p>
      </div>
      <ul className="flex flex-col gap-[10px]">
        {tips.map((t, i) => (
          <li key={i} className="flex items-start gap-[8px]">
            <Check size={12} className="text-indigo-600 mt-[3px] shrink-0" />
            <span className="text-[13px] text-[#374151]">{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1 — SELECT EMPLOYEE
// ─────────────────────────────────────────────────────────────────────────────

function Step1Employee({ employees, loading, selectedId, onSelect }: {
  employees: Array<{
    id: string; full_name: string; email: string;
    job_title: string | null; department: string | null;
    profile_picture_url: string | null;
    active_cases: number;
  }>;
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}){
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return employees;
    return employees.filter(e =>
      `${e.full_name} ${e.email} ${e.job_title ?? ''} ${e.department ?? ''}`.toLowerCase().includes(q)
    );
  }, [employees, search]);

  return (
    <div className="bg-white border border-[#e5e7eb] rounded-[12px] p-[28px] shadow-[0px_1px_1px_rgba(0,0,0,0.05)]">
      <div className="mb-[20px]">
        <h2 className="text-[18px] font-bold text-[#111827] tracking-[-0.5px]">Select Employee</h2>
        <p className="text-[14px] text-[#4b5563] mt-[4px]">
          Choose the employee you are sponsoring for this visa application.
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-[16px]">
        <Search size={15} className="absolute left-[12px] top-1/2 -translate-y-1/2 text-[#9ca3af] pointer-events-none" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, email, or department..."
          className="w-full h-[44px] bg-[#f9fafb] border border-[#d1d5db] rounded-[8px] pl-[36px] pr-[14px] text-[14px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition"
        />
      </div>

      {/* Employee grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-[12px]">
          {[0,1,2,3].map(i => (
            <div key={i} className="h-[80px] bg-[#f8fafc] rounded-[10px] animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-[32px] text-center text-[#6b7280] text-[14px]">
          {search ? 'No employees match your search.' : 'No employees found. Invite employees first.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-[10px] max-h-[420px] overflow-y-auto pr-[2px]">
          {filtered.map(emp => {
            const selected = emp.id === selectedId;
            const avatarSrc = getFileUrl(emp.profile_picture_url);
            return (
              <button
                key={emp.id}
                onClick={() => onSelect(emp.id)}
                className={`flex items-center gap-[12px] p-[14px] rounded-[10px] border-2 text-left transition ${
                  selected
                    ? 'border-indigo-600 bg-indigo-50'
                    : 'border-[#e5e7eb] bg-white hover:border-indigo-300 hover:bg-[#f8fafc]'
                }`}>
                {avatarSrc ? (
                  <img src={avatarSrc} alt="" className="size-[40px] rounded-full object-cover shrink-0 border border-[#e5e7eb]" />
                ) : (
                  <div className="size-[40px] rounded-full flex items-center justify-center text-white text-[13px] font-semibold shrink-0"
                       style={{ backgroundColor: avatarColor(emp.full_name) }}>
                    {initials(emp.full_name)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-[#111827] truncate">{emp.full_name}</p>
                  <p className="text-[11px] text-[#6b7280] truncate">{emp.job_title || emp.email}</p>
                  {emp.department && (
                    <p className="text-[11px] text-[#9ca3af] truncate">{emp.department}</p>
                  )}
                </div>
                {selected && (
                  <div className="size-[20px] rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
                    <Check size={11} className="text-white" />
                  </div>
                )}
                {!selected && emp.active_cases > 0 && (
                  <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-[6px] py-[2px] rounded-full border border-indigo-200 shrink-0">
                    {emp.active_cases} active
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {selectedId && (
        <p className="mt-[12px] text-[12px] text-[#16a34a] font-medium flex items-center gap-[5px]">
          <Check size={12} /> Employee selected — click Continue to proceed
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2 — SELECT VISA TYPE
// ─────────────────────────────────────────────────────────────────────────────

function Step2VisaType({ selected, onSelect }: {
  selected: string | null;
  onSelect: (code: string) => void;
}) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return VISA_TYPES;
    return VISA_TYPES.filter(v =>
      `${v.code} ${v.name} ${v.description}`.toLowerCase().includes(q)
    );
  }, [search]);

  return (
    <div className="bg-white border border-[#e5e7eb] rounded-[12px] p-[28px] shadow-[0px_1px_1px_rgba(0,0,0,0.05)]">
      <div className="mb-[20px]">
        <h2 className="text-[18px] font-bold text-[#111827] tracking-[-0.5px]">Step 2: Select Visa Type</h2>
        <p className="text-[14px] text-[#4b5563] mt-[4px]">
          Choose the visa category that applies to this employee's situation.
        </p>
      </div>

      {/* Visa grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-[12px]">
        {filtered.map(v => {
          const sel = v.code === selected;
          return (
            <button
              key={v.code}
              onClick={() => onSelect(v.code)}
              className={`flex flex-col gap-[10px] p-[18px] rounded-[12px] border-2 text-left transition ${
                sel
                  ? 'border-indigo-600 bg-indigo-50'
                  : 'border-[#e5e7eb] bg-white hover:border-indigo-300 hover:bg-[#fafbfc]'
              }`}>
              <div className="flex items-center justify-between">
                <div className="size-[36px] rounded-[8px] flex items-center justify-center shrink-0"
                     style={{ backgroundColor: v.icon_bg }}>
                  <Briefcase size={16} style={{ color: v.icon_color }} />
                </div>
                <div className={`size-[18px] rounded-full border-2 flex items-center justify-center ${
                  sel ? 'border-indigo-600 bg-indigo-600' : 'border-[#d1d5db]'
                }`}>
                  {sel && <Check size={10} className="text-white" />}
                </div>
              </div>
              <div>
                <p className="text-[14px] font-bold text-[#111827]">{v.name}</p>
                <p className="text-[12px] text-[#4b5563] mt-[3px] leading-[1.4]">{v.description}</p>
              </div>
              <div className="flex items-center gap-[12px]">
                <span className="text-[11px] text-[#6b7280] flex items-center gap-[3px]">
                  <Clock size={10} /> {v.timeline}
                </span>
                <span className="text-[11px] text-[#6b7280] flex items-center gap-[3px]">
                  <FileText size={10} /> {v.doc_count} docs
                </span>
                {v.lca_required && (
                  <span className="text-[10px] font-semibold bg-[#fef9c3] text-[#a16207] px-[6px] py-[1px] rounded-full border border-[#fef08a]">
                    LCA required
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Search other */}
      <div className="mt-[16px]">
        <p className="text-[13px] font-semibold text-[#374151] mb-[8px]">Can't find your visa type?</p>
        <div className="relative">
          <Search size={15} className="absolute left-[12px] top-1/2 -translate-y-1/2 text-[#9ca3af] pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search from 50+ visa types..."
            className="w-full h-[44px] bg-white border border-[#d1d5db] rounded-[8px] pl-[36px] pr-[14px] text-[14px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition"
          />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 3 — CASE DETAILS
// ─────────────────────────────────────────────────────────────────────────────

function LabeledField({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-[6px]">
      <label className="text-[13px] font-semibold text-[#374151]">
        {required && <span className="text-[#ef4444]">* </span>}{label}
      </label>
      {children}
      {hint && <p className="text-[11px] text-[#6b7280]">{hint}</p>}
    </div>
  );
}

const inputCls = "w-full h-[46px] bg-white border border-[#d1d5db] rounded-[8px] px-[14px] text-[14px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition placeholder:text-[#9ca3af]";
const selectCls = "w-full h-[46px] bg-white border border-[#d1d5db] rounded-[8px] px-[14px] text-[14px] text-[#374151] appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition";

function Step3Details({ form, update }: {
  form: { case_name: string; case_description: string; target_date: string; priority: string; internal_notes: string };
  update: (k: 'case_name' | 'case_description' | 'target_date' | 'priority' | 'internal_notes', v: string) => void;
})
 {
  return (
    <div className="bg-white border border-[#e5e7eb] rounded-[12px] p-[28px] shadow-[0px_1px_1px_rgba(0,0,0,0.05)]">
      <div className="mb-[20px]">
        <h2 className="text-[18px] font-bold text-[#111827] tracking-[-0.5px]">Step 3: Case Details</h2>
        <p className="text-[14px] text-[#4b5563] mt-[4px]">
          Provide basic information about this case for easy identification.
        </p>
      </div>

      <div className="flex flex-col gap-[18px]">
        <LabeledField label="Case Name / Title" required hint="This name will appear in your case list and notifications">
          <input
            value={form.case_name}
            onChange={e => update('case_name', e.target.value)}
            placeholder="e.g. David Chen - H-1B 2025"
            className={inputCls}
          />
        </LabeledField>

        <LabeledField label="Case Description (Optional)">
          <textarea
            value={form.case_description}
            onChange={e => update('case_description', e.target.value)}
            placeholder="Add any additional context or notes about this case..."
            rows={3}
            className="w-full bg-white border border-[#d1d5db] rounded-[8px] px-[14px] py-[10px] text-[14px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition placeholder:text-[#9ca3af] resize-none"
          />
        </LabeledField>

        <div className="grid grid-cols-2 gap-[16px]">
          <LabeledField label="Target Submission Date" required>
            <div className="relative">
              <input
                type="date"
                value={form.target_date}
                onChange={e => update('target_date', e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
                className={inputCls}
              />
              <Calendar size={16} className="absolute right-[12px] top-1/2 -translate-y-1/2 text-[#9ca3af] pointer-events-none" />
            </div>
          </LabeledField>

          <LabeledField label="Priority Level">
            <div className="relative">
              <select
                value={form.priority}
                onChange={e => update('priority', e.target.value)}
                className={selectCls}>
                <option value="standard">Standard</option>
                <option value="urgent">Urgent</option>
                <option value="premium">Premium Processing</option>
              </select>
              <ChevronRight size={14} className="absolute right-[12px] top-1/2 -translate-y-1/2 text-[#9ca3af] pointer-events-none rotate-90" />
            </div>
          </LabeledField>
        </div>

        <LabeledField label="Internal Notes (Optional)" hint="Only visible to HR and attorney — not shown to the employee">
          <textarea
            value={form.internal_notes}
            onChange={e => update('internal_notes', e.target.value)}
            placeholder="Add any internal notes for the attorney or your records..."
            rows={3}
            className="w-full bg-white border border-[#d1d5db] rounded-[8px] px-[14px] py-[10px] text-[14px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition placeholder:text-[#9ca3af] resize-none"
          />
        </LabeledField>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 4 — ASSIGN ATTORNEY
// ─────────────────────────────────────────────────────────────────────────────

function Step4Attorney({ attorneys, loading, selectedId, onSelect }: {
  attorneys: Array<{
    user_id: string; full_name: string; email: string;
    profile_picture_url: string | null; law_firm_name: string | null;
    specialisations: string[]; active_cases: number; is_accepting: boolean;
  }>;
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  return (
    <div className="bg-white border border-[#e5e7eb] rounded-[12px] p-[28px] shadow-[0px_1px_1px_rgba(0,0,0,0.05)]">
      <div className="mb-[20px]">
        <h2 className="text-[18px] font-bold text-[#111827] tracking-[-0.5px]">Step 4: Assign Attorney</h2>
        <p className="text-[14px] text-[#4b5563] mt-[4px]">
          Optionally assign an immigration attorney to handle the petition. You can assign one later from the case detail page.
        </p>
      </div>

      {/* Skip option */}
      <button
        onClick={() => onSelect(null)}
        className={`w-full flex items-center gap-[12px] p-[14px] rounded-[10px] border-2 mb-[12px] text-left transition ${
          selectedId === null
            ? 'border-indigo-600 bg-indigo-50'
            : 'border-[#e5e7eb] bg-white hover:border-indigo-300'
        }`}>
        <div className="size-[40px] rounded-full bg-[#f1f5f9] flex items-center justify-center shrink-0">
          <Users size={16} className="text-[#64748b]" />
        </div>
        <div className="flex-1">
          <p className="text-[14px] font-semibold text-[#111827]">Skip for now</p>
          <p className="text-[12px] text-[#6b7280]">Assign attorney later from case detail</p>
        </div>
        {selectedId === null && (
          <div className="size-[20px] rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
            <Check size={11} className="text-white" />
          </div>
        )}
      </button>

      {loading ? (
        <div className="flex flex-col gap-[10px]">
          {[0,1,2].map(i => <div key={i} className="h-[70px] bg-[#f8fafc] rounded-[10px] animate-pulse" />)}
        </div>
      ) : attorneys.length === 0 ? (
        <div className="py-[24px] text-center">
          <Scale size={28} className="mx-auto text-[#9ca3af] mb-[8px]" />
          <p className="text-[13px] text-[#6b7280]">No attorneys available. You can assign one after creating the case.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-[10px]">
          {attorneys.map(att => {
            const sel = att.user_id === selectedId;
            const avatarSrc = getFileUrl(att.profile_picture_url);
            return (
              <button
                key={att.user_id}
                onClick={() => onSelect(att.user_id)}
                className={`flex items-center gap-[12px] p-[14px] rounded-[10px] border-2 text-left transition ${
                  sel
                    ? 'border-indigo-600 bg-indigo-50'
                    : 'border-[#e5e7eb] bg-white hover:border-indigo-300 hover:bg-[#fafbfc]'
                }`}>
                {avatarSrc ? (
                  <img src={avatarSrc} alt="" className="size-[40px] rounded-full object-cover shrink-0 border border-[#e5e7eb]" />
                ) : (
                  <div className="size-[40px] rounded-full flex items-center justify-center text-white text-[13px] font-semibold shrink-0"
                       style={{ backgroundColor: avatarColor(att.full_name) }}>
                    {initials(att.full_name)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-[#111827] truncate">{att.full_name}</p>
                  <p className="text-[11px] text-[#6b7280] truncate">{att.law_firm_name ?? att.email}</p>
                  {att.specialisations.length > 0 && (
                    <div className="flex items-center gap-[4px] mt-[3px] flex-wrap">
                      {att.specialisations.slice(0, 3).map(s => (
                        <span key={s} className="text-[10px] font-medium bg-[#f1f5f9] text-[#475569] px-[5px] py-[1px] rounded-[4px]">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[11px] text-[#6b7280]">{att.active_cases} active</p>
                  {sel && (
                    <div className="size-[20px] rounded-full bg-indigo-600 flex items-center justify-center mt-[4px] ml-auto">
                      <Check size={11} className="text-white" />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 5 — REVIEW & SUBMIT
// ─────────────────────────────────────────────────────────────────────────────

function ReviewRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between py-[10px] border-b border-[#f3f4f6] last:border-b-0">
      <span className="text-[13px] font-medium text-[#6b7280] w-[160px] shrink-0">{label}</span>
      <span className={`text-[13px] text-[#111827] text-right flex-1 ${mono ? 'font-mono' : 'font-medium'}`}>{value || '—'}</span>
    </div>
  );
}

function Step5Review({ form, selectedEmployee, selectedVisa, selectedAttorney, error }: {
  form: { case_name: string; case_description: string; target_date: string; priority: string; internal_notes: string };
  selectedEmployee: { full_name: string; job_title: string | null; department: string | null } | null;
  selectedVisa: VisaTypeOption | null;
  selectedAttorney: { full_name: string; law_firm_name: string | null } | null;
  error: string | null;
}) {
  const priorityLabel: Record<string, string> = {
    standard: 'Standard',
    urgent: 'Urgent',
    premium: 'Premium Processing',
  };

  return (
    <div className="bg-white border border-[#e5e7eb] rounded-[12px] p-[28px] shadow-[0px_1px_1px_rgba(0,0,0,0.05)]">
      <div className="mb-[20px]">
        <h2 className="text-[18px] font-bold text-[#111827] tracking-[-0.5px]">Step 5: Review & Submit</h2>
        <p className="text-[14px] text-[#4b5563] mt-[4px]">
          Review all case details before submitting. Once created, the employee will receive a document checklist.
        </p>
      </div>

      <div className="flex flex-col gap-[16px]">
        {/* Employee */}
        <div className="border border-[#e5e7eb] rounded-[10px] overflow-hidden">
          <div className="bg-[#f9fafb] px-[16px] py-[10px] border-b border-[#e5e7eb]">
            <p className="text-[12px] font-semibold uppercase tracking-[0.05em] text-[#6b7280] flex items-center gap-[6px]">
              <User size={12} /> Employee
            </p>
          </div>
          <div className="px-[16px] py-[4px]">
            <ReviewRow label="Full Name"   value={selectedEmployee?.full_name ?? '—'} />
            <ReviewRow label="Job Title"   value={selectedEmployee?.job_title ?? '—'} />
            <ReviewRow label="Department"  value={selectedEmployee?.department ?? '—'} />
          </div>
        </div>

        {/* Visa */}
        <div className="border border-[#e5e7eb] rounded-[10px] overflow-hidden">
          <div className="bg-[#f9fafb] px-[16px] py-[10px] border-b border-[#e5e7eb]">
            <p className="text-[12px] font-semibold uppercase tracking-[0.05em] text-[#6b7280] flex items-center gap-[6px]">
              <Briefcase size={12} /> Visa Type
            </p>
          </div>
          <div className="px-[16px] py-[4px]">
            <ReviewRow label="Code"         value={selectedVisa?.code ?? '—'} />
            <ReviewRow label="Name"         value={selectedVisa?.name ?? '—'} />
            <ReviewRow label="Timeline"     value={selectedVisa?.timeline ?? '—'} />
            <ReviewRow label="LCA Required" value={selectedVisa?.lca_required ? 'Yes' : 'No'} />
          </div>
        </div>

        {/* Case details */}
        <div className="border border-[#e5e7eb] rounded-[10px] overflow-hidden">
          <div className="bg-[#f9fafb] px-[16px] py-[10px] border-b border-[#e5e7eb]">
            <p className="text-[12px] font-semibold uppercase tracking-[0.05em] text-[#6b7280] flex items-center gap-[6px]">
              <Tag size={12} /> Case Details
            </p>
          </div>
          <div className="px-[16px] py-[4px]">
            <ReviewRow label="Case Name"    value={form.case_name} />
            <ReviewRow label="Target Date"  value={fmtDate(form.target_date)} />
            <ReviewRow label="Priority"     value={priorityLabel[form.priority] ?? form.priority} />
            {form.case_description && (
              <ReviewRow label="Description" value={form.case_description} />
            )}
          </div>
        </div>

        {/* Attorney */}
        <div className="border border-[#e5e7eb] rounded-[10px] overflow-hidden">
          <div className="bg-[#f9fafb] px-[16px] py-[10px] border-b border-[#e5e7eb]">
            <p className="text-[12px] font-semibold uppercase tracking-[0.05em] text-[#6b7280] flex items-center gap-[6px]">
              <Scale size={12} /> Attorney
            </p>
          </div>
          <div className="px-[16px] py-[4px]">
            <ReviewRow label="Assigned To"
              value={selectedAttorney ? `${selectedAttorney.full_name}${selectedAttorney.law_firm_name ? ` · ${selectedAttorney.law_firm_name}` : ''}` : 'Not assigned (assign after creation)'}
            />
          </div>
        </div>

        {/* What happens next */}
        <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-[10px] p-[16px]">
          <p className="text-[13px] font-semibold text-[#15803d] mb-[8px] flex items-center gap-[6px]">
            <CheckCircle2 size={14} /> What happens after you submit
          </p>
          <ul className="flex flex-col gap-[6px]">
            {[
              'Case is created with status "In Progress"',
              'Employee receives document upload checklist',
              (_attorney: unknown) => selectedAttorney
                ? 'Attorney is notified and can begin case review'
                : 'You can assign an attorney from the case detail page',
              'All deadlines and milestones will be tracked automatically',
            ].map((item, i) => (
              <li key={i} className="text-[12px] text-[#166534] flex items-start gap-[6px]">
                <span className="mt-[3px] size-[4px] rounded-full bg-[#16a34a] shrink-0" />
                {typeof item === 'function' ? item(!!selectedAttorney) : item}
              </li>
            ))}
          </ul>
        </div>

        {error && (
          <div className="bg-[#fef2f2] border border-[#fecaca] rounded-[10px] p-[14px] flex items-start gap-[10px]">
            <AlertCircle size={16} className="text-[#dc2626] shrink-0 mt-[1px]" />
            <p className="text-[13px] text-[#dc2626]">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUCCESS STATE
// ─────────────────────────────────────────────────────────────────────────────

function SuccessScreen({ applicationNumber, employeeName, onViewCase, onCreateAnother }: {
  applicationNumber: string;
  employeeName: string;
  onViewCase: () => void;
  onCreateAnother: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-[60px] text-center max-w-[500px] mx-auto">
      <div className="size-[72px] rounded-full bg-[#dcfce7] flex items-center justify-center mb-[20px]">
        <CheckCircle2 size={36} className="text-[#16a34a]" />
      </div>
      <h2 className="text-[24px] font-bold text-[#111827] tracking-[-0.5px] mb-[8px]">Case Created!</h2>
      <p className="text-[15px] text-[#4b5563] mb-[4px]">
        Immigration case for <strong>{employeeName}</strong> has been created successfully.
      </p>
      <p className="text-[13px] font-mono text-indigo-600 bg-indigo-50 px-[12px] py-[4px] rounded-full border border-indigo-200 mt-[8px] mb-[28px]">
        Case #{applicationNumber}
      </p>
      <div className="flex items-center gap-[12px]">
        <button onClick={onViewCase}
          className="h-[44px] px-[20px] rounded-[10px] text-white text-[14px] font-semibold"
          style={{ backgroundImage: PRIMARY_GRADIENT }}>
          View Case
        </button>
        <button onClick={onCreateAnother}
          className="h-[44px] px-[20px] rounded-[10px] border border-[#e5e7eb] text-[14px] font-medium text-[#374151] hover:bg-[#f8fafc]">
          Create Another
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function HRCreateCase() {
  const navigate = useNavigate();
  const {
    step, form, update,
    employees, attorneys,
    selectedEmployee,
    empLoading, attLoading,
    canAdvance, next, back, goToStep,
    submitting, savingDraft, submitError, result,
    saveDraft, submit, reset,
  } = useCreateCase();

  const selectedVisa     = VISA_TYPES.find(v => v.code === form.visa_type_code) ?? null;
  const selectedAttorney = attorneys.find(a => a.user_id === form.attorney_id) ?? null;

  const progressPercent = Math.round(((step - 1) / (STEPS.length - 1)) * 100);

  const handleSubmit = async () => {
    const res = await submit();
    if (res) {
      // result is now set, success screen shows
    }
  };

  if (result) {
    return (
      <div className="flex flex-col h-full bg-[#f9fafb]" style={{ fontFamily: 'Inter, sans-serif' }}>
        <PageHeader
          title="Create New Case"
          subtitle="HR — Immigration case management"
          showSearch={false}
          showBell={false}
        />
        <PageContent>
          <SuccessScreen
            applicationNumber={result.application_number}
            employeeName={selectedEmployee?.full_name ?? 'Employee'}
            onViewCase={() => navigate(`/employer/cases/${result.id}`)}
            onCreateAnother={reset}
          />
        </PageContent>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#f9fafb]" style={{ fontFamily: 'Inter, sans-serif' }}>

      <PageHeader
        title="Create New Case"
        subtitle="HR — Initiate a new immigration case for your employee"
        showSearch={false}
        showBell={false}
        actions={
          <div className="flex items-center gap-[8px]">
            <button
              onClick={() => void saveDraft()}
              disabled={savingDraft || !form.selected_employee_id}
              className="flex items-center gap-[6px] h-[38px] px-[14px] rounded-[8px] border border-[#e5e7eb] text-[13px] font-medium text-[#374151] hover:bg-[#f8fafc] transition disabled:opacity-50">
              <Save size={13} className={savingDraft ? 'animate-spin' : ''} />
              {savingDraft ? 'Saving...' : 'Save Draft'}
            </button>
            <button
              onClick={() => navigate('/employer/dashboard')}
              className="flex items-center gap-[6px] h-[38px] px-[14px] rounded-[8px] border border-[#e5e7eb] text-[13px] font-medium text-[#374151] hover:bg-[#f8fafc] transition">
              <X size={13} /> Cancel
            </button>
          </div>
        }
      />

      <PageContent>
        <div className="flex flex-col gap-[20px]">

          {/* Progress header */}
          <div className="bg-white border border-[#e5e7eb] rounded-[14px] p-[24px] shadow-[0px_1px_2px_rgba(0,0,0,0.05)]">
            <div className="flex items-center justify-between mb-[20px]">
              <div>
                <h1 className="text-[20px] font-bold text-[#111827] tracking-[-0.5px]">Create New Immigration Case</h1>
                <p className="text-[13px] text-[#4b5563] mt-[2px]">Follow the steps below to initiate a visa application</p>
              </div>
              <div className="text-right">
                <p className="text-[12px] text-[#6b7280]">Progress</p>
                <p className="text-[18px] font-bold text-indigo-600">{progressPercent}%</p>
              </div>
            </div>

            <StepBar current={step} onGoTo={goToStep} />

            {/* Progress bar */}
            <div className="mt-[16px] h-[4px] bg-[#f1f5f9] rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500"
                   style={{ width: `${progressPercent}%`, backgroundImage: PRIMARY_GRADIENT }} />
            </div>

            {/* Auto-save indicator */}
            <div className="flex items-center justify-between mt-[10px]">
              <p className="text-[11px] text-[#9ca3af] flex items-center gap-[4px]">
                <CheckCircle2 size={10} className="text-[#16a34a]" /> Auto-save enabled
              </p>
              {selectedEmployee && (
                <p className="text-[11px] text-[#6b7280]">
                  Employee: <span className="font-semibold text-[#374151]">{selectedEmployee.full_name}</span>
                  {form.visa_type_code && <> · Visa: <span className="font-semibold text-indigo-600">{form.visa_type_code}</span></>}
                </p>
              )}
            </div>
          </div>

          {/* Main content + sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-[20px] items-start">

            {/* Left: step form */}
            <div className="flex flex-col gap-[20px]">
              {step === 1 && (
                <Step1Employee
                  employees={employees}
                  loading={empLoading}
                  selectedId={form.selected_employee_id}
                  onSelect={id => update('selected_employee_id', id)}
                />
              )}
              {step === 2 && (
                <Step2VisaType
                  selected={form.visa_type_code}
                  onSelect={code => update('visa_type_code', code)}
                />
              )}
              {step === 3 && (
                <Step3Details form={form} update={update as (k: 'case_name' | 'case_description' | 'target_date' | 'priority' | 'internal_notes', v: string) => void} />
              )}
              {step === 4 && (
                <Step4Attorney
                  attorneys={attorneys}
                  loading={attLoading}
                  selectedId={form.attorney_id}
                  onSelect={id => update('attorney_id', id)}
                />
              )}
              {step === 5 && (
                <Step5Review
                  form={form}
                  selectedEmployee={selectedEmployee}
                  selectedVisa={selectedVisa}
                  selectedAttorney={selectedAttorney}
                  error={submitError}
                />
              )}

              {/* Action buttons */}
              <div className="bg-white border border-[#e5e7eb] rounded-[12px] p-[20px] flex items-center justify-between shadow-[0px_1px_1px_rgba(0,0,0,0.05)]">
                <button
                  onClick={back}
                  disabled={step === 1}
                  className="flex items-center gap-[8px] h-[44px] px-[20px] rounded-[8px] border border-[#e5e7eb] text-[14px] font-medium text-[#374151] hover:bg-[#f8fafc] transition disabled:opacity-40 disabled:cursor-not-allowed">
                  <ChevronLeft size={15} /> Back
                </button>

                <div className="flex items-center gap-[10px]">
                  <button
                    onClick={() => void saveDraft()}
                    disabled={savingDraft || !form.selected_employee_id}
                    className="flex items-center gap-[8px] h-[44px] px-[18px] rounded-[8px] border border-[#e5e7eb] text-[14px] font-medium text-[#374151] hover:bg-[#f8fafc] transition disabled:opacity-50">
                    <Save size={14} className={savingDraft ? 'animate-spin' : ''} />
                    Save Draft
                  </button>

                  {step < 5 ? (
                    <button
                      onClick={next}
                      disabled={!canAdvance()}
                      className="flex items-center gap-[8px] h-[44px] px-[24px] rounded-[8px] text-white text-[14px] font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundImage: PRIMARY_GRADIENT }}>
                      Continue <ChevronRight size={15} />
                    </button>
                  ) : (
                    <button
                      onClick={() => void handleSubmit()}
                      disabled={submitting}
                      className="flex items-center gap-[8px] h-[44px] px-[24px] rounded-[8px] text-white text-[14px] font-semibold hover:opacity-90 transition disabled:opacity-60"
                      style={{ backgroundImage: PRIMARY_GRADIENT }}>
                      {submitting ? (
                        <><span className="animate-spin">⟳</span> Creating...</>
                      ) : (
                        <><CheckCircle2 size={15} /> Create Case</>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Right: sidebar */}
            <div className="flex flex-col gap-[16px] sticky top-[20px]">
              <HelpCard />
              {(step === 2 || step >= 3) && <RequirementsCard visa={selectedVisa} />}
              {(step === 2 || step >= 3) && <TimelineCard visa={selectedVisa} />}
              <TipsCard visaCode={form.visa_type_code} />
            </div>
          </div>
        </div>
      </PageContent>
    </div>
  );
}
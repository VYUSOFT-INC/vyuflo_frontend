// src/pages/lawyer/cases/NewCasePage.tsx
//
// 3-step wizard for lawyer to create a case after consultation.
//   Step 1: Visa Type (tabs: Work / Student / Dependent / Other)
//   Step 2: Basic Info (client + case name + target date + priority)
//   Step 3: Review & Create
//
// Route: /lawyer/cases/new
// Backend: POST /lawyer/cases (mocked when 404 — case still persists
// locally via lawyerLocalCases so it appears in the Cases list).

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  createNewCase,
  listConsultedClients,
  listVisaTypesForWizard,
} from "../../../api/lawyer/newCase.api";
import type {
  ConsultedClient,
  NewCaseCreateResponse,
  NewCasePriority,
  NewCaseStep,
  VisaCategory,
  VisaTypeOption,
} from "../../../types/lawyer/newCase.types";
import { appendLocalCase } from "../../../lib/lawyerLocalCases";

const CATEGORY_TABS: { id: VisaCategory; label: string; icon: string }[] = [
  { id: "work",      label: "Work Visas",       icon: "💼" },
  { id: "student",   label: "Student Visas",    icon: "🎓" },
  { id: "dependent", label: "Dependent Visas",  icon: "👨‍👩‍👧" },
  { id: "other",     label: "Other",            icon: "📋" },
];

const PRIORITIES: { id: NewCasePriority; label: string; color: string; desc: string }[] = [
  { id: "standard", label: "Standard",         color: "border-gray-300 text-gray-700",                    desc: "Normal processing" },
  { id: "urgent",   label: "Urgent",           color: "border-amber-300 text-amber-700 bg-amber-50",       desc: "Expedited review" },
  { id: "premium",  label: "Premium / Rush",   color: "border-rose-300 text-rose-700 bg-rose-50",          desc: "Highest priority" },
];

/* ══════════════════════════════════════════════════════════════════ */
export default function NewCasePage() {
  const navigate = useNavigate();

  const [step, setStep] = useState<NewCaseStep>("visa");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  /* ── Step 1 state ─────────────────────────────────────────────── */
  const [visaTypes, setVisaTypes] = useState<VisaTypeOption[]>([]);
  const [visaLoading, setVisaLoading] = useState(true);
  const [category, setCategory] = useState<VisaCategory>("work");
  const [selectedVisa, setSelectedVisa] = useState<VisaTypeOption | null>(null);

  useEffect(() => {
    (async () => {
      setVisaLoading(true);
      setVisaTypes(await listVisaTypesForWizard());
      setVisaLoading(false);
    })();
  }, []);

  const filteredVisas = useMemo(
    () => visaTypes.filter(v => v.category === category),
    [visaTypes, category]
  );

  /* ── Step 2 state ─────────────────────────────────────────────── */
  const [clients, setClients] = useState<ConsultedClient[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [clientId, setClientId] = useState<string>("");
  const [caseName, setCaseName] = useState<string>("");
  const [targetDate, setTargetDate] = useState<string>("");
  const [priority, setPriority] = useState<NewCasePriority>("standard");

  useEffect(() => {
    (async () => {
      setClientsLoading(true);
      setClients(await listConsultedClients());
      setClientsLoading(false);
    })();
  }, []);

  const selectedClient = clients.find(c => c.user_id === clientId) ?? null;

  // Auto-suggest case name when visa + client are picked
  useEffect(() => {
    if (selectedVisa && selectedClient && !caseName.trim()) {
      setCaseName(`${selectedVisa.code} — ${selectedClient.full_name}`);
    }
  }, [selectedVisa, selectedClient, caseName]);

  /* ── Step 3 state ─────────────────────────────────────────────── */
  const [result, setResult] = useState<NewCaseCreateResponse | null>(null);

  /* ── Navigation guards ────────────────────────────────────────── */
  const canGoToBasic  = Boolean(selectedVisa);
  const canGoToReview = Boolean(selectedVisa && clientId && caseName.trim().length >= 3);

  const submit = async () => {
    if (!selectedVisa || !clientId || !selectedClient) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await createNewCase({
        client_user_id: clientId,
        visa_type_code: selectedVisa.code,
        case_name:      caseName.trim(),
        target_date:    targetDate || undefined,
        priority,
        source:         "consultation",
      });

      // Persist locally so the newly-created case appears in the
      // Cases list even before backend POST /lawyer/cases is wired.
      appendLocalCase({
        id:              res.id,
        case_reference:  res.case_number,
        client_user_id:  clientId,
        client_name:     selectedClient.full_name,
        client_email:    selectedClient.email,
        visa_type_code:  selectedVisa.code,
        visa_type_label: selectedVisa.name,
        case_name:       caseName.trim(),
        target_date:     targetDate || undefined,
        priority,
        created_at:      res.created_at,
      });

      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create case.");
    } finally {
      setSubmitting(false);
    }
  };

  /* ══════════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-8">

        {/* Breadcrumb */}
        <button onClick={() => navigate("/lawyer/cases")}
          className="mb-4 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline cursor-pointer">
          ← Back to Cases
        </button>

        {result ? (
          <SuccessCard result={result} onDone={() => navigate("/lawyer/cases")} />
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Create New Case</h1>
                <p className="mt-1 text-sm text-slate-600">Set up a case for a client after your consultation.</p>
              </div>
            </div>

            <Stepper current={step} canBasic={canGoToBasic} canReview={canGoToReview}
              onStepClick={(s) => {
                if (s === "visa") { setStep("visa"); return; }
                if (s === "basic"  && canGoToBasic)  { setStep("basic");  return; }
                if (s === "review" && canGoToReview) { setStep("review"); return; }
              }}
            />

            {step === "visa" && (
              <VisaStep
                loading={visaLoading}
                visas={filteredVisas}
                category={category} onCategoryChange={setCategory}
                selectedVisa={selectedVisa} onVisaChange={setSelectedVisa}
                onCancel={() => navigate("/lawyer/cases")}
                onNext={() => setStep("basic")}
                canNext={canGoToBasic}
              />
            )}

            {step === "basic" && selectedVisa && (
              <BasicStep
                selectedVisa={selectedVisa}
                clients={clients} clientsLoading={clientsLoading}
                clientId={clientId} onClientChange={setClientId}
                caseName={caseName} onCaseNameChange={setCaseName}
                targetDate={targetDate} onTargetDateChange={setTargetDate}
                priority={priority} onPriorityChange={setPriority}
                onBack={() => setStep("visa")}
                onNext={() => setStep("review")}
                canNext={canGoToReview}
              />
            )}

            {step === "review" && selectedVisa && selectedClient && (
              <ReviewStep
                visa={selectedVisa}
                client={selectedClient}
                caseName={caseName}
                targetDate={targetDate}
                priority={priority}
                submitting={submitting}
                error={error}
                onBack={() => setStep("basic")}
                onSubmit={submit}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
 *  STEPPER
 * ══════════════════════════════════════════════════════════════════ */
function Stepper({ current, canBasic, canReview, onStepClick }: {
  current:    NewCaseStep;
  canBasic:   boolean;
  canReview:  boolean;
  onStepClick: (s: NewCaseStep) => void;
}) {
  const steps: { id: NewCaseStep; label: string }[] = [
    { id: "visa",   label: "Visa Type"  },
    { id: "basic",  label: "Basic Info" },
    { id: "review", label: "Review"     },
  ];
  const idx = steps.findIndex(s => s.id === current);
  return (
    <div className="mt-5 mb-6 rounded-xl border border-gray-200 bg-white px-3 py-3 md:px-4">
      <div className="flex items-center justify-between gap-2">
        {steps.map((s, i) => {
          const isDone    = i < idx;
          const isCurrent = i === idx;
          const reachable =
            s.id === "visa" ||
            (s.id === "basic"  && canBasic) ||
            (s.id === "review" && canReview);
          return (
            <div key={s.id} className="flex items-center gap-1 sm:gap-2 min-w-0 shrink">
              <button type="button" disabled={!reachable} onClick={() => onStepClick(s.id)}
                className={`flex items-center gap-1.5 sm:gap-2 rounded-lg px-1 py-0.5 -mx-1 ${
                  reachable ? "hover:bg-gray-50 cursor-pointer" : "cursor-default"
                }`}>
                <div className={`flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  isDone    ? "bg-emerald-500 text-white"
                  : isCurrent ? "bg-gradient-to-br from-indigo-600 to-purple-600 text-white"
                              : "bg-gray-100 text-gray-400"
                }`}>{isDone ? "✓" : i + 1}</div>
                <p className={`text-xs sm:text-sm font-semibold truncate ${isDone || isCurrent ? "text-gray-900" : "text-gray-500"}`}>{s.label}</p>
              </button>
              {i < steps.length - 1 && <div className={`h-0.5 flex-1 min-w-[12px] ${isDone ? "bg-emerald-500" : "bg-gray-200"}`} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
 *  STEP 1 — VISA TYPE
 * ══════════════════════════════════════════════════════════════════ */
function VisaStep(props: {
  loading: boolean;
  visas: VisaTypeOption[];
  category: VisaCategory; onCategoryChange: (c: VisaCategory) => void;
  selectedVisa: VisaTypeOption | null; onVisaChange: (v: VisaTypeOption) => void;
  onCancel: () => void; onNext: () => void; canNext: boolean;
}) {
  const { loading, visas, category, onCategoryChange, selectedVisa, onVisaChange, onCancel, onNext, canNext } = props;
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 md:p-6">
      <h2 className="text-lg font-bold text-gray-900">Step 1: Select Visa Type</h2>
      <p className="mt-0.5 text-sm text-gray-500">Choose the visa category that applies to your client.</p>

      {/* Tabs */}
      <div className="mt-5 flex flex-wrap gap-2 border-b border-gray-200 pb-2">
        {CATEGORY_TABS.map(t => {
          const active = t.id === category;
          return (
            <button key={t.id} type="button" onClick={() => onCategoryChange(t.id)}
              className={`inline-flex items-center gap-1.5 rounded-t-lg px-3 py-2 text-sm font-semibold transition-colors cursor-pointer ${
                active ? "border-b-2 border-indigo-600 text-indigo-700"
                       : "text-gray-600 hover:text-gray-900"
              }`}>
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="mt-6 flex items-center justify-center py-12 text-sm text-gray-500">Loading visa types…</div>
      ) : visas.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
          No visa types in this category.
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visas.map(v => {
            const active = selectedVisa?.code === v.code;
            return (
              <button key={v.code} type="button" onClick={() => onVisaChange(v)}
                className={`text-left rounded-xl border-2 p-4 transition-all cursor-pointer ${
                  active ? "border-indigo-500 bg-indigo-50 shadow-sm"
                         : "border-gray-200 bg-white hover:border-indigo-300 hover:shadow-sm"
                }`}>
                <div className="flex items-start justify-between gap-2">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg text-lg ${
                    active ? "bg-gradient-to-br from-indigo-500 to-purple-600" : "bg-gray-100"
                  }`}>
                    <span>{v.icon}</span>
                  </div>
                  <span className={`h-4 w-4 rounded-full border-2 ${active ? "border-indigo-600 bg-indigo-600" : "border-gray-300 bg-white"}`} />
                </div>
                <p className="mt-3 text-sm font-bold text-gray-900">{v.name}</p>
                <p className="mt-1 text-xs text-gray-500 leading-relaxed line-clamp-2">{v.description}</p>
                <div className="mt-3 flex items-center gap-3 text-[10px] text-gray-500">
                  <span>⏱ {v.duration}</span>
                  <span>📄 {v.doc_count} docs</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <button onClick={onCancel}
          className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer">
          Cancel
        </button>
        <button onClick={onNext} disabled={!canNext}
          className="rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
          Continue →
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
 *  STEP 2 — BASIC INFO
 * ══════════════════════════════════════════════════════════════════ */
function BasicStep(props: {
  selectedVisa: VisaTypeOption;
  clients: ConsultedClient[]; clientsLoading: boolean;
  clientId: string; onClientChange: (id: string) => void;
  caseName: string; onCaseNameChange: (v: string) => void;
  targetDate: string; onTargetDateChange: (v: string) => void;
  priority: NewCasePriority; onPriorityChange: (p: NewCasePriority) => void;
  onBack: () => void; onNext: () => void; canNext: boolean;
}) {
  const { selectedVisa, clients, clientsLoading,
          clientId, onClientChange, caseName, onCaseNameChange,
          targetDate, onTargetDateChange, priority, onPriorityChange,
          onBack, onNext, canNext } = props;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 md:p-6">
      <h2 className="text-lg font-bold text-gray-900">Step 2: Basic Info</h2>
      <p className="mt-0.5 text-sm text-gray-500">Fill in the essentials — you can refine details inside the case later.</p>

      {/* Selected visa reminder */}
      <div className="mt-4 flex items-center gap-2 rounded-lg bg-indigo-50 border border-indigo-200 px-3 py-2">
        <span className="text-lg">{selectedVisa.icon}</span>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-700">Selected visa</p>
          <p className="text-sm font-bold text-gray-900">{selectedVisa.name}</p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {/* Client */}
        <Field label="Client" required>
          {clientsLoading ? (
            <p className="text-xs text-gray-500">Loading consulted clients…</p>
          ) : clients.length === 0 ? (
            <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
              No consulted clients found. Book a consultation first — clients appear here after the meeting.
            </div>
          ) : (
            <select value={clientId} onChange={(e) => onClientChange(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100">
              <option value="">— Select a client —</option>
              {clients.map(c => (
                <option key={c.user_id} value={c.user_id}>
                  {c.full_name} · {c.email}
                </option>
              ))}
            </select>
          )}
        </Field>

        {/* Case name */}
        <Field label="Case name / title" required>
          <input type="text" value={caseName} onChange={(e) => onCaseNameChange(e.target.value)}
            placeholder="e.g. H-1B — John Doe"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
          <p className="mt-1 text-[10px] text-gray-500">At least 3 characters. Auto-suggested from visa + client.</p>
        </Field>

        {/* Target date */}
        <Field label="Target filing date">
          <input type="date" value={targetDate} onChange={(e) => onTargetDateChange(e.target.value)}
            min={new Date().toISOString().slice(0, 10)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
          <p className="mt-1 text-[10px] text-gray-500">Optional — when you plan to file with USCIS.</p>
        </Field>

        {/* Priority */}
        <Field label="Priority">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {PRIORITIES.map(p => {
              const active = priority === p.id;
              return (
                <button key={p.id} type="button" onClick={() => onPriorityChange(p.id)}
                  className={`text-left rounded-lg border-2 px-3 py-2 transition-colors cursor-pointer ${
                    active
                      ? "border-indigo-500 bg-indigo-50"
                      : `${p.color} bg-white hover:border-indigo-300`
                  }`}>
                  <p className="text-sm font-bold">{p.label}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{p.desc}</p>
                </button>
              );
            })}
          </div>
        </Field>
      </div>

      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <button onClick={onBack}
          className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer">
          ← Back
        </button>
        <button onClick={onNext} disabled={!canNext}
          className="rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
          Continue →
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
 *  STEP 3 — REVIEW
 * ══════════════════════════════════════════════════════════════════ */
function ReviewStep(props: {
  visa: VisaTypeOption;
  client: ConsultedClient;
  caseName: string;
  targetDate: string;
  priority: NewCasePriority;
  submitting: boolean;
  error: string | null;
  onBack: () => void;
  onSubmit: () => void;
}) {
  const { visa, client, caseName, targetDate, priority, submitting, error, onBack, onSubmit } = props;
  const prio = PRIORITIES.find(p => p.id === priority)!;
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 md:p-6">
      <h2 className="text-lg font-bold text-gray-900">Step 3: Review &amp; Create</h2>
      <p className="mt-0.5 text-sm text-gray-500">Confirm the details below. You can edit inside Case Detail later.</p>

      <div className="mt-5 space-y-3">
        <Row k="Client"       v={<><span className="font-semibold">{client.full_name}</span> <span className="text-gray-500">· {client.email}</span></>} />
        <Row k="Visa type"    v={<><span className="font-semibold">{visa.name}</span> <span className="text-gray-500">({visa.code})</span></>} />
        <Row k="Case name"    v={caseName} />
        <Row k="Target date"  v={targetDate ? new Date(targetDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : <span className="text-gray-400 italic">Not set</span>} />
        <Row k="Priority"     v={<span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold border ${prio.color}`}>{prio.label}</span>} />
      </div>

      {error && <p className="mt-4 rounded-md bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">{error}</p>}

      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <button onClick={onBack} disabled={submitting}
          className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 cursor-pointer">
          ← Back
        </button>
        <button onClick={onSubmit} disabled={submitting}
          className="rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-sm cursor-pointer">
          {submitting ? "Creating…" : "Create case ✓"}
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
 *  SUCCESS CARD
 * ══════════════════════════════════════════════════════════════════ */
function SuccessCard({ result, onDone }: { result: NewCaseCreateResponse; onDone: () => void }) {
  return (
    <div className="mx-auto max-w-lg text-center py-6">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-3xl">✓</div>
      <h1 className="mt-4 text-2xl font-bold text-gray-900">Case created</h1>
      <p className="mt-1 text-sm text-gray-600">{result.case_number}</p>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5 text-left">
        <Row k="Case number" v={result.case_number} />
        <Row k="Status"      v={result.status.replace(/_/g, " ")} />
        <Row k="Created"     v={new Date(result.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} />
      </div>

      {result.message?.includes("mock") && (
        <p className="mt-3 rounded-md bg-amber-50 border border-amber-200 px-3 py-1.5 text-[11px] text-amber-800">
          ⚠ Backend endpoint not yet wired — case saved locally.
        </p>
      )}

      <div className="mt-6">
        <button onClick={onDone}
          className="rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-2.5 text-sm font-bold text-white cursor-pointer">
          Back to Cases
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
 *  Helpers
 * ══════════════════════════════════════════════════════════════════ */
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}
function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2 border-b border-gray-100 py-2.5 last:border-b-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{k}</dt>
      <dd className="text-sm text-gray-900">{v}</dd>
    </div>
  );
}
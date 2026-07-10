// src/hooks/hr/useCreateCase.ts
//
// Changes from previous version:
//   - Removed getVisaTypes() call (no longer needed — backend resolves from code)
//   - submit() sends employee_link_id directly (not user_id lookup)
//   - saveDraft() requires step 1+2 to be complete (employee + visa)
//   - form.attorney_id maps to attorney_user_id in the request
//   - Result is HRCaseCreateResponse (slim, not full ApplicationResponse)

import { useState, useEffect, useCallback, useRef } from 'react';
import { createCaseApi } from '../../api/hr/createCase.api';
import type {
  CreateCaseForm,
  EmployeeOption,
  AttorneyOption,
  HRCaseCreateResponse,
  // HRCasePriority,
  CaseStep,
} from '../../types/hr/createCase.types';

const INITIAL_FORM: CreateCaseForm = {
  selected_employee_id: null,
  visa_type_code:       null,
  case_name:            '',
  case_description:     '',
  target_date:          '',
  priority:             'standard',
  internal_notes:       '',
  attorney_id:          null,
  sponsor_employer:     '',
};

export function useCreateCase() {
  const [step, setStep]             = useState<CaseStep>(1);
  const [form, setForm]             = useState<CreateCaseForm>(INITIAL_FORM);

  const [employees, setEmployees]   = useState<EmployeeOption[]>([]);
  const [attorneys, setAttorneys]   = useState<AttorneyOption[]>([]);
  const [empLoading, setEmpLoading] = useState(true);
  const [attLoading, setAttLoading] = useState(false);

  const [submitting, setSubmitting]   = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult]           = useState<HRCaseCreateResponse | null>(null);

  // ── Load employees once on mount ──────────────────────────────────────────
  useEffect(() => {
    setEmpLoading(true);
    createCaseApi.getEmployees()
      .then(setEmployees)
      .catch(() => setEmployees([]))
      .finally(() => setEmpLoading(false));
  }, []);

  // ── Load attorneys lazily when reaching step 4 ───────────────────────────
  useEffect(() => {
    if (step === 4 && attorneys.length === 0 && !attLoading) {
      setAttLoading(true);
      createCaseApi.getAttorneys()
        .then(setAttorneys)
        .catch(() => setAttorneys([]))
        .finally(() => setAttLoading(false));
    }
  }, [step]);

  // ── Derived values ────────────────────────────────────────────────────────
  const selectedEmployee = employees.find(e => e.id === form.selected_employee_id) ?? null;
  const selectedAttorney = attorneys.find(a => a.user_id === form.attorney_id) ?? null;

  // ── Generic field updater ─────────────────────────────────────────────────
  const update = useCallback(<K extends keyof CreateCaseForm>(
    key: K,
    value: CreateCaseForm[K],
  ) => {
    setForm(f => ({ ...f, [key]: value }));
  }, []);

  // ── Auto-generate case name when both employee + visa are selected ────────
  const autoNameRef = useRef(false);
  useEffect(() => {
    if (
      selectedEmployee &&
      form.visa_type_code &&
      !form.case_name &&
      !autoNameRef.current
    ) {
      autoNameRef.current = true;
      const year = new Date().getFullYear();
      setForm(f => ({
        ...f,
        case_name: `${selectedEmployee.full_name} - ${form.visa_type_code} ${year}`,
      }));
    }
    // Reset auto-name guard when employee or visa changes
    if (!form.visa_type_code || !form.selected_employee_id) {
      autoNameRef.current = false;
    }
  }, [form.visa_type_code, form.selected_employee_id]);

  // ── Step validation ───────────────────────────────────────────────────────
  const canAdvance = useCallback((): boolean => {
    switch (step) {
      case 1: return !!form.selected_employee_id;
      case 2: return !!form.visa_type_code;
      case 3: return form.case_name.trim().length >= 3 && !!form.target_date;
      case 4: return true;   // attorney is optional
      case 5: return false;  // submit button handles step 5
      default: return false;
    }
  }, [step, form]);

  const next = useCallback(() => {
    if (canAdvance() && step < 5) setStep(s => (s + 1) as CaseStep);
  }, [canAdvance, step]);

  const back = useCallback(() => {
    if (step > 1) setStep(s => (s - 1) as CaseStep);
  }, [step]);

  const goToStep = useCallback((s: CaseStep) => {
    if (s < step) setStep(s);   // only allow navigating back
  }, [step]);

  // ── Save Draft ───────────────────────────────────────────────────────────
  // Requires step 1 + 2 to be complete (employee + visa).
  // Backend needs employee_link_id + visa_type_code + case_name minimum.
  const saveDraft = useCallback(async () => {
    if (!form.selected_employee_id || !form.visa_type_code) return;
    setSavingDraft(true);
    try {
      const year = new Date().getFullYear();
      await createCaseApi.saveDraft({
        employee_link_id: form.selected_employee_id,
        visa_type_code:   form.visa_type_code,
        case_name:        form.case_name || `${selectedEmployee?.full_name ?? 'Employee'} - ${form.visa_type_code} ${year}`,
        case_description: form.case_description || undefined,
        target_date:      form.target_date || undefined,
        priority:         form.priority,
        internal_notes:   form.internal_notes || undefined,
        attorney_user_id: form.attorney_id || undefined,
        sponsor_employer: form.sponsor_employer || undefined,
      });
    } catch {
      // Silent fail — draft save is best-effort
    } finally {
      setSavingDraft(false);
    }
  }, [form, selectedEmployee]);

  // ── Submit ────────────────────────────────────────────────────────────────
  const submit = useCallback(async (): Promise<HRCaseCreateResponse | null> => {
    // Validate required fields
    if (!form.selected_employee_id) {
      setSubmitError('Please select an employee.');
      return null;
    }
    if (!form.visa_type_code) {
      setSubmitError('Please select a visa type.');
      return null;
    }
    if (form.case_name.trim().length < 3) {
      setSubmitError('Case name must be at least 3 characters.');
      return null;
    }
    if (!form.target_date) {
      setSubmitError('Please set a target submission date.');
      return null;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await createCaseApi.createCase({
        // ── Required ──────────────────────────────────────────────────────
        employee_link_id: form.selected_employee_id,  // employer_employees.id
        visa_type_code:   form.visa_type_code,         // "H-1B" — backend resolves
        case_name:        form.case_name.trim(),

        // ── Optional ──────────────────────────────────────────────────────
        case_description: form.case_description || undefined,
        target_date:      form.target_date || undefined,
        priority:         form.priority,
        internal_notes:   form.internal_notes || undefined,
        attorney_user_id: form.attorney_id || undefined,
        sponsor_employer: form.sponsor_employer || undefined,

        // NOTE: assigned_hr_id is NOT sent — backend sets it from current_user
        // NOTE: visa_type UUID is NOT sent — backend resolves from visa_type_code
      });

      setResult(res);
      return res;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create case. Please try again.';
      setSubmitError(msg);
      return null;
    } finally {
      setSubmitting(false);
    }
  }, [form]);

  // ── Reset ─────────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    setForm(INITIAL_FORM);
    setStep(1);
    setResult(null);
    setSubmitError(null);
    autoNameRef.current = false;
  }, []);

  return {
    // State
    step,
    form,
    update,

    // Data
    employees,
    attorneys,
    selectedEmployee,
    selectedAttorney,
    empLoading,
    attLoading,

    // Navigation
    canAdvance,
    next,
    back,
    goToStep,

    // Async actions
    submitting,
    savingDraft,
    submitError,
    result,
    saveDraft,
    submit,
    reset,
  };
}
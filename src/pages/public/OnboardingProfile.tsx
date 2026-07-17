import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChevronDown } from 'lucide-react';

// const LOGO_ICON      = 'https://www.figma.com/api/mcp/asset/856c0817-d5ae-444d-8fb2-ce0d186348cc';
// const STEP1_CHECK    = 'https://www.figma.com/api/mcp/asset/4648af42-196b-4266-92e4-7ab1abaa554d';
// const ICON_DASHBOARD = 'https://www.figma.com/api/mcp/asset/c8cd24ef-7ea7-4006-b155-838cd34a3449';
// const ICON_CASE      = 'https://www.figma.com/api/mcp/asset/44d167ec-293e-4c4c-8999-dce3dce2c3af';
// const ICON_NEWS      = 'https://www.figma.com/api/mcp/asset/03965a3f-4044-431d-8f1d-5dde8bc2ffb1';
// const ICON_CONTINUE  = 'https://www.figma.com/api/mcp/asset/21b4034a-04c7-4f18-9993-30f5fec38af5';
// const ICON_AES       = 'https://www.figma.com/api/mcp/asset/114123b9-9195-47b4-aaa2-c110fd824843';
// const ICON_SOC2      = 'https://www.figma.com/api/mcp/asset/88a670b3-ce57-4e5a-9294-6a3be06b2a1d';
// const ICON_GDPR      = 'https://www.figma.com/api/mcp/asset/0a342781-ff90-4b0e-9a6a-821f1c4f961c';
// const ICON_PRIVACY   = 'https://www.figma.com/api/mcp/asset/12f3c554-17c7-4b6c-b90c-7f7e4267e3fb';

import LOGO_ICON     from "../../assets/icons/logo-icon.svg";
import STEP1_CHECK   from "../../assets/icons/step1-check.svg";
import ICON_DASHBOARD from "../../assets/icons/dash-icon.svg";
import ICON_CASE     from "../../assets/icons/icon-case.svg";
import ICON_NEWS     from "../../assets/icons/icon-news.svg";
import ICON_CONTINUE from "../../assets/icons/icon-continue.svg";
import ICON_AES      from "../../assets/icons/icon-aes.svg";
import ICON_SOC2     from "../../assets/icons/icon-soc2.svg";
import ICON_GDPR     from "../../assets/icons/icon-gdpr.svg";
import ICON_PRIVACY  from "../../assets/icons/icon-privacy.svg";

const VISA_TYPES = ['Work Visa', 'Student Visa', 'Family Reunion', 'Tourist Visa', 'Permanent Residency', 'Asylum'];

const CASE_TYPES = [
  { id: 'new',       label: 'New Application', desc: 'Starting a fresh immigration case' },
  { id: 'renewal',  label: 'Renewal',          desc: 'Renewing an existing visa or status' },
  { id: 'transfer', label: 'Transfer',         desc: 'Changing employer or visa status' },
  { id: 'extension',label: 'Extension',        desc: 'Extending your current authorization' },
];

const GENDERS   = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];
const COUNTRIES = ['United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France', 'India', 'China', 'Japan', 'Brazil'];
const TIMEZONES = [
  '(UTC-8:00) Pacific Time', '(UTC-7:00) Mountain Time', '(UTC-6:00) Central Time',
  '(UTC-5:00) Eastern Time', '(UTC+0:00) London', '(UTC+1:00) Paris',
  '(UTC+5:30) India Standard', '(UTC+8:00) China Standard',
];
const LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Mandarin', 'Hindi', 'Arabic', 'Portuguese'];

const schema = z.object({
  legal_first_name:    z.string().min(1, 'Legal first name is required'),
  legal_last_name:     z.string().min(1, 'Legal last name is required'),
  date_of_birth:       z.string().min(1, 'Date of birth is required'),
  gender:              z.string().optional(),
  nationality:         z.string().optional(),
  country_of_residence:z.string().optional(),
  case_type:           z.string().optional(),
  timezone:            z.string().optional(),
  language:            z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const inputCls =
  'block w-full rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 text-sm px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-[#4f46e5] transition-colors';

function SelectField({ label, name, options, register }: {
  label: string;
  name: keyof FormData;
  options: string[];
  register: ReturnType<typeof useForm<FormData>>['register'];
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <div className="relative">
        <select
          {...register(name)}
          className={`${inputCls} pr-10 appearance-none`}
          defaultValue=""
        >
          <option value="" disabled>Select {label.toLowerCase()}</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <span className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </span>
      </div>
    </div>
  );
}

export default function OnboardingProfile() {
  const navigate = useNavigate();
  const [selectedVisaTypes, setSelectedVisaTypes] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const caseType = watch('case_type');

  const toggleVisa = (type: string) =>
    setSelectedVisaTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    try {
      sessionStorage.setItem('onboarding_profile', JSON.stringify({ ...data, visa_types: selectedVisaTypes }));
      navigate('/onboarding/verify');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <img src={LOGO_ICON} alt="Vyuflo" className="w-8 h-8" />
            <span className="text-lg font-semibold text-gray-900">Vyuflo</span>
          </div>

          {/* Progress steps */}
          <div className="flex items-center gap-2">
            {/* Step 1 – done */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#4f46e5] flex items-center justify-center">
                <img src={STEP1_CHECK} alt="" className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium text-[#4f46e5] hidden sm:block">Account Created</span>
            </div>
            <div className="w-10 h-0.5 bg-[#4f46e5]" />
            {/* Step 2 – active */}
            <div className="flex items-center gap-2">
              <div className="relative flex items-center justify-center">
                <div className="absolute w-11 h-11 rounded-full bg-[#4f46e5]/20" />
                <div className="relative w-8 h-8 rounded-full bg-[#4f46e5] flex items-center justify-center text-white text-sm font-bold">
                  2
                </div>
              </div>
              <span className="text-sm font-semibold text-[#4f46e5] hidden sm:block">Profile Setup</span>
            </div>
            <div className="w-10 h-0.5 bg-gray-300" />
            {/* Step 3 – pending */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm font-semibold">
                3
              </div>
              <span className="text-sm font-medium text-gray-400 hidden sm:block">Verification</span>
            </div>
          </div>

          <span className="text-sm text-gray-500">Step 2 of 3</span>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex gap-8 items-start">
        {/* Left sidebar */}
        <aside className="hidden lg:block w-72 shrink-0 sticky top-8">
          <div
            className="rounded-2xl p-6 text-white"
            style={{ background: 'linear-gradient(160deg, #4f46e5, #7c3aed)' }}
          >
            <h2 className="text-xl font-bold mb-1">Complete Your Profile</h2>
            <p className="text-indigo-200 text-sm mb-6">
              Help us personalize your Vyuflo experience
            </p>

            <div className="space-y-5">
              {[
                { icon: ICON_DASHBOARD, title: 'Personalized Dashboard', desc: 'Tailored to your immigration goals' },
                { icon: ICON_CASE,      title: 'Faster Case Setup',       desc: 'Pre-filled forms save you time' },
                { icon: ICON_NEWS,      title: 'Relevant Immigration News', desc: 'Updates that match your visa type' },
              ].map(({ icon, title, desc }) => (
                <div key={title} className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                    <img src={icon} alt="" className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{title}</p>
                    <p className="text-indigo-200 text-xs mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Progress */}
            <div className="mt-8 pt-6 border-t border-white/20">
              <div className="flex justify-between text-xs mb-2">
                <span className="text-indigo-200">Profile completion</span>
                <span className="font-semibold">45%</span>
              </div>
              <div className="w-full rounded-full h-2 bg-white/25">
                <div className="rounded-full h-2 bg-white" style={{ width: '45%' }} />
              </div>
              <p className="text-indigo-200 text-xs mt-2">Complete all sections for the best experience</p>
            </div>
          </div>
        </aside>

        {/* Main form */}
        <main className="flex-1 min-w-0">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

            {/* ── Personal Details ── */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-0.5">Personal Details</h3>
              <p className="text-sm text-gray-500 mb-6">
                Your legal information as it appears on official documents
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Legal First Name</label>
                  <input
                    {...register('legal_first_name')}
                    placeholder="As on passport"
                    className={inputCls}
                  />
                  {errors.legal_first_name && (
                    <p className="mt-1.5 text-sm text-red-600">{errors.legal_first_name.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Legal Last Name</label>
                  <input
                    {...register('legal_last_name')}
                    placeholder="As on passport"
                    className={inputCls}
                  />
                  {errors.legal_last_name && (
                    <p className="mt-1.5 text-sm text-red-600">{errors.legal_last_name.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Date of Birth</label>
                  <input
                    type="date"
                    {...register('date_of_birth')}
                    className={inputCls}
                  />
                  {errors.date_of_birth && (
                    <p className="mt-1.5 text-sm text-red-600">{errors.date_of_birth.message}</p>
                  )}
                </div>
                <SelectField label="Gender"               name="gender"              options={GENDERS}   register={register} />
                <SelectField label="Nationality"          name="nationality"         options={COUNTRIES} register={register} />
                <SelectField label="Country of Residence" name="country_of_residence" options={COUNTRIES} register={register} />
              </div>
            </div>

            {/* ── Immigration Preferences ── */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-0.5">Immigration Preferences</h3>
              <p className="text-sm text-gray-500 mb-6">
                Tell us about your immigration goals so we can customize your experience
              </p>

              {/* Visa type chips */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Visa Types <span className="text-gray-400 font-normal">(select all that apply)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {VISA_TYPES.map(type => {
                    const active = selectedVisaTypes.includes(type);
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => toggleVisa(type)}
                        className="px-4 py-1.5 rounded-full text-sm font-medium border transition-all"
                        style={active
                          ? { background: '#4f46e5', color: 'white', borderColor: '#4f46e5' }
                          : { background: 'white', color: '#374151', borderColor: '#d1d5db' }
                        }
                      >
                        {type}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Case type radio cards */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Case Type</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {CASE_TYPES.map(ct => (
                    <label
                      key={ct.id}
                      className="flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all"
                      style={{
                        borderColor: caseType === ct.id ? '#4f46e5' : '#e5e7eb',
                        background:  caseType === ct.id ? '#eef2ff' : 'white',
                      }}
                    >
                      <input
                        type="radio"
                        value={ct.id}
                        {...register('case_type')}
                        className="mt-0.5 accent-[#4f46e5] shrink-0"
                      />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{ct.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{ct.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Account Preferences ── */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-0.5">Account Preferences</h3>
              <p className="text-sm text-gray-500 mb-6">Customize your Vyuflo experience</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SelectField label="Timezone"          name="timezone"  options={TIMEZONES} register={register} />
                <SelectField label="Preferred Language" name="language" options={LANGUAGES} register={register} />
              </div>
            </div>

            {/* ── Actions ── */}
            <div className="flex items-center justify-between pb-2">
              <button
                type="button"
                onClick={() => navigate('/signup')}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                ← Back
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 text-white text-sm font-semibold px-7 py-3 rounded-xl transition-colors disabled:opacity-60"
                style={{ background: '#4f46e5' }}
                onMouseEnter={e => { if (!submitting) (e.currentTarget.style.background = '#4338ca'); }}
                onMouseLeave={e => { e.currentTarget.style.background = '#4f46e5'; }}
              >
                {submitting ? 'Saving…' : 'Continue to Verification'}
                {!submitting && <img src={ICON_CONTINUE} alt="" className="w-4 h-4" />}
              </button>
            </div>
          </form>

          {/* Security badges */}
          <div className="mt-8 pb-10 flex flex-wrap justify-center gap-6">
            {[
              { icon: ICON_AES,     label: 'AES-256 Encryption' },
              { icon: ICON_SOC2,    label: 'SOC 2 Certified' },
              { icon: ICON_GDPR,    label: 'GDPR Compliant' },
              { icon: ICON_PRIVACY, label: 'Privacy Protected' },
            ].map(({ icon, label }) => (
              <div key={label} className="flex items-center gap-1.5 text-gray-400 text-xs">
                <img src={icon} alt="" className="w-4 h-4" />
                {label}
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

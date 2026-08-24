// src/pages/lawyer/settings/LawyerSettingsPage.tsx
//
// Figma node 97:612 — Lawyer Profile & Settings (Screen 13).
//
// ── LAWYER USE CASE ─────────────────────────────────────────────────
//   Foundational profile screen that 8+ other modules consume:
//     • Bar Association ID + State — required on every USCIS filing
//     • Law firm name              — invoices, templates, signatures
//     • Monthly billing target     — drives Analytics utilization KPI
//     • Timezone + language        — calendar, deadlines, messages
//     • Avatar                     — Sidebar, Cases, Messages, Comments
//
// ── CAUTIONS ────────────────────────────────────────────────────────
//   1. URL-driven tab state (?tab=profile|notifications|ai_extraction|security|appearance).
//   2. Profile tab is fully wired to backend (5 endpoints, mounted under
//      /api/v1/attorney to resolve a route collision — see lawyerProfile.api.ts).
//   3. Notifications + AI Extraction tabs use LOCAL STORAGE as fallback
//      until backend wires those endpoints — swap storage layer later
//      without touching the component.
//   4. FIXED: avatar now uses the same simple getFileUrl() pattern as
//      Sidebar.tsx/SettingsSidebar.tsx. profile_settings_service.py's
//      service_update_avatar/service_get_my_profile now delegate to the
//      shared S3/Spaces-backed user_profile_service functions, so
//      profile_picture_url arrives as a ready "/api/v1/users/me/avatar?v=..."
//      URL — no custom blob-fetch, no ngrok header, no manual host-prepending
//      needed. Falls back to initials on load failure via ProfileAvatar,
//      same as every other page in the app.
//   5. Email IS editable. Backend may reject the email field today —
//      banner surfaces the error; user is warned about re-verification.
//   6. Single "Save Changes" button — only fires the endpoints whose
//      fields actually changed (diff tracking).
//   7. Mock fallback when GET /me/profile fails so demo doesn't break.
//   8. Mobile responsive: tabs stack horizontally below md.

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { lawyerProfileApi } from '../../../api/lawyer/lawyerProfile.api';
import { getUiSession } from '../../../utils/uiSession';
import { ProfileAvatar } from '../../../components/ui/ProfileAvatar';
import {
  DEFAULT_AI_PREFS,
  DEFAULT_NOTIF_PREFS,
  readAIPrefs,
  readNotifPrefs,
  writeAIPrefs,
  writeNotifPrefs,
  type AIExtractionPrefs,
  type NotificationPrefs,
} from '../../../utils/lawyerPrefs';
import type {
  AttorneyProfileUpdate,
  MyProfile,
  ProfileUpdate,
  SettingsTab,
} from '../../../types/lawyer/lawyerProfile.types';

/* ═══════════════════════════════════════════════════════════════════════
   Mock fallback — used only when GET /me/profile fails or returns nothing.
   ═══════════════════════════════════════════════════════════════════════ */
const MOCK_PROFILE: MyProfile = {
  id:                          'mock-user',
  first_name:                  'Sarah',
  last_name:                   'Lin',
  email:                       'sarah.lin@firm.com',
  profile_picture_url:         null,
  timezone:                    'America/New_York',
  preferred_language:          'en',
  bar_number:                  'NY-891245',
  bar_state:                   'NY',
  law_firm_name:               'Lin Immigration Law',
  monthly_billing_target_cents: 4_000_000,
  bio:                         null,
  role:                        'attorney',
};

/* ─── Static option lists ─────────────────────────────────────────── */

const TIMEZONE_OPTIONS = [
  'America/New_York', 'America/Chicago', 'America/Denver',
  'America/Los_Angeles', 'America/Anchorage', 'Pacific/Honolulu',
  'Europe/London', 'Europe/Paris', 'Asia/Kolkata', 'Asia/Singapore',
  'Asia/Tokyo', 'Australia/Sydney', 'UTC',
];

const LANGUAGE_OPTIONS: { value: string; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español (Spanish)' },
  { value: 'fr', label: 'Français (French)' },
  { value: 'zh', label: '中文 (Chinese)' },
  { value: 'hi', label: 'हिन्दी (Hindi)' },
  { value: 'pt', label: 'Português (Portuguese)' },
];

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS',
  'KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY',
  'NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC',
];

const TABS: { id: SettingsTab; label: string }[] = [
  { id: 'profile',       label: 'Profile' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'ai_extraction', label: 'AI Extraction' },
  { id: 'security',      label: 'Security' },
  { id: 'appearance',    label: 'Appearance' },
];

/* ─── Helpers ─────────────────────────────────────────────────────── */

const centsToDollars = (cents?: number | null): string =>
  cents == null ? '' : (cents / 100).toFixed(0);

const dollarsToCents = (raw: string): number | undefined => {
  const n = parseFloat(raw);
  if (Number.isNaN(n) || n < 0) return undefined;
  return Math.round(n * 100);
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Backend (profile_settings_service.py's service_get_my_profile) now
 * returns first_name/last_name/email/role directly — these derived
 * helpers stay only as a defensive fallback (e.g. against MOCK_PROFILE,
 * or a genuinely older cached response shape), not as the primary path
 * they used to be.
 */
function derivedFirstName(p: MyProfile): string {
  if (p.first_name) return p.first_name;
  const full = (p.full_legal_name || '').trim();
  if (!full) return '';
  const parts = full.split(/\s+/);
  return parts.length === 1 ? parts[0] : parts.slice(0, -1).join(' ');
}
function derivedLastName(p: MyProfile): string {
  if (p.last_name) return p.last_name;
  const full = (p.full_legal_name || '').trim();
  if (!full) return '';
  const parts = full.split(/\s+/);
  return parts.length === 1 ? '' : parts[parts.length - 1];
}

/**
 * Email is on the current GET response now, but keep the ui_session
 * cookie fallback for the brief window before the first profile load
 * resolves, and as a safety net against MOCK_PROFILE.
 */
function derivedEmail(p: MyProfile): string {
  if (p.email) return p.email;
  const sess = getUiSession();
  return sess?.email || '';
}

/** Pretty role label: profile.role → ui_session.roles[0] → 'attorney'. */
function derivedRole(p: MyProfile): string {
  if (p.role) return p.role;
  const sess = getUiSession();
  return sess?.roles?.[0] || '—';
}

/* ═══════════════════════════════════════════════════════════════════════
   Page
   ═══════════════════════════════════════════════════════════════════════ */

export default function LawyerSettingsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = (searchParams.get('tab') as SettingsTab) || 'profile';
  const setTab = (t: SettingsTab) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', t);
      return next;
    });
  };

  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [banner,  setBanner]  = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 3000);
    return () => clearTimeout(t);
  }, [banner]);

  const loadProfile = () => {
    setLoading(true);
    lawyerProfileApi.getMyProfile()
      .then((p) => {
        setProfile(p || MOCK_PROFILE);
      })
      .catch((err) => {
        console.warn('[Settings] GET /me/profile FAILED — falling back to mock:', err);
        setProfile(MOCK_PROFILE);
      })
      .finally(() => setLoading(false));
  };
  useEffect(() => { loadProfile(); }, []);

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-5xl space-y-3">
          <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
          <div className="h-64 animate-pulse rounded-xl bg-slate-100" />
        </div>
      </div>
    );
  }

  const isAttorney = derivedRole(profile) === 'attorney';

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-8">

        <div>
          <h1 className="text-2xl font-semibold text-slate-900 md:text-3xl">Settings</h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage your profile, credentials, and workspace preferences.
          </p>
        </div>

        {banner && (
          <div
            className={`mt-4 rounded-lg border px-4 py-2 text-sm ${
              banner.tone === 'ok'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-rose-200 bg-rose-50 text-rose-700'
            }`}
            role="status"
          >
            {banner.text}
          </div>
        )}

        <div className="mt-6 grid gap-6 md:grid-cols-[220px_minmax(0,1fr)]">

          <nav className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
            <ul className="flex flex-row gap-1 overflow-x-auto md:flex-col md:overflow-visible">
              {TABS.map((t) => (
                <li key={t.id} className="flex-1 md:flex-none">
                  <button
                    type="button"
                    onClick={() => setTab(t.id)}
                    className={`w-full whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                      activeTab === t.id
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    {t.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <div className="space-y-4">
            {activeTab === 'profile' && (
              <ProfileTab
                profile={profile}
                isAttorney={isAttorney}
                onProfileChange={setProfile}
                onBanner={setBanner}
                onReload={loadProfile}
              />
            )}
            {activeTab === 'notifications' && <NotificationsTab onBanner={setBanner} />}
            {activeTab === 'ai_extraction' && <AIExtractionTab onBanner={setBanner} />}
            {activeTab === 'security'      && <ComingSoonTab title="Security & Access" />}
            {activeTab === 'appearance'    && <ComingSoonTab title="Appearance" />}
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <button
            type="button"
            onClick={() => navigate('/lawyer/help')}
            className="underline-offset-2 hover:text-indigo-600 hover:underline"
          >
            Need help?
          </button>
          <span>·</span>
          <span>Role: <strong className="text-slate-700">{derivedRole(profile)}</strong></span>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Profile Tab — fully wired
   ═══════════════════════════════════════════════════════════════════════ */

function ProfileTab({
  profile,
  isAttorney,
  onProfileChange,
  onBanner,
  onReload,
}: {
  profile:        MyProfile;
  isAttorney:     boolean;
  onProfileChange: (p: MyProfile) => void;
  onBanner:       (b: { tone: 'ok' | 'err'; text: string } | null) => void;
  onReload:       () => void;
}) {
  const [firstName, setFirstName]                 = useState(derivedFirstName(profile));
  const [lastName,  setLastName]                  = useState(derivedLastName(profile));
  const [email,     setEmail]                     = useState(derivedEmail(profile));
  const [timezone,  setTimezone]                  = useState(profile.timezone   || '');
  const [preferredLanguage, setPreferredLanguage] = useState(profile.preferred_language || 'en');

  const [barNumber,     setBarNumber]     = useState(profile.bar_number    || '');
  const [barState,      setBarState]      = useState(profile.bar_state     || '');
  const [lawFirmName,   setLawFirmName]   = useState(profile.law_firm_name || '');
  const [bio,           setBio]           = useState(profile.bio           || '');
  const [billingTarget, setBillingTarget] = useState(centsToDollars(profile.monthly_billing_target_cents));

  useEffect(() => {
    setFirstName(derivedFirstName(profile));
    setLastName(derivedLastName(profile));
    setEmail(derivedEmail(profile));
    setTimezone(profile.timezone || '');
    setPreferredLanguage(profile.preferred_language || 'en');
    setBarNumber(profile.bar_number || '');
    setBarState(profile.bar_state || '');
    setLawFirmName(profile.law_firm_name || '');
    setBio(profile.bio || '');
    setBillingTarget(centsToDollars(profile.monthly_billing_target_cents));
  }, [profile]);

  const [saving,    setSaving]    = useState(false);
  const [uploading, setUploading] = useState(false);

  const emailChanged = email !== derivedEmail(profile);
  // FIXED: previously `!email || EMAIL_RE.test(email)` — an empty string made
  // !email true, so clearing the field entirely counted as "valid" and was
  // saveable, silently wiping the email on the backend. Now empty is only
  // valid if the field started empty (nothing to accidentally clear).
  const emailIsValid = email.length > 0 ? EMAIL_RE.test(email) : !derivedEmail(profile);

  const profileChanged =
       firstName         !== derivedFirstName(profile)
    || lastName          !== derivedLastName(profile)
    || emailChanged
    || timezone          !== (profile.timezone || '')
    || preferredLanguage !== (profile.preferred_language || 'en');

  const attorneyChanged =
       barNumber     !== (profile.bar_number    || '')
    || barState      !== (profile.bar_state     || '')
    || lawFirmName   !== (profile.law_firm_name || '')
    || bio           !== (profile.bio           || '')
    || billingTarget !== centsToDollars(profile.monthly_billing_target_cents);

  const anyChanged = profileChanged || (isAttorney && attorneyChanged);
  const canSave    = anyChanged && emailIsValid;

  /* ── Save handler ─────────────────────────────────────────────────── */
  const handleSave = async () => {
    if (!emailIsValid) {
      onBanner({ tone: 'err', text: 'Please enter a valid email address.' });
      return;
    }
    setSaving(true);
    let updated: MyProfile = profile;

    try {
      if (profileChanged) {
        const payload: ProfileUpdate & { email?: string } = {};
        if (firstName !== derivedFirstName(profile))            payload.first_name = firstName;
        if (lastName  !== derivedLastName(profile))             payload.last_name  = lastName;
        if (emailChanged)                                        payload.email      = email;
        if (timezone !== (profile.timezone || ''))              payload.timezone   = timezone;
        if (preferredLanguage !== (profile.preferred_language || ''))
                                                                payload.preferred_language = preferredLanguage;
        updated = await lawyerProfileApi.updateMyProfile(payload);
      }

      if (isAttorney && attorneyChanged) {
        const ap: AttorneyProfileUpdate = {};
        if (barNumber    !== (profile.bar_number    || '')) ap.bar_number    = barNumber;
        if (barState     !== (profile.bar_state     || '')) ap.bar_state     = barState;
        if (lawFirmName  !== (profile.law_firm_name || '')) ap.law_firm_name = lawFirmName;
        if (bio          !== (profile.bio || ''))           ap.bio           = bio;
        if (billingTarget !== centsToDollars(profile.monthly_billing_target_cents)) {
          const cents = dollarsToCents(billingTarget);
          if (cents != null) ap.monthly_billing_target_cents = cents;
        }
        updated = await lawyerProfileApi.updateAttorneyProfile(ap);
      }

      onProfileChange(updated);

      let msg = 'Profile updated.';
      if (emailChanged) msg += ' If your email changed, you may need to re-verify it.';
      onBanner({ tone: 'ok', text: msg });
    } catch (e: unknown) {
      const detail =
        (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        || (e instanceof Error ? e.message : 'Save failed.');
      onBanner({ tone: 'err', text: typeof detail === 'string' ? detail : 'Save failed.' });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFirstName(derivedFirstName(profile));
    setLastName(derivedLastName(profile));
    setEmail(derivedEmail(profile));
    setTimezone(profile.timezone || '');
    setPreferredLanguage(profile.preferred_language || 'en');
    setBarNumber(profile.bar_number || '');
    setBarState(profile.bar_state || '');
    setLawFirmName(profile.law_firm_name || '');
    setBio(profile.bio || '');
    setBillingTarget(centsToDollars(profile.monthly_billing_target_cents));
  };

  /* ── Avatar ───────────────────────────────────────────────────────── */
  // FIXED: entire custom blob-fetch/ngrok-header/host-prepending pipeline
  // removed. profile.profile_picture_url now arrives as a ready-to-use
  // versioned URL, so this is the exact same pattern as
  // Sidebar.tsx/SettingsSidebar.tsx: <ProfileAvatar> handles both display
  // and the initials fallback on any load failure.
  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    if (file.size > 5 * 1024 * 1024) {
      onBanner({ tone: 'err', text: 'Avatar must be 5 MB or less.' });
      return;
    }
    const ok = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type);
    if (!ok) {
      onBanner({ tone: 'err', text: 'Avatar must be JPG, PNG, or WebP.' });
      return;
    }

    setUploading(true);
    try {
      const r = await lawyerProfileApi.uploadAvatar(file);
      onProfileChange({ ...profile, profile_picture_url: r.profile_picture_url });
      window.dispatchEvent(new Event('ui-session-updated'));

      if (!r.profile_picture_url) {
        onBanner({
          tone: 'err',
          text: 'Upload succeeded but the server returned no URL. Check the API response.',
        });
      } else {
        onBanner({ tone: 'ok', text: r.message || 'Avatar updated.' });
      }
    } catch (err) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        || 'Avatar upload failed.';
      onBanner({ tone: 'err', text: typeof detail === 'string' ? detail : 'Avatar upload failed.' });
    } finally {
      setUploading(false);
    }
  };

  const handleAvatarRemove = async () => {
    if (!profile.profile_picture_url) return;
    if (!window.confirm('Remove your profile photo?')) return;

    const prevUrl = profile.profile_picture_url;
    onProfileChange({ ...profile, profile_picture_url: null });

    try {
      await lawyerProfileApi.removeAvatar();
      window.dispatchEvent(new Event('ui-session-updated'));
      onBanner({ tone: 'ok', text: 'Avatar removed.' });
    } catch (err) {
      onProfileChange({ ...profile, profile_picture_url: prevUrl });
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        || 'Could not remove avatar.';
      onBanner({ tone: 'err', text: typeof detail === 'string' ? detail : 'Could not remove avatar.' });
    }
  };

  /* ────────────────────────────────────────────────────────────────── */

  return (
    <div className="space-y-4">

      <SectionCard title="Profile Information" subtitle="Manage your personal details and professional credentials.">

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <ProfileAvatar
            src={profile.profile_picture_url}
            name={`${derivedFirstName(profile)} ${derivedLastName(profile)}`.trim() || '—'}
            sizeClass="h-20 w-20"
            avatarSize="lg"
            ringClass="ring-4 ring-white shadow"
          />

          <div className="flex flex-1 flex-col gap-1">
            <div className="text-sm font-medium text-slate-900">
              {(derivedFirstName(profile) + ' ' + derivedLastName(profile)).trim() || '—'}
            </div>
            <div className="text-xs text-slate-500">{derivedEmail(profile) || '—'}</div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <label className="cursor-pointer rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 aria-disabled:opacity-50 aria-disabled:pointer-events-none"
                aria-disabled={uploading}>
                {uploading ? 'Uploading…' : 'Change Avatar'}
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  className="hidden"
                  disabled={uploading}
                  onChange={handleAvatarFile}
                />
              </label>
              {profile.profile_picture_url && (
                <button
                  type="button"
                  onClick={handleAvatarRemove}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Remove
                </button>
              )}
              <span className="text-[11px] text-slate-500">JPG, PNG, or WebP · max 5 MB</span>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="First Name">
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </Field>
          <Field label="Last Name">
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </Field>
        </div>

        <div className="mt-4">
          <Field
            label="Email Address"
            hint={
              emailChanged
                ? '⚠ Changing your email may require re-verification before the change takes effect.'
                : 'Used for login, ticket replies, and notifications.'
            }
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@firm.com"
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 ${
                !emailIsValid
                  ? 'border-rose-300 focus:ring-rose-100'
                  : 'border-slate-200 focus:ring-indigo-100'
              }`}
            />
            {!emailIsValid && (
              <p className="mt-1 text-[11px] text-rose-600">Please enter a valid email address.</p>
            )}
          </Field>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Timezone">
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              <option value="">— Select —</option>
              {TIMEZONE_OPTIONS.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </Field>
          <Field label="Preferred Language">
            <select
              value={preferredLanguage}
              onChange={(e) => setPreferredLanguage(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              {LANGUAGE_OPTIONS.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </Field>
        </div>
      </SectionCard>

      {isAttorney && (
        <SectionCard
          title="Attorney Credentials"
          subtitle="Used on USCIS filings, invoices, and the Analytics utilization KPI."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Bar Association ID" hint="Your state bar number — required on filings.">
              <input
                type="text"
                value={barNumber}
                onChange={(e) => setBarNumber(e.target.value)}
                placeholder="e.g. NY-891245"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </Field>
            <Field label="Bar State">
              <select
                value={barState}
                onChange={(e) => setBarState(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              >
                <option value="">— Select —</option>
                {US_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Law Firm Name" className="md:col-span-2">
              <input
                type="text"
                value={lawFirmName}
                onChange={(e) => setLawFirmName(e.target.value)}
                placeholder="e.g. Lin Immigration Law"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </Field>
            <Field
              label="Monthly Billing Target (USD)"
              hint="Drives the utilization KPI on Analytics."
            >
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={billingTarget}
                  onChange={(e) => setBillingTarget(e.target.value)}
                  placeholder="40000"
                  className="w-full rounded-lg border border-slate-200 py-2 pl-7 pr-3 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </Field>
            <Field label="Bio" className="md:col-span-2" hint="Optional — appears on your public attorney profile.">
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                placeholder="Short bio about your practice areas, languages, etc."
                className="block w-full min-w-0 resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </Field>
          </div>
        </SectionCard>
      )}

      <div className="flex flex-col-reverse items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={handleCancel}
          disabled={!anyChanged || saving}
          className="rounded-lg px-6 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 sm:border sm:border-slate-200"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave || saving}
          className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 sm:font-medium"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      <div className="text-right">
        <button
          type="button"
          onClick={onReload}
          className="text-xs text-slate-500 underline-offset-2 hover:text-indigo-600 hover:underline"
        >
          Refresh from server
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Notification Preferences Tab — localStorage-backed until backend wires it
   ═══════════════════════════════════════════════════════════════════════ */

function NotificationsTab({
  onBanner,
}: {
  onBanner: (b: { tone: 'ok' | 'err'; text: string } | null) => void;
}) {
  const [prefs, setPrefs]   = useState<NotificationPrefs>(DEFAULT_NOTIF_PREFS);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setPrefs(readNotifPrefs()); }, []);

  const updateRow = (id: string, patch: Partial<{ in_app: boolean; email: boolean }>) => {
    setPrefs((cur) => ({
      rows: cur.rows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
  };

  const handleSave = () => {
    setSaving(true);
    try {
      writeNotifPrefs(prefs);
      onBanner({ tone: 'ok', text: 'Notification preferences saved.' });
    } catch {
      onBanner({ tone: 'err', text: 'Could not save preferences.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard
      title="Notification Preferences"
      subtitle="Control how and when you receive alerts for case updates."
    >
      <ul className="divide-y divide-slate-100">
        {prefs.rows.map((row) => (
          <li key={row.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-slate-900">{row.title}</div>
              <div className="text-xs text-slate-500">{row.hint}</div>
            </div>
            <div className="flex flex-wrap items-center gap-4 sm:shrink-0">
              <label className="inline-flex items-center gap-1.5 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={row.in_app}
                  onChange={(e) => updateRow(row.id, { in_app: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                In-App
              </label>
              <label className="inline-flex items-center gap-1.5 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={row.email}
                  onChange={(e) => updateRow(row.id, { email: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                Email
              </label>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex justify-center sm:justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50 sm:font-medium"
        >
          {saving ? 'Saving…' : 'Save Preferences'}
        </button>
      </div>
    </SectionCard>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   AI Extraction Tab — localStorage-backed
   ═══════════════════════════════════════════════════════════════════════ */

function AIExtractionTab({
  onBanner,
}: {
  onBanner: (b: { tone: 'ok' | 'err'; text: string } | null) => void;
}) {
  const [prefs, setPrefs] = useState<AIExtractionPrefs>(DEFAULT_AI_PREFS);

  useEffect(() => { setPrefs(readAIPrefs()); }, []);

  const persist = (next: AIExtractionPrefs) => {
    setPrefs(next);
    try {
      writeAIPrefs(next);
      onBanner({ tone: 'ok', text: 'AI Extraction preferences saved.' });
    } catch {
      onBanner({ tone: 'err', text: 'Could not save preferences.' });
    }
  };

  const ROWS: { key: keyof AIExtractionPrefs; title: string; hint: string }[] = [
    {
      key:   'auto_highlight_key_terms',
      title: 'Auto-Highlight Key Terms',
      hint:  'Automatically highlight dates, names, and critical clauses in documents using AI to speed up review.',
    },
    {
      key:   'pre_fill_review_forms',
      title: 'Pre-fill Review Forms',
      hint:  'Allow AI to suggest data points (e.g. Passport Number, Expiration) in the review sidebar based on document text.',
    },
    {
      key:   'smart_doc_summaries',
      title: 'Smart Document Summaries',
      hint:  'Generate a one-paragraph summary at the top of each document for faster context.',
    },
  ];

  return (
    <SectionCard
      title="AI Extraction Settings"
      subtitle="Manage how AI assists with document data extraction and highlighting."
    >
      <ul className="divide-y divide-slate-100">
        {ROWS.map(({ key, title, hint }) => (
          <li key={key} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-slate-900">{title}</div>
              <div className="text-xs text-slate-500">{hint}</div>
            </div>
            <Toggle
              checked={prefs[key]}
              onChange={(v) => persist({ ...prefs, [key]: v })}
              label={title}
            />
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Placeholder tab
   ═══════════════════════════════════════════════════════════════════════ */

function ComingSoonTab({ title }: { title: string }) {
  return (
    <SectionCard title={title}>
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
          </svg>
        </div>
        <div className="text-sm font-medium text-slate-800">Coming soon</div>
        <p className="mx-auto max-w-sm text-xs text-slate-500">
          This section is being prepared. Once the backend is wired up, you'll be
          able to manage these preferences here.
        </p>
      </div>
    </SectionCard>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Atoms
   ═══════════════════════════════════════════════════════════════════════ */

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title:    string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
      <div className="border-b border-slate-100 pb-3">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      </div>
      <div className="pt-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  className = '',
  children,
}: {
  label:    string;
  hint?:    string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="text-xs font-medium uppercase tracking-wide text-slate-600">
        {label}
      </label>
      <div className="mt-1">{children}</div>
      {hint && <p className="mt-1 text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked:  boolean;
  onChange: (v: boolean) => void;
  label:    string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
        checked ? 'bg-indigo-600' : 'bg-slate-300'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
          checked ? 'translate-x-[22px]' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}
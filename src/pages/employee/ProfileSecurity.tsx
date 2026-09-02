

// // src/pages/employee/ProfileSecurity.tsx
// // Shared for both employee + HR roles.
// // Role is detected from ui_session cookie — Privacy section adapts accordingly.

// import { useState, useRef } from "react";
// import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
// import {
//   Edit2, Upload, Trash2, Save, RotateCcw,
//   CheckCircle, XCircle, Smartphone, Laptop,
//   MapPin, Download,
//   Mail, Phone, Building, Globe2,
//   Info, Check, X, FileText, Monitor, Clock, AlertTriangle,
//   Lock, Globe, Bell,
// } from "lucide-react";

// import { useMyProfile, useLoginHistory,notifyProfileUpdated } from "../../hooks/employee/useProfile";
// import { updateMyProfile, signOutAllDevices, uploadProfilePicture, removeProfilePicture } from "../../api/employee/profile.api";
// import { useAuthStore } from "../../store/authStore";
// import { useCompanyProfile } from "../../hooks/hr/useCompanyProfile";
// import {
//   updateCompanyProfile, uploadCompanyLogo, removeCompanyLogo,
// } from "../../api/hr/companyProfile.api";
// import { useAttorneyProfile } from "../../hooks/lawyer/useAttorneyProfile";
// import {
//   updateAttorneyProfile, uploadAttorneyPhoto, removeAttorneyPhoto,
// } from "../../api/lawyer/attorneyProfile.api";
// import imgUserAvatar from "../../assets/icons/user-avatar.jpg";
// import { getFileUrl } from "../../utils/fileUrl";
// import {  getUiSession } from "../../utils/uiSession";
// import { PageHeader, PageContent } from "../../components/layout/Pageheader";
// import { ThemeColorStrip } from "../settings/ThemeColorStrip";
// import {
//   useNotificationSoundSettings,
//   playSound,
//   unlockAudio,
// } from "../../hooks/employee/useNotificationSoundSettings";
// import type { SoundStyle } from "../../hooks/employee/useNotificationSoundSettings";

// // ── Country codes ─────────────────────────────────────────────────────────────
// const COUNTRIES = [
//   { code:"US",flag:"🇺🇸",dial:"+1"  },{ code:"GB",flag:"🇬🇧",dial:"+44" },
//   { code:"IN",flag:"🇮🇳",dial:"+91" },{ code:"CA",flag:"🇨🇦",dial:"+1"  },
//   { code:"AU",flag:"🇦🇺",dial:"+61" },{ code:"DE",flag:"🇩🇪",dial:"+49" },
//   { code:"FR",flag:"🇫🇷",dial:"+33" },{ code:"AE",flag:"🇦🇪",dial:"+971"},
//   { code:"SG",flag:"🇸🇬",dial:"+65" },{ code:"JP",flag:"🇯🇵",dial:"+81" },
// ];

// type SectionId =
//   | "profile" | "authentication" | "mfa" | "login-history"
//   | "privacy"  | "devices"        | "session" | "security-alerts"
//   | "notifications";

// // ── Shared small components ───────────────────────────────────────────────────

// const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
//   <button onClick={onChange}
//     className="relative inline-flex h-[24px] w-[44px] items-center rounded-full transition-colors duration-200 focus:outline-none flex-shrink-0"
//     style={{ backgroundColor: checked ? "var(--theme-primary)" : "#e5e7eb" }}>
//     <span className={`inline-block h-[20px] w-[20px] transform rounded-full bg-white shadow-md transition-transform duration-200 ${checked ? "translate-x-[22px]" : "translate-x-[2px]"}`} />
//   </button>
// );

// const Checkbox = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
//   <button onClick={onChange}
//     className="h-[18px] w-[18px] rounded border-[1.5px] flex items-center justify-center transition-colors flex-shrink-0"
//     style={{ backgroundColor: checked ? "var(--theme-primary)" : "white", borderColor: checked ? "var(--theme-primary)" : "#d1d5db" }}>
//     {checked && <Check size={11} className="text-white" strokeWidth={3} />}
//   </button>
// );

// const SectionCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
//   <div className={`bg-white rounded-[16px] border border-[#e5e7eb] shadow-[0_1px_3px_rgba(0,0,0,0.06)] ${className}`}>
//     {children}
//   </div>
// );

// const ReadOnlyField = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
//   <div className="flex flex-col gap-[6px]">
//     <label className="text-[13px] font-medium text-[#374151]">{label}</label>
//     <div className="w-full h-[46px] rounded-[10px] border border-[#e5e7eb] bg-[#f3f4f6] text-[#9ca3af] text-[14px] px-[14px] flex items-center gap-[8px] cursor-not-allowed select-none">
//       <Lock size={12} className="text-[#d1d5db] shrink-0" />
//       <span className="truncate">{value || "—"}</span>
//     </div>
//     {hint && <p className="text-[11px] text-[#9ca3af]">{hint}</p>}
//   </div>
// );

// const Spinner = ({ size = 13, className = "text-white" }: { size?: number; className?: string }) => (
//   <svg className={`animate-spin ${className}`} style={{ width:size, height:size }} fill="none" viewBox="0 0 24 24">
//     <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
//     <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
//   </svg>
// );

// const cardPad  = "p-[20px] sm:p-[24px] lg:p-[32px]";
// const cardPadX = "px-[20px] sm:px-[24px] lg:px-[32px]";

// // =============================================================================
// // SECTION: Personal Information
// // =============================================================================

// const PersonalInfoSection = () => {
//   const { data: profile, isLoading, refetch } = useMyProfile();
//   const user = useAuthStore(s => s.user);
//   const fileInputRef = useRef<HTMLInputElement>(null);
//   const navigate     = useNavigate();
//   const [searchParams] = useSearchParams();
//   const [removing, setRemoving] = useState(false);

//   const [editing,         setEditing]         = useState(false);
//   const [saving,          setSaving]          = useState(false);
//   const [error,           setError]           = useState<string | null>(null);
//   const [avatarUploading, setAvatarUploading] = useState(false);
//   const [avatarError,     setAvatarError]     = useState<string | null>(null);
//   const [phone,       setPhone]       = useState("");
//   const [countryCode, setCountryCode] = useState("+91");
//   const [timezone,    setTimezone]    = useState("PT");
//   const [language,    setLanguage]    = useState("en-US");

//   const displayName  = (profile?.full_legal_name ?? `${user?.first_name ?? ""} ${user?.last_name ?? ""}`).trim() || "—";
//   const displayEmail = profile?.email ?? user?.email ?? "—";
//   const avatarUrl    = getFileUrl(profile?.profile_picture_url) ?? imgUserAvatar;

//   const seedForm = () => {
//     setPhone(profile?.phone_number ?? "");
//     setCountryCode(profile?.country_code ?? "+91");
//     setTimezone(profile?.timezone ?? "PT");
//     setLanguage(profile?.preferred_language ?? "en-US");
//   };

//   const handleSave = async () => {
//     setSaving(true); setError(null);
//     try {
//       await updateMyProfile({ timezone, preferred_language: language, phone_number: phone ? String(phone).trim() : undefined, country_code: countryCode || undefined });
//       await refetch(); setEditing(false);
//       const returnTo = searchParams.get("returnTo");
//       if (returnTo) navigate(returnTo);
//     } catch { setError("Failed to save changes. Please try again."); }
//     finally { setSaving(false); }
//   };

//   const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (!file) return;
//     if (file.size > 5 * 1024 * 1024) { setAvatarError("File must be under 5 MB."); return; }
//     setAvatarUploading(true); setAvatarError(null);
//     try {
//       await uploadProfilePicture(file);
//       await refetch();
//       notifyProfileUpdated();   // ← tells Sidebar/SettingsSidebar to refetch too
//     } catch { setAvatarError("Failed to upload photo."); }
//     finally { setAvatarUploading(false); e.target.value = ""; }
//   };

//   const handleRemoveAvatar = async () => {
//     if (!profile?.profile_picture_url) return;
//     setRemoving(true); setAvatarError(null);
//     try {
//       await removeProfilePicture();
//       await refetch();
//       notifyProfileUpdated();   // ← same here
//     } catch { setAvatarError("Failed to remove photo."); }
//     finally { setRemoving(false); }
//   };

//   if (isLoading) return <SectionCard><div className="flex items-center justify-center py-[64px]"><Spinner size={28} className="text-indigo-600" /></div></SectionCard>;

//   return (
//     <SectionCard>
//       <div className={`${cardPad} border-b border-[#f3f4f6] flex items-center justify-between gap-[12px]`}>
//         <div>
//           <h2 className="text-[17px] sm:text-[20px] font-semibold text-[#111827]">Personal Information</h2>
//           <p className="text-[13px] sm:text-[14px] text-[#6b7280] mt-[4px]">Update your contact details and preferences.</p>
//         </div>
//         {!editing && (
//           <div className="flex items-center gap-3">
//             <ThemeColorStrip />
//             <button onClick={() => { seedForm(); setEditing(true); setError(null); }}
//               className="flex items-center gap-[6px] text-[13px] sm:text-[14px] font-medium transition flex-shrink-0"
//               style={{ color: "var(--theme-primary)" }}>
//               <Edit2 size={14} /> Edit
//             </button>
//           </div>
//         )}
//       </div>

//       {error && <div className={`${cardPadX} mt-[16px] bg-[#fef2f2] border border-[#fca5a5] text-[#dc2626] rounded-[10px] px-[16px] py-[12px] text-[13px]`}>{error}</div>}

//       {/* Avatar */}
//       <div className={`${cardPadX} py-[20px] sm:py-[24px] border-b border-[#f3f4f6]`}>
//         <p className="text-[13px] font-medium text-[#374151] mb-[12px]">Profile Picture</p>
//         <div className="flex flex-wrap items-center gap-[16px]">
//           <img src={avatarUrl} alt="Profile"
//             className="w-[64px] h-[64px] sm:w-[80px] sm:h-[80px] rounded-full object-cover border-4 border-[#f3f4f6] flex-shrink-0"
//             onError={e => { (e.target as HTMLImageElement).src = imgUserAvatar; }} />
//           <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={handleAvatarChange} />
//           <div className="flex flex-col gap-[8px]">
//             <div className="flex flex-wrap gap-[8px]">
//               <button onClick={() => fileInputRef.current?.click()} disabled={avatarUploading}
//                 className="flex items-center gap-[6px] px-[12px] sm:px-[14px] h-[34px] sm:h-[36px] text-white text-[12px] sm:text-[13px] font-medium rounded-[8px] hover:opacity-90 transition disabled:opacity-60"
//                 style={{ background: "linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-gradient-end) 100%)" }}>
//                 {avatarUploading ? <><Spinner size={13} /> Uploading…</> : <><Upload size={13} /> Upload New</>}
//               </button>
//               <button onClick={handleRemoveAvatar} disabled={removing || !profile?.profile_picture_url}
//                 className="flex items-center gap-[6px] px-[12px] sm:px-[14px] h-[34px] sm:h-[36px] border border-[#e5e7eb] text-[#6b7280] text-[12px] sm:text-[13px] font-medium rounded-[8px] hover:bg-[#f9fafb] transition disabled:opacity-60">
//                 {removing ? <><Spinner size={13} className="text-[#6b7280]" /> Removing…</> : <><Trash2 size={13} /> Remove</>}
//               </button>
//             </div>
//             {avatarError ? <p className="text-[12px] text-[#ef4444]">{avatarError}</p>
//               : <p className="text-[12px] text-[#9ca3af]">JPG, PNG, GIF or WebP. Max 5 MB.</p>}
//           </div>
//         </div>
//       </div>

//       {/* Fields */}
//       <div className={`${cardPad} flex flex-col gap-[16px] sm:gap-[20px]`}>
//         {editing ? (
//           <>
//             <div className="grid grid-cols-1 sm:grid-cols-2 gap-[16px]">
//               <ReadOnlyField label="Full Name"     value={displayName}  hint="Contact support to update your name." />
//               <ReadOnlyField label="Email Address" value={displayEmail} hint="Email cannot be changed here." />
//             </div>
//             <div className="flex flex-col gap-[6px]">
//               <label className="text-[13px] font-medium text-[#374151]">Phone Number</label>
//               <div className="flex gap-[8px]">
//                 <select value={countryCode} onChange={e => setCountryCode(e.target.value)}
//                   className="h-[46px] rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] text-[#111827] text-[14px] px-[10px] focus:outline-none focus:ring-2 w-[100px] sm:w-[110px] shrink-0 cursor-pointer"
//                   style={{ outlineColor: "var(--theme-primary)" }}>
//                   {COUNTRIES.map(c => <option key={`${c.code}-${c.dial}`} value={c.dial}>{c.flag} {c.dial}</option>)}
//                 </select>
//                 <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="9876543210"
//                   className="flex-1 h-[46px] rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] text-[#111827] text-[14px] px-[14px] focus:outline-none focus:ring-2 transition"
//                   style={{ outlineColor: "var(--theme-primary)" }} />
//               </div>
//             </div>
//             <div className="grid grid-cols-1 sm:grid-cols-2 gap-[16px]">
//               <div className="flex flex-col gap-[6px]">
//                 <label className="text-[13px] font-medium text-[#374151]">Timezone</label>
//                 <select value={timezone} onChange={e => setTimezone(e.target.value)}
//                   className="w-full h-[46px] rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] text-[#111827] text-[14px] px-[14px] focus:outline-none focus:ring-2 cursor-pointer"
//                   style={{ outlineColor: "var(--theme-primary)" }}>
//                   <option value="PT">Pacific Time</option><option value="MT">Mountain Time</option>
//                   <option value="CT">Central Time</option><option value="ET">Eastern Time</option>
//                   <option value="IST">India Standard Time</option><option value="GMT">GMT</option>
//                 </select>
//               </div>
//               <div className="flex flex-col gap-[6px]">
//                 <label className="text-[13px] font-medium text-[#374151]">Preferred Language</label>
//                 <select value={language} onChange={e => setLanguage(e.target.value)}
//                   className="w-full h-[46px] rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] text-[#111827] text-[14px] px-[14px] focus:outline-none focus:ring-2 cursor-pointer"
//                   style={{ outlineColor: "var(--theme-primary)" }}>
//                   <option value="en-US">English (US)</option><option value="es">Spanish</option>
//                   <option value="fr">French</option><option value="hi">Hindi</option>
//                 </select>
//               </div>
//             </div>
//           </>
//         ) : (
//           <div className="grid grid-cols-1 sm:grid-cols-2 gap-[16px]">
//             {[
//               { label:"Full Name",         value: displayName },
//               { label:"Email Address",     value: displayEmail },
//               { label:"Phone Number",      value: profile?.phone_number ? `${profile.country_code ?? ""} ${profile.phone_number}`.trim() : "—" },
//               { label:"Timezone",          value: profile?.timezone ?? "—" },
//               { label:"Preferred Language",value: profile?.preferred_language ?? "—" },
//             ].map(({ label, value }) => (
//               <div key={label} className="flex flex-col gap-[4px]">
//                 <span className="text-[12px] text-[#6b7280] font-medium">{label}</span>
//                 <span className="text-[13px] sm:text-[14px] text-[#111827]">{value}</span>
//               </div>
//             ))}
//           </div>
//         )}
//       </div>

//       {editing && (
//         <div className={`${cardPadX} pb-[20px] sm:pb-[28px] pt-[16px] border-t border-[#f3f4f6] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-[12px]`}>
//           <button onClick={() => { setEditing(false); setError(null); }}
//             className="flex items-center justify-center sm:justify-start gap-[6px] text-[#6b7280] text-[13px] hover:text-[#374151] transition">
//             <RotateCcw size={13} /> Undo Changes
//           </button>
//           <div className="flex gap-[8px]">
//             <button onClick={() => { setEditing(false); setError(null); }}
//               className="flex-1 sm:flex-none h-[40px] px-[16px] border border-[#e5e7eb] text-[#374151] text-[13px] font-medium rounded-[10px] hover:bg-[#f9fafb] transition">
//               Cancel
//             </button>
//             <button onClick={handleSave} disabled={saving}
//               className="flex-1 sm:flex-none h-[40px] px-[16px] text-white text-[13px] font-medium rounded-[10px] hover:opacity-90 transition flex items-center justify-center gap-[6px] disabled:opacity-60"
//               style={{ background: "linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-gradient-end) 100%)" }}>
//               {saving ? <><Spinner size={14} /> Saving…</> : <><Save size={14} /> Save Changes</>}
//             </button>
//           </div>
//         </div>
//       )}
//     </SectionCard>
//   );
// };

// // =============================================================================
// // SECTION: Company Information — HR only (backed by EmployerProfile)
// // =============================================================================

// const COMPANY_SIZES = [
//   { value: "1_10",      label: "1–10 employees"    },
//   { value: "11_50",     label: "11–50 employees"   },
//   { value: "51_200",    label: "51–200 employees"  },
//   { value: "201_500",   label: "201–500 employees" },
//   { value: "501_1000",  label: "501–1,000 employees" },
//   { value: "1000_plus", label: "1,000+ employees"  },
// ];

// const CompanyInfoSection = () => {
//   const { data: company, isLoading, refetch } = useCompanyProfile();
//   const fileInputRef = useRef<HTMLInputElement>(null);

//   const [editing, setEditing] = useState(false);
//   const [saving,  setSaving]  = useState(false);
//   const [error,   setError]   = useState<string | null>(null);
//   const [logoUploading, setLogoUploading] = useState(false);
//   const [removingLogo,  setRemovingLogo]  = useState(false);
//   const [logoError,     setLogoError]     = useState<string | null>(null);

//   const [form, setForm] = useState({
//     company_name: "", company_size: "", industry: "", website: "", domain: "",
//     ein: "", address_line1: "", address_line2: "", city: "", state: "",
//     zip_code: "", country: "US", contact_name: "", contact_email: "", contact_phone: "",
//   });

//   const seedForm = () => {
//     if (!company) return;
//     setForm({
//       company_name:  company.company_name  ?? "",
//       company_size:  company.company_size  ?? "",
//       industry:      company.industry      ?? "",
//       website:       company.website       ?? "",
//       domain:        company.domain        ?? "",
//       ein:           company.ein           ?? "",
//       address_line1: company.address_line1 ?? "",
//       address_line2: company.address_line2 ?? "",
//       city:          company.city          ?? "",
//       state:         company.state         ?? "",
//       zip_code:      company.zip_code      ?? "",
//       country:       company.country       ?? "US",
//       contact_name:  company.contact_name  ?? "",
//       contact_email: company.contact_email ?? "",
//       contact_phone: company.contact_phone ?? "",
//     });
//   };

//   const setField = (key: keyof typeof form) => (
//     e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
//   ) => setForm(f => ({ ...f, [key]: e.target.value }));

//   const handleSave = async () => {
//     setSaving(true); setError(null);
//     try {
//       await updateCompanyProfile(form);
//       await refetch();
//       setEditing(false);
//     } catch { setError("Failed to save company details. Please try again."); }
//     finally { setSaving(false); }
//   };

//   const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (!file) return;
//     if (file.size > 5 * 1024 * 1024) { setLogoError("File must be under 5 MB."); return; }
//     setLogoUploading(true); setLogoError(null);
//     try {
//       await uploadCompanyLogo(file);
//       await refetch();
//     } catch { setLogoError("Failed to upload logo."); }
//     finally { setLogoUploading(false); e.target.value = ""; }
//   };

//   const handleRemoveLogo = async () => {
//     if (!company?.logo_url) return;
//     setRemovingLogo(true); setLogoError(null);
//     try {
//       await removeCompanyLogo();
//       await refetch();
//     } catch { setLogoError("Failed to remove logo."); }
//     finally { setRemovingLogo(false); }
//   };

//   if (isLoading) return <SectionCard><div className="flex items-center justify-center py-[64px]"><Spinner size={28} className="text-indigo-600" /></div></SectionCard>;

//   return (
//     <SectionCard>
//       <div className={`${cardPad} border-b border-[#f3f4f6] flex items-center justify-between gap-[12px]`}>
//         <div>
//           <h2 className="text-[17px] sm:text-[20px] font-semibold text-[#111827] flex items-center gap-[8px]">
//             Company Information
//             {company?.is_verified ? (
//               <span className="flex items-center gap-[4px] text-[11px] font-medium text-[#10b981] bg-[#d1fae5] px-[8px] py-[2px] rounded-full">
//                 <CheckCircle size={10} /> Verified
//               </span>
//             ) : (
//               <span className="flex items-center gap-[4px] text-[11px] font-medium text-[#c2410c] bg-[#fff7ed] px-[8px] py-[2px] rounded-full">
//                 <AlertTriangle size={10} /> Not Verified
//               </span>
//             )}
//           </h2>
//           <p className="text-[13px] sm:text-[14px] text-[#6b7280] mt-[4px]">
//             Your company details — used for domain verification and employee invites.
//           </p>
//         </div>
//         {!editing && (
//           <button onClick={() => { seedForm(); setEditing(true); setError(null); }}
//             className="flex items-center gap-[6px] text-[13px] sm:text-[14px] font-medium transition flex-shrink-0"
//             style={{ color: "var(--theme-primary)" }}>
//             <Edit2 size={14} /> Edit
//           </button>
//         )}
//       </div>

//       {error && <div className={`${cardPadX} mt-[16px] bg-[#fef2f2] border border-[#fca5a5] text-[#dc2626] rounded-[10px] px-[16px] py-[12px] text-[13px]`}>{error}</div>}

//       {/* Logo */}
//       <div className={`${cardPadX} py-[20px] sm:py-[24px] border-b border-[#f3f4f6]`}>
//         <p className="text-[13px] font-medium text-[#374151] mb-[12px]">Company Logo</p>
//         <div className="flex flex-wrap items-center gap-[16px]">
//           <div className="w-[64px] h-[64px] sm:w-[80px] sm:h-[80px] rounded-[12px] bg-[#f3f4f6] border-4 border-[#f3f4f6] flex items-center justify-center overflow-hidden flex-shrink-0">
//             {company?.logo_url
//               ? <img src={company.logo_url} alt="Company logo" className="w-full h-full object-cover" />
//               : <Building size={28} className="text-[#9ca3af]" />}
//           </div>
//           <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml" className="hidden" onChange={handleLogoChange} />
//           <div className="flex flex-col gap-[8px]">
//             <div className="flex flex-wrap gap-[8px]">
//               <button onClick={() => fileInputRef.current?.click()} disabled={logoUploading}
//                 className="flex items-center gap-[6px] px-[12px] sm:px-[14px] h-[34px] sm:h-[36px] text-white text-[12px] sm:text-[13px] font-medium rounded-[8px] hover:opacity-90 transition disabled:opacity-60"
//                 style={{ background: "linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-gradient-end) 100%)" }}>
//                 {logoUploading ? <><Spinner size={13} /> Uploading…</> : <><Upload size={13} /> Upload New</>}
//               </button>
//               <button onClick={handleRemoveLogo} disabled={removingLogo || !company?.logo_url}
//                 className="flex items-center gap-[6px] px-[12px] sm:px-[14px] h-[34px] sm:h-[36px] border border-[#e5e7eb] text-[#6b7280] text-[12px] sm:text-[13px] font-medium rounded-[8px] hover:bg-[#f9fafb] transition disabled:opacity-60">
//                 {removingLogo ? <><Spinner size={13} className="text-[#6b7280]" /> Removing…</> : <><Trash2 size={13} /> Remove</>}
//               </button>
//             </div>
//             {logoError ? <p className="text-[12px] text-[#ef4444]">{logoError}</p>
//               : <p className="text-[12px] text-[#9ca3af]">JPG, PNG, GIF, WebP or SVG. Max 5 MB.</p>}
//           </div>
//         </div>
//       </div>

//       {/* Fields */}
//       <div className={`${cardPad} flex flex-col gap-[16px] sm:gap-[20px]`}>
//         {editing ? (
//           <>
//             <div className="grid grid-cols-1 sm:grid-cols-2 gap-[16px]">
//               <div className="flex flex-col gap-[6px]">
//                 <label className="text-[13px] font-medium text-[#374151]">Company Name</label>
//                 <input value={form.company_name} onChange={setField("company_name")}
//                   className="w-full h-[46px] rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] text-[#111827] text-[14px] px-[14px] focus:outline-none focus:ring-2 transition"
//                   style={{ outlineColor: "var(--theme-primary)" }} />
//               </div>
//               <div className="flex flex-col gap-[6px]">
//                 <label className="text-[13px] font-medium text-[#374151]">Company Size</label>
//                 <select value={form.company_size} onChange={setField("company_size")}
//                   className="w-full h-[46px] rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] text-[#111827] text-[14px] px-[14px] focus:outline-none focus:ring-2 cursor-pointer"
//                   style={{ outlineColor: "var(--theme-primary)" }}>
//                   <option value="">Select…</option>
//                   {COMPANY_SIZES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
//                 </select>
//               </div>
//             </div>
//             <div className="grid grid-cols-1 sm:grid-cols-2 gap-[16px]">
//               <div className="flex flex-col gap-[6px]">
//                 <label className="text-[13px] font-medium text-[#374151]">Industry</label>
//                 <input value={form.industry} onChange={setField("industry")}
//                   className="w-full h-[46px] rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] text-[#111827] text-[14px] px-[14px] focus:outline-none focus:ring-2 transition"
//                   style={{ outlineColor: "var(--theme-primary)" }} />
//               </div>
//               <div className="flex flex-col gap-[6px]">
//                 <label className="text-[13px] font-medium text-[#374151]">Website</label>
//                 <input value={form.website} onChange={setField("website")} placeholder="https://"
//                   className="w-full h-[46px] rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] text-[#111827] text-[14px] px-[14px] focus:outline-none focus:ring-2 transition"
//                   style={{ outlineColor: "var(--theme-primary)" }} />
//               </div>
//             </div>
//             <div className="grid grid-cols-1 sm:grid-cols-2 gap-[16px]">
//               <div className="flex flex-col gap-[6px]">
//                 <label className="text-[13px] font-medium text-[#374151]">Domain</label>
//                 <input value={form.domain} onChange={setField("domain")} placeholder="company.com"
//                   className="w-full h-[46px] rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] text-[#111827] text-[14px] px-[14px] focus:outline-none focus:ring-2 transition"
//                   style={{ outlineColor: "var(--theme-primary)" }} />
//                 <p className="text-[11px] text-[#9ca3af]">Used to verify employee invite emails.</p>
//               </div>
//               <div className="flex flex-col gap-[6px]">
//                 <label className="text-[13px] font-medium text-[#374151]">EIN</label>
//                 <input value={form.ein} onChange={setField("ein")}
//                   className="w-full h-[46px] rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] text-[#111827] text-[14px] px-[14px] focus:outline-none focus:ring-2 transition"
//                   style={{ outlineColor: "var(--theme-primary)" }} />
//               </div>
//             </div>
//             <div className="flex flex-col gap-[6px]">
//               <label className="text-[13px] font-medium text-[#374151]">Address Line 1</label>
//               <input value={form.address_line1} onChange={setField("address_line1")}
//                 className="w-full h-[46px] rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] text-[#111827] text-[14px] px-[14px] focus:outline-none focus:ring-2 transition"
//                 style={{ outlineColor: "var(--theme-primary)" }} />
//             </div>
//             <div className="flex flex-col gap-[6px]">
//               <label className="text-[13px] font-medium text-[#374151]">Address Line 2</label>
//               <input value={form.address_line2} onChange={setField("address_line2")}
//                 className="w-full h-[46px] rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] text-[#111827] text-[14px] px-[14px] focus:outline-none focus:ring-2 transition"
//                 style={{ outlineColor: "var(--theme-primary)" }} />
//             </div>
//             <div className="grid grid-cols-1 sm:grid-cols-3 gap-[16px]">
//               <div className="flex flex-col gap-[6px]">
//                 <label className="text-[13px] font-medium text-[#374151]">City</label>
//                 <input value={form.city} onChange={setField("city")}
//                   className="w-full h-[46px] rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] text-[#111827] text-[14px] px-[14px] focus:outline-none focus:ring-2 transition"
//                   style={{ outlineColor: "var(--theme-primary)" }} />
//               </div>
//               <div className="flex flex-col gap-[6px]">
//                 <label className="text-[13px] font-medium text-[#374151]">State</label>
//                 <input value={form.state} onChange={setField("state")}
//                   className="w-full h-[46px] rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] text-[#111827] text-[14px] px-[14px] focus:outline-none focus:ring-2 transition"
//                   style={{ outlineColor: "var(--theme-primary)" }} />
//               </div>
//               <div className="flex flex-col gap-[6px]">
//                 <label className="text-[13px] font-medium text-[#374151]">ZIP Code</label>
//                 <input value={form.zip_code} onChange={setField("zip_code")}
//                   className="w-full h-[46px] rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] text-[#111827] text-[14px] px-[14px] focus:outline-none focus:ring-2 transition"
//                   style={{ outlineColor: "var(--theme-primary)" }} />
//               </div>
//             </div>
//             <div className="grid grid-cols-1 sm:grid-cols-3 gap-[16px]">
//               <div className="flex flex-col gap-[6px]">
//                 <label className="text-[13px] font-medium text-[#374151]">Contact Name</label>
//                 <input value={form.contact_name} onChange={setField("contact_name")}
//                   className="w-full h-[46px] rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] text-[#111827] text-[14px] px-[14px] focus:outline-none focus:ring-2 transition"
//                   style={{ outlineColor: "var(--theme-primary)" }} />
//               </div>
//               <div className="flex flex-col gap-[6px]">
//                 <label className="text-[13px] font-medium text-[#374151]">Contact Email</label>
//                 <input value={form.contact_email} onChange={setField("contact_email")}
//                   className="w-full h-[46px] rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] text-[#111827] text-[14px] px-[14px] focus:outline-none focus:ring-2 transition"
//                   style={{ outlineColor: "var(--theme-primary)" }} />
//               </div>
//               <div className="flex flex-col gap-[6px]">
//                 <label className="text-[13px] font-medium text-[#374151]">Contact Phone</label>
//                 <input value={form.contact_phone} onChange={setField("contact_phone")}
//                   className="w-full h-[46px] rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] text-[#111827] text-[14px] px-[14px] focus:outline-none focus:ring-2 transition"
//                   style={{ outlineColor: "var(--theme-primary)" }} />
//               </div>
//             </div>
//           </>
//         ) : (
//           <div className="grid grid-cols-1 sm:grid-cols-2 gap-[16px]">
//             {[
//               { label: "Company Name",  value: company?.company_name || "—" },
//               { label: "Company Size",  value: COMPANY_SIZES.find(s => s.value === company?.company_size)?.label ?? "—" },
//               { label: "Industry",      value: company?.industry || "—" },
//               { label: "Website",       value: company?.website || "—" },
//               { label: "Domain",        value: company?.domain || "—" },
//               { label: "EIN",           value: company?.ein || "—" },
//               { label: "Address",       value: [company?.address_line1, company?.address_line2, company?.city, company?.state, company?.zip_code].filter(Boolean).join(", ") || "—" },
//               { label: "Contact",       value: company?.contact_name || "—" },
//               { label: "Contact Email", value: company?.contact_email || "—" },
//               { label: "Contact Phone", value: company?.contact_phone || "—" },
//             ].map(({ label, value }) => (
//               <div key={label} className="flex flex-col gap-[4px]">
//                 <span className="text-[12px] text-[#6b7280] font-medium">{label}</span>
//                 <span className="text-[13px] sm:text-[14px] text-[#111827]">{value}</span>
//               </div>
//             ))}
//           </div>
//         )}
//       </div>

//       {editing && (
//         <div className={`${cardPadX} pb-[20px] sm:pb-[28px] pt-[16px] border-t border-[#f3f4f6] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-[12px]`}>
//           <button onClick={() => { setEditing(false); setError(null); }}
//             className="flex items-center justify-center sm:justify-start gap-[6px] text-[#6b7280] text-[13px] hover:text-[#374151] transition">
//             <RotateCcw size={13} /> Undo Changes
//           </button>
//           <div className="flex gap-[8px]">
//             <button onClick={() => { setEditing(false); setError(null); }}
//               className="flex-1 sm:flex-none h-[40px] px-[16px] border border-[#e5e7eb] text-[#374151] text-[13px] font-medium rounded-[10px] hover:bg-[#f9fafb] transition">
//               Cancel
//             </button>
//             <button onClick={handleSave} disabled={saving}
//               className="flex-1 sm:flex-none h-[40px] px-[16px] text-white text-[13px] font-medium rounded-[10px] hover:opacity-90 transition flex items-center justify-center gap-[6px] disabled:opacity-60"
//               style={{ background: "linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-gradient-end) 100%)" }}>
//               {saving ? <><Spinner size={14} /> Saving…</> : <><Save size={14} /> Save Changes</>}
//             </button>
//           </div>
//         </div>
//       )}
//     </SectionCard>
//   );
// };

// // =============================================================================
// // SECTION: Professional Information — Attorney only (backed by AttorneyProfile)
// // =============================================================================

// const AttorneyInfoSection = () => {
//   const { data: attorney, isLoading, refetch } = useAttorneyProfile();
//   const fileInputRef = useRef<HTMLInputElement>(null);

//   const [editing, setEditing] = useState(false);
//   const [saving,  setSaving]  = useState(false);
//   const [error,   setError]   = useState<string | null>(null);
//   const [photoUploading, setPhotoUploading] = useState(false);
//   const [removingPhoto,  setRemovingPhoto]  = useState(false);
//   const [photoError,     setPhotoError]     = useState<string | null>(null);

//   const [form, setForm] = useState({
//     bar_number: "", bar_state: "", years_experience: "", law_firm_name: "",
//     specialisations: "", languages: "", availability_note: "",
//     max_active_cases: "", bio: "",
//   });

//   const seedForm = () => {
//     if (!attorney) return;
//     setForm({
//       bar_number:        attorney.bar_number        ?? "",
//       bar_state:         attorney.bar_state         ?? "",
//       years_experience:  attorney.years_experience?.toString() ?? "",
//       law_firm_name:     attorney.law_firm_name     ?? "",
//       specialisations:   attorney.specialisations   ?? "",
//       languages:         attorney.languages         ?? "",
//       availability_note: attorney.availability_note ?? "",
//       max_active_cases:  attorney.max_active_cases?.toString() ?? "",
//       bio:               attorney.bio               ?? "",
//     });
//   };

//   const setField = (key: keyof typeof form) => (
//     e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
//   ) => setForm(f => ({ ...f, [key]: e.target.value }));

//   const handleSave = async () => {
//     setSaving(true); setError(null);
//     try {
//       await updateAttorneyProfile({
//         bar_number:        form.bar_number || undefined,
//         bar_state:         form.bar_state || undefined,
//         years_experience:  form.years_experience ? Number(form.years_experience) : undefined,
//         law_firm_name:     form.law_firm_name || undefined,
//         specialisations:   form.specialisations || undefined,
//         languages:         form.languages || undefined,
//         availability_note: form.availability_note || undefined,
//         max_active_cases:  form.max_active_cases ? Number(form.max_active_cases) : undefined,
//         bio:               form.bio || undefined,
//       });
//       await refetch();
//       setEditing(false);
//     } catch { setError("Failed to save professional details. Please try again."); }
//     finally { setSaving(false); }
//   };

//   const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (!file) return;
//     if (file.size > 5 * 1024 * 1024) { setPhotoError("File must be under 5 MB."); return; }
//     setPhotoUploading(true); setPhotoError(null);
//     try {
//       await uploadAttorneyPhoto(file);
//       await refetch();
//     } catch { setPhotoError("Failed to upload photo."); }
//     finally { setPhotoUploading(false); e.target.value = ""; }
//   };

//   const handleRemovePhoto = async () => {
//     if (!attorney?.profile_photo_url) return;
//     setRemovingPhoto(true); setPhotoError(null);
//     try {
//       await removeAttorneyPhoto();
//       await refetch();
//     } catch { setPhotoError("Failed to remove photo."); }
//     finally { setRemovingPhoto(false); }
//   };

//   if (isLoading) return <SectionCard><div className="flex items-center justify-center py-[64px]"><Spinner size={28} className="text-indigo-600" /></div></SectionCard>;

//   return (
//     <SectionCard>
//       <div className={`${cardPad} border-b border-[#f3f4f6] flex items-center justify-between gap-[12px]`}>
//         <div>
//           <h2 className="text-[17px] sm:text-[20px] font-semibold text-[#111827] flex items-center gap-[8px]">
//             Professional Information
//             {attorney?.is_verified ? (
//               <span className="flex items-center gap-[4px] text-[11px] font-medium text-[#10b981] bg-[#d1fae5] px-[8px] py-[2px] rounded-full">
//                 <CheckCircle size={10} /> Verified
//               </span>
//             ) : (
//               <span className="flex items-center gap-[4px] text-[11px] font-medium text-[#c2410c] bg-[#fff7ed] px-[8px] py-[2px] rounded-full">
//                 <AlertTriangle size={10} /> Not Verified
//               </span>
//             )}
//           </h2>
//           <p className="text-[13px] sm:text-[14px] text-[#6b7280] mt-[4px]">
//             Your bar credentials, firm, and case-load preferences.
//           </p>
//         </div>
//         {!editing && (
//           <button onClick={() => { seedForm(); setEditing(true); setError(null); }}
//             className="flex items-center gap-[6px] text-[13px] sm:text-[14px] font-medium transition flex-shrink-0"
//             style={{ color: "var(--theme-primary)" }}>
//             <Edit2 size={14} /> Edit
//           </button>
//         )}
//       </div>

//       {error && <div className={`${cardPadX} mt-[16px] bg-[#fef2f2] border border-[#fca5a5] text-[#dc2626] rounded-[10px] px-[16px] py-[12px] text-[13px]`}>{error}</div>}

//       {/* Photo */}
//       <div className={`${cardPadX} py-[20px] sm:py-[24px] border-b border-[#f3f4f6]`}>
//         <p className="text-[13px] font-medium text-[#374151] mb-[12px]">Profile Photo</p>
//         <div className="flex flex-wrap items-center gap-[16px]">
//           <div className="w-[64px] h-[64px] sm:w-[80px] sm:h-[80px] rounded-full bg-[#f3f4f6] border-4 border-[#f3f4f6] flex items-center justify-center overflow-hidden flex-shrink-0">
//             {attorney?.profile_photo_url
//               ? <img src={attorney.profile_photo_url} alt="Profile" className="w-full h-full object-cover" />
//               : <Building size={28} className="text-[#9ca3af]" />}
//           </div>
//           <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={handlePhotoChange} />
//           <div className="flex flex-col gap-[8px]">
//             <div className="flex flex-wrap gap-[8px]">
//               <button onClick={() => fileInputRef.current?.click()} disabled={photoUploading}
//                 className="flex items-center gap-[6px] px-[12px] sm:px-[14px] h-[34px] sm:h-[36px] text-white text-[12px] sm:text-[13px] font-medium rounded-[8px] hover:opacity-90 transition disabled:opacity-60"
//                 style={{ background: "linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-gradient-end) 100%)" }}>
//                 {photoUploading ? <><Spinner size={13} /> Uploading…</> : <><Upload size={13} /> Upload New</>}
//               </button>
//               <button onClick={handleRemovePhoto} disabled={removingPhoto || !attorney?.profile_photo_url}
//                 className="flex items-center gap-[6px] px-[12px] sm:px-[14px] h-[34px] sm:h-[36px] border border-[#e5e7eb] text-[#6b7280] text-[12px] sm:text-[13px] font-medium rounded-[8px] hover:bg-[#f9fafb] transition disabled:opacity-60">
//                 {removingPhoto ? <><Spinner size={13} className="text-[#6b7280]" /> Removing…</> : <><Trash2 size={13} /> Remove</>}
//               </button>
//             </div>
//             {photoError ? <p className="text-[12px] text-[#ef4444]">{photoError}</p>
//               : <p className="text-[12px] text-[#9ca3af]">JPG, PNG, GIF or WebP. Max 5 MB.</p>}
//           </div>
//         </div>
//       </div>

//       {/* Fields */}
//       <div className={`${cardPad} flex flex-col gap-[16px] sm:gap-[20px]`}>
//         {editing ? (
//           <>
//             <div className="grid grid-cols-1 sm:grid-cols-2 gap-[16px]">
//               <div className="flex flex-col gap-[6px]">
//                 <label className="text-[13px] font-medium text-[#374151]">Bar Number</label>
//                 <input value={form.bar_number} onChange={setField("bar_number")}
//                   className="w-full h-[46px] rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] text-[#111827] text-[14px] px-[14px] focus:outline-none focus:ring-2 transition"
//                   style={{ outlineColor: "var(--theme-primary)" }} />
//               </div>
//               <div className="flex flex-col gap-[6px]">
//                 <label className="text-[13px] font-medium text-[#374151]">Bar State</label>
//                 <input value={form.bar_state} onChange={setField("bar_state")}
//                   className="w-full h-[46px] rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] text-[#111827] text-[14px] px-[14px] focus:outline-none focus:ring-2 transition"
//                   style={{ outlineColor: "var(--theme-primary)" }} />
//               </div>
//             </div>
//             <div className="grid grid-cols-1 sm:grid-cols-2 gap-[16px]">
//               <div className="flex flex-col gap-[6px]">
//                 <label className="text-[13px] font-medium text-[#374151]">Law Firm Name</label>
//                 <input value={form.law_firm_name} onChange={setField("law_firm_name")}
//                   className="w-full h-[46px] rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] text-[#111827] text-[14px] px-[14px] focus:outline-none focus:ring-2 transition"
//                   style={{ outlineColor: "var(--theme-primary)" }} />
//               </div>
//               <div className="flex flex-col gap-[6px]">
//                 <label className="text-[13px] font-medium text-[#374151]">Years of Experience</label>
//                 <input type="number" min={0} value={form.years_experience} onChange={setField("years_experience")}
//                   className="w-full h-[46px] rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] text-[#111827] text-[14px] px-[14px] focus:outline-none focus:ring-2 transition"
//                   style={{ outlineColor: "var(--theme-primary)" }} />
//               </div>
//             </div>
//             <div className="grid grid-cols-1 sm:grid-cols-2 gap-[16px]">
//               <div className="flex flex-col gap-[6px]">
//                 <label className="text-[13px] font-medium text-[#374151]">Specialisations</label>
//                 <input value={form.specialisations} onChange={setField("specialisations")} placeholder="H-1B, L-1, PERM"
//                   className="w-full h-[46px] rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] text-[#111827] text-[14px] px-[14px] focus:outline-none focus:ring-2 transition"
//                   style={{ outlineColor: "var(--theme-primary)" }} />
//                 <p className="text-[11px] text-[#9ca3af]">Comma-separated.</p>
//               </div>
//               <div className="flex flex-col gap-[6px]">
//                 <label className="text-[13px] font-medium text-[#374151]">Languages</label>
//                 <input value={form.languages} onChange={setField("languages")} placeholder="English, Spanish"
//                   className="w-full h-[46px] rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] text-[#111827] text-[14px] px-[14px] focus:outline-none focus:ring-2 transition"
//                   style={{ outlineColor: "var(--theme-primary)" }} />
//                 <p className="text-[11px] text-[#9ca3af]">Comma-separated.</p>
//               </div>
//             </div>
//             <div className="grid grid-cols-1 sm:grid-cols-2 gap-[16px]">
//               <div className="flex flex-col gap-[6px]">
//                 <label className="text-[13px] font-medium text-[#374151]">Max Active Cases</label>
//                 <input type="number" min={0} value={form.max_active_cases} onChange={setField("max_active_cases")}
//                   className="w-full h-[46px] rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] text-[#111827] text-[14px] px-[14px] focus:outline-none focus:ring-2 transition"
//                   style={{ outlineColor: "var(--theme-primary)" }} />
//               </div>
//               <div className="flex flex-col gap-[6px]">
//                 <label className="text-[13px] font-medium text-[#374151]">Availability Note</label>
//                 <input value={form.availability_note} onChange={setField("availability_note")} placeholder="e.g. Accepting new H-1B cases"
//                   className="w-full h-[46px] rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] text-[#111827] text-[14px] px-[14px] focus:outline-none focus:ring-2 transition"
//                   style={{ outlineColor: "var(--theme-primary)" }} />
//               </div>
//             </div>
//             <div className="flex flex-col gap-[6px]">
//               <label className="text-[13px] font-medium text-[#374151]">Bio</label>
//               <textarea value={form.bio} onChange={setField("bio")} rows={4}
//                 className="w-full rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] text-[#111827] text-[14px] px-[14px] py-[10px] focus:outline-none focus:ring-2 transition resize-none"
//                 style={{ outlineColor: "var(--theme-primary)" }} />
//             </div>
//           </>
//         ) : (
//           <div className="grid grid-cols-1 sm:grid-cols-2 gap-[16px]">
//             {[
//               { label: "Bar Number",         value: attorney?.bar_number || "—" },
//               { label: "Bar State",          value: attorney?.bar_state || "—" },
//               { label: "Law Firm",           value: attorney?.law_firm_name || "—" },
//               { label: "Years of Experience",value: attorney?.years_experience?.toString() || "—" },
//               { label: "Specialisations",    value: attorney?.specialisations || "—" },
//               { label: "Languages",          value: attorney?.languages || "—" },
//               { label: "Max Active Cases",   value: attorney?.max_active_cases?.toString() || "—" },
//               { label: "Availability",       value: attorney?.availability_note || "—" },
//             ].map(({ label, value }) => (
//               <div key={label} className="flex flex-col gap-[4px]">
//                 <span className="text-[12px] text-[#6b7280] font-medium">{label}</span>
//                 <span className="text-[13px] sm:text-[14px] text-[#111827]">{value}</span>
//               </div>
//             ))}
//             {attorney?.bio && (
//               <div className="flex flex-col gap-[4px] sm:col-span-2">
//                 <span className="text-[12px] text-[#6b7280] font-medium">Bio</span>
//                 <span className="text-[13px] sm:text-[14px] text-[#111827] leading-[20px]">{attorney.bio}</span>
//               </div>
//             )}
//           </div>
//         )}
//       </div>

//       {editing && (
//         <div className={`${cardPadX} pb-[20px] sm:pb-[28px] pt-[16px] border-t border-[#f3f4f6] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-[12px]`}>
//           <button onClick={() => { setEditing(false); setError(null); }}
//             className="flex items-center justify-center sm:justify-start gap-[6px] text-[#6b7280] text-[13px] hover:text-[#374151] transition">
//             <RotateCcw size={13} /> Undo Changes
//           </button>
//           <div className="flex gap-[8px]">
//             <button onClick={() => { setEditing(false); setError(null); }}
//               className="flex-1 sm:flex-none h-[40px] px-[16px] border border-[#e5e7eb] text-[#374151] text-[13px] font-medium rounded-[10px] hover:bg-[#f9fafb] transition">
//               Cancel
//             </button>
//             <button onClick={handleSave} disabled={saving}
//               className="flex-1 sm:flex-none h-[40px] px-[16px] text-white text-[13px] font-medium rounded-[10px] hover:opacity-90 transition flex items-center justify-center gap-[6px] disabled:opacity-60"
//               style={{ background: "linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-gradient-end) 100%)" }}>
//               {saving ? <><Spinner size={14} /> Saving…</> : <><Save size={14} /> Save Changes</>}
//             </button>
//           </div>
//         </div>
//       )}
//     </SectionCard>
//   );
// };

// // =============================================================================
// // SECTION: Authentication
// // =============================================================================

// // ── CHANGED: added `recommended` — a themed variant (border + "Recommended"
// // badge) so MFASection can reuse this component instead of hand-rolling its
// // own near-identical card markup. `features` is optional now since MFA's
// // cards don't use the feature-bullet list.
// const AuthMethodCard = ({ icon, iconBg, title, description, features, buttonLabel, active, recommended }: {
//   icon: React.ReactNode; iconBg: string; title: string; description: string;
//   features?: { ok: boolean; text: string }[]; buttonLabel: string; active?: boolean; recommended?: boolean;
// }) => (
//   <div className={`rounded-[12px] p-[16px] sm:p-[24px] ${recommended ? "border-2" : "border"} ${active ? "bg-[#f8fafc]" : recommended ? "" : ""}`}
//     style={{
//       borderColor: recommended ? "var(--theme-primary)" : active ? "var(--theme-border, #c7d2fe)" : "#e5e7eb",
//       backgroundColor: recommended ? "var(--theme-light)" : undefined,
//     }}>
//     <div className="flex flex-col sm:flex-row items-start gap-[12px] sm:gap-[16px]">
//       <div className="flex items-start gap-[12px] flex-1 min-w-0">
//         <div className="w-[44px] h-[44px] sm:w-[48px] sm:h-[48px] rounded-[12px] flex items-center justify-center flex-shrink-0"
//           style={{ backgroundColor: iconBg }}>{icon}</div>
//         <div className="min-w-0">
//           <div className="flex items-center gap-[8px] flex-wrap">
//             <h3 className="text-[14px] sm:text-[15px] font-semibold text-[#111827]">{title}</h3>
//             {active && (
//               <span className="flex items-center gap-[4px] text-[11px] font-medium text-[#10b981] bg-[#d1fae5] px-[8px] py-[2px] rounded-full">
//                 <Check size={10} strokeWidth={3} /> Active
//               </span>
//             )}
//             {recommended && (
//               <span className="text-[11px] font-semibold rounded-full px-[8px] py-[2px]" style={{ color: "var(--theme-dark)", backgroundColor: "var(--theme-light)" }}>
//                 Recommended
//               </span>
//             )}
//           </div>
//           <p className="text-[12px] sm:text-[13px] text-[#6b7280] mt-[4px]">{description}</p>
//           {features && features.length > 0 && (
//             <ul className="mt-[8px] flex flex-wrap gap-[8px]">
//               {features.map(f => (
//                 <li key={f.text} className="flex items-center gap-[5px] text-[11px] sm:text-[12px] text-[#6b7280]">
//                   {f.ok ? <Check size={11} className="text-[#10b981]" strokeWidth={3} /> : <X size={11} className="text-[#ef4444]" strokeWidth={3} />}
//                   {f.text}
//                 </li>
//               ))}
//             </ul>
//           )}
//         </div>
//       </div>
//       <button className={`w-full sm:w-auto flex-shrink-0 h-[38px] px-[14px] text-[12px] sm:text-[13px] font-medium rounded-[10px] transition whitespace-nowrap ${
//         active ? "border border-[#e5e7eb] text-[#374151] hover:bg-white" : "text-white hover:opacity-90"
//       }`}
//         style={!active ? { background: "linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-gradient-end) 100%)" } : undefined}>
//         {buttonLabel}
//       </button>
//     </div>
//   </div>
// );

// const AuthenticationSection = () => {
//   const user = useAuthStore(s => s.user);
//   return (
//     <SectionCard>
//       <div className={`${cardPad} border-b border-[#f3f4f6]`}>
//         <h2 className="text-[17px] sm:text-[20px] font-semibold text-[#111827]">Authentication Methods</h2>
//         <p className="text-[13px] sm:text-[14px] text-[#6b7280] mt-[4px]">Manage how you log in to Vyuflo.</p>
//       </div>
//       <div className={`${cardPad} flex flex-col gap-[12px] sm:gap-[16px]`}>
//         <AuthMethodCard active icon={<Mail size={20} className="text-indigo-600" />} iconBg="#e0e7ff" title="Email & Password"
//           description={`Primary login using ${user?.email ?? "your email"}`}
//           features={[{ ok:true, text:"2-factor ready" },{ ok:true, text:"Password reset" }]}
//           buttonLabel="Change Password" />
//         <AuthMethodCard icon={<Globe size={20} className="text-[#ea4335]" />} iconBg="#fef2f2" title="Google"
//           description="Sign in with your Google account"
//           features={[{ ok:true, text:"One-click sign in" },{ ok:true, text:"Auto recovery" }]}
//           buttonLabel="Connect Google" />
//         <AuthMethodCard icon={<Monitor size={20} className="text-[#0078d4]" />} iconBg="#eff6ff" title="Microsoft"
//           description="Sign in with Microsoft or Office 365"
//           features={[{ ok:true, text:"Enterprise SSO" },{ ok:true, text:"Azure AD" }]}
//           buttonLabel="Connect Microsoft" />
//       </div>
//     </SectionCard>
//   );
// };

// // =============================================================================
// // SECTION: MFA
// // ── CHANGED: both cards now reuse AuthMethodCard instead of duplicating its
// // icon/title/badge/button layout with slightly different one-off styling.
// // =============================================================================

// const MFASection = () => (
//   <SectionCard>
//     <div className={`${cardPad} border-b border-[#f3f4f6]`}>
//       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-[8px]">
//         <h2 className="text-[17px] sm:text-[20px] font-semibold text-[#111827]">Multi-Factor Authentication</h2>
//         <span className="flex items-center gap-[6px] text-[12px] sm:text-[13px] text-[#6b7280] bg-[#f3f4f6] px-[12px] py-[5px] rounded-full w-fit">
//           <XCircle size={14} className="text-[#ef4444]" /> Not Enabled
//         </span>
//       </div>
//       <p className="text-[13px] sm:text-[14px] text-[#6b7280] mt-[4px]">Add a second verification method for extra security.</p>
//     </div>
//     <div className={`${cardPad} flex flex-col gap-[12px] sm:gap-[16px]`}>
//       <AuthMethodCard recommended
//         icon={<Smartphone size={20} style={{ color: "var(--theme-primary)" }} />}
//         iconBg="var(--theme-light)"
//         title="Authenticator App"
//         description="Google Authenticator, Authy, or Microsoft Authenticator"
//         buttonLabel="Setup Now" />
//       <AuthMethodCard
//         icon={<Phone size={20} className="text-[#10b981]" />}
//         iconBg="#f0fdf4"
//         title="SMS Text Message"
//         description="Receive codes via text message"
//         buttonLabel="Add Phone" />
//     </div>
//   </SectionCard>
// );

// // =============================================================================
// // SECTION: Login History
// // ── This is also now the content behind the "devices" route — see the
// // COMPONENTS map at the bottom. The old ConnectedDevicesPlaceholder showed a
// // static "Current Device" card with strictly less information than this
// // section already provides for real (device, browser, OS, location, active
// // badge), so it added nothing and has been removed rather than left as a
// // second, lesser copy of the same feature.
// // =============================================================================

// const LoginHistorySection = () => {
//   const { data: history, isLoading, error } = useLoginHistory(20);
//   const [signingOut, setSigningOut] = useState(false);

//   return (
//     <SectionCard>
//       <div className={`${cardPad} border-b border-[#f3f4f6] flex flex-col sm:flex-row sm:items-start justify-between gap-[12px]`}>
//         <div>
//           <h2 className="text-[17px] sm:text-[20px] font-semibold text-[#111827]">Login History</h2>
//           <p className="text-[13px] sm:text-[14px] text-[#6b7280] mt-[4px]">Review recent access to your account.</p>
//         </div>
//         <button className="flex items-center gap-[6px] h-[38px] px-[14px] border border-[#e5e7eb] text-[#374151] text-[12px] sm:text-[13px] font-medium rounded-[10px] hover:bg-[#f9fafb] transition whitespace-nowrap flex-shrink-0">
//           <Download size={14} /> Export History
//         </button>
//       </div>
//       <div className={`${cardPad} flex flex-col gap-[10px]`}>
//         {isLoading && <div className="flex items-center justify-center py-[32px]"><Spinner size={24} className="text-indigo-600" /></div>}
//         {error && <p className="text-[13px] text-[#ef4444] text-center py-[16px]">{error}</p>}
//         {!isLoading && !error && history.length === 0 && <p className="text-[13px] text-[#6b7280] text-center py-[16px]">No login history.</p>}
//         {!isLoading && history.map(entry => {
//           const isBad = entry.status === "blocked" || entry.status === "failed";
//           return (
//             <div key={entry.id} className={`border rounded-[12px] p-[14px] sm:p-[20px] ${isBad ? "border-[#fca5a5] bg-[#fff5f5]" : entry.is_current_session ? "bg-[var(--theme-light)]" : "border-[#e5e7eb]"}`}
//               style={entry.is_current_session && !isBad ? { borderColor: "var(--theme-primary)" } : undefined}>
//               <div className="flex items-start gap-[10px] sm:gap-[14px]">
//                 <div className={`w-[36px] h-[36px] sm:w-[40px] sm:h-[40px] rounded-[10px] flex items-center justify-center flex-shrink-0 ${isBad ? "bg-[#fee2e2]" : "bg-[#f0fdf4]"}`}>
//                   {isBad ? <AlertTriangle size={16} className="text-[#ef4444]" />
//                     : entry.device_type === "mobile" ? <Smartphone size={16} style={{ color: "var(--theme-primary)" }} />
//                     : <Laptop size={16} style={{ color: "var(--theme-primary)" }} />}
//                 </div>
//                 <div className="min-w-0 flex-1">
//                   <div className="flex items-center gap-[6px] flex-wrap">
//                     <p className="text-[13px] sm:text-[14px] font-semibold text-[#111827]">
//                       {entry.is_current_session ? "Current Session" : isBad ? "Failed Login" : "Successful Login"}
//                     </p>
//                     {entry.is_current_session && <span className="text-[10px] font-medium px-[7px] py-[2px] rounded-full bg-[#d1fae5] text-[#065f46]">Active Now</span>}
//                   </div>
//                   <div className="mt-[6px] flex flex-col gap-[3px]">
//                     <div className="flex items-center gap-[6px] text-[11px] sm:text-[12px] text-[#6b7280]"><Monitor size={12} /> {[entry.browser, entry.os].filter(Boolean).join(" on ") || "Unknown device"}</div>
//                     <div className="flex items-center gap-[6px] text-[11px] sm:text-[12px] text-[#6b7280]"><MapPin size={12} /> {[entry.city, entry.country].filter(Boolean).join(", ") || "Unknown location"}</div>
//                     <div className="flex items-center gap-[6px] text-[11px] sm:text-[12px] text-[#6b7280]"><Clock size={12} /> {new Date(entry.created_at).toLocaleString("en-US", { dateStyle:"medium", timeStyle:"short" })}</div>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           );
//         })}
//       </div>
//       <div className={`${cardPadX} mb-[20px] sm:mb-[28px] bg-[#fffbeb] border border-[#fde68a] rounded-[10px] px-[16px] py-[14px] flex flex-col sm:flex-row sm:items-center justify-between gap-[12px]`}>
//         <div className="flex items-start gap-[10px]">
//           <AlertTriangle size={16} className="text-[#f59e0b] flex-shrink-0 mt-[1px]" />
//           <p className="text-[12px] text-[#92400e]">If you see an unrecognized login, change your password immediately.</p>
//         </div>
//         <button onClick={async () => { setSigningOut(true); try { await signOutAllDevices(); } finally { setSigningOut(false); } }}
//           disabled={signingOut}
//           className="w-full sm:w-auto flex-shrink-0 h-[36px] px-[14px] border border-[#fde68a] text-[#92400e] text-[12px] font-medium rounded-[8px] hover:bg-[#fef3c7] transition whitespace-nowrap disabled:opacity-60">
//           {signingOut ? "Signing out…" : "Sign Out All Devices"}
//         </button>
//       </div>
//     </SectionCard>
//   );
// };

// // =============================================================================
// // SECTION: Privacy — adapts to role
// // =============================================================================

// const PrivacySection = ({ isHR }: { isHR: boolean }) => {
//   const [toggles, setToggles] = useState(
//     isHR
//       ? { email: true, phone: false, teamAccess: true, caseAccess: true, analytics: true, updates: true, marketing: false }
//       : { email: true, phone: false, employment: true, visa: false, analytics: true, updates: true, marketing: false }
//   );
//   const toggle = (key: string) => setToggles(p => ({ ...p, [key]: !(p as any)[key] }));

//   return (
//     <div className="flex flex-col gap-[16px] sm:gap-[20px]">
//       <SectionCard>
//         <div className={`${cardPad} border-b border-[#f3f4f6]`}>
//           <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-[8px]">
//             <div>
//               <h3 className="text-[15px] sm:text-[17px] font-semibold text-[#111827]">Profile Visibility</h3>
//               <p className="text-[12px] sm:text-[13px] text-[#6b7280] mt-[2px]">
//                 {isHR ? "Control what employees and attorneys can see on your HR profile."
//                        : "Choose what your HR and immigration team can see."}
//               </p>
//             </div>
//             <select className="h-[36px] px-[12px] border border-[#e5e7eb] rounded-[8px] text-[13px] text-[#374151] bg-white focus:outline-none w-full sm:w-auto">
//               <option>Team Members Only</option><option>All Users</option><option>Private</option>
//             </select>
//           </div>
//         </div>
//         <div className={`${cardPadX} py-[8px] grid grid-cols-1 sm:grid-cols-2 gap-[4px]`}>
//           {(isHR ? [
//             { key:"email",      label:"Email Address",   icon:<Mail size={14} /> },
//             { key:"phone",      label:"Phone Number",    icon:<Phone size={14} /> },
//             { key:"teamAccess", label:"Team Directory",  icon:<Building size={14} /> },
//             { key:"caseAccess", label:"Case Portfolio",  icon:<Globe2 size={14} /> },
//           ] : [
//             { key:"email",      label:"Email Address",   icon:<Mail size={14} /> },
//             { key:"phone",      label:"Phone Number",    icon:<Phone size={14} /> },
//             { key:"employment", label:"Employment Info", icon:<Building size={14} /> },
//             { key:"visa",       label:"Visa Status",     icon:<FileText size={14} /> },
//           ]).map(({ key, label, icon }) => (
//             <div key={key} className="flex items-center justify-between py-[12px] px-[12px] rounded-[8px] hover:bg-[#f9fafb]">
//               <div className="flex items-center gap-[8px] text-[12px] sm:text-[13px] text-[#374151]">
//                 <span className="text-[#6b7280]">{icon}</span> {label}
//               </div>
//               <Toggle checked={(toggles as any)[key]} onChange={() => toggle(key)} />
//             </div>
//           ))}
//         </div>
//       </SectionCard>

//       <SectionCard>
//         <div className={`${cardPad} border-b border-[#f3f4f6]`}>
//           <h3 className="text-[15px] sm:text-[17px] font-semibold text-[#111827]">Data Sharing & Analytics</h3>
//           <p className="text-[12px] sm:text-[13px] text-[#6b7280] mt-[2px]">Help us improve Vyuflo by sharing anonymous usage data.</p>
//         </div>
//         <div className={cardPadX}>
//           {[
//             { label:"Usage Analytics",          sub:"Share anonymous data to help improve features.",  key:"analytics" },
//             { label:"Product Updates & Tips",   sub:"Personalised tips based on your usage.",          key:"updates"   },
//             { label:"Marketing Communications", sub:"Receive emails about new features and offers.",   key:"marketing" },
//           ].map(p => (
//             <div key={p.key} className="flex items-center justify-between py-[14px] border-b border-[#f3f4f6] last:border-0 gap-[12px]">
//               <div className="min-w-0">
//                 <p className="text-[13px] sm:text-[14px] font-medium text-[#111827]">{p.label}</p>
//                 <p className="text-[11px] sm:text-[12px] text-[#6b7280] mt-[2px]">{p.sub}</p>
//               </div>
//               <Toggle checked={(toggles as any)[p.key]} onChange={() => toggle(p.key)} />
//             </div>
//           ))}
//         </div>
//       </SectionCard>

//       <SectionCard>
//         <div className={`${cardPad} border-b border-[#f3f4f6]`}>
//           <h3 className="text-[15px] sm:text-[17px] font-semibold text-[#111827]">Data & Account</h3>
//           <p className="text-[12px] sm:text-[13px] text-[#6b7280] mt-[2px]">Manage your data and account lifecycle.</p>
//         </div>
//         <div className={`${cardPad} flex flex-col gap-[12px]`}>
//           <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-[10px] p-[14px] sm:p-[16px] flex items-start gap-[10px]">
//             <Info size={15} className="text-[#3b82f6] flex-shrink-0 mt-[2px]" />
//             <p className="text-[12px] text-[#1e40af]">
//               {isHR
//                 ? "Company and employee case data is retained for 7 years to comply with immigration record-keeping requirements."
//                 : "Your case data is retained for 7 years after case completion to comply with immigration regulations."}
//             </p>
//           </div>
//           <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-[10px] p-[14px] border border-[#e5e7eb] rounded-[10px]">
//             <div>
//               <p className="text-[13px] font-semibold text-[#111827]">Download Your Data</p>
//               <p className="text-[12px] text-[#6b7280] mt-[2px]">Export all your personal information and documents.</p>
//             </div>
//             <button className="flex items-center justify-center gap-[6px] h-[36px] px-[14px] border border-[#e5e7eb] text-[#374151] text-[12px] font-medium rounded-[8px] hover:bg-[#f9fafb] transition w-full sm:w-auto">
//               <Download size={13} /> Request Export
//             </button>
//           </div>
//           <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-[10px] p-[14px] border border-[#fca5a5] rounded-[10px] bg-[#fff5f5]">
//             <div>
//               <p className="text-[13px] font-semibold text-[#991b1b]">Delete My Account</p>
//               <p className="text-[12px] text-[#ef4444] mt-[2px]">Permanently delete your account. This cannot be undone.</p>
//             </div>
//             <button className="flex items-center justify-center gap-[6px] h-[36px] px-[14px] bg-[#ef4444] text-white text-[12px] font-medium rounded-[8px] hover:bg-[#dc2626] transition w-full sm:w-auto">
//               <Trash2 size={13} /> Delete Account
//             </button>
//           </div>
//         </div>
//       </SectionCard>
//     </div>
//   );
// };

// // =============================================================================
// // SECTION: Security Alerts
// // =============================================================================

// const SecurityAlertsSection = () => {
//   const [alerts, setAlerts] = useState({
//     newDevice:       { email:true,  sms:true  },
//     failedLogin:     { email:true,  sms:true  },
//     passwordChanged: { email:true,  sms:false },
//     unusualActivity: { email:true,  sms:true  },
//   });
//   type AK = keyof typeof alerts;
//   const toggle = (key: AK, ch: "email" | "sms") =>
//     setAlerts(p => ({ ...p, [key]: { ...p[key], [ch]: !p[key][ch] } }));

//   return (
//     <SectionCard>
//       <div className={`${cardPad} border-b border-[#f3f4f6]`}>
//         <h2 className="text-[17px] sm:text-[20px] font-semibold text-[#111827]">Security Alerts</h2>
//         <p className="text-[13px] sm:text-[14px] text-[#6b7280] mt-[4px]">Get notified about important security events.</p>
//       </div>
//       <div className={cardPadX}>
//         {([
//           { key:"newDevice"       as AK, title:"New Device Login",          desc:"Alert when account is accessed from a new device." },
//           { key:"failedLogin"     as AK, title:"Failed Login Attempts",     desc:"Alert when multiple failed logins occur." },
//           { key:"passwordChanged" as AK, title:"Password Changed",          desc:"Alert immediately when your password changes." },
//           { key:"unusualActivity" as AK, title:"Unusual Activity Detected", desc:"Alert when suspicious behaviour is detected." },
//         ]).map(({ key, title, desc }) => (
//           <div key={key} className="flex items-start sm:items-center justify-between py-[14px] border-b border-[#f3f4f6] last:border-0 gap-[12px]">
//             <div className="flex-1 min-w-0">
//               <p className="text-[13px] sm:text-[14px] font-medium text-[#111827]">{title}</p>
//               <p className="text-[11px] sm:text-[12px] text-[#6b7280] mt-[2px]">{desc}</p>
//             </div>
//             <div className="flex items-center gap-[12px] sm:gap-[16px] flex-shrink-0">
//               <label className="flex items-center gap-[5px] cursor-pointer">
//                 <Checkbox checked={alerts[key].email} onChange={() => toggle(key, "email")} />
//                 <span className="text-[11px] sm:text-[12px] text-[#6b7280]">Email</span>
//               </label>
//               <label className="flex items-center gap-[5px] cursor-pointer">
//                 <Checkbox checked={alerts[key].sms} onChange={() => toggle(key, "sms")} />
//                 <span className="text-[11px] sm:text-[12px] text-[#6b7280]">SMS</span>
//               </label>
//             </div>
//           </div>
//         ))}
//       </div>
//       <div className={`${cardPadX} mb-[20px] sm:mb-[28px] mt-[8px] bg-[#f0fdf4] border border-[#bbf7d0] rounded-[10px] px-[16px] py-[14px]`}>
//         <div className="flex items-start gap-[10px]">
//           <CheckCircle size={16} className="text-[#10b981] flex-shrink-0 mt-[1px]" />
//           <p className="text-[12px] text-[#065f46]">Your account is protected. Keep these settings active to safeguard your data.</p>
//         </div>
//       </div>
//     </SectionCard>
//   );
// };

// // =============================================================================
// // SECTION: Notification Sounds
// // =============================================================================

// const SOUND_STYLES: { value: SoundStyle; label: string; desc: string; emoji: string }[] = [
//   { value: "ding",   label: "Ding",   desc: "Two-tone descending", emoji: "🔔" },
//   { value: "chime",  label: "Chime",  desc: "Soft ascending",      emoji: "🎵" },
//   { value: "pop",    label: "Pop",    desc: "Short sharp pop",     emoji: "💬" },
//   { value: "silent", label: "Silent", desc: "No sound",            emoji: "🔇" },
// ];

// const NotificationSoundsSection = () => {
//   const { settings, update } = useNotificationSoundSettings();

//   return (
//     <div className="flex flex-col gap-[16px] sm:gap-[20px]">

//       {/* Message Sounds */}
//       <SectionCard>
//         <div className={`${cardPad} border-b border-[#f3f4f6]`}>
//           <div className="flex items-center gap-[10px]">
//             <div className="w-[40px] h-[40px] rounded-[10px] flex items-center justify-center flex-shrink-0"
//               style={{ backgroundColor: "var(--theme-light)", color: "var(--theme-primary)" }}>
//               <Bell size={18} />
//             </div>
//             <div>
//               <h2 className="text-[17px] sm:text-[20px] font-semibold text-[#111827]">Message Sounds</h2>
//               <p className="text-[13px] text-[#6b7280]">Plays when a new message arrives in Secure Messaging</p>
//             </div>
//           </div>
//         </div>

//         <div className={`${cardPad} flex flex-col gap-[20px]`}>

//           {/* Enable toggle */}
//           <div className="flex items-center justify-between">
//             <div>
//               <p className="text-[14px] font-medium text-[#111827]">Enable Message Sound</p>
//               <p className="text-[12px] text-[#6b7280] mt-[2px]">Sound plays when someone sends you a message</p>
//             </div>
//             <Toggle checked={settings.messageSound} onChange={() => update({ messageSound: !settings.messageSound })} />
//           </div>

//           {/* Sound style picker */}
//           <div className={`flex flex-col gap-[10px] transition-opacity ${!settings.messageSound ? "opacity-40 pointer-events-none" : ""}`}>
//             <p className="text-[13px] font-medium text-[#374151]">Sound Style</p>
//             <div className="grid grid-cols-2 sm:grid-cols-4 gap-[8px]">
//               {SOUND_STYLES.map(s => (
//                 <button key={s.value} onClick={() => update({ messageSoundStyle: s.value })}
//                   className={`flex flex-col items-center gap-[6px] p-[14px] rounded-[10px] border-2 transition text-center ${
//                     settings.messageSoundStyle === s.value
//                       ? "border-[var(--theme-primary)] bg-[var(--theme-light)]"
//                       : "border-[#e5e7eb] hover:border-[#d1d5db]"
//                   }`}>
//                   <span className="text-[22px]">{s.emoji}</span>
//                   <span className="text-[12px] font-semibold text-[#111827]">{s.label}</span>
//                   <span className="text-[10px] text-[#6b7280]">{s.desc}</span>
//                 </button>
//               ))}
//             </div>
//           </div>

//           {/* Volume slider */}
//           <div className={`flex flex-col gap-[8px] transition-opacity ${!settings.messageSound ? "opacity-40 pointer-events-none" : ""}`}>
//             <div className="flex items-center justify-between">
//               <p className="text-[13px] font-medium text-[#374151]">Volume</p>
//               <span className="text-[13px] font-bold" style={{ color: "var(--theme-primary)" }}>{settings.messageVolume}%</span>
//             </div>
//             <input type="range" min={0} max={100} step={5} value={settings.messageVolume}
//               onChange={e => update({ messageVolume: Number(e.target.value) })}
//               className="w-full h-[4px] rounded-full appearance-none cursor-pointer"
//               style={{ background: `linear-gradient(to right, var(--theme-primary) ${settings.messageVolume}%, #e5e7eb ${settings.messageVolume}%)` }} />
//             <div className="flex justify-between text-[11px] text-[#9ca3af]">
//               <span>Off</span><span>Low</span><span>Medium</span><span>High</span>
//             </div>
//           </div>

//           {/* Test */}
//           <button onClick={() => { unlockAudio(); playSound("message"); }}
//             disabled={!settings.messageSound || settings.messageSoundStyle === "silent"}
//             className="flex items-center justify-center gap-[8px] h-[40px] px-[20px] border border-[#e5e7eb]
//                        text-[13px] font-medium text-[#374151] rounded-[10px] hover:bg-[#f9fafb]
//                        transition w-full sm:w-fit disabled:opacity-40">
//             🔊 Test Message Sound
//           </button>
//         </div>
//       </SectionCard>

//       {/* Notification Sounds */}
//       <SectionCard>
//         <div className={`${cardPad} border-b border-[#f3f4f6]`}>
//           <div className="flex items-center gap-[10px]">
//             <div className="w-[40px] h-[40px] rounded-[10px] flex items-center justify-center flex-shrink-0 bg-[#f0fdf4]">
//               <Bell size={18} className="text-[#22c55e]" />
//             </div>
//             <div>
//               <h2 className="text-[17px] sm:text-[20px] font-semibold text-[#111827]">Notification Sounds</h2>
//               <p className="text-[13px] text-[#6b7280]">Plays when a new case update or alert arrives</p>
//             </div>
//           </div>
//         </div>

//         <div className={`${cardPad} flex flex-col gap-[20px]`}>

//           {/* Enable toggle */}
//           <div className="flex items-center justify-between">
//             <div>
//               <p className="text-[14px] font-medium text-[#111827]">Enable Notification Sound</p>
//               <p className="text-[12px] text-[#6b7280] mt-[2px]">Case updates, deadlines, and alerts</p>
//             </div>
//             <Toggle checked={settings.notifSound} onChange={() => update({ notifSound: !settings.notifSound })} />
//           </div>

//           {/* Volume slider */}
//           <div className={`flex flex-col gap-[8px] transition-opacity ${!settings.notifSound ? "opacity-40 pointer-events-none" : ""}`}>
//             <div className="flex items-center justify-between">
//               <p className="text-[13px] font-medium text-[#374151]">Volume</p>
//               <span className="text-[13px] font-bold" style={{ color: "var(--theme-primary)" }}>{settings.notifVolume}%</span>
//             </div>
//             <input type="range" min={0} max={100} step={5} value={settings.notifVolume}
//               onChange={e => update({ notifVolume: Number(e.target.value) })}
//               className="w-full h-[4px] rounded-full appearance-none cursor-pointer"
//               style={{ background: `linear-gradient(to right, var(--theme-primary) ${settings.notifVolume}%, #e5e7eb ${settings.notifVolume}%)` }} />
//             <div className="flex justify-between text-[11px] text-[#9ca3af]">
//               <span>Off</span><span>Low</span><span>Medium</span><span>High</span>
//             </div>
//           </div>

//           {/* Test */}
//           <button onClick={() => { unlockAudio(); playSound("notif"); }}
//             disabled={!settings.notifSound}
//             className="flex items-center justify-center gap-[8px] h-[40px] px-[20px] border border-[#e5e7eb]
//                        text-[13px] font-medium text-[#374151] rounded-[10px] hover:bg-[#f9fafb]
//                        transition w-full sm:w-fit disabled:opacity-40">
//             🔊 Test Notification Sound
//           </button>
//         </div>
//       </SectionCard>

//       {/* Info */}
//       <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-[12px] p-[16px] flex items-start gap-[10px]">
//         <span className="text-[18px] flex-shrink-0">💡</span>
//         <p className="text-[12px] text-[#1e40af] leading-[18px]">
//           Sound settings are saved locally on this device. If you switch browsers or devices
//           you'll need to set them again. Audio unlocks after your first interaction with the app.
//         </p>
//       </div>
//     </div>
//   );
// };

// // =============================================================================
// // SECTION: Session (placeholder)
// // =============================================================================

// const SessionPlaceholder = () => {
//   const [rememberMe, setRememberMe] = useState(true);
//   return (
//     <SectionCard>
//       <div className={`${cardPad} border-b border-[#f3f4f6]`}>
//         <h2 className="text-[17px] sm:text-[20px] font-semibold text-[#111827]">Session Settings</h2>
//         <p className="text-[13px] sm:text-[14px] text-[#6b7280] mt-[4px]">Configure how long you stay signed in.</p>
//       </div>
//       <div className={`${cardPad} flex flex-col gap-[16px]`}>
//         <div className="border border-[#e5e7eb] rounded-[12px] p-[16px] sm:p-[20px]">
//           <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-[10px]">
//             <div>
//               <h3 className="text-[14px] sm:text-[15px] font-semibold text-[#111827]">Automatic Sign Out</h3>
//               <p className="text-[12px] sm:text-[13px] text-[#6b7280] mt-[2px]">Auto sign-out after inactivity</p>
//             </div>
//             <select className="h-[36px] px-[12px] border border-[#e5e7eb] rounded-[8px] text-[13px] text-[#374151] bg-white focus:outline-none w-full sm:w-auto">
//               <option>30 minutes</option><option>1 hour</option><option>4 hours</option><option>Never</option>
//             </select>
//           </div>
//         </div>
//         <div className="border border-[#e5e7eb] rounded-[12px] p-[16px] sm:p-[20px]">
//           <div className="flex items-start justify-between gap-[12px]">
//             <div>
//               <h3 className="text-[14px] sm:text-[15px] font-semibold text-[#111827]">Remember Me</h3>
//               <p className="text-[12px] sm:text-[13px] text-[#6b7280] mt-[4px]">Stay signed in on this device for 30 days.</p>
//             </div>
//             <Toggle checked={rememberMe} onChange={() => setRememberMe(!rememberMe)} />
//           </div>
//         </div>
//       </div>
//     </SectionCard>
//   );
// };

// // =============================================================================
// // Route → section mapping + page titles
// // =============================================================================

// const SECTION_TITLES: Record<SectionId, { title: string; subtitle: string }> = {
//   profile:           { title:"Profile",                       subtitle:"Manage your personal information and photo"        },
//   authentication:    { title:"Authentication",                 subtitle:"Configure login methods and linked accounts"       },
//   mfa:               { title:"Multi-Factor Authentication",    subtitle:"Add a second verification step for extra security" },
//   "login-history":   { title:"Login History",                  subtitle:"Review recent access to your account"              },
//   privacy:           { title:"Privacy Settings",               subtitle:"Control visibility and data sharing"               },
//   // ── CHANGED: this route now shows the real Login History content (see
//   // COMPONENTS below) instead of the old static placeholder, so the title
//   // reflects that rather than promising a separate "devices" feature.
//   devices:           { title:"Connected Devices & Sessions",   subtitle:"Review recent access and sign out other sessions"  },
//   session:           { title:"Session Settings",               subtitle:"Configure session timeout and concurrent logins"   },
//   "security-alerts": { title:"Security Alerts",                subtitle:"Get notified about important security events"      },
//   notifications:     { title:"Notification Sounds",            subtitle:"Customise sounds for messages and alerts"          },
// };

// // =============================================================================
// // Main export
// // =============================================================================

// export default function ProfileSecurity() {
//   const location   = useLocation();
//   const session    = getUiSession();
//   const isHR       = session?.roles?.includes("hr") ?? false;
//   const isAttorney = session?.roles?.includes("attorney") ?? false;

//   const getSection = (): SectionId => {
//     const p = location.pathname;
//     if (p.endsWith("authentication"))  return "authentication";
//     if (p.endsWith("mfa"))             return "mfa";
//     if (p.endsWith("login-history"))   return "login-history";
//     if (p.endsWith("privacy"))         return "privacy";
//     if (p.endsWith("devices"))         return "devices";
//     if (p.endsWith("session"))         return "session";
//     if (p.endsWith("security-alerts")) return "security-alerts";
//     if (p.endsWith("notifications"))   return "notifications";
//     return "profile";
//   };

//   const activeSection = getSection();
//   const { title, subtitle } = SECTION_TITLES[activeSection];

//   // ── CHANGED: "devices" now reuses LoginHistorySection — the old
//   // ConnectedDevicesPlaceholder was a static duplicate showing less real
//   // information than this section already provides.
//   const COMPONENTS: Record<SectionId, React.ReactNode> = {
//     profile: (
//       <div className="flex flex-col gap-[24px]">
//         <PersonalInfoSection />
//         {isHR && <CompanyInfoSection />}
//         {isAttorney && <AttorneyInfoSection />}
//       </div>
//     ),
//     authentication:    <AuthenticationSection />,
//     mfa:               <MFASection />,
//     "login-history":   <LoginHistorySection />,
//     privacy:           <PrivacySection isHR={isHR} />,
//     devices:           <LoginHistorySection />,
//     session:           <SessionPlaceholder />,
//     "security-alerts": <SecurityAlertsSection />,
//     notifications:     <NotificationSoundsSection />,
//   };

//   return (
//     <div className="flex flex-col h-full bg-[#f9fafb]" style={{ fontFamily:"Inter, sans-serif" }}>
//       <PageHeader title={title} subtitle={subtitle} showBell={false} />
//       <PageContent>
//         <div className="max-w-[900px]">
//           {COMPONENTS[activeSection]}
//         </div>
//       </PageContent>
//     </div>
//   );
// }




// src/pages/employee/ProfileSecurity.tsx
// Shared for both employee + HR roles.
// Role is detected from ui_session cookie — Privacy section adapts accordingly.

import { useState, useRef, useEffect, useMemo } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  Edit2, Upload, Trash2, Save, RotateCcw,
  CheckCircle, XCircle, Smartphone, Laptop,
  MapPin, Download,
  Mail, Phone, Building, Globe2,
  Info, Check, X, FileText, Monitor, Clock, AlertTriangle,
  Lock, Globe, Bell, ShieldCheck,
} from "lucide-react";

import { useMyProfile, useLoginHistory,notifyProfileUpdated, type LoginHistoryResponse } from "../../hooks/employee/useProfile";
import { updateMyProfile, signOutAllDevices, uploadProfilePicture, removeProfilePicture } from "../../api/employee/profile.api";
import { useAuthStore } from "../../store/authStore";
import { useCompanyProfile } from "../../hooks/hr/useCompanyProfile";
import {
  updateCompanyProfile, uploadCompanyLogo, removeCompanyLogo,
} from "../../api/hr/companyProfile.api";
import { useAttorneyProfile } from "../../hooks/lawyer/useAttorneyProfile";
import {
  updateAttorneyProfile, uploadAttorneyPhoto, removeAttorneyPhoto,
} from "../../api/lawyer/attorneyProfile.api";
import { useAddPersonalEmail, useVerifyPersonalEmail, useCheckPersonalEmail } from "../../hooks/auth/usePersonalEmail";
// XL sheet row 14: stock user-avatar.jpg placeholder retired — new
// accounts now render an initials-in-a-gradient-circle instead of a
// generic person photo. Import removed to satisfy TS noUnusedLocals.
// import imgUserAvatar from "../../assets/icons/user-avatar.jpg";
import { getFileUrl } from "../../utils/fileUrl";
import {  getUiSession, updateUiSession } from "../../utils/uiSession";
import { PageHeader, PageContent } from "../../components/layout/Pageheader";
// XL row 29 — Passport / Immigration / Employment additional profile fields.
import AdditionalProfileFields from "../../components/employee/AdditionalProfileFields";
import { ThemeColorStrip } from "../settings/ThemeColorStrip";
import {
  useNotificationSoundSettings,
  playSound,
  unlockAudio,
} from "../../hooks/employee/useNotificationSoundSettings";
import type { SoundStyle } from "../../hooks/employee/useNotificationSoundSettings";

// ── Country codes ─────────────────────────────────────────────────────────────
// (List kept for the future OTP-verified phone-change flow — will be
// re-used when the country picker returns. Commented out for now to
// satisfy TS noUnusedLocals since the phone edit UI is currently
// read-only per XL row 16.)
// const COUNTRIES = [
//   { code:"US",flag:"🇺🇸",dial:"+1"  },{ code:"GB",flag:"🇬🇧",dial:"+44" },
//   { code:"IN",flag:"🇮🇳",dial:"+91" },{ code:"CA",flag:"🇨🇦",dial:"+1"  },
//   { code:"AU",flag:"🇦🇺",dial:"+61" },{ code:"DE",flag:"🇩🇪",dial:"+49" },
//   { code:"FR",flag:"🇫🇷",dial:"+33" },{ code:"AE",flag:"🇦🇪",dial:"+971"},
//   { code:"SG",flag:"🇸🇬",dial:"+65" },{ code:"JP",flag:"🇯🇵",dial:"+81" },
// ];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type SectionId =
  | "profile" | "authentication" | "mfa" | "login-history"
  | "privacy"  | "devices"        | "session" | "security-alerts"
  | "notifications";

const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
  <button onClick={onChange}
    className="relative inline-flex h-[24px] w-[44px] items-center rounded-full transition-colors duration-200 focus:outline-none flex-shrink-0"
    style={{ backgroundColor: checked ? "var(--theme-primary)" : "#e5e7eb" }}>
    <span className={`inline-block h-[20px] w-[20px] transform rounded-full bg-white shadow-md transition-transform duration-200 ${checked ? "translate-x-[22px]" : "translate-x-[2px]"}`} />
  </button>
);

const Checkbox = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
  <button onClick={onChange}
    className="h-[18px] w-[18px] rounded border-[1.5px] flex items-center justify-center transition-colors flex-shrink-0"
    style={{ backgroundColor: checked ? "var(--theme-primary)" : "white", borderColor: checked ? "var(--theme-primary)" : "#d1d5db" }}>
    {checked && <Check size={11} className="text-white" strokeWidth={3} />}
  </button>
);

const SectionCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white rounded-[16px] border border-[#e5e7eb] shadow-[0_1px_3px_rgba(0,0,0,0.06)] ${className}`}>
    {children}
  </div>
);

const ReadOnlyField = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
  <div className="flex flex-col gap-[6px]">
    <label className="text-[13px] font-medium text-[#374151]">{label}</label>
    <div className="w-full h-[46px] rounded-[10px] border border-[#e5e7eb] bg-[#f3f4f6] text-[#9ca3af] text-[14px] px-[14px] flex items-center gap-[8px] cursor-not-allowed select-none">
      <Lock size={12} className="text-[#d1d5db] shrink-0" />
      <span className="truncate">{value || "—"}</span>
    </div>
    {hint && <p className="text-[11px] text-[#9ca3af]">{hint}</p>}
  </div>
);

const Spinner = ({ size = 13, className = "text-white" }: { size?: number; className?: string }) => (
  <svg className={`animate-spin ${className}`} style={{ width:size, height:size }} fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

const cardPad  = "p-[20px] sm:p-[24px] lg:p-[32px]";
const cardPadX = "px-[20px] sm:px-[24px] lg:px-[32px]";

const PersonalInfoSection = () => {
  const { data: profile, isLoading, refetch } = useMyProfile();
  const user = useAuthStore(s => s.user);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate     = useNavigate();
  const [searchParams] = useSearchParams();
  const [removing, setRemoving] = useState(false);

  const [editing,         setEditing]         = useState(false);
  const [saving,          setSaving]          = useState(false);
  const [error,           setError]           = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError,     setAvatarError]     = useState<string | null>(null);
  const [phone,       setPhone]       = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [timezone,    setTimezone]    = useState("PT");
  const [language,    setLanguage]    = useState("en-US");
  /* XL sheet row 15: previously Full Name was rendered as a
     ReadOnlyField with the hint "Contact support to update your
     name." Backend already accepts `full_legal_name` on PATCH
     /users/me/profile, so making this editable is a pure FE fix. */
  const [fullName,    setFullName]    = useState("");

  const displayName  = (profile?.full_legal_name ?? `${user?.first_name ?? ""} ${user?.last_name ?? ""}`).trim() || "—";
  const displayEmail = profile?.email ?? user?.email ?? "—";

  /* XL sheet row 14: previously we fell back to a shipped stock
     photo (`imgUserAvatar` = user-avatar.jpg in /assets/icons/) any
     time the user hadn't uploaded a picture. That meant brand-new
     accounts always looked like "some other person" until they
     manually removed and re-uploaded. Fix: only render an <img>
     when the backend really has a stored URL; otherwise show a
     branded initials circle built from first + last name. */
  const resolvedAvatarUrl = getFileUrl(profile?.profile_picture_url);
  const initials = ((): string => {
    const first = (user?.first_name ?? profile?.full_legal_name?.split(' ')[0] ?? '').trim();
    const last  = (user?.last_name  ?? profile?.full_legal_name?.split(' ').slice(-1)[0] ?? '').trim();
    const a = first[0] ?? '';
    const b = last[0]  ?? '';
    return (a + b).toUpperCase() || '?';
  })();

  const seedForm = () => {
    setPhone(profile?.phone_number ?? "");
    setCountryCode(profile?.country_code ?? "+91");
    setTimezone(profile?.timezone ?? "PT");
    setLanguage(profile?.preferred_language ?? "en-US");
    setFullName(displayName === "—" ? "" : displayName);
  };

  const handleSave = async () => {
    setSaving(true); setError(null);
    try {
      /* Row 15: full_legal_name now flows through the same PATCH
         alongside phone/timezone/language so the user can rename
         themselves inline. Blank ("") means "don't touch" — we send
         undefined so the backend leaves the field alone. */
      const trimmedName = fullName.trim();
      /* XL row 16: phone_number + country_code intentionally NOT
         sent from this edit view anymore — updating them without OTP
         verification is a takeover risk. Once the backend ships the
         verified swap flow, we'll re-add these fields as their own
         dedicated card with an OTP step. */
      await updateMyProfile({
        full_legal_name:      trimmedName ? trimmedName : undefined,
        timezone,
        preferred_language:   language,
      });

      /* Sync the UI session cookie so the sidebar avatar/initials +
         the dashboard greeting reflect the new name immediately.
         Backend PATCH /users/me/profile updates profiles.full_legal_name
         but leaves users.first_name / users.last_name alone, so
         /users/me will keep returning the old first/last name until a
         backend-side sync ships. Splitting the display name and
         writing it into the session cookie makes the UI look right
         right now — Sidebar listens for the "ui-session-updated"
         event and re-renders. */
      if (trimmedName) {
        const parts     = trimmedName.split(/\s+/);
        const newFirst  = parts[0] ?? "";
        const newLast   = parts.length > 1 ? parts.slice(1).join(" ") : "";
        updateUiSession({ first_name: newFirst, last_name: newLast });
      }
      notifyProfileUpdated();

      await refetch(); setEditing(false);
      const returnTo = searchParams.get("returnTo");
      if (returnTo) navigate(returnTo);
    } catch { setError("Failed to save changes. Please try again."); }
    finally { setSaving(false); }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setAvatarError("File must be under 5 MB."); return; }
    setAvatarUploading(true); setAvatarError(null);
    try {
      await uploadProfilePicture(file);
      await refetch();
      notifyProfileUpdated();
    } catch { setAvatarError("Failed to upload photo."); }
    finally { setAvatarUploading(false); e.target.value = ""; }
  };

  const handleRemoveAvatar = async () => {
    if (!profile?.profile_picture_url) return;
    setRemoving(true); setAvatarError(null);
    try {
      await removeProfilePicture();
      await refetch();
      notifyProfileUpdated();
    } catch { setAvatarError("Failed to remove photo."); }
    finally { setRemoving(false); }
  };

  if (isLoading) return <SectionCard><div className="flex items-center justify-center py-[64px]"><Spinner size={28} className="text-indigo-600" /></div></SectionCard>;

  return (
    <SectionCard>
      <div className={`${cardPad} border-b border-[#f3f4f6] flex items-center justify-between gap-[12px]`}>
        <div>
          <h2 className="text-[17px] sm:text-[20px] font-semibold text-[#111827]">Personal Information</h2>
          <p className="text-[13px] sm:text-[14px] text-[#6b7280] mt-[4px]">Update your contact details and preferences.</p>
        </div>
        {!editing && (
          <div className="flex items-center gap-3">
            <ThemeColorStrip />
            <button onClick={() => { seedForm(); setEditing(true); setError(null); }}
              className="flex items-center gap-[6px] text-[13px] sm:text-[14px] font-medium transition flex-shrink-0"
              style={{ color: "var(--theme-primary)" }}>
              <Edit2 size={14} /> Edit
            </button>
          </div>
        )}
      </div>

      {error && <div className={`${cardPadX} mt-[16px] bg-[#fef2f2] border border-[#fca5a5] text-[#dc2626] rounded-[10px] px-[16px] py-[12px] text-[13px]`}>{error}</div>}

      <div className={`${cardPadX} py-[20px] sm:py-[24px] border-b border-[#f3f4f6]`}>
        <p className="text-[13px] font-medium text-[#374151] mb-[12px]">Profile Picture</p>
        <div className="flex flex-wrap items-center gap-[16px]">
          {resolvedAvatarUrl ? (
            <img
              src={resolvedAvatarUrl}
              alt="Profile"
              className="w-[64px] h-[64px] sm:w-[80px] sm:h-[80px] rounded-full object-cover border-4 border-[#f3f4f6] flex-shrink-0"
              /* If the real upload fails to load (broken URL / permissions),
                 don't fall back to a stock JPG — hide the img and let the
                 sibling initials circle show through by triggering a
                 re-render. Since we don't have a state hook for that, we
                 just clear the src attribute; the layout still leaves
                 space so the buttons don't jump. */
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <div
              aria-label={`Avatar for ${displayName}`}
              className="w-[64px] h-[64px] sm:w-[80px] sm:h-[80px] rounded-full flex items-center justify-center border-4 border-[#f3f4f6] flex-shrink-0 text-white font-semibold text-[22px] sm:text-[26px] select-none"
              style={{
                background: 'linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-gradient-end) 100%)',
              }}
            >
              {initials}
            </div>
          )}
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={handleAvatarChange} />
          <div className="flex flex-col gap-[8px]">
            <div className="flex flex-wrap gap-[8px]">
              <button onClick={() => fileInputRef.current?.click()} disabled={avatarUploading}
                className="flex items-center gap-[6px] px-[12px] sm:px-[14px] h-[34px] sm:h-[36px] text-white text-[12px] sm:text-[13px] font-medium rounded-[8px] hover:opacity-90 transition disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-gradient-end) 100%)" }}>
                {avatarUploading ? <><Spinner size={13} /> Uploading…</> : <><Upload size={13} /> Upload New</>}
              </button>
              <button onClick={handleRemoveAvatar} disabled={removing || !profile?.profile_picture_url}
                className="flex items-center gap-[6px] px-[12px] sm:px-[14px] h-[34px] sm:h-[36px] border border-[#e5e7eb] text-[#6b7280] text-[12px] sm:text-[13px] font-medium rounded-[8px] hover:bg-[#f9fafb] transition disabled:opacity-60">
                {removing ? <><Spinner size={13} className="text-[#6b7280]" /> Removing…</> : <><Trash2 size={13} /> Remove</>}
              </button>
            </div>
            {avatarError ? <p className="text-[12px] text-[#ef4444]">{avatarError}</p>
              : <p className="text-[12px] text-[#9ca3af]">JPG, PNG, GIF or WebP. Max 5 MB.</p>}
          </div>
        </div>
      </div>

      <div className={`${cardPad} flex flex-col gap-[16px] sm:gap-[20px]`}>
        {editing ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-[16px]">
              {/* Full Name — now editable (XL row 15). Backend already
                  accepts `full_legal_name` on PATCH /users/me/profile,
                  so this is a pure UI switch from ReadOnlyField to a
                  real <input>. Save is wired into handleSave() above. */}
              <div className="flex flex-col gap-[6px]">
                <label className="text-[13px] font-medium text-[#374151]">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Enter your legal name"
                  className="w-full h-[46px] rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] text-[#111827] text-[14px] px-[14px] focus:outline-none focus:ring-2 transition"
                  style={{ outlineColor: "var(--theme-primary)" }}
                />
                <p className="text-[12px] text-[#9ca3af]">Use the name as it appears on your passport.</p>
              </div>
              {/* Email — still read-only. Changing an email safely
                  requires an OTP-verified swap flow on the backend
                  (POST /auth/email-change/request + verify) that
                  isn't shipped yet; spec sent separately. */}
              <ReadOnlyField label="Email Address" value={displayEmail} hint="Email changes require verification — coming soon." />
            </div>
            {/* Phone Number — read-only in the edit view now (XL row 16).
                Previously the number was directly editable which is a
                security hole: a stolen session could silently swap the
                number that receives MFA codes and password-reset SMS.
                Same risk on registration (row 3 already limits to 10
                digits but doesn't verify ownership).
                Real fix requires an OTP-verified swap flow on the
                backend (POST /auth/phone-change/request →
                POST /auth/phone-change/verify). Spec sent separately.
                Until then, we expose the current number in read-only
                mode with a hint pointing the user to the coming flow. */}
            <div className="flex flex-col gap-[6px]">
              <label className="text-[13px] font-medium text-[#374151]">Phone Number</label>
              <div className="flex gap-[8px]">
                <div className="h-[46px] rounded-[10px] border border-[#e5e7eb] bg-[#f3f4f6] text-[#6b7280] text-[14px] px-[10px] flex items-center w-[100px] sm:w-[110px] shrink-0 select-none">
                  {countryCode || '+91'}
                </div>
                <div className="flex-1 h-[46px] rounded-[10px] border border-[#e5e7eb] bg-[#f3f4f6] text-[#6b7280] text-[14px] px-[14px] flex items-center select-none">
                  {phone || <span className="italic text-[#9ca3af]">Not set</span>}
                </div>
              </div>
              <p className="text-[12px] text-[#9ca3af]">
                Phone changes require OTP verification — coming soon.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-[16px]">
              <div className="flex flex-col gap-[6px]">
                <label className="text-[13px] font-medium text-[#374151]">Timezone</label>
                <select value={timezone} onChange={e => setTimezone(e.target.value)}
                  className="w-full h-[46px] rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] text-[#111827] text-[14px] px-[14px] focus:outline-none focus:ring-2 cursor-pointer"
                  style={{ outlineColor: "var(--theme-primary)" }}>
                  <option value="PT">Pacific Time</option><option value="MT">Mountain Time</option>
                  <option value="CT">Central Time</option><option value="ET">Eastern Time</option>
                  <option value="IST">India Standard Time</option><option value="GMT">GMT</option>
                </select>
              </div>
              <div className="flex flex-col gap-[6px]">
                <label className="text-[13px] font-medium text-[#374151]">Preferred Language</label>
                <select value={language} onChange={e => setLanguage(e.target.value)}
                  className="w-full h-[46px] rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] text-[#111827] text-[14px] px-[14px] focus:outline-none focus:ring-2 cursor-pointer"
                  style={{ outlineColor: "var(--theme-primary)" }}>
                  <option value="en-US">English (US)</option><option value="es">Spanish</option>
                  <option value="fr">French</option><option value="hi">Hindi</option>
                </select>
              </div>
            </div>
          </>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-[16px]">
            {[
              { label:"Full Name",         value: displayName },
              { label:"Email Address",     value: displayEmail },
              { label:"Phone Number",      value: profile?.phone_number ? `${profile.country_code ?? ""} ${profile.phone_number}`.trim() : "—" },
              { label:"Timezone",          value: profile?.timezone ?? "—" },
              { label:"Preferred Language",value: profile?.preferred_language ?? "—" },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col gap-[4px]">
                <span className="text-[12px] text-[#6b7280] font-medium">{label}</span>
                <span className="text-[13px] sm:text-[14px] text-[#111827]">{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <div className={`${cardPadX} pb-[20px] sm:pb-[28px] pt-[16px] border-t border-[#f3f4f6] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-[12px]`}>
          <button onClick={() => { setEditing(false); setError(null); }}
            className="flex items-center justify-center sm:justify-start gap-[6px] text-[#6b7280] text-[13px] hover:text-[#374151] transition">
            <RotateCcw size={13} /> Undo Changes
          </button>
          <div className="flex gap-[8px]">
            <button onClick={() => { setEditing(false); setError(null); }}
              className="flex-1 sm:flex-none h-[40px] px-[16px] border border-[#e5e7eb] text-[#374151] text-[13px] font-medium rounded-[10px] hover:bg-[#f9fafb] transition">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 sm:flex-none h-[40px] px-[16px] text-white text-[13px] font-medium rounded-[10px] hover:opacity-90 transition flex items-center justify-center gap-[6px] disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-gradient-end) 100%)" }}>
              {saving ? <><Spinner size={14} /> Saving…</> : <><Save size={14} /> Save Changes</>}
            </button>
          </div>
        </div>
      )}
    </SectionCard>
  );
};

const PersonalEmailSection = () => {
  const { data: profile, refetch } = useMyProfile();
  const { addEmail, loading: sending, error: sendError, reset: resetAdd } = useAddPersonalEmail();
  const { verify, loading: verifying, error: verifyError } = useVerifyPersonalEmail();
  const { check: checkEmail, checking, result: availability, reset: resetAvailability } = useCheckPersonalEmail();

  const [mode, setMode] = useState<"idle" | "entering-email" | "entering-code">("idle");
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");

  const existingEmail   = (profile as { personal_email?: string | null } | undefined)?.personal_email ?? null;
  const isVerified      = !!(profile as { personal_email_verified?: boolean } | undefined)?.personal_email_verified;
  const hasPendingEmail = !!existingEmail && !isVerified;

  useEffect(() => {
    if (mode !== "entering-email") return;
    if (!email.trim() || !EMAIL_RE.test(email.trim())) { resetAvailability(); return; }
    const t = setTimeout(() => void checkEmail(email.trim()), 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, mode]);

  const handleSend = async () => {
    if (!email.trim()) return;
    if (availability?.available === false) return;
    const ok = await addEmail(email.trim());
    if (ok) setMode("entering-code");
  };

  const handleResend = async () => {
    if (!existingEmail) return;
    await addEmail(existingEmail);
  };

  const handleVerify = async () => {
    if (otpCode.trim().length !== 6) return;
    const ok = await verify(otpCode.trim());
    if (ok) {
      await refetch();
      setMode("idle");
      setOtpCode("");
      setEmail("");
      resetAdd();
      resetAvailability();
    }
  };

  return (
    <SectionCard>
      <div className={`${cardPad} border-b border-[#f3f4f6]`}>
        <h2 className="text-[17px] sm:text-[20px] font-semibold text-[#111827]">Backup Email</h2>
        <p className="text-[13px] sm:text-[14px] text-[#6b7280] mt-[4px]">
          Add a personal email so you can still sign in even if you ever lose access to your
          primary email — for example if you leave your current company.
        </p>
      </div>

      <div className={`${cardPad} flex flex-col gap-[16px]`}>
        {mode === "idle" && isVerified && existingEmail && (
          <div className="flex items-center justify-between gap-[12px] p-[14px] border border-[#e5e7eb] rounded-[10px]">
            <div className="flex items-center gap-[10px] min-w-0">
              <div className="w-[36px] h-[36px] rounded-[10px] bg-[#f0fdf4] flex items-center justify-center flex-shrink-0">
                <ShieldCheck size={16} className="text-[#10b981]" />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] sm:text-[14px] font-medium text-[#111827] truncate">{existingEmail}</p>
                <p className="text-[11px] text-[#10b981]">Verified — can be used to log in</p>
              </div>
            </div>
            <button onClick={() => { setMode("entering-email"); setEmail(""); resetAvailability(); }}
              className="h-[34px] px-[12px] border border-[#e5e7eb] text-[#374151] text-[12px] font-medium rounded-[8px] hover:bg-[#f9fafb] transition flex-shrink-0">
              Change
            </button>
          </div>
        )}

        {mode === "idle" && hasPendingEmail && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-[12px] p-[14px] border border-[#fde68a] bg-[#fffbeb] rounded-[10px]">
            <div className="flex items-center gap-[10px] min-w-0">
              <div className="w-[36px] h-[36px] rounded-[10px] bg-[#fef3c7] flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={16} className="text-[#c2410c]" />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] sm:text-[14px] font-medium text-[#111827] truncate">{existingEmail}</p>
                <p className="text-[11px] text-[#c2410c]">Verification incomplete</p>
              </div>
            </div>
            <button onClick={() => { void handleResend(); setMode("entering-code"); }} disabled={sending}
              className="h-[36px] px-[14px] border border-[#e5e7eb] text-[#374151] text-[12px] font-medium rounded-[8px] hover:bg-white transition flex-shrink-0 disabled:opacity-60">
              {sending ? "Sending…" : "Resend code"}
            </button>
          </div>
        )}

        {mode === "idle" && !existingEmail && (
          <button onClick={() => setMode("entering-email")}
            className="flex items-center justify-center gap-[8px] h-[40px] px-[16px] border border-[#e5e7eb] text-[#374151] text-[13px] font-medium rounded-[10px] hover:bg-[#f9fafb] transition w-full sm:w-fit">
            <Mail size={14} /> Add a backup email
          </button>
        )}

        {mode === "entering-email" && (
          <div className="flex flex-col gap-[10px] max-w-[380px]">
            <label className="text-[13px] font-medium text-[#374151]">Personal email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@personal-email.com"
              className="w-full h-[46px] rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] text-[#111827] text-[14px] px-[14px] focus:outline-none focus:ring-2 transition"
              style={{ outlineColor: "var(--theme-primary)" }} />

            {checking && <p className="text-[12px] text-[#94a3b8]">Checking…</p>}
            {!checking && availability?.available === false && (
              <p className="text-[12px] text-[#ef4444]">{availability.reason}</p>
            )}
            {!checking && availability?.available === true && email.trim() && EMAIL_RE.test(email.trim()) && (
              <p className="text-[12px] text-[#10b981]">Available</p>
            )}
            {sendError && <p className="text-[12px] text-[#ef4444]">{sendError}</p>}

            <div className="flex gap-[8px]">
              <button onClick={() => void handleSend()}
                disabled={sending || !email.trim() || availability?.available === false}
                className="h-[38px] px-[16px] text-white text-[13px] font-medium rounded-[10px] hover:opacity-90 transition disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-gradient-end) 100%)" }}>
                {sending ? "Sending…" : "Send code"}
              </button>
              <button onClick={() => { setMode("idle"); setEmail(""); resetAvailability(); }}
                className="h-[38px] px-[16px] border border-[#e5e7eb] text-[#374151] text-[13px] font-medium rounded-[10px] hover:bg-[#f9fafb] transition">
                Cancel
              </button>
            </div>
          </div>
        )}

        {mode === "entering-code" && (
          <div className="flex flex-col gap-[10px] max-w-[380px]">
            <label className="text-[13px] font-medium text-[#374151]">Verification code</label>
            <p className="text-[12px] text-[#6b7280] -mt-[4px]">
              Sent to {email || existingEmail}. Expires in 15 minutes.
            </p>
            <input value={otpCode} onChange={e => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="6-digit code" inputMode="numeric"
              className="w-full h-[46px] rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] text-[#111827] text-[14px] px-[14px] tracking-[4px] focus:outline-none focus:ring-2 transition"
              style={{ outlineColor: "var(--theme-primary)" }} />
            {verifyError && <p className="text-[12px] text-[#ef4444]">{verifyError}</p>}
            <div className="flex gap-[8px]">
              <button onClick={() => void handleVerify()} disabled={verifying || otpCode.length !== 6}
                className="h-[38px] px-[16px] text-white text-[13px] font-medium rounded-[10px] hover:opacity-90 transition disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-gradient-end) 100%)" }}>
                {verifying ? "Verifying…" : "Confirm code"}
              </button>
              <button onClick={() => { setMode("idle"); setOtpCode(""); }}
                className="h-[38px] px-[16px] border border-[#e5e7eb] text-[#374151] text-[13px] font-medium rounded-[10px] hover:bg-[#f9fafb] transition">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </SectionCard>
  );
};

const COMPANY_SIZES = [
  { value: "1_10",      label: "1–10 employees"    },
  { value: "11_50",     label: "11–50 employees"   },
  { value: "51_200",    label: "51–200 employees"  },
  { value: "201_500",   label: "201–500 employees" },
  { value: "501_1000",  label: "501–1,000 employees" },
  { value: "1000_plus", label: "1,000+ employees"  },
];

const CompanyInfoSection = () => {
  const { data: company, isLoading, refetch } = useCompanyProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [removingLogo,  setRemovingLogo]  = useState(false);
  const [logoError,     setLogoError]     = useState<string | null>(null);

  const [form, setForm] = useState({
    company_name: "", company_size: "", industry: "", website: "", domain: "",
    ein: "", address_line1: "", address_line2: "", city: "", state: "",
    zip_code: "", country: "US", contact_name: "", contact_email: "", contact_phone: "",
  });

  const seedForm = () => {
    if (!company) return;
    setForm({
      company_name:  company.company_name  ?? "",
      company_size:  company.company_size  ?? "",
      industry:      company.industry      ?? "",
      website:       company.website       ?? "",
      domain:        company.domain        ?? "",
      ein:           company.ein           ?? "",
      address_line1: company.address_line1 ?? "",
      address_line2: company.address_line2 ?? "",
      city:          company.city          ?? "",
      state:         company.state         ?? "",
      zip_code:      company.zip_code      ?? "",
      country:       company.country       ?? "US",
      contact_name:  company.contact_name  ?? "",
      contact_email: company.contact_email ?? "",
      contact_phone: company.contact_phone ?? "",
    });
  };

  const setField = (key: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSave = async () => {
    setSaving(true); setError(null);
    try {
      await updateCompanyProfile(form);
      await refetch();
      setEditing(false);
    } catch { setError("Failed to save company details. Please try again."); }
    finally { setSaving(false); }
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setLogoError("File must be under 5 MB."); return; }
    setLogoUploading(true); setLogoError(null);
    try {
      await uploadCompanyLogo(file);
      await refetch();
    } catch { setLogoError("Failed to upload logo."); }
    finally { setLogoUploading(false); e.target.value = ""; }
  };

  const handleRemoveLogo = async () => {
    if (!company?.logo_url) return;
    setRemovingLogo(true); setLogoError(null);
    try {
      await removeCompanyLogo();
      await refetch();
    } catch { setLogoError("Failed to remove logo."); }
    finally { setRemovingLogo(false); }
  };

  if (isLoading) return <SectionCard><div className="flex items-center justify-center py-[64px]"><Spinner size={28} className="text-indigo-600" /></div></SectionCard>;

  return (
    <SectionCard>
      <div className={`${cardPad} border-b border-[#f3f4f6] flex items-center justify-between gap-[12px]`}>
        <div>
          <h2 className="text-[17px] sm:text-[20px] font-semibold text-[#111827] flex items-center gap-[8px]">
            Company Information
            {company?.is_verified ? (
              <span className="flex items-center gap-[4px] text-[11px] font-medium text-[#10b981] bg-[#d1fae5] px-[8px] py-[2px] rounded-full">
                <CheckCircle size={10} /> Verified
              </span>
            ) : (
              <span className="flex items-center gap-[4px] text-[11px] font-medium text-[#c2410c] bg-[#fff7ed] px-[8px] py-[2px] rounded-full">
                <AlertTriangle size={10} /> Not Verified
              </span>
            )}
          </h2>
          <p className="text-[13px] sm:text-[14px] text-[#6b7280] mt-[4px]">
            Your company details — used for domain verification and employee invites.
          </p>
        </div>
        {!editing && (
          <button onClick={() => { seedForm(); setEditing(true); setError(null); }}
            className="flex items-center gap-[6px] text-[13px] sm:text-[14px] font-medium transition flex-shrink-0"
            style={{ color: "var(--theme-primary)" }}>
            <Edit2 size={14} /> Edit
          </button>
        )}
      </div>

      {error && <div className={`${cardPadX} mt-[16px] bg-[#fef2f2] border border-[#fca5a5] text-[#dc2626] rounded-[10px] px-[16px] py-[12px] text-[13px]`}>{error}</div>}

      <div className={`${cardPadX} py-[20px] sm:py-[24px] border-b border-[#f3f4f6]`}>
        <p className="text-[13px] font-medium text-[#374151] mb-[12px]">Company Logo</p>
        <div className="flex flex-wrap items-center gap-[16px]">
          <div className="w-[64px] h-[64px] sm:w-[80px] sm:h-[80px] rounded-[12px] bg-[#f3f4f6] border-4 border-[#f3f4f6] flex items-center justify-center overflow-hidden flex-shrink-0">
            {company?.logo_url
              ? <img src={company.logo_url} alt="Company logo" className="w-full h-full object-cover" />
              : <Building size={28} className="text-[#9ca3af]" />}
          </div>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml" className="hidden" onChange={handleLogoChange} />
          <div className="flex flex-col gap-[8px]">
            <div className="flex flex-wrap gap-[8px]">
              <button onClick={() => fileInputRef.current?.click()} disabled={logoUploading}
                className="flex items-center gap-[6px] px-[12px] sm:px-[14px] h-[34px] sm:h-[36px] text-white text-[12px] sm:text-[13px] font-medium rounded-[8px] hover:opacity-90 transition disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-gradient-end) 100%)" }}>
                {logoUploading ? <><Spinner size={13} /> Uploading…</> : <><Upload size={13} /> Upload New</>}
              </button>
              <button onClick={handleRemoveLogo} disabled={removingLogo || !company?.logo_url}
                className="flex items-center gap-[6px] px-[12px] sm:px-[14px] h-[34px] sm:h-[36px] border border-[#e5e7eb] text-[#6b7280] text-[12px] sm:text-[13px] font-medium rounded-[8px] hover:bg-[#f9fafb] transition disabled:opacity-60">
                {removingLogo ? <><Spinner size={13} className="text-[#6b7280]" /> Removing…</> : <><Trash2 size={13} /> Remove</>}
              </button>
            </div>
            {logoError ? <p className="text-[12px] text-[#ef4444]">{logoError}</p>
              : <p className="text-[12px] text-[#9ca3af]">JPG, PNG, GIF, WebP or SVG. Max 5 MB.</p>}
          </div>
        </div>
      </div>

      <div className={`${cardPad} flex flex-col gap-[16px] sm:gap-[20px]`}>
        {editing ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-[16px]">
              <div className="flex flex-col gap-[6px]">
                <label className="text-[13px] font-medium text-[#374151]">Company Name</label>
                <input value={form.company_name} onChange={setField("company_name")}
                  className="w-full h-[46px] rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] text-[#111827] text-[14px] px-[14px] focus:outline-none focus:ring-2 transition"
                  style={{ outlineColor: "var(--theme-primary)" }} />
              </div>
              <div className="flex flex-col gap-[6px]">
                <label className="text-[13px] font-medium text-[#374151]">Company Size</label>
                <select value={form.company_size} onChange={setField("company_size")}
                  className="w-full h-[46px] rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] text-[#111827] text-[14px] px-[14px] focus:outline-none focus:ring-2 cursor-pointer"
                  style={{ outlineColor: "var(--theme-primary)" }}>
                  <option value="">Select…</option>
                  {COMPANY_SIZES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-[16px]">
              <div className="flex flex-col gap-[6px]">
                <label className="text-[13px] font-medium text-[#374151]">Industry</label>
                <input value={form.industry} onChange={setField("industry")}
                  className="w-full h-[46px] rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] text-[#111827] text-[14px] px-[14px] focus:outline-none focus:ring-2 transition"
                  style={{ outlineColor: "var(--theme-primary)" }} />
              </div>
              <div className="flex flex-col gap-[6px]">
                <label className="text-[13px] font-medium text-[#374151]">Website</label>
                <input value={form.website} onChange={setField("website")} placeholder="https://"
                  className="w-full h-[46px] rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] text-[#111827] text-[14px] px-[14px] focus:outline-none focus:ring-2 transition"
                  style={{ outlineColor: "var(--theme-primary)" }} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-[16px]">
              <div className="flex flex-col gap-[6px]">
                <label className="text-[13px] font-medium text-[#374151]">Domain</label>
                <input value={form.domain} onChange={setField("domain")} placeholder="company.com"
                  className="w-full h-[46px] rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] text-[#111827] text-[14px] px-[14px] focus:outline-none focus:ring-2 transition"
                  style={{ outlineColor: "var(--theme-primary)" }} />
                <p className="text-[11px] text-[#9ca3af]">Used to verify employee invite emails.</p>
              </div>
              <div className="flex flex-col gap-[6px]">
                <label className="text-[13px] font-medium text-[#374151]">EIN</label>
                <input value={form.ein} onChange={setField("ein")}
                  className="w-full h-[46px] rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] text-[#111827] text-[14px] px-[14px] focus:outline-none focus:ring-2 transition"
                  style={{ outlineColor: "var(--theme-primary)" }} />
              </div>
            </div>
            <div className="flex flex-col gap-[6px]">
              <label className="text-[13px] font-medium text-[#374151]">Address Line 1</label>
              <input value={form.address_line1} onChange={setField("address_line1")}
                className="w-full h-[46px] rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] text-[#111827] text-[14px] px-[14px] focus:outline-none focus:ring-2 transition"
                style={{ outlineColor: "var(--theme-primary)" }} />
            </div>
            <div className="flex flex-col gap-[6px]">
              <label className="text-[13px] font-medium text-[#374151]">Address Line 2</label>
              <input value={form.address_line2} onChange={setField("address_line2")}
                className="w-full h-[46px] rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] text-[#111827] text-[14px] px-[14px] focus:outline-none focus:ring-2 transition"
                style={{ outlineColor: "var(--theme-primary)" }} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-[16px]">
              <div className="flex flex-col gap-[6px]">
                <label className="text-[13px] font-medium text-[#374151]">City</label>
                <input value={form.city} onChange={setField("city")}
                  className="w-full h-[46px] rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] text-[#111827] text-[14px] px-[14px] focus:outline-none focus:ring-2 transition"
                  style={{ outlineColor: "var(--theme-primary)" }} />
              </div>
              <div className="flex flex-col gap-[6px]">
                <label className="text-[13px] font-medium text-[#374151]">State</label>
                <input value={form.state} onChange={setField("state")}
                  className="w-full h-[46px] rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] text-[#111827] text-[14px] px-[14px] focus:outline-none focus:ring-2 transition"
                  style={{ outlineColor: "var(--theme-primary)" }} />
              </div>
              <div className="flex flex-col gap-[6px]">
                <label className="text-[13px] font-medium text-[#374151]">ZIP Code</label>
                <input value={form.zip_code} onChange={setField("zip_code")}
                  className="w-full h-[46px] rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] text-[#111827] text-[14px] px-[14px] focus:outline-none focus:ring-2 transition"
                  style={{ outlineColor: "var(--theme-primary)" }} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-[16px]">
              <div className="flex flex-col gap-[6px]">
                <label className="text-[13px] font-medium text-[#374151]">Contact Name</label>
                <input value={form.contact_name} onChange={setField("contact_name")}
                  className="w-full h-[46px] rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] text-[#111827] text-[14px] px-[14px] focus:outline-none focus:ring-2 transition"
                  style={{ outlineColor: "var(--theme-primary)" }} />
              </div>
              <div className="flex flex-col gap-[6px]">
                <label className="text-[13px] font-medium text-[#374151]">Contact Email</label>
                <input value={form.contact_email} onChange={setField("contact_email")}
                  className="w-full h-[46px] rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] text-[#111827] text-[14px] px-[14px] focus:outline-none focus:ring-2 transition"
                  style={{ outlineColor: "var(--theme-primary)" }} />
              </div>
              <div className="flex flex-col gap-[6px]">
                <label className="text-[13px] font-medium text-[#374151]">Contact Phone</label>
                <input value={form.contact_phone} onChange={setField("contact_phone")}
                  className="w-full h-[46px] rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] text-[#111827] text-[14px] px-[14px] focus:outline-none focus:ring-2 transition"
                  style={{ outlineColor: "var(--theme-primary)" }} />
              </div>
            </div>
          </>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-[16px]">
            {[
              { label: "Company Name",  value: company?.company_name || "—" },
              { label: "Company Size",  value: COMPANY_SIZES.find(s => s.value === company?.company_size)?.label ?? "—" },
              { label: "Industry",      value: company?.industry || "—" },
              { label: "Website",       value: company?.website || "—" },
              { label: "Domain",        value: company?.domain || "—" },
              { label: "EIN",           value: company?.ein || "—" },
              { label: "Address",       value: [company?.address_line1, company?.address_line2, company?.city, company?.state, company?.zip_code].filter(Boolean).join(", ") || "—" },
              { label: "Contact",       value: company?.contact_name || "—" },
              { label: "Contact Email", value: company?.contact_email || "—" },
              { label: "Contact Phone", value: company?.contact_phone || "—" },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col gap-[4px]">
                <span className="text-[12px] text-[#6b7280] font-medium">{label}</span>
                <span className="text-[13px] sm:text-[14px] text-[#111827]">{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <div className={`${cardPadX} pb-[20px] sm:pb-[28px] pt-[16px] border-t border-[#f3f4f6] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-[12px]`}>
          <button onClick={() => { setEditing(false); setError(null); }}
            className="flex items-center justify-center sm:justify-start gap-[6px] text-[#6b7280] text-[13px] hover:text-[#374151] transition">
            <RotateCcw size={13} /> Undo Changes
          </button>
          <div className="flex gap-[8px]">
            <button onClick={() => { setEditing(false); setError(null); }}
              className="flex-1 sm:flex-none h-[40px] px-[16px] border border-[#e5e7eb] text-[#374151] text-[13px] font-medium rounded-[10px] hover:bg-[#f9fafb] transition">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 sm:flex-none h-[40px] px-[16px] text-white text-[13px] font-medium rounded-[10px] hover:opacity-90 transition flex items-center justify-center gap-[6px] disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-gradient-end) 100%)" }}>
              {saving ? <><Spinner size={14} /> Saving…</> : <><Save size={14} /> Save Changes</>}
            </button>
          </div>
        </div>
      )}
    </SectionCard>
  );
};

const AttorneyInfoSection = () => {
  const { data: attorney, isLoading, refetch } = useAttorneyProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [removingPhoto,  setRemovingPhoto]  = useState(false);
  const [photoError,     setPhotoError]     = useState<string | null>(null);

  const [form, setForm] = useState({
    bar_number: "", bar_state: "", years_experience: "", law_firm_name: "",
    specialisations: "", languages: "", availability_note: "",
    max_active_cases: "", bio: "",
  });

  const seedForm = () => {
    if (!attorney) return;
    setForm({
      bar_number:        attorney.bar_number        ?? "",
      bar_state:         attorney.bar_state         ?? "",
      years_experience:  attorney.years_experience?.toString() ?? "",
      law_firm_name:     attorney.law_firm_name     ?? "",
      specialisations:   attorney.specialisations   ?? "",
      languages:         attorney.languages         ?? "",
      availability_note: attorney.availability_note ?? "",
      max_active_cases:  attorney.max_active_cases?.toString() ?? "",
      bio:               attorney.bio               ?? "",
    });
  };

  const setField = (key: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSave = async () => {
    setSaving(true); setError(null);
    try {
      await updateAttorneyProfile({
        bar_number:        form.bar_number || undefined,
        bar_state:         form.bar_state || undefined,
        years_experience:  form.years_experience ? Number(form.years_experience) : undefined,
        law_firm_name:     form.law_firm_name || undefined,
        specialisations:   form.specialisations || undefined,
        languages:         form.languages || undefined,
        availability_note: form.availability_note || undefined,
        max_active_cases:  form.max_active_cases ? Number(form.max_active_cases) : undefined,
        bio:               form.bio || undefined,
      });
      await refetch();
      setEditing(false);
    } catch { setError("Failed to save professional details. Please try again."); }
    finally { setSaving(false); }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setPhotoError("File must be under 5 MB."); return; }
    setPhotoUploading(true); setPhotoError(null);
    try {
      await uploadAttorneyPhoto(file);
      await refetch();
    } catch { setPhotoError("Failed to upload photo."); }
    finally { setPhotoUploading(false); e.target.value = ""; }
  };

  const handleRemovePhoto = async () => {
    if (!attorney?.profile_photo_url) return;
    setRemovingPhoto(true); setPhotoError(null);
    try {
      await removeAttorneyPhoto();
      await refetch();
    } catch { setPhotoError("Failed to remove photo."); }
    finally { setRemovingPhoto(false); }
  };

  if (isLoading) return <SectionCard><div className="flex items-center justify-center py-[64px]"><Spinner size={28} className="text-indigo-600" /></div></SectionCard>;

  return (
    <SectionCard>
      <div className={`${cardPad} border-b border-[#f3f4f6] flex items-center justify-between gap-[12px]`}>
        <div>
          <h2 className="text-[17px] sm:text-[20px] font-semibold text-[#111827] flex items-center gap-[8px]">
            Professional Information
            {attorney?.is_verified ? (
              <span className="flex items-center gap-[4px] text-[11px] font-medium text-[#10b981] bg-[#d1fae5] px-[8px] py-[2px] rounded-full">
                <CheckCircle size={10} /> Verified
              </span>
            ) : (
              <span className="flex items-center gap-[4px] text-[11px] font-medium text-[#c2410c] bg-[#fff7ed] px-[8px] py-[2px] rounded-full">
                <AlertTriangle size={10} /> Not Verified
              </span>
            )}
          </h2>
          <p className="text-[13px] sm:text-[14px] text-[#6b7280] mt-[4px]">
            Your bar credentials, firm, and case-load preferences.
          </p>
        </div>
        {!editing && (
          <button onClick={() => { seedForm(); setEditing(true); setError(null); }}
            className="flex items-center gap-[6px] text-[13px] sm:text-[14px] font-medium transition flex-shrink-0"
            style={{ color: "var(--theme-primary)" }}>
            <Edit2 size={14} /> Edit
          </button>
        )}
      </div>

      {error && <div className={`${cardPadX} mt-[16px] bg-[#fef2f2] border border-[#fca5a5] text-[#dc2626] rounded-[10px] px-[16px] py-[12px] text-[13px]`}>{error}</div>}

      <div className={`${cardPadX} py-[20px] sm:py-[24px] border-b border-[#f3f4f6]`}>
        <p className="text-[13px] font-medium text-[#374151] mb-[12px]">Profile Photo</p>
        <div className="flex flex-wrap items-center gap-[16px]">
          <div className="w-[64px] h-[64px] sm:w-[80px] sm:h-[80px] rounded-full bg-[#f3f4f6] border-4 border-[#f3f4f6] flex items-center justify-center overflow-hidden flex-shrink-0">
            {attorney?.profile_photo_url
              ? <img src={attorney.profile_photo_url} alt="Profile" className="w-full h-full object-cover" />
              : <Building size={28} className="text-[#9ca3af]" />}
          </div>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={handlePhotoChange} />
          <div className="flex flex-col gap-[8px]">
            <div className="flex flex-wrap gap-[8px]">
              <button onClick={() => fileInputRef.current?.click()} disabled={photoUploading}
                className="flex items-center gap-[6px] px-[12px] sm:px-[14px] h-[34px] sm:h-[36px] text-white text-[12px] sm:text-[13px] font-medium rounded-[8px] hover:opacity-90 transition disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-gradient-end) 100%)" }}>
                {photoUploading ? <><Spinner size={13} /> Uploading…</> : <><Upload size={13} /> Upload New</>}
              </button>
              <button onClick={handleRemovePhoto} disabled={removingPhoto || !attorney?.profile_photo_url}
                className="flex items-center gap-[6px] px-[12px] sm:px-[14px] h-[34px] sm:h-[36px] border border-[#e5e7eb] text-[#6b7280] text-[12px] sm:text-[13px] font-medium rounded-[8px] hover:bg-[#f9fafb] transition disabled:opacity-60">
                {removingPhoto ? <><Spinner size={13} className="text-[#6b7280]" /> Removing…</> : <><Trash2 size={13} /> Remove</>}
              </button>
            </div>
            {photoError ? <p className="text-[12px] text-[#ef4444]">{photoError}</p>
              : <p className="text-[12px] text-[#9ca3af]">JPG, PNG, GIF or WebP. Max 5 MB.</p>}
          </div>
        </div>
      </div>

      <div className={`${cardPad} flex flex-col gap-[16px] sm:gap-[20px]`}>
        {editing ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-[16px]">
              <div className="flex flex-col gap-[6px]">
                <label className="text-[13px] font-medium text-[#374151]">Bar Number</label>
                <input value={form.bar_number} onChange={setField("bar_number")}
                  className="w-full h-[46px] rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] text-[#111827] text-[14px] px-[14px] focus:outline-none focus:ring-2 transition"
                  style={{ outlineColor: "var(--theme-primary)" }} />
              </div>
              <div className="flex flex-col gap-[6px]">
                <label className="text-[13px] font-medium text-[#374151]">Bar State</label>
                <input value={form.bar_state} onChange={setField("bar_state")}
                  className="w-full h-[46px] rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] text-[#111827] text-[14px] px-[14px] focus:outline-none focus:ring-2 transition"
                  style={{ outlineColor: "var(--theme-primary)" }} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-[16px]">
              <div className="flex flex-col gap-[6px]">
                <label className="text-[13px] font-medium text-[#374151]">Law Firm Name</label>
                <input value={form.law_firm_name} onChange={setField("law_firm_name")}
                  className="w-full h-[46px] rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] text-[#111827] text-[14px] px-[14px] focus:outline-none focus:ring-2 transition"
                  style={{ outlineColor: "var(--theme-primary)" }} />
              </div>
              <div className="flex flex-col gap-[6px]">
                <label className="text-[13px] font-medium text-[#374151]">Years of Experience</label>
                <input type="number" min={0} value={form.years_experience} onChange={setField("years_experience")}
                  className="w-full h-[46px] rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] text-[#111827] text-[14px] px-[14px] focus:outline-none focus:ring-2 transition"
                  style={{ outlineColor: "var(--theme-primary)" }} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-[16px]">
              <div className="flex flex-col gap-[6px]">
                <label className="text-[13px] font-medium text-[#374151]">Specialisations</label>
                <input value={form.specialisations} onChange={setField("specialisations")} placeholder="H-1B, L-1, PERM"
                  className="w-full h-[46px] rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] text-[#111827] text-[14px] px-[14px] focus:outline-none focus:ring-2 transition"
                  style={{ outlineColor: "var(--theme-primary)" }} />
                <p className="text-[11px] text-[#9ca3af]">Comma-separated.</p>
              </div>
              <div className="flex flex-col gap-[6px]">
                <label className="text-[13px] font-medium text-[#374151]">Languages</label>
                <input value={form.languages} onChange={setField("languages")} placeholder="English, Spanish"
                  className="w-full h-[46px] rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] text-[#111827] text-[14px] px-[14px] focus:outline-none focus:ring-2 transition"
                  style={{ outlineColor: "var(--theme-primary)" }} />
                <p className="text-[11px] text-[#9ca3af]">Comma-separated.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-[16px]">
              <div className="flex flex-col gap-[6px]">
                <label className="text-[13px] font-medium text-[#374151]">Max Active Cases</label>
                <input type="number" min={0} value={form.max_active_cases} onChange={setField("max_active_cases")}
                  className="w-full h-[46px] rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] text-[#111827] text-[14px] px-[14px] focus:outline-none focus:ring-2 transition"
                  style={{ outlineColor: "var(--theme-primary)" }} />
              </div>
              <div className="flex flex-col gap-[6px]">
                <label className="text-[13px] font-medium text-[#374151]">Availability Note</label>
                <input value={form.availability_note} onChange={setField("availability_note")} placeholder="e.g. Accepting new H-1B cases"
                  className="w-full h-[46px] rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] text-[#111827] text-[14px] px-[14px] focus:outline-none focus:ring-2 transition"
                  style={{ outlineColor: "var(--theme-primary)" }} />
              </div>
            </div>
            <div className="flex flex-col gap-[6px]">
              <label className="text-[13px] font-medium text-[#374151]">Bio</label>
              <textarea value={form.bio} onChange={setField("bio")} rows={4}
                className="w-full rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] text-[#111827] text-[14px] px-[14px] py-[10px] focus:outline-none focus:ring-2 transition resize-none"
                style={{ outlineColor: "var(--theme-primary)" }} />
            </div>
          </>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-[16px]">
            {[
              { label: "Bar Number",         value: attorney?.bar_number || "—" },
              { label: "Bar State",          value: attorney?.bar_state || "—" },
              { label: "Law Firm",           value: attorney?.law_firm_name || "—" },
              { label: "Years of Experience",value: attorney?.years_experience?.toString() || "—" },
              { label: "Specialisations",    value: attorney?.specialisations || "—" },
              { label: "Languages",          value: attorney?.languages || "—" },
              { label: "Max Active Cases",   value: attorney?.max_active_cases?.toString() || "—" },
              { label: "Availability",       value: attorney?.availability_note || "—" },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col gap-[4px]">
                <span className="text-[12px] text-[#6b7280] font-medium">{label}</span>
                <span className="text-[13px] sm:text-[14px] text-[#111827]">{value}</span>
              </div>
            ))}
            {attorney?.bio && (
              <div className="flex flex-col gap-[4px] sm:col-span-2">
                <span className="text-[12px] text-[#6b7280] font-medium">Bio</span>
                <span className="text-[13px] sm:text-[14px] text-[#111827] leading-[20px]">{attorney.bio}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {editing && (
        <div className={`${cardPadX} pb-[20px] sm:pb-[28px] pt-[16px] border-t border-[#f3f4f6] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-[12px]`}>
          <button onClick={() => { setEditing(false); setError(null); }}
            className="flex items-center justify-center sm:justify-start gap-[6px] text-[#6b7280] text-[13px] hover:text-[#374151] transition">
            <RotateCcw size={13} /> Undo Changes
          </button>
          <div className="flex gap-[8px]">
            <button onClick={() => { setEditing(false); setError(null); }}
              className="flex-1 sm:flex-none h-[40px] px-[16px] border border-[#e5e7eb] text-[#374151] text-[13px] font-medium rounded-[10px] hover:bg-[#f9fafb] transition">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 sm:flex-none h-[40px] px-[16px] text-white text-[13px] font-medium rounded-[10px] hover:opacity-90 transition flex items-center justify-center gap-[6px] disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-gradient-end) 100%)" }}>
              {saving ? <><Spinner size={14} /> Saving…</> : <><Save size={14} /> Save Changes</>}
            </button>
          </div>
        </div>
      )}
    </SectionCard>
  );
};

const AuthMethodCard = ({ icon, iconBg, title, description, features, buttonLabel, active, recommended }: {
  icon: React.ReactNode; iconBg: string; title: string; description: string;
  features?: { ok: boolean; text: string }[]; buttonLabel: string; active?: boolean; recommended?: boolean;
}) => (
  <div className={`rounded-[12px] p-[16px] sm:p-[24px] ${recommended ? "border-2" : "border"} ${active ? "bg-[#f8fafc]" : recommended ? "" : ""}`}
    style={{
      borderColor: recommended ? "var(--theme-primary)" : active ? "var(--theme-border, #c7d2fe)" : "#e5e7eb",
      backgroundColor: recommended ? "var(--theme-light)" : undefined,
    }}>
    <div className="flex flex-col sm:flex-row items-start gap-[12px] sm:gap-[16px]">
      <div className="flex items-start gap-[12px] flex-1 min-w-0">
        <div className="w-[44px] h-[44px] sm:w-[48px] sm:h-[48px] rounded-[12px] flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: iconBg }}>{icon}</div>
        <div className="min-w-0">
          <div className="flex items-center gap-[8px] flex-wrap">
            <h3 className="text-[14px] sm:text-[15px] font-semibold text-[#111827]">{title}</h3>
            {active && (
              <span className="flex items-center gap-[4px] text-[11px] font-medium text-[#10b981] bg-[#d1fae5] px-[8px] py-[2px] rounded-full">
                <Check size={10} strokeWidth={3} /> Active
              </span>
            )}
            {recommended && (
              <span className="text-[11px] font-semibold rounded-full px-[8px] py-[2px]" style={{ color: "var(--theme-dark)", backgroundColor: "var(--theme-light)" }}>
                Recommended
              </span>
            )}
          </div>
          <p className="text-[12px] sm:text-[13px] text-[#6b7280] mt-[4px]">{description}</p>
          {features && features.length > 0 && (
            <ul className="mt-[8px] flex flex-wrap gap-[8px]">
              {features.map(f => (
                <li key={f.text} className="flex items-center gap-[5px] text-[11px] sm:text-[12px] text-[#6b7280]">
                  {f.ok ? <Check size={11} className="text-[#10b981]" strokeWidth={3} /> : <X size={11} className="text-[#ef4444]" strokeWidth={3} />}
                  {f.text}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <button className={`w-full sm:w-auto flex-shrink-0 h-[38px] px-[14px] text-[12px] sm:text-[13px] font-medium rounded-[10px] transition whitespace-nowrap ${
        active ? "border border-[#e5e7eb] text-[#374151] hover:bg-white" : "text-white hover:opacity-90"
      }`}
        style={!active ? { background: "linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-gradient-end) 100%)" } : undefined}>
        {buttonLabel}
      </button>
    </div>
  </div>
);

const AuthenticationSection = () => {
  const user = useAuthStore(s => s.user);
  return (
    <SectionCard>
      <div className={`${cardPad} border-b border-[#f3f4f6]`}>
        <h2 className="text-[17px] sm:text-[20px] font-semibold text-[#111827]">Authentication Methods</h2>
        <p className="text-[13px] sm:text-[14px] text-[#6b7280] mt-[4px]">Manage how you log in to Vyuflo.</p>
      </div>
      <div className={`${cardPad} flex flex-col gap-[12px] sm:gap-[16px]`}>
        <AuthMethodCard active icon={<Mail size={20} className="text-indigo-600" />} iconBg="#e0e7ff" title="Email & Password"
          description={`Primary login using ${user?.email ?? "your email"}`}
          features={[{ ok:true, text:"2-factor ready" },{ ok:true, text:"Password reset" }]}
          buttonLabel="Change Password" />
        <AuthMethodCard icon={<Globe size={20} className="text-[#ea4335]" />} iconBg="#fef2f2" title="Google"
          description="Sign in with your Google account"
          features={[{ ok:true, text:"One-click sign in" },{ ok:true, text:"Auto recovery" }]}
          buttonLabel="Connect Google" />
        <AuthMethodCard icon={<Monitor size={20} className="text-[#0078d4]" />} iconBg="#eff6ff" title="Microsoft"
          description="Sign in with Microsoft or Office 365"
          features={[{ ok:true, text:"Enterprise SSO" },{ ok:true, text:"Azure AD" }]}
          buttonLabel="Connect Microsoft" />
      </div>
    </SectionCard>
  );
};

const MFASection = () => (
  <SectionCard>
    <div className={`${cardPad} border-b border-[#f3f4f6]`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-[8px]">
        <h2 className="text-[17px] sm:text-[20px] font-semibold text-[#111827]">Multi-Factor Authentication</h2>
        <span className="flex items-center gap-[6px] text-[12px] sm:text-[13px] text-[#6b7280] bg-[#f3f4f6] px-[12px] py-[5px] rounded-full w-fit">
          <XCircle size={14} className="text-[#ef4444]" /> Not Enabled
        </span>
      </div>
      <p className="text-[13px] sm:text-[14px] text-[#6b7280] mt-[4px]">Add a second verification method for extra security.</p>
    </div>
    <div className={`${cardPad} flex flex-col gap-[12px] sm:gap-[16px]`}>
      <AuthMethodCard recommended
        icon={<Smartphone size={20} style={{ color: "var(--theme-primary)" }} />}
        iconBg="var(--theme-light)"
        title="Authenticator App"
        description="Google Authenticator, Authy, or Microsoft Authenticator"
        buttonLabel="Setup Now" />
      <AuthMethodCard
        icon={<Phone size={20} className="text-[#10b981]" />}
        iconBg="#f0fdf4"
        title="SMS Text Message"
        description="Receive codes via text message"
        buttonLabel="Add Phone" />
    </div>
  </SectionCard>
);

/* XL sheet row 20 (follow-up): even with the 1500ms retry in
   useLoginHistory the very first login can still return an empty
   list — some backends only insert the login_history row after the
   FE has already navigated and fetched. Rather than blank the whole
   panel, we synthesize a "Current Session" card from the browser's
   own user-agent + timestamp when the backend list is empty. It
   auto-hides once the backend row shows up. */
function detectBrowser(ua: string): string {
  if (/edg\//i.test(ua))    return "Edge";
  if (/opr\//i.test(ua))    return "Opera";
  if (/chrome\//i.test(ua)) return "Chrome";
  if (/safari\//i.test(ua)) return "Safari";
  if (/firefox\//i.test(ua))return "Firefox";
  return "Browser";
}
function detectOs(ua: string): string {
  if (/windows/i.test(ua))  return "Windows";
  if (/mac os/i.test(ua))   return "macOS";
  if (/android/i.test(ua))  return "Android";
  if (/iphone|ipad|ios/i.test(ua)) return "iOS";
  if (/linux/i.test(ua))    return "Linux";
  return "";
}
function detectDeviceType(ua: string): "desktop" | "mobile" | "tablet" | "unknown" {
  if (/tablet|ipad/i.test(ua))  return "tablet";
  if (/mobi|iphone|android/i.test(ua)) return "mobile";
  return "desktop";
}

/* XL sheet row 21: Export History button did nothing. Wire it up
   client-side — no new backend needed since the same list the panel
   already fetches is what the user wants to export. Builds a CSV
   from displayHistory, escapes commas/quotes, drops the current
   Blob into a hidden <a download> click. */
function toCsv(rows: LoginHistoryResponse[]): string {
  const header = [
    "Timestamp", "Status", "Auth method", "Browser", "OS",
    "Device", "City", "Country", "IP address", "Current session",
    "Suspicious", "Logged out at",
  ];
  const escape = (v: unknown): string => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const body = rows.map(r => [
    r.created_at, r.status, r.auth_method, r.browser, r.os,
    r.device_type, r.city, r.country, r.ip_address,
    r.is_current_session ? "Yes" : "",
    r.is_suspicious      ? "Yes" : "",
    r.logged_out_at ?? "",
  ].map(escape).join(","));
  return [header.join(","), ...body].join("\n");
}

const LoginHistorySection = () => {
  const { data: history, isLoading, error } = useLoginHistory(20);
  const [signingOut, setSigningOut] = useState(false);

  /* If the backend list is missing a current-session row, prepend a
     synthesized one so the user always sees "you're logged in right
     now" on this page — the whole point of the panel. */
  const displayHistory: LoginHistoryResponse[] = useMemo(() => {
    const hasCurrent = history.some(h => h.is_current_session);
    if (hasCurrent) return history;
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const synthesized: LoginHistoryResponse = {
      id:                 "local-current-session",
      status:             "success",
      auth_method:        "password",
      ip_address:         null,
      city:               null,
      country:            null,
      browser:            detectBrowser(ua),
      os:                 detectOs(ua),
      device_type:        detectDeviceType(ua),
      failure_reason:     null,
      failed_attempts:    0,
      is_suspicious:      false,
      is_current_session: true,
      logged_out_at:      null,
      created_at:         new Date().toISOString(),
    };
    return [synthesized, ...history];
  }, [history]);

  return (
    <SectionCard>
      <div className={`${cardPad} border-b border-[#f3f4f6] flex flex-col sm:flex-row sm:items-start justify-between gap-[12px]`}>
        <div>
          <h2 className="text-[17px] sm:text-[20px] font-semibold text-[#111827]">Login History</h2>
          <p className="text-[13px] sm:text-[14px] text-[#6b7280] mt-[4px]">Review recent access to your account.</p>
        </div>
        <button
          type="button"
          disabled={isLoading || !!error}
          onClick={() => {
            const csv = toCsv(displayHistory);
            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement("a");
            const stamp = new Date().toISOString().slice(0, 10);
            a.href = url;
            a.download = `vyuflo-login-history-${stamp}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            // Give the browser a tick before revoking so the download
            // actually kicks off (some browsers race the revoke).
            setTimeout(() => URL.revokeObjectURL(url), 500);
          }}
          className="flex items-center gap-[6px] h-[38px] px-[14px] border border-[#e5e7eb] text-[#374151] text-[12px] sm:text-[13px] font-medium rounded-[10px] hover:bg-[#f9fafb] transition whitespace-nowrap flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download size={14} /> Export History
        </button>
      </div>
      <div className={`${cardPad} flex flex-col gap-[10px]`}>
        {isLoading && <div className="flex items-center justify-center py-[32px]"><Spinner size={24} className="text-indigo-600" /></div>}
        {error && <p className="text-[13px] text-[#ef4444] text-center py-[16px]">{error}</p>}
        {/* Empty-state message removed — displayHistory always contains
            at least the synthesized current session, so the panel is
            never fully blank. */}
        {!isLoading && displayHistory.map(entry => {
          const isBad = entry.status === "blocked" || entry.status === "failed";
          return (
            <div key={entry.id} className={`border rounded-[12px] p-[14px] sm:p-[20px] ${isBad ? "border-[#fca5a5] bg-[#fff5f5]" : entry.is_current_session ? "bg-[var(--theme-light)]" : "border-[#e5e7eb]"}`}
              style={entry.is_current_session && !isBad ? { borderColor: "var(--theme-primary)" } : undefined}>
              <div className="flex items-start gap-[10px] sm:gap-[14px]">
                <div className={`w-[36px] h-[36px] sm:w-[40px] sm:h-[40px] rounded-[10px] flex items-center justify-center flex-shrink-0 ${isBad ? "bg-[#fee2e2]" : "bg-[#f0fdf4]"}`}>
                  {isBad ? <AlertTriangle size={16} className="text-[#ef4444]" />
                    : entry.device_type === "mobile" ? <Smartphone size={16} style={{ color: "var(--theme-primary)" }} />
                    : <Laptop size={16} style={{ color: "var(--theme-primary)" }} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-[6px] flex-wrap">
                    <p className="text-[13px] sm:text-[14px] font-semibold text-[#111827]">
                      {entry.is_current_session ? "Current Session" : isBad ? "Failed Login" : "Successful Login"}
                    </p>
                    {entry.is_current_session && <span className="text-[10px] font-medium px-[7px] py-[2px] rounded-full bg-[#d1fae5] text-[#065f46]">Active Now</span>}
                  </div>
                  <div className="mt-[6px] flex flex-col gap-[3px]">
                    <div className="flex items-center gap-[6px] text-[11px] sm:text-[12px] text-[#6b7280]"><Monitor size={12} /> {[entry.browser, entry.os].filter(Boolean).join(" on ") || "Unknown device"}</div>
                    <div className="flex items-center gap-[6px] text-[11px] sm:text-[12px] text-[#6b7280]"><MapPin size={12} /> {[entry.city, entry.country].filter(Boolean).join(", ") || "Unknown location"}</div>
                    <div className="flex items-center gap-[6px] text-[11px] sm:text-[12px] text-[#6b7280]"><Clock size={12} /> {new Date(entry.created_at).toLocaleString("en-US", { dateStyle:"medium", timeStyle:"short" })}</div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className={`${cardPadX} mb-[20px] sm:mb-[28px] bg-[#fffbeb] border border-[#fde68a] rounded-[10px] px-[16px] py-[14px] flex flex-col sm:flex-row sm:items-center justify-between gap-[12px]`}>
        <div className="flex items-start gap-[10px]">
          <AlertTriangle size={16} className="text-[#f59e0b] flex-shrink-0 mt-[1px]" />
          <p className="text-[12px] text-[#92400e]">If you see an unrecognized login, change your password immediately.</p>
        </div>
        <button onClick={async () => { setSigningOut(true); try { await signOutAllDevices(); } finally { setSigningOut(false); } }}
          disabled={signingOut}
          className="w-full sm:w-auto flex-shrink-0 h-[36px] px-[14px] border border-[#fde68a] text-[#92400e] text-[12px] font-medium rounded-[8px] hover:bg-[#fef3c7] transition whitespace-nowrap disabled:opacity-60">
          {signingOut ? "Signing out…" : "Sign Out All Devices"}
        </button>
      </div>
    </SectionCard>
  );
};

const PrivacySection = ({ isHR }: { isHR: boolean }) => {
  const [toggles, setToggles] = useState(
    isHR
      ? { email: true, phone: false, teamAccess: true, caseAccess: true, analytics: true, updates: true, marketing: false }
      : { email: true, phone: false, employment: true, visa: false, analytics: true, updates: true, marketing: false }
  );
  const toggle = (key: string) => setToggles(p => ({ ...p, [key]: !(p as any)[key] }));

  return (
    <div className="flex flex-col gap-[16px] sm:gap-[20px]">
      <SectionCard>
        <div className={`${cardPad} border-b border-[#f3f4f6]`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-[8px]">
            <div>
              <h3 className="text-[15px] sm:text-[17px] font-semibold text-[#111827]">Profile Visibility</h3>
              <p className="text-[12px] sm:text-[13px] text-[#6b7280] mt-[2px]">
                {isHR ? "Control what employees and attorneys can see on your HR profile."
                       : "Choose what your HR and immigration team can see."}
              </p>
            </div>
            <select className="h-[36px] px-[12px] border border-[#e5e7eb] rounded-[8px] text-[13px] text-[#374151] bg-white focus:outline-none w-full sm:w-auto">
              <option>Team Members Only</option><option>All Users</option><option>Private</option>
            </select>
          </div>
        </div>
        <div className={`${cardPadX} py-[8px] grid grid-cols-1 sm:grid-cols-2 gap-[4px]`}>
          {(isHR ? [
            { key:"email",      label:"Email Address",   icon:<Mail size={14} /> },
            { key:"phone",      label:"Phone Number",    icon:<Phone size={14} /> },
            { key:"teamAccess", label:"Team Directory",  icon:<Building size={14} /> },
            { key:"caseAccess", label:"Case Portfolio",  icon:<Globe2 size={14} /> },
          ] : [
            { key:"email",      label:"Email Address",   icon:<Mail size={14} /> },
            { key:"phone",      label:"Phone Number",    icon:<Phone size={14} /> },
            { key:"employment", label:"Employment Info", icon:<Building size={14} /> },
            { key:"visa",       label:"Visa Status",     icon:<FileText size={14} /> },
          ]).map(({ key, label, icon }) => (
            <div key={key} className="flex items-center justify-between py-[12px] px-[12px] rounded-[8px] hover:bg-[#f9fafb]">
              <div className="flex items-center gap-[8px] text-[12px] sm:text-[13px] text-[#374151]">
                <span className="text-[#6b7280]">{icon}</span> {label}
              </div>
              <Toggle checked={(toggles as any)[key]} onChange={() => toggle(key)} />
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard>
        <div className={`${cardPad} border-b border-[#f3f4f6]`}>
          <h3 className="text-[15px] sm:text-[17px] font-semibold text-[#111827]">Data Sharing & Analytics</h3>
          <p className="text-[12px] sm:text-[13px] text-[#6b7280] mt-[2px]">Help us improve Vyuflo by sharing anonymous usage data.</p>
        </div>
        <div className={cardPadX}>
          {[
            { label:"Usage Analytics",          sub:"Share anonymous data to help improve features.",  key:"analytics" },
            { label:"Product Updates & Tips",   sub:"Personalised tips based on your usage.",          key:"updates"   },
            { label:"Marketing Communications", sub:"Receive emails about new features and offers.",   key:"marketing" },
          ].map(p => (
            <div key={p.key} className="flex items-center justify-between py-[14px] border-b border-[#f3f4f6] last:border-0 gap-[12px]">
              <div className="min-w-0">
                <p className="text-[13px] sm:text-[14px] font-medium text-[#111827]">{p.label}</p>
                <p className="text-[11px] sm:text-[12px] text-[#6b7280] mt-[2px]">{p.sub}</p>
              </div>
              <Toggle checked={(toggles as any)[p.key]} onChange={() => toggle(p.key)} />
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard>
        <div className={`${cardPad} border-b border-[#f3f4f6]`}>
          <h3 className="text-[15px] sm:text-[17px] font-semibold text-[#111827]">Data & Account</h3>
          <p className="text-[12px] sm:text-[13px] text-[#6b7280] mt-[2px]">Manage your data and account lifecycle.</p>
        </div>
        <div className={`${cardPad} flex flex-col gap-[12px]`}>
          <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-[10px] p-[14px] sm:p-[16px] flex items-start gap-[10px]">
            <Info size={15} className="text-[#3b82f6] flex-shrink-0 mt-[2px]" />
            <p className="text-[12px] text-[#1e40af]">
              {isHR
                ? "Company and employee case data is retained for 7 years to comply with immigration record-keeping requirements."
                : "Your case data is retained for 7 years after case completion to comply with immigration regulations."}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-[10px] p-[14px] border border-[#e5e7eb] rounded-[10px]">
            <div>
              <p className="text-[13px] font-semibold text-[#111827]">Download Your Data</p>
              <p className="text-[12px] text-[#6b7280] mt-[2px]">Export all your personal information and documents.</p>
            </div>
            <button className="flex items-center justify-center gap-[6px] h-[36px] px-[14px] border border-[#e5e7eb] text-[#374151] text-[12px] font-medium rounded-[8px] hover:bg-[#f9fafb] transition w-full sm:w-auto">
              <Download size={13} /> Request Export
            </button>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-[10px] p-[14px] border border-[#fca5a5] rounded-[10px] bg-[#fff5f5]">
            <div>
              <p className="text-[13px] font-semibold text-[#991b1b]">Delete My Account</p>
              <p className="text-[12px] text-[#ef4444] mt-[2px]">Permanently delete your account. This cannot be undone.</p>
            </div>
            <button className="flex items-center justify-center gap-[6px] h-[36px] px-[14px] bg-[#ef4444] text-white text-[12px] font-medium rounded-[8px] hover:bg-[#dc2626] transition w-full sm:w-auto">
              <Trash2 size={13} /> Delete Account
            </button>
          </div>
        </div>
      </SectionCard>
    </div>
  );
};

const SecurityAlertsSection = () => {
  const [alerts, setAlerts] = useState({
    newDevice:       { email:true,  sms:true  },
    failedLogin:     { email:true,  sms:true  },
    passwordChanged: { email:true,  sms:false },
    unusualActivity: { email:true,  sms:true  },
  });
  type AK = keyof typeof alerts;
  const toggle = (key: AK, ch: "email" | "sms") =>
    setAlerts(p => ({ ...p, [key]: { ...p[key], [ch]: !p[key][ch] } }));

  return (
    <SectionCard>
      <div className={`${cardPad} border-b border-[#f3f4f6]`}>
        <h2 className="text-[17px] sm:text-[20px] font-semibold text-[#111827]">Security Alerts</h2>
        <p className="text-[13px] sm:text-[14px] text-[#6b7280] mt-[4px]">Get notified about important security events.</p>
      </div>
      <div className={cardPadX}>
        {([
          { key:"newDevice"       as AK, title:"New Device Login",          desc:"Alert when account is accessed from a new device." },
          { key:"failedLogin"     as AK, title:"Failed Login Attempts",     desc:"Alert when multiple failed logins occur." },
          { key:"passwordChanged" as AK, title:"Password Changed",          desc:"Alert immediately when your password changes." },
          { key:"unusualActivity" as AK, title:"Unusual Activity Detected", desc:"Alert when suspicious behaviour is detected." },
        ]).map(({ key, title, desc }) => (
          <div key={key} className="flex items-start sm:items-center justify-between py-[14px] border-b border-[#f3f4f6] last:border-0 gap-[12px]">
            <div className="flex-1 min-w-0">
              <p className="text-[13px] sm:text-[14px] font-medium text-[#111827]">{title}</p>
              <p className="text-[11px] sm:text-[12px] text-[#6b7280] mt-[2px]">{desc}</p>
            </div>
            <div className="flex items-center gap-[12px] sm:gap-[16px] flex-shrink-0">
              <label className="flex items-center gap-[5px] cursor-pointer">
                <Checkbox checked={alerts[key].email} onChange={() => toggle(key, "email")} />
                <span className="text-[11px] sm:text-[12px] text-[#6b7280]">Email</span>
              </label>
              <label className="flex items-center gap-[5px] cursor-pointer">
                <Checkbox checked={alerts[key].sms} onChange={() => toggle(key, "sms")} />
                <span className="text-[11px] sm:text-[12px] text-[#6b7280]">SMS</span>
              </label>
            </div>
          </div>
        ))}
      </div>
      <div className={`${cardPadX} mb-[20px] sm:mb-[28px] mt-[8px] bg-[#f0fdf4] border border-[#bbf7d0] rounded-[10px] px-[16px] py-[14px]`}>
        <div className="flex items-start gap-[10px]">
          <CheckCircle size={16} className="text-[#10b981] flex-shrink-0 mt-[1px]" />
          <p className="text-[12px] text-[#065f46]">Your account is protected. Keep these settings active to safeguard your data.</p>
        </div>
      </div>
    </SectionCard>
  );
};

const SOUND_STYLES: { value: SoundStyle; label: string; desc: string; emoji: string }[] = [
  { value: "ding",   label: "Ding",   desc: "Two-tone descending", emoji: "🔔" },
  { value: "chime",  label: "Chime",  desc: "Soft ascending",      emoji: "🎵" },
  { value: "pop",    label: "Pop",    desc: "Short sharp pop",     emoji: "💬" },
  { value: "silent", label: "Silent", desc: "No sound",            emoji: "🔇" },
];

const NotificationSoundsSection = () => {
  const { settings, update } = useNotificationSoundSettings();

  return (
    <div className="flex flex-col gap-[16px] sm:gap-[20px]">

      <SectionCard>
        <div className={`${cardPad} border-b border-[#f3f4f6]`}>
          <div className="flex items-center gap-[10px]">
            <div className="w-[40px] h-[40px] rounded-[10px] flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: "var(--theme-light)", color: "var(--theme-primary)" }}>
              <Bell size={18} />
            </div>
            <div>
              <h2 className="text-[17px] sm:text-[20px] font-semibold text-[#111827]">Message Sounds</h2>
              <p className="text-[13px] text-[#6b7280]">Plays when a new message arrives in Secure Messaging</p>
            </div>
          </div>
        </div>

        <div className={`${cardPad} flex flex-col gap-[20px]`}>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-[14px] font-medium text-[#111827]">Enable Message Sound</p>
              <p className="text-[12px] text-[#6b7280] mt-[2px]">Sound plays when someone sends you a message</p>
            </div>
            <Toggle checked={settings.messageSound} onChange={() => update({ messageSound: !settings.messageSound })} />
          </div>

          <div className={`flex flex-col gap-[10px] transition-opacity ${!settings.messageSound ? "opacity-40 pointer-events-none" : ""}`}>
            <p className="text-[13px] font-medium text-[#374151]">Sound Style</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-[8px]">
              {SOUND_STYLES.map(s => (
                <button key={s.value} onClick={() => update({ messageSoundStyle: s.value })}
                  className={`flex flex-col items-center gap-[6px] p-[14px] rounded-[10px] border-2 transition text-center ${
                    settings.messageSoundStyle === s.value
                      ? "border-[var(--theme-primary)] bg-[var(--theme-light)]"
                      : "border-[#e5e7eb] hover:border-[#d1d5db]"
                  }`}>
                  <span className="text-[22px]">{s.emoji}</span>
                  <span className="text-[12px] font-semibold text-[#111827]">{s.label}</span>
                  <span className="text-[10px] text-[#6b7280]">{s.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className={`flex flex-col gap-[8px] transition-opacity ${!settings.messageSound ? "opacity-40 pointer-events-none" : ""}`}>
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-medium text-[#374151]">Volume</p>
              <span className="text-[13px] font-bold" style={{ color: "var(--theme-primary)" }}>{settings.messageVolume}%</span>
            </div>
            <input type="range" min={0} max={100} step={5} value={settings.messageVolume}
              onChange={e => update({ messageVolume: Number(e.target.value) })}
              className="w-full h-[4px] rounded-full appearance-none cursor-pointer"
              style={{ background: `linear-gradient(to right, var(--theme-primary) ${settings.messageVolume}%, #e5e7eb ${settings.messageVolume}%)` }} />
            <div className="flex justify-between text-[11px] text-[#9ca3af]">
              <span>Off</span><span>Low</span><span>Medium</span><span>High</span>
            </div>
          </div>

          <button onClick={() => { unlockAudio(); playSound("message"); }}
            disabled={!settings.messageSound || settings.messageSoundStyle === "silent"}
            className="flex items-center justify-center gap-[8px] h-[40px] px-[20px] border border-[#e5e7eb]
                       text-[13px] font-medium text-[#374151] rounded-[10px] hover:bg-[#f9fafb]
                       transition w-full sm:w-fit disabled:opacity-40">
            🔊 Test Message Sound
          </button>
        </div>
      </SectionCard>

      <SectionCard>
        <div className={`${cardPad} border-b border-[#f3f4f6]`}>
          <div className="flex items-center gap-[10px]">
            <div className="w-[40px] h-[40px] rounded-[10px] flex items-center justify-center flex-shrink-0 bg-[#f0fdf4]">
              <Bell size={18} className="text-[#22c55e]" />
            </div>
            <div>
              <h2 className="text-[17px] sm:text-[20px] font-semibold text-[#111827]">Notification Sounds</h2>
              <p className="text-[13px] text-[#6b7280]">Plays when a new case update or alert arrives</p>
            </div>
          </div>
        </div>

        <div className={`${cardPad} flex flex-col gap-[20px]`}>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-[14px] font-medium text-[#111827]">Enable Notification Sound</p>
              <p className="text-[12px] text-[#6b7280] mt-[2px]">Case updates, deadlines, and alerts</p>
            </div>
            <Toggle checked={settings.notifSound} onChange={() => update({ notifSound: !settings.notifSound })} />
          </div>

          <div className={`flex flex-col gap-[8px] transition-opacity ${!settings.notifSound ? "opacity-40 pointer-events-none" : ""}`}>
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-medium text-[#374151]">Volume</p>
              <span className="text-[13px] font-bold" style={{ color: "var(--theme-primary)" }}>{settings.notifVolume}%</span>
            </div>
            <input type="range" min={0} max={100} step={5} value={settings.notifVolume}
              onChange={e => update({ notifVolume: Number(e.target.value) })}
              className="w-full h-[4px] rounded-full appearance-none cursor-pointer"
              style={{ background: `linear-gradient(to right, var(--theme-primary) ${settings.notifVolume}%, #e5e7eb ${settings.notifVolume}%)` }} />
            <div className="flex justify-between text-[11px] text-[#9ca3af]">
              <span>Off</span><span>Low</span><span>Medium</span><span>High</span>
            </div>
          </div>

          <button onClick={() => { unlockAudio(); playSound("notif"); }}
            disabled={!settings.notifSound}
            className="flex items-center justify-center gap-[8px] h-[40px] px-[20px] border border-[#e5e7eb]
                       text-[13px] font-medium text-[#374151] rounded-[10px] hover:bg-[#f9fafb]
                       transition w-full sm:w-fit disabled:opacity-40">
            🔊 Test Notification Sound
          </button>
        </div>
      </SectionCard>

      <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-[12px] p-[16px] flex items-start gap-[10px]">
        <span className="text-[18px] flex-shrink-0">💡</span>
        <p className="text-[12px] text-[#1e40af] leading-[18px]">
          Sound settings are saved locally on this device. If you switch browsers or devices
          you'll need to set them again. Audio unlocks after your first interaction with the app.
        </p>
      </div>
    </div>
  );
};

const SessionPlaceholder = () => {
  const [rememberMe, setRememberMe] = useState(true);
  return (
    <SectionCard>
      <div className={`${cardPad} border-b border-[#f3f4f6]`}>
        <h2 className="text-[17px] sm:text-[20px] font-semibold text-[#111827]">Session Settings</h2>
        <p className="text-[13px] sm:text-[14px] text-[#6b7280] mt-[4px]">Configure how long you stay signed in.</p>
      </div>
      <div className={`${cardPad} flex flex-col gap-[16px]`}>
        <div className="border border-[#e5e7eb] rounded-[12px] p-[16px] sm:p-[20px]">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-[10px]">
            <div>
              <h3 className="text-[14px] sm:text-[15px] font-semibold text-[#111827]">Automatic Sign Out</h3>
              <p className="text-[12px] sm:text-[13px] text-[#6b7280] mt-[2px]">Auto sign-out after inactivity</p>
            </div>
            <select className="h-[36px] px-[12px] border border-[#e5e7eb] rounded-[8px] text-[13px] text-[#374151] bg-white focus:outline-none w-full sm:w-auto">
              <option>30 minutes</option><option>1 hour</option><option>4 hours</option><option>Never</option>
            </select>
          </div>
        </div>
        <div className="border border-[#e5e7eb] rounded-[12px] p-[16px] sm:p-[20px]">
          <div className="flex items-start justify-between gap-[12px]">
            <div>
              <h3 className="text-[14px] sm:text-[15px] font-semibold text-[#111827]">Remember Me</h3>
              <p className="text-[12px] sm:text-[13px] text-[#6b7280] mt-[4px]">Stay signed in on this device for 30 days.</p>
            </div>
            <Toggle checked={rememberMe} onChange={() => setRememberMe(!rememberMe)} />
          </div>
        </div>
      </div>
    </SectionCard>
  );
};

const SECTION_TITLES: Record<SectionId, { title: string; subtitle: string }> = {
  profile:           { title:"Profile",                       subtitle:"Manage your personal information and photo"        },
  authentication:    { title:"Authentication",                 subtitle:"Configure login methods and linked accounts"       },
  mfa:               { title:"Multi-Factor Authentication",    subtitle:"Add a second verification step for extra security" },
  "login-history":   { title:"Login History",                  subtitle:"Review recent access to your account"              },
  privacy:           { title:"Privacy Settings",               subtitle:"Control visibility and data sharing"               },
  devices:           { title:"Connected Devices & Sessions",   subtitle:"Review recent access and sign out other sessions"  },
  session:           { title:"Session Settings",               subtitle:"Configure session timeout and concurrent logins"   },
  "security-alerts": { title:"Security Alerts",                subtitle:"Get notified about important security events"      },
  notifications:     { title:"Notification Sounds",            subtitle:"Customise sounds for messages and alerts"          },
};

export default function ProfileSecurity() {
  const location   = useLocation();
  const session    = getUiSession();
  const isHR       = session?.roles?.includes("hr") ?? false;
  const isAttorney = session?.roles?.includes("attorney") ?? false;

  const getSection = (): SectionId => {
    const p = location.pathname;
    if (p.endsWith("authentication"))  return "authentication";
    if (p.endsWith("mfa"))             return "mfa";
    if (p.endsWith("login-history"))   return "login-history";
    if (p.endsWith("privacy"))         return "privacy";
    if (p.endsWith("devices"))         return "devices";
    if (p.endsWith("session"))         return "session";
    if (p.endsWith("security-alerts")) return "security-alerts";
    if (p.endsWith("notifications"))   return "notifications";
    return "profile";
  };

  const activeSection = getSection();
  const { title, subtitle } = SECTION_TITLES[activeSection];

  const COMPONENTS: Record<SectionId, React.ReactNode> = {
    profile: (
      <div className="flex flex-col gap-[24px]">
        <PersonalInfoSection />
        <PersonalEmailSection />
        {/* XL row 29: expose Passport / Immigration / Employment fields
            so the Profile Readiness ring can reach 100% and downstream
            visa filings (I-9, I-983) can be pre-populated. Employee
            role only — HR and Attorney profiles don't need these. */}
        {!isHR && !isAttorney && <AdditionalProfileFields email={session?.email ?? null} />}
        {isHR && <CompanyInfoSection />}
        {isAttorney && <AttorneyInfoSection />}
      </div>
    ),
    authentication:    <AuthenticationSection />,
    mfa:               <MFASection />,
    "login-history":   <LoginHistorySection />,
    privacy:           <PrivacySection isHR={isHR} />,
    devices:           <LoginHistorySection />,
    session:           <SessionPlaceholder />,
    "security-alerts": <SecurityAlertsSection />,
    notifications:     <NotificationSoundsSection />,
  };

  return (
    <div className="flex flex-col h-full bg-[#f9fafb]" style={{ fontFamily:"Inter, sans-serif" }}>
      <PageHeader title={title} subtitle={subtitle} showBell={false} />
      <PageContent>
        <div className="max-w-[900px]">
          {COMPONENTS[activeSection]}
        </div>
      </PageContent>
    </div>
  );
}
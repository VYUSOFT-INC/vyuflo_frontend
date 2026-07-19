
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
//   Lock, Globe,
// } from "lucide-react";

// import { useMyProfile, useLoginHistory } from "../../hooks/employee/useProfile";
// import { updateMyProfile, signOutAllDevices, uploadProfilePicture } from "../../api/employee/profile.api";
// import { useAuthStore } from "../../store/authStore";
// import imgUserAvatar from "../../assets/icons/user-avatar.jpg";
// import { getFileUrl } from "../../utils/fileUrl";
// import { updateUiSessionProfile, getUiSession } from "../../utils/uiSession";
// import { PageHeader, PageContent } from "../../components/layout/Pageheader";
// import { ThemeColorStrip } from "../settings/ThemeColorStrip";

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
//   | "privacy"  | "devices"        | "session" | "security-alerts";

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

// // ── Section: Personal Information ─────────────────────────────────────────────
// const PersonalInfoSection = () => {
//   const { data: profile, isLoading, refetch } = useMyProfile();
//   const user = useAuthStore(s => s.user);
//   const fileInputRef = useRef<HTMLInputElement>(null);
//   const navigate     = useNavigate();
//   const [searchParams] = useSearchParams();

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
//   const displayEmail = user?.email ?? "—";
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
//       const result = await uploadProfilePicture(file);
//       await refetch();
//       if (result?.profile_picture_url) updateUiSessionProfile(result.profile_picture_url);
//     } catch { setAvatarError("Failed to upload photo."); }
//     finally { setAvatarUploading(false); e.target.value = ""; }
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
//               <button className="flex items-center gap-[6px] px-[12px] sm:px-[14px] h-[34px] sm:h-[36px] border border-[#e5e7eb] text-[#6b7280] text-[12px] sm:text-[13px] font-medium rounded-[8px] hover:bg-[#f9fafb] transition">
//                 <Trash2 size={13} /> Remove
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

// // ── Section: Authentication ───────────────────────────────────────────────────
// const AuthMethodCard = ({ icon, iconBg, title, description, features, buttonLabel, active }: {
//   icon: React.ReactNode; iconBg: string; title: string; description: string;
//   features: { ok: boolean; text: string }[]; buttonLabel: string; active?: boolean;
// }) => (
//   <div className={`border rounded-[12px] p-[16px] sm:p-[24px] ${active ? "bg-[#f8fafc]" : ""}`}
//     style={{ borderColor: active ? "var(--theme-border, #c7d2fe)" : "#e5e7eb" }}>
//     <div className="flex flex-col sm:flex-row items-start gap-[12px] sm:gap-[16px]">
//       <div className="flex items-start gap-[12px] flex-1 min-w-0">
//         <div className={`w-[44px] h-[44px] sm:w-[48px] sm:h-[48px] rounded-[12px] flex items-center justify-center flex-shrink-0`}
//           style={{ backgroundColor: iconBg }}>{icon}</div>
//         <div className="min-w-0">
//           <div className="flex items-center gap-[8px] flex-wrap">
//             <h3 className="text-[14px] sm:text-[15px] font-semibold text-[#111827]">{title}</h3>
//             {active && (
//               <span className="flex items-center gap-[4px] text-[11px] font-medium text-[#10b981] bg-[#d1fae5] px-[8px] py-[2px] rounded-full">
//                 <Check size={10} strokeWidth={3} /> Active
//               </span>
//             )}
//           </div>
//           <p className="text-[12px] sm:text-[13px] text-[#6b7280] mt-[4px]">{description}</p>
//           <ul className="mt-[8px] flex flex-wrap gap-[8px]">
//             {features.map(f => (
//               <li key={f.text} className="flex items-center gap-[5px] text-[11px] sm:text-[12px] text-[#6b7280]">
//                 {f.ok ? <Check size={11} className="text-[#10b981]" strokeWidth={3} /> : <X size={11} className="text-[#ef4444]" strokeWidth={3} />}
//                 {f.text}
//               </li>
//             ))}
//           </ul>
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
//   const user  = useAuthStore(s => s.user);
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

// // ── Section: MFA ──────────────────────────────────────────────────────────────
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
//       {/* Authenticator — recommended */}
//       <div className="border-2 rounded-[12px] p-[16px] sm:p-[24px]" style={{ borderColor: "var(--theme-primary)", backgroundColor: "var(--theme-light)" }}>
//         <div className="flex flex-col sm:flex-row items-start gap-[12px] sm:gap-[16px]">
//           <div className="flex items-start gap-[12px] flex-1 min-w-0">
//             <div className="w-[44px] h-[44px] rounded-[12px] flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "var(--theme-light)" }}>
//               <Smartphone size={20} style={{ color: "var(--theme-primary)" }} />
//             </div>
//             <div className="min-w-0">
//               <div className="flex items-center gap-[8px] flex-wrap">
//                 <h3 className="text-[14px] sm:text-[15px] font-semibold text-[#111827]">Authenticator App</h3>
//                 <span className="text-[11px] font-semibold rounded-full px-[8px] py-[2px]" style={{ color: "var(--theme-dark)", backgroundColor: "var(--theme-light)" }}>Recommended</span>
//               </div>
//               <p className="text-[12px] sm:text-[13px] text-[#6b7280] mt-[4px]">Google Authenticator, Authy, or Microsoft Authenticator</p>
//             </div>
//           </div>
//           <button className="w-full sm:w-auto flex-shrink-0 h-[38px] px-[14px] text-white text-[12px] sm:text-[13px] font-medium rounded-[10px] hover:opacity-90 transition"
//             style={{ background: "linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-gradient-end) 100%)" }}>
//             Setup Now
//           </button>
//         </div>
//       </div>
//       {/* SMS */}
//       <div className="border border-[#e5e7eb] rounded-[12px] p-[16px] sm:p-[24px]">
//         <div className="flex flex-col sm:flex-row items-start gap-[12px] sm:gap-[16px]">
//           <div className="w-[44px] h-[44px] rounded-[12px] bg-[#f0fdf4] flex items-center justify-center flex-shrink-0">
//             <Phone size={20} className="text-[#10b981]" />
//           </div>
//           <div className="flex-1 min-w-0">
//             <h3 className="text-[14px] sm:text-[15px] font-semibold text-[#111827]">SMS Text Message</h3>
//             <p className="text-[12px] sm:text-[13px] text-[#6b7280] mt-[4px]">Receive codes via text message</p>
//           </div>
//           <button className="w-full sm:w-auto flex-shrink-0 h-[38px] px-[14px] text-white text-[12px] sm:text-[13px] font-medium rounded-[10px] hover:opacity-90 transition"
//             style={{ background: "linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-gradient-end) 100%)" }}>
//             Add Phone
//           </button>
//         </div>
//       </div>
//     </div>
//   </SectionCard>
// );

// // ── Section: Login History ────────────────────────────────────────────────────
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

// // ── Section: Privacy — adapts to role ─────────────────────────────────────────
// const PrivacySection = ({ isHR }: { isHR: boolean }) => {
//   const [toggles, setToggles] = useState(
//     isHR
//       ? { email: true, phone: false, teamAccess: true, caseAccess: true, analytics: true, updates: true, marketing: false }
//       : { email: true, phone: false, employment: true, visa: false, analytics: true, updates: true, marketing: false }
//   );
//   const toggle = (key: string) => setToggles(p => ({ ...p, [key]: !(p as any)[key] }));

//   return (
//     <div className="flex flex-col gap-[16px] sm:gap-[20px]">
//       {/* Profile Visibility */}
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

//       {/* Data & Analytics */}
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

//       {/* Data Retention */}
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

// // ── Section: Security Alerts ──────────────────────────────────────────────────
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
//           { key:"newDevice"       as AK, title:"New Device Login",           desc:"Alert when account is accessed from a new device." },
//           { key:"failedLogin"     as AK, title:"Failed Login Attempts",      desc:"Alert when multiple failed logins occur." },
//           { key:"passwordChanged" as AK, title:"Password Changed",           desc:"Alert immediately when your password changes." },
//           { key:"unusualActivity" as AK, title:"Unusual Activity Detected",  desc:"Alert when suspicious behaviour is detected." },
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


// // ── Placeholder sections (expand when needed) ─────────────────────────────────
// const ConnectedDevicesPlaceholder = () => (
//   <SectionCard>
//     <div className={`${cardPad} border-b border-[#f3f4f6]`}>
//       <h2 className="text-[17px] sm:text-[20px] font-semibold text-[#111827]">Connected Devices</h2>
//       <p className="text-[13px] sm:text-[14px] text-[#6b7280] mt-[4px]">Manage devices that have access to your account.</p>
//     </div>
//     <div className={`${cardPad} flex flex-col gap-[12px]`}>
//       <div className="border border-[#e5e7eb] rounded-[12px] p-[16px] sm:p-[20px] flex items-start gap-[14px]">
//         <div className="w-[44px] h-[44px] rounded-[12px] flex items-center justify-center flex-shrink-0"
//           style={{ backgroundColor:"var(--theme-light)", color:"var(--theme-primary)" }}>
//           <Monitor size={20} />
//         </div>
//         <div className="flex-1 min-w-0">
//           <div className="flex items-center gap-[8px]">
//             <p className="text-[14px] font-semibold text-[#111827]">Current Device</p>
//             <span className="text-[10px] font-medium px-[7px] py-[2px] rounded-full bg-[#d1fae5] text-[#065f46]">Active Now</span>
//           </div>
//           <p className="text-[12px] text-[#6b7280] mt-[4px]">This browser session</p>
//         </div>
//       </div>
//       <div className="bg-[#fffbeb] border border-[#fde68a] rounded-[10px] px-[16px] py-[12px] flex items-center gap-[10px]">
//         <AlertTriangle size={15} className="text-[#f59e0b] flex-shrink-0" />
//         <p className="text-[12px] text-[#92400e]">If you see an unrecognised device, change your password immediately.</p>
//       </div>
//     </div>
//   </SectionCard>
// );

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

// // ── Section titles ────────────────────────────────────────────────────────────
// const TITLES: Record<SectionId, { title: string; subtitle: string }> = {
//   profile:           { title:"Profile",                        subtitle:"Manage your personal information and photo"         },
//   authentication:    { title:"Authentication",                  subtitle:"Configure login methods and linked accounts"        },
//   mfa:               { title:"Multi-Factor Authentication",     subtitle:"Add a second verification step for extra security"  },
//   "login-history":   { title:"Login History",                   subtitle:"Review recent access to your account"               },
//   privacy:           { title:"Privacy Settings",                subtitle:"Control visibility and data sharing"                },
//   devices:           { title:"Connected Devices",               subtitle:"Manage devices with access to your account"         },
//   session:           { title:"Session Settings",                subtitle:"Configure session timeout and concurrent logins"    },
//   "security-alerts": { title:"Security Alerts",                 subtitle:"Get notified about important security events"       },
// };

// // ── Main ──────────────────────────────────────────────────────────────────────
// export default function ProfileSecurity() {
//   const location = useLocation();
//   const session  = getUiSession();
//   const isHR     = session?.roles?.includes("hr") ?? false;

//   const getSection = (): SectionId => {
//     // Works for both /profile/* (employee) and /employer/profile/* (HR)
//     const p = location.pathname;
//     if (p.endsWith("authentication"))  return "authentication";
//     if (p.endsWith("mfa"))             return "mfa";
//     if (p.endsWith("login-history"))   return "login-history";
//     if (p.endsWith("privacy"))         return "privacy";
//     if (p.endsWith("devices"))         return "devices";
//     if (p.endsWith("session"))         return "session";
//     if (p.endsWith("security-alerts")) return "security-alerts";
//     return "profile";
//   };

//   const activeSection = getSection();
//   const { title, subtitle } = TITLES[activeSection];

//   const COMPONENTS: Record<SectionId, React.ReactNode> = {
//     profile:           <PersonalInfoSection />,
//     authentication:    <AuthenticationSection />,
//     mfa:               <MFASection />,
//     "login-history":   <LoginHistorySection />,
//     privacy:           <PrivacySection isHR={isHR} />,
//     devices:           <ConnectedDevicesPlaceholder />,
//     session:           <SessionPlaceholder />,
//     "security-alerts": <SecurityAlertsSection />,
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

import { useState, useRef } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  Edit2, Upload, Trash2, Save, RotateCcw,
  CheckCircle, XCircle, Smartphone, Laptop,
  MapPin, Download,
  Mail, Phone, Building, Globe2,
  Info, Check, X, FileText, Monitor, Clock, AlertTriangle,
  Lock, Globe, Bell,
} from "lucide-react";

import { useMyProfile, useLoginHistory } from "../../hooks/employee/useProfile";
import { updateMyProfile, signOutAllDevices, uploadProfilePicture } from "../../api/employee/profile.api";
import { useAuthStore } from "../../store/authStore";
import imgUserAvatar from "../../assets/icons/user-avatar.jpg";
import { getFileUrl } from "../../utils/fileUrl";
import { updateUiSessionProfile, getUiSession } from "../../utils/uiSession";
import { PageHeader, PageContent } from "../../components/layout/Pageheader";
import { ThemeColorStrip } from "../settings/ThemeColorStrip";
import {
  useNotificationSoundSettings,
  playSound,
  unlockAudio,
} from "../../hooks/employee/useNotificationSoundSettings";
import type { SoundStyle } from "../../hooks/employee/useNotificationSoundSettings";

// ── Country codes ─────────────────────────────────────────────────────────────
const COUNTRIES = [
  { code:"US",flag:"🇺🇸",dial:"+1"  },{ code:"GB",flag:"🇬🇧",dial:"+44" },
  { code:"IN",flag:"🇮🇳",dial:"+91" },{ code:"CA",flag:"🇨🇦",dial:"+1"  },
  { code:"AU",flag:"🇦🇺",dial:"+61" },{ code:"DE",flag:"🇩🇪",dial:"+49" },
  { code:"FR",flag:"🇫🇷",dial:"+33" },{ code:"AE",flag:"🇦🇪",dial:"+971"},
  { code:"SG",flag:"🇸🇬",dial:"+65" },{ code:"JP",flag:"🇯🇵",dial:"+81" },
];

type SectionId =
  | "profile" | "authentication" | "mfa" | "login-history"
  | "privacy"  | "devices"        | "session" | "security-alerts"
  | "notifications";

// ── Shared small components ───────────────────────────────────────────────────

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

// =============================================================================
// SECTION: Personal Information
// =============================================================================

const PersonalInfoSection = () => {
  const { data: profile, isLoading, refetch } = useMyProfile();
  const user = useAuthStore(s => s.user);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate     = useNavigate();
  const [searchParams] = useSearchParams();

  const [editing,         setEditing]         = useState(false);
  const [saving,          setSaving]          = useState(false);
  const [error,           setError]           = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError,     setAvatarError]     = useState<string | null>(null);
  const [phone,       setPhone]       = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [timezone,    setTimezone]    = useState("PT");
  const [language,    setLanguage]    = useState("en-US");

  const displayName  = (profile?.full_legal_name ?? `${user?.first_name ?? ""} ${user?.last_name ?? ""}`).trim() || "—";
  const displayEmail = user?.email ?? "—";
  const avatarUrl    = getFileUrl(profile?.profile_picture_url) ?? imgUserAvatar;

  const seedForm = () => {
    setPhone(profile?.phone_number ?? "");
    setCountryCode(profile?.country_code ?? "+91");
    setTimezone(profile?.timezone ?? "PT");
    setLanguage(profile?.preferred_language ?? "en-US");
  };

  const handleSave = async () => {
    setSaving(true); setError(null);
    try {
      await updateMyProfile({ timezone, preferred_language: language, phone_number: phone ? String(phone).trim() : undefined, country_code: countryCode || undefined });
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
      const result = await uploadProfilePicture(file);
      await refetch();
      if (result?.profile_picture_url) updateUiSessionProfile(result.profile_picture_url);
    } catch { setAvatarError("Failed to upload photo."); }
    finally { setAvatarUploading(false); e.target.value = ""; }
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

      {/* Avatar */}
      <div className={`${cardPadX} py-[20px] sm:py-[24px] border-b border-[#f3f4f6]`}>
        <p className="text-[13px] font-medium text-[#374151] mb-[12px]">Profile Picture</p>
        <div className="flex flex-wrap items-center gap-[16px]">
          <img src={avatarUrl} alt="Profile"
            className="w-[64px] h-[64px] sm:w-[80px] sm:h-[80px] rounded-full object-cover border-4 border-[#f3f4f6] flex-shrink-0"
            onError={e => { (e.target as HTMLImageElement).src = imgUserAvatar; }} />
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={handleAvatarChange} />
          <div className="flex flex-col gap-[8px]">
            <div className="flex flex-wrap gap-[8px]">
              <button onClick={() => fileInputRef.current?.click()} disabled={avatarUploading}
                className="flex items-center gap-[6px] px-[12px] sm:px-[14px] h-[34px] sm:h-[36px] text-white text-[12px] sm:text-[13px] font-medium rounded-[8px] hover:opacity-90 transition disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-gradient-end) 100%)" }}>
                {avatarUploading ? <><Spinner size={13} /> Uploading…</> : <><Upload size={13} /> Upload New</>}
              </button>
              <button className="flex items-center gap-[6px] px-[12px] sm:px-[14px] h-[34px] sm:h-[36px] border border-[#e5e7eb] text-[#6b7280] text-[12px] sm:text-[13px] font-medium rounded-[8px] hover:bg-[#f9fafb] transition">
                <Trash2 size={13} /> Remove
              </button>
            </div>
            {avatarError ? <p className="text-[12px] text-[#ef4444]">{avatarError}</p>
              : <p className="text-[12px] text-[#9ca3af]">JPG, PNG, GIF or WebP. Max 5 MB.</p>}
          </div>
        </div>
      </div>

      {/* Fields */}
      <div className={`${cardPad} flex flex-col gap-[16px] sm:gap-[20px]`}>
        {editing ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-[16px]">
              <ReadOnlyField label="Full Name"     value={displayName}  hint="Contact support to update your name." />
              <ReadOnlyField label="Email Address" value={displayEmail} hint="Email cannot be changed here." />
            </div>
            <div className="flex flex-col gap-[6px]">
              <label className="text-[13px] font-medium text-[#374151]">Phone Number</label>
              <div className="flex gap-[8px]">
                <select value={countryCode} onChange={e => setCountryCode(e.target.value)}
                  className="h-[46px] rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] text-[#111827] text-[14px] px-[10px] focus:outline-none focus:ring-2 w-[100px] sm:w-[110px] shrink-0 cursor-pointer"
                  style={{ outlineColor: "var(--theme-primary)" }}>
                  {COUNTRIES.map(c => <option key={`${c.code}-${c.dial}`} value={c.dial}>{c.flag} {c.dial}</option>)}
                </select>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="9876543210"
                  className="flex-1 h-[46px] rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] text-[#111827] text-[14px] px-[14px] focus:outline-none focus:ring-2 transition"
                  style={{ outlineColor: "var(--theme-primary)" }} />
              </div>
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

// =============================================================================
// SECTION: Authentication
// =============================================================================

const AuthMethodCard = ({ icon, iconBg, title, description, features, buttonLabel, active }: {
  icon: React.ReactNode; iconBg: string; title: string; description: string;
  features: { ok: boolean; text: string }[]; buttonLabel: string; active?: boolean;
}) => (
  <div className={`border rounded-[12px] p-[16px] sm:p-[24px] ${active ? "bg-[#f8fafc]" : ""}`}
    style={{ borderColor: active ? "var(--theme-border, #c7d2fe)" : "#e5e7eb" }}>
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
          </div>
          <p className="text-[12px] sm:text-[13px] text-[#6b7280] mt-[4px]">{description}</p>
          <ul className="mt-[8px] flex flex-wrap gap-[8px]">
            {features.map(f => (
              <li key={f.text} className="flex items-center gap-[5px] text-[11px] sm:text-[12px] text-[#6b7280]">
                {f.ok ? <Check size={11} className="text-[#10b981]" strokeWidth={3} /> : <X size={11} className="text-[#ef4444]" strokeWidth={3} />}
                {f.text}
              </li>
            ))}
          </ul>
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

// =============================================================================
// SECTION: MFA
// =============================================================================

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
      <div className="border-2 rounded-[12px] p-[16px] sm:p-[24px]" style={{ borderColor: "var(--theme-primary)", backgroundColor: "var(--theme-light)" }}>
        <div className="flex flex-col sm:flex-row items-start gap-[12px] sm:gap-[16px]">
          <div className="flex items-start gap-[12px] flex-1 min-w-0">
            <div className="w-[44px] h-[44px] rounded-[12px] flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "var(--theme-light)" }}>
              <Smartphone size={20} style={{ color: "var(--theme-primary)" }} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-[8px] flex-wrap">
                <h3 className="text-[14px] sm:text-[15px] font-semibold text-[#111827]">Authenticator App</h3>
                <span className="text-[11px] font-semibold rounded-full px-[8px] py-[2px]" style={{ color: "var(--theme-dark)", backgroundColor: "var(--theme-light)" }}>Recommended</span>
              </div>
              <p className="text-[12px] sm:text-[13px] text-[#6b7280] mt-[4px]">Google Authenticator, Authy, or Microsoft Authenticator</p>
            </div>
          </div>
          <button className="w-full sm:w-auto flex-shrink-0 h-[38px] px-[14px] text-white text-[12px] sm:text-[13px] font-medium rounded-[10px] hover:opacity-90 transition"
            style={{ background: "linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-gradient-end) 100%)" }}>
            Setup Now
          </button>
        </div>
      </div>
      <div className="border border-[#e5e7eb] rounded-[12px] p-[16px] sm:p-[24px]">
        <div className="flex flex-col sm:flex-row items-start gap-[12px] sm:gap-[16px]">
          <div className="w-[44px] h-[44px] rounded-[12px] bg-[#f0fdf4] flex items-center justify-center flex-shrink-0">
            <Phone size={20} className="text-[#10b981]" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[14px] sm:text-[15px] font-semibold text-[#111827]">SMS Text Message</h3>
            <p className="text-[12px] sm:text-[13px] text-[#6b7280] mt-[4px]">Receive codes via text message</p>
          </div>
          <button className="w-full sm:w-auto flex-shrink-0 h-[38px] px-[14px] text-white text-[12px] sm:text-[13px] font-medium rounded-[10px] hover:opacity-90 transition"
            style={{ background: "linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-gradient-end) 100%)" }}>
            Add Phone
          </button>
        </div>
      </div>
    </div>
  </SectionCard>
);

// =============================================================================
// SECTION: Login History
// =============================================================================

const LoginHistorySection = () => {
  const { data: history, isLoading, error } = useLoginHistory(20);
  const [signingOut, setSigningOut] = useState(false);

  return (
    <SectionCard>
      <div className={`${cardPad} border-b border-[#f3f4f6] flex flex-col sm:flex-row sm:items-start justify-between gap-[12px]`}>
        <div>
          <h2 className="text-[17px] sm:text-[20px] font-semibold text-[#111827]">Login History</h2>
          <p className="text-[13px] sm:text-[14px] text-[#6b7280] mt-[4px]">Review recent access to your account.</p>
        </div>
        <button className="flex items-center gap-[6px] h-[38px] px-[14px] border border-[#e5e7eb] text-[#374151] text-[12px] sm:text-[13px] font-medium rounded-[10px] hover:bg-[#f9fafb] transition whitespace-nowrap flex-shrink-0">
          <Download size={14} /> Export History
        </button>
      </div>
      <div className={`${cardPad} flex flex-col gap-[10px]`}>
        {isLoading && <div className="flex items-center justify-center py-[32px]"><Spinner size={24} className="text-indigo-600" /></div>}
        {error && <p className="text-[13px] text-[#ef4444] text-center py-[16px]">{error}</p>}
        {!isLoading && !error && history.length === 0 && <p className="text-[13px] text-[#6b7280] text-center py-[16px]">No login history.</p>}
        {!isLoading && history.map(entry => {
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

// =============================================================================
// SECTION: Privacy — adapts to role
// =============================================================================

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

// =============================================================================
// SECTION: Security Alerts
// =============================================================================

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

// =============================================================================
// SECTION: Notification Sounds
// =============================================================================

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

      {/* Message Sounds */}
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

          {/* Enable toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[14px] font-medium text-[#111827]">Enable Message Sound</p>
              <p className="text-[12px] text-[#6b7280] mt-[2px]">Sound plays when someone sends you a message</p>
            </div>
            <Toggle checked={settings.messageSound} onChange={() => update({ messageSound: !settings.messageSound })} />
          </div>

          {/* Sound style picker */}
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

          {/* Volume slider */}
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

          {/* Test */}
          <button onClick={() => { unlockAudio(); playSound("message"); }}
            disabled={!settings.messageSound || settings.messageSoundStyle === "silent"}
            className="flex items-center justify-center gap-[8px] h-[40px] px-[20px] border border-[#e5e7eb]
                       text-[13px] font-medium text-[#374151] rounded-[10px] hover:bg-[#f9fafb]
                       transition w-full sm:w-fit disabled:opacity-40">
            🔊 Test Message Sound
          </button>
        </div>
      </SectionCard>

      {/* Notification Sounds */}
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

          {/* Enable toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[14px] font-medium text-[#111827]">Enable Notification Sound</p>
              <p className="text-[12px] text-[#6b7280] mt-[2px]">Case updates, deadlines, and alerts</p>
            </div>
            <Toggle checked={settings.notifSound} onChange={() => update({ notifSound: !settings.notifSound })} />
          </div>

          {/* Volume slider */}
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

          {/* Test */}
          <button onClick={() => { unlockAudio(); playSound("notif"); }}
            disabled={!settings.notifSound}
            className="flex items-center justify-center gap-[8px] h-[40px] px-[20px] border border-[#e5e7eb]
                       text-[13px] font-medium text-[#374151] rounded-[10px] hover:bg-[#f9fafb]
                       transition w-full sm:w-fit disabled:opacity-40">
            🔊 Test Notification Sound
          </button>
        </div>
      </SectionCard>

      {/* Info */}
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

// =============================================================================
// SECTION: Connected Devices (placeholder)
// =============================================================================

const ConnectedDevicesPlaceholder = () => (
  <SectionCard>
    <div className={`${cardPad} border-b border-[#f3f4f6]`}>
      <h2 className="text-[17px] sm:text-[20px] font-semibold text-[#111827]">Connected Devices</h2>
      <p className="text-[13px] sm:text-[14px] text-[#6b7280] mt-[4px]">Manage devices that have access to your account.</p>
    </div>
    <div className={`${cardPad} flex flex-col gap-[12px]`}>
      <div className="border border-[#e5e7eb] rounded-[12px] p-[16px] sm:p-[20px] flex items-start gap-[14px]">
        <div className="w-[44px] h-[44px] rounded-[12px] flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor:"var(--theme-light)", color:"var(--theme-primary)" }}>
          <Monitor size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-[8px]">
            <p className="text-[14px] font-semibold text-[#111827]">Current Device</p>
            <span className="text-[10px] font-medium px-[7px] py-[2px] rounded-full bg-[#d1fae5] text-[#065f46]">Active Now</span>
          </div>
          <p className="text-[12px] text-[#6b7280] mt-[4px]">This browser session</p>
        </div>
      </div>
      <div className="bg-[#fffbeb] border border-[#fde68a] rounded-[10px] px-[16px] py-[12px] flex items-center gap-[10px]">
        <AlertTriangle size={15} className="text-[#f59e0b] flex-shrink-0" />
        <p className="text-[12px] text-[#92400e]">If you see an unrecognised device, change your password immediately.</p>
      </div>
    </div>
  </SectionCard>
);

// =============================================================================
// SECTION: Session (placeholder)
// =============================================================================

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

// =============================================================================
// Route → section mapping + page titles
// =============================================================================

const SECTION_TITLES: Record<SectionId, { title: string; subtitle: string }> = {
  profile:           { title:"Profile",                       subtitle:"Manage your personal information and photo"        },
  authentication:    { title:"Authentication",                 subtitle:"Configure login methods and linked accounts"       },
  mfa:               { title:"Multi-Factor Authentication",    subtitle:"Add a second verification step for extra security" },
  "login-history":   { title:"Login History",                  subtitle:"Review recent access to your account"              },
  privacy:           { title:"Privacy Settings",               subtitle:"Control visibility and data sharing"               },
  devices:           { title:"Connected Devices",              subtitle:"Manage devices with access to your account"        },
  session:           { title:"Session Settings",               subtitle:"Configure session timeout and concurrent logins"   },
  "security-alerts": { title:"Security Alerts",                subtitle:"Get notified about important security events"      },
  notifications:     { title:"Notification Sounds",            subtitle:"Customise sounds for messages and alerts"          },
};

// =============================================================================
// Main export
// =============================================================================

export default function ProfileSecurity() {
  const location = useLocation();
  const session  = getUiSession();
  const isHR     = session?.roles?.includes("hr") ?? false;

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
    profile:           <PersonalInfoSection />,
    authentication:    <AuthenticationSection />,
    mfa:               <MFASection />,
    "login-history":   <LoginHistorySection />,
    privacy:           <PrivacySection isHR={isHR} />,
    devices:           <ConnectedDevicesPlaceholder />,
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
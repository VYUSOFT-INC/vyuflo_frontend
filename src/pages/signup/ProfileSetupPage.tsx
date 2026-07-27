// import { useState } from "react";
// import { useNavigate } from 'react-router-dom';
// // ── Figma Asset URLs ──────────────────────────────────────────────────────────
// // const imgCheckIcon   = "https://www.figma.com/api/mcp/asset/4bc09bf7-37ce-460f-b281-ae925acc57aa";
// // const imgDashIcon    = "https://www.figma.com/api/mcp/asset/90609f3f-4971-418b-9c6a-906f89fccaf4";
// // const imgLightningIcon = "https://www.figma.com/api/mcp/asset/ec6af7d6-5877-45ce-b646-b200da7cfe02";
// // const imgNewsIcon    = "https://www.figma.com/api/mcp/asset/c28321a9-d713-48da-88f3-88dac7b9f52b";
// // const imgChevronSvg  = "https://www.figma.com/api/mcp/asset/645e1f3c-31ec-47a3-8c6a-e2c3be9afde1";
// // const imgArrowRight  = "https://www.figma.com/api/mcp/asset/04aa64f9-a3a5-46ea-942d-5c501049c6fe";
// // const imgLockIcon    = "https://www.figma.com/api/mcp/asset/2f0b5dc4-fe1c-4106-9627-012106d1d1bd";
// // const imgShieldIcon  = "https://www.figma.com/api/mcp/asset/9cbcf19a-d53a-4af1-a71b-169ca89e559e";
// // const imgGlobeIcon   = "https://www.figma.com/api/mcp/asset/397b93fb-1316-4338-aa33-43f9efcb8f3b";
// // const imgPrivacyIcon = "https://www.figma.com/api/mcp/asset/6bb48b2a-80bd-4848-ac02-4de68920bdfa";
// // const imgLogoIcon    = "https://www.figma.com/api/mcp/asset/6bb48b2a-80bd-4848-ac02-4de68920bdfa";


// // AFTER — permanent, never breaks ✅
// import imgCheckIcon     from "../../assets/icons/check-icon.svg";
// import imgDashIcon      from "../../assets/icons/dash-icon.svg";
// import imgLightningIcon from "../../assets/icons/lightning-icon.svg";
// import imgNewsIcon      from "../../assets/icons/news-icon.svg";
// import imgChevronSvg    from "../../assets/icons/chevron.svg";
// import imgArrowRight    from "../../assets/icons/arrow-right.svg";
// import imgLockIcon      from "../../assets/icons/lock-icon.svg";
// import imgShieldIcon    from "../../assets/icons/shield-icon.svg";
// import imgGlobeIcon     from "../../assets/icons/globe-icon.svg";
// import imgPrivacyIcon   from "../../assets/icons/privacy-logo-icon.svg";
// import imgLogoIcon      from "../../assets/icons/privacy-logo-icon.svg"; // same file
// import { useAuthStore } from '../../store/authStore';

// // ── Types ─────────────────────────────────────────────────────────────────────
// interface ProfileForm {
//   full_legal_name: string;
//   date_of_birth: string;
//   gender: string;
//   nationality: string;
//   country_of_residence: string;
//   visa_targets: string[];
//   primary_visa: string;
//   timezone: string;
//   preferred_language: string;
// }

// const VISA_CHIPS = ["H-1B","F-1","O-1A","O-1B","L-1A","L-1B","EB-2","GREEN-CARD"];

// const VISA_RADIO_CARDS = [
//   { value: "H-1B", title: "H-1B Specialty Occupation", sub: "Employment-based temporary visa" },
//   { value: "O-1A", title: "O-1 Extraordinary Ability", sub: "For individuals with extraordinary achievement" },
//   { value: "EB-2", title: "EB-2", sub: "Advanced degree / NIW" },
//   { value: "OTHER", title: "Other / Undecided", sub: "I need help figuring this out" },
// ];

// const COUNTRIES = [
//   "United States", "India", "China", "Canada", "United Kingdom",
//   "Germany", "France", "Australia", "Brazil", "Mexico", "Japan",
//   "South Korea", "Nigeria", "Pakistan", "Bangladesh", "Philippines",
// ];

// const TIMEZONES = [
//   "Eastern Time (ET) - Auto-detected",
//   "Central Time (CT)",
//   "Mountain Time (MT)",
//   "Pacific Time (PT)",
//   "UTC",
//   "IST (India Standard Time)",
// ];

// const LANGUAGES = ["English", "Spanish", "French", "German", "Hindi", "Mandarin", "Portuguese"];

// const API_BASE = import.meta.env.VITE_API_BASE_URL;

// // ── Component ─────────────────────────────────────────────────────────────────
// export default function ProfileSetupStep2() {
//   const navigate    = useNavigate();                    
//   const token = useAuthStore((s) => s.accessToken); 

//   const [form, setForm] = useState<ProfileForm>({
//     full_legal_name: "",
//     date_of_birth: "",
//     gender: "",
//     nationality: "",
//     country_of_residence: "",
//     visa_targets: ["H-1B", "O-1A"],
//     primary_visa: "H-1B",
//     timezone: "Eastern Time (ET) - Auto-detected",
//     preferred_language: "English",
//   });

//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof ProfileForm, string>>>({});

//   // ── Helpers ───────────────────────────────────────────────────────────────
//   function setField<K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) {
//     setForm(p => ({ ...p, [key]: value }));
//     setFieldErrors(p => ({ ...p, [key]: undefined }));
//     setError(null);
//   }

//   function toggleVisaChip(visa: string) {
//     setForm(p => ({
//       ...p,
//       visa_targets: p.visa_targets.includes(visa)
//         ? p.visa_targets.filter(v => v !== visa)
//         : [...p.visa_targets, visa],
//     }));
//   }

//   function validate(): boolean {
//     const errs: Partial<Record<keyof ProfileForm, string>> = {};
//     if (!form.full_legal_name.trim()) errs.full_legal_name = "Full legal name is required.";
//     if (!form.nationality) errs.nationality = "Please select your nationality.";
//     if (form.visa_targets.length === 0) errs.visa_targets = "Select at least one visa type.";
//     setFieldErrors(errs);
//     return Object.keys(errs).length === 0;
//   }

//   async function handleContinue() {
//     if (!validate()) return;
//     setLoading(true);
//     setError(null);
//     try {
//       const res = await fetch(`${API_BASE}/onboarding/profile`, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${token}`,
//         },
//         body: JSON.stringify({
//           full_legal_name:      form.full_legal_name.trim(),
//           date_of_birth:        form.date_of_birth || null,
//           gender:               form.gender || null,
//           nationality:          form.nationality,
//           country_of_residence: form.country_of_residence || null,
//           visa_targets:         form.visa_targets,
//           primary_visa:         form.primary_visa || null,
//           timezone:             form.timezone || null,
//           preferred_language:   form.preferred_language || null,
//         }),
//       });

//       const data = await res.json();
//       if (!res.ok) throw new Error(data.detail ?? "Failed to save profile.");

//       // Step 2 — mark onboarding complete
//       const completeRes = await fetch(`${API_BASE}/onboarding/complete`, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${token}`,
//         },
//       });

//       const completeData = await completeRes.json();
//       if (!completeRes.ok) throw new Error(completeData.detail ?? "Failed to complete onboarding.");

//       // Step 3 — navigate without full page reload
//       navigate("/signup/verification");

//     } catch (e: unknown) {
//       setError(e instanceof Error ? e.message : "Something went wrong.");
//     } finally {
//       setLoading(false);
//     }
//   }

//   async function handleSaveProgress() {
//     if (!form.full_legal_name.trim()) return;
//     try {
//       const token = useAuthStore((s) => s.accessToken);

//       await fetch(`${API_BASE}/onboarding/profile`, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${token}`,
//         },
//         body: JSON.stringify({
//           full_legal_name:      form.full_legal_name.trim(),
//           date_of_birth:        form.date_of_birth || null,
//           gender:               form.gender || null,
//           nationality:          form.nationality || "Unknown",
//           country_of_residence: form.country_of_residence || null,
//           visa_targets:         form.visa_targets.length ? form.visa_targets : ["Unknown"],
//           primary_visa:         form.primary_visa || null,
//           timezone:             form.timezone || null,
//           preferred_language:   form.preferred_language || null,
//         }),
//       });
//     } catch {
//       // silent — save progress is best-effort
//     }
//   }

//   // ── Render ────────────────────────────────────────────────────────────────
//   return (
//     <div className="bg-white min-h-screen relative w-full font-['Inter',sans-serif]">

//       {/* ── Header ── */}
//       <div className="bg-white border-b border-[#f3f4f6] flex h-[72px] items-center justify-center left-0 px-12 right-0 top-0 fixed z-20 w-full">
//         <div className="flex-1 max-w-[1440px] flex items-center justify-between">
//           <div className="flex gap-2 items-center">
//             <div className="bg-gradient-to-r from-[#4f46e5] to-[#7c3aed] flex items-center justify-center rounded-[8px] size-8">
//               <img alt="logo" className="block" src={imgLogoIcon} style={{ width: 17.5, height: 12.97 }} />
//             </div>
//             <span className="font-bold text-[#111827] text-[20px] tracking-[-0.5px] leading-[28px]">Vyuflo</span>
//           </div>
//           <div className="flex gap-1 font-medium text-[14px] items-center">
//             <span className="text-[#4b5563]">Already have an account? </span>
//             <a href="/login" className="text-indigo-600">Sign In</a>
//           </div>
//         </div>
//       </div>

//       {/* ── Progress Bar ── */}
//       <div className="bg-white border-b border-[#f3f4f6] flex flex-col items-start left-0 pb-[25px] pt-[24px] px-[240px] right-0 fixed top-[72px] z-10 w-full">
//         <div className="relative w-full">
//           <div className="flex items-center justify-between relative w-full">
//             {/* Background line */}
//             <div className="absolute bg-[#e5e7eb] h-[2px] left-0 right-0 top-1/2 -translate-y-1/2" />
//             {/* Active line — 50% (halfway between step 1 and 2) */}
//             <div className="absolute bg-indigo-600 h-[2px] left-0 right-1/2 top-1/2 -translate-y-1/2" />

//             {/* Step 1 — completed */}
//             <div className="bg-white flex flex-col gap-2 items-center px-2 relative shrink-0 z-10">
//               <div className="bg-indigo-600 drop-shadow-[0px_1px_1px_rgba(0,0,0,0.05)] flex items-center justify-center rounded-full size-8">
//                 <img alt="check" src={imgCheckIcon} style={{ width: 12.25, height: 8.75 }} />
//               </div>
//               <div className="flex flex-col gap-0.5 items-center">
//                 <span className="font-semibold text-indigo-600 text-[12px] tracking-[0.6px] uppercase leading-[16px]">STEP 1</span>
//                 <span className="font-medium text-[#111827] text-[14px] leading-[20px] text-center">Account Details</span>
//               </div>
//             </div>

//             {/* Step 2 — active */}
//             <div className="bg-white flex flex-col gap-2 items-center px-2 relative shrink-0 z-10">
//               <div className="bg-indigo-600 flex items-center justify-center relative rounded-full size-8">
//                 {/* Glow ring */}
//                 <div className="absolute -translate-x-1/2 left-1/2 rounded-full shadow-[0px_0px_0px_4px_#eef2ff,0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)] size-8 top-0 bg-transparent" />
//                 <span className="font-semibold text-white text-[14px] leading-[20px] relative z-10">2</span>
//               </div>
//               <div className="flex flex-col gap-0.5 items-center">
//                 <span className="font-semibold text-indigo-600 text-[12px] tracking-[0.6px] uppercase leading-[16px]">STEP 2</span>
//                 <span className="font-medium text-[#111827] text-[14px] leading-[20px] text-center">Profile Setup</span>
//               </div>
//             </div>

//             {/* Step 3 — upcoming */}
//             <div className="bg-white flex flex-col gap-2 items-center px-2 relative shrink-0 z-10">
//               <div className="bg-[#f3f4f6] border-2 border-[#e5e7eb] flex items-center justify-center p-0.5 rounded-full size-8">
//                 <span className="font-semibold text-[#9ca3af] text-[14px] leading-[20px]">3</span>
//               </div>
//               <div className="flex flex-col gap-0.5 items-center">
//                 <span className="font-semibold text-[#9ca3af] text-[12px] tracking-[0.6px] uppercase leading-[16px]">STEP 3</span>
//                 <span className="font-medium text-[#9ca3af] text-[14px] leading-[20px] text-center">Verification</span>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* ── Main Content ── */}
//       <div className="bg-white flex flex-col items-start left-0 px-[208px] py-[48px] right-0 absolute" style={{ top: 199 }}>
//         <div className="flex gap-[48px] items-start max-w-[1024px] px-8 relative w-full">

//           {/* ── Left Sidebar ── */}
//           <div className="flex flex-col items-start justify-center self-stretch shrink-0 w-[320px]">
//             <div className="bg-[#f9fafb] border border-[#f3f4f6] flex flex-1 flex-col items-start min-h-0 p-[33px] rounded-[16px] w-full">

//               {/* Title */}
//               <div className="pb-4 w-full">
//                 <p className="font-bold text-[#111827] text-[24px] leading-[32px]">Complete Your<br />Profile</p>
//               </div>

//               {/* Description */}
//               <div className="mb-[31px]">
//                 <p className="font-normal text-[#4b5563] text-[14px] leading-[22.75px]">
//                   This information helps us personalise<br />
//                   your immigration journey and connect<br />
//                   you with the right resources.
//                 </p>
//               </div>

//               {/* Features */}
//               <div className="flex flex-col gap-6 items-start w-full flex-1">
//                 {[
//                   { icon: imgDashIcon, w: 16, h: 14, title: "Personalised dashboard", sub: "Your visa type targets will shape your homepage" },
//                   { icon: imgLightningIcon, w: 12.008, h: 16.002, title: "Faster case setup", sub: "Pre-filled forms based on your nationality and residence" },
//                   { icon: imgNewsIcon, w: 16, h: 14, title: "Relevant news", sub: "Immigration updates filtered to your situation" },
//                 ].map((f) => (
//                   <div key={f.title} className="flex gap-4 items-start w-full">
//                     <div className="bg-indigo-50 flex items-center justify-center rounded-full shrink-0 size-10">
//                       <img alt="" src={f.icon} style={{ width: f.w, height: f.h }} />
//                     </div>
//                     <div className="flex flex-col gap-1 items-start self-stretch">
//                       <p className="font-semibold text-[#111827] text-[14px] leading-[20px]">{f.title}</p>
//                       <p className="font-normal text-[#6b7280] text-[12px] leading-[19.5px]">{f.sub}</p>
//                     </div>
//                   </div>
//                 ))}
//               </div>

//               {/* Progress */}
//               <div className="pt-8 w-full">
//                 <div className="border-t border-[#e5e7eb] flex flex-col gap-3 items-start pt-[25px] w-full">
//                   <div className="flex items-center justify-between w-full">
//                     <span className="font-normal text-[#6b7280] text-[14px] leading-[20px]">Progress</span>
//                     <span className="font-medium text-[#111827] text-[14px] leading-[20px]">Step 2 of 3</span>
//                   </div>
//                   <div className="bg-[#e5e7eb] h-2 rounded-full w-full overflow-hidden">
//                     <div className="bg-indigo-600 h-full rounded-full" style={{ width: "66.67%" }} />
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* ── Main Form ── */}
//           <div className="flex flex-1 flex-col gap-8 items-start max-w-[672px] min-w-0 self-stretch">

//             {/* Heading */}
//             <div className="flex flex-col gap-2 items-start w-full">
//               <p className="font-bold text-[#111827] text-[30px] leading-[36px]">Step 2: Profile Setup</p>
//               <p className="font-normal text-[#6b7280] text-[16px] leading-[24px]">
//                 Tell us a little about yourself so we can personalise your experience.
//               </p>
//             </div>

//             {error && (
//               <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm w-full">
//                 {error}
//               </div>
//             )}

//             <div className="flex flex-col gap-10 items-start w-full">

//               {/* ── Section: Personal Details ── */}
//               <div className="flex flex-col gap-6 items-start w-full">
//                 <div className="border-b border-[#f3f4f6] pb-[9px] w-full">
//                   <p className="font-semibold text-[#111827] text-[18px] leading-[28px]">Personal Details</p>
//                 </div>

//                 {/* Full Legal Name */}
//                 <div className="flex flex-col gap-1 items-start w-full">
//                   <label className="font-medium text-[#111827] text-[14px] leading-[21px]">
//                     Full Legal Name (as on passport)
//                   </label>
//                   <input
//                     type="text"
//                     placeholder="e.g. John Michael Smith"
//                     value={form.full_legal_name}
//                     onChange={e => setField("full_legal_name", e.target.value)}
//                     className={`bg-white border h-[54px] overflow-hidden px-[17px] rounded-[8px] w-full font-normal text-[14px] leading-normal focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-600 transition placeholder-[#9ca3af] ${
//                       fieldErrors.full_legal_name ? "border-red-400 bg-red-50" : "border-[#e5e7eb]"
//                     }`}
//                   />
//                   {fieldErrors.full_legal_name
//                     ? <p className="text-red-500 text-[12px]">{fieldErrors.full_legal_name}</p>
//                     : <p className="font-normal text-[#6b7280] text-[12px] leading-[18px]">Enter your name exactly as it appears on your passport</p>
//                   }
//                 </div>

//                 {/* DOB & Gender Row */}
//                 <div className="grid grid-cols-2 gap-6 w-full">
//                   {/* Date of Birth */}
//                   <div className="flex flex-col gap-2 items-start">
//                     <label className="font-medium text-[#111827] text-[14px] leading-[21px]">Date of Birth</label>
//                     <input
//                       type="text"
//                       placeholder="YYYY-MM-DD"
//                       value={form.date_of_birth}
//                       onChange={e => setField("date_of_birth", e.target.value)}
//                       className="bg-white border border-[#e5e7eb] h-[50px] px-[17px] rounded-[8px] w-full font-normal text-[#6b7280] text-[14px] leading-[21px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-600 transition placeholder-[#6b7280]"
//                     />
//                   </div>

//                   {/* Gender */}
//                   <div className="flex flex-col gap-2 items-start">
//                     <label className="font-medium text-[#111827] text-[14px] leading-[21px]">Gender</label>
//                     <div className="relative w-full">
//                       <select
//                         value={form.gender}
//                         onChange={e => setField("gender", e.target.value)}
//                         className="appearance-none bg-white border border-[#e5e7eb] h-[50px] pl-[17px] pr-10 rounded-[8px] w-full font-normal text-[#111827] text-[14px] leading-[21px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-600 transition"
//                       >
//                         <option value="">Select gender</option>
//                         <option value="male">Male</option>
//                         <option value="female">Female</option>
//                         <option value="non_binary">Non-binary</option>
//                         <option value="prefer_not">Prefer not to say</option>
//                       </select>
//                       <img alt="" src={imgChevronSvg} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ width: 21, height: 21 }} />
//                     </div>
//                   </div>
//                 </div>

//                 {/* Nationality & Country of Residence */}
//                 <div className="grid grid-cols-2 gap-6 w-full">
//                   {/* Nationality */}
//                   <div className="flex flex-col gap-1 items-start">
//                     <label className="font-medium text-[#111827] text-[14px] leading-[21px]">Nationality</label>
//                     <div className="relative w-full">
//                       <select
//                         value={form.nationality}
//                         onChange={e => setField("nationality", e.target.value)}
//                         className={`appearance-none bg-white border h-[54px] pl-[17px] pr-10 rounded-[8px] w-full font-normal text-[#111827] text-[14px] leading-[21px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-600 transition ${
//                           fieldErrors.nationality ? "border-red-400 bg-red-50" : "border-[#e5e7eb]"
//                         }`}
//                       >
//                         <option value="">Select your nationality</option>
//                         {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
//                       </select>
//                       <img alt="" src={imgChevronSvg} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ width: 21, height: 21 }} />
//                     </div>
//                     {fieldErrors.nationality
//                       ? <p className="text-red-500 text-[12px]">{fieldErrors.nationality}</p>
//                       : <p className="font-normal text-[#6b7280] text-[12px] leading-[18px]">Country of your passport</p>
//                     }
//                   </div>

//                   {/* Country of Residence */}
//                   <div className="flex flex-col gap-1 items-start">
//                     <label className="font-medium text-[#111827] text-[14px] leading-[21px]">Country of Residence</label>
//                     <div className="relative w-full">
//                       <select
//                         value={form.country_of_residence}
//                         onChange={e => setField("country_of_residence", e.target.value)}
//                         className="appearance-none bg-white border border-[#e5e7eb] h-[54px] pl-[17px] pr-10 rounded-[8px] w-full font-normal text-[#111827] text-[14px] leading-[21px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-600 transition"
//                       >
//                         <option value="">Select country</option>
//                         {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
//                       </select>
//                       <img alt="" src={imgChevronSvg} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ width: 21, height: 21 }} />
//                     </div>
//                     <p className="font-normal text-[#6b7280] text-[12px] leading-[18px]">Where you currently live</p>
//                   </div>
//                 </div>
//               </div>

//               {/* ── Section: Immigration Preferences ── */}
//               <div className="flex flex-col gap-6 items-start w-full">
//                 <div className="border-b border-[#f3f4f6] pb-[9px] w-full">
//                   <p className="font-semibold text-[#111827] text-[18px] leading-[28px]">Immigration Preferences</p>
//                 </div>

//                 {/* Target Visa Types — chips */}
//                 <div className="flex flex-col gap-3 items-start w-full">
//                   <label className="font-medium text-[#111827] text-[14px] leading-[21px]">Target Visa Types</label>
//                   <div className="flex flex-wrap gap-2 items-start w-full">
//                     {VISA_CHIPS.map(visa => {
//                       const selected = form.visa_targets.includes(visa);
//                       return (
//                         <button
//                           key={visa}
//                           type="button"
//                           onClick={() => toggleVisaChip(visa)}
//                           className={`border flex flex-col items-start px-[17px] py-[9px] rounded-full transition ${
//                             selected
//                               ? "bg-indigo-50 border-indigo-200"
//                               : "border-[#e5e7eb]"
//                           }`}
//                         >
//                           <span className={`font-medium text-[14px] leading-[20px] ${selected ? "text-indigo-800" : "text-[#4b5563]"}`}>
//                             {visa}
//                           </span>
//                         </button>
//                       );
//                     })}
//                   </div>
//                   {fieldErrors.visa_targets
//                     ? <p className="text-red-500 text-[12px]">{fieldErrors.visa_targets}</p>
//                     : <p className="font-normal text-[#6b7280] text-[12px] leading-[18px]">Select all visa types you are interested in. You can change this later.</p>
//                   }
//                 </div>

//                 {/* Primary Visa — radio cards */}
//                 <div className="flex flex-col gap-4 items-start pt-4 w-full">
//                   <label className="font-medium text-[#111827] text-[14px] leading-[21px]">
//                     Which visa type is your main goal right now?
//                   </label>
//                   <div className="grid grid-cols-2 gap-4 w-full">
//                     {VISA_RADIO_CARDS.map(card => {
//                       const selected = form.primary_visa === card.value;
//                       return (
//                         <button
//                           key={card.value}
//                           type="button"
//                           onClick={() => setField("primary_visa", card.value)}
//                           className={`border flex isolate items-start p-[17px] rounded-[12px] text-left transition w-full ${
//                             selected
//                               ? "bg-[rgba(79,70,229,0.05)] border-indigo-600"
//                               : "border-[#e5e7eb]"
//                           }`}
//                         >
//                           {/* Radio */}
//                           <div className="h-5 w-7 shrink-0 z-[2] flex items-start">
//                             <div className="pt-1">
//                               {selected ? (
//                                 <div className="border border-indigo-600 flex flex-col items-center justify-center p-px rounded-full size-4">
//                                   <div className="bg-indigo-600 rounded-[4px] size-2" />
//                                 </div>
//                               ) : (
//                                 <div className="border border-[#d1d5db] rounded-full size-4" />
//                               )}
//                             </div>
//                           </div>
//                           {/* Text */}
//                           <div className="flex flex-col gap-1 items-start relative z-[1]">
//                             <p className="font-medium text-[#111827] text-[14px] leading-[20px]">{card.title}</p>
//                             <p className="font-normal text-[#6b7280] text-[12px] leading-[16px]">{card.sub}</p>
//                           </div>
//                         </button>
//                       );
//                     })}
//                   </div>
//                 </div>
//               </div>

//               {/* ── Section: Account Preferences ── */}
//               <div className="flex flex-col gap-6 items-start w-full">
//                 <div className="border-b border-[#f3f4f6] pb-[9px] w-full">
//                   <p className="font-semibold text-[#111827] text-[18px] leading-[28px]">Account Preferences</p>
//                 </div>
//                 <div className="grid grid-cols-2 gap-6 w-full">
//                   {/* Timezone */}
//                   <div className="flex flex-col gap-2 items-start">
//                     <label className="font-medium text-[#111827] text-[14px] leading-[21px]">Timezone</label>
//                     <div className="relative w-full">
//                       <select
//                         value={form.timezone}
//                         onChange={e => setField("timezone", e.target.value)}
//                         className="appearance-none bg-white border border-[#e5e7eb] h-[50px] pl-[17px] pr-10 rounded-[8px] w-full font-normal text-[#111827] text-[14px] leading-[21px] focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
//                       >
//                         {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
//                       </select>
//                       <img alt="" src={imgChevronSvg} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ width: 21, height: 21 }} />
//                     </div>
//                   </div>

//                   {/* Preferred Language */}
//                   <div className="flex flex-col gap-2 items-start">
//                     <label className="font-medium text-[#111827] text-[14px] leading-[21px]">Preferred Language</label>
//                     <div className="relative w-full">
//                       <select
//                         value={form.preferred_language}
//                         onChange={e => setField("preferred_language", e.target.value)}
//                         className="appearance-none bg-white border border-[#e5e7eb] h-[50px] pl-[17px] pr-10 rounded-[8px] w-full font-normal text-[#111827] text-[14px] leading-[21px] focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
//                       >
//                         {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
//                       </select>
//                       <img alt="" src={imgChevronSvg} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ width: 21, height: 21 }} />
//                     </div>
//                   </div>
//                 </div>
//               </div>

//               {/* ── Footer Actions ── */}
//               <div className="border-t border-[#e5e7eb] flex items-center justify-between pt-[33px] w-full">
//                 <button
//                   type="button"
//                   onClick={handleSaveProgress}
//                   className="font-medium text-[#6b7280] text-[14px] leading-[20px] hover:text-[#111827] transition"
//                 >
//                   Save my progress
//                 </button>
//                 <div className="flex gap-3 items-center">
//                   <button
//                     type="button"
//                     onClick={() => window.history.back()}
//                     className="bg-white border border-[#e5e7eb] flex flex-col h-12 items-center justify-center px-[25px] rounded-[8px] font-medium text-[#374151] text-[14px] leading-[20px] hover:bg-gray-50 transition"
//                   >
//                     Back
//                   </button>
//                   <button
//                     type="button"
//                     onClick={handleContinue}
//                     disabled={loading}
//                     className="bg-gradient-to-r from-[#4f46e5] to-[#7c3aed] drop-shadow-[0px_1px_1px_rgba(0,0,0,0.05)] flex gap-2 h-12 items-center justify-center px-6 rounded-[8px] w-[156px] font-medium text-white text-[14px] leading-[20px] hover:opacity-90 transition disabled:opacity-60"
//                   >
//                     {loading ? (
//                       <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
//                         <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
//                         <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
//                       </svg>
//                     ) : (
//                       <>
//                         <span>Continue</span>
//                         <img alt="" src={imgArrowRight} style={{ width: 10.5, height: 9 }} />
//                       </>
//                     )}
//                   </button>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* ── Security Badges & Footer ── */}
//       <div className="bg-white border-t border-[#f3f4f6] flex flex-col items-start left-0 pb-8 pt-[33px] px-[208px] right-0 bottom-0 w-full" style={{ position: "absolute", top: "calc(199px + 1400px)" }}>
//         <div className="max-w-[1024px] w-full px-8 flex flex-col gap-8 items-start">
//           {/* Badges */}
//           <div className="flex gap-12 items-start justify-center opacity-60 w-full">
//             {[
//               { icon: imgLockIcon, w: 12.25, h: 14, label: "AES-256 Encryption" },
//               { icon: imgShieldIcon, w: 13.128, h: 13.918, label: "SOC 2 Certified" },
//               { icon: imgGlobeIcon, w: 15.752, h: 14, label: "GDPR Compliant" },
//               { icon: imgPrivacyIcon, w: 17.502, h: 14, label: "Privacy First" },
//             ].map(b => (
//               <div key={b.label} className="flex gap-2 items-center">
//                 <img alt="" src={b.icon} style={{ width: b.w, height: b.h }} className="shrink-0" />
//                 <span className="font-medium text-[#4b5563] text-[14px] leading-[20px]">{b.label}</span>
//               </div>
//             ))}
//           </div>
//           {/* Links */}
//           <div className="flex items-center justify-between w-full">
//             <span className="font-normal text-[#6b7280] text-[12px] leading-[16px]">© 2024 Vyuflo Inc. All rights reserved.</span>
//             <div className="flex gap-6 items-start">
//               {["Terms of Service", "Privacy Policy", "Contact Support"].map(link => (
//                 <a key={link} href="#" className="font-normal text-[#6b7280] text-[12px] leading-[16px] hover:text-[#111827] transition">
//                   {link}
//                 </a>
//               ))}
//             </div>
//           </div>
//         </div>
//       </div>

//     </div>
//   );
// }


// src/pages/signup/ProfileSetupPage.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { onboardingApi } from "../../api/onboarding.api";
import { StepBar } from "../public/Signup";

import imgLogoIcon      from "../../assets/icons/logo-icon.svg";
import imgChevronSvg    from "../../assets/icons/chevron.svg";
import imgArrowRight    from "../../assets/icons/arrow-right.svg";
import imgDashIcon      from "../../assets/icons/dash-icon.svg";
import imgLightningIcon from "../../assets/icons/lightning-icon.svg";
import imgNewsIcon      from "../../assets/icons/news-icon.svg";
import imgLockIcon      from "../../assets/icons/lock-icon.svg";
import imgShieldIcon    from "../../assets/icons/shield-icon.svg";
import imgGlobeIcon     from "../../assets/icons/globe-icon.svg";
import imgPrivacyIcon   from "../../assets/icons/privacy-logo-icon.svg";

// ── Constants ─────────────────────────────────────────────────────────────────

const GENDERS   = ["Male", "Female", "Non-binary", "Prefer not to say"];
const COUNTRIES = [
  "United States","India","China","Canada","United Kingdom","Germany","France",
  "Australia","Brazil","Mexico","Japan","South Korea","Nigeria","Pakistan","Bangladesh","Philippines",
];
const TIMEZONES = [
  "Eastern Time (ET) - Auto-detected","Central Time (CT)","Mountain Time (MT)",
  "Pacific Time (PT)","UTC","IST (India Standard Time)",
];
const LANGUAGES        = ["English","Spanish","French","German","Hindi","Mandarin","Portuguese"];
const VISA_CHIPS       = ["H-1B","F-1","O-1A","O-1B","L-1A","L-1B","EB-2","GREEN-CARD"];
const VISA_RADIO_CARDS = [
  { value: "H-1B",  title: "H-1B Specialty Occupation", sub: "Employment-based temporary visa" },
  { value: "O-1A",  title: "O-1 Extraordinary Ability", sub: "For individuals with extraordinary achievement" },
  { value: "EB-2",  title: "EB-2",                      sub: "Advanced degree / NIW" },
  { value: "OTHER", title: "Other / Undecided",          sub: "I need help figuring this out" },
];
const ATTORNEY_VISA_TYPES = ["H-1B","L-1","O-1","EB-1","EB-2","EB-3","EB-5","K-1","Asylum","DACA","TPS","NIW"];
const ATTORNEY_LANGS      = ["English","Spanish","Mandarin","French","Hindi","Portuguese","Arabic","Korean","Japanese","German"];
const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY",
];
const INDUSTRIES    = ["Technology","Healthcare","Finance","Education","Manufacturing","Retail","Construction","Legal","Consulting","Other"];
const COMPANY_SIZES = [
  { value: "1_10",      label: "1–10 employees"      },
  { value: "11_50",     label: "11–50 employees"     },
  { value: "51_200",    label: "51–200 employees"    },
  { value: "201_500",   label: "201–500 employees"   },
  { value: "501_1000",  label: "501–1,000 employees" },
  { value: "1000_plus", label: "1,000+ employees"    },
];

// ── Sidebar config ────────────────────────────────────────────────────────────

const SIDEBAR_CFG: Record<string, {
  title: string; desc: string;
  features: { icon: string; w: number; h: number; title: string; sub: string }[];
}> = {
  employee: {
    title: "Complete Your Profile",
    desc: "This information helps us personalise your immigration journey and connect you with the right resources.",
    features: [
      { icon: imgDashIcon,      w: 16, h: 14, title: "Personalised dashboard", sub: "Your visa type targets will shape your homepage" },
      { icon: imgLightningIcon, w: 12, h: 16, title: "Faster case setup",       sub: "Pre-filled forms based on your nationality and residence" },
      { icon: imgNewsIcon,      w: 16, h: 14, title: "Relevant news",           sub: "Immigration updates filtered to your situation" },
    ],
  },
  attorney: {
    title: "Attorney Profile Setup",
    desc: "Set up your professional profile to start accepting cases and getting matched with clients.",
    features: [
      { icon: imgDashIcon,      w: 16, h: 14, title: "Case Management",    sub: "Manage all your clients in one place" },
      { icon: imgLightningIcon, w: 12, h: 16, title: "Client Discovery",    sub: "Be found by employees who need your expertise" },
      { icon: imgNewsIcon,      w: 16, h: 14, title: "Practice Area Match", sub: "Get matched based on your specialisations" },
    ],
  },
  hr: {
    title: "Employer Profile Setup",
    desc: "Set up your company profile to manage employee sponsorships and immigration cases.",
    features: [
      { icon: imgDashIcon,      w: 16, h: 14, title: "Employee Dashboard",  sub: "Track all sponsored employees in one place" },
      { icon: imgLightningIcon, w: 12, h: 16, title: "Bulk Case Management", sub: "Handle multiple applications efficiently" },
      { icon: imgNewsIcon,      w: 16, h: 14, title: "Compliance Alerts",    sub: "Stay ahead of policy changes affecting your team" },
    ],
  },
  app_admin: {
    title: "Admin Profile Setup",
    desc: "Configure your admin preferences and complete your platform profile.",
    features: [
      { icon: imgDashIcon,      w: 16, h: 14, title: "Admin Dashboard",     sub: "Full visibility across the platform" },
      { icon: imgLightningIcon, w: 12, h: 16, title: "User Management",      sub: "Manage all users and roles" },
      { icon: imgNewsIcon,      w: 16, h: 14, title: "System Configuration", sub: "Configure platform-wide settings" },
    ],
  },
};

// ── Shared input styles — COMPRESSED ─────────────────────────────────────────

const inputBase =
  "bg-white border border-[#e5e7eb] px-3 rounded-[8px] w-full text-[13px] " +
  "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 " +
  "transition placeholder-[#9ca3af] text-[#111827]";
const inputH = `${inputBase} h-[46px]`;

// ── SelectField ───────────────────────────────────────────────────────────────

function SelectField({
  value, onChange, options, placeholder, error,
}: {
  value: string; onChange: (v: string) => void;
  options: (string | { value: string; label: string })[];
  placeholder?: string; error?: boolean;
}) {
  return (
    <div className="relative w-full">
      <select
        value={value} onChange={e => onChange(e.target.value)}
        className={`appearance-none ${inputH} pr-8 ${error ? "border-red-400 bg-red-50" : ""}`}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => {
          const v = typeof o === "string" ? o : o.value;
          const l = typeof o === "string" ? o : o.label;
          return <option key={v} value={v}>{l}</option>;
        })}
      </select>
      <img alt="" src={imgChevronSvg} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none w-4 h-4" />
    </div>
  );
}

// ── Section heading — COMPRESSED ──────────────────────────────────────────────

function SectionHeading({ title }: { title: string }) {
  return (
    <div className="border-b border-indigo-100 pb-2 w-full">
      <p className="font-bold text-[#111827] text-[17px]">{title}</p>
    </div>
  );
}

// ── Field wrapper — label + input with compressed gap ─────────────────────────

function Field({ label, required, error, children }: {
  label: string; required?: boolean; error?: string; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="font-semibold text-[#374151] text-[13px]">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="text-red-500 text-[11px]">{error}</p>}
    </div>
  );
}

// ── Personal fields ───────────────────────────────────────────────────────────

interface PersonalFields {
  first_name: string; last_name: string; date_of_birth: string;
  gender: string; nationality: string; country_of_residence: string;
  timezone: string; preferred_language: string;
}
const emptyPersonal = (): PersonalFields => ({
  first_name: "", last_name: "", date_of_birth: "", gender: "",
  nationality: "", country_of_residence: "", timezone: "", preferred_language: "",
});

function PersonalSection({ f, setF, nameError, nationalityError }: {
  f: PersonalFields; setF: (p: PersonalFields) => void;
  nameError?: string; nationalityError?: string;
}) {
  const set = (k: keyof PersonalFields) => (v: string) => setF({ ...f, [k]: v });
  return (
    <div className="flex flex-col gap-4 w-full">
      <SectionHeading title="Personal Details" />
      {/* Row 1 — 3 cols on xl */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <Field label="Legal First Name" required error={nameError}>
          <input type="text" placeholder="As on passport" value={f.first_name}
            onChange={e => set("first_name")(e.target.value)}
            className={`${inputH} ${nameError ? "border-red-400 bg-red-50" : ""}`} />
        </Field>
        <Field label="Legal Last Name" required>
          <input type="text" placeholder="As on passport" value={f.last_name}
            onChange={e => set("last_name")(e.target.value)} className={inputH} />
        </Field>
        <Field label="Date of Birth">
          <input type="text" placeholder="YYYY-MM-DD" value={f.date_of_birth}
            onChange={e => set("date_of_birth")(e.target.value)} className={inputH} />
        </Field>
      </div>
      {/* Row 2 — 3 cols on xl */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <Field label="Gender">
          <SelectField value={f.gender} onChange={set("gender")} options={GENDERS} placeholder="Select gender" />
        </Field>
        <Field label="Nationality" error={nationalityError}>
          <SelectField value={f.nationality} onChange={set("nationality")} options={COUNTRIES}
            placeholder="Select nationality" error={!!nationalityError} />
          {!nationalityError && <p className="text-[#6b7280] text-[11px]">Country of your passport</p>}
        </Field>
        <Field label="Country of Residence">
          <SelectField value={f.country_of_residence} onChange={set("country_of_residence")}
            options={COUNTRIES} placeholder="Select country" />
          <p className="text-[#6b7280] text-[11px]">Where you currently live</p>
        </Field>
      </div>
    </div>
  );
}

// ── Account prefs ─────────────────────────────────────────────────────────────

function AccountPrefsSection({ f, setF }: { f: PersonalFields; setF: (p: PersonalFields) => void }) {
  return (
    <div className="flex flex-col gap-4 w-full">
      <SectionHeading title="Account Preferences" />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <Field label="Timezone">
          <SelectField value={f.timezone} onChange={v => setF({ ...f, timezone: v })}
            options={TIMEZONES} placeholder="Select timezone" />
        </Field>
        <Field label="Preferred Language">
          <SelectField value={f.preferred_language} onChange={v => setF({ ...f, preferred_language: v })}
            options={LANGUAGES} placeholder="Select language" />
        </Field>
      </div>
    </div>
  );
}

// ── Employee fields ───────────────────────────────────────────────────────────

function EmployeeInnerFields({ visaTargets, setVisaTargets, primaryVisa, setPrimaryVisa, visaError }: {
  visaTargets: string[]; setVisaTargets: (v: string[]) => void;
  primaryVisa: string;   setPrimaryVisa: (v: string) => void;
  visaError?: string;
}) {
  const toggle = (v: string) =>
    setVisaTargets(visaTargets.includes(v) ? visaTargets.filter(x => x !== v) : [...visaTargets, v]);
  return (
    <div className="flex flex-col gap-4 w-full">
      <SectionHeading title="Immigration Preferences" />
      <div className="flex flex-col gap-2">
        <label className="font-semibold text-[#374151] text-[13px]">Target Visa Types</label>
        <div className="flex flex-wrap gap-2">
          {VISA_CHIPS.map(visa => {
            const sel = visaTargets.includes(visa);
            return (
              <button key={visa} type="button" onClick={() => toggle(visa)}
                className={`px-4 py-1.5 rounded-full border text-[13px] font-medium transition
                  ${sel ? "bg-indigo-50 border-indigo-300 text-indigo-700" : "border-[#e5e7eb] text-[#4b5563] hover:border-indigo-200"}`}>
                {visa}
              </button>
            );
          })}
        </div>
        {visaError
          ? <p className="text-red-500 text-[11px]">{visaError}</p>
          : <p className="text-[#6b7280] text-[11px]">Select all visa types you are interested in.</p>}
      </div>
      <div className="flex flex-col gap-2">
        <label className="font-semibold text-[#374151] text-[13px]">Which visa type is your main goal right now?</label>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {VISA_RADIO_CARDS.map(card => {
            const sel = primaryVisa === card.value;
            return (
              <button key={card.value} type="button" onClick={() => setPrimaryVisa(card.value)}
                className={`border flex items-start p-3 rounded-xl text-left transition w-full
                  ${sel ? "bg-indigo-50 border-indigo-500" : "border-[#e5e7eb] hover:border-indigo-200"}`}>
                <div className="pt-0.5 mr-2 shrink-0">
                  {sel
                    ? <div className="border-2 border-indigo-600 flex items-center justify-center rounded-full w-4 h-4">
                        <div className="bg-indigo-600 rounded-full w-2 h-2" />
                      </div>
                    : <div className="border-2 border-[#d1d5db] rounded-full w-4 h-4" />}
                </div>
                <div>
                  <p className="font-semibold text-[#111827] text-[13px]">{card.title}</p>
                  <p className="text-[#6b7280] text-[11px] mt-0.5">{card.sub}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Attorney fields ───────────────────────────────────────────────────────────

function AttorneyInnerFields({
  barNumber, setBarNumber, barState, setBarState, firmName, setFirmName,
  yearsExp, setYearsExp, specialisations, setSpecialisations, languages, setLanguages,
  bio, setBio, availability, setAvailability,
}: {
  barNumber: string; setBarNumber: (v: string) => void;
  barState: string;  setBarState: (v: string) => void;
  firmName: string;  setFirmName: (v: string) => void;
  yearsExp: string;  setYearsExp: (v: string) => void;
  specialisations: string[]; setSpecialisations: (v: string[]) => void;
  languages: string[];       setLanguages: (v: string[]) => void;
  bio: string; setBio: (v: string) => void;
  availability: string; setAvailability: (v: string) => void;
}) {
  const toggleSpec = (v: string) => setSpecialisations(specialisations.includes(v) ? specialisations.filter(x => x !== v) : [...specialisations, v]);
  const toggleLang = (v: string) => setLanguages(languages.includes(v) ? languages.filter(x => x !== v) : [...languages, v]);
  return (
    <div className="flex flex-col gap-4 w-full">
      <SectionHeading title="Professional Credentials" />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Field label="Bar Number">
          <input value={barNumber} onChange={e => setBarNumber(e.target.value)} placeholder="e.g. 123456" className={inputH} />
        </Field>
        <Field label="Bar State">
          <SelectField value={barState} onChange={setBarState} options={US_STATES} placeholder="Select state" />
        </Field>
        <Field label="Law Firm Name">
          <input value={firmName} onChange={e => setFirmName(e.target.value)} placeholder="e.g. Smith & Associates" className={inputH} />
        </Field>
        <Field label="Years of Experience">
          <input type="number" min={0} max={70} value={yearsExp} onChange={e => setYearsExp(e.target.value)} placeholder="e.g. 10" className={inputH} />
        </Field>
      </div>
      <div className="flex flex-col gap-1">
        <label className="font-semibold text-[#374151] text-[13px]">Practice Areas (Visa Types)</label>
        <div className="flex flex-wrap gap-2">
          {ATTORNEY_VISA_TYPES.map(v => {
            const sel = specialisations.includes(v);
            return (
              <button key={v} type="button" onClick={() => toggleSpec(v)}
                className={`px-3 py-1.5 rounded-full border text-[13px] font-medium transition
                  ${sel ? "bg-indigo-50 border-indigo-300 text-indigo-700" : "border-[#e5e7eb] text-[#4b5563]"}`}>
                {v}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label className="font-semibold text-[#374151] text-[13px]">Languages Spoken</label>
        <div className="flex flex-wrap gap-2">
          {ATTORNEY_LANGS.map(v => {
            const sel = languages.includes(v);
            return (
              <button key={v} type="button" onClick={() => toggleLang(v)}
                className={`px-3 py-1.5 rounded-full border text-[13px] font-medium transition
                  ${sel ? "bg-indigo-50 border-indigo-300 text-indigo-700" : "border-[#e5e7eb] text-[#4b5563]"}`}>
                {v}
              </button>
            );
          })}
        </div>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Field label="Bio">
          <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3}
            placeholder="Brief professional bio visible to potential clients…"
            className={`${inputBase} py-2 resize-none`} />
        </Field>
        <Field label="Availability Note">
          <input value={availability} onChange={e => setAvailability(e.target.value)}
            placeholder="e.g. Mon–Fri 9am–6pm EST" className={inputH} />
        </Field>
      </div>
    </div>
  );
}

// ── HR fields ─────────────────────────────────────────────────────────────────

function HRInnerFields({
  companyName, setCompanyName, companySize, setCompanySize, industry, setIndustry,
  website, setWebsite, ein, setEin, contactName, setContactName,
  contactEmail, setContactEmail, contactPhone, setContactPhone,
  address1, setAddress1, address2, setAddress2,
  city, setCity, state, setState, zipCode, setZipCode, companyError,
}: {
  companyName: string; setCompanyName: (v: string) => void;
  companySize: string; setCompanySize: (v: string) => void;
  industry: string;    setIndustry: (v: string) => void;
  website: string;     setWebsite: (v: string) => void;
  ein: string;         setEin: (v: string) => void;
  contactName: string;  setContactName: (v: string) => void;
  contactEmail: string; setContactEmail: (v: string) => void;
  contactPhone: string; setContactPhone: (v: string) => void;
  address1: string; setAddress1: (v: string) => void;
  address2: string; setAddress2: (v: string) => void;
  city: string;     setCity: (v: string) => void;
  state: string;    setState: (v: string) => void;
  zipCode: string;  setZipCode: (v: string) => void;
  companyError?: string;
}) {
  return (
    <>
      <div className="flex flex-col gap-4 w-full">
        <SectionHeading title="Company Details" />
        {/* Company name full width */}
        <Field label="Company Name" required error={companyError}>
          <input value={companyName} onChange={e => setCompanyName(e.target.value)}
            placeholder="Acme Corporation"
            className={`${inputH} ${companyError ? "border-red-400 bg-red-50" : ""}`} />
        </Field>
        {/* 4 cols on xl */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <Field label="Company Size">
            <SelectField value={companySize} onChange={setCompanySize} options={COMPANY_SIZES} placeholder="Select size" />
          </Field>
          <Field label="Industry">
            <SelectField value={industry} onChange={setIndustry} options={INDUSTRIES} placeholder="Select industry" />
          </Field>
          <Field label="Website">
            <input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://acme.com" className={inputH} />
          </Field>
          <Field label="EIN">
            <input value={ein} onChange={e => setEin(e.target.value)} placeholder="XX-XXXXXXX" className={inputH} />
          </Field>
        </div>
      </div>

      <div className="flex flex-col gap-4 w-full">
        <SectionHeading title="Contact & Address" />
        {/* 3 cols on xl */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <Field label="HR Contact Name">
            <input value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Jane Smith" className={inputH} />
          </Field>
          <Field label="HR Contact Email">
            <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="hr@acme.com" className={inputH} />
          </Field>
          <Field label="HR Contact Phone">
            <input value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="+1 (555) 000-0000" className={inputH} />
          </Field>
        </div>
        {/* Address full width */}
        <Field label="Address Line 1">
          <input value={address1} onChange={e => setAddress1(e.target.value)} placeholder="123 Main Street" className={inputH} />
        </Field>
        {/* 4 cols on xl */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <Field label="Address Line 2">
            <input value={address2} onChange={e => setAddress2(e.target.value)} placeholder="Suite 400 (optional)" className={inputH} />
          </Field>
          <Field label="City">
            <input value={city} onChange={e => setCity(e.target.value)} placeholder="San Francisco" className={inputH} />
          </Field>
          <Field label="State">
            <SelectField value={state} onChange={setState} options={US_STATES} placeholder="Select state" />
          </Field>
          <Field label="ZIP Code">
            <input value={zipCode} onChange={e => setZipCode(e.target.value)} placeholder="94105" className={inputH} />
          </Field>
        </div>
      </div>
    </>
  );
}

// ── Role headings ─────────────────────────────────────────────────────────────

const ROLE_HEADINGS: Record<string, { title: string; sub: string }> = {
  employee:  { title: "Profile Setup",    sub: "Tell us a little about yourself so we can personalise your experience." },
  attorney:  { title: "Attorney Profile", sub: "Set up your professional profile to start accepting cases." },
  hr:        { title: "Employer Profile", sub: "Set up your company profile to manage employee immigration cases." },
  app_admin: { title: "Admin Profile",    sub: "Configure your admin preferences and complete your profile." },
};

// ── Main component ────────────────────────────────────────────────────────────

export default function ProfileSetupPage() {
  const navigate = useNavigate();
  const roles    = useAuthStore(s => s.roles);
  const role     = roles?.[0] ?? "employee";

  const [personal,        setPersonal]        = useState<PersonalFields>(emptyPersonal());
  const [visaTargets,     setVisaTargets]     = useState<string[]>([]);
  const [primaryVisa,     setPrimaryVisa]     = useState("");
  const [barNumber,       setBarNumber]       = useState("");
  const [barState,        setBarState]        = useState("");
  const [firmName,        setFirmName]        = useState("");
  const [yearsExp,        setYearsExp]        = useState("");
  const [specialisations, setSpecialisations] = useState<string[]>([]);
  const [attyLangs,       setAttyLangs]       = useState<string[]>([]);
  const [bio,             setBio]             = useState("");
  const [availability,    setAvailability]    = useState("");
  const [companyName,     setCompanyName]     = useState("");
  const [companySize,     setCompanySize]     = useState("");
  const [industry,        setIndustry]        = useState("");
  const [website,         setWebsite]         = useState("");
  const [ein,             setEin]             = useState("");
  const [contactName,     setContactName]     = useState("");
  const [contactEmail,    setContactEmail]    = useState("");
  const [contactPhone,    setContactPhone]    = useState("");
  const [address1,        setAddress1]        = useState("");
  const [address2,        setAddress2]        = useState("");
  const [city,            setCity]            = useState("");
  const [addrState,       setAddrState]       = useState("");
  const [zipCode,         setZipCode]         = useState("");
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState<string | null>(null);
  const [fieldErrors,     setFieldErrors]     = useState<Record<string, string>>({});

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!personal.first_name.trim()) errs.name = "Legal first name is required.";
    if (role === "employee" && visaTargets.length === 0) errs.visa = "Select at least one visa type.";
    if (role === "employee" && !personal.nationality) errs.nationality = "Please select your nationality.";
    if (role === "hr" && !companyName.trim()) errs.company = "Company name is required.";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleContinue() {
    if (!validate()) return;
    setLoading(true); setError(null);
    try {
      const fullName = `${personal.first_name.trim()} ${personal.last_name.trim()}`.trim();
      if (role === "employee") {
        await onboardingApi.saveProfile({
          full_legal_name: fullName, nationality: personal.nationality, visa_targets: visaTargets,
          date_of_birth: personal.date_of_birth || undefined, gender: personal.gender || undefined,
          country_of_residence: personal.country_of_residence || undefined,
          primary_visa: primaryVisa || undefined, timezone: personal.timezone || undefined,
          preferred_language: personal.preferred_language || undefined,
        });
      } else if (role === "attorney") {
        await onboardingApi.saveAttorneyProfile({
          full_legal_name: fullName, date_of_birth: personal.date_of_birth || undefined,
          gender: personal.gender || undefined, nationality: personal.nationality || undefined,
          country_of_residence: personal.country_of_residence || undefined,
          timezone: personal.timezone || undefined, preferred_language: personal.preferred_language || undefined,
          bar_number: barNumber || undefined, bar_state: barState || undefined,
          law_firm_name: firmName || undefined, years_experience: yearsExp ? Number(yearsExp) : undefined,
          specialisations, languages: attyLangs, bio: bio || undefined, availability_note: availability || undefined,
        });
      } else if (role === "hr") {
        await onboardingApi.saveHRProfile({
          full_legal_name: fullName || undefined, date_of_birth: personal.date_of_birth || undefined,
          gender: personal.gender || undefined, nationality: personal.nationality || undefined,
          country_of_residence: personal.country_of_residence || undefined,
          timezone: personal.timezone || undefined, preferred_language: personal.preferred_language || undefined,
          company_name: companyName.trim(),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          company_size: companySize as any || undefined, industry: industry || undefined,
          website: website || undefined, ein: ein || undefined,
          contact_name: contactName || undefined, contact_email: contactEmail || undefined,
          contact_phone: contactPhone || undefined, address_line1: address1 || undefined,
          address_line2: address2 || undefined, city: city || undefined,
          state: addrState || undefined, zip_code: zipCode || undefined, country: "US",
        });
      } else {
        await onboardingApi.saveAdminProfile({
          full_legal_name: fullName || undefined, date_of_birth: personal.date_of_birth || undefined,
          gender: personal.gender || undefined, nationality: personal.nationality || undefined,
          country_of_residence: personal.country_of_residence || undefined,
          timezone: personal.timezone || undefined, preferred_language: personal.preferred_language || undefined,
        });
      }
      await onboardingApi.complete();
      finishOnboardingRedirect(navigate);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } }; message?: string };
      setError(err.response?.data?.detail ?? err.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const sidebar = SIDEBAR_CFG[role] ?? SIDEBAR_CFG.employee;
  const heading = ROLE_HEADINGS[role] ?? ROLE_HEADINGS.employee;

  return (
    <div className="bg-[#f3f4f6] min-h-screen w-full font-['Inter',sans-serif]">

      {/* ── Sticky top ── */}
      <div className="sticky top-0 z-20 bg-white shadow-sm">
        <header className="border-b border-[#e5e7eb] h-[56px] flex items-center px-5 sm:px-8">
          <div className="flex gap-2 items-center">
            <div className="bg-gradient-to-r from-[#4f46e5] to-[#7c3aed] flex items-center justify-center rounded-[8px] w-7 h-7">
              <img alt="logo" src={imgLogoIcon} style={{ width: 15, height: 11 }} />
            </div>
            <span className="font-bold text-[#111827] text-[18px] tracking-[-0.5px]">Vyuflo</span>
          </div>
        </header>
        <StepBar current={3} />
      </div>

      {/* ── Page body ── */}
      <div className="flex min-h-[calc(100vh-120px)]">

        {/* ── Sidebar — xl+ only ── */}
        <aside className="hidden xl:flex flex-col w-[220px] shrink-0 bg-white border-r border-[#e5e7eb]">
          <div className="p-5 sticky top-[120px]">
            <p className="font-bold text-[#111827] text-[15px] leading-[22px] mb-1">{sidebar.title}</p>
            <p className="text-[#4b5563] text-[12px] leading-[18px] mb-4">{sidebar.desc}</p>
            <div className="flex flex-col gap-4">
              {sidebar.features.map(f => (
                <div key={f.title} className="flex gap-2 items-start">
                  <div className="bg-indigo-50 flex items-center justify-center rounded-lg shrink-0 w-8 h-8">
                    <img alt="" src={f.icon} style={{ width: f.w * 0.8, height: f.h * 0.8 }} />
                  </div>
                  <div>
                    <p className="font-semibold text-[#111827] text-[12px]">{f.title}</p>
                    <p className="text-[#6b7280] text-[11px] mt-0.5 leading-[15px]">{f.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* ── Main ── */}
        <main className="flex-1 min-w-0 px-4 sm:px-6 xl:px-8 py-4">

          {/* Page title — compact */}
          <div className="mb-3">
            <h1 className="font-bold text-[#111827] text-[22px] tracking-[-0.5px]">{heading.title}</h1>
            <p className="text-[#6b7280] text-[13px] mt-0.5">{heading.sub}</p>
          </div>

          {error && (
            <div className="mb-3 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2 text-[13px]">
              {error}
            </div>
          )}

          {/* Single card — compressed padding, gap-6 between sections */}
          <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-sm px-6 py-5 flex flex-col gap-6">

            <PersonalSection
              f={personal}
              setF={p => { setPersonal(p); setFieldErrors(e => ({ ...e, name: undefined!, nationality: undefined! })); }}
              nameError={fieldErrors.name}
              nationalityError={fieldErrors.nationality}
            />

            {role === "employee" && (
              <EmployeeInnerFields
                visaTargets={visaTargets}
                setVisaTargets={v => { setVisaTargets(v); setFieldErrors(e => ({ ...e, visa: undefined! })); }}
                primaryVisa={primaryVisa} setPrimaryVisa={setPrimaryVisa}
                visaError={fieldErrors.visa}
              />
            )}

            {role === "attorney" && (
              <AttorneyInnerFields
                barNumber={barNumber}             setBarNumber={setBarNumber}
                barState={barState}               setBarState={setBarState}
                firmName={firmName}               setFirmName={setFirmName}
                yearsExp={yearsExp}               setYearsExp={setYearsExp}
                specialisations={specialisations} setSpecialisations={setSpecialisations}
                languages={attyLangs}             setLanguages={setAttyLangs}
                bio={bio}                         setBio={setBio}
                availability={availability}       setAvailability={setAvailability}
              />
            )}

            {role === "hr" && (
              <HRInnerFields
                companyName={companyName}   setCompanyName={v => { setCompanyName(v); setFieldErrors(e => ({ ...e, company: undefined! })); }}
                companySize={companySize}   setCompanySize={setCompanySize}
                industry={industry}         setIndustry={setIndustry}
                website={website}           setWebsite={setWebsite}
                ein={ein}                   setEin={setEin}
                contactName={contactName}   setContactName={setContactName}
                contactEmail={contactEmail} setContactEmail={setContactEmail}
                contactPhone={contactPhone} setContactPhone={setContactPhone}
                address1={address1}         setAddress1={setAddress1}
                address2={address2}         setAddress2={setAddress2}
                city={city}                 setCity={setCity}
                state={addrState}           setState={setAddrState}
                zipCode={zipCode}           setZipCode={setZipCode}
                companyError={fieldErrors.company}
              />
            )}

            <AccountPrefsSection f={personal} setF={setPersonal} />

            {/* Actions */}
            <div className="border-t border-[#e5e7eb] pt-4 flex items-center justify-between">
              <button type="button" onClick={() => window.history.back()}
                className="border border-[#e5e7eb] h-10 px-6 rounded-lg font-semibold text-[#374151] text-[13px] hover:bg-gray-50 transition">
                Back
              </button>
              <button type="button" onClick={handleContinue} disabled={loading}
                className="bg-gradient-to-r from-[#4f46e5] to-[#7c3aed] h-10 px-8 rounded-lg flex items-center gap-2 font-semibold text-white text-[13px] hover:opacity-90 transition disabled:opacity-60 shadow-md">
                {loading ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <>
                    <span>Complete Setup</span>
                    <img alt="" src={imgArrowRight} style={{ width: 10, height: 9 }} />
                  </>
                )}
              </button>
            </div>

          </div>

          {/* Footer badges — minimal */}
          <div className="mt-4 pb-4 flex flex-wrap gap-3 items-center justify-between opacity-40">
            <div className="flex flex-wrap gap-4 items-center">
              {[
                { icon: imgLockIcon,    w: 11, h: 13, label: "AES-256 Encryption" },
                { icon: imgShieldIcon,  w: 12, h: 13, label: "SOC 2 Certified"    },
                { icon: imgGlobeIcon,   w: 14, h: 13, label: "GDPR Compliant"     },
                { icon: imgPrivacyIcon, w: 16, h: 13, label: "Privacy First"      },
              ].map(b => (
                <div key={b.label} className="flex gap-1 items-center">
                  <img alt="" src={b.icon} style={{ width: b.w, height: b.h }} />
                  <span className="text-[#4b5563] text-[11px] font-medium">{b.label}</span>
                </div>
              ))}
            </div>
            <span className="text-[#9ca3af] text-[11px]">© 2024 Vyuflo Inc. All rights reserved.</span>
          </div>

        </main>
      </div>

    </div>
  );
}

// ── Redirect helper ───────────────────────────────────────────────────────────

const POST_ONBOARDING_REDIRECT_KEY = "post_onboarding_redirect";

function safeRedirectPath(raw: string | null, fallback: string): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return fallback;
}

export function finishOnboardingRedirect(navigate: (to: string) => void) {
  const stashed = sessionStorage.getItem(POST_ONBOARDING_REDIRECT_KEY);
  sessionStorage.removeItem(POST_ONBOARDING_REDIRECT_KEY);
  navigate(safeRedirectPath(stashed, "/dashboard"));
}
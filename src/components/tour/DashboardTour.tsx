// // src/components/tour/DashboardTour.tsx
// //
// // Role-aware spotlight tour used by all 4 dashboards.
// // Tour state is stored in the DB (user_profiles.tour_*_seen) — not localStorage.
// //
// // Usage in each dashboard:
// //   const { data: user } = useCurrentUser();
// //   <DashboardTour role="employee" user={user} />   ← employee dashboard
// //   <DashboardTour role="hr"       user={user} />   ← HR dashboard
// //   <DashboardTour role="attorney" user={user} />   ← attorney dashboard
// //   <DashboardTour role="admin"    user={user} />   ← admin dashboard
// //
// // Re-trigger programmatically (e.g. from a ? header button):
// //   window.dispatchEvent(new Event('visaflow:start-tour'))

// import { useEffect, useRef, useState, useCallback } from 'react';
// import { X, ChevronRight, ChevronLeft, HelpCircle } from 'lucide-react';
// import { useDashboardTour, type TourRole } from '../../hooks/useDashboardTour';
// import { STEPS_BY_ROLE, type TourStep } from './tourSteps';

// // ─────────────────────────────────────────────────────────────────────────────
// // HELPERS
// // ─────────────────────────────────────────────────────────────────────────────

// const PAD = 12;

// function getRect(id: string): DOMRect | null {
//   const el = document.querySelector(`[data-tour="${id}"]`);
//   return el ? el.getBoundingClientRect() : null;
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // SPOTLIGHT OVERLAY
// // ─────────────────────────────────────────────────────────────────────────────

// interface SpotlightProps {
//   rect:      DOMRect;
//   step:      TourStep;
//   stepIndex: number;
//   total:     number;
//   steps:     TourStep[];
//   onNext:    () => void;
//   onBack:    () => void;
//   onSkip:    () => void;
// }

// function Spotlight({ rect, step, stepIndex, total, steps, onNext, onBack, onSkip }: SpotlightProps) {
//   const isFirst = stepIndex === 0;
//   const isLast  = stepIndex === total - 1;

//   const top    = rect.top    - PAD;
//   const left   = rect.left   - PAD;
//   const width  = rect.width  + PAD * 2;
//   const height = rect.height + PAD * 2;

//   const TOOLTIP_W = 300;
//   const TOOLTIP_H = 190;
//   const pos = step.position ?? 'bottom';
//   const W   = window.innerWidth;
//   const H   = window.innerHeight;

//   let tipStyle: React.CSSProperties = {};
//   switch (pos) {
//     case 'bottom':
//       tipStyle = { top: top + height + 10, left: Math.min(left, W - TOOLTIP_W - 16) };
//       break;
//     case 'top':
//       tipStyle = { top: Math.max(top - TOOLTIP_H - 10, 10), left: Math.min(left, W - TOOLTIP_W - 16) };
//       break;
//     case 'left':
//       tipStyle = { top: Math.max(top, 10), left: Math.max(left - TOOLTIP_W - 14, 10) };
//       break;
//     case 'right':
//       tipStyle = { top: Math.max(top, 10), left: Math.min(left + width + 14, W - TOOLTIP_W - 16) };
//       break;
//   }

//   const maskPath = [
//     `M 0 0 L ${W} 0 L ${W} ${H} L 0 ${H} Z`,
//     `M ${left} ${top} L ${left + width} ${top} L ${left + width} ${top + height} L ${left} ${top + height} Z`,
//   ].join(' ');

//   return (
//     <>
//       {/* Dark overlay with cutout */}
//       <div
//         style={{
//           position: 'fixed', inset: 0, zIndex: 9998,
//           backgroundColor: 'rgba(0,0,0,0.55)',
//           WebkitMaskImage: `path('${maskPath}')`,
//           WebkitMaskComposite: 'xor',
//           maskImage: `path('${maskPath}')`,
//           maskComposite: 'exclude',
//           transition: 'all 0.25s ease',
//           pointerEvents: 'none',
//         }}
//       />

//       {/* Spotlight ring */}
//       <div
//         style={{
//           position: 'fixed', top, left, width, height,
//           zIndex: 9999,
//           border: '2px solid rgba(99,102,241,0.75)',
//           borderRadius: 14,
//           boxShadow: '0 0 0 3px rgba(99,102,241,0.2)',
//           transition: 'all 0.25s ease',
//           pointerEvents: 'none',
//         }}
//       />

//       {/* Tooltip card */}
//       <div
//         style={{
//           position: 'fixed', zIndex: 10000, width: TOOLTIP_W, ...tipStyle,
//           backgroundColor: '#fff', borderRadius: 14, padding: '16px 18px',
//           boxShadow: '0 8px 32px rgba(0,0,0,0.18)', border: '1px solid #e2e8f0',
//           fontFamily: 'Inter, sans-serif',
//         }}
//       >
//         {/* Header */}
//         <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
//           <div>
//             <span style={{
//               fontSize: 10, fontWeight: 600, letterSpacing: '0.07em',
//               textTransform: 'uppercase', color: '#6366f1', display: 'block', marginBottom: 3,
//             }}>
//               Step {stepIndex + 1} of {total}
//             </span>
//             <p style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', lineHeight: '18px', letterSpacing: '-0.3px' }}>
//               {step.title}
//             </p>
//           </div>
//           <button
//             onClick={onSkip}
//             style={{
//               width: 26, height: 26, borderRadius: 8, border: 'none',
//               background: '#f1f5f9', cursor: 'pointer', display: 'flex',
//               alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#64748b',
//             }}
//             aria-label="Skip tour"
//           >
//             <X size={13} />
//           </button>
//         </div>

//         {/* Description */}
//         <p style={{ fontSize: 13, color: '#475569', lineHeight: '18px', letterSpacing: '-0.3px', marginBottom: 14 }}>
//           {step.description}
//         </p>

//         {/* Progress dots */}
//         <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 12 }}>
//           {steps.map((_, i) => (
//             <div key={i} style={{
//               width: i === stepIndex ? 16 : 6, height: 6, borderRadius: 3,
//               backgroundColor: i === stepIndex ? '#6366f1' : '#e2e8f0',
//               transition: 'all 0.2s ease',
//             }} />
//           ))}
//         </div>

//         {/* Nav buttons */}
//         <div style={{ display: 'flex', gap: 8 }}>
//           {!isFirst && (
//             <button
//               onClick={onBack}
//               style={{
//                 flex: 1, height: 34, borderRadius: 9, border: '1px solid #e2e8f0',
//                 background: '#fff', fontSize: 12, fontWeight: 600, color: '#64748b',
//                 cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
//               }}
//             >
//               <ChevronLeft size={13} /> Back
//             </button>
//           )}
//           <button
//             onClick={onNext}
//             style={{
//               flex: 2, height: 34, borderRadius: 9, border: 'none',
//               background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
//               fontSize: 12, fontWeight: 600, color: '#fff',
//               cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
//             }}
//           >
//             {isLast ? 'Finish tour' : 'Next'} {!isLast && <ChevronRight size={13} />}
//           </button>
//         </div>

//         {/* Skip link */}
//         {!isLast && (
//           <button
//             onClick={onSkip}
//             style={{
//               display: 'block', width: '100%', marginTop: 8,
//               textAlign: 'center', fontSize: 11, color: '#94a3b8',
//               background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '-0.3px',
//             }}
//           >
//             Skip tour
//           </button>
//         )}
//       </div>
//     </>
//   );
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // MAIN COMPONENT
// // ─────────────────────────────────────────────────────────────────────────────

// interface DashboardTourProps {
//   role: TourRole;
//   // No user prop needed — the hook fetches the profile flag itself
// }

// export function DashboardTour({ role }: DashboardTourProps) {
//   const steps = STEPS_BY_ROLE[role] ?? [];

//   const [active, setActive] = useState(false);
//   const [step,   setStep]   = useState(0);
//   const [rect,   setRect]   = useState<DOMRect | null>(null);
//   const rafRef = useRef<number | null>(null);

//   const startTour = useCallback(() => {
//     setStep(0);
//     setActive(true);
//   }, []);

//   const { markSeen } = useDashboardTour(role, startTour);

//   const endTour = useCallback(() => {
//     setActive(false);
//     markSeen();
//   }, [markSeen]);

//   // Allow external re-trigger from any ? button
//   useEffect(() => {
//     const handler = () => startTour();
//     window.addEventListener('visaflow:start-tour', handler);
//     return () => window.removeEventListener('visaflow:start-tour', handler);
//   }, [startTour]);

//   // Keep spotlight rect in sync with the current DOM element (rAF loop)
//   useEffect(() => {
//     if (!active || steps.length === 0) return;

//     const sync = () => {
//       const r = getRect(steps[step].id);
//       setRect(r);
//       const el = document.querySelector(`[data-tour="${steps[step].id}"]`);
//       if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
//       rafRef.current = requestAnimationFrame(sync);
//     };

//     rafRef.current = requestAnimationFrame(sync);
//     return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
//   }, [active, step, steps]);

//   const handleNext = () => {
//     if (step < steps.length - 1) setStep(s => s + 1);
//     else endTour();
//   };
//   const handleBack = () => setStep(s => Math.max(0, s - 1));
//   const handleSkip = () => endTour();

//   return (
//     <>
//       {/* Floating ? button — always visible so users can replay */}
//       <button
//         onClick={startTour}
//         title="Take the tour"
//         aria-label="Start dashboard tour"
//         style={{
//           position: 'fixed', bottom: 24, right: 24, zIndex: 9997,
//           width: 40, height: 40, borderRadius: '50%',
//           background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
//           border: 'none', cursor: 'pointer',
//           display: 'flex', alignItems: 'center', justifyContent: 'center',
//           boxShadow: '0 4px 14px rgba(99,102,241,0.4)', color: '#fff',
//         }}
//       >
//         <HelpCircle size={18} />
//       </button>

//       {active && rect && (
//         <Spotlight
//           rect={rect}
//           step={steps[step]}
//           stepIndex={step}
//           total={steps.length}
//           steps={steps}
//           onNext={handleNext}
//           onBack={handleBack}
//           onSkip={handleSkip}
//         />
//       )}
//     </>
//   );
// }
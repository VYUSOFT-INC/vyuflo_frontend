// // src/components/layout/PageHeader.tsx
// import { Search } from 'lucide-react';
// import { useState } from 'react';
// import { NotificationBell } from './NotificationBell';

// interface PageHeaderProps {
//   title:              string;
//   subtitle?:          string;
//   actions?:           React.ReactNode;
//   showSearch?:        boolean;
//   searchValue?:       string;
//   searchPlaceholder?: string;
//   onSearchChange?:    (value: string) => void;
//   showBell?:          boolean;
// }

// export function PageHeader({
//   title,
//   subtitle,
//   actions,
//   showSearch        = false,
//   searchValue       = '',
//   searchPlaceholder = 'Search...',
//   onSearchChange,
//   showBell          = true,
// }: PageHeaderProps) {
//   const [localSearch, setLocalSearch] = useState('');

//   const searchVal   = onSearchChange ? searchValue : localSearch;
//   const handleSearch = (v: string) => {
//     if (onSearchChange) onSearchChange(v);
//     else setLocalSearch(v);
//   };

//   return (
//     <header className={[
//       'bg-[rgba(255,255,255,0.9)] border-b border-[#f1f5f9] backdrop-blur-sm',
//       'shrink-0 sticky top-0 z-10',
//       'flex flex-wrap items-center gap-[12px]',
//       'min-h-[56px] lg:min-h-[72px]',
//       'px-[16px] sm:px-[24px] lg:px-[32px]',
//       'py-[10px] lg:py-[0px]',
//     ].join(' ')}>

//       {/* ── Left: title + subtitle ── */}
//       <div className="flex flex-col gap-[2px] flex-1 min-w-0">
//         <p className="font-bold text-[#0f172a] text-[16px] sm:text-[18px] lg:text-[20px]
//                       leading-[22px] lg:leading-[28px] tracking-[-0.5px] truncate">
//           {title}
//         </p>
//         {subtitle && (
//           <p className="font-normal text-[#64748b] text-[11px] sm:text-[12px]
//                         leading-[16px] tracking-[-0.5px] truncate">
//             {subtitle}
//           </p>
//         )}
//       </div>

//       {/* ── Right: search + bell + actions ── */}
//       <div className="flex items-center gap-[8px] sm:gap-[12px] lg:gap-[16px] flex-shrink-0">

//         {/* Search — hidden on mobile */}
//         {showSearch && (
//           <div className="relative h-[34px] sm:h-[38px] hidden sm:block
//                           w-[160px] md:w-[200px] lg:w-[256px]">
//             <input
//               type="text"
//               placeholder={searchPlaceholder}
//               value={searchVal}
//               onChange={e => handleSearch(e.target.value)}
//               className="bg-[#f8fafc] border border-[#e2e8f0] font-normal h-full
//                          pl-[30px] sm:pl-[36px] pr-[12px] rounded-[10px] sm:rounded-[12px]
//                          text-[#1e293b] text-[13px] sm:text-[14px] tracking-[-0.5px] w-full
//                          focus:outline-none focus:ring-2 focus:ring-indigo-500
//                          focus:border-transparent placeholder:text-[#94a3b8] transition-colors"
//             />
//             <Search
//               size={13}
//               className="absolute left-[10px] sm:left-[12px] top-1/2 -translate-y-1/2
//                          text-[#94a3b8] pointer-events-none"
//             />
//           </div>
//         )}

//         {/* Bell — now a real dropdown showing recent notifications */}
//         {showBell && <NotificationBell />}

//         {/* Actions slot */}
//         {actions}
//       </div>

//     </header>
//   );
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // PageContent
// // ─────────────────────────────────────────────────────────────────────────────

// interface PageContentProps {
//   children:     React.ReactNode;
//   noPadding?:   boolean;
//   extraBottom?: number;
//   className?:   string;
// }

// export function PageContent({
//   children,
//   noPadding   = false,
//   extraBottom = 0,
//   className   = '',
// }: PageContentProps) {
//   return (
//     <main
//       className={[
//         'flex-1 overflow-y-auto',
//         noPadding
//           ? ''
//           : 'px-[16px] sm:px-[24px] lg:px-[32px] pt-[16px] sm:pt-[24px] lg:pt-[32px]',
//         className,
//       ].join(' ')}
//       style={{ paddingBottom: `${Math.max(48, extraBottom)}px` }}
//     >
//       {children}
//     </main>
//   );
// }


// src/components/layout/PageHeader.tsx
import { Search, ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NotificationBell } from './NotificationBell';

interface PageHeaderProps {
  title:              string;
  subtitle?:          string;
  actions?:           React.ReactNode;
  showSearch?:        boolean;
  searchValue?:       string;
  searchPlaceholder?: string;
  onSearchChange?:    (value: string) => void;
  showBell?:          boolean;
  /**
   * Show a back arrow button in the header.
   * - Pass a route string (e.g. "/dashboard") to navigate to that specific page.
   * - Pass `true` to go back in browser history (falls back to /dashboard if no history).
   */
  backTo?: string | boolean;
}

export function PageHeader({
  title,
  subtitle,
  actions,
  showSearch        = false,
  searchValue       = '',
  searchPlaceholder = 'Search...',
  onSearchChange,
  showBell          = true,
  backTo,
}: PageHeaderProps) {
  const [localSearch, setLocalSearch] = useState('');
  const navigate = useNavigate();

  const searchVal    = onSearchChange ? searchValue : localSearch;
  const handleSearch = (v: string) => {
    if (onSearchChange) onSearchChange(v);
    else setLocalSearch(v);
  };

  const handleBack = () => {
    if (typeof backTo === 'string') {
      navigate(backTo);
    } else if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <header className={[
      'bg-[rgba(255,255,255,0.9)] border-b border-[#f1f5f9] backdrop-blur-sm',
      'shrink-0 sticky top-0 z-10',
      'flex flex-wrap items-center gap-[12px]',
      'min-h-[56px] lg:min-h-[72px]',
      'px-[16px] sm:px-[24px] lg:px-[32px]',
      'py-[10px] lg:py-[0px]',
    ].join(' ')}>

      {/* ── Back button ── */}
      {backTo !== undefined && (
        <button
          onClick={handleBack}
          aria-label="Go back"
          className={[
            'flex items-center justify-center shrink-0',
            'w-[32px] h-[32px] sm:w-[36px] sm:h-[36px]',
            'rounded-[10px] border border-[#e2e8f0] bg-white',
            'text-[#64748b] hover:bg-[var(--theme-light)] hover:text-[var(--theme-dark)]',
            'hover:border-[var(--theme-border)] transition-colors duration-150',
          ].join(' ')}
        >
          <ArrowLeft size={16} />
        </button>
      )}

      {/* ── Left: title + subtitle ── */}
      <div className="flex flex-col gap-[2px] flex-1 min-w-0">
        <p className="font-bold text-[#0f172a] text-[16px] sm:text-[18px] lg:text-[20px]
                      leading-[22px] lg:leading-[28px] tracking-[-0.5px] truncate">
          {title}
        </p>
        {subtitle && (
          <p className="font-normal text-[#64748b] text-[11px] sm:text-[12px]
                        leading-[16px] tracking-[-0.5px] truncate">
            {subtitle}
          </p>
        )}
      </div>

      {/* ── Right: search + bell + actions ── */}
      <div className="flex items-center gap-[8px] sm:gap-[12px] lg:gap-[16px] flex-shrink-0">

        {/* Search — hidden on mobile */}
        {showSearch && (
          <div className="relative h-[34px] sm:h-[38px] hidden sm:block
                          w-[160px] md:w-[200px] lg:w-[256px]">
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchVal}
              onChange={e => handleSearch(e.target.value)}
              className="bg-[#f8fafc] border border-[#e2e8f0] font-normal h-full
                         pl-[30px] sm:pl-[36px] pr-[12px] rounded-[10px] sm:rounded-[12px]
                         text-[#1e293b] text-[13px] sm:text-[14px] tracking-[-0.5px] w-full
                         focus:outline-none focus:ring-2 focus:ring-indigo-500
                         focus:border-transparent placeholder:text-[#94a3b8] transition-colors"
            />
            <Search
              size={13}
              className="absolute left-[10px] sm:left-[12px] top-1/2 -translate-y-1/2
                         text-[#94a3b8] pointer-events-none"
            />
          </div>
        )}

        {/* Bell */}
        {showBell && <NotificationBell />}

        {/* Actions slot */}
        {actions}
      </div>

    </header>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PageContent
// ─────────────────────────────────────────────────────────────────────────────

interface PageContentProps {
  children:     React.ReactNode;
  noPadding?:   boolean;
  extraBottom?: number;
  className?:   string;
}

export function PageContent({
  children,
  noPadding   = false,
  extraBottom = 0,
  className   = '',
}: PageContentProps) {
  return (
    <main
      className={[
        'flex-1 overflow-y-auto',
        noPadding
          ? ''
          : 'px-[16px] sm:px-[24px] lg:px-[32px] pt-[16px] sm:pt-[24px] lg:pt-[32px]',
        className,
      ].join(' ')}
      style={{ paddingBottom: `${Math.max(48, extraBottom)}px` }}
    >
      {children}
    </main>
  );
}
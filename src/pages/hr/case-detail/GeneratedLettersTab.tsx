// src/pages/hr/case-detail/GeneratedLettersTab.tsx
//
// HR Case Detail → "Generated Letters" tab.
// Sources: hrCaseLettersApi (already wraps GET /hr/cases/{id}/letters +
// POST /sign + GET /pdf endpoints on the backend).

import { useEffect, useState } from 'react';
import { FileText, Download, PenLine } from 'lucide-react';
import { hrCaseLettersApi, type GeneratedLetter, type LetterStatus } from '../../../api/hr/hrCaseLetters.api';

interface Props {
  applicationId: string;
}

const STATUS_META: Record<LetterStatus, { label: string; bg: string; fg: string }> = {
  draft:                { label: 'Draft',                 bg: '#f3f4f6', fg: '#374151' },
  pending_hr_signature: { label: 'Awaiting your sign',    bg: '#fef3c7', fg: '#b45309' },
  signed:               { label: 'Signed',                bg: '#dcfce7', fg: '#15803d' },
  sent:                 { label: 'Sent',                  bg: '#dbeafe', fg: '#1d4ed8' },
  filed:                { label: 'Filed',                 bg: '#e0e7ff', fg: '#4338ca' },
};

const LETTER_TYPE_LABEL: Record<string, string> = {
  offer:                     'Offer Letter',
  support:                   'Support Letter',
  employment_verification:   'Employment Verification',
  lca_posting:               'LCA Posting Notice',
  other:                     'Other',
};

function fmtDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return ''; }
}

export default function GeneratedLettersTab({ applicationId }: Props) {
  const [letters,  setLetters]  = useState<GeneratedLetter[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [signing,  setSigning]  = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const list = await hrCaseLettersApi.list(applicationId);
      setLetters(list);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load letters.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (applicationId) load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [applicationId]);

  const handleSign = async (letter: GeneratedLetter) => {
    if (!confirm(`Sign "${letter.name}"? This transitions its status to Signed.`)) return;
    setSigning(letter.id);
    try {
      const updated = await hrCaseLettersApi.sign(applicationId, letter.id);
      setLetters((prev) => prev.map((l) => (l.id === letter.id ? updated : l)));
    } catch (e) { alert(e instanceof Error ? e.message : 'Sign failed.'); }
    finally { setSigning(null); }
  };

  const handleDownload = async (letter: GeneratedLetter) => {
    setDownloading(letter.id);
    try {
      const { blob, fileName } = await hrCaseLettersApi.downloadPdf(applicationId, letter.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = fileName; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { alert(e instanceof Error ? e.message : 'Download failed.'); }
    finally { setDownloading(null); }
  };

  if (loading) return (
    <div className="rounded-2xl border border-[#f1f5f9] bg-white p-8 text-center text-sm text-gray-500">
      Loading letters…
    </div>
  );
  if (error) return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
  );
  if (letters.length === 0) return (
    <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
      <FileText size={28} className="mx-auto mb-2 text-gray-300" />
      <p className="text-sm font-semibold text-gray-700">No generated letters yet.</p>
      <p className="mt-1 text-xs text-gray-500">Your attorney will generate letters (offer, LCA posting, employer support, etc.) as the case progresses. They appear here automatically.</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {letters.map((l) => {
        const meta = STATUS_META[l.status] ?? STATUS_META.draft;
        const canSign     = l.status === 'pending_hr_signature';
        const canDownload = !!l.file_url || l.status !== 'draft';
        return (
          <div key={l.id} className="rounded-2xl border border-[#f1f5f9] bg-white p-4 shadow-[0px_1px_1px_rgba(0,0,0,0.04)] transition hover:shadow-md">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-indigo-600 shrink-0" />
                  <p className="text-sm font-bold text-gray-900 truncate">{l.name}</p>
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: meta.bg, color: meta.fg }}>
                    {meta.label}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-gray-500">
                  {LETTER_TYPE_LABEL[l.letter_type] ?? l.letter_type}
                  {' · '}Generated by <span className="font-medium text-gray-700">{l.generated_by}</span>
                  {' · '}{fmtDate(l.generated_at)}
                </p>
              </div>
              <div className="flex flex-none items-center gap-2">
                {canSign && (
                  <button onClick={() => handleSign(l)} disabled={signing === l.id}
                    className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:opacity-90 disabled:opacity-50">
                    <PenLine size={12} />
                    {signing === l.id ? 'Signing…' : 'Sign'}
                  </button>
                )}
                <button onClick={() => handleDownload(l)} disabled={downloading === l.id || !canDownload}
                  title={canDownload ? 'Download as PDF' : 'Not available for draft letters'}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                  <Download size={12} />
                  {downloading === l.id ? 'Downloading…' : 'Download'}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

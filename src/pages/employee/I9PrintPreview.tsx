import { useEffect, useRef, useState } from 'react';
import {
  PDFDocument,
   PDFField,
  PDFTextField,
  PDFCheckBox,
  PDFDropdown,
  StandardFonts,
} from 'pdf-lib';
import type { I9FormRecord } from '../../types/employee/i9.types';
import { US_STATES } from '../../types/employee/i9.types';

type Props = {
  record: I9FormRecord;
  onBack: () => void;
  onExit: () => void;
};

const PDF_PATH = `${import.meta.env.BASE_URL}i9.pdf`;

export default function I9PrintPreview({
  record,
  onBack,
  onExit,
}: Props) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const blobRef = useRef<Blob | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const generatePdf = async () => {
      setLoading(true);
      setError(null);

      try {
        const blob = await createI9Pdf(record);

        if (cancelled) return;

        const url = URL.createObjectURL(blob);

        if (urlRef.current) {
          URL.revokeObjectURL(urlRef.current);
        }

        blobRef.current = blob;
        urlRef.current = url;
        setPdfUrl(url);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to generate Form I-9 PDF.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    generatePdf();

    return () => {
      cancelled = true;

      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }

      blobRef.current = null;
    };
  }, [record]);

  const handleDownload = () => {
    const blob = blobRef.current;

    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = createFileName(record);

    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    window.setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-slate-200">
      <div className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg px-3 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50"
          >
            ← Back to editor
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onExit}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Done
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={!blobRef.current || loading}
              className="rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-sm font-bold text-white shadow-md hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              📥 Download as PDF
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-4 py-4">
        <div className="overflow-hidden rounded-xl bg-white shadow-xl">
          {loading && (
            <div className="flex min-h-[850px] items-center justify-center">
              <div className="text-center">
                <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600" />
                <p className="text-sm font-semibold text-gray-700">
                  Preparing Form I-9…
                </p>
              </div>
            </div>
          )}

          {error && !loading && (
            <div className="flex min-h-[850px] items-center justify-center p-8">
              <div className="max-w-lg rounded-xl border border-red-200 bg-red-50 p-6 text-center">
                <p className="font-semibold text-red-800">
                  Unable to generate Form I-9
                </p>

                <p className="mt-2 text-sm text-red-700">
                  {error}
                </p>
              </div>
            </div>
          )}

          {pdfUrl && !loading && !error && (
            <iframe
              title="Form I-9 Preview"
              src={pdfUrl}
              className="block h-[calc(100vh-65px)] min-h-[850px] w-full border-0"
            />
          )}
        </div>
      </div>
    </div>
  );
}

async function createI9Pdf(
  record: I9FormRecord
): Promise<Blob> {
  const response = await fetch(PDF_PATH);

  if (!response.ok) {
    throw new Error(
      `Original I-9 PDF was not found at ${PDF_PATH}`
    );
  }

  const template = await response.arrayBuffer();

  const pdf = await PDFDocument.load(template, {
    ignoreEncryption: true,
    updateMetadata: false,
  });

  if (pdf.getPages().length < 4) {
    throw new Error(
      `The I-9 template must contain at least 4 pages. Found ${pdf.getPages().length} pages.`
    );
  }

  const form = pdf.getForm();
  const fields = form.getFields();

  if (fields.length === 0) {
    throw new Error(
      'The PDF does not contain editable PDF fields. Please use the original fillable USCIS I-9 PDF.'
    );
  }

  const font = await pdf.embedFont(StandardFonts.Helvetica);

  const d = record.data;

  const stateCode =
    US_STATES.find((item) => item.code === d.state)?.code ??
    d.state ??
    '';

  const values = {
    lastName: d.last_name ?? '',
    firstName: d.first_name ?? '',
    middleInitial: d.middle_initial ?? '',
    otherLastNames: d.other_last_names ?? '',
    address: d.address ?? '',
    aptNumber: d.apt_number ?? '',
    city: d.city ?? '',
    state: stateCode,
    zipCode: d.zip_code ?? '',
    dateOfBirth: formatDate(d.date_of_birth),
    ssn: d.ssn ?? '',
    email: d.email ?? '',
    phone: d.phone ?? '',
    citizenshipStatus: d.citizenship_status ?? '',
    lprANumber: d.lpr_uscis_a_number ?? '',
    workAuthorizedUntil: formatDate(d.work_authorized_until),
    authANumber: d.auth_uscis_a_number ?? '',
    authI94Number: d.auth_i94_number ?? '',
    passportNumber: d.auth_passport_number ?? '',
    passportCountry: d.auth_passport_country ?? '',
    signature: d.signature_typed_name ?? '',
    signatureDate: formatDate(d.signature_date),
  };

  setTextField(
    fields,
    'Last Name (Family Name)',
    values.lastName,
    font
  );

  setTextField(
    fields,
    'First Name Given Name',
    values.firstName,
    font
  );

  setTextField(
    fields,
    'Employee Middle Initial (if any)',
    values.middleInitial,
    font
  );

  setTextField(
    fields,
    'Employee Other Last Names Used (if any)',
    values.otherLastNames,
    font
  );

  setTextField(
    fields,
    'Address Street Number and Name',
    values.address,
    font
  );

  setTextField(
    fields,
    'Apt Number (if any)',
    values.aptNumber,
    font
  );

  setTextField(
    fields,
    'City or Town',
    values.city,
    font
  );

  setDropdownField(
    fields,
    'State',
    values.state
  );

  setTextField(
    fields,
    'ZIP Code',
    values.zipCode,
    font
  );

  setTextField(
    fields,
    'Date of Birth mmddyyyy',
    values.dateOfBirth,
    font
  );

  setTextField(
    fields,
    'US Social Security Number',
    values.ssn,
    font
  );

  setTextField(
    fields,
    'Employees E-mail Address',
    values.email,
    font
  );

  setTextField(
    fields,
    'Telephone Number',
    values.phone,
    font
  );

  setCitizenshipStatus(
  fields,
  values.citizenshipStatus
  );

  if (values.citizenshipStatus === '3') {
    setTextField(
      fields,
      '3 A lawful permanent resident Enter USCIS or ANumber',
      values.lprANumber,
      font
    );
  }

  if (values.citizenshipStatus === '4') {
    setTextField(
      fields,
      'Exp Date mmddyyyy',
      values.workAuthorizedUntil,
      font
    );

    if (d.auth_key === 'uscis_a_number') {
      setTextField(
        fields,
        'USCIS ANumber',
        values.authANumber,
        font
      );
    }

    if (d.auth_key === 'i94_admission_number') {
      setTextField(
        fields,
        'Form I94 Admission Number',
        values.authI94Number,
        font
      );
    }

    if (d.auth_key === 'foreign_passport') {
      setTextField(
        fields,
        'Foreign Passport Number and Country of IssuanceRow1',
        [values.passportNumber, values.passportCountry]
          .filter(Boolean)
          .join(' '),
        font
      );
    }
  }

  setTextField(
    fields,
    'Signature of Employee',
    values.signature,
    font
  );

  setTextField(
    fields,
    'Todays Date 0',
    values.signatureDate,
    font
  );

  clearSupplementAFields(fields, font);

  clearSupplementBFields(fields, font);

  form.updateFieldAppearances(font);

  const output = await pdf.save({
    useObjectStreams: false,
    addDefaultPage: false,
  });

  const pdfBytes = new Uint8Array(output);

  return new Blob([pdfBytes], {
    type: 'application/pdf',
  });
}

function setTextField(
  fields: PDFField[],
  name: string,
  value: string,
  font: Awaited<ReturnType<PDFDocument['embedFont']>>
) {
  const field = fields.find(
    (item: PDFField) =>
      item instanceof PDFTextField &&
      item.getName() === name
  );

  if (!(field instanceof PDFTextField)) return;

  try {
    field.setText(value);
    field.updateAppearances(font);
  } catch {
    try {
      field.setText(value.slice(0, 200));
      field.updateAppearances(font);
    } catch {
      return;
    }
  }
}

function setDropdownField(
  fields: PDFField[],
  name: string,
  value: string
) {
  if (!value) return;

  const field = fields.find(
    (item: PDFField) =>
      item instanceof PDFDropdown &&
      item.getName() === name
  );

  if (!(field instanceof PDFDropdown)) return;

  try {
    const options = field.getOptions();

    const exact = options.find(
      (option: string) =>
        option === value ||
        option.startsWith(value)
    );

    if (exact) {
      field.select(exact);
    }
  } catch {
    return;
  }
}

function setCitizenshipStatus(
  fields: PDFField[],
  status: string
) {
  const checkboxNames = ['CB_1', 'CB_2', 'CB_3', 'CB_4'];

  checkboxNames.forEach(
    (name: string, index: number) => {
      const field = fields.find(
        (item: PDFField) =>
          item instanceof PDFCheckBox &&
          item.getName() === name
      );

      if (!(field instanceof PDFCheckBox)) return;

      try {
        field.uncheck();

        if (status === String(index + 1)) {
          field.check();
          field.updateAppearances();
        }
      } catch {
        return;
      }
    }
  );
}

function clearSupplementAFields(
  fields: PDFField[],
  font: Awaited<ReturnType<PDFDocument['embedFont']>>
) {
  const names = [
    'Last Name Family Name from Section 1',
    'First Name Given Name from Section 1',
    'Middle initial if any from Section 1',
    'Middle initial if any from Section 1-2',
    'Signature of Preparer or Translator 0',
    'Signature of Preparer or Translator 1',
    'Signature of Preparer or Translator 2',
    'Signature of Preparer or Translator 3',
    'Preparer or Translator Last Name (Family Name) 0',
    'Preparer or Translator Last Name (Family Name) 1',
    'Preparer or Translator Last Name (Family Name) 2',
    'Preparer or Translator Last Name (Family Name) 3',
    'Preparer or Translator First Name (Given Name) 0',
    'Preparer or Translator First Name (Given Name) 1',
    'Preparer or Translator First Name (Given Name) 2',
    'Preparer or Translator First Name (Given Name) 3',
    'Preparer or Translator Address (Street Number and Name) 0',
    'Preparer or Translator Address (Street Number and Name) 1',
    'Preparer or Translator Address (Street Number and Name) 2',
    'Preparer or Translator Address (Street Number and Name) 3',
    'Preparer or Translator City or Town 0',
    'Preparer or Translator City or Town 1',
    'Preparer or Translator City or Town 2',
    'Preparer or Translator City or Town 3',
    'Zip Code 0',
    'Zip Code 1',
    'Zip Code 2',
    'Zip Code 3',
  ];

  names.forEach((name: string) => {
    setTextField(fields, name, '', font);
  });
}
function clearSupplementBFields(
  fields: PDFField[],
  font: Awaited<ReturnType<PDFDocument['embedFont']>>
) {
  const names = [
    'Last Name 0',
    'Last Name 1',
    'Last Name 2',
    'First Name 0',
    'First Name 1',
    'First Name 2',
    'Middle Initial 0',
    'Middle Initial 1',
    'Middle Initial 2',
    'PT Middle Initial 0',
    'PT Middle Initial 1',
    'PT Middle Initial 2',
    'PT Middle Initial 3',
  ];

  names.forEach((name: string) => {
    setTextField(fields, name, '', font);
  });
}
function formatDate(
  value: string | undefined | null
): string {
  if (!value) return '';

  const trimmed = value.trim();

  if (!trimmed) return '';

  const iso = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2})$/
  );

  if (iso) {
    return `${iso[2]}/${iso[3]}/${iso[1]}`;
  }

  const date = new Date(trimmed);

  if (Number.isNaN(date.getTime())) {
    return trimmed;
  }

  return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(
    date.getDate()
  ).padStart(2, '0')}/${date.getFullYear()}`;
}

function createFileName(
  record: I9FormRecord
): string {
  const first = cleanFileName(record.data.first_name);
  const last = cleanFileName(record.data.last_name);

  const name =
    [first, last]
      .filter(Boolean)
      .join('_') || 'Employee';

  return `I-9_${name}.pdf`;
}

function cleanFileName(
  value: string | undefined
): string {
  return String(value ?? '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}
import type { ReactNode } from 'react';
import {
  EMPTY_I983,
  type I983FormRecord,
} from '../../types/employee/i983.types';

export default function I983PrintPreview({
  record,
  onBack,
  onExit,
}: {
  record: I983FormRecord;
  onBack: () => void;
  onExit: () => void;
}) {
  /*
   * IMPORTANT:
   * Keep this because Preview must always use the latest form data.
   */
  const d = {
    ...EMPTY_I983,
    ...(record.data ?? {}),
  };

  const studentName = [d.student_surname, d.student_given_name]
    .filter(Boolean)
    .join(', ');

  const handleDownload = () => {
    window.print();
  };

  return (
    <>
      <style>{`
        /* =========================================================
           GLOBAL
        ========================================================= */

        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          padding: 0;
        }

        @page {
          size: Letter portrait;
          margin: 0;
        }

        .i983-preview-root {
          min-height: 100vh;
          background: #e5e7eb;
          padding: 24px 0 40px;
        }

        .i983-controls {
          width: 8.5in;
          margin: 0 auto 18px;
          padding: 0 2px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .i983-pages {
          width: 100%;
        }

        /* =========================================================
           PAGE
        ========================================================= */

        .i983-page {
          width: 8.5in;
          height: 11in;
          min-height: 11in;
          max-height: 11in;

          margin: 0 auto 24px;
          padding: 0.24in 0.27in;

          background: #fff;
          color: #000;

          font-family:
            Arial,
            Helvetica,
            sans-serif;

          font-size: 8pt;
          line-height: 1.15;

          box-shadow:
            0 2px 14px rgba(0, 0, 0, 0.14);

          overflow: hidden;

          position: relative;

          break-after: page;
          page-break-after: always;

          break-inside: avoid;
          page-break-inside: avoid;
        }

        .i983-page:last-child {
          break-after: auto;
          page-break-after: auto;
        }

        /* =========================================================
           FORM STYLING
        ========================================================= */

        .i983-section-title {
          width: 100%;

          min-height: 23px;

          padding: 4px 5px;

          border: 1.5px solid #000;

          background: #d0d0d0;

          text-align: center;

          font-size: 8.2pt;
          line-height: 1.1;

          font-weight: 700;
        }

        .i983-cell {
          border: 1.5px solid #000;

          background: #eef3fb;

          padding: 5px 7px;

          overflow: hidden;
        }

        .i983-cell.no-top {
          border-top: 0;
        }

        .i983-cell.no-left {
          border-left: 0;
        }

        .i983-cell.no-right {
          border-right: 0;
        }

        .i983-cell.no-bottom {
          border-bottom: 0;
        }

        .i983-label {
          font-size: 7.1pt;
          line-height: 1.12;
        }

        .i983-value {
          min-height: 14px;

          margin-top: 4px;

          font-size: 8.2pt;
          line-height: 1.15;

          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .i983-line {
          display: inline-block;

          min-height: 13px;

          border-bottom: 1.2px solid #000;

          line-height: 12px;

          vertical-align: bottom;
        }

        .i983-text {
          font-size: 7.25pt;
          line-height: 1.17;
        }

        .i983-small {
          font-size: 6.9pt;
          line-height: 1.16;
        }

        .i983-list {
          margin: 5px 0 0;
          padding-left: 25px;
        }

        .i983-list li {
          margin-bottom: 4px;
          padding-left: 2px;
        }

        .i983-footer {
          width: 100%;

          display: flex;
          justify-content: space-between;
          align-items: flex-end;

          margin-top: 8px;

          font-size: 7.7pt;
          line-height: 1;
        }

        .i983-textarea {
          border: 1.5px solid #000;
          border-top: 0;

          background: #fff;

          padding: 6px 7px;

          overflow: hidden;
        }

        .i983-empty-field {
          background: #eef3fb;
        }

        /* =========================================================
           PRINT
        ========================================================= */

        @media print {
          html,
          body {
            width: 100% !important;
            min-width: 0 !important;

            margin: 0 !important;
            padding: 0 !important;

            background: #fff !important;
          }

          /*
           * Hide the complete application shell while printing.
           * Only .i983-print-root remains visible.
           */
          body * {
            visibility: hidden !important;
          }

          .i983-print-root,
          .i983-print-root * {
            visibility: visible !important;
          }

          .i983-print-root {
            position: absolute !important;

            left: 0 !important;
            top: 0 !important;

            width: 8.5in !important;

            min-height: 0 !important;

            margin: 0 !important;
            padding: 0 !important;

            background: #fff !important;
          }

          .i983-controls {
            display: none !important;
          }

          .i983-pages {
            width: 8.5in !important;

            margin: 0 !important;
            padding: 0 !important;

            display: block !important;
          }

          .i983-page {
            width: 8.5in !important;
            height: 11in !important;
            min-height: 11in !important;
            max-height: 11in !important;

            margin: 0 !important;

            padding: 0.24in 0.27in !important;

            box-shadow: none !important;

            overflow: hidden !important;

            display: block !important;

            break-before: auto !important;
            page-break-before: auto !important;

            break-after: page !important;
            page-break-after: always !important;

            break-inside: avoid !important;
            page-break-inside: avoid !important;

            position: relative !important;

            background: #fff !important;

            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .i983-page:not(:first-child) {
            break-before: page !important;
            page-break-before: always !important;
          }

          .i983-page:last-child {
            break-after: auto !important;
            page-break-after: auto !important;
          }
        }
      `}</style>

      {/* ============================================================
          PRINT ROOT
      ============================================================ */}
      <div className="i983-print-root">
        {/* ==========================================================
            CONTROLS
        ========================================================== */}
        <div className="i983-controls">
          <button
            onClick={onBack}
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-800"
          >
            ← Back to editor
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onExit}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700"
            >
              Done
            </button>

            <button
              onClick={handleDownload}
              className="rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-sm font-bold text-white shadow-md"
            >
              📥 Download as PDF
            </button>
          </div>
        </div>

        {/* ==========================================================
            ALL FIVE PAGES
        ========================================================== */}
        <div className="i983-pages">

          {/* ========================================================
              PAGE 1
          ======================================================== */}
          <I983Page>
            <PageOneHeader />

            {/* SECTION 1 */}
            <SectionTitle>
              SECTION 1: STUDENT INFORMATION{' '}
              <span style={{ fontWeight: 400 }}>
                (Completed by Student)
              </span>
            </SectionTitle>

            {/* Student name + email */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '54% 46%',
              }}
            >
              <FormCell
                label="Student Name (Surname/Primary Name, Given Name):"
                value={studentName}
                height={56}
                noRight
              />

              <FormCell
                label="Student Email Address:"
                value={d.student_email}
                height={56}
                noLeft
              />
            </div>

            {/* School information */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '26% 30% 44%',
              }}
            >
              <FormCell
                label="Name of School Recommending STEM OPT:"
                value={d.school_recommending}
                height={67}
                noTop
                noRight
              />

              <FormCell
                label="Name of School Where STEM Degree Was Earned:"
                value={d.school_stem_degree}
                height={67}
                noTop
                noLeft
                noRight
              />

              <FormCell
                label="SEVIS School Code of School Recommending STEM OPT (including 3-digit suffix):"
                value={d.sevis_school_code}
                height={67}
                noTop
                noLeft
              />
            </div>

            {/* DSO / SEVIS */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  '17% 17% 18% 15% 33%',
              }}
            >
              <FormCell
                label="Designated School Official (DSO) Name:"
                value={d.dso_name}
                height={74}
                noTop
                noRight
              />

              <FormCell
                label="Designated School Official (DSO) Email:"
                value={d.dso_email}
                height={74}
                noTop
                noLeft
                noRight
              />

              <FormCell
                label="Designated School Official (DSO) Phone Number:"
                value={d.dso_phone}
                height={74}
                noTop
                noLeft
                noRight
              />

              <FormCell
                label="Student SEVIS ID No.:"
                value={d.student_sevis_id}
                height={74}
                noTop
                noLeft
                noRight
              />

              <StemPeriodCell
                from={fmtDate(d.stem_opt_from)}
                to={fmtDate(d.stem_opt_to)}
              />
            </div>

            {/* Qualification */}
            <QualificationBlock
              major={d.qualifying_major}
              cipCode={d.cip_code}
              degreeLevel={d.degree_level_type}
              degreeDate={d.degree_date_awarded}
              basedOnPrior={d.based_on_prior_degree}
            />

            {/* EAD */}
            <EmploymentAuthorization
              value={d.employment_authorization_number}
            />

            {/* SECTION 2 */}
            <SectionTitle>
              SECTION 2: STUDENT CERTIFICATION
            </SectionTitle>

            {/* Declaration */}
            <div
              style={{
                border: '1.5px solid #000',
                borderTop: 0,
                background: '#dcdcdc',
                padding: '7px 8px',
                minHeight: 68,
              }}
              className="i983-text"
            >
              <p style={{ margin: 0 }}>
                <b>
                  I declare and affirm under penalty of perjury
                </b>{' '}
                that the statements and information made herein are true
                and correct to the best of my knowledge, information and
                belief. I understand that the law provides severe
                penalties for knowingly and willfully falsifying or
                concealing a material fact, or using any false document
                in the submission of this form.
              </p>
            </div>

            {/* Certification text */}
            <div
              style={{
                border: '1.5px solid #000',
                borderTop: 0,
                padding: '7px 8px 5px',
                minHeight: 184,
              }}
              className="i983-text"
            >
              <div style={{ marginBottom: 5 }}>
                I certify that:
              </div>

              <ol className="i983-list">
                <li>
                  I have reviewed, understand, and will adhere to this
                  Training Plan for STEM OPT Students (“Plan”);
                </li>

                <li>
                  I will notify the DSO at the earliest available
                  opportunity if I believe that my employer is not
                  providing me with appropriate training as delineated
                  on this Plan;
                </li>

                <li>
                  I understand that the Department of Homeland Security
                  (DHS) may deny, revoke, or terminate the STEM OPT of
                  students whom DHS determines are not engaging in OPT
                  in compliance with the law, including the STEM OPT of
                  students who are not, or whose employers are not,
                  complying with this Plan;
                </li>

                <li>
                  My practical training opportunity is directly related
                  to the STEM degree that qualifies me for the STEM OPT
                  extension; and
                </li>

                <li>
                  I will notify the DSO at the earliest available
                  opportunity regarding any material changes to or
                  deviations from this Plan, including but not limited
                  to, any change of Employer Identification Number
                  resulting from a corporate restructuring, any
                  nontrivial reduction in compensation from the amount
                  previously submitted on the Plan that is not tied to a
                  reduction in hours worked, any significant decrease
                  in hours per week that I engage in a STEM training
                  opportunity, and any decrease in hours below the
                  20-hours-per-week minimum required under this rule.
                </li>
              </ol>
            </div>

            {/* Signature */}
            <div
              style={{
                border: '1.5px solid #000',
                borderTop: 0,
                padding: '8px',
                height: 45,
              }}
              className="i983-text"
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                }}
              >
                <span>
                  Signature of Student:
                </span>

                <span
                  className="i983-line"
                  style={{
                    flex: 1,
                    marginLeft: 80,
                  }}
                >
                  {d.student_signature_typed_name || ''}
                </span>
              </div>
            </div>

            {/* Printed name + date */}
            <div
              style={{
                border: '1.5px solid #000',
                borderTop: 0,
                padding: '8px',
                height: 42,
              }}
              className="i983-text"
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                }}
              >
                <span>
                  Printed Name of Student:
                </span>

                <span
                  className="i983-line"
                  style={{
                    width: 300,
                    marginLeft: 5,
                    background: '#eef3fb',
                  }}
                >
                  {studentName}
                </span>

                <span style={{ marginLeft: 12 }}>
                  Date (mm-dd-yyyy):
                </span>

                <span
                  className="i983-line"
                  style={{
                    width: 95,
                    marginLeft: 5,
                    background: '#eef3fb',
                  }}
                >
                  {fmtDate(
                    d.student_signature_date ||
                      record.submitted_at?.slice(0, 10) ||
                      ''
                  )}
                </span>
              </div>
            </div>

            <PageFooter number="1" />
          </I983Page>

          {/* ========================================================
              PAGE 2
          ======================================================== */}
          <I983Page>
            <SectionTitle>
              SECTION 3: EMPLOYER INFORMATION{' '}
              <span style={{ fontWeight: 400 }}>
                (Completed by Employer)
              </span>
            </SectionTitle>

            {/* Employer / Street / Suite */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '50% 34% 16%',
              }}
            >
              <EmptyCell
                label="Employer Name:"
                height={49}
                noRight
              />

              <EmptyCell
                label="Street Address:"
                height={49}
                noLeft
                noRight
              />

              <EmptyCell
                label="Suite:"
                height={49}
                noLeft
              />
            </div>

            {/* Website / City / State / ZIP */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  '55% 25% 10% 10%',
              }}
            >
              <EmptyCell
                label="Employer Website URL:"
                height={49}
                noTop
                noRight
              />

              <EmptyCell
                label="City:"
                height={49}
                noTop
                noLeft
                noRight
              />

              <EmptyCell
                label="State:"
                height={49}
                noTop
                noLeft
                noRight
              />

              <EmptyCell
                label="ZIP Code:"
                height={49}
                noTop
                noLeft
              />
            </div>

            {/* EIN / Employees / NAICS */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  '31% 24% 45%',
              }}
            >
              <EmptyCell
                label="Employer ID Number (EIN):"
                height={62}
                noTop
                noRight
              />

              <EmptyCell
                label="Number of Full-Time Employees in U.S.:"
                height={62}
                noTop
                noLeft
                noRight
              />

              <EmptyCell
                label="North American Industry Classification System (NAICS) Code:"
                height={62}
                noTop
                noLeft
              />
            </div>

            {/* Hours / Compensation */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '32% 68%',
              }}
            >
              <EmptyCell
                label="OPT Hours Per Week (must be at least 20 hours/week):"
                height={72}
                noTop
                noRight
              />

              <CompensationCell />
            </div>

            {/* Start date / Other compensation */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '32% 68%',
              }}
            >
              <EmptyCell
                label="Start Date of Employment (mm-dd-yyyy):"
                height={126}
                noTop
                noRight
              />

              <OtherCompensationCell />
            </div>

            {/* SECTION 4 */}
            <SectionTitle>
              SECTION 4: EMPLOYER CERTIFICATION
            </SectionTitle>

            <div
              style={{
                border: '1.5px solid #000',
                borderTop: 0,
                background: '#dcdcdc',
                padding: '7px 8px',
                minHeight: 68,
              }}
              className="i983-text"
            >
              <p style={{ margin: 0 }}>
                <b>
                  I declare and affirm under penalty of perjury
                </b>{' '}
                that the statements and information made herein are true
                and correct to the best of my knowledge, information and
                belief. I understand that the law provides severe
                penalties for knowingly and willfully falsifying or
                concealing a material fact, or using any false document
                in the submission of this form.
              </p>
            </div>

            <div
              style={{
                border: '1.5px solid #000',
                borderTop: 0,
                padding: '7px 8px 5px',
                height: 430,
              }}
              className="i983-text"
            >
              <div style={{ marginBottom: 5 }}>
                <b>
                  I certify on behalf of the employer that this
                  Training Plan for STEM OPT Students (“Plan”) is
                  approved and that:
                </b>
              </div>

              <ol className="i983-list">
                <li>
                  I have reviewed and understand this Plan, and I will
                  ensure that the supervising Official follows this
                  Plan;
                </li>

                <li>
                  I will notify the DSO at the earliest available
                  opportunity regarding any material changes to this
                  Plan, including but not limited to, any change of
                  Employer Identification Number resulting from a
                  corporate restructuring, any reduction in compensation
                  from the amount previously submitted on the Plan that
                  is not tied to a reduction in hours worked, any
                  significant decrease in hours per week that a student
                  engages in a STEM training opportunity, and any
                  decrease in hours below the 20-hours-per-week minimum
                  required under this rule;
                </li>

                <li>
                  Within five business days of the termination or
                  departure of the student during the authorized period
                  of OPT, I will report such termination or departure
                  to the DSO (Note: business days do not include
                  federal holidays or weekend days; and an employer
                  shall consider a student to have departed when the
                  employer knows the student has left the practical
                  training opportunity, or when the student has not
                  reported for practical training for a period of five
                  consecutive business days without the consent of the
                  employer); and
                </li>

                <li>
                  I will adhere to all applicable regulatory provisions
                  that govern this program (see 8 CFR Part 214), which
                  include, but are not limited to, the following:

                  <ol
                    type="a"
                    style={{
                      marginTop: 5,
                      paddingLeft: 22,
                    }}
                  >
                    <li>
                      The student’s practical training opportunity is
                      directly related to the STEM degree that qualifies
                      the student for the STEM OPT extension, and the
                      position offered to the student achieves the
                      objectives of his or her participation in this
                      training program;
                    </li>

                    <li>
                      The student will receive on-site supervision and
                      training, consistent with this Plan, by experienced
                      and knowledgeable staff;
                    </li>

                    <li>
                      The employer has sufficient resources and
                      personnel to provide the specified training
                      program set forth in this Plan, and the employer
                      is prepared to implement that program, including
                      at the location(s) identified in this Plan;
                    </li>

                    <li>
                      The student on a STEM OPT extension will not
                      replace a full- or part-time, temporary or
                      permanent U.S. worker. The terms and conditions of
                      the STEM practical training opportunity—including
                      duties, hours, and compensation—are commensurate
                      with the terms and conditions applicable to the
                      employer’s similarly situated U.S. workers or,
                      if the employer does not employ and has not
                      recently employed more than two similarly situated
                      U.S. workers in the area of employment, the terms
                      and conditions of other similarly situated U.S.
                      workers in the area of employment; and
                    </li>

                    <li>
                      The training conducted pursuant to this Plan
                      complies with all applicable Federal and State
                      requirements relating to employment.
                    </li>
                  </ol>
                </li>
              </ol>

              <p style={{ marginTop: 7 }}>
                <b>Note:</b> DHS may, at its discretion, conduct a
                site visit of the employer to ensure that program
                requirements are being met, including that the employer
                possesses and maintains the ability and resources to
                provide structured and guided work-based learning
                experiences consistent with this Plan.
              </p>
            </div>

            {/* Signatures */}
            <div
              style={{
                border: '1.5px solid #000',
                borderTop: 0,
                padding: '8px',
                height: 90,
              }}
              className="i983-text"
            >
              <SignatureLine
                label="Signature of Employer Official with Signatory Authority:"
              />

              <div style={{ marginTop: 15 }}>
                <SignatureLine
                  label="Printed Name and Title of Employer Official with Signatory Authority:"
                />
              </div>

              <div
                style={{
                  marginTop: 15,
                  display: 'flex',
                }}
              >
                <span>
                  Date (mm-dd-yyyy):
                </span>

                <span
                  className="i983-line"
                  style={{
                    width: 95,
                    marginLeft: 5,
                  }}
                />

                <span style={{ marginLeft: 35 }}>
                  Printed Name of Employing Organization:
                </span>

                <span
                  className="i983-line"
                  style={{
                    flex: 1,
                    marginLeft: 5,
                  }}
                />
              </div>
            </div>

            <PageFooter number="2" />
          </I983Page>

          {/* ========================================================
              PAGE 3
          ======================================================== */}
          <I983Page>
            <SectionTitle>
              SECTION 5: TRAINING PLAN FOR STEM OPT STUDENTS{' '}
              <span style={{ fontWeight: 400 }}>
                (Completed by Student and Employer)
              </span>
            </SectionTitle>

            <SimpleFullWidthField
              label={
                <>
                  Student Name{' '}
                  <i>
                    (Surname/Primary Name, Given Name):
                  </i>
                </>
              }
              value={studentName}
              height={45}
            />

            <SimpleFullWidthField
              label="Employer Name:"
              value=""
              height={45}
              noTop
            />

            <SectionTitle>
              EMPLOYER SITE INFORMATION
            </SectionTitle>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '50% 50%',
              }}
            >
              <EmptyCell
                label="Site Name:"
                height={62}
                noTop
                noRight
              />

              <EmptyCell
                label="Site Address (Street, City, State, ZIP):"
                height={62}
                noTop
                noLeft
              />
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '50% 50%',
              }}
            >
              <EmptyCell
                label="Name of Official:"
                height={44}
                noTop
                noRight
              />

              <EmptyCell
                label="Official's Title:"
                height={44}
                noTop
                noLeft
              />
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '50% 50%',
              }}
            >
              <EmptyCell
                label="Official's Email:"
                height={44}
                noTop
                noRight
              />

              <EmptyCell
                label="Official's Phone Number:"
                height={44}
                noTop
                noLeft
              />
            </div>

            <div
              style={{
                border: '1.5px solid #000',
                borderTop: 0,
                padding: '6px 8px',
                height: 42,
                fontSize: '7pt',
                fontWeight: 700,
                fontStyle: 'italic',
                lineHeight: 1.15,
              }}
            >
              Note: for the remaining fields in this section, employers
              who already have an internal/pre-existing training plan in
              place may fill in the details based on that plan.
            </div>

            <TrainingTextBox
              height={128}
              label={
                <>
                  <u>Student Role:</u> Describe the student's role with
                  the employer and how that role is directly related to
                  enhancing the student's knowledge obtained through his
                  or her qualifying STEM degree.
                </>
              }
            />

            <TrainingTextBox
              height={150}
              label={
                <>
                  <u>Goals and Objectives:</u> Describe how the
                  assignment(s) with the employer will help the student
                  achieve his or her specific objectives for work-based
                  learning related to his or her STEM degree. The
                  description must both specify the student's goals
                  regarding specific knowledge, skills, or techniques as
                  well as the means by which they will be achieved.
                </>
              }
            />

            <TrainingTextBox
              height={130}
              label={
                <>
                  <u>Employer Oversight:</u> Explain how the employer
                  provides oversight and supervision of individuals
                  filling positions such as that being filled by the
                  named F-1 student. If the employer has a training
                  program or related policy in place that controls such
                  oversight and supervision, please describe.
                </>
              }
            />

            <TrainingTextBox
              height={130}
              label={
                <>
                  <u>Measures and Assessments:</u> Explain how the
                  employer measures and confirms whether individuals
                  filling positions such as that being filled by the
                  named F-1 student are acquiring new knowledge and
                  skills. If the employer has a training program or
                  related policy in place that controls such measures
                  and assessments, please describe.
                </>
              }
            />

            <PageFooter number="3" />
          </I983Page>

          {/* ========================================================
              PAGE 4
          ======================================================== */}
          <I983Page>
            <SectionTitle>
              SECTION 6: EMPLOYER OFFICIAL CERTIFICATION
            </SectionTitle>

            <div
              style={{
                border: '1.5px solid #000',
                borderTop: 0,
                background: '#dcdcdc',
                padding: '7px 8px',
                minHeight: 68,
              }}
              className="i983-text"
            >
              <p style={{ margin: 0 }}>
                <b>
                  I declare and affirm under penalty of perjury
                </b>{' '}
                that the statements and information made herein are true
                and correct to the best of my knowledge, information and
                belief. I understand that the law provides severe
                penalties for knowingly and willfully falsifying or
                concealing a material fact, or using any false document
                in the submission of this form.
              </p>
            </div>

            <div
              style={{
                border: '1.5px solid #000',
                borderTop: 0,
                padding: '7px',
                height: 240,
              }}
              className="i983-text"
            >
              <div style={{ marginBottom: 9 }}>
                <b>
                  Employer Official with Signatory Authority - I certify
                  that:
                </b>
              </div>

              <ol
                className="i983-list"
                style={{ marginTop: 0 }}
              >
                <li>
                  I have reviewed, understand, and will follow this
                  Training Plan for STEM OPT Students (Plan);
                </li>

                <li>
                  I will conduct the required periodic evaluations of
                  the student;*
                </li>

                <li>
                  I will adhere to all applicable regulatory provisions
                  that govern this program (see 8 CFR Part
                  214.2(f)(10)(ii)); and
                </li>

                <li>
                  I will notify the DSO regarding any material changes
                  to or material deviations from this Plan at the
                  earliest available opportunity, including if I believe
                  the student is not receiving appropriate training as
                  delineated in this Plan.
                </li>
              </ol>

              <div style={{ marginTop: 20 }}>
                <SignatureLine
                  label="Signature of Employer Official with Signatory Authority:"
                />
              </div>

              <div style={{ marginTop: 16 }}>
                <SignatureLine
                  label="Printed Name and Title of Employer Official with Signatory Authority:"
                />
              </div>

              <div style={{ marginTop: 16 }}>
                <SignatureLine
                  label="Date (mm-dd-yyyy):"
                  short
                />
              </div>
            </div>

            <SectionTitle>
              PRIVACY ACT STATEMENT
            </SectionTitle>

            <div
              style={{
                border: '1.5px solid #000',
                borderTop: 0,
                padding: '7px',
                height: 252,
              }}
              className="i983-small"
            >
              <p style={{ margin: 0 }}>
                <b>AUTHORITIES:</b> Section 101(a)(15)(F) of the
                Immigration and Nationality Act of 1952, as amended
                (INA), 8 U.S.C. 1101(a)(15)(F), Section 641 of the
                Illegal Immigration Reform and Immigrant Responsibility
                Act of 1996 (IIRIRA), Pub. L. 104-208, Div. C, 110 Stat.
                3009-546 (codified at 8 U.S.C. 1372), Section 502 of the
                Enhanced Border Security and Visa Entry Reform Act of
                2002, Pub. L. 107-173, 116 Stat. 543 (codified at 8
                U.S.C. 1762) and Homeland Security Presidential
                Directive No. 2 (HSPD-2), authorize U.S. Immigration
                and Customs Enforcement (ICE) to collect the information
                requested in this form.
              </p>

              <p style={{ margin: '9px 0 0' }}>
                <b>PURPOSE:</b> The information collection on this form
                is used to assist in the administration of the STEM
                Optional Practical Training (OPT) extension so that
                Designated School Officials (DSO) can properly recommend
                the Student for and review and help coordinate his or
                her STEM optional practical training opportunity.
              </p>

              <p style={{ margin: '9px 0 0' }}>
                <b>ROUTINE USES:</b> The information collected on this
                form may be shared with: the individuals who signed the
                Plan, relevant DSOs acting as liaisons with the DHS,
                Federal, State, local, or foreign government entities
                for law enforcement purposes, Members of Congress in
                response to requests on the Student’s behalf, or as
                otherwise authorized pursuant to its published Privacy
                Act system of records notice - Privacy Act of 1974: U.S.
                Immigration and Customs Enforcement, DHS/ICE-001 Student
                and Exchange Visitor Information System (SEVIS) System
                of Records.
              </p>

              <p style={{ margin: '9px 0 0' }}>
                <b>DISCLOSURE:</b> The information you provide is
                voluntary. However, failure to provide the information
                requested in this form may delay or prevent participation
                in a STEM OPT opportunity.
              </p>
            </div>

            <SectionTitle>
              PAPERWORK REDUCTION ACT
            </SectionTitle>

            <div
              style={{
                border: '1.5px solid #000',
                borderTop: 0,
                padding: '7px',
                height: 148,
              }}
              className="i983-small"
            >
              <p style={{ margin: 0 }}>
                The public reporting burden for this collection is
                estimated to average 7.5 hours per response, including
                time required for searching existing data sources,
                gathering the necessary documentation, providing the
                information and/or documents required, and reviewing the
                final collection. You do not have to supply this
                information unless this collection displays a currently
                valid Office of Management and Budget (OMB) control
                number. If you have comments on the accuracy of this
                burden estimate and/or recommendations for reducing it,
                send them to: U.S. Immigration and Customs Enforcement,
                Office of Policy, 500 12th Street SW, Washington, D.C.
                20536
              </p>

              <p style={{ margin: '11px 0 0' }}>
                *See evaluation forms that follow for student’s first
                evaluation, to occur before the one year anniversary of
                the start date of the student’s STEM OPT employment
                authorization, and final program evaluation.
              </p>
            </div>

            <PageFooter number="4" />
          </I983Page>

          {/* ========================================================
              PAGE 5
          ======================================================== */}
          <I983Page>
            <EvaluationSection
              title="EVALUATION ON STUDENT PROGRESS"
            />

            <div style={{ height: 24 }} />

            <EvaluationSection
              title="FINAL EVALUATION ON STUDENT PROGRESS"
            />

            <PageFooter number="5" />
          </I983Page>

        </div>
      </div>
    </>
  );
}


/* ================================================================
   PAGE
================================================================ */

function I983Page({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="i983-page">
      {children}
    </div>
  );
}


/* ================================================================
   PAGE 1 HEADER
================================================================ */

function PageOneHeader() {
  return (
    <div
      style={{
        position: 'relative',
        height: 76,
        fontFamily:
          'Arial, Helvetica, sans-serif',
      }}
    >
      <div
        style={{
          textAlign: 'center',
          paddingTop: 1,
        }}
      >
        <div
          style={{
            fontSize: '9.3pt',
            lineHeight: 1.08,
          }}
        >
          DEPARTMENT OF HOMELAND SECURITY
        </div>

        <div
          style={{
            fontSize: '9.3pt',
            lineHeight: 1.08,
          }}
        >
          U.S. Immigration and Customs Enforcement
        </div>

        <div
          style={{
            marginTop: 9,
            fontSize: '12pt',
            fontWeight: 700,
            lineHeight: 1.05,
          }}
        >
          TRAINING PLAN FOR STEM OPT STUDENTS
        </div>

        <div
          style={{
            marginTop: 3,
            fontSize: '8pt',
            lineHeight: 1.08,
          }}
        >
          Science, Technology, Engineering & Mathematics (STEM)
          Optional Practical Training (OPT)
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          fontSize: '6.7pt',
          lineHeight: 1.18,
          textAlign: 'right',
        }}
      >
        <div>
          OMB APPROVAL NO. 1653-0054
        </div>

        <div>
          EXPIRATION DATE: 4/30/2029
        </div>
      </div>
    </div>
  );
}


/* ================================================================
   SECTION TITLE
================================================================ */

function SectionTitle({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="i983-section-title">
      {children}
    </div>
  );
}


/* ================================================================
   GENERIC FORM CELL
================================================================ */

function FormCell({
  label,
  value,
  height = 45,
  noTop,
  noLeft,
  noRight,
  noBottom,
}: {
  label: string;
  value?: string;
  height?: number;
  noTop?: boolean;
  noLeft?: boolean;
  noRight?: boolean;
  noBottom?: boolean;
}) {
  return (
    <div
      className={[
        'i983-cell',
        noTop ? 'no-top' : '',
        noLeft ? 'no-left' : '',
        noRight ? 'no-right' : '',
        noBottom ? 'no-bottom' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        height,
      }}
    >
      <div className="i983-label">
        {label}
      </div>

      <div className="i983-value">
        {value || '\u00A0'}
      </div>
    </div>
  );
}


/* ================================================================
   EMPTY FORM CELL
================================================================ */

function EmptyCell({
  label,
  height,
  noTop,
  noLeft,
  noRight,
  noBottom,
}: {
  label: string;
  height: number;
  noTop?: boolean;
  noLeft?: boolean;
  noRight?: boolean;
  noBottom?: boolean;
}) {
  return (
    <FormCell
      label={label}
      value=""
      height={height}
      noTop={noTop}
      noLeft={noLeft}
      noRight={noRight}
      noBottom={noBottom}
    />
  );
}


/* ================================================================
   FULL WIDTH FIELD
================================================================ */

function SimpleFullWidthField({
  label,
  value,
  height,
  noTop,
}: {
  label: ReactNode;
  value: string;
  height: number;
  noTop?: boolean;
}) {
  return (
    <div
      className="i983-empty-field"
      style={{
        border: '1.5px solid #000',
        borderTop: noTop ? 0 : '1.5px solid #000',
        height,
        padding: '6px 8px',
      }}
    >
      <div className="i983-label">
        {label}
      </div>

      {value && (
        <div className="i983-value">
          {value}
        </div>
      )}
    </div>
  );
}


/* ================================================================
   STEM PERIOD
================================================================ */

function StemPeriodCell({
  from,
  to,
}: {
  from: string;
  to: string;
}) {
  return (
    <div
      className="i983-cell no-top no-left"
      style={{
        height: 74,
      }}
    >
      <div className="i983-label">
        STEM OPT Requested Period (mm-dd-yyyy):
      </div>

      <div
        style={{
          marginTop: 7,
          fontSize: '7.3pt',
        }}
      >
        From:

        <span
          className="i983-line"
          style={{
            width: 95,
            marginLeft: 7,
          }}
        >
          {from}
        </span>
      </div>

      <div
        style={{
          marginTop: 6,
          fontSize: '7.3pt',
        }}
      >
        To:

        <span
          className="i983-line"
          style={{
            width: 95,
            marginLeft: 19,
          }}
        >
          {to}
        </span>
      </div>
    </div>
  );
}


/* ================================================================
   QUALIFICATION BLOCK
================================================================ */

function QualificationBlock({
  major,
  cipCode,
  degreeLevel,
  degreeDate,
  basedOnPrior,
}: {
  major: string;
  cipCode: string;
  degreeLevel: string;
  degreeDate: string;
  basedOnPrior: string;
}) {
  return (
    <div
      style={{
        border: '1.5px solid #000',
        borderTop: 0,
        height: 136,
        padding: '9px 8px',
        fontSize: '7.3pt',
        background: '#fff',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
        }}
      >
        <span>
          Qualifying Major and Classification of Instructional Programs
          (CIP) Code:
        </span>

        <span
          className="i983-line"
          style={{
            flex: 1,
            marginLeft: 8,
          }}
        >
          {major || cipCode
            ? `${major}${cipCode ? ` — ${cipCode}` : ''}`
            : ''}
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          marginTop: 13,
        }}
      >
        <span>
          Level/Type of Qualifying Degree:
        </span>

        <span
          className="i983-line"
          style={{
            width: 360,
            marginLeft: 8,
          }}
        >
          {degreeLevel}
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          marginTop: 13,
        }}
      >
        <span>
          Date Awarded (mm-dd-yyyy):
        </span>

        <span
          className="i983-line"
          style={{
            width: 105,
            marginLeft: 8,
          }}
        >
          {fmtDate(degreeDate)}
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          marginTop: 13,
        }}
      >
        <span>
          Based on Prior Degree?
        </span>

        <span
          style={{
            width: 16,
            height: 16,
            border: '1.5px solid #000',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: 8,
            fontSize: '9pt',
          }}
        >
          {basedOnPrior === 'yes'
            ? '✓'
            : ''}
        </span>
      </div>
    </div>
  );
}


/* ================================================================
   EAD
================================================================ */

function EmploymentAuthorization({
  value,
}: {
  value: string;
}) {
  return (
    <div
      style={{
        border: '1.5px solid #000',
        borderTop: 0,
        height: 58,
        padding: '13px 8px',
        fontSize: '7.3pt',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
        }}
      >
        <span>
          Employment Authorization Number:
        </span>

        <span
          className="i983-line"
          style={{
            width: 250,
            marginLeft: 18,
          }}
        >
          {value}
        </span>
      </div>
    </div>
  );
}


/* ================================================================
   COMPENSATION
================================================================ */

function CompensationCell() {
  return (
    <div
      className="i983-empty-field"
      style={{
        border: '1.5px solid #000',
        borderTop: 0,
        height: 72,
        padding: '6px 8px',
      }}
    >
      <div className="i983-label">
        Compensation:
      </div>

      <div
        style={{
          marginTop: 5,
          display: 'flex',
          alignItems: 'flex-end',
          fontSize: '7.3pt',
        }}
      >
        <span>
          A. Annual Salary (in U.S. dollars):
        </span>

        <span
          className="i983-line"
          style={{
            flex: 1,
            marginLeft: 8,
          }}
        />
      </div>
    </div>
  );
}


/* ================================================================
   OTHER COMPENSATION
================================================================ */

function OtherCompensationCell() {
  return (
    <div
      className="i983-empty-field"
      style={{
        border: '1.5px solid #000',
        borderTop: 0,
        height: 126,
        padding: '7px 8px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          fontSize: '7.3pt',
        }}
      >
        <span>
          B. Other Compensation (Type and Estimated Amount or Value):
        </span>
      </div>

      {[1, 2, 3, 4].map((n) => (
        <div
          key={n}
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            marginTop: 9,
            fontSize: '7.3pt',
          }}
        >
          <span style={{ width: 15 }}>
            {n}.
          </span>

          <span
            className="i983-line"
            style={{
              flex: 1,
            }}
          />
        </div>
      ))}
    </div>
  );
}


/* ================================================================
   TRAINING TEXT BOX
================================================================ */

function TrainingTextBox({
  label,
  height,
}: {
  label: ReactNode;
  height: number;
}) {
  return (
    <div
      className="i983-textarea"
      style={{
        height,
        fontSize: '7.2pt',
        lineHeight: 1.15,
      }}
    >
      {label}
    </div>
  );
}


/* ================================================================
   SIGNATURE
================================================================ */

function SignatureLine({
  label,
  short = false,
}: {
  label: string;
  short?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        fontSize: '7.3pt',
      }}
    >
      <span
        style={{
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>

      <span
        className="i983-line"
        style={{
          width: short ? 100 : undefined,
          flex: short ? undefined : 1,
          marginLeft: 8,
        }}
      />
    </div>
  );
}


/* ================================================================
   EVALUATION
================================================================ */

function EvaluationSection({
  title,
}: {
  title: string;
}) {
  return (
    <div
      style={{
        border: '1.5px solid #000',
        height: 366,
        background: '#fff',
      }}
    >
      {/* Header */}
      <div
        style={{
          height: 29,
          background: '#d0d0d0',
          borderBottom: '1.5px solid #000',
          textAlign: 'center',
          fontSize: '8.2pt',
          fontWeight: 700,
          paddingTop: 7,
        }}
      >
        {title}
      </div>

      {/* Description */}
      <div
        style={{
          height: 53,
          borderBottom: '1.5px solid #000',
          padding: '6px 8px',
          fontSize: '7pt',
          lineHeight: 1.15,
        }}
      >
        Provide a self-evaluation of your performance, using the
        measures previously identified, in applying and acquiring new
        knowledge, skills, and competencies identified in the Training
        Plan for STEM OPT Students. Discuss accomplishments, successful
        projects, overall contributions, etc., during this review
        period. Address whether there are any modifications to the
        objectives and goals for projects, or new areas for skill and
        competency development.
      </div>

      {/* Date range */}
      <div
        style={{
          height: 30,
          borderBottom: '1.5px solid #000',
          padding: '7px 8px',
          fontSize: '7pt',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
          }}
        >
          <span>
            Range of Evaluation Dates:
          </span>

          <span style={{ marginLeft: 18 }}>
            From (mm-dd-yyyy):
          </span>

          <span
            className="i983-line"
            style={{
              width: 95,
              marginLeft: 6,
            }}
          />

          <span style={{ marginLeft: 20 }}>
            To (mm-dd-yyyy):
          </span>

          <span
            className="i983-line"
            style={{
              width: 95,
              marginLeft: 6,
            }}
          />
        </div>
      </div>

      {/* Evaluation area */}
      <div
        style={{
          height: 194,
          borderBottom: '1.5px solid #000',
        }}
      />

      {/* Student */}
      <EvaluationSignatureRow
        label="Signature of Student:"
        nameLabel="Printed Name of Student:"
        dateLabel="Date (mm-dd-yyyy):"
      />

      {/* Employer */}
      <EvaluationSignatureRow
        label="Signature of Employer Official with Signatory Authority:"
        nameLabel="Printed Name of Employer Official with Signatory Authority:"
        dateLabel="Date (mm-dd-yyyy):"
      />
    </div>
  );
}


/* ================================================================
   EVALUATION SIGNATURE ROW
================================================================ */

function EvaluationSignatureRow({
  label,
  nameLabel,
  dateLabel,
}: {
  label: string;
  nameLabel: string;
  dateLabel: string;
}) {
  return (
    <div
      style={{
        height: 30,
        padding: '3px 8px',
        fontSize: '7pt',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
        }}
      >
        <span>
          {label}
        </span>

        <span
          className="i983-line"
          style={{
            flex: 1,
            marginLeft: 8,
          }}
        />
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          marginTop: 8,
        }}
      >
        <span>
          {nameLabel}
        </span>

        <span
          className="i983-line"
          style={{
            flex: 1,
            marginLeft: 8,
          }}
        />

        <span style={{ marginLeft: 10 }}>
          {dateLabel}
        </span>

        <span
          className="i983-line"
          style={{
            width: 90,
            marginLeft: 5,
          }}
        />
      </div>
    </div>
  );
}


/* ================================================================
   FOOTER
================================================================ */

function PageFooter({
  number,
}: {
  number: string;
}) {
  return (
    <div className="i983-footer">
      <span>
        ICE Form I-983 (7/16)
      </span>

      <span>
        Page {number} of 5
      </span>
    </div>
  );
}


/* ================================================================
   DATE FORMAT
================================================================ */

function fmtDate(iso: string): string {
  if (!iso) {
    return '';
  }

  /*
   * yyyy-mm-dd
   */
  const parts = iso.split('-');

  if (parts.length === 3) {
    const [year, month, day] = parts;

    if (
      year.length === 4 &&
      month.length === 2 &&
      day.length === 2
    ) {
      return `${month}-${day}-${year}`;
    }
  }

  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  return `${String(
    date.getMonth() + 1
  ).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}-${date.getFullYear()}`;
}
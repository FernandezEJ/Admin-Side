import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  ArrowLeft,
  UserRound,
  Droplets,
  CalendarDays,
  MapPin,
  FileText,
  CheckCircle2,
  XCircle,
  ExternalLink,
  RotateCcw,
  CircleCheck,
  Clock3,
} from 'lucide-react';

import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';

function VerificationDetail() {
  const navigate = useNavigate();
  const { id } = useParams();

  // ============================================================
  // Modal State
  // ============================================================

  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  const [revisionReason, setRevisionReason] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  // ============================================================
  // Temporary Verification Records
  //
  // Later Laravel will replace this with:
  // GET /api/admin/verifications/{id}
  //
  // Keeping IDs and status values stable makes backend
  // integration easier later.
  // ============================================================

  const verificationRecords = {
    1: {
      id: 1,

      donor: {
        name: 'Juan Dela Cruz',
        bloodType: 'O+',
        mobileNumber: '09XX XXX XXXX',
      },

      event: {
        title: 'Community Blood Donation Drive',
        location: 'City Health Office',
        donationDate: 'September 28, 2026',
      },

      submittedDate: 'September 16, 2026',

      status: 'for_verification',

      revisionReason: null,
      rejectionReason: null,

      proof: {
        name: 'donation-certificate.pdf',
        type: 'PDF',
        size: '1.8 MB',

        // Laravel will later provide an authenticated endpoint.
        url: '#',
      },
    },

    2: {
      id: 2,

      donor: {
        name: 'Maria Santos',
        bloodType: 'A+',
        mobileNumber: '09XX XXX XXXX',
      },

      event: {
        title: 'LifeFlow University Blood Drive',
        location: 'University Gymnasium',
        donationDate: 'September 20, 2026',
      },

      submittedDate: 'September 16, 2026',

      status: 'for_verification',

      revisionReason: null,
      rejectionReason: null,

      proof: {
        name: 'blood-donation-proof.jpg',
        type: 'JPG',
        size: '2.1 MB',
        url: '#',
      },
    },

    3: {
      id: 3,

      donor: {
        name: 'Carlo Reyes',
        bloodType: 'B+',
        mobileNumber: '09XX XXX XXXX',
      },

      event: {
        title: 'Community Blood Donation Drive',
        location: 'City Health Office',
        donationDate: 'September 15, 2026',
      },

      submittedDate: 'September 15, 2026',

      status: 'needs_revision',

      revisionReason:
        'The uploaded proof is blurry. Please upload a clearer copy.',

      rejectionReason: null,

      proof: {
        name: 'donation-proof.png',
        type: 'PNG',
        size: '1.4 MB',
        url: '#',
      },
    },

    4: {
      id: 4,

      donor: {
        name: 'Angela Cruz',
        bloodType: 'AB+',
        mobileNumber: '09XX XXX XXXX',
      },

      event: {
        title: 'Barangay Donation Campaign',
        location: 'Barangay Hall',
        donationDate: 'August 22, 2026',
      },

      submittedDate: 'August 22, 2026',

      status: 'completed',

      revisionReason: null,
      rejectionReason: null,

      proof: {
        name: 'donation-certificate.pdf',
        type: 'PDF',
        size: '1.2 MB',
        url: '#',
      },
    },

    5: {
      id: 5,

      donor: {
        name: 'Mark Villanueva',
        bloodType: 'O−',
        mobileNumber: '09XX XXX XXXX',
      },

      event: {
        title: 'Barangay Donation Campaign',
        location: 'Barangay Hall',
        donationDate: 'August 21, 2026',
      },

      submittedDate: 'August 21, 2026',

      status: 'completed',

      revisionReason: null,
      rejectionReason: null,

      proof: {
        name: 'certificate.jpg',
        type: 'JPG',
        size: '1.7 MB',
        url: '#',
      },
    },

    6: {
      id: 6,

      donor: {
        name: 'Paolo Garcia',
        bloodType: 'A−',
        mobileNumber: '09XX XXX XXXX',
      },

      event: {
        title: 'Emergency Blood Donation Event',
        location: 'City Hospital',
        donationDate: 'July 12, 2026',
      },

      submittedDate: 'July 12, 2026',

      status: 'rejected',

      revisionReason: null,

      rejectionReason:
        'The submitted document could not be accepted as valid proof of donation.',

      proof: {
        name: 'submitted-proof.pdf',
        type: 'PDF',
        size: '1.5 MB',
        url: '#',
      },
    },
  };

  const verification =
    verificationRecords[id] || verificationRecords[1];

  // ============================================================
  // Status Helpers
  // ============================================================

  const getStatusBadge = (status) => {
    if (status === 'for_verification') {
      return (
        <span className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold text-[#b7192e]">
          <Clock3 size={14} />
          For Verification
        </span>
      );
    }

    if (status === 'needs_revision') {
      return (
        <span className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700">
          <RotateCcw size={14} />
          Needs Revision
        </span>
      );
    }

    if (status === 'completed') {
      return (
        <span className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">
          <CircleCheck size={14} />
          Completed
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold text-red-700">
        <XCircle size={14} />
        Rejected
      </span>
    );
  };

  // ============================================================
  // Open Proof
  //
  // Later Laravel should return an authenticated/private proof
  // endpoint instead of exposing the storage path directly.
  // ============================================================

  const handleOpenProof = () => {
    if (!verification.proof.url || verification.proof.url === '#') {
      window.alert(
        'The real proof preview will be available after the Laravel private proof endpoint is connected.'
      );

      return;
    }

    window.open(
      verification.proof.url,
      '_blank',
      'noopener,noreferrer'
    );
  };

  // ============================================================
  // Approve Verification
  //
  // Later Laravel should perform this atomically:
  // 1. Verify status is for_verification.
  // 2. Change record to completed.
  // 3. Calculate donation number.
  // 4. Award correct points.
  // 5. Add points ledger entry.
  // 6. Create donor notification.
  // ============================================================

  const handleApprove = () => {
    const confirmed = window.confirm(
      'Approve this donation verification?'
    );

    if (!confirmed) return;

    console.log('Approve verification:', verification.id);

    // Future Laravel request:
    // POST /api/admin/verifications/{id}/approve

    window.alert(
      'Frontend demo: this verification would now be approved.'
    );
  };

  // ============================================================
  // Request Revision
  //
  // Used when the proof is blurry, unclear, incomplete,
  // or needs to be uploaded again.
  //
  // Later Laravel:
  // for_verification -> needs_revision
  // ============================================================

  const handleRequestRevision = () => {
    const reason = revisionReason.trim();

    if (!reason) return;

    console.log('Request proof revision:', {
      id: verification.id,
      reason,
    });

    // Future Laravel request:
    // POST /api/admin/verifications/{id}/request-revision
    //
    // Body:
    // {
    //   reason: reason
    // }

    setShowRevisionModal(false);
    setRevisionReason('');

    window.alert(
      'Frontend demo: the donor would now be asked to upload a revised proof.'
    );
  };

  // ============================================================
  // Final Rejection
  //
  // This is different from Needs Revision.
  //
  // Rejected means the verification is permanently rejected.
  // The donor cannot simply upload another proof for this record.
  // ============================================================

  const handleRejectFinal = () => {
    const reason = rejectionReason.trim();

    if (!reason) return;

    console.log('Permanently reject verification:', {
      id: verification.id,
      reason,
    });

    // Future Laravel request:
    // POST /api/admin/verifications/{id}/reject
    //
    // Body:
    // {
    //   reason: reason
    // }

    setShowRejectModal(false);
    setRejectionReason('');

    window.alert(
      'Frontend demo: this verification would now be permanently rejected.'
    );
  };

  // ============================================================
  // Decision Permissions
  //
  // Only records currently waiting for verification should show
  // admin decision actions.
  //
  // Needs Revision waits for the donor to submit a new proof.
  // Completed and Rejected are read-only.
  // ============================================================

  const canMakeDecision =
    verification.status === 'for_verification';

  return (
    <div className="flex min-h-screen bg-[#f7f8fa]">
      <Sidebar />

      <main className="min-w-0 flex-1">
        <Header
          title="Verification Review"
          description="Review the donor's submitted proof before making a decision."
        />

        <div className="p-4 lg:p-8">
          <div className="mx-auto max-w-6xl">
            {/* ==================================================
                Back Button
                ================================================== */}
            <button
              type="button"
              onClick={() => navigate('/verification')}
              className="mb-5 flex items-center gap-2 text-sm font-semibold text-gray-500 transition hover:text-[#b7192e]"
            >
              <ArrowLeft size={17} />
              Back to Verification
            </button>

            {/* ==================================================
                Main Review Layout
                ================================================== */}
            <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
              {/* ==================================================
                  Left Column
                  ================================================== */}
              <div className="space-y-6">
                {/* Donor Information */}
                <section className="rounded-2xl border border-gray-200 bg-white p-6">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-[#b7192e]">
                      <UserRound size={20} />
                    </div>

                    <div>
                      <h2 className="font-bold text-gray-800">
                        Donor Information
                      </h2>

                      <p className="text-xs text-gray-400">
                        Registered donor details
                      </p>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                        Donor Name
                      </p>

                      <p className="mt-1 font-semibold text-gray-800">
                        {verification.donor.name}
                      </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                          Blood Type
                        </p>

                        <p className="mt-2 inline-flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-[#b7192e]">
                          <Droplets size={15} />
                          {verification.donor.bloodType}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                          Submitted
                        </p>

                        <p className="mt-2 text-sm font-semibold text-gray-700">
                          {verification.submittedDate}
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* ==================================================
                    Donation Information
                    ================================================== */}
                <section className="rounded-2xl border border-gray-200 bg-white p-6">
                  <h2 className="font-bold text-gray-800">
                    Donation Information
                  </h2>

                  <div className="mt-5 space-y-5">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                        Donation Event
                      </p>

                      <p className="mt-1 font-semibold text-gray-800">
                        {verification.event.title}
                      </p>
                    </div>

                    <div className="flex items-start gap-3 text-sm text-gray-600">
                      <MapPin
                        size={17}
                        className="mt-0.5 shrink-0 text-gray-400"
                      />

                      <span>
                        {verification.event.location}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <CalendarDays
                        size={17}
                        className="text-gray-400"
                      />

                      <span>
                        {verification.event.donationDate}
                      </span>
                    </div>
                  </div>
                </section>

                {/* ==================================================
                    Current Status
                    ================================================== */}
                <section className="rounded-2xl border border-gray-200 bg-white p-6">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    Current Status
                  </p>

                  <div className="mt-3">
                    {getStatusBadge(verification.status)}
                  </div>

                  {/* Needs Revision Reason */}
                  {verification.status === 'needs_revision' &&
                    verification.revisionReason && (
                      <div className="mt-5 rounded-xl border border-orange-100 bg-orange-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">
                          Revision Reason
                        </p>

                        <p className="mt-2 text-sm leading-6 text-orange-800">
                          {verification.revisionReason}
                        </p>

                        <p className="mt-3 text-xs leading-5 text-orange-600">
                          Waiting for the donor to upload a new
                          proof. After a successful re-upload,
                          Laravel will return this record to For
                          Verification.
                        </p>
                      </div>
                    )}

                  {/* Final Rejection Reason */}
                  {verification.status === 'rejected' &&
                    verification.rejectionReason && (
                      <div className="mt-5 rounded-xl border border-gray-200 bg-red-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
                          Final Rejection Reason
                        </p>

                        <p className="mt-2 text-sm leading-6 text-red-800">
                          {verification.rejectionReason}
                        </p>

                        <p className="mt-3 text-xs leading-5 text-red-600">
                          This verification record is closed and
                          cannot be approved without a separate
                          future reopen process.
                        </p>
                      </div>
                    )}

                  {/* Completed Information */}
                  {verification.status === 'completed' && (
                    <div className="mt-5 rounded-xl border border-green-100 bg-green-50 p-4">
                      <p className="text-sm leading-6 text-green-700">
                        This donation proof was successfully
                        verified and the donation record is
                        completed.
                      </p>
                    </div>
                  )}
                </section>
              </div>

              {/* ==================================================
                  Proof Review
                  ================================================== */}
              <section className="rounded-2xl border border-gray-200 bg-white p-6">
                <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-bold text-gray-800">
                      Submitted Proof
                    </h2>

                    <p className="mt-1 text-xs text-gray-400">
                      Review the uploaded donation certificate or
                      proof.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
                    <FileText size={15} />

                    <span>
                      {verification.proof.type}
                    </span>

                    <span className="text-gray-300">
                      •
                    </span>

                    <span>
                      {verification.proof.size}
                    </span>
                  </div>
                </div>

                {/* ==================================================
                    Temporary Proof Preview
                    ================================================== */}
                <div className="flex min-h-[470px] flex-col items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 px-6 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-[#b7192e] shadow-sm">
                    <FileText size={30} />
                  </div>

                  <p className="mt-5 font-semibold text-gray-700">
                    {verification.proof.name}
                  </p>

                  <p className="mt-2 max-w-sm text-sm leading-6 text-gray-400">
                    The actual image or PDF preview will appear here
                    after the Laravel private proof endpoint is
                    connected.
                  </p>

                  <button
                    type="button"
                    onClick={handleOpenProof}
                    className="mt-5 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:border-red-100 hover:text-[#b7192e]"
                  >
                    <ExternalLink size={16} />
                    Open Proof
                  </button>
                </div>

                {/* ==================================================
                    Verification Actions
                    Only For Verification can be acted on.
                    ================================================== */}
                {canMakeDecision && (
                  <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-6">
                    {/* Request Revision */}
                    <button
                      type="button"
                      onClick={() =>
                        setShowRevisionModal(true)
                      }
                      className="flex min-h-11 items-center gap-2 rounded-xl border border-orange-200 px-5 text-sm font-semibold text-orange-600 transition hover:bg-orange-50"
                    >
                      <RotateCcw size={17} />
                      Request Revision
                    </button>

                    {/* Final Reject */}
                    <button
                      type="button"
                      onClick={() =>
                        setShowRejectModal(true)
                      }
                      className="flex min-h-11 items-center gap-2 rounded-xl border border-red-200 px-5 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                    >
                      <XCircle size={17} />
                      Reject Permanently
                    </button>

                    {/* Approve */}
                    <button
                      type="button"
                      onClick={handleApprove}
                      className="flex min-h-11 items-center gap-2 rounded-xl bg-[#b7192e] px-5 text-sm font-semibold text-white transition hover:bg-[#9f1427]"
                    >
                      <CheckCircle2 size={17} />
                      Approve
                    </button>
                  </div>
                )}

                {/* ==================================================
                    Read-Only Message
                    ================================================== */}
                {!canMakeDecision && (
                  <div className="mt-6 border-t border-gray-100 pt-6">
                    <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-500">
                      {verification.status === 'needs_revision' &&
                        'Waiting for the donor to upload a revised proof.'}

                      {verification.status === 'completed' &&
                        'This verification has already been completed.'}

                      {verification.status === 'rejected' &&
                        'This verification has been permanently rejected.'}
                    </div>
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      </main>

      {/* ========================================================
          Request Revision Modal
          ======================================================== */}
      {showRevisionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-4 shadow-xl sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                <RotateCcw size={21} />
              </div>

              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Request Proof Revision
                </h2>

                <p className="mt-1 text-sm leading-6 text-gray-400">
                  Use this when the submitted proof can be corrected,
                  such as a blurry or unclear image.
                </p>
              </div>
            </div>

            <div className="mt-6">
              <label
                htmlFor="revisionReason"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                Revision reason
              </label>

              <textarea
                id="revisionReason"
                value={revisionReason}
                onChange={(event) =>
                  setRevisionReason(event.target.value)
                }
                maxLength={500}
                rows={5}
                placeholder="Example: The uploaded proof is blurry. Please upload a clearer copy."
                className="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              />

              <div className="mt-2 flex justify-between gap-4">
                <p className="text-xs text-gray-400">
                  The donor will see this reason and can upload a
                  new proof.
                </p>

                <span className="shrink-0 text-xs text-gray-400">
                  {revisionReason.length}/500
                </span>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowRevisionModal(false);
                  setRevisionReason('');
                }}
                className="min-h-11 rounded-xl border border-gray-300 px-5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleRequestRevision}
                disabled={!revisionReason.trim()}
                className="min-h-11 rounded-xl bg-orange-600 px-5 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Request Revision
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          Permanent Rejection Modal
          ======================================================== */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-4 shadow-xl sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                <XCircle size={21} />
              </div>

              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Permanently Reject Verification
                </h2>

                <p className="mt-1 text-sm leading-6 text-gray-400">
                  Use this only when the donation verification should
                  be permanently rejected.
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-gray-200 bg-red-50 p-4">
              <p className="text-sm leading-6 text-red-700">
                This is different from requesting a revision. The
                donor will not be able to simply upload another proof
                for this verification record.
              </p>
            </div>

            <div className="mt-6">
              <label
                htmlFor="rejectionReason"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                Final rejection reason
              </label>

              <textarea
                id="rejectionReason"
                value={rejectionReason}
                onChange={(event) =>
                  setRejectionReason(event.target.value)
                }
                maxLength={500}
                rows={5}
                placeholder="Enter the reason for permanently rejecting this verification."
                className="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-red-500 "
              />

              <div className="mt-2 flex justify-between gap-4">
                <p className="text-xs text-gray-400">
                  This reason will be visible to the donor inside
                  LifeFlow.
                </p>

                <span className="shrink-0 text-xs text-gray-400">
                  {rejectionReason.length}/500
                </span>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                }}
                className="min-h-11 rounded-xl border border-gray-300 px-5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleRejectFinal}
                disabled={!rejectionReason.trim()}
                className="min-h-11 rounded-xl bg-red-600 px-5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Reject Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VerificationDetail;
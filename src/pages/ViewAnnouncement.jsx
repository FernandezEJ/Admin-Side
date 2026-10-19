import { useAnnouncements } from '../services/useAnnouncements';
import AnnouncementBody from '../components/announcements/AnnouncementBody';
import { ErrorState, PageSkeleton } from '../components/ui/PageState';
import { ArrowLeft, MapPin, CalendarDays, Users } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import AdminDialog from '../components/ui/AdminDialog';
import { isRecoverable } from '../data/recoveryPolicy';
import '../styles/announcement-popup.css';

import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';

function ViewAnnouncement() {
  const navigate = useNavigate();
  const { id } = useParams();

  const remote = useAnnouncements(id);
  const { item: announcement, loading, error, model } = remote;
  const [showParticipants, setShowParticipants] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#f7f8fa]">
      <Sidebar />

      <main className="min-w-0 flex-1">
        <Header
          title="Announcement Details"
          description="View announcement information."
        />

        <div className="p-4 lg:p-8">
          <div className="mx-auto max-w-4xl">
            <button
              type="button"
              onClick={() => navigate('/announcements')}
              className="mb-5 flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-[#b7192e]"
            >
              <ArrowLeft size={17} />
              Back to Announcements
            </button>

            {loading ? <PageSkeleton /> : error ? <ErrorState description={error} onRetry={model.load} /> : announcement && <AnnouncementDetails announcement={announcement}
              onViewParticipants={() => { setShowParticipants(true); void model.loadParticipants(); }} />}
          </div>
        </div>
      </main>
      {showParticipants && <div className="announcement-popup"><AdminDialog title="Joined Participants" onClose={() => setShowParticipants(false)} dismissOnBackdrop>
        <div className="announcement-popup-content"><AnnouncementParticipants remote={remote} /></div>
        <div className="announcement-popup-footer"><button type="button" onClick={() => setShowParticipants(false)} className="min-h-11 rounded-xl border border-gray-300 px-4 text-sm font-semibold">Back to Announcement</button></div>
      </AdminDialog></div>}
    </div>
  );
}

export function AnnouncementPopup({ id, onClose, onChanged, onEdit }) {
  const remote = useAnnouncements(id);
  const pending = useRef(false);
  const act = async (action) => {
    const item = remote.item;
    if (pending.current || remote.busy || !item) return;
    if (action === 'delete' ? item.status === 'deleted' : action !== 'restore' || item.status !== 'deleted' || !isRecoverable(item)) return;
    const message = action === 'delete' ? 'Move this announcement to Deleted? Recovery is available for 30 days.' : 'Restore this announcement to Drafts?';
    if (!window.confirm(message)) return;
    pending.current = true;
    try {
      if (await remote.model.action(item.id, action)) {
        onChanged();
        onClose();
      }
    } finally { pending.current = false; }
  };
  return <AnnouncementPopupView remote={remote} onClose={onClose} onEdit={onEdit} onAction={act} />;
}

export function AnnouncementPopupView({ remote, onClose, onEdit, onAction }) {
  const { item, loading, busy, error, model } = remote;
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const participantsButton = useRef(null);
  const backToDetails = () => {
    setParticipantsOpen(false);
    requestAnimationFrame(() => participantsButton.current?.focus());
  };
  return <div className="announcement-popup">
    <AdminDialog title={participantsOpen ? 'Joined Participants' : 'View Announcement'} onClose={onClose} dismissOnBackdrop closeDisabled={busy}>
      <div className="announcement-popup-content">
      {participantsOpen ? <AnnouncementParticipants remote={remote} /> : loading ? <PageSkeleton /> : !item ? <ErrorState description={error || 'Announcement not found.'} onRetry={model.load} /> : <>
        {error && <p role="alert" className="mb-4 text-sm text-red-700">{error}</p>}
        <AnnouncementDetails announcement={item} compact participantButtonRef={participantsButton}
          onViewParticipants={() => { setParticipantsOpen(true); void model.loadParticipants(); }} />
      </>}
      </div>
      {participantsOpen ? <div className="announcement-popup-footer"><button type="button" onClick={backToDetails}
        className="min-h-11 rounded-xl border border-gray-300 px-4 text-sm font-semibold text-gray-600 hover:bg-gray-50">Back to Announcement</button></div> : !loading && item &&
        <div className="announcement-popup-footer">
          {item.status !== 'deleted' ? <>
            <button type="button" disabled={busy} onClick={onEdit}
              className="min-h-11 rounded-xl bg-[#b7192e] px-5 text-sm font-semibold text-white transition hover:bg-[#9f1427] disabled:opacity-50">Edit Announcement</button>
            <button type="button" disabled={busy} onClick={() => onAction('delete')}
              className="min-h-11 rounded-xl border border-red-200 px-5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50">{busy ? 'Deleting...' : 'Delete'}</button>
          </> : <button type="button" disabled={busy || !isRecoverable(item)} onClick={() => onAction('restore')}
            title={isRecoverable(item) ? 'Restore to Drafts' : 'Recovery period ended; awaiting backend purge'}
            className="min-h-11 rounded-xl border border-gray-300 px-5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-50">{busy ? 'Restoring...' : 'Restore Announcement'}</button>}
        </div>
      }
    </AdminDialog>
  </div>;
}

export function AnnouncementDetails({ announcement, compact = false, onViewParticipants, participantButtonRef }) {
  return <article className="announcement-details overflow-hidden rounded-2xl border border-gray-200 bg-white">
              {/* Image placeholder */}
              {(announcement.image_url || !compact) && <div className="announcement-image flex h-64 items-center justify-center bg-gray-100 text-sm text-gray-400">
                {announcement.image_url ? <img src={announcement.image_url} alt={announcement.title} className="h-full w-full object-contain" /> : 'No announcement image'}
              </div>}

              <div className="announcement-copy p-7">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                      {announcement.status}
                    </span>

                    <h2 className="announcement-title mt-4 text-2xl font-bold text-gray-900">
                      {announcement.title}
                    </h2>
                  </div>
                </div>

                <div className="announcement-location mt-5 flex items-center gap-2 text-sm text-gray-500">
                  <MapPin size={17} />
                  {announcement.location}
                </div>

                <div className="announcement-description mt-6"><AnnouncementBody announcement={announcement} compact={compact} /></div>
                <JoinedParticipants announcement={announcement} onView={onViewParticipants} buttonRef={participantButtonRef} />

                <div className="announcement-dates mt-8 grid gap-4 border-t border-gray-100 pt-6 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-gray-400">
                      Donation Date
                    </p>

                    <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <CalendarDays size={15} />
                      {announcement.donationDate}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400">
                      Published
                    </p>

                    <p className="mt-1 text-sm font-semibold text-gray-700">
                      {announcement.publishedDate}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400">
                      Expires
                    </p>

                    <p className="mt-1 text-sm font-semibold text-gray-700">
                      {announcement.expiresDate}
                    </p>
                  </div>
                </div>
              </div>
            </article>;
}

export function JoinedParticipants({ announcement, onView, buttonRef }) {
  const known = Number.isInteger(announcement.participants_count) && announcement.participants_count >= 0;
  const preview = (Array.isArray(announcement.participants_preview) ? announcement.participants_preview : []).filter((donor) => typeof donor?.name === 'string' && donor.name.trim()).slice(0, 3);
  return <section aria-label="Joined Participants" className="mt-4 rounded-xl border border-gray-200 p-3">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h3 className="flex items-center gap-2 text-sm font-semibold text-gray-800"><Users size={16} aria-hidden="true" />Joined Participants</h3>
        <p className="mt-1 text-xs text-gray-500">{known ? `${announcement.participants_count} joined` : 'Participant count unavailable'}</p>
      </div>
      {onView && <button ref={buttonRef} type="button" disabled={!known} onClick={onView}
        className="min-h-10 rounded-lg px-2 text-xs font-semibold text-[#b7192e] hover:bg-red-50 disabled:opacity-50">View Participants</button>}
    </div>
    {known && announcement.participants_count > 0 && preview.length > 0 && <div className="mt-2 flex -space-x-1.5" aria-label="Joined donor preview">
      {preview.map((donor) => <span key={donor.id} title={donor.name} aria-label={donor.name}
        className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-red-50 text-xs font-bold text-[#b7192e]">{donor.name.trim().split(/\s+/).filter((_, index, names) => index === 0 || index === names.length - 1).map((part) => part[0]).join('').toUpperCase()}</span>)}
    </div>}
  </section>;
}

const participantLabels = { pending: 'Pending', for_verification: 'For Verification', needs_revision: 'Needs Revision', completed: 'Completed', rejected: 'Rejected', cancelled: 'Cancelled' };
const joinedDate = (value) => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString('en-US', {
  timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
}) : '-';

export function AnnouncementParticipants({ remote }) {
  const { participants = [], participantsMeta: meta, participantsLoading: loading, participantsError: error,
    participantsPage = 1, model } = remote;
  const heading = useRef(null);
  useEffect(() => { heading.current?.focus(); }, []);
  return <section aria-busy={loading}>
    <h3 ref={heading} tabIndex={-1} className="text-sm font-semibold text-gray-800 outline-none">Participation history</h3>
    <p className="mt-1 text-xs leading-5 text-gray-500">Joined count excludes cancelled entries. History includes all saved participation records.</p>
    {error ? <ErrorState description={error} onRetry={() => model.loadParticipants(participantsPage)} /> : loading && !meta ? <PageSkeleton /> : <>
      {meta && <p className="my-3 text-xs text-gray-500" role="status">{meta.total} participation {meta.total === 1 ? 'record' : 'records'}</p>}
      {participants.length === 0 && !loading ? <p role="status" className="py-6 text-center text-sm text-gray-500">No participants have joined this announcement.</p> :
        <ul aria-label="Announcement participants" className="divide-y divide-gray-100">{participants.map((entry) => <li key={entry.id} className="py-3">
          <div className="flex flex-wrap items-center justify-between gap-2"><p className="min-w-0 break-words text-sm font-semibold text-gray-800">{entry.donor?.name || 'Unavailable donor'}</p>
            <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">{participantLabels[entry.status] ?? 'Unknown status'}</span></div>
          <p className="mt-1 text-xs text-gray-500">Joined {joinedDate(entry.joined_at)}</p>
          {entry.cancelled_at && <p className="mt-1 text-xs text-gray-500">Cancelled {joinedDate(entry.cancelled_at)}</p>}
        </li>)}</ul>}
      {loading && <p role="status" className="my-2 text-xs text-gray-500">Loading participation history...</p>}
      {meta && meta.last_page > 1 && <nav aria-label="Participation pages" className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <button type="button" disabled={loading || meta.current_page <= 1} onClick={() => model.loadParticipants(meta.current_page - 1)} className="min-h-10 rounded-lg border px-3 text-xs disabled:opacity-50">Previous</button>
        <span className="text-xs text-gray-500">Page {meta.current_page} of {meta.last_page}</span>
        <button type="button" disabled={loading || meta.current_page >= meta.last_page} onClick={() => model.loadParticipants(meta.current_page + 1)} className="min-h-10 rounded-lg border px-3 text-xs disabled:opacity-50">Next</button>
      </nav>}
    </>}
  </section>;
}

export default ViewAnnouncement;

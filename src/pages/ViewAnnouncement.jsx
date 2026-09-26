import { ArrowLeft, MapPin, CalendarDays } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';

function ViewAnnouncement() {
  const navigate = useNavigate();
  const { id } = useParams();

  // Temporary data.
  // Laravel GET /api/admin/announcements/{id} will replace this later.
  const announcement = {
    id,
    title: 'Community Blood Donation Drive',
    description:
      'Join the community blood donation activity and help save lives.',
    location: 'City Health Office',
    donationDate: 'September 28, 2026',
    publishedDate: 'September 16, 2026',
    expiresDate: 'September 28, 2026',
    status: 'Active',
  };

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

            <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
              {/* Image placeholder */}
              <div className="flex h-64 items-center justify-center bg-gray-100 text-sm text-gray-400">
                Announcement Image
              </div>

              <div className="p-7">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                      {announcement.status}
                    </span>

                    <h2 className="mt-4 text-2xl font-bold text-gray-900">
                      {announcement.title}
                    </h2>
                  </div>
                </div>

                <div className="mt-5 flex items-center gap-2 text-sm text-gray-500">
                  <MapPin size={17} />
                  {announcement.location}
                </div>

                <p className="mt-6 leading-7 text-gray-600">
                  {announcement.description}
                </p>

                <div className="mt-8 grid gap-4 border-t border-gray-100 pt-6 sm:grid-cols-3">
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
            </article>
          </div>
        </div>
      </main>
    </div>
  );
}

export default ViewAnnouncement;
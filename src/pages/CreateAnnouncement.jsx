import { useAnnouncements } from '../services/useAnnouncements';
import { ErrorState, PageSkeleton } from '../components/ui/PageState';
import { useEffect, useState } from 'react';
import { ArrowLeft, ImagePlus } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import AnnouncementEditor from '../components/announcements/AnnouncementEditor';
import { announcementContentError, announcementDocument, documentText } from '../services/announcementContent';

function CreateAnnouncement() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const returnToList = () => navigate('/announcements', { state: { announcementFilters: state?.announcementFilters } });
  const { id } = useParams();
  const { item, loading, busy, error, model } = useAnnouncements(id || 'create');

  // ============================================================
  // Announcement Form State
  // ============================================================

  const [changes, setFormData] = useState(null);
  const [descriptionSubmitted, setDescriptionSubmitted] = useState(false);
  const formData = changes ?? item ?? {
    title: '',
    description: '',
    location: '',
    donationDate: '',
    expiresDate: '',
    notifyDonors: true,
  };

  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState('');
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleImageChange = (event) => {
    const selectedFile = event.target.files?.[0];

    if (selectedFile) {
      setImage(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  const save = async (status) => {
    setDescriptionSubmitted(true);
    if (announcementContentError(formData.description_document ?? announcementDocument(formData), true)) return;
    if (await model.save(formData, image, status)) returnToList();
  };
  const handleSaveDraft = () => save('draft');
  const handlePublish = (event) => { event.preventDefault(); void save('published'); };

  return (
    <div className="flex min-h-screen bg-[#f7f8fa]">
      <Sidebar />

      <main className="min-w-0 flex-1">
        <Header
          title={id ? "Edit Announcement" : "Create Announcement"}
          description="Create a new blood donation announcement for LifeFlow donors."
        />

        <div className="p-4 lg:p-8">
          <div className="mx-auto max-w-5xl">
            <button
              type="button"
              onClick={returnToList}
              className="mb-5 flex items-center gap-2 text-sm font-semibold text-gray-500 transition hover:text-[#b7192e]"
            >
              <ArrowLeft size={17} />
              Back to Announcements
            </button>

            {loading ? <PageSkeleton /> : error && id && !item ? <ErrorState description={error} onRetry={model.load} /> : <form
              onSubmit={handlePublish}
              className="rounded-2xl border border-gray-200 bg-white p-7"
            >
              <div className="mb-8">
                <h2 className="text-lg font-bold text-gray-800">
                  Announcement Details
                </h2>

                <p className="mt-1 text-sm text-gray-400">
                  Enter the donation event information shown to donors.
                </p>
              </div>

              {error && <p role="alert" className="mb-4 text-sm text-red-700">{error}</p>}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Left column */}
                <div className="space-y-5">
                  <div>
                    <label
                      htmlFor="title"
                      className="mb-2 block text-sm font-semibold text-gray-700"
                    >
                      Announcement Title
                    </label>

                    <input
                      id="title"
                      name="title"
                      type="text"
                      value={formData.title}
                      onChange={handleChange}
                      placeholder="Enter announcement title"
                      required
                      className="h-12 w-full rounded-xl border border-gray-300 px-4 text-sm outline-none transition focus:border-[#b7192e] focus:ring-2 focus:ring-red-100"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="description"
                      className="mb-2 block text-sm font-semibold text-gray-700"
                    >
                      Description
                    </label>

                    <AnnouncementEditor value={formData.description_document ?? announcementDocument(formData)} disabled={busy || item?.status === 'deleted'} submitted={descriptionSubmitted}
                      onChange={(document) => setFormData({ ...formData, description_document: document, description: documentText(document) })} />
                  </div>

                  <div>
                    <label
                      htmlFor="location"
                      className="mb-2 block text-sm font-semibold text-gray-700"
                    >
                      Donation Location
                    </label>

                    <input
                      id="location"
                      name="location"
                      type="text"
                      value={formData.location}
                      onChange={handleChange}
                      placeholder="Enter donation location"
                      required
                      className="h-12 w-full rounded-xl border border-gray-300 px-4 text-sm outline-none transition focus:border-[#b7192e] focus:ring-2 focus:ring-red-100"
                    />
                  </div>
                </div>

                {/* Right column */}
                <div className="space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Announcement Image
                    </label>

                    <label className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-5 text-center transition hover:border-[#b7192e] hover:bg-red-50/30">
                      <ImagePlus
                        size={30}
                        className="mb-3 text-gray-400"
                      />

                      <span className="text-sm font-semibold text-gray-600">
                        {image
                          ? image.name
                          : 'Choose an image'}
                      </span>

                      {(preview || item?.image_url) && <img src={preview || item.image_url} alt="Announcement preview" className="my-3 max-h-40 object-contain" />}
                      <span className="mt-1 text-xs text-gray-400">
                        JPG or PNG, up to 5 MB
                      </span>

                      <input
                        type="file"
                        accept="image/jpeg,image/png"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div>
                    <label
                      htmlFor="donationDate"
                      className="mb-2 block text-sm font-semibold text-gray-700"
                    >
                      Donation Date
                    </label>

                    <input
                      id="donationDate"
                      name="donationDate"
                      type="date"
                      value={formData.donationDate}
                      onChange={handleChange}
                      required
                      className="h-12 w-full rounded-xl border border-gray-300 px-4 text-sm outline-none focus:border-[#b7192e]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="expiresDate"
                      className="mb-2 block text-sm font-semibold text-gray-700"
                    >
                      Expiration Date
                    </label>

                    <input
                      id="expiresDate"
                      name="expiresDate"
                      type="date"
                      value={formData.expiresDate}
                      onChange={handleChange}
                      required
                      className="h-12 w-full rounded-xl border border-gray-300 px-4 text-sm outline-none focus:border-[#b7192e]"
                    />

                    <p className="mt-2 text-xs text-gray-400">
                      The announcement will no longer appear as active
                      after this date.
                    </p>
                  </div>

                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <input
                      type="checkbox"
                      name="notifyDonors"
                      checked={formData.notifyDonors}
                      onChange={handleChange}
                      className="mt-1 h-4 w-4 accent-[#b7192e]"
                    />

                    <div>
                      <p className="text-sm font-semibold text-gray-700">
                        Notify donors when published
                      </p>

                      <p className="mt-1 text-xs leading-5 text-gray-400">
                        Send an important notification when this
                        announcement is published.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-8 flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-6">
                <button
                  type="button"
                  onClick={returnToList}
                  className="min-h-11 rounded-xl border border-gray-300 px-5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={busy || item?.status === 'deleted'}
                  onClick={handleSaveDraft}
                  className="min-h-11 rounded-xl border border-[#b7192e] px-5 text-sm font-semibold text-[#b7192e] transition hover:bg-red-50"
                >
                  Save as Draft
                </button>

                <button
                  disabled={busy || item?.status === 'deleted'}
                  type="submit"
                  className="min-h-11 rounded-xl bg-[#b7192e] px-6 text-sm font-semibold text-white transition hover:bg-[#9f1427]"
                >
                  {busy ? 'Saving...' : 'Publish Announcement'}
                </button>
              </div>
            </form>}
          </div>
        </div>
      </main>
    </div>
  );
}

export default CreateAnnouncement;

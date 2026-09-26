import { useState } from 'react';
import { ArrowLeft, ImagePlus } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';

function EditAnnouncement() {
  const navigate = useNavigate();
  const { id } = useParams();

  // Temporary pre-filled data.
  const [formData, setFormData] = useState({
    title: 'Community Blood Donation Drive',
    description:
      'Join the community blood donation activity and help save lives.',
    location: 'City Health Office',
    donationDate: '2026-09-28',
    expiresDate: '2026-09-28',
    notifyDonors: false,
  });

  const [image, setImage] = useState(null);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSaveDraft = () => {
    console.log('Update as draft:', id, formData);
  };

  const handlePublish = (event) => {
    event.preventDefault();

    console.log('Update and publish:', id, formData);
  };

  return (
    <div className="flex min-h-screen bg-[#f7f8fa]">
      <Sidebar />

      <main className="min-w-0 flex-1">
        <Header
          title="Edit Announcement"
          description="Modify announcement information."
        />

        <div className="p-4 lg:p-8">
          <div className="mx-auto max-w-5xl">
            <button
              type="button"
              onClick={() => navigate('/announcements')}
              className="mb-5 flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-[#b7192e]"
            >
              <ArrowLeft size={17} />
              Back to Announcements
            </button>

            <form
              onSubmit={handlePublish}
              className="rounded-2xl border border-gray-200 bg-white p-7"
            >
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Announcement Title
                    </label>

                    <input
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      required
                      className="h-12 w-full rounded-xl border border-gray-300 px-4 text-sm outline-none focus:border-[#b7192e]"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Description
                    </label>

                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows={7}
                      required
                      className="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-[#b7192e]"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Donation Location
                    </label>

                    <input
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      required
                      className="h-12 w-full rounded-xl border border-gray-300 px-4 text-sm outline-none focus:border-[#b7192e]"
                    />
                  </div>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Replace Image
                    </label>

                    <label className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50">
                      <ImagePlus size={30} className="text-gray-400" />

                      <span className="mt-3 text-sm font-semibold text-gray-600">
                        {image ? image.name : 'Choose new image'}
                      </span>

                      <input
                        type="file"
                        accept="image/jpeg,image/png"
                        onChange={(event) =>
                          setImage(event.target.files?.[0] || null)
                        }
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Donation Date
                    </label>

                    <input
                      type="date"
                      name="donationDate"
                      value={formData.donationDate}
                      onChange={handleChange}
                      required
                      className="h-12 w-full rounded-xl border border-gray-300 px-4 text-sm"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Expiration Date
                    </label>

                    <input
                      type="date"
                      name="expiresDate"
                      value={formData.expiresDate}
                      onChange={handleChange}
                      required
                      className="h-12 w-full rounded-xl border border-gray-300 px-4 text-sm"
                    />
                  </div>

                  <label className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <input
                      type="checkbox"
                      name="notifyDonors"
                      checked={formData.notifyDonors}
                      onChange={handleChange}
                      className="mt-1 h-4 w-4 accent-[#b7192e]"
                    />

                    <div>
                      <p className="text-sm font-semibold text-gray-700">
                        Notify donors
                      </p>

                      <p className="mt-1 text-xs text-gray-400">
                        Notify donors when this updated announcement is published.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3 border-t border-gray-100 pt-6">
                <button
                  type="button"
                  onClick={() => navigate('/announcements')}
                  className="min-h-11 rounded-xl border border-gray-300 px-5 text-sm font-semibold text-gray-600"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className="min-h-11 rounded-xl border border-[#b7192e] px-5 text-sm font-semibold text-[#b7192e]"
                >
                  Save as Draft
                </button>

                <button
                  type="submit"
                  className="min-h-11 rounded-xl bg-[#b7192e] px-6 text-sm font-semibold text-white"
                >
                  Publish Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

export default EditAnnouncement;
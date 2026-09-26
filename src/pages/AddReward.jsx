import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  ArrowLeft,
  ImagePlus,
  Gift,
} from 'lucide-react';

import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';

function AddReward() {
  const navigate = useNavigate();

  const voucherValues = [
    100,
    200,
    300,
    400,
    500,
    600,
    700,
    800,
    900,
    1000,
  ];

  // ============================================================
  // Form State
  // ============================================================

  const [formData, setFormData] = useState({
    voucherValue: '100',
    pointsRequired: '',
    stock: '',
    status: 'inactive',
  });

  const [image, setImage] = useState(null);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleImageChange = (event) => {
    const selectedFile = event.target.files?.[0];

    if (selectedFile) {
      setImage(selectedFile);
    }
  };

  // ============================================================
  // Submit
  // Later this becomes POST /api/admin/rewards
  // ============================================================

  const handleSubmit = (event) => {
    event.preventDefault();

    console.log({
      ...formData,
      voucherValue: Number(formData.voucherValue),
      pointsRequired: Number(formData.pointsRequired),
      stock: Number(formData.stock),
      image,
    });
  };

  return (
    <div className="flex min-h-screen bg-[#f7f8fa]">
      <Sidebar />

      <main className="min-w-0 flex-1">
        <Header
          title="Add Grocery Voucher"
          description="Create a new grocery voucher reward for LifeFlow donors."
        />

        <div className="p-4 lg:p-8">
          <div className="mx-auto max-w-4xl">
            <button
              type="button"
              onClick={() => navigate('/rewards')}
              className="mb-5 flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-[#b7192e]"
            >
              <ArrowLeft size={17} />
              Back to Rewards
            </button>

            <form
              onSubmit={handleSubmit}
              className="rounded-2xl border border-gray-200 bg-white p-7"
            >
              <div className="mb-8 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-[#b7192e]">
                  <Gift size={21} />
                </div>

                <div>
                  <h2 className="font-bold text-gray-800">
                    Grocery Voucher Details
                  </h2>

                  <p className="mt-1 text-sm text-gray-400">
                    Set the voucher value, required points,
                    available stock, and visibility.
                  </p>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                {/* Left */}
                <div className="space-y-5">
                  <div>
                    <label
                      htmlFor="voucherValue"
                      className="mb-2 block text-sm font-semibold text-gray-700"
                    >
                      Voucher Value
                    </label>

                    <select
                      id="voucherValue"
                      name="voucherValue"
                      value={formData.voucherValue}
                      onChange={handleChange}
                      className="h-12 w-full rounded-xl border border-gray-300 bg-white px-4 text-sm outline-none focus:border-[#b7192e]"
                    >
                      {voucherValues.map((value) => (
                        <option key={value} value={value}>
                          ₱{value.toLocaleString()}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="pointsRequired"
                      className="mb-2 block text-sm font-semibold text-gray-700"
                    >
                      Points Required
                    </label>

                    <input
                      id="pointsRequired"
                      name="pointsRequired"
                      type="number"
                      min="1"
                      value={formData.pointsRequired}
                      onChange={handleChange}
                      placeholder="Example: 350"
                      required
                      className="h-12 w-full rounded-xl border border-gray-300 px-4 text-sm outline-none focus:border-[#b7192e]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="stock"
                      className="mb-2 block text-sm font-semibold text-gray-700"
                    >
                      Available Stock
                    </label>

                    <input
                      id="stock"
                      name="stock"
                      type="number"
                      min="0"
                      value={formData.stock}
                      onChange={handleChange}
                      placeholder="Example: 20"
                      required
                      className="h-12 w-full rounded-xl border border-gray-300 px-4 text-sm outline-none focus:border-[#b7192e]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="status"
                      className="mb-2 block text-sm font-semibold text-gray-700"
                    >
                      Status
                    </label>

                    <select
                      id="status"
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      className="h-12 w-full rounded-xl border border-gray-300 bg-white px-4 text-sm outline-none focus:border-[#b7192e]"
                    >
                      <option value="inactive">
                        Inactive
                      </option>

                      <option value="active">
                        Active
                      </option>
                    </select>

                    <p className="mt-2 text-xs text-gray-400">
                      Inactive vouchers remain hidden from donors.
                    </p>
                  </div>
                </div>

                {/* Right */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Voucher Image
                  </label>

                  <label className="flex min-h-72 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 px-5 text-center transition hover:border-[#b7192e] hover:bg-red-50/30">
                    <ImagePlus
                      size={34}
                      className="text-gray-400"
                    />

                    <span className="mt-4 text-sm font-semibold text-gray-600">
                      {image
                        ? image.name
                        : 'Choose voucher image'}
                    </span>

                    <span className="mt-1 text-xs text-gray-400">
                      JPG or PNG
                    </span>

                    <input
                      type="file"
                      accept="image/jpeg,image/png"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3 border-t border-gray-100 pt-6">
                <button
                  type="button"
                  onClick={() => navigate('/rewards')}
                  className="min-h-11 rounded-xl border border-gray-300 px-5 text-sm font-semibold text-gray-600"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="min-h-11 rounded-xl bg-[#b7192e] px-6 text-sm font-semibold text-white"
                >
                  Save Grocery Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

export default AddReward;
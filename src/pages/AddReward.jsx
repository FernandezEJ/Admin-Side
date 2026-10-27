import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useRewards } from '../services/useRewards';
import { REWARD_CATEGORIES, LEGACY_CATEGORIES, APPAREL_SIZES } from '../services/rewardsApi';
import { ErrorState, PageSkeleton, LoadingNotice } from '../components/ui/PageState';
import AdminDialog from '../components/ui/AdminDialog';
import RewardCover from '../components/rewards/RewardCover';

import {
  ArrowLeft,
  ImagePlus,
  Gift,
} from 'lucide-react';

import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';

export function RewardForm({ remote, popup = false, onClose, onSaved, closeRequestRef, onDirtyChange, onTitleChange }) {
  const { item, model, busy, error } = remote;
  const navigate = useNavigate();
  const [baseline] = useState(item);
  const [dirty, setDirty] = useState(false), [discard, setDiscard] = useState(false), [preview, setPreview] = useState(''), [imageError, setImageError] = useState('');
  const formRef = useRef(null), keepRef = useRef(null), previousFocus = useRef(null), submitting = useRef(false);
  const leave = () => {
    if (busy || submitting.current) return;
    if (dirty) { previousFocus.current = globalThis.document?.activeElement;setDiscard(true); }
    else if (popup) onClose();else navigate('/rewards');
  };
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  useEffect(() => { onDirtyChange?.(dirty);return () => onDirtyChange?.(false); }, [dirty, onDirtyChange]);
  useEffect(() => {
    if (popup) formRef.current?.querySelector('input[name="name"]')?.focus({ preventScroll: true });
  }, [popup]);
  useEffect(() => {
    if (!popup) return;
    closeRequestRef.current = () => {
      if (busy || submitting.current) return;
      if (discard) setDiscard(false);
      else if (dirty) { previousFocus.current = globalThis.document?.activeElement;setDiscard(true); }
      else onClose();
    };
    onTitleChange(discard ? 'Discard unsaved changes?' : 'Edit Reward');
    return () => { closeRequestRef.current = null; };
  }, [popup, closeRequestRef, dirty, discard, busy, onClose, onTitleChange]);
  useEffect(() => {
    if (discard) keepRef.current?.focus();
    else if (previousFocus.current?.isConnected) { previousFocus.current.focus();previousFocus.current = null; }
  }, [discard]);
  useEffect(() => {
    if (!dirty && !busy) return;
    const warn = event => { event.preventDefault();event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, busy]);

  // ============================================================
  // Form State
  // ============================================================

  const [formData, setFormData] = useState({
    name: item?.name ?? '',
    category: item?.category ?? 'merchandise',
    voucherValue: item?.voucherValue == null ? '' : String(item.voucherValue),
    pointsRequired: String(item?.pointsRequired ?? ''),
    stock: String(item?.stock ?? ''),
    status: item?.status ?? 'inactive',
  });

  const [image, setImage] = useState(null);
  const [sizes, setSizes] = useState(() => APPAREL_SIZES.map(size => {
    const variant = item?.variants?.find(row => row.size === size && row.enabled);
    return { size, enabled: !!variant, stock_quantity: String(variant?.stock_quantity ?? 0) };
  }));
  const variants = sizes.filter(row => row.enabled).map(({ size, stock_quantity }) => ({ size, stock_quantity }));
  const totalStock = variants.reduce((total, row) => total + Number(row.stock_quantity), 0);
  const categories = [...REWARD_CATEGORIES, ...LEGACY_CATEGORIES.filter(row => row.value === item?.category)];

  const handleChange = (event) => {
    const { name, value } = event.target;
    setDirty(true);

    setFormData((current) => ({
      ...current,
      [name]: value,
      ...(name === 'category' && ['merchandise', 'apparel'].includes(value) ? { voucherValue: '' } : {}),
    }));
  };

  const handleImageChange = (event) => {
    const selectedFile = event.target.files?.[0];

    if (selectedFile) {
      if (!['image/jpeg', 'image/png'].includes(selectedFile.type) || selectedFile.size > 5 * 1024 * 1024) { setImageError('Choose a JPG or PNG up to 5 MB.');return; }
      setImageError('');setDirty(true);setImage(selectedFile);setPreview(URL.createObjectURL(selectedFile));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (busy || remote.loading || submitting.current || imageError) return;
    submitting.current = true;
    try { if (await model.save({ name: formData.name, category: formData.category,
      voucher_value: formData.voucherValue, points_cost: formData.pointsRequired, stock_quantity: formData.category === 'apparel' ? totalStock : formData.stock,
      ...(formData.category === 'apparel' ? { variants } : {}),
      status: formData.status, ...(baseline ? { expected_stock: baseline.stock, expected_inventory_version: baseline.inventory_version } : {}), image })) {
        if (popup) onSaved();else navigate('/rewards');
      } } finally { submitting.current = false; }
  };
  const changeSizes = updater => { setDirty(true);setSizes(updater); };
  const confirmation = <div className="reward-popup-confirmation">
    <p>Your changes have not been saved.</p><div className="mt-5 flex flex-wrap justify-end gap-3">
      <button ref={keepRef} type="button" onClick={() => setDiscard(false)} className="min-h-11 rounded-xl border border-gray-200 px-4 text-sm font-semibold">Keep Editing</button>
      <button type="button" onClick={() => popup ? onClose() : navigate('/rewards')} className="min-h-11 rounded-xl bg-danger px-4 text-sm font-semibold text-white hover:bg-danger-hover">Discard Changes</button>
    </div>
  </div>;
  const form = <>
            <form
              ref={formRef} hidden={popup && discard}
              onSubmit={handleSubmit}
              className="reward-editor-form rounded-2xl border border-gray-200 bg-white p-7"
            >
              <LoadingNotice loading={remote.loading || remote.refreshing || busy} hasData={!!item} />{error && <ErrorState description={error} status={remote.errorStatus} busy={remote.loading} onRetry={remote.readFailed ? () => model.load() : undefined} />}
              <fieldset disabled={busy || remote.loading}>
              <div className="mb-8 flex items-center gap-3">
                <div className="lf-icon-badge lf-icon-brand">
                  <Gift size={22} aria-hidden="true" />
                </div>

                <div>
                  <h2 className="font-bold text-gray-800">
                    Reward Details
                  </h2>

                  <p className="mt-1 text-sm text-gray-400">
                    Set the category, required points,
                    available stock, and visibility.
                  </p>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                {/* Left */}
                <div className="space-y-5">
                  <label className="block text-sm font-semibold text-gray-700">Reward Name<input name="name" required maxLength={255} value={formData.name} onChange={handleChange} className="mt-2 h-12 w-full rounded-xl border border-gray-300 px-4 text-sm" /></label>
                  <label className="block text-sm font-semibold text-gray-700">Category<select name="category" required value={formData.category} onChange={handleChange} className="mt-2 h-12 w-full rounded-xl border border-gray-300 bg-white px-4 text-sm outline-none focus:border-primary">{categories.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}</select></label>
                  {formData.category === 'vouchers' && <div>
                    <label
                      htmlFor="voucherValue"
                      className="mb-2 block text-sm font-semibold text-gray-700"
                    >
                      Voucher Value
                    </label>

                    <input id="voucherValue" name="voucherValue" type="number" min="0.01" max="100000" step="0.01" required value={formData.voucherValue} onChange={handleChange} className="h-12 w-full rounded-xl border border-gray-300 px-4 text-sm outline-none focus:border-primary" />
                    <p className="mt-2 text-xs text-gray-400">Approved denomination, separate from Points Required.</p>
                  </div>}

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
                      className="h-12 w-full rounded-xl border border-gray-300 px-4 text-sm outline-none focus:border-primary"
                    />
                  </div>

                  {formData.category !== 'apparel' && <div>
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
                      className="h-12 w-full rounded-xl border border-gray-300 px-4 text-sm outline-none focus:border-primary"
                    />
                  </div>}

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
                      className="h-12 w-full rounded-xl border border-gray-300 bg-white px-4 text-sm outline-none focus:border-primary"
                    >
                      <option value="inactive">
                        Inactive
                      </option>

                      <option value="active">
                        Active
                      </option>
                    </select>

                    <p className="mt-2 text-xs text-gray-400">
                      Inactive rewards remain hidden from donors.
                    </p>
                  </div>
                </div>

                {/* Right */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Reward Image
                  </label>

                  <label className="flex min-h-72 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 px-5 py-4 text-center transition hover:border-primary hover:bg-selected focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary">
                    {preview || baseline?.image_url ? <RewardCover src={preview || baseline.image_url} name={formData.name} full /> : <ImagePlus
                      size={34}
                      className="text-gray-400"
                    />}

                    <span className="mt-4 text-sm font-semibold text-gray-600">
                      {image
                        ? image.name
                        : 'Choose reward image'}
                    </span>

                    <span className="mt-1 text-xs text-gray-400">
                      JPG or PNG, up to 5 MB
                    </span>

                    <input
                      type="file"
                      accept="image/jpeg,image/png"
                      onChange={handleImageChange}
                      className="sr-only"
                    />
                  </label>
                  {imageError && <p role="alert" className="mt-2 text-sm text-danger-foreground">{imageError}</p>}
                </div>
              </div>

              {formData.category === 'apparel' && <section aria-labelledby="size-inventory-heading" className="mt-8 border-t border-gray-200 pt-6">
                <h3 id="size-inventory-heading" className="font-bold text-gray-800">Size &amp; Inventory</h3>
                <p className="mt-2 text-sm text-gray-500">Enable at least one offered size. Sold-out sizes may have zero stock.</p>
                {error && <p role="alert" className="mt-2 text-sm text-danger-foreground">{error}</p>}
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  {sizes.map(row => <div key={row.size} className="min-w-0 rounded-xl border border-gray-200 p-3">
                    <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={row.enabled} onChange={event => changeSizes(current => current.map(entry => entry.size === row.size ? { ...entry, enabled: event.target.checked } : entry))} />Size {row.size}</label>
                    <label className="mt-3 block text-xs text-gray-500">Available quantity<input aria-label={`Stock for size ${row.size}`} type="number" min="0" max="429496729" step="1" required={row.enabled} disabled={!row.enabled} value={row.stock_quantity} onChange={event => changeSizes(current => current.map(entry => entry.size === row.size ? { ...entry, stock_quantity: event.target.value } : entry))} className="mt-2 h-11 w-full rounded-lg border border-gray-300 px-3 text-sm disabled:opacity-40" /></label>
                  </div>)}
                </div>
                <p aria-live="polite" className="mt-4 text-sm font-semibold">Total Available Stock: {Number.isFinite(totalStock) ? totalStock : 0}</p>
              </section>}
              <div className="mt-8 flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-6">
                <button
                  type="button"
                  onClick={leave}
                  className="min-h-11 rounded-xl border border-gray-300 px-5 text-sm font-semibold text-gray-600"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="min-h-11 rounded-xl bg-primary px-6 text-sm font-semibold text-white"
                >
                  {busy ? 'Saving...' : 'Save Reward'}
                </button>
              </div>
              </fieldset>
            </form>
            {discard ? popup ? confirmation : <AdminDialog title="Discard unsaved changes?" onClose={() => setDiscard(false)}>{confirmation}</AdminDialog> : null}
  </>;
  if (popup) return <div className="reward-popup-body">{form}</div>;
  return <div className="flex min-h-screen bg-page"><Sidebar /><main className="min-w-0 flex-1">
    <Header title={item ? 'Edit Reward' : 'Add Reward'} description="Manage a LifeFlow reward for donors." />
    <div className="p-4 lg:p-8"><div className="mx-auto max-w-4xl">
      <button type="button" onClick={leave} className="mb-5 flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-primary"><ArrowLeft size={17} />Back to Rewards</button>
      {form}
          </div>
        </div>
      </main>
    </div>;
}

export default function AddReward() {
  const { id } = useParams();
  const remote = useRewards(id ?? 'new');
  if ((remote.loading && !remote.item) || (id && (!remote.item || remote.item.status === 'deleted'))) return <div className="flex min-h-screen bg-page"><Sidebar /><main className="min-w-0 flex-1"><Header title="LifeFlow Rewards" /><div className="p-6"><LoadingNotice loading={remote.loading} />{remote.loading ? <PageSkeleton variant="form" /> : <ErrorState description={remote.error || 'Deleted rewards must be restored before editing.'} status={remote.errorStatus} busy={remote.loading} onRetry={() => remote.model.load()} />}</div></main></div>;
  return <RewardForm key={remote.item ? `${remote.item.id}:${remote.item.updated_at}:${remote.item.stock}` : 'new'} remote={remote} />;
}

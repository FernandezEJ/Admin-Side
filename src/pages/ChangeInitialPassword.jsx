import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminSession } from '../auth/useAdminSession';

const fields = [
  ['current_password', 'Current Temporary Password', 'current-password'],
  ['password', 'New Password', 'new-password'],
  ['password_confirmation', 'Confirm New Password', 'new-password'],
];

export default function ChangeInitialPassword() {
  const { changeInitialPassword, logout } = useAdminSession();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
  const submitting = useRef(false);

  async function submit(event) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError('');
    setErrors({});
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      await changeInitialPassword(Object.fromEntries(fields.map(([name]) => [name, data.get(name)])));
      form.reset();
      navigate('/dashboard', { replace: true });
    } catch (failure) {
      setError(failure.message);
      setErrors(failure.errors ?? {});
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return <main className="flex min-h-screen items-center justify-center bg-[#fafafa] px-4 py-10">
    <section className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-8 shadow-sm sm:p-10">
      <p className="text-xs font-extrabold tracking-[0.18em] text-[#b7192e]">LIFEFLOW ADMIN</p>
      <h1 className="mt-6 text-3xl font-bold text-gray-900">Change your password</h1>
      <p className="mt-2 text-sm text-gray-500">Set a new password before continuing.</p>
      <p id="password-guidance" className="mt-3 text-sm text-gray-500">Use at least 10 characters with uppercase, lowercase, a number, and a symbol.</p>
      <form onSubmit={submit} aria-busy={busy} className="mt-6 space-y-5">
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {fields.map(([name, label, autoComplete]) => <div key={name}>
          <label htmlFor={name} className="mb-2 block text-sm font-semibold text-gray-700">{label}</label>
          <input id={name} name={name} type="password" autoComplete={autoComplete} required
            aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? `${name}-error` : 'password-guidance'}
            className="h-13 w-full rounded-xl border border-gray-300 px-4 text-sm text-gray-900 outline-none transition focus:border-[#b7192e] focus:ring-3 focus:ring-red-100" />
          {errors[name] && <p id={`${name}-error`} className="mt-2 text-sm text-red-700">{errors[name].join(' ')}</p>}
        </div>)}
        <button type="submit" disabled={busy} className="h-13 w-full rounded-xl bg-[#b7192e] text-sm font-bold text-white transition hover:bg-[#9f1427] disabled:opacity-60">
          {busy ? 'Saving…' : 'Change Password'}
        </button>
      </form>
      <button type="button" onClick={() => { logout(); navigate('/', { replace: true }); }}
        className="mt-5 text-sm font-semibold text-[#b7192e]">Logout</button>
    </section>
  </main>;
}

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAdminSession } from '../auth/useAdminSession';
import SessionState from '../auth/SessionState';
import { createPasswordReset } from '../services/adminPasswordReset';
import { readRememberedEmail } from '../services/rememberedEmail';

const input = 'h-13 w-full min-w-0 rounded-xl border border-gray-300 px-4 text-base text-gray-900 disabled:bg-gray-50';
const primary = 'min-h-13 w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white transition hover:bg-primary-hover disabled:opacity-60';

export default function ForgotPassword() {
  const session = useAdminSession();
  const model = useMemo(() => createPasswordReset(readRememberedEmail()), []);
  const state = useSyncExternalStore(model.subscribe, model.getSnapshot, model.getSnapshot);
  const [clock, setClock] = useState(Date.now);
  useEffect(() => () => model.dispose(), [model]);
  useEffect(() => {
    if (state.step === 'done') return;
    const timer = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [state.step]);
  if (session.isLoading || session.sessionError) return <SessionState />;
  if (session.isAuthenticated) return <Navigate to={session.mustChangePassword ? '/change-initial-password' : '/dashboard'} replace />;
  return <PasswordResetView state={state} model={model} clock={clock} />;
}

export function PasswordResetView({ state, model, clock }) {
  const resend = Math.max(0, Math.ceil((state.resendAt - clock) / 1000));
  const retry = Math.max(0, Math.ceil((state.retryAt - clock) / 1000));
  const submit = (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (state.step === 'email') void model.request(data.get('email'));
    if (state.step === 'code') void model.verify(data.get('code'));
    if (state.step === 'password') void model.reset(data.get('password'), data.get('password_confirmation'));
  };
  return <main className="flex min-h-svh items-start justify-center bg-page px-4 py-6 sm:items-center sm:py-10">
    <section className="w-full min-w-0 max-w-lg rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-10">
      <p className="text-xs font-extrabold tracking-[0.18em] text-primary">LIFEFLOW ADMIN</p>
      <h1 className="mt-5 text-2xl font-bold text-gray-900">{({ email: 'Forgot password?', code: 'Check your email', password: 'Set a new password', done: 'Password updated' })[state.step]}</h1>
      <p className="mt-2 break-words text-sm leading-6 text-gray-500">{state.step === 'email' ? 'Enter your Admin or Super Admin email to request a reset code.' : state.step === 'code' ? `Enter the six-digit code for ${state.email}. Codes expire after 15 minutes. Check your spam folder too.` : state.step === 'password' ? 'Use at least 10 characters with uppercase, lowercase, a number, and a symbol. Maximum 72 bytes.' : 'Your previous sessions have been signed out. Sign in to continue.'}</p>
      {state.notice && <p role="status" className="mt-4 text-sm leading-6 text-success-foreground">{state.notice}</p>}
      {state.error && <p role="alert" className="mt-4 break-words text-sm leading-6 text-danger-foreground">{state.error}</p>}
      {state.step !== 'done' && <form key={state.step} onSubmit={submit} aria-busy={state.busy} className="mt-6 space-y-4">
        {state.step === 'email' && <div><label htmlFor="recovery-email" className="mb-2 block text-sm font-semibold text-gray-700">Email address</label><input id="recovery-email" name="email" type="email" required maxLength={254} defaultValue={state.email} autoComplete="email" disabled={state.busy} className={input} /></div>}
        {state.step === 'code' && <div><label htmlFor="recovery-code" className="mb-2 block text-sm font-semibold text-gray-700">Verification code</label><input id="recovery-code" name="code" type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required autoComplete="one-time-code" disabled={state.busy} className={input} /></div>}
        {state.step === 'password' && [['password', 'New password'], ['password_confirmation', 'Confirm new password']].map(([name, label]) => <div key={name}><label htmlFor={name} className="mb-2 block text-sm font-semibold text-gray-700">{label}</label><input id={name} name={name} type="password" autoComplete="new-password" required minLength={10} maxLength={128} disabled={state.busy} className={input} /></div>)}
        <button type="submit" disabled={state.busy || retry > 0} className={primary}>{state.busy ? 'Please wait...' : retry ? `Try again in ${retry}s` : ({ email: 'Send Reset Code', code: 'Verify Code', password: 'Reset Password' })[state.step]}</button>
      </form>}
      {state.step === 'code' && <div className="mt-4 flex flex-wrap gap-4 text-sm font-semibold text-primary">
        <button type="button" disabled={state.busy || resend > 0 || retry > 0} onClick={() => void model.request(state.email, true)} className="min-h-11 disabled:text-gray-400">{resend ? `Resend code in ${resend}s` : 'Resend Code'}</button>
        <button type="button" disabled={state.busy} onClick={model.changeEmail} className="min-h-11">Change email</button>
      </div>}
      <Link to="/" className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline">Back to Sign In</Link>
    </section>
  </main>;
}

import LogoMascot from '../assets/LogoMascot.png';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAdminSession } from '../auth/useAdminSession';
import { useRef, useState } from 'react';
import SessionState from '../auth/SessionState';
import { normalizeEmail, readRememberedEmail, rememberEmail } from '../services/rememberedEmail';

function Login() {
  const { login, isAuthenticated, isLoading, sessionError, mustChangePassword } = useAdminSession();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [initialEmail] = useState(readRememberedEmail);
  const [email, setEmail] = useState(initialEmail);
  const [remember, setRemember] = useState(Boolean(initialEmail));
  const submitting = useRef(false);

  if (isLoading || sessionError) return <SessionState />;
  if (isAuthenticated) return <Navigate to={mustChangePassword ? '/change-initial-password' : '/dashboard'} replace />;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError('');
    const data = new FormData(event.currentTarget);
    const email = normalizeEmail(data.get('email'));
    if (!remember) rememberEmail('', false);
    try {
      const user = await login({ email, password: data.get('password') });
      rememberEmail(email, remember);
      navigate(user.must_change_password ? '/change-initial-password' : '/dashboard', { replace: true });
    } catch (failure) {
      setError(failure.status === 401 || failure.status === 403 ? 'Invalid email or password.' : failure.message);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-svh bg-white lg:grid-cols-[0.8fr_1.2fr]">
      {/* Login section */}
      <section className="flex min-w-0 items-center justify-center bg-[#fafafa] px-4 py-6 sm:px-8 lg:order-2 lg:px-12 lg:py-10">
        <div className="w-full min-w-0 max-w-lg rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-10">
          {/* Admin portal label */}
          <div className="mb-6">
            <p className="text-xs font-extrabold tracking-[0.18em] text-[#b7192e]">
              LIFEFLOW ADMIN
            </p>

            <p className="mt-1 text-xs text-gray-400">
              Administration Portal
            </p>
          </div>

          {/* Login heading */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              Welcome to LifeFlow Admin
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              Sign in to manage LifeFlow operations.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8" aria-busy={busy}>
            {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            {/* Admin email */}
            <div className="mb-5">
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                Email address
              </label>

              <input
                id="email"
                name="email"
                type="email"
                placeholder="Enter your email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={busy}
                required
                className="h-13 w-full rounded-xl border border-gray-300 px-4 text-base text-gray-900 outline-none transition focus:border-[#b7192e] lg:text-sm"
              />
            </div>

            {/* Admin password */}
            <div className="mb-4">
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                Password
              </label>

              <input
                id="password"
                name="password"
                type="password"
                placeholder="Enter your password"
                autoComplete="current-password"
                disabled={busy}
                required
                className="h-13 w-full rounded-xl border border-gray-300 px-4 text-base text-gray-900 outline-none transition focus:border-[#b7192e] lg:text-sm"
              />
            </div>

            {/* Login preferences and password recovery */}
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  name="remember_email"
                  checked={remember}
                  disabled={busy}
                  onChange={(event) => { setRemember(event.target.checked); if (!event.target.checked) rememberEmail('', false); }}
                  className="h-4 w-4 accent-[#b7192e]"
                />

                <span>Remember Email</span>
              </label>

              <Link
                to="/forgot-password"
                className="text-left text-sm font-semibold text-[#b7192e] hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="h-13 w-full rounded-xl bg-[#b7192e] text-sm font-bold text-white transition hover:bg-[#9f1427]"
            >
              {busy ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="mt-7 text-center text-xs text-gray-400">
            Authorized LifeFlow administrators only.
          </p>
        </div>
      </section>
      <section className="relative flex min-w-0 items-center justify-center overflow-hidden bg-gradient-to-br from-[#8f0f1d] via-[#b7192e] to-[#d62d41] px-6 py-8 text-white lg:order-1 lg:px-10 lg:py-12">
        <div className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-32 -right-20 h-80 w-80 rounded-full bg-white/5" />
        <div className="relative z-10 flex w-full max-w-xl flex-col items-center text-center">
          <img src={LogoMascot} alt="LifeFlow mascot" className="h-24 w-24 object-contain sm:h-32 sm:w-32 lg:h-56 lg:w-56" />
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight lg:text-6xl">LifeFlow</h1>
          <p className="mt-4 max-w-md text-base font-semibold leading-6 text-white/95 lg:text-2xl lg:leading-9">Every drop creates a flow of hope, connecting donors to lives that need it most.</p>
        </div>
      </section>
    </div>
  );
}

export default Login;

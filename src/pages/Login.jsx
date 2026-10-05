import LogoMascot from '../assets/LogoMascot.png';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAdminSession } from '../auth/useAdminSession';
import { useRef, useState } from 'react';
import SessionState from '../auth/SessionState';

function Login() {
  const { login, isAuthenticated, isLoading, sessionError, mustChangePassword } = useAdminSession();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
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
    try {
      const user = await login({ email: data.get('email'), password: data.get('password'), remember: data.has('remember') });
      navigate(user.must_change_password ? '/change-initial-password' : '/dashboard', { replace: true });
    } catch (failure) {
      setError(failure.status === 401 || failure.status === 403 ? 'Invalid email or password.' : failure.message);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[0.9fr_1.1fr]">
      {/* Left branding section */}
      <section className="relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#8f0f1d] via-[#b7192e] to-[#d62d41] px-6 py-12 text-white lg:px-10">
        {/* Subtle decorative shapes to give the branding panel more depth */}
        <div className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-32 -right-20 h-80 w-80 rounded-full bg-white/5" />

        {/* Centered LifeFlow branding */}
        <div className="relative z-10 flex w-full max-w-xl flex-col items-center text-center">
          <img
            src={LogoMascot}
            alt="LifeFlow mascot"
            className="h-48 w-48 object-contain sm:h-52 sm:w-52 lg:h-56 lg:w-56"
          />

          <h1 className="mt-3 text-5xl font-extrabold tracking-tight lg:text-6xl">
            LifeFlow
          </h1>

          <p className="mt-4 max-w-md text-xl font-semibold leading-8 text-white/95 lg:text-2xl lg:leading-9">
            Every drop creates a flow of hope, connecting donors to lives that
            need it most.
          </p>
        </div>
      </section>

      {/* Login section */}
      <section className="flex items-center justify-center bg-[#fafafa] px-4 py-10 sm:px-8 lg:px-12">
        <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-8 shadow-sm sm:p-10">
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
            <h2 className="text-3xl font-bold text-gray-900">
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
                required
                className="h-13 w-full rounded-xl border border-gray-300 px-4 text-sm text-gray-900 outline-none transition focus:border-[#b7192e] focus:ring-3 focus:ring-red-100"
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
                required
                className="h-13 w-full rounded-xl border border-gray-300 px-4 text-sm text-gray-900 outline-none transition focus:border-[#b7192e] focus:ring-3 focus:ring-red-100"
              />
            </div>

            {/* Login preferences and password recovery */}
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  name="remember"
                  defaultChecked
                  className="h-4 w-4 accent-[#b7192e]"
                />

                <span>Remember me</span>
              </label>

              {/* BACKEND READY:
                  This will later navigate to the admin password recovery flow. */}
              <button
                type="button"
                disabled
                title="Password recovery is not available yet"
                className="text-left text-sm font-semibold text-[#b7192e] hover:underline"
              >
                Forgot password?
              </button>
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
    </div>
  );
}

export default Login;

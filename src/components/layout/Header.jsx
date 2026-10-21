import { Menu, UserRound } from 'lucide-react';
import { useAdminSession } from '../../auth/useAdminSession';
import { formatStaffName } from '../../services/staffNames';
import { useSidebar } from './useSidebar';

function Header({
  title = 'Dashboard',
  description = 'Overview of LifeFlow donor activity.',
}) {
  const { currentAdmin } = useAdminSession();
  const { mobileOpen, openMobile } = useSidebar();
  return (
    <header className="sticky top-0 z-30 flex min-h-22 items-center justify-between gap-3 border-b border-gray-200 bg-white/95 px-4 py-4 backdrop-blur lg:px-8">
      {/* Current page information */}
      <div className="flex min-w-0 items-center gap-3">
        <button type="button" onClick={openMobile} aria-label="Open navigation"
          aria-controls="admin-sidebar" aria-expanded={mobileOpen}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-gray-600 hover:bg-selected hover:text-primary lg:hidden">
          <Menu size={22} aria-hidden="true" />
        </button>
        <div className="min-w-0 break-words">
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
            {title}
          </h1>

          <p className="mt-1 text-sm text-gray-400">
            {description}
          </p>
        </div>
      </div>

      {/* Admin profile */}
      <div className="flex shrink-0 items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-selected text-primary">
          <UserRound size={20} />
        </div>

        <div className="hidden max-w-40 break-words md:flex md:flex-col">
          <span className="text-sm font-semibold text-gray-800">
            {formatStaffName(currentAdmin?.name ?? 'Administrator')}
          </span>

          <span className="text-xs text-gray-400">
            LifeFlow Admin
          </span>
        </div>
      </div>
    </header>
  );
}

export default Header;

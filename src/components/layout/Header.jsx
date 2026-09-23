import { UserRound } from 'lucide-react';

function Header({
  title = 'Dashboard',
  description = 'Overview of LifeFlow donor activity.',
}) {
  return (
    <header className="sticky top-0 z-30 flex min-h-22 items-center justify-between border-b border-gray-200 bg-white/95 px-8 py-4 backdrop-blur">
      {/* Current page information */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {title}
        </h1>

        <p className="mt-1 text-sm text-gray-400">
          {description}
        </p>
      </div>

      {/* Admin profile */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-[#b7192e]">
          <UserRound size={20} />
        </div>

        <div className="hidden sm:flex sm:flex-col">
          <span className="text-sm font-semibold text-gray-800">
            Administrator
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
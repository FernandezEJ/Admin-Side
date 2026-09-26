import { LogOut } from 'lucide-react';
import { navigationItems } from './navigation';

import { NavLink, useNavigate } from 'react-router-dom';
import { useAdminSession } from '../../auth/useAdminSession';
import { hasRole } from '../../auth/roles';

function Sidebar() {
  const navigate = useNavigate();
  const { role, logout } = useAdminSession();

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  return (
    <aside aria-label="Admin navigation" className="sticky top-0 flex h-dvh w-16 shrink-0 flex-col border-r border-gray-200 bg-white px-1 py-3 sm:w-20 sm:px-2 lg:w-64 lg:px-4 lg:py-6">
      {/* LifeFlow branding */}
      <NavLink
        to="/dashboard"
        title="LifeFlow Dashboard"
        className="mb-4 flex shrink-0 items-center justify-center gap-3 rounded-xl px-1 py-1 transition hover:bg-gray-50 lg:mb-7 lg:justify-start lg:px-2"
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#b7192e] font-bold text-white">
          L
        </div>

        <div className="sr-only lg:not-sr-only">
          <h2 className="text-lg font-bold text-gray-900">
            LifeFlow
          </h2>

          <p className="text-xs text-gray-400">
            Admin
          </p>
        </div>
      </NavLink>

      {/* Main navigation */}
      <nav aria-label="Main navigation" className="quiet-scroll flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
        {navigationItems.filter((item) => hasRole(role, item.allowedRoles)).map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.name}
              to={item.path}
              title={item.name}
              className={({ isActive }) =>
                `flex min-h-12 shrink-0 items-center justify-center gap-3 rounded-xl px-3 text-sm font-medium transition lg:justify-start ${
                  isActive
                    ? 'bg-red-50 text-[#b7192e]'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-[#b7192e]'
                }`
              }
            >
              <Icon size={20} strokeWidth={1.8} className="shrink-0" />

              <span className="sr-only lg:not-sr-only">{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="shrink-0 border-t border-gray-100 pt-4">
        <button
          type="button"
          onClick={handleLogout}
          title="Logout"
          className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl px-3 text-sm font-medium text-gray-500 transition hover:bg-red-50 hover:text-[#b7192e] lg:justify-start"
        >
          <LogOut size={20} strokeWidth={1.8} />

          <span className="sr-only lg:not-sr-only">Logout</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;

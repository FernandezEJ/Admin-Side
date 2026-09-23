import {
  LayoutDashboard,
  Megaphone,
  BadgeCheck,
  Users,
  Gift,
  MessageSquareText,
  FileText,
  LogOut,
} from 'lucide-react';

import { NavLink, useNavigate } from 'react-router-dom';

function Sidebar() {
  const navigate = useNavigate();

  // Main Admin navigation
  const navigationItems = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      name: 'Announcements',
      path: '/announcements',
      icon: Megaphone,
    },
    {
      name: 'Verification',
      path: '/verification',
      icon: BadgeCheck,
    },
    {
      name: 'Donors',
      path: '/donors',
      icon: Users,
    },
    {
      name: 'Rewards',
      path: '/rewards',
      icon: Gift,
    },
    {
      name: 'Feedback',
      path: '/feedback',
      icon: MessageSquareText,
    },
    {
      name: 'Reports',
      path: '/reports',
      icon: FileText,
    },
  ];

  // Temporary frontend logout.
  // Later this will call the Laravel logout API
  // and remove the saved authentication token.
  const handleLogout = () => {
    navigate('/');
  };

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-gray-200 bg-white px-4 py-6">
      {/* LifeFlow branding */}
      <NavLink
        to="/dashboard"
        className="mb-7 flex items-center gap-3 rounded-xl px-2 py-1 transition hover:bg-gray-50"
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#b7192e] font-bold text-white">
          L
        </div>

        <div>
          <h2 className="text-lg font-bold text-gray-900">
            LifeFlow
          </h2>

          <p className="text-xs text-gray-400">
            Admin
          </p>
        </div>
      </NavLink>

      {/* Main navigation */}
      <nav className="flex flex-1 flex-col gap-1">
        {navigationItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-medium transition ${
                  isActive
                    ? 'bg-red-50 text-[#b7192e]'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-[#b7192e]'
                }`
              }
            >
              <Icon size={20} strokeWidth={1.8} />

              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="border-t border-gray-100 pt-4">
        <button
          type="button"
          onClick={handleLogout}
          className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-gray-500 transition hover:bg-red-50 hover:text-[#b7192e]"
        >
          <LogOut size={20} strokeWidth={1.8} />

          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
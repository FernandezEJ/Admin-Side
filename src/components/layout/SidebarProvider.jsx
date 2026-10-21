import { useCallback, useEffect, useState } from 'react';
import { SidebarContext } from './useSidebar';

const PREFERENCE_KEY = 'lifeflow.admin.sidebar.collapsed';

function readPreference() {
  try {
    return window.localStorage.getItem(PREFERENCE_KEY) === 'true';
  } catch {
    return false;
  }
}

export default function SidebarProvider({ children }) {
  const [collapsed, setCollapsed] = useState(readPreference);
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  useEffect(() => {
    try {
      window.localStorage.setItem(PREFERENCE_KEY, String(collapsed));
    } catch {
      // Navigation stays usable when browser storage is unavailable.
    }
  }, [collapsed]);

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)');
    const handleResize = () => { if (desktop.matches) closeMobile(); };
    desktop.addEventListener('change', handleResize);
    return () => desktop.removeEventListener('change', handleResize);
  }, [closeMobile]);

  return (
    <SidebarContext.Provider value={{ collapsed, mobileOpen, closeMobile,
      toggleCollapsed: () => setCollapsed((value) => !value),
      openMobile: () => setMobileOpen(true) }}>
      {children}
    </SidebarContext.Provider>
  );
}

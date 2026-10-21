import { createContext, useContext } from 'react';

export const SidebarContext = createContext({
  collapsed: false,
  mobileOpen: false,
  toggleCollapsed() {},
  openMobile() {},
  closeMobile() {},
});

export function useSidebar() {
  return useContext(SidebarContext);
}

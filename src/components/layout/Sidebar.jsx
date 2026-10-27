import { useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, LogOut, UserRound, X } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { navigationItems } from './navigation';
import { useAdminSession } from '../../auth/useAdminSession';
import { hasRole, ADMIN_ROLES } from '../../auth/roles';
import { formatStaffName } from '../../services/staffNames';
import { useSidebar } from './useSidebar';
import logoMascot from '../../assets/LogoMascot.png';
import '../../styles/sidebar.css';

const focusableSelector = 'a[href], button:not(:disabled), [tabindex="0"]';

function Sidebar() {
  const navigate = useNavigate();
  const { role, currentAdmin, logout } = useAdminSession();
  const { collapsed, mobileOpen, toggleCollapsed, closeMobile } = useSidebar();
  const rootRef = useRef(null);
  const panelRef = useRef(null);
  const closeRef = useRef(null);
  const name = formatStaffName(currentAdmin?.name ?? 'Administrator');
  const initials = name.trim().split(/\s+/u).filter(Boolean);
  const avatar = initials.length ? [initials[0][0], initials.length > 1 ? initials.at(-1)[0] : ''].join('').toUpperCase() : '';
  const identity = [name, currentAdmin?.email].filter(Boolean).join(' — ');
  const items = navigationItems.filter((item) => hasRole(role, item.allowedRoles));

  useEffect(() => {
    if (!mobileOpen) return;
    const opener = document.activeElement;
    const panel = panelRef.current;
    const outside = [];
    // Isolate the drawer without changing any page's content or event handlers.
    for (let node = rootRef.current; node && node !== document.body; node = node.parentElement) {
      for (const sibling of node.parentElement.children) {
        if (sibling !== node) {
          outside.push([sibling, sibling.inert]);
          sibling.inert = true;
        }
      }
    }
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const visibleControls = () => [...panel.querySelectorAll(focusableSelector)].filter((node) => node.getClientRects().length);
    const handleKey = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMobile();
      }
      if (event.key === 'Tab') {
        const controls = visibleControls();
        const first = controls[0];
        const last = controls.at(-1);
        if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) {
          event.preventDefault(); last?.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) {
          event.preventDefault(); first?.focus();
        }
      }
    };
    const keepFocus = (event) => { if (!panel.contains(event.target)) closeRef.current?.focus(); };
    document.addEventListener('keydown', handleKey);
    document.addEventListener('focusin', keepFocus);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('focusin', keepFocus);
      outside.forEach(([node, inert]) => { node.inert = inert; });
      document.body.style.overflow = overflow;
      if (opener?.isConnected) opener.focus();
    };
  }, [mobileOpen, closeMobile]);

  const handleLogout = () => {
    closeMobile();
    logout();
    navigate('/', { replace: true });
  };

  return (
    <div ref={rootRef} className={`lifeflow-navigation${collapsed ? ' is-collapsed' : ''}${mobileOpen ? ' is-open' : ''}`}>
      {mobileOpen && <div className="sidebar-backdrop" onClick={closeMobile} aria-hidden="true" />}
      <aside id="admin-sidebar" ref={panelRef} aria-label="Admin navigation"
        role={mobileOpen ? 'dialog' : undefined} aria-modal={mobileOpen ? true : undefined} className="lifeflow-sidebar">
        <div className="sidebar-heading">
          <NavLink to="/dashboard" title="LifeFlow Dashboard" aria-label="LifeFlow Dashboard" className="sidebar-brand" onClick={closeMobile}>
            <img className="sidebar-logo" src={logoMascot} alt="" width="44" height="44" aria-hidden="true" />
            <span className="sidebar-label"><span className="sidebar-wordmark">LifeFlow</span><span className="sidebar-subtitle">Admin</span></span>
          </NavLink>
          <button type="button" className="sidebar-toggle" onClick={toggleCollapsed} aria-controls="admin-sidebar"
            aria-expanded={!collapsed} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            {collapsed ? <ChevronRight size={16} aria-hidden="true" /> : <ChevronLeft size={16} aria-hidden="true" />}
          </button>
          <button ref={closeRef} type="button" onClick={closeMobile} className="sidebar-mobile-close" aria-label="Close navigation">
            <X size={22} aria-hidden="true" />
          </button>
        </div>

        <nav aria-label="Main navigation" className="sidebar-menu quiet-scroll">
          {['MAIN MENU', 'SYSTEM'].map((section) => {
            const entries = items.filter((item) => item.section === section);
            return entries.length > 0 && (
              <section key={section} className="sidebar-section" aria-label={section}>
                <h2 className="sidebar-section-title">{section}</h2>
                {entries.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink key={item.path} to={item.path} title={item.name} aria-label={item.name} onClick={closeMobile}
                      className={({ isActive }) => `sidebar-link${isActive ? ' is-active' : ''}`}>
                      <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
                      <span className="sidebar-label">{item.name}</span>
                    </NavLink>
                  );
                })}
              </section>
            );
          })}
        </nav>

        <div className="sidebar-user">
          <h2 className="sidebar-section-title">USER</h2>
          <div className="sidebar-profile" title={identity} aria-label={identity}>
            <span className="sidebar-avatar" aria-hidden="true">{avatar || <UserRound size={20} />}</span>
            <div className="sidebar-label sidebar-identity">
              <span className="sidebar-name">{name}</span>
              {currentAdmin?.email && <span className="sidebar-email">{currentAdmin.email}</span>}
              <span className="sidebar-role">{role === ADMIN_ROLES.SUPER_ADMIN ? 'Super Admin' : 'Admin'}</span>
            </div>
          </div>
          <div className="sidebar-logout">
            <button type="button" onClick={handleLogout} title="Logout" aria-label="Logout" className="sidebar-link">
              <LogOut size={20} strokeWidth={1.8} aria-hidden="true" />
              <span className="sidebar-label">Logout</span>
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

export default Sidebar;

import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header.js';
import { Sidebar } from './Sidebar.js';

export function Layout() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  function closeMobileSidebar() {
    setMobileSidebarOpen(false);
  }

  function toggleMobileSidebar() {
    setMobileSidebarOpen((current) => !current);
  }

  return (
    <div className="layout-root">
      <Header onMenuToggle={toggleMobileSidebar} />
      <div className="layout-body">
        <div className="layout-sidebar" data-open={mobileSidebarOpen}>
          <Sidebar onNavigate={closeMobileSidebar} />
        </div>
        {mobileSidebarOpen ? (
          <button
            aria-label="Close navigation"
            className="mobile-overlay"
            onClick={closeMobileSidebar}
            type="button"
          />
        ) : null}
        <main className="layout-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

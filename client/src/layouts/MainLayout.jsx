import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

const pageTitles = {
  '/dashboard':    'Dashboard',
  '/buildings':    'Building Management',
  '/stalls':       'Stall Management',
  '/owners':       'Stall Owners',
  '/payments':     'Payments & Collections',
  '/night-market': 'Night Market',
  '/reports':      'Reports & Ledgers',
  '/staff':        'Revenue Collector',
  '/settings':     'System Settings',
};

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const title = pageTitles[location.pathname] || 'SRMS';

  return (
    <div className="flex h-screen overflow-hidden bg-gov-paper">
      <Sidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar title={title} onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-3 md:p-5 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
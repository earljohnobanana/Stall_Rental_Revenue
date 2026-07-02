import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  MdDashboard, MdBusiness, MdStorefront, MdPeople,
  MdPayments, MdAssessment, MdSettings, MdLogout,
  MdManageAccounts, MdMenu, MdClose, MdNightlight
} from 'react-icons/md';

const navItems = [
  { to: '/dashboard',    icon: MdDashboard,    label: 'Dashboard' },
  { to: '/buildings',    icon: MdBusiness,     label: 'Buildings' },
  { to: '/stalls',       icon: MdStorefront,   label: 'Stalls' },
  { to: '/owners',       icon: MdPeople,       label: 'Stall Owners' },
  { to: '/payments',     icon: MdPayments,     label: 'Payments' },
  { to: '/night-market', icon: MdNightlight,   label: 'Night Market' },
  { to: '/reports',      icon: MdAssessment,   label: 'Reports' },
];

const adminItems = [
  { to: '/staff',    icon: MdManageAccounts, label: 'Revenue Collector' },
  { to: '/settings', icon: MdSettings,       label: 'Settings' },
];

export default function Sidebar({ mobileOpen, onClose }) {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleNavClick = () => {
    if (onClose) onClose();
  };

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={onClose} />
      )}

      <aside className={`
        fixed top-0 left-0 h-full z-40 w-64 bg-gov-navy flex flex-col shadow-xl
        transform transition-transform duration-300 ease-in-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0 lg:z-auto
      `}>
        <button onClick={onClose} className="absolute top-3 right-3 text-white/60 hover:text-white lg:hidden">
          <MdClose size={22} />
        </button>

        {/* Header */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-gov-gold flex items-center justify-center flex-shrink-0">
              <MdBusiness className="text-gov-navy text-lg" />
            </div>
            <div>
              <p className="text-gov-gold font-serif font-bold text-sm leading-tight">Treasurer's Office</p>
              <p className="text-white/50 text-xs">Revenue Monitoring</p>
            </div>
          </div>
          <div className="bg-white/5 rounded p-2">
            <p className="text-white/60 text-xs">Logged in as:</p>
            <p className="text-white font-semibold text-sm truncate">{user?.full_name}</p>
            <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-gov-gold text-gov-navy">
              {user?.role}
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          <p className="text-white/30 text-xs uppercase tracking-widest px-3 py-2">Main Menu</p>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} onClick={handleNavClick}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded text-sm font-sans transition-all ${
                  isActive ? 'bg-gov-gold text-gov-navy font-bold' : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon className="text-lg flex-shrink-0" />
              {label}
            </NavLink>
          ))}

          {isAdmin() && (
            <>
              <p className="text-white/30 text-xs uppercase tracking-widest px-3 py-2 mt-4">Administration</p>
              {adminItems.map(({ to, icon: Icon, label }) => (
                <NavLink key={to} to={to} onClick={handleNavClick}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded text-sm font-sans transition-all ${
                      isActive ? 'bg-gov-gold text-gov-navy font-bold' : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  <Icon className="text-lg flex-shrink-0" />
                  {label}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-white/10">
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm text-red-300 hover:bg-red-900/30 transition-colors">
            <MdLogout className="text-lg" />
            Logout
          </button>
          <p className="text-white/20 text-xs text-center mt-2 font-mono">SRMS v1.0.0</p>
        </div>
      </aside>
    </>
  );
}
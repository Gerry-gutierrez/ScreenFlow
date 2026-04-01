const fs = require('fs');
const path = require('path');

const files = {
  'src/components/Sidebar.jsx': `import { NavLink } from 'react-router-dom'
import { X, LayoutDashboard, CalendarClock, UserCheck, UserCog, Wrench, Users, Settings } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/appointments', icon: CalendarClock, label: 'Appointments' },
  { to: '/prospects', icon: Users, label: 'Active Prospects' },
  { to: '/sold-clients', icon: UserCheck, label: 'Sold Clients' },
  { to: '/services', icon: Wrench, label: 'Services' },
  { to: '/clients-settings', icon: UserCog, label: 'Clients Settings' },
]

export default function Sidebar({ isOpen, onClose }) {
  const { user } = useAuth()
  const [businessName, setBusinessName] = useState('ScreenFlow')

  useEffect(() => {
    if (user) {
      supabase
        .from('operator_profile')
        .select('business_name')
        .eq('user_id', user.id)
        .single()
        .then(({ data }) => {
          if (data?.business_name) setBusinessName(data.business_name)
        })
    }
  }, [user])

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 transition-opacity"
          onClick={onClose}
        />
      )}
      <aside
        className={\`fixed top-0 left-0 h-full w-72 bg-white z-50 shadow-xl transform transition-transform duration-300 ease-in-out flex flex-col \${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }\`}
      >
        <div className="flex items-center justify-between px-5 py-5 border-b border-border">
          <div>
            <h1 className="text-lg font-bold text-primary">ScreenFlow</h1>
            <p className="text-sm text-text-secondary">{businessName}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface active:scale-95 transition-transform">
            <X size={22} className="text-text-secondary" />
          </button>
        </div>
        <nav className="flex-1 py-3 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                \`flex items-center gap-3 px-5 py-3.5 text-sm font-medium transition-colors \${
                  isActive
                    ? 'bg-primary-light text-primary border-r-3 border-primary'
                    : 'text-text-primary hover:bg-surface'
                }\`
              }
            >
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-border">
          <NavLink
            to="/settings"
            onClick={onClose}
            className={({ isActive }) =>
              \`flex items-center gap-3 px-5 py-4 text-sm font-medium transition-colors \${
                isActive ? 'bg-primary-light text-primary' : 'text-text-secondary hover:bg-surface'
              }\`
            }
          >
            <Settings size={20} />
            <span>Settings</span>
          </NavLink>
        </div>
      </aside>
    </>
  )
}

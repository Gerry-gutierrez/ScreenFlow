import { useEffect, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { X, LayoutDashboard, Calendar, Users, Wrench, ChevronDown, LogOut } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const menuItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/appointments', icon: Calendar, label: 'Appointments' },
]

const clientSubItems = [
  { to: '/clients/active', label: 'Active' },
  { to: '/clients/completed', label: 'Completed' },
  { to: '/clients/lost', label: 'Lost' },
]

const bottomItems = [
  { to: '/services', icon: Wrench, label: 'Services' },
]

export default function Sidebar({ isOpen, onClose }) {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [businessName, setBusinessName] = useState('')
  const [clientsOpen, setClientsOpen] = useState(false)

  // Auto-expand clients submenu if on a clients route
  useEffect(() => {
    if (location.pathname.startsWith('/clients')) {
      setClientsOpen(true)
    }
  }, [location.pathname])

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

  const isClientsActive = location.pathname.startsWith('/clients')

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-50"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 left-0 bottom-0 w-72 bg-white z-50 flex flex-col shadow-xl transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border">
          <div>
            <h2 className="text-lg font-bold text-primary">ScreenFlow</h2>
            {businessName && (
              <p className="text-xs text-text-secondary mt-0.5">{businessName}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-surface"
          >
            <X size={20} />
          </button>
        </div>

        {/* Menu items */}
        <nav className="flex-1 py-2 overflow-y-auto">
          {menuItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-primary bg-primary-light'
                    : 'text-text-primary hover:bg-surface'
                }`
              }
            >
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          ))}

          {/* Clients with expandable submenu */}
          <button
            onClick={() => setClientsOpen(!clientsOpen)}
            className={`w-full flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors ${
              isClientsActive
                ? 'text-primary bg-primary-light'
                : 'text-text-primary hover:bg-surface'
            }`}
          >
            <Users size={20} />
            <span className="flex-1 text-left">Clients</span>
            <ChevronDown
              size={16}
              className={`transition-transform duration-200 ${clientsOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {clientsOpen && (
            <div className="ml-8 border-l border-border">
              {clientSubItems.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end
                  onClick={onClose}
                  className={({ isActive }) =>
                    `block pl-4 pr-5 py-2.5 text-xs font-medium transition-colors ${
                      isActive
                        ? 'text-primary bg-primary-light'
                        : 'text-text-secondary hover:bg-surface hover:text-text-primary'
                    }`
                  }
                >
                  {label}
                </NavLink>
              ))}
            </div>
          )}

          {bottomItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-primary bg-primary-light'
                    : 'text-text-primary hover:bg-surface'
                }`
              }
            >
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Log Out pinned at bottom */}
        <div className="border-t border-border">
          <button
            onClick={async () => { await signOut(); onClose(); navigate('/', { replace: true }) }}
            className="w-full flex items-center gap-3 px-5 py-3 text-sm font-medium text-text-secondary hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut size={20} />
            <span>Log Out</span>
          </button>
        </div>
      </div>
    </>
  )
}

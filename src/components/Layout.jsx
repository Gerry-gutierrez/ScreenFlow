import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, User, Search } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { formatPhone } from '../utils/formatPhone'
import Sidebar from './Sidebar'
import useSubscription from '../hooks/useSubscription'

export default function Layout({ children }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { loading: subLoading, subscriptionStatus, daysLeft, isActive } = useSubscription()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [businessName, setBusinessName] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef(null)

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

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const searchClients = async (query) => {
    setSearchQuery(query)
    if (!query.trim()) {
      setSearchResults([])
      setShowResults(false)
      return
    }
    const { data } = await supabase
      .from('clients')
      .select('id, name, phone')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .or(`name.ilike.%${query}%,phone.ilike.%${query}%,address.ilike.%${query}%`)
      .limit(5)
    setSearchResults(data || [])
    setShowResults(true)
  }

  const handleResultClick = (clientId) => {
    navigate(`/clients/${clientId}`)
    setSearchQuery('')
    setSearchResults([])
    setShowResults(false)
  }

  useEffect(() => {
    if (!subLoading && !isActive) {
      navigate('/paywall', { replace: true })
    }
  }, [subLoading, isActive, navigate])

  return (
    <div className="min-h-screen bg-white dark:bg-dark-bg">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-primary">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 -ml-1.5 rounded-lg hover:bg-white/10"
            >
              <Menu size={22} className="text-white" />
            </button>
            <div>
              <span className="text-lg font-bold text-white">ScreenFlow</span>
              {businessName && (
                <p className="text-xs text-white/70 -mt-1">{businessName}</p>
              )}
            </div>
          </div>
          <button
            onClick={() => navigate('/settings')}
            className="p-1.5 rounded-full hover:bg-white/10"
          >
            <User size={28} className="text-white" />
          </button>
        </div>

        {/* Search section */}
        <div className="px-4 pb-3" ref={searchRef}>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => searchClients(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowResults(true)}
              placeholder="Search clients..."
              className="w-full pl-9 pr-3 py-2.5 rounded-full text-sm bg-white border-none focus:outline-none focus:ring-2 focus:ring-white/30 text-text-primary"
            />

            {/* Search results dropdown */}
            {showResults && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-dark-card rounded-lg shadow-lg z-50 overflow-hidden border border-border dark:border-dark-border">
                {searchResults.map(client => (
                  <button
                    key={client.id}
                    onClick={() => handleResultClick(client.id)}
                    className="w-full text-left px-4 py-3 hover:bg-surface dark:hover:bg-dark-surface border-b border-border dark:border-dark-border last:border-b-0"
                  >
                    <p className="text-sm font-medium text-text-primary dark:text-dark-text">{client.name}</p>
                    {client.phone && (
                      <p className="text-xs text-text-secondary dark:text-dark-text-secondary">{formatPhone(client.phone)}</p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Trial banner */}
      {isActive && subscriptionStatus === 'trialing' && daysLeft !== null && (
        <div className="bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary-light text-center text-sm py-2 font-medium">
          🎉 {daysLeft} day{daysLeft !== 1 ? 's' : ''} left in your free trial
        </div>
      )}

      <main>
        {children}
      </main>

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
    </div>
  )
}

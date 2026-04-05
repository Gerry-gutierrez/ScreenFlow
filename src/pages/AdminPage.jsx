import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { supabase } from '../lib/supabase'
import { Trash2, Search, Shield, LogOut, Sun, Moon } from 'lucide-react'

export default function AdminPage() {
  const { user, signOut } = useAuth()
  const { darkMode, toggleDarkMode } = useTheme()
  const navigate = useNavigate()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [tab, setTab] = useState('all')
  const [metrics, setMetrics] = useState(null)

  useEffect(() => {
    checkAdmin()
  }, [user])

  const checkAdmin = async () => {
    if (!user) return
    const { data } = await supabase
      .from('operator_profile')
      .select('is_admin')
      .eq('user_id', user.id)
      .single()
    if (data?.is_admin) {
      setIsAdmin(true)
      fetchUsers()
      fetchMetrics()
    }
    setLoading(false)
  }

  const fetchMetrics = async () => {
    const { data } = await supabase
      .from('operator_profile')
      .select('created_at, subscription_status')
    if (!data) return

    const now = Date.now()
    const day = 24 * 60 * 60 * 1000

    const signupsWeek = data.filter(
      (r) => r.created_at && now - new Date(r.created_at).getTime() <= 7 * day
    ).length
    const signupsMonth = data.filter(
      (r) => r.created_at && now - new Date(r.created_at).getTime() <= 30 * day
    ).length

    // Last 8 weeks (week 0 = current week, going back)
    const weeks = []
    for (let i = 0; i < 8; i++) {
      const end = now - i * 7 * day
      const start = end - 7 * day
      const count = data.filter((r) => {
        if (!r.created_at) return false
        const t = new Date(r.created_at).getTime()
        return t > start && t <= end
      }).length
      const label =
        i === 0
          ? 'This week'
          : i === 1
          ? 'Last week'
          : `${i} weeks ago`
      weeks.push({ label, count })
    }

    // Conversion: active / (active+trial+expired+canceled)
    const convStatuses = ['active', 'trial', 'expired', 'canceled']
    const paid = data.filter((r) => r.subscription_status === 'active').length
    const convTotal = data.filter((r) =>
      convStatuses.includes(r.subscription_status)
    ).length
    const conversionRate =
      convTotal > 0 ? (paid / convTotal) * 100 : 0

    // Churn: canceled / (active+canceled)
    const canceled = data.filter(
      (r) => r.subscription_status === 'canceled'
    ).length
    const everPaid = data.filter((r) =>
      ['active', 'canceled'].includes(r.subscription_status)
    ).length
    const churnRate = everPaid > 0 ? (canceled / everPaid) * 100 : 0

    setMetrics({
      signupsWeek,
      signupsMonth,
      weeks,
      paid,
      convTotal,
      conversionRate,
      canceled,
      everPaid,
      churnRate,
    })
  }

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('operator_profile')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setUsers(data.filter(u => !u.is_admin))
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/', { replace: true })
  }

  const handleDelete = async (profile) => {
    const { error } = await supabase.rpc('delete_user_completely', {
      target_user_id: profile.user_id,
    })
    if (error) {
      alert('Error deleting user: ' + error.message)
      return
    }
    setDeleteConfirm(null)
    fetchUsers()
  }

  const getTrialDaysLeft = (trialStarted) => {
    if (!trialStarted) return 0
    const start = new Date(trialStarted)
    const end = new Date(start.getTime() + 14 * 24 * 60 * 60 * 1000)
    const now = new Date()
    const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24))
    return Math.max(0, diff)
  }

  const isUserActive = (profile) => {
    const status = profile.subscription_status || 'trial'
    if (status === 'active') return true
    const daysLeft = getTrialDaysLeft(profile.trial_started_at)
    return daysLeft > 0
  }

  const getStatusBadge = (profile) => {
    const status = profile.subscription_status || 'trial'
    if (status === 'active') return { label: 'Monthly Plan', bg: 'bg-green-100', text: 'text-green-700' }
    if (status === 'paused') return { label: 'Paused', bg: 'bg-red-100', text: 'text-red-700' }
    const daysLeft = getTrialDaysLeft(profile.trial_started_at)
    if (daysLeft > 0) return { label: `Free Trial (${daysLeft}d left)`, bg: 'bg-yellow-100', text: 'text-yellow-700' }
    return { label: 'Trial expired', bg: 'bg-red-100', text: 'text-red-700' }
  }

  if (loading) return <div className="p-6 text-text-secondary dark:text-dark-text-secondary">Loading...</div>
  if (!isAdmin) return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-dark-bg">
      <div className="text-center">
        <Shield size={48} className="mx-auto text-red-400 mb-4" />
        <h2 className="text-xl font-bold text-text-primary dark:text-dark-text mb-2">Access Denied</h2>
        <p className="text-text-secondary dark:text-dark-text-secondary">You don't have admin privileges.</p>
      </div>
    </div>
  )

  // Filter by search
  const searchFiltered = users.filter(u =>
    (u.business_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.phone || '').toLowerCase().includes(search.toLowerCase())
  )

  // Filter by tab
  const filtered = searchFiltered.filter(u => {
    if (tab === 'active') return isUserActive(u)
    if (tab === 'inactive') return !isUserActive(u)
    return true
  })

  const allCount = searchFiltered.length
  const activeCount = searchFiltered.filter(u => isUserActive(u)).length
  const inactiveCount = searchFiltered.filter(u => !isUserActive(u)).length

  const tabs = [
    { key: 'all', label: 'All', count: allCount },
    { key: 'active', label: 'Active', count: activeCount },
    { key: 'inactive', label: 'Inactive', count: inactiveCount },
  ]

  return (
    <div className="min-h-screen bg-white dark:bg-dark-bg">
      {/* Standalone admin header */}
      <header className="sticky top-0 z-40 bg-white dark:bg-dark-card border-b border-border dark:border-dark-border">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield size={20} className="text-primary" />
            <span className="text-lg font-bold text-primary">ScreenFlow Admin</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleDarkMode}
              className="p-1.5 rounded-lg hover:bg-surface dark:hover:bg-dark-bg text-text-secondary dark:text-dark-text-secondary"
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 text-sm text-text-secondary dark:text-dark-text-secondary hover:text-red-500 transition-colors"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="p-4 max-w-2xl mx-auto">
        {/* Appearance toggle */}
        <div className="bg-white dark:bg-dark-card border border-border dark:border-dark-border rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {darkMode ? <Moon size={18} className="text-primary" /> : <Sun size={18} className="text-primary" />}
              <h2 className="text-base font-semibold dark:text-dark-text">Appearance</h2>
            </div>
            <button
              onClick={toggleDarkMode}
              className={`relative w-14 h-7 rounded-full transition-colors duration-200 ${
                darkMode ? 'bg-primary' : 'bg-border dark:bg-dark-border'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform duration-200 flex items-center justify-center ${
                  darkMode ? 'translate-x-7' : 'translate-x-0'
                }`}
              >
                {darkMode ? <Moon size={14} className="text-primary" /> : <Sun size={14} className="text-amber-500" />}
              </span>
            </button>
          </div>
        </div>

        {/* Growth Metrics */}
        {metrics && (
          <div className="mb-6">
            <h2 className="text-xl font-bold text-text-primary dark:text-dark-text mb-3">Growth Metrics</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Signups */}
              <div className="bg-white dark:bg-dark-card border border-border dark:border-dark-border rounded-xl p-4">
                <h3 className="text-sm font-semibold text-text-secondary dark:text-dark-text-secondary mb-2">Signups</h3>
                <div className="flex items-baseline gap-4 mb-3">
                  <div>
                    <div className="text-2xl font-bold text-text-primary dark:text-dark-text">{metrics.signupsWeek}</div>
                    <div className="text-xs text-text-secondary dark:text-dark-text-secondary">This week</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-text-primary dark:text-dark-text">{metrics.signupsMonth}</div>
                    <div className="text-xs text-text-secondary dark:text-dark-text-secondary">This month</div>
                  </div>
                </div>
                <div className="border-t border-border dark:border-dark-border pt-2 space-y-1">
                  {metrics.weeks.map((w, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="text-text-secondary dark:text-dark-text-secondary">{w.label}</span>
                      <span className="font-medium text-text-primary dark:text-dark-text">{w.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Conversion Rate */}
              <div className="bg-white dark:bg-dark-card border border-border dark:border-dark-border rounded-xl p-4">
                <h3 className="text-sm font-semibold text-text-secondary dark:text-dark-text-secondary mb-2">Conversion Rate</h3>
                <div className="text-4xl font-bold text-primary mb-1">{metrics.conversionRate.toFixed(1)}%</div>
                <div className="text-xs text-text-secondary dark:text-dark-text-secondary">
                  {metrics.paid} paid / {metrics.convTotal} total
                </div>
              </div>

              {/* Churn Rate */}
              <div className="bg-white dark:bg-dark-card border border-border dark:border-dark-border rounded-xl p-4">
                <h3 className="text-sm font-semibold text-text-secondary dark:text-dark-text-secondary mb-2">Churn Rate</h3>
                <div className="text-4xl font-bold text-red-500 mb-1">{metrics.churnRate.toFixed(1)}%</div>
                <div className="text-xs text-text-secondary dark:text-dark-text-secondary">
                  {metrics.canceled} canceled / {metrics.everPaid} ever-paid
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Users heading */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-text-primary dark:text-dark-text">Users</h1>
          <span className="text-sm text-text-secondary dark:text-dark-text-secondary">{filtered.length} users</span>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t.key
                  ? 'bg-primary text-white'
                  : 'bg-surface dark:bg-dark-card text-text-secondary dark:text-dark-text-secondary'
              }`}
            >
              {t.label} ({t.count})
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary dark:text-dark-text-secondary" />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-border dark:border-dark-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white dark:bg-dark-card dark:text-dark-text"
          />
        </div>

        {/* User list */}
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
              {search ? 'No users match your search.' : tab === 'active' ? 'No active users.' : tab === 'inactive' ? 'No inactive users.' : 'No users yet.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((profile) => {
              const badge = getStatusBadge(profile)
              const active = isUserActive(profile)
              return (
                <div key={profile.id} className="bg-white dark:bg-dark-card border border-border dark:border-dark-border rounded-xl p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-text-primary dark:text-dark-text">{profile.business_name || 'No name'}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.bg} ${badge.text}`}>
                          {badge.label}
                        </span>
                      </div>
                      <p className="text-sm text-text-secondary dark:text-dark-text-secondary">{profile.email}</p>
                      {profile.phone && <p className="text-sm text-text-secondary dark:text-dark-text-secondary">{profile.phone}</p>}
                      <div className="flex items-center gap-3 mt-1">
                        <p className="text-xs text-text-secondary dark:text-dark-text-secondary">
                          Joined {new Date(profile.created_at).toLocaleDateString()}
                        </p>
                        {profile.updated_at && (
                          <p className="text-xs text-text-secondary dark:text-dark-text-secondary">
                            Last active {new Date(profile.updated_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setDeleteConfirm(profile)}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {deleteConfirm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-dark-card rounded-xl p-6 max-w-sm w-full">
              <h3 className="font-bold text-text-primary dark:text-dark-text mb-2">Delete Account</h3>
              <p className="text-sm text-text-secondary dark:text-dark-text-secondary mb-4">
                Are you sure you want to delete <strong>{deleteConfirm.business_name || deleteConfirm.email}</strong>? This will permanently remove the user and all their data.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-2 border border-border dark:border-dark-border rounded-xl text-sm font-medium hover:bg-surface dark:hover:bg-dark-bg dark:text-dark-text"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="flex-1 py-2 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

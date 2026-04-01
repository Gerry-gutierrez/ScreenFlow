import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Trash2, Search, Shield, LogOut } from 'lucide-react'

export default function AdminPage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)

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
    }
    setLoading(false)
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

  const filtered = users.filter(u =>
    (u.business_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.phone || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-white dark:bg-dark-bg">
      {/* Standalone admin header */}
      <header className="sticky top-0 z-40 bg-white dark:bg-dark-card border-b border-border dark:border-dark-border">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield size={20} className="text-primary" />
            <span className="text-lg font-bold text-primary">ScreenFlow Admin</span>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 text-sm text-text-secondary dark:text-dark-text-secondary hover:text-red-500 transition-colors"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </header>

      <div className="p-4 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-text-primary dark:text-dark-text">Users</h1>
          <span className="text-sm text-text-secondary dark:text-dark-text-secondary">{filtered.length} users</span>
        </div>

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

        <div className="space-y-3">
          {filtered.map((profile) => {
            const badge = getStatusBadge(profile)
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
                    <p className="text-xs text-text-secondary dark:text-dark-text-secondary mt-1">
                      Joined {new Date(profile.created_at).toLocaleDateString()}
                    </p>
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

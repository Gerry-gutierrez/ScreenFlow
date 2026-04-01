import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Phone, Clock, Plus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import AddJobModal from '../components/AddJobModal'

const jobTypeLabels = {
  rescreen: 'Rescreen',
  repair: 'Repair',
  new_enclosure: 'New Enclosure',
  frame_painting: 'Frame Painting',
  other: 'Other',
}

const formatPrice = (price) => {
  if (!price) return null
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(price)
}

const formatTime = (dateStr) => {
  if (!dateStr) return null
  const d = new Date(dateStr)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [todayJobs, setTodayJobs] = useState([])
  const [quotedJobs, setQuotedJobs] = useState([])
  const [stats, setStats] = useState({ activeJobs: 0, quotedRevenue: 0, completedThisWeek: 0, conversionRate: 0 })
  const [loading, setLoading] = useState(true)
  const [showAddJob, setShowAddJob] = useState(false)

  useEffect(() => {
    if (user) fetchData()
  }, [user])

  const fetchData = async () => {
    setLoading(true)
    const today = new Date().toISOString().split('T')[0]

    const [todayRes, quotedRes, allJobsRes] = await Promise.all([
      supabase
        .from('jobs')
        .select('*, clients(name, phone)')
        .eq('user_id', user.id)
        .eq('status', 'scheduled')
        .eq('scheduled_date', today)
        .order('scheduled_date', { ascending: true }),
      supabase
        .from('jobs')
        .select('*, clients(name, phone)')
        .eq('user_id', user.id)
        .eq('status', 'quoted')
        .is('scheduled_date', null)
        .order('created_at', { ascending: false }),
      supabase
        .from('jobs')
        .select('id, status, price, created_at, updated_at')
        .eq('user_id', user.id),
    ])

    setTodayJobs(todayRes.data || [])
    setQuotedJobs(quotedRes.data || [])

    const allJobs = allJobsRes.data || []
    const activeJobs = allJobs.filter(j => j.status !== 'done').length
    const quotedRevenue = allJobs
      .filter(j => j.status === 'quoted' && j.price)
      .reduce((sum, j) => sum + (j.price || 0), 0)
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const completedThisWeek = allJobs.filter(j => j.status === 'done' && j.updated_at >= weekAgo).length
    const totalJobs = allJobs.length
    const doneJobs = allJobs.filter(j => j.status === 'done').length
    const conversionRate = totalJobs > 0 ? Math.round((doneJobs / totalJobs) * 100) : 0

    setStats({ activeJobs, quotedRevenue, completedThisWeek, conversionRate })
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="px-4 pt-4 pb-8">
      <h1 className="text-xl font-bold mb-4 dark:text-dark-text">Dashboard</h1>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white dark:bg-dark-card border border-border dark:border-dark-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-primary">{stats.activeJobs}</p>
          <p className="text-xs text-text-secondary dark:text-dark-text-secondary mt-1">Active Jobs</p>
        </div>
        <div className="bg-white dark:bg-dark-card border border-border dark:border-dark-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-primary">{formatPrice(stats.quotedRevenue) || '$0'}</p>
          <p className="text-xs text-text-secondary dark:text-dark-text-secondary mt-1">Quoted Revenue</p>
        </div>
        <div className="bg-white dark:bg-dark-card border border-border dark:border-dark-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-primary">{stats.completedThisWeek}</p>
          <p className="text-xs text-text-secondary dark:text-dark-text-secondary mt-1">Completed This Week</p>
        </div>
        <div className="bg-white dark:bg-dark-card border border-border dark:border-dark-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-primary">{stats.conversionRate}%</p>
          <p className="text-xs text-text-secondary dark:text-dark-text-secondary mt-1">Active → Done</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Appointments Today */}
        <div onClick={() => navigate('/appointments')} className="bg-white dark:bg-dark-card border border-border dark:border-dark-border rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={18} className="text-primary" />
            <h2 className="text-base font-semibold dark:text-dark-text">Appointments Today</h2>
          </div>

          {todayJobs.length === 0 ? (
            <p className="text-sm text-text-secondary dark:text-dark-text-secondary py-4">No appointments today</p>
          ) : (
            <div className="space-y-3">
              {todayJobs.map(job => (
                <div
                  key={job.id}
                  onClick={() => navigate(`/jobs/${job.id}`)}
                  className="border border-border dark:border-dark-border rounded-lg p-3 active:bg-surface dark:active:bg-dark-bg cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {job.scheduled_date && (
                        <p className="text-xs font-medium text-primary mb-1">
                          {formatTime(job.scheduled_date.includes('T') ? job.scheduled_date : job.scheduled_date + 'T' + (job.scheduled_time || '00:00'))}
                        </p>
                      )}
                      <p className="font-semibold text-sm truncate dark:text-dark-text">{job.clients?.name || 'Unknown'}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-text-secondary dark:text-dark-text-secondary">{jobTypeLabels[job.job_type] || job.job_type}</span>
                        {job.price && <span className="text-xs font-medium dark:text-dark-text">{formatPrice(job.price)}</span>}
                      </div>
                    </div>
                    {job.clients?.phone && (
                      <a
                        href={`tel:${job.clients.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="w-9 h-9 flex items-center justify-center rounded-full bg-primary/10 text-primary shrink-0"
                      >
                        <Phone size={16} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quoted - Waiting on Apt */}
        <div onClick={() => navigate('/clients/active')} className="bg-white dark:bg-dark-card border border-border dark:border-dark-border rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2.5 h-2.5 rounded-full bg-quoted-text" />
            <h2 className="text-base font-semibold dark:text-dark-text">Quoted - Waiting on Apt</h2>
          </div>

          {quotedJobs.length === 0 ? (
            <p className="text-sm text-text-secondary dark:text-dark-text-secondary py-4">No clients waiting</p>
          ) : (
            <div className="space-y-3">
              {quotedJobs.map(job => (
                <div
                  key={job.id}
                  onClick={(e) => { e.stopPropagation(); navigate(`/clients/${job.client_id}`) }}
                  className="border border-border dark:border-dark-border rounded-lg p-3 active:bg-surface dark:active:bg-dark-bg cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate dark:text-dark-text">{job.clients?.name || 'Unknown'}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-text-secondary dark:text-dark-text-secondary">{jobTypeLabels[job.job_type] || job.job_type}</span>
                        {job.price && <span className="text-xs font-medium dark:text-dark-text">{formatPrice(job.price)}</span>}
                      </div>
                    </div>
                    {job.clients?.phone && (
                      <a
                        href={`tel:${job.clients.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="w-9 h-9 flex items-center justify-center rounded-full bg-primary/10 text-primary shrink-0"
                      >
                        <Phone size={16} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* New Prospect FAB */}
      <button
        onClick={() => setShowAddJob(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-primary text-white rounded-full shadow-lg flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-transform z-50"
      >
        <Plus size={24} />
      </button>

      <AddJobModal
        isOpen={showAddJob}
        onClose={() => setShowAddJob(false)}
        onJobAdded={() => fetchData()}
      />
    </div>
  )
}

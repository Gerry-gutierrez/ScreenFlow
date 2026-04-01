import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import JobCard from '../components/JobCard'
import AddJobModal from '../components/AddJobModal'

const statuses = [
  { key: 'lead', label: 'Lead' },
  { key: 'quoted', label: 'Quoted' },
  { key: 'approved', label: 'Approved' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'done', label: 'Done' },
]

const statusColors = {
  lead: 'bg-lead-bg text-lead-text',
  quoted: 'bg-quoted-bg text-quoted-text',
  approved: 'bg-approved-bg text-approved-text',
  scheduled: 'bg-scheduled-bg text-scheduled-text',
  in_progress: 'bg-in_progress-bg text-in_progress-text',
  done: 'bg-done-bg text-done-text',
}

export default function Pipeline() {
  const { user } = useAuth()
  const [jobs, setJobs] = useState([])
  const [activeStatus, setActiveStatus] = useState('lead')
  const [loading, setLoading] = useState(true)
  const [showAddJob, setShowAddJob] = useState(false)

  useEffect(() => {
    if (user) fetchJobs()
  }, [user])

  const fetchJobs = async () => {
    setLoading(true)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data, error } = await supabase
      .from('jobs')
      .select('*, clients(name, phone, address)')
      .eq('user_id', user.id)
      .or(`status.neq.done,created_at.gte.${thirtyDaysAgo.toISOString()}`)
      .order('scheduled_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })

    if (!error) setJobs(data || [])
    setLoading(false)
  }

  const jobsByStatus = statuses.reduce((acc, s) => {
    acc[s.key] = jobs.filter(j => j.status === s.key)
    return acc
  }, {})

  const filteredJobs = jobsByStatus[activeStatus] || []

  return (
    <div className="px-4 pt-4">
      <h1 className="text-xl font-bold mb-4">Pipeline</h1>

      {/* Status tabs */}
      <div className="flex gap-2 overflow-x-auto pb-3 -mx-4 px-4 scrollbar-hide">
        {statuses.map(s => {
          const count = jobsByStatus[s.key]?.length || 0
          const isActive = activeStatus === s.key
          return (
            <button
              key={s.key}
              onClick={() => setActiveStatus(s.key)}
              className={`shrink-0 px-3 py-2 rounded-full text-sm font-medium transition-all ${
                isActive
                  ? statusColors[s.key]
                  : 'bg-surface text-text-secondary'
              }`}
            >
              {s.label} {count > 0 && `(${count})`}
            </button>
          )
        })}
      </div>

      {/* Job list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-text-secondary text-sm">
            {activeStatus === 'lead'
              ? 'No leads yet. Tap + to add your first lead.'
              : `No ${statuses.find(s => s.key === activeStatus)?.label.toLowerCase()} jobs.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3 mt-2">
          {filteredJobs.map(job => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setShowAddJob(true)}
        className="fixed bottom-20 right-4 w-14 h-14 bg-primary text-white rounded-full shadow-lg flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-transform z-40"
      >
        <Plus size={24} />
      </button>

      <AddJobModal
        isOpen={showAddJob}
        onClose={() => setShowAddJob(false)}
        onJobAdded={() => fetchJobs()}
      />
    </div>
  )
}

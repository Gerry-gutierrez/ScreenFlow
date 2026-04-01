import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import JobCard from '../components/JobCard'
import AddJobModal from '../components/AddJobModal'

const statuses = [
  { key: 'lead', label: 'Prospect', border: 'border-lead-text', bg: 'bg-lead-bg', text: 'text-lead-text' },
  { key: 'quoted', label: 'Quoted', border: 'border-quoted-text', bg: 'bg-quoted-bg', text: 'text-quoted-text' },
  { key: 'scheduled', label: 'Scheduled', border: 'border-scheduled-text', bg: 'bg-scheduled-bg', text: 'text-scheduled-text' },
  { key: 'done', label: 'Done', border: 'border-done-text', bg: 'bg-done-bg', text: 'text-done-text' },
]

export default function ActiveProspects() {
  const { user } = useAuth()
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddJob, setShowAddJob] = useState(false)

  useEffect(() => {
    if (user) fetchJobs()
  }, [user])

  const fetchJobs = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('jobs')
      .select('*, clients(name, phone, address)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (!error) setJobs(data || [])
    setLoading(false)
  }

  const jobsByStatus = statuses.reduce((acc, s) => {
    acc[s.key] = jobs.filter(j => j.status === s.key)
    return acc
  }, {})

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="px-4 pt-4 pb-24">
      <h1 className="text-xl font-bold mb-4">Active Prospects</h1>

      <div className="space-y-6">
        {statuses.map(s => {
          const sectionJobs = jobsByStatus[s.key] || []
          return (
            <div key={s.key} className={`border-l-4 ${s.border} pl-3`}>
              {/* Status header */}
              <div className="flex items-center gap-2 mb-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
                  {s.label}
                </span>
                <span className="text-xs text-text-secondary">({sectionJobs.length})</span>
              </div>

              {/* Jobs in this status */}
              {sectionJobs.length === 0 ? (
                <p className="text-sm text-text-secondary py-2">No jobs</p>
              ) : (
                <div className="space-y-2">
                  {sectionJobs.map(job => (
                    <JobCard key={job.id} job={job} />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowAddJob(true)}
        className="fixed bottom-6 right-4 w-14 h-14 bg-primary text-white rounded-full shadow-lg flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-transform z-40"
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

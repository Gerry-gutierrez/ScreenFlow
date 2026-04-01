import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Phone, Mail, MapPin } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const sortOptions = [
  { value: 'name', label: 'Name' },
  { value: 'last_name', label: 'Last Name' },
  { value: 'phone', label: 'Phone Number' },
  { value: 'email', label: 'Email' },
  { value: 'date', label: 'Date Range' },
  { value: 'job', label: 'Job' },
]

export default function SoldClients() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState('name')

  useEffect(() => {
    if (user) fetchSoldClients()
  }, [user])

  const fetchSoldClients = async () => {
    setLoading(true)

    // Get all jobs with status 'done' to find their client IDs
    const { data: doneJobs } = await supabase
      .from('jobs')
      .select('client_id, job_type')
      .eq('user_id', user.id)
      .eq('status', 'done')

    if (!doneJobs || doneJobs.length === 0) {
      setClients([])
      setLoading(false)
      return
    }

    const clientIds = [...new Set(doneJobs.map(j => j.client_id))]

    const { data: clientData } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', user.id)
      .in('id', clientIds)

    // Attach the job types to each client for sorting
    const enriched = (clientData || []).map(c => {
      const jobTypes = doneJobs.filter(j => j.client_id === c.id).map(j => j.job_type)
      return { ...c, jobTypes }
    })

    setClients(enriched)
    setLoading(false)
  }

  const getLastName = (name) => {
    if (!name) return ''
    const parts = name.trim().split(' ')
    return parts.length > 1 ? parts[parts.length - 1] : parts[0]
  }

  const sortedClients = [...clients].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return (a.name || '').localeCompare(b.name || '')
      case 'last_name':
        return getLastName(a.name).localeCompare(getLastName(b.name))
      case 'phone':
        return (a.phone || '').localeCompare(b.phone || '')
      case 'email':
        return (a.email || '').localeCompare(b.email || '')
      case 'date':
        return new Date(b.created_at) - new Date(a.created_at)
      case 'job':
        return ((a.jobTypes || [])[0] || '').localeCompare(((b.jobTypes || [])[0] || ''))
      default:
        return 0
    }
  })

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
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
      <h1 className="text-xl font-bold mb-4">Sold Clients</h1>

      {/* Sort dropdown */}
      <div className="mb-4">
        <label className="text-xs font-medium text-text-secondary mr-2">Sort by:</label>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-3 py-2 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          {sortOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {sortedClients.length === 0 ? (
        <p className="text-sm text-text-secondary py-4">No sold clients yet</p>
      ) : (
        <div className="space-y-3">
          {sortedClients.map(client => (
            <div
              key={client.id}
              onClick={() => navigate(`/clients/${client.id}`)}
              className="bg-white border border-border rounded-xl p-4 active:bg-surface cursor-pointer"
            >
              <p className="font-semibold text-sm">{client.name}</p>

              <div className="mt-2 space-y-1">
                {client.phone && (
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="text-text-secondary shrink-0" />
                    <a
                      href={`tel:${client.phone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-primary"
                    >
                      {client.phone}
                    </a>
                  </div>
                )}
                {client.email && (
                  <div className="flex items-center gap-2">
                    <Mail size={14} className="text-text-secondary shrink-0" />
                    <span className="text-xs text-text-secondary truncate">{client.email}</span>
                  </div>
                )}
                {client.address && (
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-text-secondary shrink-0" />
                    <span className="text-xs text-text-secondary truncate">{client.address}</span>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-text-secondary mt-2">
                Client since {formatDate(client.created_at)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

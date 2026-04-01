import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Phone } from 'lucide-react'
import { supabase } from '../lib/supabase'
import StatusBadge from './StatusBadge'

const statusOrder = ['lead', 'quoted', 'scheduled', 'done']

const jobTypeLabels = {
  rescreen: 'Rescreen',
  repair: 'Repair',
  new_enclosure: 'New Enclosure',
  frame_painting: 'Frame Painting',
  other: 'Other',
}

export default function JobCard({ job }) {
  const navigate = useNavigate()
  const [currentStatus, setCurrentStatus] = useState(job.status)

  const cycleStatus = async (e) => {
    e.stopPropagation()
    const currentIndex = statusOrder.indexOf(currentStatus)
    const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length]
    setCurrentStatus(nextStatus)
    await supabase
      .from('jobs')
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq('id', job.id)
  }

  const formatPrice = (price) => {
    if (!price) return null
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(price)
  }

  const formatDate = (date) => {
    if (!date) return null
    return new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div
      onClick={() => navigate(`/jobs/${job.id}`)}
      className="bg-white border border-border rounded-xl p-4 active:bg-surface transition-colors cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-text-primary truncate">{job.clients?.name || 'Unknown Client'}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-text-secondary">{jobTypeLabels[job.job_type] || job.job_type}</span>
            {job.price && (
              <span className="text-sm font-medium text-text-primary">{formatPrice(job.price)}</span>
            )}
          </div>
          {job.scheduled_date && (
            <p className="text-xs text-text-secondary mt-1">{formatDate(job.scheduled_date)}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={cycleStatus} className="shrink-0">
            <StatusBadge status={currentStatus} />
          </button>
          {job.clients?.phone && (
            <a
              href={`tel:${job.clients.phone}`}
              onClick={(e) => e.stopPropagation()}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-primary/10 text-primary"
            >
              <Phone size={18} />
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

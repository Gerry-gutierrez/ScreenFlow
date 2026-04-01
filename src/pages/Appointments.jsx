import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { List, Calendar, ChevronLeft, ChevronRight, Phone, Pencil } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

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

const getDatePart = (dateStr) => {
  if (!dateStr) return ''
  return dateStr.includes('T') ? dateStr.split('T')[0] : dateStr
}

const formatDateLong = (dateStr) => {
  if (!dateStr) return ''
  const datePart = getDatePart(dateStr)
  const d = new Date(datePart + 'T00:00:00')
  const day = d.getDate()
  const suffix = day === 1 || day === 21 || day === 31 ? 'st' : day === 2 || day === 22 ? 'nd' : day === 3 || day === 23 ? 'rd' : 'th'
  const month = d.toLocaleDateString('en-US', { month: 'long' })
  const year = d.getFullYear()
  return `${month} ${day}${suffix}, ${year}`
}

export default function Appointments() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [view, setView] = useState('row')
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)

  // Calendar state
  const now = new Date()
  const [calMonth, setCalMonth] = useState(now.getMonth())
  const [calYear, setCalYear] = useState(now.getFullYear())
  const [expandedDate, setExpandedDate] = useState(null)

  useEffect(() => {
    if (user) fetchJobs()
  }, [user])

  const fetchJobs = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('jobs')
      .select('*, clients(name, phone, address)')
      .eq('user_id', user.id)
      .eq('status', 'scheduled')
      .order('scheduled_date', { ascending: true })
    setJobs(data || [])
    setLoading(false)
  }

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) }
    else setCalMonth(m => m - 1)
    setExpandedDate(null)
  }

  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) }
    else setCalMonth(m => m + 1)
    setExpandedDate(null)
  }

  // Build calendar grid
  const firstDay = new Date(calYear, calMonth, 1).getDay()
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
  const monthName = new Date(calYear, calMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const todayStr = new Date().toISOString().split('T')[0]

  // Group jobs by date for calendar
  const jobsByDate = {}
  jobs.forEach(job => {
    if (job.scheduled_date) {
      const datePart = getDatePart(job.scheduled_date)
      if (!jobsByDate[datePart]) jobsByDate[datePart] = []
      jobsByDate[datePart].push(job)
    }
  })

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="px-4 pt-4 pb-8">
      <h1 className="text-xl font-bold mb-4 dark:text-dark-text">Appointments</h1>

      {/* View toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setView('row')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            view === 'row' ? 'bg-primary text-white' : 'bg-surface dark:bg-dark-card text-text-secondary dark:text-dark-text-secondary'
          }`}
        >
          <List size={16} /> Row View
        </button>
        <button
          onClick={() => setView('calendar')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            view === 'calendar' ? 'bg-primary text-white' : 'bg-surface dark:bg-dark-card text-text-secondary dark:text-dark-text-secondary'
          }`}
        >
          <Calendar size={16} /> Calendar View
        </button>
      </div>

      {view === 'row' ? (
        /* ROW VIEW */
        jobs.length === 0 ? (
          <p className="text-sm text-text-secondary dark:text-dark-text-secondary py-4">No scheduled appointments</p>
        ) : (
          <div className="space-y-2">
            {jobs.map(job => (
              <div
                key={job.id}
                onClick={() => navigate(`/jobs/${job.id}`)}
                className="bg-white dark:bg-dark-card border border-border dark:border-dark-border rounded-xl p-4 active:bg-surface dark:active:bg-dark-bg cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate dark:text-dark-text">{job.clients?.name || 'Unknown'}</p>
                    {job.clients?.address && (
                      <p className="text-xs text-text-secondary dark:text-dark-text-secondary mt-0.5 truncate">{job.clients.address}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                      <span className="text-xs text-primary font-medium">{formatDateLong(job.scheduled_date)}</span>
                      <span className="text-xs text-text-secondary dark:text-dark-text-secondary">{jobTypeLabels[job.job_type] || job.job_type}</span>
                      {job.price && <span className="text-xs font-medium dark:text-dark-text">{formatPrice(job.price)}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/jobs/${job.id}`) }}
                      className="w-9 h-9 flex items-center justify-center rounded-full bg-surface dark:bg-dark-bg text-text-secondary dark:text-dark-text-secondary hover:text-primary"
                    >
                      <Pencil size={14} />
                    </button>
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
              </div>
            ))}
          </div>
        )
      ) : (
        /* CALENDAR VIEW */
        <div className="bg-white dark:bg-dark-card border border-border dark:border-dark-border rounded-xl overflow-hidden">
          {/* Month navigation */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border dark:border-dark-border">
            <button onClick={prevMonth} className="p-1 rounded hover:bg-surface dark:hover:bg-dark-bg dark:text-dark-text">
              <ChevronLeft size={20} />
            </button>
            <h3 className="font-semibold text-sm dark:text-dark-text">{monthName}</h3>
            <button onClick={nextMonth} className="p-1 rounded hover:bg-surface dark:hover:bg-dark-bg dark:text-dark-text">
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-border dark:border-dark-border">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="text-center text-xs font-medium text-text-secondary dark:text-dark-text-secondary py-2">{d}</div>
            ))}
          </div>

          {/* Calendar cells */}
          <div className="grid grid-cols-7">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[60px] border-b border-r border-border dark:border-dark-border" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const dayJobs = jobsByDate[dateStr] || []
              const isToday = dateStr === todayStr
              const isExpanded = expandedDate === dateStr

              return (
                <div
                  key={day}
                  onClick={() => dayJobs.length > 0 && setExpandedDate(isExpanded ? null : dateStr)}
                  className={`min-h-[60px] border-b border-r border-border dark:border-dark-border p-1 ${
                    dayJobs.length > 0 ? 'cursor-pointer hover:bg-surface dark:hover:bg-dark-bg' : ''
                  } ${isToday ? 'bg-primary-light dark:bg-primary/20' : ''}`}
                >
                  <span className={`text-xs font-medium ${isToday ? 'text-primary' : 'text-text-primary dark:text-dark-text'}`}>{day}</span>
                  {dayJobs.length === 1 && (
                    <>
                      <p className="text-[10px] text-primary truncate leading-tight mt-0.5">{dayJobs[0].clients?.name}</p>
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mx-auto mt-0.5" />
                    </>
                  )}
                  {dayJobs.length === 2 && (
                    <>
                      {dayJobs.map(j => (
                        <p key={j.id} className="text-[10px] text-primary truncate leading-tight mt-0.5">{j.clients?.name}</p>
                      ))}
                      <div className="flex justify-center gap-0.5 mt-0.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      </div>
                    </>
                  )}
                  {dayJobs.length > 2 && (
                    <>
                      <p className="text-[10px] text-primary truncate leading-tight mt-0.5">{dayJobs[0].clients?.name}</p>
                      <p className="text-[10px] text-primary font-medium text-center">{dayJobs.length} jobs</p>
                    </>
                  )}
                </div>
              )
            })}
          </div>

          {/* Expanded date details */}
          {expandedDate && jobsByDate[expandedDate] && (
            <div className="border-t border-border dark:border-dark-border p-3 bg-surface dark:bg-dark-bg">
              <p className="text-xs font-semibold text-text-secondary dark:text-dark-text-secondary mb-2">{formatDateLong(expandedDate)}</p>
              <div className="space-y-2">
                {jobsByDate[expandedDate].map(job => (
                  <div
                    key={job.id}
                    onClick={() => navigate(`/jobs/${job.id}`)}
                    className="bg-white dark:bg-dark-card border border-border dark:border-dark-border rounded-lg p-3 active:bg-surface dark:active:bg-dark-bg cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate dark:text-dark-text">{job.clients?.name || 'Unknown'}</p>
                        {job.clients?.address && (
                          <p className="text-xs text-text-secondary dark:text-dark-text-secondary truncate">{job.clients.address}</p>
                        )}
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
            </div>
          )}
        </div>
      )}
    </div>
  )
}

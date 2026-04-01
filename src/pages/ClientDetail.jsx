import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Phone, Mail, MapPin, Plus, UserX, UserCheck, Trash2, MessageSquare, Send, Pencil, X, Camera } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import StatusBadge from '../components/StatusBadge'
import { formatPhone } from '../utils/formatPhone'
import AddJobModal from '../components/AddJobModal'

const jobTypeLabels = {
  rescreen: 'Rescreen',
  repair: 'Repair',
  new_enclosure: 'New Enclosure',
  frame_painting: 'Frame Painting',
  other: 'Other',
}

const statuses = [
  { key: 'lead', label: 'Prospect' },
  { key: 'quoted', label: 'Quoted' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'done', label: 'Done' },
]

const statusColors = {
  lead: { bg: 'bg-lead-bg', text: 'text-lead-text', ring: 'ring-lead-text' },
  quoted: { bg: 'bg-quoted-bg', text: 'text-quoted-text', ring: 'ring-quoted-text' },
  scheduled: { bg: 'bg-scheduled-bg', text: 'text-scheduled-text', ring: 'ring-scheduled-text' },
  done: { bg: 'bg-done-bg', text: 'text-done-text', ring: 'ring-done-text' },
}

export default function ClientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [client, setClient] = useState(null)
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showAddJob, setShowAddJob] = useState(false)
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [selectedJob, setSelectedJob] = useState(null)
  const [events, setEvents] = useState([])
  const [newNote, setNewNote] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [clientPhotos, setClientPhotos] = useState([])
  const [viewingClientPhoto, setViewingClientPhoto] = useState(null)

  // Client editable fields (used by edit modal)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')

  // Job modal fields
  const [jmStatus, setJmStatus] = useState('lead')
  const [jmJobType, setJmJobType] = useState('')
  const [jmScreenType, setJmScreenType] = useState('')
  const [jmPanelCount, setJmPanelCount] = useState('')
  const [jmPrice, setJmPrice] = useState('')
  const [jmScheduledDate, setJmScheduledDate] = useState('')
  const [jmNotes, setJmNotes] = useState('')
  const [jmChanged, setJmChanged] = useState(false)
  const [jmSaving, setJmSaving] = useState(false)
  const [jmPhotos, setJmPhotos] = useState([])
  const [jmUploading, setJmUploading] = useState(false)
  const [jmViewingPhoto, setJmViewingPhoto] = useState(null)

  useEffect(() => {
    if (user && id) fetchData()
  }, [user, id])

  const fetchData = async () => {
    setLoading(true)

    const [clientRes, jobsRes, eventsRes] = await Promise.all([
      supabase.from('clients').select('*').eq('id', id).eq('user_id', user.id).single(),
      supabase.from('jobs').select('*').eq('client_id', id).eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('client_events').select('*').eq('client_id', id).order('created_at', { ascending: false }),
    ])

    if (clientRes.data) {
      const c = clientRes.data
      setClient(c)
      setName(c.name || '')
      setPhone(c.phone || '')
      setEmail(c.email || '')
      setAddress(c.address || '')
      setNotes(c.notes || '')
    }

    const fetchedJobs = jobsRes.data || []
    const fetchedEvents = eventsRes.data || []
    setJobs(fetchedJobs)

    // One-time migration: fix old "Job status changed to scheduled" entries
    // to include the actual appointment date/time
    const staleEvents = fetchedEvents.filter(e =>
      e.event_type === 'status_change' && e.description === 'Job status changed to scheduled'
    )
    if (staleEvents.length > 0) {
      const scheduledJobs = fetchedJobs.filter(j => j.scheduled_date)
      for (const event of staleEvents) {
        // Find the job's scheduled_date (best match: use any job with a date)
        const matchJob = scheduledJobs[0]
        if (matchJob) {
          const dateStr = matchJob.scheduled_date
          const d = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00')
          const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
          const readable = dateStr.includes('T') ? `${date} at ${time}` : date
          const newDesc = `Appointment scheduled for ${readable}`
          event.description = newDesc
          supabase.from('client_events').update({ description: newDesc }).eq('id', event.id).then(() => {})
        }
      }
    }

    setEvents(fetchedEvents)

    const jobIds = fetchedJobs.map(j => j.id)
    let allPhotos = []
    if (jobIds.length > 0) {
      const { data: photosData } = await supabase
        .from('job_photos')
        .select('*, jobs(job_type)')
        .in('job_id', jobIds)
        .order('created_at', { ascending: false })
      allPhotos = photosData || []
    }
    setClientPhotos(allPhotos)

    setLoading(false)
  }

  // --- Client handlers ---

  const openEditModal = () => {
    if (client) {
      setName(client.name || '')
      setPhone(client.phone || '')
      setEmail(client.email || '')
      setAddress(client.address || '')
      setNotes(client.notes || '')
    }
    setShowEditProfile(true)
  }

  const handleSave = async () => {
    setSaving(true)
    const { error } = await supabase
      .from('clients')
      .update({ name, phone, email: email || null, address: address || null, notes: notes || null, updated_at: new Date().toISOString() })
      .eq('id', id)

    setSaving(false)
    if (error) {
      alert('Error saving: ' + error.message)
    } else {
      setShowEditProfile(false)
      fetchData()
    }
  }

  const handleToggleLost = async () => {
    const isLost = client.is_lost
    if (!confirm(isLost ? 'Restore this client to active?' : 'Mark this client as lost?')) return
    const update = isLost ? { is_lost: false, lost_at: null } : { is_lost: true, lost_at: new Date().toISOString() }
    await supabase.from('clients').update(update).eq('id', id)
    fetchData()
  }

  const handleAddNote = async () => {
    if (!newNote.trim()) return
    setAddingNote(true)
    await supabase.from('client_events').insert({
      client_id: id, user_id: user.id, event_type: 'note', description: newNote.trim(),
    })
    setNewNote('')
    setAddingNote(false)
    fetchData()
  }

  const handleDeleteClient = async () => {
    if (!confirm('Are you sure you want to delete this client? You can re-add them later if needed.')) return
    await supabase.from('clients').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    navigate('/clients/active', { replace: true })
  }

  const formatPrice = (price) => {
    if (!price) return ''
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(price)
  }

  // --- Job modal handlers ---

  const openJobModal = async (job) => {
    setSelectedJob(job)
    setJmStatus(job.status || 'lead')
    setJmJobType(job.job_type || '')
    setJmScreenType(job.screen_type || '')
    setJmPanelCount(job.panel_count?.toString() || '')
    setJmPrice(job.price?.toString() || '')
    setJmScheduledDate(job.scheduled_date || '')
    setJmNotes(job.notes || '')
    setJmChanged(false)
    setJmSaving(false)
    setJmViewingPhoto(null)

    const { data } = await supabase.from('job_photos').select('*').eq('job_id', job.id).order('created_at', { ascending: false })
    setJmPhotos(data || [])
  }

  const closeJobModal = () => {
    setSelectedJob(null)
    setJmViewingPhoto(null)
  }

  const formatDateTimeReadable = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00')
    if (isNaN(d.getTime())) return dateStr
    const date = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    return dateStr.includes('T') ? `${date} at ${time}` : date
  }

  const handleJobStatusChange = async (newStatus) => {
    const oldStatus = jmStatus
    setJmStatus(newStatus)
    await supabase.from('jobs').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', selectedJob.id)

    let description
    if (newStatus === 'scheduled' && jmScheduledDate) {
      description = `Appointment scheduled for ${formatDateTimeReadable(jmScheduledDate)}`
    } else if (oldStatus === 'scheduled' && newStatus !== 'scheduled' && jmScheduledDate) {
      description = `Appointment cancelled - was scheduled for ${formatDateTimeReadable(jmScheduledDate)}`
    } else {
      description = `Job status changed to ${newStatus}`
    }

    await supabase.from('client_events').insert({
      client_id: id, user_id: user.id, event_type: 'status_change', description,
    })
    fetchData()
  }

  const handleJobSave = async () => {
    setJmSaving(true)
    const oldDate = selectedJob.scheduled_date
    const newDate = jmScheduledDate

    await supabase.from('jobs').update({
      job_type: jmJobType,
      screen_type: jmScreenType || null,
      panel_count: jmPanelCount ? parseInt(jmPanelCount) : null,
      price: jmPrice ? parseFloat(jmPrice) : null,
      scheduled_date: jmScheduledDate || null,
      notes: jmNotes || null,
      updated_at: new Date().toISOString(),
    }).eq('id', selectedJob.id)

    // Log reschedule if date changed
    if (oldDate !== newDate) {
      let description
      if (oldDate && newDate) {
        description = `Appointment rescheduled from ${formatDateTimeReadable(oldDate)} to ${formatDateTimeReadable(newDate)}`
      } else if (!oldDate && newDate) {
        description = `Appointment scheduled for ${formatDateTimeReadable(newDate)}`
      } else if (oldDate && !newDate) {
        description = `Appointment cancelled - was scheduled for ${formatDateTimeReadable(oldDate)}`
      }
      if (description) {
        await supabase.from('client_events').insert({
          client_id: id, user_id: user.id, event_type: 'status_change', description,
        })
      }
    }
    setJmSaving(false)
    setJmChanged(false)
    fetchData()
  }

  const handleJobPhotoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const photoType = prompt('Photo type: before, after, damage, or other', 'before')
    if (!photoType) return

    setJmUploading(true)
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}/${selectedJob.id}/${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage.from('job-photos').upload(fileName, file)
    if (uploadError) { alert('Upload error: ' + uploadError.message); setJmUploading(false); return }

    const { data: { publicUrl } } = supabase.storage.from('job-photos').getPublicUrl(fileName)
    await supabase.from('job_photos').insert({
      job_id: selectedJob.id, user_id: user.id, photo_url: publicUrl,
      photo_type: ['before', 'after', 'damage', 'other'].includes(photoType) ? photoType : 'other',
    })
    setJmUploading(false)

    const { data } = await supabase.from('job_photos').select('*').eq('job_id', selectedJob.id).order('created_at', { ascending: false })
    setJmPhotos(data || [])
  }

  const handleJobDeletePhoto = async (photo) => {
    if (!confirm('Delete this photo?')) return
    const urlParts = photo.photo_url.split('/job-photos/')
    if (urlParts[1]) await supabase.storage.from('job-photos').remove([urlParts[1]])
    await supabase.from('job_photos').delete().eq('id', photo.id)

    const { data } = await supabase.from('job_photos').select('*').eq('job_id', selectedJob.id).order('created_at', { ascending: false })
    setJmPhotos(data || [])
  }

  const handleDeleteJob = async () => {
    if (!confirm('Are you sure you want to delete this job? This cannot be undone.')) return
    await supabase.from('jobs').delete().eq('id', selectedJob.id)
    closeJobModal()
    fetchData()
  }

  const jmMarkChanged = (setter) => (e) => { setter(e.target.value); setJmChanged(true) }

  // --- Render ---

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!client) {
    return (
      <div className="px-4 pt-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-primary mb-4">
          <ArrowLeft size={20} /> Back
        </button>
        <p className="text-text-secondary dark:text-dark-text-secondary">Client not found.</p>
      </div>
    )
  }

  return (
    <div className="px-4 pt-4 pb-8">
      {/* Header */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-primary mb-4">
        <ArrowLeft size={20} /> Back
      </button>

      {/* Compact contact header */}
      <div
        onClick={openEditModal}
        className="relative bg-white dark:bg-dark-card border border-border dark:border-dark-border rounded-xl p-4 mb-4 cursor-pointer hover:bg-surface dark:hover:bg-dark-bg transition-colors"
      >
        <button className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-border/50 dark:hover:bg-dark-border/50 text-text-secondary dark:text-dark-text-secondary">
          <Pencil size={16} />
        </button>
        <h1 className="text-xl font-bold text-text-primary dark:text-dark-text pr-8">{client.name}</h1>
        <div className="mt-2 space-y-1">
          {client.phone && (
            <div className="flex items-center gap-2">
              <Phone size={14} className="text-text-secondary dark:text-dark-text-secondary shrink-0" />
              <a href={`tel:${client.phone}`} onClick={(e) => e.stopPropagation()} className="text-sm text-primary">{formatPhone(client.phone)}</a>
            </div>
          )}
          {client.email && (
            <div className="flex items-center gap-2">
              <Mail size={14} className="text-text-secondary dark:text-dark-text-secondary shrink-0" />
              <span className="text-sm text-text-secondary dark:text-dark-text-secondary">{client.email}</span>
            </div>
          )}
          {client.address && (
            <div className="flex items-center gap-2">
              <MapPin size={14} className="text-text-secondary dark:text-dark-text-secondary shrink-0" />
              <a href={`https://maps.google.com/?q=${encodeURIComponent(client.address)}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-sm text-primary">{client.address}</a>
            </div>
          )}
        </div>
        {client.notes && <p className="text-sm text-text-secondary dark:text-dark-text-secondary italic mt-2">{client.notes}</p>}
      </div>

      {/* Lost/Restore action */}
      <div className="mb-4">
        <button onClick={handleToggleLost} className={`flex items-center gap-2 text-sm font-medium ${client.is_lost ? 'text-primary hover:text-primary/80' : 'text-red-500 hover:text-red-600'}`}>
          {client.is_lost ? <UserCheck size={16} /> : <UserX size={16} />}
          {client.is_lost ? 'Restore Client' : 'Mark as Lost'}
        </button>
      </div>

      {/* Two-column layout: Jobs + Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
        {/* Jobs section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold dark:text-dark-text">Jobs ({jobs.length})</h2>
            <button onClick={() => setShowAddJob(true)} className="flex items-center gap-1 text-sm font-medium text-primary">
              <Plus size={16} /> Add Job
            </button>
          </div>
          {jobs.length === 0 ? (
            <p className="text-sm text-text-secondary dark:text-dark-text-secondary py-4">No jobs yet for this client.</p>
          ) : (
            <div className="space-y-2">
              {jobs.map(job => (
                <div
                  key={job.id}
                  onClick={() => openJobModal(job)}
                  className="bg-white dark:bg-dark-card border border-border dark:border-dark-border rounded-xl p-3 active:bg-surface dark:active:bg-dark-bg cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium dark:text-dark-text">{jobTypeLabels[job.job_type] || job.job_type}</span>
                      {job.price && <span className="text-sm text-text-secondary dark:text-dark-text-secondary ml-2">{formatPrice(job.price)}</span>}
                    </div>
                    <StatusBadge status={job.status} />
                  </div>
                  {job.scheduled_date && (
                    <p className="text-xs text-text-secondary dark:text-dark-text-secondary mt-1">
                      {new Date(job.scheduled_date.includes('T') ? job.scheduled_date : job.scheduled_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Photos */}
          <div className="border-t border-border dark:border-dark-border pt-4 mt-4">
            <h2 className="text-base font-semibold mb-3 dark:text-dark-text">Photos ({clientPhotos.length})</h2>
            {clientPhotos.length === 0 ? (
              <p className="text-sm text-text-secondary dark:text-dark-text-secondary py-2">No photos yet. Add photos from a job.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {clientPhotos.map(photo => (
                  <div key={photo.id} className="relative aspect-square rounded-xl overflow-hidden bg-surface dark:bg-dark-bg">
                    <img
                      src={photo.photo_url}
                      alt=""
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() => setViewingClientPhoto(photo)}
                    />
                    <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                      {photo.photo_type}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Timeline / History */}
        <div>
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2 dark:text-dark-text">
            <MessageSquare size={18} /> Timeline
          </h2>
          <div className="flex gap-2 mb-4">
            <input
              type="text" value={newNote} onChange={(e) => setNewNote(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
              className="flex-1 px-3 py-2.5 border border-border dark:border-dark-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white dark:bg-dark-card dark:text-dark-text"
              placeholder="Add a note..."
            />
            <button onClick={handleAddNote} disabled={addingNote || !newNote.trim()} className="px-3 py-2.5 bg-primary text-white rounded-xl disabled:opacity-50">
              <Send size={16} />
            </button>
          </div>
          {events.length === 0 ? (
            <p className="text-sm text-text-secondary dark:text-dark-text-secondary py-4">No history yet.</p>
          ) : (
            <div className="space-y-3">
              {events.map(event => (
                <div key={event.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
                      event.event_type === 'note' ? 'bg-primary' :
                      event.event_type === 'status_change' ? 'bg-quoted-text' :
                      event.event_type === 'job_created' ? 'bg-scheduled-text' :
                      'bg-text-secondary'
                    }`} />
                    <div className="w-px flex-1 bg-border dark:bg-dark-border mt-1" />
                  </div>
                  <div className="pb-4 flex-1">
                    <p className="text-sm text-text-primary dark:text-dark-text">{event.description}</p>
                    <p className="text-[11px] text-text-secondary dark:text-dark-text-secondary mt-0.5">
                      {new Date(event.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {' '}
                      {new Date(event.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete client */}
      <div className="border-t border-border dark:border-dark-border pt-4 mt-6">
        <button onClick={handleDeleteClient} className="w-full py-3 flex items-center justify-center gap-2 border border-red-300 text-red-500 rounded-xl font-semibold text-sm hover:bg-red-50 dark:hover:bg-red-500/10">
          <Trash2 size={16} /> Delete Client
        </button>
      </div>

      {/* Edit Profile Modal */}
      {showEditProfile && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white dark:bg-dark-card w-full sm:max-w-md sm:rounded-xl rounded-t-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold dark:text-dark-text">Edit Client</h2>
              <button onClick={() => setShowEditProfile(false)} className="p-1 rounded-full hover:bg-surface dark:hover:bg-dark-bg dark:text-dark-text"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-dark-text">Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-3 border border-border dark:border-dark-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white dark:bg-dark-bg dark:text-dark-text" placeholder="Client name" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-dark-text">Phone</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-3 py-3 border border-border dark:border-dark-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white dark:bg-dark-bg dark:text-dark-text" placeholder="(555) 123-4567" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-dark-text">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-3 border border-border dark:border-dark-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white dark:bg-dark-bg dark:text-dark-text" placeholder="email@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-dark-text">Address</label>
                <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full px-3 py-3 border border-border dark:border-dark-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white dark:bg-dark-bg dark:text-dark-text" placeholder="123 Main St" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-dark-text">Notes</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full px-3 py-3 border border-border dark:border-dark-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none bg-white dark:bg-dark-bg dark:text-dark-text" placeholder="Notes about this client..." />
              </div>
              <button onClick={handleSave} disabled={saving} className="w-full py-3 bg-primary text-white rounded-xl font-semibold text-base hover:bg-primary/90 disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Job Detail Modal */}
      {selectedJob && !jmViewingPhoto && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white dark:bg-dark-card w-full sm:max-w-lg sm:rounded-xl rounded-t-2xl p-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold dark:text-dark-text">{client.name}</h2>
              <button onClick={closeJobModal} className="p-1 rounded-full hover:bg-surface dark:hover:bg-dark-bg dark:text-dark-text"><X size={20} /></button>
            </div>

            {/* Status progression */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 dark:text-dark-text">Status</label>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {statuses.map((s, i) => {
                  const currentIndex = statuses.findIndex(st => st.key === jmStatus)
                  const isActive = s.key === jmStatus
                  const isPast = i < currentIndex
                  const colors = statusColors[s.key]
                  return (
                    <button
                      key={s.key}
                      onClick={() => handleJobStatusChange(s.key)}
                      className={`shrink-0 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                        isActive ? `${colors.bg} ${colors.text} ring-2 ${colors.ring}` :
                        isPast ? `${colors.bg} ${colors.text} opacity-60` :
                        'bg-surface dark:bg-dark-bg text-text-secondary dark:text-dark-text-secondary'
                      }`}
                    >
                      {isPast ? '✓ ' : ''}{s.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Job fields */}
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-dark-text">Job Type</label>
                <select value={jmJobType} onChange={jmMarkChanged(setJmJobType)} className="w-full px-3 py-3 border border-border dark:border-dark-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white dark:bg-dark-bg dark:text-dark-text">
                  <option value="rescreen">Rescreen</option>
                  <option value="repair">Repair</option>
                  <option value="new_enclosure">New Enclosure</option>
                  <option value="frame_painting">Frame Painting</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-dark-text">Screen Type</label>
                <select value={jmScreenType} onChange={jmMarkChanged(setJmScreenType)} className="w-full px-3 py-3 border border-border dark:border-dark-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white dark:bg-dark-bg dark:text-dark-text">
                  <option value="">Select...</option>
                  <option value="standard">Standard</option>
                  <option value="no_see_um">No-See-Um</option>
                  <option value="super_screen">Super Screen</option>
                  <option value="pet_screen">Pet Screen</option>
                  <option value="solar">Solar</option>
                  <option value="florida_glass">Florida Glass</option>
                  <option value="mixed">Mixed</option>
                </select>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1 dark:text-dark-text">Panels</label>
                  <input type="number" value={jmPanelCount} onChange={jmMarkChanged(setJmPanelCount)} className="w-full px-3 py-3 border border-border dark:border-dark-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white dark:bg-dark-bg dark:text-dark-text" placeholder="0" />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1 dark:text-dark-text">Price ($)</label>
                  <input type="number" value={jmPrice} onChange={jmMarkChanged(setJmPrice)} className="w-full px-3 py-3 border border-border dark:border-dark-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white dark:bg-dark-bg dark:text-dark-text" placeholder="0.00" step="0.01" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-dark-text">Scheduled Date & Time</label>
                <input type="datetime-local" value={jmScheduledDate} onChange={jmMarkChanged(setJmScheduledDate)} className="w-full px-3 py-3 border border-border dark:border-dark-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white dark:bg-dark-bg dark:text-dark-text" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-dark-text">Notes</label>
                <textarea value={jmNotes} onChange={jmMarkChanged(setJmNotes)} rows={3} className="w-full px-3 py-3 border border-border dark:border-dark-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none bg-white dark:bg-dark-bg dark:text-dark-text" placeholder="Job notes..." />
              </div>
              {jmChanged && (
                <button onClick={handleJobSave} disabled={jmSaving} className="w-full py-3 bg-primary text-white rounded-xl font-semibold text-base hover:bg-primary/90 disabled:opacity-50">
                  {jmSaving ? 'Saving...' : 'Save Changes'}
                </button>
              )}
            </div>

            {/* Photos */}
            <div className="border-t border-border dark:border-dark-border pt-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold dark:text-dark-text">Photos ({jmPhotos.length})</h3>
                <label className="flex items-center gap-1 text-sm font-medium text-primary cursor-pointer">
                  <Camera size={16} />
                  {jmUploading ? 'Uploading...' : 'Add Photo'}
                  <input type="file" accept="image/*" capture="environment" onChange={handleJobPhotoUpload} className="hidden" disabled={jmUploading} />
                </label>
              </div>
              {jmPhotos.length === 0 ? (
                <p className="text-sm text-text-secondary dark:text-dark-text-secondary py-2">No photos yet.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {jmPhotos.map(photo => (
                    <div key={photo.id} className="relative aspect-square rounded-xl overflow-hidden bg-surface dark:bg-dark-bg">
                      <img src={photo.photo_url} alt="" className="w-full h-full object-cover cursor-pointer" onClick={() => setJmViewingPhoto(photo)} />
                      <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-full">{photo.photo_type}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Delete job */}
            <div className="border-t border-border dark:border-dark-border pt-4">
              <button onClick={handleDeleteJob} className="w-full py-3 border border-red-300 text-red-600 rounded-xl font-semibold text-sm hover:bg-red-50 dark:hover:bg-red-500/10">
                Delete Job
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo viewer (on top of job modal) */}
      {jmViewingPhoto && (
        <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center" onClick={() => setJmViewingPhoto(null)}>
          <button className="absolute top-4 right-4 text-white" onClick={() => setJmViewingPhoto(null)}>
            <X size={24} />
          </button>
          <button
            className="absolute bottom-4 right-4 text-red-400 flex items-center gap-1 text-sm"
            onClick={(e) => { e.stopPropagation(); handleJobDeletePhoto(jmViewingPhoto); setJmViewingPhoto(null) }}
          >
            <Trash2 size={16} /> Delete
          </button>
          <img src={jmViewingPhoto.photo_url} alt="" className="max-w-full max-h-[85vh] object-contain" />
        </div>
      )}

      {/* Client photo viewer */}
      {viewingClientPhoto && (
        <div className="fixed inset-0 bg-black/90 z-[70] flex items-center justify-center" onClick={() => setViewingClientPhoto(null)}>
          <button className="absolute top-4 right-4 text-white" onClick={() => setViewingClientPhoto(null)}>
            <X size={24} />
          </button>
          <img src={viewingClientPhoto.photo_url} alt="" className="max-w-full max-h-[85vh] object-contain" />
        </div>
      )}

      <AddJobModal
        isOpen={showAddJob}
        onClose={() => setShowAddJob(false)}
        onJobAdded={() => fetchData()}
        preselectedClientId={id}
      />
    </div>
  )
}

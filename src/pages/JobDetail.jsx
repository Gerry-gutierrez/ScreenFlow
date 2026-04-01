import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Phone, MessageSquare, MapPin, Trash2, Camera, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

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

export default function JobDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [job, setJob] = useState(null)
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Editable fields
  const [jobType, setJobType] = useState('rescreen')
  const [screenType, setScreenType] = useState('')
  const [panelCount, setPanelCount] = useState('')
  const [price, setPrice] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState('lead')
  const [changed, setChanged] = useState(false)

  // Photo upload
  const [uploading, setUploading] = useState(false)
  const [viewingPhoto, setViewingPhoto] = useState(null)

  useEffect(() => {
    if (user && id) fetchData()
  }, [user, id])

  const fetchData = async () => {
    setLoading(true)

    const [jobRes, photosRes] = await Promise.all([
      supabase.from('jobs').select('*, clients(*)').eq('id', id).eq('user_id', user.id).single(),
      supabase.from('job_photos').select('*').eq('job_id', id).order('created_at', { ascending: false }),
    ])

    if (jobRes.data) {
      const j = jobRes.data
      setJob(j)
      setJobType(j.job_type || 'rescreen')
      setScreenType(j.screen_type || '')
      setPanelCount(j.panel_count?.toString() || '')
      setPrice(j.price?.toString() || '')
      setScheduledDate(j.scheduled_date || '')
      setNotes(j.notes || '')
      setStatus(j.status || 'lead')
    }

    setPhotos(photosRes.data || [])
    setLoading(false)
  }

  const handleStatusChange = async (newStatus) => {
    setStatus(newStatus)
    await supabase
      .from('jobs')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id)
    await supabase.from('client_events').insert({
      client_id: job.client_id,
      user_id: user.id,
      event_type: 'status_change',
      description: `Job status changed to ${newStatus}`,
    })
  }

  const handleSave = async () => {
    setSaving(true)
    const { error } = await supabase
      .from('jobs')
      .update({
        job_type: jobType,
        screen_type: screenType || null,
        panel_count: panelCount ? parseInt(panelCount) : null,
        price: price ? parseFloat(price) : null,
        scheduled_date: scheduledDate || null,
        notes: notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    setSaving(false)
    if (error) {
      alert('Error saving: ' + error.message)
    } else {
      setChanged(false)
    }
  }

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const photoType = prompt('Photo type: before, after, damage, or other', 'before')
    if (!photoType) return

    setUploading(true)
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}/${id}/${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('job-photos')
      .upload(fileName, file)

    if (uploadError) {
      alert('Upload error: ' + uploadError.message)
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('job-photos')
      .getPublicUrl(fileName)

    const { error: dbError } = await supabase
      .from('job_photos')
      .insert({
        job_id: id,
        user_id: user.id,
        photo_url: publicUrl,
        photo_type: ['before', 'after', 'damage', 'other'].includes(photoType) ? photoType : 'other',
      })

    setUploading(false)
    if (dbError) {
      alert('Error saving photo record: ' + dbError.message)
    } else {
      fetchData()
    }
  }

  const handleDeletePhoto = async (photo) => {
    if (!confirm('Delete this photo?')) return

    // Extract path from URL
    const urlParts = photo.photo_url.split('/job-photos/')
    if (urlParts[1]) {
      await supabase.storage.from('job-photos').remove([urlParts[1]])
    }

    await supabase.from('job_photos').delete().eq('id', photo.id)
    fetchData()
  }

  const handleDeleteJob = async () => {
    if (!confirm('Are you sure you want to delete this job? This cannot be undone.')) return

    await supabase.from('jobs').delete().eq('id', id)
    navigate(-1)
  }

  const markChanged = (setter) => (e) => {
    setter(e.target.value)
    setChanged(true)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!job) {
    return (
      <div className="px-4 pt-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-primary mb-4">
          <ArrowLeft size={20} /> Back
        </button>
        <p className="text-text-secondary">Job not found.</p>
      </div>
    )
  }

  const client = job.clients

  return (
    <div className="px-4 pt-4 pb-8">
      {/* Header */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-primary mb-4">
        <ArrowLeft size={20} /> Back
      </button>

      {/* Client info */}
      <div className="mb-6">
        <button
          onClick={() => navigate(`/clients/${client?.id}`)}
          className="text-lg font-bold text-primary"
        >
          {client?.name || 'Unknown Client'}
        </button>

        <div className="flex items-center gap-2 mt-2">
          {client?.phone && (
            <>
              <a href={`tel:${client.phone}`} className="w-10 h-10 flex items-center justify-center rounded-full bg-primary/10 text-primary">
                <Phone size={18} />
              </a>
              <a href={`sms:${client.phone}`} className="w-10 h-10 flex items-center justify-center rounded-full bg-primary/10 text-primary">
                <MessageSquare size={18} />
              </a>
            </>
          )}
          {client?.address && (
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(client.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-text-secondary ml-1"
            >
              <MapPin size={14} /> {client.address}
            </a>
          )}
        </div>
      </div>

      {/* Status progression */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Status</label>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {statuses.map((s, i) => {
            const currentIndex = statuses.findIndex(st => st.key === status)
            const isActive = s.key === status
            const isPast = i < currentIndex
            const colors = statusColors[s.key]

            return (
              <button
                key={s.key}
                onClick={() => handleStatusChange(s.key)}
                className={`shrink-0 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                  isActive
                    ? `${colors.bg} ${colors.text} ring-2 ${colors.ring}`
                    : isPast
                    ? `${colors.bg} ${colors.text} opacity-60`
                    : 'bg-surface text-text-secondary'
                }`}
              >
                {isPast ? '✓ ' : ''}{s.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Job details */}
      <div className="space-y-3 mb-6">
        <div>
          <label className="block text-sm font-medium mb-1">Job Type</label>
          <select
            value={jobType}
            onChange={markChanged(setJobType)}
            className="w-full px-3 py-3 border border-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
          >
            <option value="rescreen">Rescreen</option>
            <option value="repair">Repair</option>
            <option value="new_enclosure">New Enclosure</option>
            <option value="frame_painting">Frame Painting</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Screen Type</label>
          <select
            value={screenType}
            onChange={markChanged(setScreenType)}
            className="w-full px-3 py-3 border border-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
          >
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
            <label className="block text-sm font-medium mb-1">Panels</label>
            <input
              type="number"
              value={panelCount}
              onChange={markChanged(setPanelCount)}
              className="w-full px-3 py-3 border border-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="0"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Price ($)</label>
            <input
              type="number"
              value={price}
              onChange={markChanged(setPrice)}
              className="w-full px-3 py-3 border border-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="0.00"
              step="0.01"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Scheduled Date & Time</label>
          <input
            type="datetime-local"
            value={scheduledDate}
            onChange={markChanged(setScheduledDate)}
            className="w-full px-3 py-3 border border-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={markChanged(setNotes)}
            rows={3}
            className="w-full px-3 py-3 border border-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            placeholder="Job notes..."
          />
        </div>

        {changed && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 bg-primary text-white rounded-xl font-semibold text-base hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        )}
      </div>

      {/* Photos */}
      <div className="border-t border-border pt-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">Photos ({photos.length})</h2>
          <label className="flex items-center gap-1 text-sm font-medium text-primary cursor-pointer">
            <Camera size={16} />
            {uploading ? 'Uploading...' : 'Add Photo'}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoUpload}
              className="hidden"
              disabled={uploading}
            />
          </label>
        </div>

        {photos.length === 0 ? (
          <p className="text-sm text-text-secondary py-4">No photos yet.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {photos.map(photo => (
              <div key={photo.id} className="relative aspect-square rounded-xl overflow-hidden bg-surface">
                <img
                  src={photo.photo_url}
                  alt=""
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => setViewingPhoto(photo)}
                />
                <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                  {photo.photo_type}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Photo viewer */}
      {viewingPhoto && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center" onClick={() => setViewingPhoto(null)}>
          <button className="absolute top-4 right-4 text-white" onClick={() => setViewingPhoto(null)}>
            <X size={24} />
          </button>
          <button
            className="absolute bottom-4 right-4 text-red-400 flex items-center gap-1 text-sm"
            onClick={(e) => { e.stopPropagation(); handleDeletePhoto(viewingPhoto); setViewingPhoto(null) }}
          >
            <Trash2 size={16} /> Delete
          </button>
          <img src={viewingPhoto.photo_url} alt="" className="max-w-full max-h-[85vh] object-contain" />
        </div>
      )}

      {/* Delete job */}
      <div className="border-t border-border pt-6">
        <button
          onClick={handleDeleteJob}
          className="w-full py-3 border border-red-300 text-red-600 rounded-xl font-semibold text-base hover:bg-red-50"
        >
          Delete Job
        </button>
      </div>
    </div>
  )
}

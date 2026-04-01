import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const formatPrice = (price) => {
  if (!price && price !== 0) return ''
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(price)
}

export default function Services() {
  const { user } = useAuth()
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', description: '', price: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user) fetchServices()
  }, [user])

  const fetchServices = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('services')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (!data || data.length === 0) {
      // Auto-seed default services on first load
      const defaults = ['Rescreen', 'Repair', 'New Enclosure', 'Frame Painting', 'Other']
      await supabase.from('services').insert(
        defaults.map(name => ({ user_id: user.id, name, description: null, price: null }))
      )
      const { data: seeded } = await supabase
        .from('services')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
      setServices(seeded || [])
    } else {
      setServices(data)
    }

    setLoading(false)
  }

  const openAdd = () => {
    setEditing(null)
    setForm({ name: '', description: '', price: '' })
    setShowModal(true)
  }

  const openEdit = (service) => {
    setEditing(service)
    setForm({ name: service.name, description: service.description || '', price: service.price?.toString() || '' })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)

    const payload = {
      user_id: user.id,
      name: form.name.trim(),
      description: form.description.trim() || null,
      price: form.price ? parseFloat(form.price) : null,
      updated_at: new Date().toISOString(),
    }

    if (editing) {
      await supabase.from('services').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('services').insert(payload)
    }

    setSaving(false)
    setShowModal(false)
    fetchServices()
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this service?')) return
    await supabase.from('services').delete().eq('id', id)
    fetchServices()
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
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Services</h1>
        <button
          onClick={openAdd}
          className="flex items-center gap-1 px-3 py-2 bg-primary text-white rounded-lg text-sm font-medium"
        >
          <Plus size={16} /> Add Service
        </button>
      </div>

      {services.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-text-secondary">No services added yet.</p>
          <p className="text-sm text-text-secondary mt-1">Tap <strong>Add Service</strong> to get started.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {services.map(service => (
            <div key={service.id} className="bg-white border border-border rounded-xl p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{service.name}</p>
                  {service.description && (
                    <p className="text-xs text-text-secondary mt-0.5">{service.description}</p>
                  )}
                  {service.price != null && (
                    <p className="text-sm font-medium text-primary mt-1">{formatPrice(service.price)}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openEdit(service)}
                    className="p-2 rounded-lg hover:bg-surface text-text-secondary"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(service.id)}
                    className="p-2 rounded-lg hover:bg-red-50 text-red-500"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{editing ? 'Edit Service' : 'Add Service'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-full hover:bg-surface">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Service Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-3 border border-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  placeholder="e.g. Full Rescreen"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-3 border border-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                  placeholder="Describe the service..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Price</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm(f => ({ ...f, price: e.target.value }))}
                  className="w-full px-3 py-3 border border-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  placeholder="0.00"
                />
              </div>

              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
                className="w-full py-3 bg-primary text-white rounded-xl font-semibold text-base hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? 'Saving...' : editing ? 'Update Service' : 'Add Service'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

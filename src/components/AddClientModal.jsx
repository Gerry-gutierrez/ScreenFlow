import { useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function AddClientModal({ isOpen, onClose, onClientAdded }) {
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    const { data, error } = await supabase
      .from('clients')
      .insert({ user_id: user.id, name, phone, address: address || null, email: email || null })
      .select()
      .single()

    setSaving(false)

    if (error) {
      alert('Error adding client: ' + error.message)
      return
    }

    setName('')
    setPhone('')
    setAddress('')
    setEmail('')
    onClientAdded?.(data)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Add Client</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-surface">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-3 border border-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              placeholder="Client name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Phone *</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="w-full px-3 py-3 border border-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              placeholder="(555) 123-4567"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-3 border border-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              placeholder="123 Main St, Tampa, FL"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-3 border border-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              placeholder="client@email.com"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-primary text-white rounded-xl font-semibold text-base hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Add Client'}
          </button>
        </form>
      </div>
    </div>
  )
}

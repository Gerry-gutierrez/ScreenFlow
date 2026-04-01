import { useState, useEffect } from 'react'
import { X, Search } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function AddJobModal({ isOpen, onClose, onJobAdded, preselectedClientId }) {
  const { user } = useAuth()
  const [clients, setClients] = useState([])
  const [clientSearch, setClientSearch] = useState('')
  const [selectedClient, setSelectedClient] = useState(null)
  const [showNewClient, setShowNewClient] = useState(false)

  // New client fields
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newAddress, setNewAddress] = useState('')

  // Job fields
  const [services, setServices] = useState([])
  const [jobType, setJobType] = useState('')
  const [quotedPrice, setQuotedPrice] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [restoredMsg, setRestoredMsg] = useState('')

  useEffect(() => {
    if (isOpen && user) {
      fetchClients()
      fetchServices()
    }
  }, [isOpen, user])

  useEffect(() => {
    if (preselectedClientId && clients.length > 0) {
      const found = clients.find(c => c.id === preselectedClientId)
      if (found) setSelectedClient(found)
    }
  }, [preselectedClientId, clients])

  const fetchClients = async () => {
    const { data } = await supabase
      .from('clients')
      .select('id, name, phone')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('name')
    setClients(data || [])
  }

  const fetchServices = async () => {
    const { data } = await supabase
      .from('services')
      .select('id, name')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
    const list = data || []
    setServices(list)
    if (list.length > 0 && !jobType) {
      setJobType(list[0].name)
    }
  }

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.phone.includes(clientSearch)
  )

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    let clientId = selectedClient?.id

    // Create new client if needed
    if (showNewClient) {
      // Check if a soft-deleted client with the same phone exists
      const { data: existing } = await supabase
        .from('clients')
        .select('id, name, address')
        .eq('user_id', user.id)
        .eq('phone', newPhone)
        .not('deleted_at', 'is', null)
        .limit(1)

      if (existing && existing.length > 0) {
        // Restore the soft-deleted client
        const restored = existing[0]
        const updates = { deleted_at: null, is_lost: false, lost_at: null }
        if (newName && newName !== restored.name) updates.name = newName
        if (newAddress && newAddress !== restored.address) updates.address = newAddress

        await supabase.from('clients').update(updates).eq('id', restored.id)
        clientId = restored.id
        setRestoredMsg('Welcome back! Client restored.')
        setTimeout(() => setRestoredMsg(''), 3000)
      } else {
        const { data: newClient, error: clientError } = await supabase
          .from('clients')
          .insert({ user_id: user.id, name: newName, phone: newPhone, address: newAddress || null })
          .select()
          .single()

        if (clientError) {
          alert('Error creating client: ' + clientError.message)
          setSaving(false)
          return
        }
        clientId = newClient.id
      }
    }

    if (!clientId) {
      alert('Please select or create a client')
      setSaving(false)
      return
    }

    const { data, error } = await supabase
      .from('jobs')
      .insert({
        user_id: user.id,
        client_id: clientId,
        job_type: jobType,
        price: quotedPrice ? parseFloat(quotedPrice) : null,
        status: 'lead',
        notes: notes || null,
      })
      .select('*, clients(*)')
      .single()

    setSaving(false)

    if (error) {
      alert('Error creating job: ' + error.message)
      return
    }

    if (data) {
      await supabase.from('client_events').insert({
        client_id: clientId,
        user_id: user.id,
        event_type: 'job_created',
        description: `New job created: ${jobType}`,
      })
    }

    // Reset form
    setSelectedClient(null)
    setShowNewClient(false)
    setNewName('')
    setNewPhone('')
    setNewAddress('')
    setJobType(services.length > 0 ? services[0].name : '')
    setQuotedPrice('')
    setNotes('')
    setClientSearch('')
    onJobAdded?.(data)
    onClose()
  }

  const resetAndClose = () => {
    setSelectedClient(null)
    setShowNewClient(false)
    setClientSearch('')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center" onClick={resetAndClose}>
      <div
        className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">New Prospect</h2>
          <button onClick={resetAndClose} className="p-1 rounded-full hover:bg-surface">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Client selection */}
          {!selectedClient && !showNewClient && !preselectedClientId && (
            <div>
              <label className="block text-sm font-medium mb-1">Client</label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                <input
                  type="text"
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-3 border border-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  placeholder="Search clients..."
                />
              </div>
              <div className="mt-2 max-h-40 overflow-y-auto border border-border rounded-xl">
                <button
                  type="button"
                  onClick={() => setShowNewClient(true)}
                  className="w-full text-left px-3 py-3 text-primary font-medium hover:bg-surface border-b border-border"
                >
                  + Add new client
                </button>
                {filteredClients.map(client => (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => setSelectedClient(client)}
                    className="w-full text-left px-3 py-3 hover:bg-surface border-b border-border last:border-b-0"
                  >
                    <p className="font-medium text-sm">{client.name}</p>
                    <p className="text-xs text-text-secondary">{client.phone}</p>
                  </button>
                ))}
                {filteredClients.length === 0 && clientSearch && (
                  <p className="px-3 py-3 text-sm text-text-secondary">No clients found</p>
                )}
              </div>
            </div>
          )}

          {/* Selected client display */}
          {selectedClient && (
            <div className="flex items-center justify-between bg-surface rounded-xl px-3 py-3">
              <div>
                <p className="font-medium text-sm">{selectedClient.name}</p>
                <p className="text-xs text-text-secondary">{selectedClient.phone}</p>
              </div>
              {!preselectedClientId && (
                <button type="button" onClick={() => setSelectedClient(null)} className="text-xs text-primary">
                  Change
                </button>
              )}
            </div>
          )}

          {/* New client form */}
          {showNewClient && (
            <div className="space-y-3 p-3 bg-surface rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">New Client</span>
                <button type="button" onClick={() => setShowNewClient(false)} className="text-xs text-primary">
                  Cancel
                </button>
              </div>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required={showNewClient}
                className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
                placeholder="Name *"
              />
              <input
                type="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                required={showNewClient}
                className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
                placeholder="Phone *"
              />
              <input
                type="text"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
                placeholder="Address (optional)"
              />
            </div>
          )}

          {/* Job type */}
          <div>
            <label className="block text-sm font-medium mb-1">Job Type</label>
            {services.length === 0 ? (
              <p className="text-sm text-text-secondary py-2">No services found. Add services in the Services tab.</p>
            ) : (
              <select
                value={jobType}
                onChange={(e) => setJobType(e.target.value)}
                className="w-full px-3 py-3 border border-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
              >
                {services.map(s => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Quoted Amount */}
          <div>
            <label className="block text-sm font-medium mb-1">Quoted Amount ($)</label>
            <input
              type="number"
              value={quotedPrice}
              onChange={(e) => setQuotedPrice(e.target.value)}
              className="w-full px-3 py-3 border border-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              placeholder="0.00"
              step="0.01"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-3 border border-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
              placeholder="Any details..."
            />
          </div>

          {restoredMsg && (
            <p className="text-sm text-primary font-medium text-center">{restoredMsg}</p>
          )}

          <button
            type="submit"
            disabled={saving || (!selectedClient && !showNewClient)}
            className="w-full py-3 bg-primary text-white rounded-xl font-semibold text-base hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Create Prospect'}
          </button>
        </form>
      </div>
    </div>
  )
}

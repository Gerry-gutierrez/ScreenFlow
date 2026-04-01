import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, Phone, Mail, MapPin, X, RotateCcw } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import AddJobModal from '../components/AddJobModal'
import { formatPhone } from '../utils/formatPhone'

const titles = {
  active: 'Active Clients',
  completed: 'Completed Clients',
  lost: 'Lost Clients',
}

const emptyMessages = {
  active: 'No active clients yet.',
  completed: 'Clients appear here automatically when all their jobs are marked as Done.',
  lost: "Clients you've marked as lost will appear here.",
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function ClientsPage({ filter }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [clients, setClients] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showAddJob, setShowAddJob] = useState(false)
  const [showAddClient, setShowAddClient] = useState(false)
  const [newClient, setNewClient] = useState({ name: '', phone: '', address: '', notes: '' })
  const [savingClient, setSavingClient] = useState(false)

  useEffect(() => {
    if (user) fetchClients()
  }, [user, filter])

  const fetchClients = async () => {
    setLoading(true)

    // Fetch all non-deleted clients with their jobs
    const { data, error } = await supabase
      .from('clients')
      .select('*, jobs(id, status)')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('name')

    if (error) {
      setClients([])
      setLoading(false)
      return
    }

    const allClients = (data || []).map(c => ({
      ...c,
      totalJobs: c.jobs?.length || 0,
      openJobs: c.jobs?.filter(j => j.status !== 'done').length || 0,
      completedJobs: c.jobs?.filter(j => j.status === 'done').length || 0,
      allDone: c.jobs?.length > 0 && c.jobs.every(j => j.status === 'done'),
    }))

    let filtered
    if (filter === 'active') {
      filtered = allClients.filter(c => !c.is_lost && !c.allDone)
    } else if (filter === 'completed') {
      filtered = allClients.filter(c => !c.is_lost && c.allDone)
    } else if (filter === 'lost') {
      filtered = allClients.filter(c => c.is_lost)
    } else {
      filtered = allClients
    }

    setClients(filtered)
    setLoading(false)
  }

  const handleAddClient = async (e) => {
    e.preventDefault()
    if (!newClient.name.trim() || !newClient.phone.trim()) return
    setSavingClient(true)
    const { data: insertedClient } = await supabase.from('clients').insert({
      user_id: user.id,
      name: newClient.name.trim(),
      phone: newClient.phone.trim(),
      address: newClient.address.trim() || null,
      notes: newClient.notes.trim() || null,
    }).select().single()

    if (insertedClient) {
      await supabase.from('client_events').insert({
        client_id: insertedClient.id,
        user_id: user.id,
        event_type: 'created',
        description: 'Client created',
      })
    }
    setSavingClient(false)
    setShowAddClient(false)
    setNewClient({ name: '', phone: '', address: '', notes: '' })
    fetchClients()
  }

  const handleRestore = async (e, client) => {
    e.stopPropagation()
    if (!confirm('Restore this client to active?')) return
    await supabase.from('clients').update({ is_lost: false, lost_at: null }).eq('id', client.id)
    await supabase.from('client_events').insert({
      client_id: client.id, user_id: user.id, event_type: 'restored', description: 'Client restored to active',
    })
    fetchClients()
  }

  const searchFiltered = clients.filter(c => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      c.name?.toLowerCase().includes(q) ||
      c.phone?.includes(q)
    )
  })

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="px-4 pt-4 pb-24">
      <h1 className="text-xl font-bold mb-4">{titles[filter] || 'Clients'}</h1>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or phone..."
          className="w-full pl-9 pr-3 py-3 border border-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
      </div>

      {searchFiltered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-text-secondary text-sm">
            {search ? 'No clients match your search.' : emptyMessages[filter] || 'No clients.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {searchFiltered.map(client => (
            <div
              key={client.id}
              onClick={() => navigate(`/clients/${client.id}`)}
              className="bg-white border border-border rounded-xl p-4 active:bg-surface cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{client.name}</p>

                  <div className="mt-1.5 space-y-1">
                    {client.phone && (
                      <div className="flex items-center gap-2">
                        <Phone size={13} className="text-text-secondary shrink-0" />
                        <a
                          href={`tel:${client.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs text-primary"
                        >
                          {formatPhone(client.phone)}
                        </a>
                      </div>
                    )}
                    {client.email && (
                      <div className="flex items-center gap-2">
                        <Mail size={13} className="text-text-secondary shrink-0" />
                        <span className="text-xs text-text-secondary truncate">{client.email}</span>
                      </div>
                    )}
                    {client.address && (
                      <div className="flex items-center gap-2">
                        <MapPin size={13} className="text-text-secondary shrink-0" />
                        <a
                          href={`https://maps.google.com/?q=${encodeURIComponent(client.address)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs text-primary truncate"
                        >
                          {client.address}
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Context info based on filter */}
                  <div className="mt-2">
                    {filter === 'active' && client.openJobs > 0 && (
                      <span className="text-[11px] text-primary font-medium">
                        {client.openJobs} open job{client.openJobs !== 1 ? 's' : ''}
                      </span>
                    )}
                    {filter === 'completed' && (
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-done-text font-medium">
                          {client.completedJobs} completed job{client.completedJobs !== 1 ? 's' : ''}
                        </span>
                        <span className="text-[11px] text-text-secondary">
                          Client since {formatDate(client.created_at)}
                        </span>
                      </div>
                    )}
                    {filter === 'lost' && client.lost_at && (
                      <span className="text-[11px] text-text-secondary">
                        Lost on {formatDate(client.lost_at)}
                      </span>
                    )}
                    {client.updated_at && (
                      <p className="text-[11px] text-text-secondary mt-1">
                        Last worked on {formatDate(client.updated_at)}
                      </p>
                    )}
                  </div>
                </div>
                {filter === 'lost' && (
                  <button
                    onClick={(e) => handleRestore(e, client)}
                    className="flex items-center gap-1 text-xs font-medium text-primary shrink-0 hover:text-primary/80"
                  >
                    <RotateCcw size={14} /> Restore
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FAB for active view */}
      {filter === 'active' && (
        <button
          onClick={() => setShowAddClient(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-primary text-white rounded-full shadow-lg flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-transform z-50"
        >
          <Plus size={24} />
        </button>
      )}

      {/* Add Client Modal */}
      {showAddClient && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Add Client</h2>
              <button onClick={() => setShowAddClient(false)} className="p-1 rounded-full hover:bg-surface">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddClient} className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input
                  type="text"
                  value={newClient.name}
                  onChange={(e) => setNewClient(c => ({ ...c, name: e.target.value }))}
                  required
                  className="w-full px-3 py-3 border border-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  placeholder="Client name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone *</label>
                <input
                  type="tel"
                  value={newClient.phone}
                  onChange={(e) => setNewClient(c => ({ ...c, phone: e.target.value }))}
                  required
                  className="w-full px-3 py-3 border border-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  placeholder="(555) 123-4567"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Address</label>
                <input
                  type="text"
                  value={newClient.address}
                  onChange={(e) => setNewClient(c => ({ ...c, address: e.target.value }))}
                  className="w-full px-3 py-3 border border-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  placeholder="123 Main St"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  value={newClient.notes}
                  onChange={(e) => setNewClient(c => ({ ...c, notes: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-3 border border-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                  placeholder="Optional notes..."
                />
              </div>
              <button
                type="submit"
                disabled={savingClient || !newClient.name.trim() || !newClient.phone.trim()}
                className="w-full py-3 bg-primary text-white rounded-xl font-semibold text-base hover:bg-primary/90 disabled:opacity-50"
              >
                {savingClient ? 'Saving...' : 'Add Client'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

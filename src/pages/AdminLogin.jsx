import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Shield } from 'lucide-react'

export default function AdminLogin() {
  const [key, setKey] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: 'admin@screenflow.app',
        password: key,
      })
      if (error) throw error
      navigate('/admin/dashboard', { replace: true })
    } catch (err) {
      setError('Invalid admin key')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-white dark:bg-dark-bg">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Shield size={40} className="mx-auto text-primary mb-3" />
          <h1 className="text-2xl font-bold text-primary">ScreenFlow Admin</h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary dark:text-dark-text mb-1">Admin Key</label>
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              required
              className="w-full px-3 py-3 border border-border dark:border-dark-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white dark:bg-dark-card dark:text-dark-text"
              placeholder="Enter your admin key"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-primary text-white rounded-xl font-semibold text-base hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Access Admin'}
          </button>
        </form>
        <p className="text-center text-sm text-text-secondary dark:text-dark-text-secondary mt-6">
          <Link to="/" className="text-primary font-medium hover:underline">Back to ScreenFlow</Link>
        </p>
      </div>
    </div>
  )
}

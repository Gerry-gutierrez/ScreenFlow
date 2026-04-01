import { useState, useEffect } from 'react'
import { CreditCard, User, Shield, Eye, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Settings() {
  const { user, signOut } = useAuth()

  // Information state
  const [businessName, setBusinessName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Password state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [changingPw, setChangingPw] = useState(false)
  const [pwMessage, setPwMessage] = useState('')

  useEffect(() => {
    if (user) fetchProfile()
  }, [user])

  const fetchProfile = async () => {
    const { data } = await supabase
      .from('operator_profile')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (data) {
      setBusinessName(data.business_name || '')
      setPhone(data.phone || '')
      setEmail(data.email || '')
    }
    setLoading(false)
  }

  const handleSaveInfo = async () => {
    setSaving(true)
    const { error } = await supabase
      .from('operator_profile')
      .upsert({
        user_id: user.id,
        business_name: businessName || null,
        phone: phone || null,
        email: email || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })

    setSaving(false)
    if (error) {
      alert('Error saving: ' + error.message)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  const handleChangePassword = async () => {
    setPwMessage('')
    if (newPassword.length < 6) {
      setPwMessage('Password must be at least 6 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      setPwMessage('Passwords do not match')
      return
    }

    setChangingPw(true)

    // Re-authenticate with current password
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    })

    if (signInError) {
      setPwMessage('Current password is incorrect')
      setChangingPw(false)
      return
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setChangingPw(false)

    if (error) {
      setPwMessage('Error: ' + error.message)
    } else {
      setPwMessage('Password updated successfully!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    }
  }

  const handleSignOut = async () => {
    await signOut()
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
      <h1 className="text-xl font-bold mb-6">Settings</h1>

      <div className="space-y-4">
        {/* Billing Card */}
        <div className="bg-white border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard size={18} className="text-primary" />
            <h2 className="text-base font-semibold">Billing</h2>
          </div>
          <p className="text-sm text-text-secondary">Billing settings coming soon</p>
        </div>

        {/* Information Card */}
        <div className="bg-white border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <User size={18} className="text-primary" />
            <h2 className="text-base font-semibold">Information</h2>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Business Name</label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full px-3 py-3 border border-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                placeholder="Your business name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-3 border border-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                placeholder="(555) 123-4567"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-3 border border-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                placeholder="you@email.com"
              />
            </div>

            <button
              onClick={handleSaveInfo}
              disabled={saving}
              className="w-full py-3 bg-primary text-white rounded-xl font-semibold text-base hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Information'}
            </button>
          </div>
        </div>

        {/* Security Card */}
        <div className="bg-white border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={18} className="text-primary" />
            <h2 className="text-base font-semibold">Security</h2>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-3 border border-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                placeholder="Enter current password"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">New Password</label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-3 pr-10 border border-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary"
                >
                  {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-3 border border-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                placeholder="Confirm new password"
              />
            </div>

            {pwMessage && (
              <p className={`text-sm ${pwMessage.includes('successfully') ? 'text-primary' : 'text-red-500'}`}>
                {pwMessage}
              </p>
            )}

            <button
              onClick={handleChangePassword}
              disabled={changingPw || !currentPassword || !newPassword || !confirmPassword}
              className="w-full py-3 bg-primary text-white rounded-xl font-semibold text-base hover:bg-primary/90 disabled:opacity-50"
            >
              {changingPw ? 'Changing...' : 'Change Password'}
            </button>

            <div className="border-t border-border pt-4 mt-2">
              <button
                onClick={handleSignOut}
                className="w-full py-3 border border-red-300 text-red-600 rounded-xl font-semibold text-base hover:bg-red-50"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-text-secondary pb-4">ScreenFlow v1.0</p>
      </div>
    </div>
  )
}

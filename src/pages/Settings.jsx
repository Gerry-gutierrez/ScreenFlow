import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { loadStripe } from '@stripe/stripe-js'
import { CreditCard, User, Shield, Eye, EyeOff, Sun, Moon } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import useSubscription from '../hooks/useSubscription'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)

export default function Settings() {
  const { user, signOut } = useAuth()
  const { darkMode, toggleDarkMode } = useTheme()
  const { subscriptionStatus, daysLeft, refetch } = useSubscription()
  const [searchParams, setSearchParams] = useSearchParams()

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

  // Handle Stripe success redirect
  useEffect(() => {
    const sessionId = searchParams.get('session_id')
    if (sessionId && user) {
      const activateSubscription = async () => {
        await supabase
          .from('operator_profile')
          .update({ subscription_status: 'active' })
          .eq('user_id', user.id)
        // Clean the URL
        setSearchParams({}, { replace: true })
        // Refresh subscription state
        refetch()
      }
      activateSubscription()
    }
  }, [searchParams, user, setSearchParams, refetch])

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

  const handleResubscribe = async () => {
    const stripe = await stripePromise
    await stripe.redirectToCheckout({
      lineItems: [{ price: import.meta.env.VITE_STRIPE_PRICE_ID, quantity: 1 }],
      mode: 'subscription',
      successUrl: `${window.location.origin}/settings?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${window.location.origin}/settings`,
      customerEmail: user?.email,
    })
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
      <h1 className="text-xl font-bold mb-6 dark:text-dark-text">Settings</h1>

      <div className="space-y-4">
        {/* Appearance Card */}
        <div className="bg-white dark:bg-dark-card border border-border dark:border-dark-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {darkMode ? <Moon size={18} className="text-primary" /> : <Sun size={18} className="text-primary" />}
              <h2 className="text-base font-semibold dark:text-dark-text">Appearance</h2>
            </div>
            <button
              onClick={toggleDarkMode}
              className={`relative w-14 h-7 rounded-full transition-colors duration-200 ${
                darkMode ? 'bg-primary' : 'bg-border dark:bg-dark-border'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform duration-200 flex items-center justify-center ${
                  darkMode ? 'translate-x-7' : 'translate-x-0'
                }`}
              >
                {darkMode ? <Moon size={14} className="text-primary" /> : <Sun size={14} className="text-amber-500" />}
              </span>
            </button>
          </div>
        </div>

        {/* Billing Card */}
        <div className="bg-white dark:bg-dark-card border border-border dark:border-dark-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard size={18} className="text-primary" />
            <h2 className="text-base font-semibold dark:text-dark-text">Billing</h2>
          </div>
          {subscriptionStatus === 'trialing' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-semibold rounded-full">Free Trial</span>
              </div>
              <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
                {daysLeft > 0
                  ? `${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining`
                  : 'Trial expired'}
              </p>
            </div>
          )}
          {subscriptionStatus === 'active' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 text-xs font-semibold rounded-full">Active</span>
                <span className="text-sm text-text-secondary dark:text-dark-text-secondary">$15/month</span>
              </div>
              <button
                onClick={() => alert('Stripe Customer Portal coming soon')}
                className="w-full py-2.5 border border-border dark:border-dark-border text-text-primary dark:text-dark-text rounded-xl text-sm font-semibold hover:bg-surface dark:hover:bg-dark-bg"
              >
                Manage Subscription
              </button>
            </div>
          )}
          {subscriptionStatus !== 'trialing' && subscriptionStatus !== 'active' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold rounded-full">Expired</span>
              </div>
              <button
                onClick={handleResubscribe}
                className="w-full py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90"
              >
                Resubscribe
              </button>
            </div>
          )}
        </div>

        {/* Information Card */}
        <div className="bg-white dark:bg-dark-card border border-border dark:border-dark-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <User size={18} className="text-primary" />
            <h2 className="text-base font-semibold dark:text-dark-text">Information</h2>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-dark-text">Business Name</label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full px-3 py-3 border border-border dark:border-dark-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white dark:bg-dark-bg dark:text-dark-text"
                placeholder="Your business name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-dark-text">Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-3 border border-border dark:border-dark-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white dark:bg-dark-bg dark:text-dark-text"
                placeholder="(555) 123-4567"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-dark-text">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-3 border border-border dark:border-dark-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white dark:bg-dark-bg dark:text-dark-text"
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
        <div className="bg-white dark:bg-dark-card border border-border dark:border-dark-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={18} className="text-primary" />
            <h2 className="text-base font-semibold dark:text-dark-text">Security</h2>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-dark-text">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-3 border border-border dark:border-dark-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white dark:bg-dark-bg dark:text-dark-text"
                placeholder="Enter current password"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-dark-text">New Password</label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-3 pr-10 border border-border dark:border-dark-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white dark:bg-dark-bg dark:text-dark-text"
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary dark:text-dark-text-secondary"
                >
                  {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-dark-text">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-3 border border-border dark:border-dark-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white dark:bg-dark-bg dark:text-dark-text"
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

            <div className="border-t border-border dark:border-dark-border pt-4 mt-2">
              <button
                onClick={handleSignOut}
                className="w-full py-3 border border-red-300 text-red-600 rounded-xl font-semibold text-base hover:bg-red-50 dark:hover:bg-red-500/10"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-text-secondary dark:text-dark-text-secondary pb-4">ScreenFlow v1.0</p>
      </div>
    </div>
  )
}

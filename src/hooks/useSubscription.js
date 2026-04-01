import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function useSubscription() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [subscriptionStatus, setSubscriptionStatus] = useState(null)
  const [daysLeft, setDaysLeft] = useState(null)
  const [isActive, setIsActive] = useState(false)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    const fetchSubscription = async () => {
      const { data } = await supabase
        .from('operator_profile')
        .select('trial_start, trial_end, subscription_status')
        .eq('user_id', user.id)
        .single()

      if (data) {
        const status = data.subscription_status
        setSubscriptionStatus(status)

        if (status === 'trialing' && data.trial_end) {
          const now = new Date()
          const trialEnd = new Date(data.trial_end)
          const diffMs = trialEnd - now
          const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
          setDaysLeft(days)
          setIsActive(diffMs > 0)
        } else if (status === 'active') {
          setDaysLeft(null)
          setIsActive(true)
        } else {
          setDaysLeft(0)
          setIsActive(false)
        }
      }

      setLoading(false)
    }

    fetchSubscription()
  }, [user])

  return { loading, subscriptionStatus, daysLeft, isActive }
}

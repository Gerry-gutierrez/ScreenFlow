import { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { useAuth } from '../context/AuthContext'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)

export default function Paywall() {
  const { user, signOut } = useAuth()
  const [loading, setLoading] = useState(false)

  const handleCheckout = async () => {
    setLoading(true)
    const stripe = await stripePromise

    const { error } = await stripe.redirectToCheckout({
      lineItems: [{ price: import.meta.env.VITE_STRIPE_PRICE_ID, quantity: 1 }],
      mode: 'subscription',
      successUrl: `${window.location.origin}/settings?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${window.location.origin}/paywall`,
      customerEmail: user?.email,
    })

    if (error) {
      console.error('Stripe checkout error:', error)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface dark:bg-dark-bg flex items-center justify-center px-6">
      <div className="max-w-sm w-full text-center">
        <div className="text-5xl mb-4">📱</div>
        <h1 className="text-2xl font-bold text-text-primary dark:text-dark-text mb-2">
          Your free trial has ended
        </h1>
        <p className="text-text-secondary dark:text-dark-text-secondary text-sm mb-8">
          We hope you loved using ScreenFlow! Continue managing your clients and
          jobs for just $15/month. Cancel anytime.
        </p>

        <button
          onClick={handleCheckout}
          disabled={loading}
          className="w-full py-3.5 bg-primary text-white rounded-xl font-semibold text-base hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? 'Redirecting...' : 'Continue with ScreenFlow — $15/mo'}
        </button>

        <p className="text-xs text-text-secondary dark:text-dark-text-secondary mt-3">
          No contracts. Cancel anytime.
        </p>

        <button
          onClick={signOut}
          className="mt-8 text-sm text-text-secondary dark:text-dark-text-secondary underline hover:text-text-primary dark:hover:text-dark-text"
        >
          Log out
        </button>
      </div>
    </div>
  )
}

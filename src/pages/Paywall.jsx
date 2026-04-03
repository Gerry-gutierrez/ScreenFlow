import { useAuth } from '../context/AuthContext'

export default function Paywall() {
  const { user, signOut } = useAuth()

  const handleCheckout = () => {
    window.location.href = import.meta.env.VITE_STRIPE_PAYMENT_LINK
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
          className="w-full py-3.5 bg-primary text-white rounded-xl font-semibold text-base hover:bg-primary/90"
        >
          Continue with ScreenFlow — $15/mo
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

import { useAuth } from '../context/AuthContext'

export default function Paywall() {
  const { signOut } = useAuth()

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-6">
      <div className="max-w-sm w-full text-center">
        <div className="text-5xl mb-4">📱</div>
        <h1 className="text-2xl font-bold text-text-primary mb-2">
          Your free trial has ended
        </h1>
        <p className="text-text-secondary text-sm mb-8">
          We hope you loved using ScreenFlow! Continue managing your clients and
          jobs for just $15/month. Cancel anytime.
        </p>

        <button
          onClick={() => alert('Stripe checkout coming soon')}
          className="w-full py-3.5 bg-primary text-white rounded-xl font-semibold text-base hover:bg-primary/90"
        >
          Continue with ScreenFlow — $15/mo
        </button>

        <p className="text-xs text-text-secondary mt-3">
          No contracts. Cancel anytime.
        </p>

        <button
          onClick={signOut}
          className="mt-8 text-sm text-text-secondary underline hover:text-text-primary"
        >
          Log out
        </button>
      </div>
    </div>
  )
}

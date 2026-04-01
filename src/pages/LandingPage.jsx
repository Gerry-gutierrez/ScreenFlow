import { Link } from 'react-router-dom'
import { Users, CalendarCheck, Wrench, ClipboardList } from 'lucide-react'

const features = [
  { icon: Users, title: 'Track Prospects', desc: 'Keep every lead in one place — name, phone, address, notes.' },
  { icon: CalendarCheck, title: 'Stay On Schedule', desc: "See what's quoted, scheduled, and done at a glance." },
  { icon: Wrench, title: 'Manage Services', desc: 'Customize your service list and pricing to fit your business.' },
  { icon: ClipboardList, title: 'Follow Every Job', desc: 'From first call to final walkthrough, never lose track.' },
]
const checks = ['Unlimited clients', 'Unlimited jobs', 'Custom services', 'Full pipeline view']

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto">
        <h1 className="text-xl font-bold text-primary">ScreenFlow</h1>
        <div className="flex items-center gap-4">
          <Link to="/admin" className="text-sm font-medium text-text-secondary hover:text-primary">Admin</Link>
          <Link to="/login" className="text-sm font-medium text-primary hover:underline">Log In</Link>
        </div>
      </nav>
      <section className="px-6 py-16 text-center max-w-2xl mx-auto">
        <h2 className="text-4xl font-bold text-text-primary leading-tight">Your jobs, organized.<br />Finally.</h2>
        <p className="text-text-secondary mt-4 text-lg leading-relaxed">Stop running your screen enclosure business from texts and memory. Track clients, manage jobs, and keep your pipeline moving — all in one place.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
          <Link to="/signup" className="px-6 py-3 bg-primary text-white rounded-xl font-semibold text-base hover:bg-primary/90 transition-colors">Start Your Free Trial</Link>
          <Link to="/login" className="px-6 py-3 border border-border text-text-primary rounded-xl font-semibold text-base hover:bg-surface transition-colors">Log In</Link>
        </div>
        <p className="text-xs text-text-secondary mt-4">14-day free trial. No credit card required.</p>
      </section>
      <section className="px-6 py-16 bg-surface">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold text-text-primary text-center mb-10">Everything you need. Nothing you don't.</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white rounded-xl p-6 border border-border">
                <Icon size={24} className="text-primary mb-3" />
                <h4 className="font-semibold text-text-primary mb-1">{title}</h4>
                <p className="text-sm text-text-secondary">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="px-6 py-16">
        <div className="max-w-md mx-auto text-center">
          <h3 className="text-2xl font-bold text-text-primary mb-2">Simple pricing</h3>
          <p className="text-4xl font-bold text-primary mt-4">$15<span className="text-lg font-normal text-text-secondary">/month</span></p>
          <p className="text-text-secondary text-sm mt-1">after your 14-day free trial</p>
          <ul className="mt-6 space-y-2 text-left inline-block">
            {checks.map((item) => (<li key={item} className="flex items-center gap-2 text-sm text-text-primary"><span className="text-primary font-bold">✓</span> {item}</li>))}
          </ul>
          <div className="mt-8">
            <Link to="/signup" className="inline-block px-6 py-3 bg-primary text-white rounded-xl font-semibold text-base hover:bg-primary/90 transition-colors">Start Your Free Trial</Link>
          </div>
        </div>
      </section>
      <footer className="px-6 py-8 border-t border-border">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-sm text-text-secondary">
          <span className="font-medium text-text-primary">ScreenFlow</span>
          <div className="flex items-center gap-4">
            <Link to="/admin" className="hover:text-primary">Admin</Link>
            <Link to="/login" className="hover:text-primary">Log In</Link>
          </div>
        </div>
        <p className="text-center text-xs text-text-secondary mt-4">© 2026 ScreenFlow. All rights reserved.</p>
      </footer>
    </div>
  )
}

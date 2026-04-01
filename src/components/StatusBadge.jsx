const statusConfig = {
  lead: { label: 'Prospect', bg: 'bg-lead-bg', text: 'text-lead-text' },
  quoted: { label: 'Quoted', bg: 'bg-quoted-bg', text: 'text-quoted-text' },
  scheduled: { label: 'Scheduled', bg: 'bg-scheduled-bg', text: 'text-scheduled-text' },
  done: { label: 'Done', bg: 'bg-done-bg', text: 'text-done-text' },
}

export default function StatusBadge({ status, size = 'sm' }) {
  const config = statusConfig[status] || statusConfig.lead
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${config.bg} ${config.text} ${sizeClasses}`}>
      {config.label}
    </span>
  )
}

export { statusConfig }

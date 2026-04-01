import { useNavigate } from 'react-router-dom'

export default function ClientCard({ client }) {
  const navigate = useNavigate()

  return (
    <div
      onClick={() => navigate(`/clients/${client.id}`)}
      className="bg-white border border-border rounded-xl p-4 active:bg-surface transition-colors cursor-pointer"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-text-primary truncate">{client.name}</p>
          {client.address && (
            <p className="text-sm text-text-secondary truncate mt-0.5">{client.address}</p>
          )}
          <p className="text-sm text-text-secondary mt-0.5">{client.phone}</p>
        </div>
        {client.job_count > 0 && (
          <span className="text-xs font-medium text-text-secondary bg-surface px-2 py-1 rounded-full shrink-0">
            {client.job_count} job{client.job_count !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  )
}

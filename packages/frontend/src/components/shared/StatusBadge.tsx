import { SessionStatus } from '@claude-code-web/shared'

interface StatusBadgeProps {
  status: SessionStatus | undefined
}

export function StatusBadge({ status }: StatusBadgeProps) {
  if (!status) {
    return null
  }

  const statusConfig = {
    [SessionStatus.INITIALIZING]: {
      label: 'Initializing',
      className: 'bg-yellow-100 text-yellow-800',
    },
    [SessionStatus.ACTIVE]: {
      label: 'Active',
      className: 'bg-green-100 text-green-800',
    },
    [SessionStatus.TERMINATED]: {
      label: 'Terminated',
      className: 'bg-gray-100 text-gray-800',
    },
  }

  const config = statusConfig[status]

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  )
}

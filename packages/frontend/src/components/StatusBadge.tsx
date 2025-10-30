import { SessionStatus } from '@claude-code-web/shared'

import { cns } from 'src/utils/cns'

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
      className: 'bg-yellow-950 text-yellow-400',
    },
    [SessionStatus.ACTIVE]: {
      label: 'Active',
      className: 'bg-green-950 text-green-400',
    },
    [SessionStatus.TERMINATED]: {
      label: 'Terminated',
      className: 'bg-gray-800 text-gray-400',
    },
  }

  const config = statusConfig[status]

  return (
    <span
      className={cns(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        config.className,
      )}
    >
      {config.label}
    </span>
  )
}

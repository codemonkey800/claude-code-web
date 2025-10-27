import { SessionStatus } from '@claude-code-web/shared'
import { Clock, Database, PlusCircle, RefreshCw } from 'lucide-react'

import { useCreateSession, useSessions } from 'src/hooks/useSessions'
import { useSocket } from 'src/hooks/useSocket'
import { ConnectionStatus } from 'src/types/socket'

/**
 * Get Tailwind CSS classes for status badge based on session status
 */
function getStatusClasses(status: SessionStatus): string {
  switch (status) {
    case SessionStatus.INITIALIZING:
      return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    case SessionStatus.ACTIVE:
      return 'bg-green-100 text-green-800 border-green-300'
    case SessionStatus.TERMINATED:
      return 'bg-gray-100 text-gray-800 border-gray-300'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300'
  }
}

/**
 * Truncate session ID for display (show first 8 characters)
 */
function formatSessionId(id: string): string {
  return id.slice(0, 8) + '...'
}

/**
 * Format timestamp to relative time
 * Accepts either a string or Date object
 */
function formatRelativeTime(dateInput: string | Date): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) {
    return 'just now'
  } else if (diffMins < 60) {
    return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  } else {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
  }
}

export function SessionTester() {
  const { connectionStatus } = useSocket()
  const isConnected = connectionStatus === ConnectionStatus.CONNECTED

  // React Query hooks for data fetching and mutations
  const {
    data: sessions = [],
    isLoading,
    error: queryError,
    refetch,
  } = useSessions()
  const { mutate: createSession, isPending: isCreating } = useCreateSession()

  // Extract error message from query error
  const error = queryError instanceof Error ? queryError.message : null

  /**
   * Handle create session button click
   */
  const handleCreateSession = (): void => {
    if (!isConnected || isCreating) return
    createSession({})
  }

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-purple-500" />
          <h2 className="text-xl font-semibold text-gray-900">
            Session Management
          </h2>
        </div>
        <button
          onClick={(): void => {
            void refetch()
          }}
          disabled={isLoading}
          className="text-sm text-gray-500 hover:text-purple-600 transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Refresh sessions"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Create session button */}
      <div className="mb-6">
        <button
          onClick={handleCreateSession}
          disabled={!isConnected || isCreating}
          className="w-full sm:w-auto px-6 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <PlusCircle className="w-4 h-4" />
          {isCreating ? 'Creating...' : 'Create New Session'}
        </button>
      </div>

      {/* Sessions list */}
      {isLoading && sessions.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <RefreshCw className="w-8 h-8 mx-auto mb-2 opacity-50 animate-spin" />
          <p className="text-sm">Loading sessions...</p>
        </div>
      ) : sessions.length > 0 ? (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {sessions.map(session => (
            <div
              key={session.id}
              className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {/* Session ID */}
                  <div className="flex items-center gap-2 mb-2">
                    <code
                      className="text-sm font-mono text-gray-700"
                      title={session.id}
                    >
                      {formatSessionId(session.id)}
                    </code>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border ${getStatusClasses(session.status)}`}
                    >
                      {session.status}
                    </span>
                  </div>

                  {/* Working directory */}
                  <p className="text-sm text-gray-600 mb-1 truncate">
                    <span className="font-medium">Directory:</span>{' '}
                    {session.workingDirectory}
                  </p>

                  {/* Timestamp */}
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    <span>Created {formatRelativeTime(session.createdAt)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-400">
          <Database className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No sessions yet. Create one to get started!</p>
        </div>
      )}
    </div>
  )
}

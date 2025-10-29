import type { Session } from '@claude-code-web/shared'
import { Folder, Loader2, Plus } from 'lucide-react'

import { useSessions } from 'src/hooks/useSessions'

interface SessionItemProps {
  session: Session
  isActive: boolean
  onClick: () => void
}

function SessionItem({ session, isActive, onClick }: SessionItemProps) {
  const workingDirectoryName = session.workingDirectory.split('/').pop() || '/'

  // Format relative time
  const formatRelativeTime = (date: Date): string => {
    const now = new Date()
    const diffMs = now.getTime() - new Date(date).getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  // Status indicator color
  const statusColor = {
    initializing: 'bg-yellow-400',
    active: 'bg-green-400',
    terminated: 'bg-gray-400',
  }[session.status]

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg transition-colors ${
        isActive
          ? 'bg-blue-50 border border-blue-200'
          : 'hover:bg-gray-50 border border-transparent'
      }`}
    >
      <div className="flex items-start gap-3">
        <Folder
          className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
            isActive ? 'text-blue-600' : 'text-gray-400'
          }`}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p
              className={`text-sm font-medium truncate ${
                isActive ? 'text-blue-900' : 'text-gray-900'
              }`}
            >
              {workingDirectoryName}
            </p>
            <div
              className={`w-2 h-2 rounded-full flex-shrink-0 ${statusColor}`}
            />
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {formatRelativeTime(session.updatedAt)}
          </p>
        </div>
      </div>
    </button>
  )
}

interface SessionSidebarProps {
  activeSessionId: string | null
  onSessionChange: (sessionId: string | null) => void
  onClose?: () => void
}

export function SessionSidebar({
  activeSessionId,
  onSessionChange,
  onClose,
}: SessionSidebarProps) {
  const { data: sessions = [], isLoading } = useSessions()

  const handleNewChatClick = () => {
    onSessionChange(null) // Clear active session = new chat
    // Close sidebar on mobile after navigation
    onClose?.()
  }

  const handleSessionClick = (sessionId: string) => {
    onSessionChange(sessionId)
    // Close sidebar on mobile after selecting session
    onClose?.()
  }

  return (
    <aside className="w-80 h-full border-r border-gray-200 flex flex-col bg-white">
      {/* Header with New Chat button */}
      <div className="p-4 border-b border-gray-200">
        <button
          type="button"
          onClick={handleNewChatClick}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </button>
      </div>

      {/* Scrollable session list */}
      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8 px-4">
            <p className="text-sm text-gray-500">No sessions yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Click "New Chat" to get started
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {sessions.map(session => (
              <SessionItem
                key={session.id}
                session={session}
                isActive={session.id === activeSessionId}
                onClick={() => handleSessionClick(session.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer - show only when data is loaded and we have sessions */}
      {!isLoading && sessions.length > 0 && (
        <div className="p-4 border-t border-gray-200">
          <div className="text-xs text-gray-500 text-center">
            {sessions.length} {sessions.length === 1 ? 'session' : 'sessions'}
          </div>
        </div>
      )}
    </aside>
  )
}

import { Loader2 } from 'lucide-react'
import { useState } from 'react'

import { ChatInput } from 'src/components/shared/ChatInput'
import { DirectoryPathHeader } from 'src/components/shared/DirectoryPathHeader'
import { StatusBadge } from 'src/components/shared/StatusBadge'
import { useSession } from 'src/hooks/useSession'

interface ChatViewProps {
  sessionId: string | null
}

export function ChatView({ sessionId }: ChatViewProps) {
  const [selectedDirectory, setSelectedDirectory] = useState('~')

  // Only fetch session if sessionId exists
  const {
    data: session,
    isLoading,
    isError,
  } = useSession(sessionId ?? undefined, {
    enabled: !!sessionId,
  })

  const isNewChat = !sessionId
  const directoryPath = isNewChat
    ? selectedDirectory
    : session?.workingDirectory

  const handleSubmit = () => {
    // TODO: Send query to session
    // Intentionally empty for now
  }

  const handleDirectoryChange = (newPath: string) => {
    setSelectedDirectory(newPath)
  }

  // Loading state (only for existing sessions)
  if (!isNewChat && isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  // Error state (only for existing sessions)
  if (!isNewChat && (isError || !session)) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-lg text-red-400">Session not found</p>
          <p className="text-sm text-gray-400 mt-2">
            The session you're looking for doesn't exist
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with directory path */}
      <div className="flex items-center justify-between pr-6">
        <DirectoryPathHeader
          path={directoryPath || '~'}
          editable={isNewChat}
          onPathChange={handleDirectoryChange}
        />
        {!isNewChat && session && <StatusBadge status={session.status} />}
      </div>

      {/* Empty message area (placeholder) */}
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-400">
          {isNewChat
            ? 'Select a directory and start chatting...'
            : 'Message display coming soon...'}
        </p>
      </div>

      {/* Input at bottom */}
      <div className="p-4 border-t border-gray-700">
        <div className="max-w-4xl mx-auto">
          <ChatInput
            placeholder="Send a message..."
            disabled={true}
            onSubmit={handleSubmit}
          />
        </div>
      </div>
    </div>
  )
}

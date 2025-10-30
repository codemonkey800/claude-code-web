import {
  type ClaudeMessage,
  type Session,
  SessionStatus,
  WS_EVENTS,
} from '@claude-code-web/shared'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import React, { useEffect, useState } from 'react'

import { ChatInput } from 'src/components/ChatInput'
import { DirectoryPathHeader } from 'src/components/DirectoryPathHeader'
import { StatusBadge } from 'src/components/StatusBadge'
import { useFilesystemConfig } from 'src/hooks/useFilesystem'
import { useSession } from 'src/hooks/useSession'
import {
  useCreateSession,
  useSendQuery,
  useStartSession,
} from 'src/hooks/useSessions'
import { useSocket } from 'src/hooks/useSocket'

import { MessageList } from './MessageList'

interface ChatViewProps {
  sessionId: string | null
  onSessionChange: (sessionId: string | null) => void
}

export function ChatView({
  sessionId,
  onSessionChange,
}: ChatViewProps): React.JSX.Element {
  const { data: config } = useFilesystemConfig()
  const baseDir = config?.allowedBaseDir ?? '~'
  const [selectedDirectory, setSelectedDirectory] = useState(baseDir)
  const [messages, setMessages] = useState<ClaudeMessage[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(
    sessionId,
  )

  const { socket, isConnected } = useSocket()
  const queryClient = useQueryClient()
  const createSession = useCreateSession()
  const startSession = useStartSession()
  const sendQuery = useSendQuery()

  // Sync selectedDirectory with baseDir when config loads
  useEffect(() => {
    if (config?.allowedBaseDir) {
      setSelectedDirectory(config.allowedBaseDir)
    }
  }, [config?.allowedBaseDir])

  // Update currentSessionId when sessionId prop changes
  useEffect(() => {
    if (sessionId !== currentSessionId) {
      setCurrentSessionId(sessionId)
      setMessages([]) // Clear messages when switching sessions
    }
  }, [sessionId, currentSessionId])

  // Only fetch session if sessionId exists
  const {
    data: session,
    isLoading: isLoadingSession,
    isError,
  } = useSession(currentSessionId ?? undefined, {
    enabled: !!currentSessionId,
  })

  const isNewChat = !currentSessionId
  const directoryPath = isNewChat
    ? selectedDirectory
    : session?.workingDirectory

  // Load message history from REST API when session data is fetched
  useEffect(() => {
    if (session?.messages) {
      setMessages(session.messages)
    }
  }, [session?.messages])

  // Join session room and listen for real-time messages and status updates
  useEffect(() => {
    if (!socket || !isConnected || !currentSessionId) return

    // Join session room
    socket.emit(WS_EVENTS.SESSION_JOIN, {
      type: WS_EVENTS.SESSION_JOIN,
      timestamp: new Date().toISOString(),
      payload: {
        sessionId: currentSessionId,
      },
    })

    // Listen for Claude messages (real-time updates only)
    const handleClaudeMessage = (data: {
      payload: { message: ClaudeMessage }
    }): void => {
      setMessages(prev => [...prev, data.payload.message])
    }

    // Listen for session status updates
    const handleSessionStatus = (data: {
      payload: { sessionId: string; session: Session }
    }): void => {
      if (data.payload.sessionId === currentSessionId) {
        // Invalidate session query to refetch with new status
        void queryClient.invalidateQueries({
          queryKey: ['sessions', 'detail', currentSessionId],
        })
      }
    }

    socket.on(WS_EVENTS.CLAUDE_MESSAGE, handleClaudeMessage)
    socket.on(WS_EVENTS.SESSION_STATUS, handleSessionStatus)

    // Cleanup
    return (): void => {
      socket.off(WS_EVENTS.CLAUDE_MESSAGE, handleClaudeMessage)
      socket.off(WS_EVENTS.SESSION_STATUS, handleSessionStatus)
      socket.emit(WS_EVENTS.SESSION_LEAVE, {
        type: WS_EVENTS.SESSION_LEAVE,
        timestamp: new Date().toISOString(),
        payload: {
          sessionId: currentSessionId,
        },
      })
    }
  }, [socket, isConnected, currentSessionId, queryClient])

  const handleSubmit = async (prompt: string): Promise<void> => {
    if (!prompt.trim()) return

    try {
      if (isNewChat) {
        // Create new session with selected directory
        const newSession = await createSession.mutateAsync({
          workingDirectory: selectedDirectory,
        })

        // Start the session with the initial query
        await startSession.mutateAsync({
          sessionId: newSession.id,
          payload: { prompt },
        })

        // Update current session ID and notify parent
        setCurrentSessionId(newSession.id)
        onSessionChange(newSession.id)
      } else if (currentSessionId) {
        // Send query to existing session
        await sendQuery.mutateAsync({
          sessionId: currentSessionId,
          payload: { prompt },
        })
      }
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  const handleDirectoryChange = (newPath: string): void => {
    setSelectedDirectory(newPath)
  }

  const isSending =
    createSession.isPending || startSession.isPending || sendQuery.isPending

  // Disable input if session is INITIALIZING
  const isSessionInitializing = session?.status === SessionStatus.INITIALIZING
  const isInputDisabled = isSessionInitializing

  // Loading state (only for existing sessions)
  if (!isNewChat && isLoadingSession) {
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
      <div className="flex items-center justify-between px-3 border-b border-gray-700 h-16">
        <DirectoryPathHeader
          path={directoryPath || baseDir}
          editable={isNewChat}
          onPathChange={handleDirectoryChange}
        />

        {!isNewChat && session && <StatusBadge status={session.status} />}
      </div>

      {/* Message display */}
      <MessageList messages={messages} />

      {/* Input at bottom */}
      <div className="p-4 border-t border-gray-700">
        <div className="max-w-4xl mx-auto">
          <ChatInput
            placeholder={
              isInputDisabled ? 'Initializing session...' : 'Send a message...'
            }
            disabled={isInputDisabled}
            isLoading={isSending}
            onSubmit={(prompt): void => {
              void handleSubmit(prompt)
            }}
          />
        </div>
      </div>
    </div>
  )
}

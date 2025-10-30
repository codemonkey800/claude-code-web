import React from 'react'

import { cns } from 'src/utils/cns'

export interface ClaudeMessage {
  type: string
  timestamp?: string
  [key: string]: unknown
}

interface MessageProps {
  message: ClaudeMessage
}

export function Message({ message }: MessageProps): React.JSX.Element {
  const isUserMessage = message.type === 'user'
  const isAssistantMessage = message.type === 'assistant'
  const isSystemMessage = message.type === 'system'
  const isResultMessage = message.type === 'result'

  // Get message content based on type
  const getContent = (): string => {
    // For now, just stringify the message for debugging
    return JSON.stringify(message, null, 2)
  }

  // Color based on message type
  const getBgColor = (): string => {
    if (isUserMessage) return 'bg-blue-950 border-blue-800'
    if (isAssistantMessage) return 'bg-purple-950 border-purple-800'
    if (isSystemMessage) return 'bg-gray-800 border-gray-700'
    if (isResultMessage) return 'bg-green-950 border-green-800'
    return 'bg-gray-900 border-gray-700'
  }

  // Badge color based on message type
  const getBadgeColor = (): string => {
    if (isUserMessage) return 'bg-blue-500 text-blue-100'
    if (isAssistantMessage) return 'bg-purple-500 text-purple-100'
    if (isSystemMessage) return 'bg-gray-500 text-gray-100'
    if (isResultMessage) return 'bg-green-500 text-green-100'
    return 'bg-gray-500 text-gray-100'
  }

  return (
    <div className={cns('p-4 rounded-lg border', getBgColor())}>
      {/* Message type badge */}
      <div className="flex items-center gap-2 mb-2">
        <span
          className={cns(
            'text-xs font-semibold px-2 py-1 rounded',
            getBadgeColor(),
          )}
        >
          {message.type}
        </span>
        {message.timestamp && (
          <span className="text-xs text-gray-500">{message.timestamp}</span>
        )}
      </div>

      {/* Message content */}
      <div className="text-sm text-gray-300 font-mono whitespace-pre-wrap break-words">
        {getContent()}
      </div>
    </div>
  )
}

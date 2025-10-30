import { type ClaudeMessage } from '@claude-code-web/shared'
import React, { useEffect, useRef } from 'react'

import { Message } from './Message'

interface MessageListProps {
  messages: ClaudeMessage[]
}

export function MessageList({ messages }: MessageListProps): React.JSX.Element {
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-400">
          No messages yet. Send a message to start!
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message, index) => {
        const isUserPrompt = message.type === 'user_prompt'
        return (
          <div
            key={index}
            className={isUserPrompt ? 'flex justify-end' : 'flex justify-start'}
          >
            <Message message={message} />
          </div>
        )
      })}
      <div ref={bottomRef} />
    </div>
  )
}

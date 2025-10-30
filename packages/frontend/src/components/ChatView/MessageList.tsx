import { type ClaudeMessage } from '@claude-code-web/shared'
import React, { useEffect, useRef } from 'react'

import { Message } from './Message'

interface MessageListProps {
  messages: ClaudeMessage[]
}

/**
 * Extracts text content from assistant messages by concatenating all text blocks
 */
function extractAssistantText(message: ClaudeMessage): string {
  if (message.type !== 'assistant') {
    return ''
  }

  return message.message.content
    .filter(content => content.type === 'text')
    .map(content => content.text)
    .join('')
}

/**
 * Determines if an assistant message should be filtered out because
 * it duplicates the content of a following result message
 */
function shouldFilterMessage(
  currentMessage: ClaudeMessage,
  nextMessage: ClaudeMessage | undefined,
): boolean {
  // Only filter assistant messages
  if (currentMessage.type !== 'assistant') {
    return false
  }

  // Must have a next message that's a result
  if (!nextMessage || nextMessage.type !== 'result') {
    return false
  }

  // Result message must have a string result field
  if (typeof nextMessage.result !== 'string') {
    return false
  }

  // Extract text from assistant message
  const assistantText = extractAssistantText(currentMessage)

  // Filter if content matches exactly
  return assistantText === nextMessage.result
}

export function MessageList({ messages }: MessageListProps): React.JSX.Element {
  const bottomRef = useRef<HTMLDivElement>(null)

  // Filter out duplicate assistant messages that match the following result message
  const filteredMessages = messages.filter((message, index) => {
    const nextMessage = messages[index + 1]
    return !shouldFilterMessage(message, nextMessage)
  })

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (filteredMessages.length === 0) {
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
      {filteredMessages.map((message, index) => {
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

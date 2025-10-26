import {
  type MessageEvent,
  type MessageResponseEvent,
  type PingEvent,
  type PongEvent,
  WS_EVENTS,
} from '@claude-code-web/shared'
import { MessageCircle, Send, Trash2, Zap } from 'lucide-react'
import { useCallback, useState } from 'react'

import { useSocket } from 'src/hooks/useSocket'
import { useSocketEvent } from 'src/hooks/useSocketEvent'
import { ConnectionStatus } from 'src/types/socket'

interface PingResult {
  id: string
  sentAt: number
  receivedAt: number
  roundTripTime: number
}

interface MessageHistoryItem {
  id: string
  content: string
  type: 'sent' | 'received'
  timestamp: number
}

export function MessageTester() {
  const { socket, connectionStatus } = useSocket()
  const isConnected = connectionStatus === ConnectionStatus.CONNECTED

  // Ping/Pong state
  const [pingPending, setPingPending] = useState(false)
  const [lastPing, setLastPing] = useState<PingResult | null>(null)
  const [pendingPingId, setPendingPingId] = useState<string | null>(null)
  const [pendingPingSentAt, setPendingPingSentAt] = useState<number | null>(
    null,
  )

  // Message echo state
  const [messageInput, setMessageInput] = useState('')
  const [messagePending, setMessagePending] = useState(false)
  const [messageHistory, setMessageHistory] = useState<MessageHistoryItem[]>([])
  const [pendingMessageIds, setPendingMessageIds] = useState<Set<string>>(
    new Set(),
  )

  // Handle pong responses
  const handlePong = useCallback(
    (data: PongEvent) => {
      if (data.id && data.id === pendingPingId && pendingPingSentAt) {
        const receivedAt = Date.now()
        const roundTripTime = receivedAt - pendingPingSentAt

        setLastPing({
          id: data.id,
          sentAt: pendingPingSentAt,
          receivedAt,
          roundTripTime,
        })
        setPingPending(false)
        setPendingPingId(null)
        setPendingPingSentAt(null)
      }
    },
    [pendingPingId, pendingPingSentAt],
  )

  useSocketEvent<PongEvent>(WS_EVENTS.PONG, handlePong)

  // Handle message responses
  const handleMessageResponse = useCallback(
    (data: MessageResponseEvent) => {
      const responseId = data.id
      if (responseId && pendingMessageIds.has(responseId)) {
        // Add received message to history
        setMessageHistory(prev => [
          ...prev,
          {
            id: responseId,
            content: data.payload.content,
            type: 'received',
            timestamp: Date.now(),
          },
        ])

        // Remove from pending
        setPendingMessageIds(prev => {
          const next = new Set(prev)
          next.delete(responseId)
          return next
        })

        // Clear pending state if no more pending messages
        setPendingMessageIds(prev => {
          if (prev.size === 0) {
            setMessagePending(false)
          }
          return prev
        })
      }
    },
    [pendingMessageIds],
  )

  useSocketEvent<MessageResponseEvent>(WS_EVENTS.MESSAGE, handleMessageResponse)

  const handlePingClick = () => {
    if (!socket || !isConnected || pingPending) return

    const id = crypto.randomUUID()
    const sentAt = Date.now()

    setPingPending(true)
    setPendingPingId(id)
    setPendingPingSentAt(sentAt)

    const pingEvent: PingEvent = {
      type: WS_EVENTS.PING,
      timestamp: new Date().toISOString(),
      id,
    }

    socket.emit(WS_EVENTS.PING, pingEvent)
  }

  const handleSendMessage = () => {
    if (!socket || !isConnected || !messageInput.trim() || messagePending)
      return

    const id = crypto.randomUUID()
    const content = messageInput.trim()

    // Add to history
    setMessageHistory(prev => [
      ...prev,
      {
        id,
        content,
        type: 'sent',
        timestamp: Date.now(),
      },
    ])

    // Track pending message
    setPendingMessageIds(prev => new Set(prev).add(id))
    setMessagePending(true)

    const messageEvent: MessageEvent = {
      type: WS_EVENTS.MESSAGE,
      timestamp: new Date().toISOString(),
      id,
      payload: { content },
    }

    socket.emit(WS_EVENTS.MESSAGE, messageEvent)
    setMessageInput('')
  }

  const handleClearHistory = () => {
    setMessageHistory([])
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    })
  }

  return (
    <div className="space-y-6">
      {/* Ping/Pong Tester */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-yellow-500" />
          <h2 className="text-xl font-semibold text-gray-900">
            Ping/Pong Tester
          </h2>
        </div>

        <div className="space-y-4">
          <button
            onClick={handlePingClick}
            disabled={!isConnected || pingPending}
            className="w-full sm:w-auto px-6 py-2 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Zap className="w-4 h-4" />
            {pingPending ? 'Pinging...' : 'Send Ping'}
          </button>

          {lastPing && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm font-medium text-green-900 mb-2">
                Last Pong Response
              </p>
              <div className="text-xs text-green-700 space-y-1">
                <p>
                  <span className="font-medium">Sent:</span>{' '}
                  {formatTime(lastPing.sentAt)}
                </p>
                <p>
                  <span className="font-medium">Received:</span>{' '}
                  {formatTime(lastPing.receivedAt)}
                </p>
                <p>
                  <span className="font-medium">Round Trip Time:</span>{' '}
                  {lastPing.roundTripTime}ms
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Message Echo Tester */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-blue-500" />
            <h2 className="text-xl font-semibold text-gray-900">
              Message Echo Tester
            </h2>
          </div>
          {messageHistory.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="text-sm text-gray-500 hover:text-red-600 transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-4 h-4" />
              Clear
            </button>
          )}
        </div>

        <div className="space-y-4">
          {/* Input area */}
          <div className="flex gap-2">
            <input
              type="text"
              value={messageInput}
              onChange={e => setMessageInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage()
                }
              }}
              placeholder="Type a message to echo..."
              disabled={!isConnected || messagePending}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <button
              onClick={handleSendMessage}
              disabled={!isConnected || !messageInput.trim() || messagePending}
              className="px-6 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Send
            </button>
          </div>

          {/* Message history */}
          {messageHistory.length > 0 && (
            <div className="border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto space-y-2">
              {messageHistory.map(item => (
                <div
                  key={`${item.id}-${item.type}`}
                  className={`p-3 rounded-lg ${
                    item.type === 'sent'
                      ? 'bg-blue-50 border border-blue-200 ml-8'
                      : 'bg-green-50 border border-green-200 mr-8'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium ${
                          item.type === 'sent'
                            ? 'text-blue-900'
                            : 'text-green-900'
                        }`}
                      >
                        {item.type === 'sent' ? 'Sent' : 'Echo Received'}
                      </p>
                      <p
                        className={`text-sm mt-1 break-words ${
                          item.type === 'sent'
                            ? 'text-blue-700'
                            : 'text-green-700'
                        }`}
                      >
                        {item.content}
                      </p>
                    </div>
                    <span
                      className={`text-xs whitespace-nowrap ${
                        item.type === 'sent'
                          ? 'text-blue-600'
                          : 'text-green-600'
                      }`}
                    >
                      {formatTime(item.timestamp)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {messageHistory.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                No messages yet. Send one to get started!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

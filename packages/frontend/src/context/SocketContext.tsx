/**
 * Socket.io React Context for managing WebSocket connection
 */

import type React from 'react'
import { createContext, useEffect, useMemo, useState } from 'react'
import { io, type Socket } from 'socket.io-client'

import { ConnectionStatus, type SocketContextState } from 'src/types/socket'

// Backend WebSocket URL
const SOCKET_URL: string =
  (import.meta.env.VITE_BACKEND_URL as string | undefined) ||
  'http://localhost:8081'

// Create context with default values
export const SocketContext = createContext<SocketContextState | null>(null)

/**
 * Socket Context Provider Component
 * Manages Socket.io connection lifecycle and provides connection state
 */
export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    ConnectionStatus.DISCONNECTED,
  )
  const [error, setError] = useState<string | null>(null)
  const [reconnectAttempt, setReconnectAttempt] = useState(0)

  useEffect((): (() => void) => {
    // Initialize socket connection
    // eslint-disable-next-line no-console
    console.log(
      '[SocketContext] Initializing socket connection to:',
      SOCKET_URL,
    )
    setConnectionStatus(ConnectionStatus.CONNECTING)

    const socketInstance = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    })

    // Connection event handlers
    socketInstance.on('connect', (): void => {
      // eslint-disable-next-line no-console
      console.log('[SocketContext] Socket connected:', socketInstance.id)
      setConnectionStatus(ConnectionStatus.CONNECTED)
      setError(null)
      setReconnectAttempt(0)
    })

    socketInstance.on('disconnect', (reason: string): void => {
      console.warn('[SocketContext] Socket disconnected:', reason)
      setConnectionStatus(ConnectionStatus.DISCONNECTED)
    })

    socketInstance.on('connect_error', (err: Error): void => {
      console.error('[SocketContext] Connection error:', err.message)
      setConnectionStatus(ConnectionStatus.ERROR)
      setError(err.message)
    })

    socketInstance.io.on('reconnect_attempt', (attemptNumber: number): void => {
      console.warn('[SocketContext] Reconnection attempt:', attemptNumber)
      setConnectionStatus(ConnectionStatus.RECONNECTING)
      setReconnectAttempt(attemptNumber)
    })

    socketInstance.io.on('reconnect', (attemptNumber: number): void => {
      console.warn('[SocketContext] Reconnected after attempts:', attemptNumber)
      setConnectionStatus(ConnectionStatus.CONNECTED)
      setError(null)
      setReconnectAttempt(0)
    })

    socketInstance.io.on('reconnect_failed', (): void => {
      console.error('[SocketContext] Reconnection failed')
      setConnectionStatus(ConnectionStatus.ERROR)
      setError('Failed to reconnect to server')
    })

    setSocket(socketInstance)

    // Cleanup on unmount
    return (): void => {
      // eslint-disable-next-line no-console
      console.log('[SocketContext] Cleaning up socket connection')
      socketInstance.removeAllListeners()
      socketInstance.disconnect()
    }
  }, [])

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    (): SocketContextState => ({
      socket,
      connectionStatus,
      error,
      isConnected: connectionStatus === ConnectionStatus.CONNECTED,
      reconnectAttempt,
    }),
    [socket, connectionStatus, error, reconnectAttempt],
  )

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  )
}

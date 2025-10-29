/**
 * Socket.io React Context for managing WebSocket connection
 */

import type React from 'react'
import { createContext, useCallback, useMemo, useState } from 'react'
import { io, type Socket } from 'socket.io-client'

import { ConnectionStatus, type SocketContextState } from 'src/types/socket'

// Create context with default values
export const SocketContext = createContext<SocketContextState | null>(null)

/**
 * Socket Context Provider Component
 * Manages Socket.io connection lifecycle and provides connection state
 */
export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [serverUrl, setServerUrl] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    ConnectionStatus.DISCONNECTED,
  )
  const [error, setError] = useState<string | null>(null)
  const [reconnectAttempt, setReconnectAttempt] = useState(0)

  /**
   * Connect to a WebSocket server at the specified URL
   */
  const connect = useCallback(
    (url: string): void => {
      // If already connected or connecting, disconnect first
      if (socket) {
        socket.removeAllListeners()
        socket.disconnect()
      }

      // eslint-disable-next-line no-console
      console.log('[SocketContext] Connecting to:', url)
      setServerUrl(url)
      setConnectionStatus(ConnectionStatus.CONNECTING)
      setError(null)
      setReconnectAttempt(0)

      const socketInstance = io(url, {
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

      socketInstance.io.on(
        'reconnect_attempt',
        (attemptNumber: number): void => {
          console.warn('[SocketContext] Reconnection attempt:', attemptNumber)
          setConnectionStatus(ConnectionStatus.RECONNECTING)
          setReconnectAttempt(attemptNumber)
        },
      )

      socketInstance.io.on('reconnect', (attemptNumber: number): void => {
        console.warn(
          '[SocketContext] Reconnected after attempts:',
          attemptNumber,
        )
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
    },
    [socket],
  )

  /**
   * Disconnect from the current WebSocket server
   */
  const disconnect = useCallback((): void => {
    if (socket) {
      // eslint-disable-next-line no-console
      console.log('[SocketContext] Disconnecting from server')
      socket.removeAllListeners()
      socket.disconnect()
      setSocket(null)
      setServerUrl(null)
      setConnectionStatus(ConnectionStatus.DISCONNECTED)
      setError(null)
      setReconnectAttempt(0)
    }
  }, [socket])

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    (): SocketContextState => ({
      socket,
      connectionStatus,
      error,
      isConnected: connectionStatus === ConnectionStatus.CONNECTED,
      reconnectAttempt,
      serverUrl,
      connect,
      disconnect,
    }),
    [
      socket,
      connectionStatus,
      error,
      reconnectAttempt,
      serverUrl,
      connect,
      disconnect,
    ],
  )

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  )
}

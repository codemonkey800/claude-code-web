/**
 * Custom hook to access Socket.io instance from context
 */

import { useContext } from 'react'

import { SocketContext } from 'src/context/SocketContext'

import type { SocketContextState } from 'src/types/socket'

/**
 * Hook to access socket instance and connection state
 * @throws Error if used outside of SocketProvider
 */
export function useSocket(): SocketContextState {
  const context = useContext(SocketContext)

  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider')
  }

  return context
}

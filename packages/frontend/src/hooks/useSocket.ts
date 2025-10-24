/**
 * Custom hook to access Socket.io instance from context
 */

import { useContext } from 'react'

import { SocketContext } from 'src/context/SocketContext'

/**
 * Hook to access socket instance and connection state
 * @throws Error if used outside of SocketProvider
 */
export function useSocket() {
  const context = useContext(SocketContext)

  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider')
  }

  return context
}

/**
 * Custom hook for subscribing to Socket.io events with automatic cleanup
 */

import { useEffect } from 'react'

import { useSocket } from 'src/hooks/useSocket'

/**
 * Hook to subscribe to socket events with automatic cleanup
 * @param eventName - Name of the socket event to listen for
 * @param handler - Callback function to handle the event
 *
 * @example
 * ```tsx
 * useSocketEvent(WS_EVENTS.PONG, (data: PongEvent) => {
 *   console.log('Received pong:', data)
 * })
 * ```
 */
export function useSocketEvent<T = unknown>(
  eventName: string,
  handler: (data: T) => void,
) {
  const { socket } = useSocket()

  useEffect(() => {
    if (!socket) {
      return
    }

    // Subscribe to event
    socket.on(eventName, handler)

    // Cleanup: unsubscribe when component unmounts or dependencies change
    return () => {
      socket.off(eventName, handler)
    }
  }, [socket, eventName, handler])
}

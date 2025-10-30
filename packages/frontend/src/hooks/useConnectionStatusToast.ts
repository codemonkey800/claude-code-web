import { useEffect, useRef } from 'react'

import { useSocket } from 'src/hooks/useSocket'
import { useToast } from 'src/hooks/useToast'
import { ConnectionStatus } from 'src/types/socket'

export function useConnectionStatusToast(): void {
  const { connectionStatus, error, reconnectAttempt } = useSocket()
  const { toast } = useToast()
  const prevStatus = useRef<ConnectionStatus | null>(null)
  const loadingToastId = useRef<string | null>(null)

  useEffect((): void => {
    // Only show toast if connection status actually changed
    if (
      prevStatus.current === null ||
      prevStatus.current === connectionStatus
    ) {
      prevStatus.current = connectionStatus
      return
    }

    // Dismiss any active loading toast when transitioning to a terminal state
    if (
      loadingToastId.current &&
      (connectionStatus === ConnectionStatus.CONNECTED ||
        connectionStatus === ConnectionStatus.ERROR ||
        connectionStatus === ConnectionStatus.DISCONNECTED)
    ) {
      toast.dismiss(loadingToastId.current)
      loadingToastId.current = null
    }

    // Show toast based on the new connection status
    switch (connectionStatus) {
      case ConnectionStatus.CONNECTED:
        toast.success('Connected to WebSocket server', {
          duration: 5000,
          showCloseButton: true,
        })
        break
      case ConnectionStatus.CONNECTING:
        // Dismiss previous loading toast before showing new one
        if (loadingToastId.current) {
          toast.dismiss(loadingToastId.current)
        }
        loadingToastId.current = toast.loading('Connecting to server...', {
          showCloseButton: false,
        })
        break
      case ConnectionStatus.RECONNECTING:
        // Dismiss previous loading toast before showing new one
        if (loadingToastId.current) {
          toast.dismiss(loadingToastId.current)
        }
        loadingToastId.current = toast.loading(
          `Reconnecting... (Attempt ${reconnectAttempt})`,
          {
            showCloseButton: false,
          },
        )
        break
      case ConnectionStatus.DISCONNECTED:
        toast.error('Disconnected from server', {
          showCloseButton: true,
        })
        break
      case ConnectionStatus.ERROR:
        toast.error(`Connection error: ${error || 'Unknown error'}`, {
          showCloseButton: true,
        })
        break
    }

    prevStatus.current = connectionStatus
  }, [connectionStatus, error, reconnectAttempt, toast])

  // Cleanup: dismiss any active loading toast on unmount
  useEffect(() => {
    return () => {
      if (loadingToastId.current) {
        toast.dismiss(loadingToastId.current)
      }
    }
  }, [toast])
}

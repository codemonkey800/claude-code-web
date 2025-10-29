import * as Toast from '@radix-ui/react-toast'
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  X,
  XCircle,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { useSocket } from 'src/hooks/useSocket'
import { ConnectionStatus } from 'src/types/socket'

export function ConnectionStatusToast() {
  const { connectionStatus, error, reconnectAttempt } = useSocket()
  const [open, setOpen] = useState(false)
  const prevStatus = useRef<ConnectionStatus | null>(null)

  useEffect((): void => {
    // Only show toast if connection status actually changed
    if (
      prevStatus.current !== null &&
      prevStatus.current !== connectionStatus
    ) {
      setOpen(true)
    }
    prevStatus.current = connectionStatus
  }, [connectionStatus])

  const getDuration = (): number => {
    if (connectionStatus === ConnectionStatus.CONNECTED) {
      return 5000 // auto-close after 5 seconds
    }
    return Infinity // persistent for all other states
  }

  const getToastStyles = (): string => {
    switch (connectionStatus) {
      case ConnectionStatus.CONNECTED:
        return 'bg-green-950 border-green-500 text-green-400'
      case ConnectionStatus.CONNECTING:
      case ConnectionStatus.RECONNECTING:
        return 'bg-yellow-950 border-yellow-500 text-yellow-400'
      case ConnectionStatus.ERROR:
      case ConnectionStatus.DISCONNECTED:
        return 'bg-red-950 border-red-500 text-red-400'
      default:
        return 'bg-gray-800 border-gray-500 text-gray-400'
    }
  }

  const getToastIcon = () => {
    switch (connectionStatus) {
      case ConnectionStatus.CONNECTED:
        return <CheckCircle2 className="w-5 h-5" />
      case ConnectionStatus.CONNECTING:
        return <Loader2 className="w-5 h-5 animate-spin" />
      case ConnectionStatus.RECONNECTING:
        return <RefreshCw className="w-5 h-5 animate-spin" />
      case ConnectionStatus.DISCONNECTED:
        return <XCircle className="w-5 h-5" />
      case ConnectionStatus.ERROR:
        return <AlertCircle className="w-5 h-5" />
      default:
        return null
    }
  }

  const getToastMessage = (): string => {
    switch (connectionStatus) {
      case ConnectionStatus.CONNECTED:
        return 'Connected to WebSocket server'
      case ConnectionStatus.CONNECTING:
        return 'Connecting to server...'
      case ConnectionStatus.RECONNECTING:
        return `Reconnecting... (Attempt ${reconnectAttempt})`
      case ConnectionStatus.DISCONNECTED:
        return 'Disconnected from server'
      case ConnectionStatus.ERROR:
        return `Connection error: ${error || 'Unknown error'}`
      default:
        return 'Unknown status'
    }
  }

  const showCloseButton =
    connectionStatus === ConnectionStatus.CONNECTED ||
    connectionStatus === ConnectionStatus.DISCONNECTED ||
    connectionStatus === ConnectionStatus.ERROR

  return (
    <Toast.Root
      key={connectionStatus}
      open={open}
      onOpenChange={setOpen}
      duration={getDuration()}
      className={`
        ${getToastStyles()}
        rounded-lg border-2 p-4 shadow-lg
        ${open ? 'animate-slide-in-right' : 'animate-slide-out-right'}
        data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)]
        data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)]
      `}
    >
      <div className="flex items-center gap-3">
        {getToastIcon()}
        <div className="flex-1">
          <Toast.Title className="font-semibold">
            {getToastMessage()}
          </Toast.Title>
        </div>
        {showCloseButton && (
          <Toast.Close className="ml-auto hover:opacity-70 transition-opacity">
            <X className="w-4 h-4" />
          </Toast.Close>
        )}
      </div>
    </Toast.Root>
  )
}

import { Clock, X } from 'lucide-react'
import type React from 'react'
import { type FormEvent, useState } from 'react'

import { Button } from 'src/components/Button'
import { useSocket } from 'src/hooks/useSocket'
import { ConnectionStatus } from 'src/types/socket'
import { cns } from 'src/utils/cns'

import type { RecentConnection } from 'src/hooks/useRecents'

interface LandingPageProps {
  recents: RecentConnection[]
  onRemoveRecent: (url: string) => void
}

export function LandingPage({ recents, onRemoveRecent }: LandingPageProps) {
  const { connectionStatus, error, connect } = useSocket()
  const [serverUrl, setServerUrl] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const [deletingUrl, setDeletingUrl] = useState<string | null>(null)

  const isConnecting = connectionStatus === ConnectionStatus.CONNECTING
  const hasError = connectionStatus === ConnectionStatus.ERROR

  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault()
    setLocalError(null)

    // Validate URL
    if (!serverUrl.trim()) {
      setLocalError('Server URL is required')
      return
    }

    try {
      new URL(serverUrl)
    } catch {
      setLocalError('Invalid URL format')
      return
    }

    // Connect to server (fire and forget)
    void connect(serverUrl)
  }

  const handleRecentClick = (url: string): void => {
    setLocalError(null)
    setServerUrl(url)
    // Automatically connect to the server
    void connect(url)
  }

  const handleDeleteRecent = (
    e: React.MouseEvent<HTMLButtonElement>,
    url: string,
  ): void => {
    e.stopPropagation() // Prevent triggering the parent click handler
    setDeletingUrl(url)
    // Wait for animation to complete before removing
    setTimeout(() => {
      onRemoveRecent(url)
      setDeletingUrl(null)
    }, 300)
  }

  const displayError = localError || error

  return (
    <div className="animate-gradient flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-teal-900 px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="animate-fade-in-up mb-8 text-center">
          <h1 className="mb-2 text-4xl font-bold text-gray-100 drop-shadow-lg">
            Claude Code Web
          </h1>
          <p className="text-lg text-gray-300 drop-shadow">
            Connect to your server
          </p>
        </div>

        {/* Recent Connections */}
        {recents.length > 0 && (
          <div className="animate-fade-in-up mb-6">
            <div className="mb-3 flex items-center gap-2 text-gray-300">
              <Clock className="h-4 w-4" />
              <h2 className="text-sm font-medium">Recent Connections</h2>
            </div>
            <div className="space-y-2">
              {recents.map((recent, index) => (
                <div
                  key={recent.url}
                  className={cns(
                    'group flex items-center justify-between gap-3',
                    'rounded-lg border border-gray-700 bg-gray-800/90 px-4 py-3',
                    'shadow-lg shadow-blue-500/10 backdrop-blur-xl',
                    'transition-all duration-300 hover:scale-[1.02]',
                    'hover:border-gray-600 hover:bg-gray-800',
                    'hover:shadow-xl hover:shadow-blue-500/20',
                    'cursor-pointer animate-slide-in-left',
                    deletingUrl === recent.url && 'animate-fade-out',
                  )}
                  style={{
                    animationDelay: `${index * 50}ms`,
                  }}
                  onClick={() => handleRecentClick(recent.url)}
                >
                  <div className="flex-1 overflow-hidden">
                    <p className="truncate text-sm font-medium text-gray-200">
                      {recent.url}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(recent.timestamp).toLocaleDateString(
                        undefined,
                        {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        },
                      )}
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={e => handleDeleteRecent(e, recent.url)}
                    icon={<X className="h-4 w-4" />}
                    className={cns(
                      'p-1',
                      'opacity-0 transition-all duration-200',
                      'group-hover:opacity-100 focus:opacity-100',
                    )}
                    aria-label={`Delete ${recent.url}`}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Connection Form */}
        <div className="animate-fade-in-up rounded-lg border border-gray-700 bg-gray-800/90 p-8 shadow-xl shadow-purple-500/10 backdrop-blur-xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Server URL Input */}
            <div>
              <label
                htmlFor="serverUrl"
                className="mb-2 block text-sm font-medium text-gray-200"
              >
                Server URL
              </label>
              <input
                id="serverUrl"
                type="text"
                value={serverUrl}
                onChange={(e): void => setServerUrl(e.target.value)}
                disabled={isConnecting}
                placeholder="http://localhost:8081"
                className={cns(
                  'w-full rounded-lg border border-gray-600',
                  'bg-gray-900 text-gray-100 px-4 py-2',
                  'placeholder:text-gray-500 transition-all duration-300',
                  'focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500',
                  'focus:shadow-lg focus:shadow-purple-500/20',
                  'disabled:cursor-not-allowed disabled:bg-gray-800 disabled:opacity-50',
                )}
                aria-invalid={!!displayError}
                aria-describedby={displayError ? 'error-message' : undefined}
              />
            </div>

            {/* Error Message */}
            {displayError && (
              <div
                id="error-message"
                role="alert"
                className="animate-fade-in-up rounded-lg border border-red-800 bg-red-950 p-4"
              >
                <p className="text-sm text-red-400">{displayError}</p>
              </div>
            )}

            {/* Connect Button */}
            <Button
              variant="primary"
              type="submit"
              fullWidth
              loading={isConnecting}
              disabled={!serverUrl.trim()}
              className="px-6 py-3 hover:scale-105"
            >
              {isConnecting ? 'Connecting...' : 'Connect to Server'}
            </Button>
          </form>

          {/* Connection Status Info */}
          {hasError && (
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-400">
                Please check your server URL and try again
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

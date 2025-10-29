import { Clock, Loader2, X } from 'lucide-react'
import type React from 'react'
import { type FormEvent, useState } from 'react'

import { useSocket } from 'src/hooks/useSocket'
import { ConnectionStatus } from 'src/types/socket'

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
    <div className="animate-gradient flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-400 via-blue-400 to-teal-400 px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="animate-fade-in-up mb-8 text-center">
          <h1 className="mb-2 text-4xl font-bold text-white drop-shadow-lg">
            Claude Code Web
          </h1>
          <p className="text-lg text-white/90 drop-shadow">
            Connect to your server
          </p>
        </div>

        {/* Recent Connections */}
        {recents.length > 0 && (
          <div className="animate-fade-in-up mb-6">
            <div className="mb-3 flex items-center gap-2 text-white/90">
              <Clock className="h-4 w-4" />
              <h2 className="text-sm font-medium">Recent Connections</h2>
            </div>
            <div className="space-y-2">
              {recents.map((recent, index) => (
                <div
                  key={recent.url}
                  className={`group flex items-center justify-between gap-3 rounded-lg border border-white/40 bg-white/80 px-4 py-3 shadow-lg shadow-blue-500/10 backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] hover:border-white/60 hover:bg-white/90 hover:shadow-xl hover:shadow-blue-500/20 cursor-pointer animate-slide-in-left ${
                    deletingUrl === recent.url ? 'animate-fade-out' : ''
                  }`}
                  style={{
                    animationDelay: `${index * 50}ms`,
                  }}
                  onClick={() => handleRecentClick(recent.url)}
                >
                  <div className="flex-1 overflow-hidden">
                    <p className="truncate text-sm font-medium text-gray-700">
                      {recent.url}
                    </p>
                    <p className="text-xs text-gray-500">
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
                  <button
                    onClick={e => handleDeleteRecent(e, recent.url)}
                    className="flex-shrink-0 rounded p-1 text-gray-400 opacity-0 transition-all duration-200 hover:bg-red-100 hover:text-red-600 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                    aria-label={`Delete ${recent.url}`}
                    type="button"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Connection Form */}
        <div className="animate-fade-in-up rounded-lg border border-white/40 bg-white/80 p-8 shadow-xl shadow-blue-500/10 backdrop-blur-xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Server URL Input */}
            <div>
              <label
                htmlFor="serverUrl"
                className="mb-2 block text-sm font-medium text-gray-700"
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
                className="w-full rounded-lg border border-gray-300 px-4 py-2 transition-all duration-300 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:shadow-lg focus:shadow-blue-500/20 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:opacity-50"
                aria-invalid={!!displayError}
                aria-describedby={displayError ? 'error-message' : undefined}
              />
            </div>

            {/* Error Message */}
            {displayError && (
              <div
                id="error-message"
                role="alert"
                className="animate-fade-in-up rounded-lg border border-red-200 bg-red-50 p-4"
              >
                <p className="text-sm text-red-800">{displayError}</p>
              </div>
            )}

            {/* Connect Button */}
            <button
              type="submit"
              disabled={isConnecting || !serverUrl.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-500 px-6 py-3 font-medium text-white transition-all duration-300 hover:scale-105 hover:bg-blue-600 hover:shadow-lg hover:shadow-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <span>Connect to Server</span>
              )}
            </button>
          </form>

          {/* Connection Status Info */}
          {hasError && (
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600">
                Please check your server URL and try again
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

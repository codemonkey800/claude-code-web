import { Loader2 } from 'lucide-react'
import { type FormEvent, useState } from 'react'

import { useSocket } from 'src/hooks/useSocket'
import { ConnectionStatus } from 'src/types/socket'

export function LandingPage() {
  const { connectionStatus, error, connect } = useSocket()
  const [serverUrl, setServerUrl] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

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

  const displayError = localError || error

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-4xl font-bold text-gray-900">
            Claude Code Web
          </h1>
          <p className="text-lg text-gray-600">Connect to your server</p>
        </div>

        {/* Connection Form */}
        <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-md">
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
                className="w-full rounded-lg border border-gray-300 px-4 py-2 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:opacity-50"
                aria-invalid={!!displayError}
                aria-describedby={displayError ? 'error-message' : undefined}
              />
            </div>

            {/* Error Message */}
            {displayError && (
              <div
                id="error-message"
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 p-4"
              >
                <p className="text-sm text-red-800">{displayError}</p>
              </div>
            )}

            {/* Connect Button */}
            <button
              type="submit"
              disabled={isConnecting || !serverUrl.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-500 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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

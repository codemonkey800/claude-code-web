/**
 * API Context for managing REST API calls with dynamic server URL
 */

import type React from 'react'
import { createContext, useContext, useMemo } from 'react'

import { useSocket } from 'src/hooks/useSocket'

/**
 * API context state interface
 */
export interface ApiContextState {
  /**
   * Base URL for the API server
   */
  baseUrl: string | null

  /**
   * Configured fetch function that automatically prepends the base URL
   */
  apiFetch: (path: string, options?: RequestInit) => Promise<Response>
}

// Create context with default values
export const ApiContext = createContext<ApiContextState | null>(null)

/**
 * API Context Provider Component
 * Provides a configured fetch function that uses the server URL from SocketContext
 */
export function ApiProvider({ children }: { children: React.ReactNode }) {
  const { serverUrl } = useSocket()

  // Memoize the API fetch function to prevent unnecessary re-renders
  const apiFetch = useMemo(() => {
    return async (path: string, options?: RequestInit): Promise<Response> => {
      if (!serverUrl) {
        throw new Error(
          'Server URL is not set. Please connect to a server first.',
        )
      }

      // Ensure path starts with /
      const normalizedPath = path.startsWith('/') ? path : `/${path}`
      const url = `${serverUrl}${normalizedPath}`

      return fetch(url, options)
    }
  }, [serverUrl])

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    (): ApiContextState => ({
      baseUrl: serverUrl,
      apiFetch,
    }),
    [serverUrl, apiFetch],
  )

  return (
    <ApiContext.Provider value={contextValue}>{children}</ApiContext.Provider>
  )
}

/**
 * Hook to access the API context
 * @throws Error if used outside of ApiProvider
 */
export function useApi(): ApiContextState {
  const context = useContext(ApiContext)
  if (!context) {
    throw new Error('useApi must be used within an ApiProvider')
  }
  return context
}

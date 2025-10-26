import { QueryClient } from '@tanstack/react-query'

/**
 * React Query client configuration
 * Configures default options for queries and mutations
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Consider data stale after 30 seconds
      staleTime: 30000,
      // Keep unused data in cache for 5 minutes
      gcTime: 5 * 60 * 1000,
      // Refetch when window regains focus
      refetchOnWindowFocus: true,
      // Refetch when reconnecting to network
      refetchOnReconnect: true,
      // Retry failed requests with exponential backoff
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      // Retry failed mutations once
      retry: 1,
    },
  },
})

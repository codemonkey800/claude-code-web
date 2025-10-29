import { useQuery } from '@tanstack/react-query'

import { createQueries } from 'src/api/queryKeys'
import { useApi } from 'src/context/ApiContext'

/**
 * Hook to fetch a single session by ID
 * @param sessionId - The session ID to fetch
 * @param config - Optional query configuration (e.g., enabled flag)
 * @returns React Query result with session data
 */
export function useSession(
  sessionId: string | undefined,
  config?: { enabled?: boolean },
) {
  const { apiFetch } = useApi()
  const queries = createQueries(apiFetch)

  return useQuery({
    ...queries.sessions.detail(sessionId ?? ''),
    enabled: config?.enabled !== undefined ? config.enabled : !!sessionId,
  })
}

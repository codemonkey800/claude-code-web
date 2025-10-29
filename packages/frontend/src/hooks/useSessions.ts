import type { CreateSessionPayload, Session } from '@claude-code-web/shared'
import {
  useMutation,
  type UseMutationResult,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query'

import { createQueries } from 'src/api/queryKeys'
import { createSession } from 'src/api/sessions'
import { useApi } from 'src/context/ApiContext'

/**
 * Hook to fetch all sessions
 * Uses React Query for automatic caching and background refetching
 *
 * @returns Query result with sessions data, loading state, and error
 */
export function useSessions(): UseQueryResult<Session[], Error> {
  const { apiFetch } = useApi()
  const queries = createQueries(apiFetch)

  return useQuery(queries.sessions.list())
}

/**
 * Hook to create a new session
 * Automatically invalidates the sessions list cache on success
 *
 * @returns Mutation object with mutate function, loading state, and error
 */
export function useCreateSession(): UseMutationResult<
  Session,
  Error,
  CreateSessionPayload | undefined,
  unknown
> {
  const queryClient = useQueryClient()
  const { apiFetch } = useApi()

  return useMutation({
    mutationFn: (payload?: CreateSessionPayload): Promise<Session> =>
      createSession(apiFetch, payload),
    onSuccess: (): void => {
      // Invalidate and refetch sessions list after successful creation
      void queryClient.invalidateQueries({
        queryKey: ['sessions', 'list'],
      })
    },
  })
}

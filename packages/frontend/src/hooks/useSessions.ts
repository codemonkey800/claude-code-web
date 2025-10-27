import type { CreateSessionPayload, Session } from '@claude-code-web/shared'
import {
  useMutation,
  type UseMutationResult,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query'

import { queries } from 'src/api/queryKeys'
import { createSession } from 'src/api/sessions'

/**
 * Hook to fetch all sessions
 * Uses React Query for automatic caching and background refetching
 *
 * @returns Query result with sessions data, loading state, and error
 */
export function useSessions(): UseQueryResult<Session[], Error> {
  return useQuery(queries.sessions.list)
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

  return useMutation({
    mutationFn: (payload?: CreateSessionPayload): Promise<Session> =>
      createSession(payload),
    onSuccess: (): void => {
      // Invalidate and refetch sessions list after successful creation
      void queryClient.invalidateQueries({
        queryKey: queries.sessions.list.queryKey,
      })
    },
  })
}

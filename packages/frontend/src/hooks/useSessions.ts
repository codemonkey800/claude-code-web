import type {
  CreateSessionPayload,
  SendQueryPayload,
  SendQueryResponse,
  Session,
  StartSessionPayload,
} from '@claude-code-web/shared'
import {
  useMutation,
  type UseMutationResult,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query'

import { createQueries } from 'src/api/queryKeys'
import { createSession, sendQuery, startSession } from 'src/api/sessions'
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

/**
 * Hook to start a session with an optional initial query
 * Used to transition a session from INITIALIZING to ACTIVE
 *
 * @returns Mutation object with mutate function, loading state, and error
 */
export function useStartSession(): UseMutationResult<
  Session | SendQueryResponse,
  Error,
  { sessionId: string; payload?: StartSessionPayload },
  unknown
> {
  const { apiFetch } = useApi()

  return useMutation({
    mutationFn: ({
      sessionId,
      payload,
    }: {
      sessionId: string
      payload?: StartSessionPayload
    }): Promise<Session | SendQueryResponse> =>
      startSession(apiFetch, sessionId, payload),
  })
}

/**
 * Hook to send a query to an active session
 * Used for follow-up messages in an existing session
 *
 * @returns Mutation object with mutate function, loading state, and error
 */
export function useSendQuery(): UseMutationResult<
  SendQueryResponse,
  Error,
  { sessionId: string; payload: SendQueryPayload },
  unknown
> {
  const { apiFetch } = useApi()

  return useMutation({
    mutationFn: ({
      sessionId,
      payload,
    }: {
      sessionId: string
      payload: SendQueryPayload
    }): Promise<SendQueryResponse> => sendQuery(apiFetch, sessionId, payload),
  })
}

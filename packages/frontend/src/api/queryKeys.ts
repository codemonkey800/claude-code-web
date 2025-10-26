import { createQueryKeys, mergeQueryKeys } from '@lukemorales/query-key-factory'

import { fetchSessions } from './sessions'

/**
 * Query keys for session-related queries
 * Using @lukemorales/query-key-factory for type-safe key management
 */
export const sessionsKeys = createQueryKeys('sessions', {
  list: {
    queryKey: null,
    queryFn: fetchSessions,
  },
})

/**
 * Merged query keys for the entire application
 * Add more entity keys here as the app grows (e.g., todos, users, etc.)
 */
export const queries = mergeQueryKeys(sessionsKeys)

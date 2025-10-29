import type { DirectoryBrowseOptions } from '@claude-code-web/shared'

import { browseDirectory } from './filesystem'
import { type ApiFetch, fetchSession, fetchSessions } from './sessions'

/**
 * Create query key factories for session-related queries
 * These factories accept apiFetch and return query options
 */
export const createSessionsQueries = (apiFetch: ApiFetch) => ({
  list: () => ({
    queryKey: ['sessions', 'list'] as const,
    queryFn: () => fetchSessions(apiFetch),
  }),
  detail: (sessionId: string) => ({
    queryKey: ['sessions', 'detail', sessionId] as const,
    queryFn: () => fetchSession(apiFetch, sessionId),
  }),
})

/**
 * Create query key factories for filesystem-related queries
 * These factories accept apiFetch and return query options
 */
export const createFilesystemQueries = (apiFetch: ApiFetch) => ({
  browse: (path: string, options?: DirectoryBrowseOptions) => ({
    queryKey: ['filesystem', 'browse', { path, options }] as const,
    queryFn: () => browseDirectory(apiFetch, path, options),
  }),
})

/**
 * Create all query factories with the provided apiFetch function
 * This should be called in hooks that need to access queries
 */
export const createQueries = (apiFetch: ApiFetch) => ({
  sessions: createSessionsQueries(apiFetch),
  filesystem: createFilesystemQueries(apiFetch),
})

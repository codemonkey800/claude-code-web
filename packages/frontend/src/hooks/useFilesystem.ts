import type {
  DirectoryBrowseOptions,
  ValidatePathPayload,
} from '@claude-code-web/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'

import { validatePath } from 'src/api/filesystem'
import { createQueries } from 'src/api/queryKeys'
import { useApi } from 'src/context/ApiContext'

/**
 * Hook to fetch file system configuration
 * Configuration is cached indefinitely as it doesn't change during runtime
 *
 * @returns Query result with filesystem config including allowed base directory
 */
export function useFilesystemConfig() {
  const { apiFetch } = useApi()
  const queries = createQueries(apiFetch)

  return useQuery({
    ...queries.filesystem.config(),
    staleTime: Number.POSITIVE_INFINITY, // Config never goes stale
    gcTime: Number.POSITIVE_INFINITY, // Keep in cache forever
  })
}

/**
 * Hook to browse a directory with React Query
 * Automatically handles caching, refetching, and error states
 *
 * @param path - Directory path to browse
 * @param options - Optional browse options (pagination, sorting, hidden files)
 * @param config - Query configuration (e.g., enabled flag)
 * @returns Query result with directory data, loading state, and error
 */
export function useDirectoryBrowse(
  path: string,
  options?: DirectoryBrowseOptions,
  config?: { enabled?: boolean },
) {
  const { apiFetch } = useApi()
  const queries = createQueries(apiFetch)

  return useQuery({
    ...queries.filesystem.browse(path, options),
    enabled: config?.enabled ?? true,
    staleTime: 60000, // 1 minute - directories don't change often
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook to validate a filesystem path
 * Returns a mutation for on-demand path validation
 *
 * @returns Mutation object with mutate function, loading state, and result
 */
export function useValidatePath() {
  const { apiFetch } = useApi()

  return useMutation({
    mutationFn: (payload: ValidatePathPayload) =>
      validatePath(apiFetch, payload),
  })
}

/**
 * Hook to prefetch a directory
 * Useful for anticipatory loading on hover or navigation hints
 *
 * @returns Prefetch function that takes a path to prefetch
 */
export function usePrefetchDirectory() {
  const queryClient = useQueryClient()
  const { apiFetch } = useApi()
  const queries = createQueries(apiFetch)

  return useCallback(
    (path: string, options?: DirectoryBrowseOptions) => {
      void queryClient.prefetchQuery(queries.filesystem.browse(path, options))
    },
    [queryClient, queries],
  )
}

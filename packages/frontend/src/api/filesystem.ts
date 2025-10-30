import type {
  DirectoryBrowseOptions,
  DirectoryBrowseResponse,
  FileSystemConfig,
  ValidatePathPayload,
  ValidatePathResponse,
} from '@claude-code-web/shared'

import type { ApiFetch } from './sessions'

/**
 * Get file system configuration
 * @param apiFetch - Configured fetch function from ApiContext
 * @returns Promise resolving to file system configuration
 * @throws Error if the request fails
 */
export async function getFilesystemConfig(
  apiFetch: ApiFetch,
): Promise<FileSystemConfig> {
  const response = await apiFetch('/filesystem/config')

  if (!response.ok) {
    const error: { message?: string } = (await response
      .json()
      .catch(() => ({
        message: 'Failed to get filesystem configuration',
      }))) as {
      message?: string
    }
    throw new Error(error.message ?? 'Failed to get filesystem configuration')
  }

  return response.json() as Promise<FileSystemConfig>
}

/**
 * Browse a directory and list its contents
 * @param apiFetch - Configured fetch function from ApiContext
 * @param path - Directory path to browse
 * @param options - Optional browse options (pagination, sorting, hidden files)
 * @returns Promise resolving to directory browse response with entries and pagination
 * @throws Error if the request fails
 */
export async function browseDirectory(
  apiFetch: ApiFetch,
  path: string,
  options?: DirectoryBrowseOptions,
): Promise<DirectoryBrowseResponse> {
  const params = new URLSearchParams({
    path,
    ...(options?.showHidden !== undefined && {
      showHidden: String(options.showHidden),
    }),
    ...(options?.pageSize !== undefined && {
      pageSize: String(options.pageSize),
    }),
    ...(options?.page !== undefined && { page: String(options.page) }),
    ...(options?.sortBy && { sortBy: options.sortBy }),
    ...(options?.sortDirection && { sortDirection: options.sortDirection }),
  })

  const response = await apiFetch(`/filesystem/browse?${params}`)

  if (!response.ok) {
    const error: { message?: string } = (await response
      .json()
      .catch(() => ({ message: 'Failed to browse directory' }))) as {
      message?: string
    }
    throw new Error(error.message ?? 'Failed to browse directory')
  }

  const data = (await response.json()) as Awaited<
    Promise<DirectoryBrowseResponse>
  >

  // Convert ISO date strings back to Date objects
  return {
    ...data,
    entries: data.entries.map(entry => ({
      ...entry,
      modifiedAt: new Date(entry.modifiedAt),
    })),
  }
}

/**
 * Validate a file system path
 * @param apiFetch - Configured fetch function from ApiContext
 * @param payload - Path validation payload
 * @returns Promise resolving to validation response
 * @throws Error if the request fails
 */
export async function validatePath(
  apiFetch: ApiFetch,
  payload: ValidatePathPayload,
): Promise<ValidatePathResponse> {
  const response = await apiFetch('/filesystem/validate-path', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const error: { message?: string } = (await response
      .json()
      .catch(() => ({ message: 'Failed to validate path' }))) as {
      message?: string
    }
    throw new Error(error.message ?? 'Failed to validate path')
  }

  return response.json() as Promise<ValidatePathResponse>
}

import type { CreateSessionPayload, Session } from '@claude-code-web/shared'

/**
 * Type for the configured fetch function from ApiContext
 */
export type ApiFetch = (
  path: string,
  options?: RequestInit,
) => Promise<Response>

/**
 * Fetch all sessions from the backend
 * @param apiFetch - Configured fetch function from ApiContext
 * @returns Promise resolving to array of sessions
 * @throws Error if the request fails
 */
export async function fetchSessions(apiFetch: ApiFetch): Promise<Session[]> {
  const response = await apiFetch('/sessions')

  if (!response.ok) {
    throw new Error(`Failed to fetch sessions: ${response.statusText}`)
  }

  return response.json() as Promise<Session[]>
}

/**
 * Fetch a single session by ID
 * @param apiFetch - Configured fetch function from ApiContext
 * @param sessionId - The session ID to fetch
 * @returns Promise resolving to the session
 * @throws Error if the request fails or session not found
 */
export async function fetchSession(
  apiFetch: ApiFetch,
  sessionId: string,
): Promise<Session> {
  const response = await apiFetch(`/sessions/${sessionId}`)

  if (!response.ok) {
    throw new Error(`Failed to fetch session: ${response.statusText}`)
  }

  return response.json() as Promise<Session>
}

/**
 * Create a new session
 * @param apiFetch - Configured fetch function from ApiContext
 * @param payload - Optional session creation payload
 * @returns Promise resolving to the created session
 * @throws Error if the request fails
 */
export async function createSession(
  apiFetch: ApiFetch,
  payload?: CreateSessionPayload,
): Promise<Session> {
  const response = await apiFetch('/sessions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload || {}),
  })

  if (!response.ok) {
    throw new Error(`Failed to create session: ${response.statusText}`)
  }

  return response.json() as Promise<Session>
}
